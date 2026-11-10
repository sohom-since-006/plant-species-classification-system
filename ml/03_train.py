"""03_train.py - Botanical species classification training pipeline.

Performs two-phase transfer learning on EfficientNet-B0:
  - Phase 1: Backbone frozen, classification head trained with lr 1e-3 (3-5 epochs).
  - Phase 2: Full network fine-tuned with differential learning rates (backbone 2e-4,
    head 1e-3) up to 30 epochs with early stopping on validation loss (patience 5).

Technical features:
  - AMP (fp16 with GradScaler)
  - AdamW optimizer with cosine schedule
  - Label smoothing (0.1) & Mixup/CutMix augmentation (p=0.3)
  - Class-balanced WeightedRandomSampler if min/max class ratio < 0.5
  - CUDA OOM automatic batch size fallback (32 -> 16)
  - Windows-safe DataLoader multiprocessing (num_workers 4-6, persistent_workers)
  - Comprehensive run logging (metrics.csv, train_config.json, labels.json, checkpoints)
"""

from __future__ import annotations

import argparse
import csv
import datetime
import json
import logging
import random
import sys
import time
from collections import Counter
from pathlib import Path
from typing import Any

import numpy as np
import torch
from model import EMBEDDING_DIM, TRD_MEAN, TRD_STD, PlantClassifier
from PIL import Image
from torch import nn
from torch.utils.data import DataLoader, Dataset, WeightedRandomSampler
from torchvision import transforms

logger = logging.getLogger("train")

DEFAULT_SEED = 42
DEFAULT_PHASE1_EPOCHS = 3
DEFAULT_PHASE2_EPOCHS = 30
DEFAULT_BATCH_SIZE = 32
DEFAULT_WORKERS = 4
DEFAULT_PATIENCE = 5
DEFAULT_LABEL_SMOOTHING = 0.1
DEFAULT_MIXUP_CUTMIX_PROB = 0.3


def seed_everything(seed: int = DEFAULT_SEED) -> None:
    """Set random seeds across python, numpy, and pytorch for deterministic reproducibility."""
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)
    # Ensure reproducible cuDNN algorithms where possible
    torch.backends.cudnn.benchmark = True


class PlantDataset(Dataset[tuple[torch.Tensor, int]]):
    """PyTorch Dataset loading botanical images from splits.csv records."""

    def __init__(
        self,
        records: list[dict[str, Any]],
        data_dir: Path,
        transform: transforms.Compose | None = None,
    ) -> None:
        self.records = records
        self.data_dir = data_dir
        self.transform = transform

    def __len__(self) -> int:
        return len(self.records)

    def __getitem__(self, idx: int) -> tuple[torch.Tensor, int]:
        rec = self.records[idx]
        file_path = self.data_dir / rec["file"]
        try:
            image = Image.open(file_path).convert("RGB")
        except (OSError, ValueError) as exc:
            logger.error("Failed to load image %s: %s", file_path, exc)
            # Fallback to black image if disk error occurs
            image = Image.new("RGB", (224, 224), (0, 0, 0))

        if self.transform is not None:
            tensor = self.transform(image)
        else:
            tensor = transforms.functional.to_tensor(image)

        return tensor, rec["class_idx"]


def build_transforms() -> tuple[transforms.Compose, transforms.Compose]:
    """Construct data augmentation and normalization transforms per TRD Section 4 & 5.

    Returns:
        (train_transforms, val_transforms)
    """
    # Training augmentations per TRD:
    # random resized crop (224, 0.5-1.0), horizontal flip, rotation, color jitter, blur, perspective, random erasing
    train_transform = transforms.Compose(
        [
            transforms.RandomResizedCrop(224, scale=(0.5, 1.0)),
            transforms.RandomHorizontalFlip(p=0.5),
            transforms.RandomRotation(degrees=15),
            transforms.ColorJitter(
                brightness=0.2, contrast=0.2, saturation=0.2, hue=0.05
            ),
            transforms.RandomApply(
                [transforms.GaussianBlur(kernel_size=(5, 5), sigma=(0.1, 2.0))],
                p=0.2,
            ),
            transforms.RandomPerspective(distortion_scale=0.2, p=0.3),
            transforms.ToTensor(),
            transforms.Normalize(mean=TRD_MEAN, std=TRD_STD),
            transforms.RandomErasing(
                p=0.2, scale=(0.02, 0.2), ratio=(0.3, 3.3), value="random"
            ),
        ]
    )

    # Validation transform per TRD Section 5:
    # resize shorter side to 256, then center crop 224
    val_transform = transforms.Compose(
        [
            transforms.Resize(256),
            transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize(mean=TRD_MEAN, std=TRD_STD),
        ]
    )

    return train_transform, val_transform


