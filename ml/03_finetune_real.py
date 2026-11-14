"""03_finetune_real.py - Fine-tune PlantAI checkpoint with real-world field photos.

Features:
  1. Loads existing checkpoint (ml/runs/20261113_190516/best.pt).
  2. Integrates real field photos (train split from ml/data/real_splits.csv).
  3. Oversamples real training photos with strong data augmentation.
  4. Augments Hibiscus training distribution with non-flower foliage images.
  5. Unfreezes the whole model with low differential learning rates (backbone 2e-5, head 8e-5).
  6. Disables Mixup/CutMix on real photo samples.
  7. Trains for 6-8 epochs and saves to a new run folder (never overwrites).
  8. Evaluates standard validation set to ensure zero catastrophic forgetting.
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
from pathlib import Path
from typing import Any

import numpy as np
import torch
from PIL import Image
from torch import nn
from torch.utils.data import DataLoader, Dataset
from torchvision import transforms

# Ensure ml directory is on sys.path
SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from model import EMBEDDING_DIM, TRD_MEAN, TRD_STD, PlantClassifier

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("finetune")


def seed_everything(seed: int = 42) -> None:
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)
    torch.backends.cudnn.benchmark = True


class FinetuneDataset(Dataset[tuple[torch.Tensor, int]]):
    """Hybrid dataset combining standard split images, oversampled real photos, and foliage images."""

    def __init__(
        self,
        samples: list[tuple[Path, int, bool]],
        standard_transform: transforms.Compose,
        real_transform: transforms.Compose,
    ) -> None:
        self.samples = samples
        self.standard_transform = standard_transform
        self.real_transform = real_transform

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, idx: int) -> tuple[torch.Tensor, int]:
        file_path, class_idx, is_real = self.samples[idx]
        try:
            with Image.open(file_path) as im:
                im = im.convert("RGB")
                if is_real:
                    tensor = self.real_transform(im)
                else:
                    tensor = self.standard_transform(im)
        except Exception as exc:
            logger.warning("Failed to open %s: %s; using fallback tensor", file_path, exc)
            tensor = torch.zeros((3, 224, 224), dtype=torch.float32)
        return tensor, class_idx


def find_hibiscus_foliage_images(raw_dir: Path) -> list[Path]:
    """Identify non-flower / leaf-heavy Hibiscus images from raw dataset."""
    hibiscus_dir = raw_dir / "20_hibiscus_rosa_sinensis"
    if not hibiscus_dir.exists():
        return []

    foliage: list[Path] = []
    supported_exts = {".jpg", ".jpeg", ".png", ".webp"}
    for f in sorted(hibiscus_dir.iterdir()):
        if f.is_file() and f.suffix.lower() in supported_exts:
            try:
                with Image.open(f) as im:
                    im_small = im.convert("RGB").resize((64, 64))
                    arr = np.array(im_small, dtype=float)
                    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
                    flower_mask = (r > g + 25) & (r > b + 15) & (r > 120)
                    flower_ratio = np.mean(flower_mask)
                    green_mask = (g > r) & (g > b)
                    green_ratio = np.mean(green_mask)
                    if flower_ratio < 0.05 and green_ratio > 0.40:
                        foliage.append(f)
            except Exception:
                continue
    return foliage


def build_finetune_samples(
    data_dir: Path,
    splits_csv: Path,
    real_splits_csv: Path,
    sid_to_class: dict[int, int],
    real_oversample: int = 80,
    foliage_oversample: int = 5,
    sample_stride: int = 2,
) -> tuple[list[tuple[Path, int, bool]], list[tuple[Path, int, bool]]]:
    """Construct balanced fine-tuning train and validation sample lists."""
    train_samples: list[tuple[Path, int, bool]] = []
    val_samples: list[tuple[Path, int, bool]] = []

    # 1. Standard splits
    with open(splits_csv, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for i, row in enumerate(reader):
            sid = int(row["species_id"])
            if sid not in sid_to_class:
                continue
            c_idx = sid_to_class[sid]
            file_path = data_dir / row["file"]
            split = row["split"]

            if split == "train":
                # Stride sampling to balance epoch size while preserving coverage across 150 classes
                if i % sample_stride == 0:
                    train_samples.append((file_path, c_idx, False))
            elif split == "val":
                val_samples.append((file_path, c_idx, False))

    logger.info(
        "Standard split baseline: %d train samples (stride %d), %d val samples",
        len(train_samples),
        sample_stride,
        len(val_samples),
    )

    # 2. Oversampled real photos (train split only)
    if real_splits_csv.exists():
        real_train_count = 0
        with open(real_splits_csv, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row["split"] == "train":
                    sid = int(row["species_id"])
                    if sid not in sid_to_class:
                        continue
                    c_idx = sid_to_class[sid]
                    file_path = Path(row["relpath"])
                    if not file_path.is_absolute():
                        file_path = data_dir.parent / file_path

                    if file_path.exists():
                        for _ in range(real_oversample):
                            train_samples.append((file_path, c_idx, True))
                        real_train_count += 1
        logger.info(
            "Added %d distinct real train photos oversampled %dx (total %d instances)",
            real_train_count,
            real_oversample,
            real_train_count * real_oversample,
        )

    # 3. Oversampled Hibiscus foliage images
    foliage_images = find_hibiscus_foliage_images(data_dir / "raw")
    if 20 in sid_to_class and foliage_images:
        hibiscus_cidx = sid_to_class[20]
        for f in foliage_images:
            for _ in range(foliage_oversample):
                train_samples.append((f, hibiscus_cidx, True))
        logger.info(
            "Added %d Hibiscus foliage images oversampled %dx (total %d instances)",
            len(foliage_images),
            foliage_oversample,
            len(foliage_images) * foliage_oversample,
        )

    random.shuffle(train_samples)
    return train_samples, val_samples


def evaluate_val(
    model: nn.Module,
    val_loader: DataLoader,
    criterion: nn.Module,
    device: torch.device,
) -> tuple[float, float, float]:
    model.eval()
    total_loss = 0.0
    correct1 = 0
    correct5 = 0
    total = 0

    with torch.no_grad():
        for images, targets in val_loader:
            images = images.to(device, non_blocking=True)
            targets = targets.to(device, non_blocking=True)
            logits = model(images)
            loss = criterion(logits, targets)
            total_loss += loss.item() * targets.size(0)

            _, pred = logits.topk(min(5, logits.size(1)), 1, True, True)
            pred = pred.t()
            correct = pred.eq(targets.view(1, -1).expand_as(pred))

            correct1 += int(correct[:1].reshape(-1).float().sum().item())
            correct5 += int(correct[:min(5, logits.size(1))].reshape(-1).float().sum().item())
            total += targets.size(0)

    val_loss = total_loss / max(1, total)
    top1 = correct1 / max(1, total) * 100.0
    top5 = correct5 / max(1, total) * 100.0
    return val_loss, top1, top5


def run_finetuning(
    base_run: Path,
    output_run: Path,
    epochs: int = 7,
    batch_size: int = 32,
    lr_backbone: float = 2.0e-5,
    lr_head: float = 8.0e-5,
    workers: int = 4,
    seed: int = 42,
) -> Path:
    seed_everything(seed)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    logger.info("Execution device: %s", device)

    # 1. Load labels.json from base run
    labels_file = base_run / "labels.json"
    with open(labels_file, mode="r", encoding="utf-8") as f:
        labels_meta: dict[str, dict[str, Any]] = json.load(f)

    num_classes = len(labels_meta)
    sid_to_class = {int(meta["species_id"]): int(idx) for idx, meta in labels_meta.items()}

    # 2. Setup output directory
    output_run.mkdir(parents=True, exist_ok=True)
    with open(output_run / "labels.json", mode="w", encoding="utf-8") as f:
        json.dump(labels_meta, f, indent=2)

    # 3. Setup transforms
    real_transform = transforms.Compose([
        transforms.RandomResizedCrop(224, scale=(0.7, 1.0)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomRotation(20),
        transforms.ColorJitter(brightness=0.3, contrast=0.3, saturation=0.3, hue=0.1),
        transforms.ToTensor(),
        transforms.Normalize(mean=TRD_MEAN, std=TRD_STD),
    ])

    standard_train_transform = transforms.Compose([
        transforms.RandomResizedCrop(224, scale=(0.8, 1.0)),
        transforms.RandomHorizontalFlip(),
        transforms.ToTensor(),
        transforms.Normalize(mean=TRD_MEAN, std=TRD_STD),
    ])

    val_transform = transforms.Compose([
        transforms.Resize(256),
        transforms.CenterCrop(224),
        transforms.ToTensor(),
        transforms.Normalize(mean=TRD_MEAN, std=TRD_STD),
    ])

    # 4. Build datasets & loaders
    data_dir = SCRIPT_DIR / "data"
    splits_csv = data_dir / "splits.csv"
    real_splits_csv = data_dir / "real_splits.csv"

    train_samples, val_samples = build_finetune_samples(
        data_dir=data_dir,
        splits_csv=splits_csv,
        real_splits_csv=real_splits_csv,
        sid_to_class=sid_to_class,
        real_oversample=80,
        foliage_oversample=5,
        sample_stride=2,
    )

    train_dataset = FinetuneDataset(train_samples, standard_train_transform, real_transform)
    val_dataset = FinetuneDataset(val_samples, val_transform, val_transform)

    train_loader = DataLoader(
        train_dataset,
        batch_size=batch_size,
        shuffle=True,
        num_workers=workers,
        pin_memory=(device.type == "cuda"),
    )
    val_loader = DataLoader(
        val_dataset,
        batch_size=batch_size,
        shuffle=False,
        num_workers=workers,
        pin_memory=(device.type == "cuda"),
    )

    # 5. Initialize model from base checkpoint
    model = PlantClassifier(num_classes=num_classes, pretrained=False)
    checkpoint_path = base_run / "best.pt"
    logger.info("Loading base weights from %s", checkpoint_path)
    ckpt = torch.load(checkpoint_path, map_location="cpu", weights_only=True)
    state_dict = ckpt["model_state_dict"] if isinstance(ckpt, dict) and "model_state_dict" in ckpt else ckpt
    model.load_state_dict(state_dict)
    model = model.to(device)

    # Unfreeze all parameters
    for p in model.parameters():
        p.requires_grad = True

    # 6. Differential parameter groups & optimizer
    backbone_params = []
    head_params = []
    for name, param in model.named_parameters():
        if "classifier" in name or "embedding_layer" in name:
            head_params.append(param)
        else:
            backbone_params.append(param)

    optimizer = torch.optim.AdamW([
        {"params": backbone_params, "lr": lr_backbone},
        {"params": head_params, "lr": lr_head},
    ], weight_decay=1e-2)

    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(
        optimizer, T_max=epochs, eta_min=1e-6
    )

    criterion = nn.CrossEntropyLoss(label_smoothing=0.05)
    scaler = torch.amp.GradScaler("cuda", enabled=(device.type == "cuda"))

    # Initial validation evaluation
    v_loss_0, top1_0, top5_0 = evaluate_val(model, val_loader, criterion, device)
    logger.info("Pre-finetune Validation: Loss %.4f | Top-1: %.2f%% | Top-5: %.2f%%", v_loss_0, top1_0, top5_0)

    best_val_loss = v_loss_0
    best_top1 = top1_0

    metrics_file = output_run / "metrics.csv"
    with open(metrics_file, mode="w", newline="", encoding="utf-8") as f:
        csv.writer(f).writerow(["epoch", "train_loss", "val_loss", "val_top1", "val_top5", "lr", "seconds"])

    print("\n" + "=" * 80)
    print(f" STARTING FINE-TUNING ON REAL PHOTOS ({epochs} Epochs)")
    print(f" Output Directory: {output_run}")
    print("=" * 80)

    for epoch in range(1, epochs + 1):
        t0 = time.time()
        model.train()
        train_loss = 0.0
        n_batches = 0

        for images, targets in train_loader:
            images = images.to(device, non_blocking=True)
            targets = targets.to(device, non_blocking=True)

            optimizer.zero_grad(set_to_none=True)
            with torch.amp.autocast("cuda", enabled=(device.type == "cuda")):
                logits = model(images)
                loss = criterion(logits, targets)

            scaler.scale(loss).backward()
            scaler.step(optimizer)
            scaler.update()

            train_loss += loss.item()
            n_batches += 1

        scheduler.step()
        elapsed = time.time() - t0
        avg_train_loss = train_loss / max(1, n_batches)

        # Validation
        val_loss, val_top1, val_top5 = evaluate_val(model, val_loader, criterion, device)
        cur_lr = optimizer.param_groups[0]["lr"]

        logger.info(
            "Epoch %d/%d - Train Loss: %.4f, Val Loss: %.4f, Val Top-1: %.2f%%, Val Top-5: %.2f%% (%.1fs)",
            epoch, epochs, avg_train_loss, val_loss, val_top1, val_top5, elapsed
        )

        with open(metrics_file, mode="a", newline="", encoding="utf-8") as f:
            csv.writer(f).writerow([
                epoch,
                f"{avg_train_loss:.4f}",
                f"{val_loss:.4f}",
                f"{val_top1:.2f}",
                f"{val_top5:.2f}",
                f"{cur_lr:.2e}",
                f"{elapsed:.1f}",
            ])

        # Save checkpoint
        ckpt_payload = {
            "epoch": epoch,
            "model_state_dict": model.state_dict(),
            "val_loss": val_loss,
            "val_top1": val_top1,
            "val_top5": val_top5,
        }
        torch.save(ckpt_payload, output_run / f"checkpoint_epoch_{epoch:02d}.pt")
        torch.save(ckpt_payload, output_run / "last.pt")

        if val_top1 >= best_top1 or val_loss < best_val_loss:
            best_top1 = max(best_top1, val_top1)
            best_val_loss = min(best_val_loss, val_loss)
            torch.save(ckpt_payload, output_run / "best.pt")
            logger.info("Saved new best checkpoint (Val Top-1: %.2f%%)", val_top1)

    logger.info("Fine-tuning completed. Best model saved at %s", output_run / "best.pt")
    return output_run


def main() -> None:
    parser = argparse.ArgumentParser(description="Fine-tune plant model with real-world field photos.")
    parser.add_argument(
        "--base-run",
        type=Path,
        default=SCRIPT_DIR / "runs" / "20261113_190516",
        help="Path to base checkpoint run directory",
    )
    parser.add_argument(
        "--output-run",
        type=Path,
        default=None,
        help="Path for new output run directory (defaults to timestamped run)",
    )
    parser.add_argument("--epochs", type=int, default=7, help="Number of fine-tuning epochs")
    parser.add_argument("--batch-size", type=int, default=32, help="Batch size")
    parser.add_argument("--lr-backbone", type=float, default=2e-5, help="Backbone learning rate")
    parser.add_argument("--lr-head", type=float, default=8e-5, help="Classifier head learning rate")
    parser.add_argument("--workers", type=int, default=4, help="DataLoader workers")
    parser.add_argument("--seed", type=int, default=42, help="Random seed")
    args = parser.parse_args()

    if args.output_run is None:
        tag = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        args.output_run = SCRIPT_DIR / "runs" / f"{tag}_finetune"

    run_finetuning(
        base_run=args.base_run,
        output_run=args.output_run,
        epochs=args.epochs,
        batch_size=args.batch_size,
        lr_backbone=args.lr_backbone,
        lr_head=args.lr_head,
        workers=args.workers,
        seed=args.seed,
    )


if __name__ == "__main__":
    main()