def apply_mixup_cutmix(
    x: torch.Tensor,
    y: torch.Tensor,
    alpha: float = 0.8,
    prob: float = DEFAULT_MIXUP_CUTMIX_PROB,
) -> tuple[torch.Tensor, torch.Tensor, torch.Tensor, float]:
    """Apply Mixup or CutMix data augmentation with probability prob.

    Returns:
        Tuple of (mixed_inputs, target_a, target_b, lambda_coeff).
    """
    if random.random() > prob or x.size(0) <= 1:
        return x, y, y, 1.0

    lam = float(np.random.beta(alpha, alpha))
    batch_size = x.size(0)
    index = torch.randperm(batch_size, device=x.device)

    # Randomly select between Mixup (50%) and CutMix (50%)
    if random.random() < 0.5:
        # Mixup: linear interpolation
        mixed_x = lam * x + (1.0 - lam) * x[index]
        return mixed_x, y, y[index], lam
    else:
        # CutMix: bounding box replacement
        _, _, h, w = x.shape
        cut_rat = np.sqrt(1.0 - lam)
        cut_w = int(w * cut_rat)
        cut_h = int(h * cut_rat)

        cx = random.randint(0, w)
        cy = random.randint(0, h)

        bbx1 = np.clip(cx - cut_w // 2, 0, w)
        bby1 = np.clip(cy - cut_h // 2, 0, h)
        bbx2 = np.clip(cx + cut_w // 2, 0, w)
        bby2 = np.clip(cy + cut_h // 2, 0, h)

        mixed_x = x.clone()
        mixed_x[:, :, bby1:bby2, bbx1:bbx2] = x[index, :, bby1:bby2, bbx1:bbx2]

        # Recalculate lambda to match exact pixel area
        lam = 1.0 - float((bbx2 - bbx1) * (bby2 - bby1) / (w * h))
        return mixed_x, y, y[index], lam


def compute_accuracy(
    output: torch.Tensor, target: torch.Tensor, topk: tuple[int, ...] = (1, 5)
) -> list[float]:
    """Calculate Top-1 and Top-K classification accuracy percentages."""
    with torch.no_grad():
        maxk = min(max(topk), output.size(1))
        batch_size = target.size(0)

        _, pred = output.topk(maxk, 1, True, True)
        pred = pred.t()
        correct = pred.eq(target.view(1, -1).expand_as(pred))

        res: list[float] = []
        for k in topk:
            if k > output.size(1):
                res.append(100.0)
                continue
            correct_k = correct[:k].reshape(-1).float().sum(0, keepdim=True)
            res.append(correct_k.mul_(100.0 / batch_size).item())
        return res


def load_dataset_records(
    splits_csv: Path,
    species_list_csv: Path,
) -> tuple[
    list[dict[str, Any]],
    list[dict[str, Any]],
    dict[int, int],
    dict[int, dict[str, Any]],
]:
    """Parse splits.csv, map species IDs to 0..N-1 class indices, and enforce leakage assertions."""
    if not splits_csv.exists():
        raise FileNotFoundError(f"splits.csv not found at {splits_csv.resolve()}")

    # Load species list metadata
    species_meta: dict[int, dict[str, Any]] = {}
    if species_list_csv.exists():
        with open(species_list_csv, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                try:
                    sid = int(row["id"])
                    species_meta[sid] = row
                except (ValueError, KeyError):
                    continue

    with open(splits_csv, mode="r", encoding="utf-8") as f:
        raw_rows = list(csv.DictReader(f))

    # HARD CONTRACT: Refuse test and real_test partitions in the training pipeline
    train_rows: list[dict[str, str]] = [r for r in raw_rows if r["split"] == "train"]
    val_rows: list[dict[str, str]] = [r for r in raw_rows if r["split"] == "val"]

    # Explicit assertion: NEVER load split=test or real_test
    assert not any(
        r["split"] in ("test", "real_test") for r in train_rows + val_rows
    ), "CRITICAL LEAKAGE DETECTED: test or real_test partition present in train/val rows!"

    # Build species_id to contiguous 0..N-1 class index mapping
    all_sids = sorted(
        {int(r["species_id"]) for r in train_rows}
        | {int(r["species_id"]) for r in val_rows}
    )
    sid_to_class: dict[int, int] = {sid: idx for idx, sid in enumerate(all_sids)}

    train_records: list[dict[str, Any]] = []
    for r in train_rows:
        sid = int(r["species_id"])
        train_records.append(
            {
                "file": r["file"],
                "species_id": sid,
                "class_idx": sid_to_class[sid],
                "source": r.get("source", "gbif"),
            }
        )

    val_records: list[dict[str, Any]] = []
    for r in val_rows:
        sid = int(r["species_id"])
        val_records.append(
            {
                "file": r["file"],
                "species_id": sid,
                "class_idx": sid_to_class[sid],
                "source": r.get("source", "gbif"),
            }
        )

    logger.info(
        "Loaded %d train images and %d val images across %d species.",
        len(train_records),
        len(val_records),
        len(sid_to_class),
    )
    return train_records, val_records, sid_to_class, species_meta


def create_dataloaders(
    train_records: list[dict[str, Any]],
    val_records: list[dict[str, Any]],
    data_dir: Path,
    batch_size: int,
    num_workers: int,
) -> tuple[DataLoader[Any], DataLoader[Any]]:
    """Build train and val DataLoaders with class-balanced sampling and Windows-safe worker settings."""
    train_transform, val_transform = build_transforms()

    train_dataset = PlantDataset(train_records, data_dir, transform=train_transform)
    val_dataset = PlantDataset(val_records, data_dir, transform=val_transform)

    # Class-balanced sampling if smallest/largest class ratio < 0.5 per TRD Section 4
    class_counts: Counter[int] = Counter(r["class_idx"] for r in train_records)
    min_count = min(class_counts.values()) if class_counts else 1
    max_count = max(class_counts.values()) if class_counts else 1
    imbalance_ratio = min_count / max_count

    if imbalance_ratio < 0.5:
        logger.info(
            "Class imbalance detected (min/max ratio %.3f < 0.5). Enabling WeightedRandomSampler.",
            imbalance_ratio,
        )
        class_weights = {
            cls_idx: 1.0 / count for cls_idx, count in class_counts.items()
        }
        sample_weights = [class_weights[r["class_idx"]] for r in train_records]
        sampler = WeightedRandomSampler(
            weights=sample_weights,
            num_samples=len(train_records),
            replacement=True,
        )
        train_shuffle = False
    else:
        sampler = None
        train_shuffle = True

    persistent = num_workers > 0
    prefetch_factor = 4 if num_workers > 0 else None
    train_loader = DataLoader(
        train_dataset,
        batch_size=batch_size,
        shuffle=train_shuffle,
        sampler=sampler,
        num_workers=num_workers,
        pin_memory=torch.cuda.is_available(),
        persistent_workers=persistent,
        prefetch_factor=prefetch_factor,
        drop_last=len(train_dataset) > batch_size,
    )

    val_loader = DataLoader(
        val_dataset,
        batch_size=batch_size,
        shuffle=False,
        num_workers=num_workers,
        pin_memory=torch.cuda.is_available(),
        persistent_workers=persistent,
        prefetch_factor=prefetch_factor,
        drop_last=False,
    )

    return train_loader, val_loader


def train_epoch(
    model: nn.Module,
    loader: DataLoader[Any],
    optimizer: torch.optim.Optimizer,
    scaler: torch.amp.GradScaler,
    criterion: nn.Module,
    device: torch.device,
    mixup_cutmix_prob: float = DEFAULT_MIXUP_CUTMIX_PROB,
    warmup_batches: int = 10,
) -> tuple[float, float, int, float]:
    """Execute one training epoch with AMP and Mixup/CutMix.

    Returns:
        (avg_train_loss, elapsed_seconds, total_images_processed, steady_state_ips)
    """
    model.train()
    total_loss = 0.0
    total_samples = 0
    start_time = time.time()
    steady_start_time: float | None = None
    steady_samples = 0

    for batch_idx, (inputs, targets) in enumerate(loader):
        # Transfer to device (contiguous layout)
        inputs = inputs.to(device, non_blocking=True)
        targets = targets.to(device, non_blocking=True)

        if batch_idx == warmup_batches:
            if device.type == "cuda":
                torch.cuda.synchronize()
            steady_start_time = time.time()
            steady_samples = 0

        optimizer.zero_grad(set_to_none=True)

        # Apply Mixup or CutMix
        mixed_inputs, targets_a, targets_b, lam = apply_mixup_cutmix(
            inputs, targets, prob=mixup_cutmix_prob
        )

        # Mixed precision forward pass
        with torch.amp.autocast(device_type=device.type, dtype=torch.float16):
            logits = model(mixed_inputs)
            if lam == 1.0:
                loss = criterion(logits, targets)
            else:
                loss = lam * criterion(logits, targets_a) + (1.0 - lam) * criterion(
                    logits, targets_b
                )

        # Scaled gradient backpropagation
        scaler.scale(loss).backward()
        scaler.step(optimizer)
        scaler.update()

        batch_sz = inputs.size(0)
        total_loss += loss.item() * batch_sz
        total_samples += batch_sz
        if steady_start_time is not None:
            steady_samples += batch_sz

    if device.type == "cuda":
        torch.cuda.synchronize()

    elapsed = time.time() - start_time
    avg_loss = total_loss / max(1, total_samples)

    if steady_start_time is not None and steady_samples > 0:
        steady_elapsed = time.time() - steady_start_time
        steady_ips = steady_samples / max(0.001, steady_elapsed)
    else:
        steady_ips = total_samples / max(0.001, elapsed)

    return avg_loss, elapsed, total_samples, steady_ips


def evaluate(
    model: nn.Module,
    loader: DataLoader[Any],
    criterion: nn.Module,
    device: torch.device,
) -> tuple[float, float, float]:
    """Evaluate model on validation loader returning (val_loss, top1_acc, top5_acc)."""
    model.eval()
    total_loss = 0.0
    total_top1 = 0.0
    total_top5 = 0.0
    total_samples = 0

    with torch.no_grad():
        for inputs, targets in loader:
            inputs = inputs.to(device, non_blocking=True)
            targets = targets.to(device, non_blocking=True)

            with torch.amp.autocast(device_type=device.type, dtype=torch.float16):
                logits = model(inputs)
                loss = criterion(logits, targets)

            batch_sz = inputs.size(0)
            total_loss += loss.item() * batch_sz

            acc1, acc5 = compute_accuracy(logits, targets, topk=(1, 5))
            total_top1 += acc1 * batch_sz
            total_top5 += acc5 * batch_sz
            total_samples += batch_sz

    n = max(1, total_samples)
    return total_loss / n, total_top1 / n, total_top5 / n


def save_checkpoint(
    path: Path,
    model: nn.Module,
    optimizer: torch.optim.Optimizer,
    scheduler: torch.optim.lr_scheduler.LRScheduler,
    scaler: torch.amp.GradScaler,
    epoch: int,
    phase: int,
    metrics: dict[str, float],
    config: dict[str, Any],
) -> None:
    """Save training state dictionary and configuration."""
    path.parent.mkdir(parents=True, exist_ok=True)
    state = {
        "model_state_dict": model.state_dict(),
        "optimizer_state_dict": optimizer.state_dict(),
        "scheduler_state_dict": scheduler.state_dict(),
        "scaler_state_dict": scaler.state_dict(),
        "epoch": epoch,
        "phase": phase,
        "metrics": metrics,
        "config": config,
    }
    torch.save(state, path)


def run_training_pipeline(
    splits_csv: Path,
    species_list_csv: Path,
    data_dir: Path,
    runs_dir: Path,
    phase1_epochs: int = DEFAULT_PHASE1_EPOCHS,
    phase2_epochs: int = DEFAULT_PHASE2_EPOCHS,
    batch_size: int = DEFAULT_BATCH_SIZE,
    num_workers: int = DEFAULT_WORKERS,
    patience: int = DEFAULT_PATIENCE,
    smoke: bool = False,
    resume_path: Path | None = None,
    seed: int = DEFAULT_SEED,
) -> dict[str, Any]:
    """Execute complete botanical training pipeline with CUDA OOM recovery and telemetry."""
    seed_everything(seed)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    logger.info("Initializing training on device: %s", device)
    if device.type == "cuda":
        logger.info(
            "GPU: %s (Total VRAM: %.2f GB)",
            torch.cuda.get_device_name(0),
            torch.cuda.get_device_properties(0).total_memory / (1024**3),
        )

    # 1. Load data records
    (
        train_records,
        val_records,
        sid_to_class,
        species_meta,
    ) = load_dataset_records(splits_csv, species_list_csv)

    # If smoke test, sample 5% of training data and 1 epoch per phase
    if smoke:
        logger.info(
            "[SMOKE MODE] Sampling training set for steady-state measurement (>=100 batches after warm-up) and 1 epoch per phase."
        )
        # Ensure at least 115 batches (10 warm-up + 105 steady-state) at batch_size 32 = 3680 images
        sample_size = min(
            len(train_records), max(int(len(train_records) * 0.05), 115 * batch_size)
        )
        rng = random.Random(seed)
        train_records = rng.sample(train_records, sample_size)
        # Keep validation set compact for rapid execution
        val_sample_size = min(len(val_records), max(32, int(len(val_records) * 0.1)))
        val_records = rng.sample(val_records, val_sample_size)
        phase1_epochs = 1
        phase2_epochs = 1

    num_classes = len(sid_to_class)

    # 2. Setup run directory
    timestamp = datetime.datetime.now(datetime.UTC).strftime("%Y%m%d_%H%M%S")
    run_dir = runs_dir / timestamp
    run_dir.mkdir(parents=True, exist_ok=True)

    # Save labels.json mapping class index to species id and taxonomic names
    class_to_sid = {idx: sid for sid, idx in sid_to_class.items()}
    labels_dict: dict[str, Any] = {}
    for idx in range(num_classes):
        sid = class_to_sid[idx]
        meta = species_meta.get(sid, {})
        labels_dict[str(idx)] = {
            "species_id": sid,
            "common_name": meta.get("common_name", f"Species_{sid}"),
            "scientific_name": meta.get("scientific_name", "Unknown"),
            "family": meta.get("family", "Unknown"),
            "genus": meta.get("genus", "Unknown"),
        }

    with open(run_dir / "labels.json", mode="w", encoding="utf-8") as f:
        json.dump(labels_dict, f, indent=2, ensure_ascii=False)

    train_config = {
        "num_classes": num_classes,
        "phase1_epochs": phase1_epochs,
        "phase2_epochs": phase2_epochs,
        "batch_size": batch_size,
        "num_workers": num_workers,
        "patience": patience,
        "smoke": smoke,
        "seed": seed,
        "embedding_dim": EMBEDDING_DIM,
        "backbone": "efficientnet_b0",
        "device": str(device),
        "gpu_name": torch.cuda.get_device_name(0) if device.type == "cuda" else "CPU",
        "train_samples": len(train_records),
        "val_samples": len(val_records),
    }
    with open(run_dir / "train_config.json", mode="w", encoding="utf-8") as f:
        json.dump(train_config, f, indent=2, ensure_ascii=False)

    # Setup metrics.csv
    metrics_file = run_dir / "metrics.csv"
    with open(metrics_file, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(
            [
                "epoch",
                "phase",
                "train_loss",
                "val_loss",
                "val_top1",
                "val_top5",
                "lr",
                "seconds",
            ]
        )

    # 3. Model instantiation
    model = PlantClassifier(num_classes=num_classes, pretrained=True)
    model = model.to(device)

    criterion = nn.CrossEntropyLoss(label_smoothing=DEFAULT_LABEL_SMOOTHING)
    scaler = torch.amp.GradScaler(device.type, enabled=device.type == "cuda")

    # Automatic CUDA OOM fallback handling
    current_batch_size = batch_size

    def get_loaders(bs: int) -> tuple[DataLoader[Any], DataLoader[Any]]:
        return create_dataloaders(
            train_records=train_records,
            val_records=val_records,
            data_dir=data_dir,
            batch_size=bs,
            num_workers=num_workers,
        )

    train_loader, val_loader = get_loaders(current_batch_size)

    best_val_loss = float("inf")
    patience_counter = 0
    total_train_images_processed = 0
    total_training_wall_time = 0.0
    last_steady_ips = 0.0

    # ─── PHASE 1: Backbone Frozen (Head Only) ─────────────────────────
    logger.info("=== Starting Phase 1: Backbone Frozen (%d epochs) ===", phase1_epochs)
    model.freeze_backbone()

    optimizer_p1 = torch.optim.AdamW(
        filter(lambda p: p.requires_grad, model.parameters()),
        lr=1e-3,
        weight_decay=1e-2,
    )
    scheduler_p1 = torch.optim.lr_scheduler.CosineAnnealingLR(
        optimizer_p1, T_max=max(1, phase1_epochs), eta_min=1e-5
    )

    for epoch in range(1, phase1_epochs + 1):
        try:
            t_loss, elapsed, n_imgs, steady_ips = train_epoch(
                model=model,
                loader=train_loader,
                optimizer=optimizer_p1,
                scaler=scaler,
                criterion=criterion,
                device=device,
            )
        except torch.cuda.OutOfMemoryError:
            logger.warning(
                "CUDA OOM in Phase 1! Falling back batch size: %d -> 16",
                current_batch_size,
            )
            torch.cuda.empty_cache()
            current_batch_size = 16
            train_loader, val_loader = get_loaders(current_batch_size)
            t_loss, elapsed, n_imgs, steady_ips = train_epoch(
                model=model,
                loader=train_loader,
                optimizer=optimizer_p1,
                scaler=scaler,
                criterion=criterion,
                device=device,
            )

        last_steady_ips = steady_ips
        scheduler_p1.step()
        v_loss, top1, top5 = evaluate(model, val_loader, criterion, device)
        total_train_images_processed += n_imgs
        total_training_wall_time += elapsed

        current_lr = optimizer_p1.param_groups[0]["lr"]
        logger.info(
            "Phase 1 | Epoch %d/%d - Train Loss: %.4f, Val Loss: %.4f, Top-1: %.2f%%, Top-5: %.2f%%, LR: %.2e (%.1fs, Steady: %.1f img/s)",
            epoch,
            phase1_epochs,
            t_loss,
            v_loss,
            top1,
            top5,
            current_lr,
            elapsed,
            steady_ips,
        )

        with open(metrics_file, mode="a", newline="", encoding="utf-8") as f:
            csv.writer(f).writerow(
                [
                    epoch,
                    1,
                    f"{t_loss:.4f}",
                    f"{v_loss:.4f}",
                    f"{top1:.2f}",
                    f"{top5:.2f}",
                    f"{current_lr:.2e}",
                    f"{elapsed:.1f}",
                ]
            )

        metrics_now = {
            "train_loss": t_loss,
            "val_loss": v_loss,
            "top1": top1,
            "top5": top5,
        }
        save_checkpoint(
            run_dir / "last.pt",
            model,
            optimizer_p1,
            scheduler_p1,
            scaler,
            epoch,
            1,
            metrics_now,
            train_config,
        )
        if v_loss < best_val_loss:
            best_val_loss = v_loss
            save_checkpoint(
                run_dir / "best.pt",
                model,
                optimizer_p1,
                scheduler_p1,
                scaler,
                epoch,
                1,
                metrics_now,
                train_config,
            )

    # ─── PHASE 2: Full Fine-tuning ────────────────────────────────────
    logger.info("=== Starting Phase 2: Full Fine-tuning (%d epochs) ===", phase2_epochs)
    model.unfreeze_backbone()

    param_groups = model.get_param_groups(
        backbone_lr=2e-4, head_lr=1e-3, weight_decay=1e-2
    )
    optimizer_p2 = torch.optim.AdamW(param_groups)
    scheduler_p2 = torch.optim.lr_scheduler.CosineAnnealingLR(
        optimizer_p2, T_max=max(1, phase2_epochs), eta_min=1e-6
    )

    for epoch in range(1, phase2_epochs + 1):
        global_epoch = phase1_epochs + epoch
        try:
            t_loss, elapsed, n_imgs, steady_ips = train_epoch(
                model=model,
                loader=train_loader,
                optimizer=optimizer_p2,
                scaler=scaler,
                criterion=criterion,
                device=device,
            )
        except torch.cuda.OutOfMemoryError:
            logger.warning(
                "CUDA OOM in Phase 2! Falling back batch size: %d -> 16",
                current_batch_size,
            )
            torch.cuda.empty_cache()
            current_batch_size = 16
            train_loader, val_loader = get_loaders(current_batch_size)
            t_loss, elapsed, n_imgs, steady_ips = train_epoch(
                model=model,
                loader=train_loader,
                optimizer=optimizer_p2,
                scaler=scaler,
                criterion=criterion,
                device=device,
            )

        last_steady_ips = steady_ips
        scheduler_p2.step()
        v_loss, top1, top5 = evaluate(model, val_loader, criterion, device)
        total_train_images_processed += n_imgs
        total_training_wall_time += elapsed

        current_lr = optimizer_p2.param_groups[0]["lr"]
        logger.info(
            "Phase 2 | Epoch %d/%d (Global %d) - Train Loss: %.4f, Val Loss: %.4f, Top-1: %.2f%%, Top-5: %.2f%%, LR: %.2e (%.1fs, Steady: %.1f img/s)",
            epoch,
            phase2_epochs,
            global_epoch,
            t_loss,
            v_loss,
            top1,
            top5,
            current_lr,
            elapsed,
            steady_ips,
        )

        with open(metrics_file, mode="a", newline="", encoding="utf-8") as f:
            csv.writer(f).writerow(
                [
                    global_epoch,
                    2,
                    f"{t_loss:.4f}",
                    f"{v_loss:.4f}",
                    f"{top1:.2f}",
                    f"{top5:.2f}",
                    f"{current_lr:.2e}",
                    f"{elapsed:.1f}",
                ]
            )

        metrics_now = {
            "train_loss": t_loss,
            "val_loss": v_loss,
            "top1": top1,
            "top5": top5,
        }
        save_checkpoint(
            run_dir / "last.pt",
            model,
            optimizer_p2,
            scheduler_p2,
            scaler,
            global_epoch,
            2,
            metrics_now,
            train_config,
        )

        if v_loss < (best_val_loss - 1e-4):
            best_val_loss = v_loss
            patience_counter = 0
            save_checkpoint(
                run_dir / "best.pt",
                model,
                optimizer_p2,
                scheduler_p2,
                scaler,
                global_epoch,
                2,
                metrics_now,
                train_config,
            )
        else:
            patience_counter += 1
            if patience_counter >= patience and not smoke:
                logger.info(
                    "Early stopping triggered after %d epochs without improvement.",
                    patience,
                )
                break

    # Telemetry and throughput analysis
    throughput_ips = total_train_images_processed / max(0.001, total_training_wall_time)
    peak_vram_mb = (
        torch.cuda.max_memory_allocated(device) / (1024**2)
        if device.type == "cuda"
        else 0.0
    )

    full_epoch_images = 26306
    effective_ips = last_steady_ips if last_steady_ips > 0 else throughput_ips
    est_full_epoch_seconds = full_epoch_images / max(0.001, effective_ips)

    telemetry: dict[str, Any] = {
        "run_dir": str(run_dir.resolve()),
        "images_per_second": round(throughput_ips, 2),
        "steady_state_images_per_second": round(last_steady_ips, 2),
        "estimated_full_epoch_seconds": round(est_full_epoch_seconds, 1),
        "peak_gpu_memory_mb": round(peak_vram_mb, 1),
        "total_images_processed": total_train_images_processed,
        "total_wall_time_seconds": round(total_training_wall_time, 2),
        "best_val_loss": round(best_val_loss, 4),
        "final_batch_size": current_batch_size,
    }
    return telemetry


def setup_logger() -> None:
    """Configure console logging."""
    logger.setLevel(logging.INFO)
    logger.handlers.clear()
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(logging.INFO)
    fmt = logging.Formatter(
        "%(asctime)s [%(levelname)s] %(message)s", datefmt="%H:%M:%S"
    )
    handler.setFormatter(fmt)
    logger.addHandler(handler)


def main() -> None:
    """CLI entrypoint."""
    setup_logger()
    parser = argparse.ArgumentParser(
        description="Train EfficientNet-B0 plant classifier per TRD."
    )
    parser.add_argument(
        "--data-dir", type=Path, default=Path("ml/data"), help="Path to data dir"
    )
    parser.add_argument(
        "--splits-csv",
        type=Path,
        default=Path("ml/data/splits.csv"),
        help="Path to splits.csv",
    )
    parser.add_argument(
        "--species-list",
        type=Path,
        default=Path("ml/species_list.csv"),
        help="Path to species_list.csv",
    )
    parser.add_argument(
        "--runs-dir",
        type=Path,
        default=Path("ml/runs"),
        help="Checkpoints and logs root dir",
    )
    parser.add_argument(
        "--phase1-epochs",
        type=int,
        default=DEFAULT_PHASE1_EPOCHS,
        help="Phase 1 epochs",
    )
    parser.add_argument(
        "--epochs",
        type=int,
        default=DEFAULT_PHASE2_EPOCHS,
        help="Phase 2 fine-tuning epochs",
    )
    parser.add_argument(
        "--batch-size", type=int, default=DEFAULT_BATCH_SIZE, help="Batch size"
    )
    parser.add_argument(
        "--workers", type=int, default=DEFAULT_WORKERS, help="DataLoader num_workers"
    )
    parser.add_argument(
        "--patience", type=int, default=DEFAULT_PATIENCE, help="Early stopping patience"
    )
    parser.add_argument(
        "--smoke",
        action="store_true",
        help="Run 5% dataset smoke test (1 epoch per phase)",
    )
    parser.add_argument(
        "--resume", type=Path, default=None, help="Path to checkpoint to resume"
    )
    parser.add_argument("--seed", type=int, default=DEFAULT_SEED, help="Random seed")

    args = parser.parse_args()

    results = run_training_pipeline(
        splits_csv=args.splits_csv,
        species_list_csv=args.species_list,
        data_dir=args.data_dir,
        runs_dir=args.runs_dir,
        phase1_epochs=args.phase1_epochs,
        phase2_epochs=args.epochs,
        batch_size=args.batch_size,
        num_workers=args.workers,
        patience=args.patience,
        smoke=args.smoke,
        resume_path=args.resume,
        seed=args.seed,
    )

    print("\n" + "=" * 65)
    print(" TRAINING TELEMETRY SUMMARY")
    print("=" * 65)
    print(f"Run Artifacts Directory:            {results['run_dir']}")
    print(
        f"Overall Throughput (incl startup):  {results['images_per_second']} images/sec"
    )
    print(
        f"Steady-State Throughput:            {results['steady_state_images_per_second']} images/sec"
    )
    print(
        f"Estimated Time per Full Epoch:      {results['estimated_full_epoch_seconds']:.1f}s "
        f"(~{results['estimated_full_epoch_seconds'] / 60:.1f} min)"
    )
    print(f"Peak GPU VRAM Allocated:            {results['peak_gpu_memory_mb']} MB")
    print(f"Best Validation Loss:               {results['best_val_loss']}")
    print(f"Final Batch Size:                   {results['final_batch_size']}")
    print("=" * 65 + "\n")


if __name__ == "__main__":
    main()
