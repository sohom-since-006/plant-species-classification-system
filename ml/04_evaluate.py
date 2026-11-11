"""04_evaluate.py - Comprehensive evaluation, calibration, and rejection tuning pipeline.

Evaluates trained PlantClassifier checkpoints per TRD Sections 5, 6, and 10 and TESTING Section 4:
  1. Loads best.pt from run directory (--run, default latest in ml/runs/) in eval mode with fp32.
  2. Applies TRD validation preprocessing (resize shorter side to 256, center crop 224, ImageNet norm).
  3. Collects logits and 1280-d embeddings for:
       - val (for calibration & rejection tuning)
       - test (never used for fitting)
       - real_test (if present)
       - negatives (non_plant and unseen_plant)
       - training set (to compute class centroids per TRD Section 6)
  4. Temperature scaling: fits single temperature T on validation logits via L-BFGS (minimizing NLL).
     Computes 15-bin ECE on test set before and after calibration.
  5. Test-set metrics: top-1, top-5, macro precision/recall/F1, per-class metrics table, full confusion
     matrix, 20 most confused pairs, classes with F1 < 0.70, and accuracy per confidence tier (High/Medium/Low).
  6. Unknown rejection tuning: chooses max-probability threshold and centroid cosine similarity threshold
     on validation and 50% tuning negatives to achieve >=90% non_plant rejection while maximizing accepted
     correct validation samples. Evaluates on holdout negatives and test set.
  7. Artifact exports into ml/runs/<run>/eval/:
       - metrics.json
       - per_class.csv
       - confusion_matrix.csv & confusion_matrix.json
       - calibration.json
       - thresholds.json
       - rejection.json
       - centroids.json
       - reliability_diagram.png
       - confusion_matrix.png
"""

from __future__ import annotations

import argparse
import csv
import datetime
import json
import logging
import random
import sys
from pathlib import Path
from typing import Any

import matplotlib
import matplotlib.pyplot as plt
import numpy as np
import torch
import torch.nn.functional as F
from PIL import Image
from sklearn.metrics import confusion_matrix, precision_recall_fscore_support
from torch import nn
from torch.utils.data import DataLoader, Dataset
from torchvision import transforms

# Use non-interactive backend for server/CLI execution
matplotlib.use("Agg")

# Ensure ml directory is on sys.path
ML_DIR = Path(__file__).resolve().parent
if str(ML_DIR) not in sys.path:
    sys.path.insert(0, str(ML_DIR))

from model import EMBEDDING_DIM, TRD_MEAN, TRD_STD, PlantClassifier

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("evaluate")

DEFAULT_SEED = 42
DEFAULT_BATCH_SIZE = 64
DEFAULT_WORKERS = 4
DEFAULT_BINS = 15
TRD_DEFAULT_PROB_THRESH = 0.35


def seed_everything(seed: int = DEFAULT_SEED) -> None:
    """Set random seeds across python, numpy, and pytorch for deterministic evaluation."""
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)


def find_latest_run_dir(runs_dir: Path) -> Path:
    """Find the most recently modified run directory in ml/runs containing best.pt."""
    if not runs_dir.exists():
        raise FileNotFoundError(f"Runs directory does not exist: {runs_dir}")

    candidates = [
        d
        for d in runs_dir.iterdir()
        if d.is_dir() and (d / "best.pt").is_file() and (d / "labels.json").is_file()
    ]
    if not candidates:
        raise FileNotFoundError(
            f"No run directories with best.pt and labels.json found in {runs_dir}"
        )

    candidates.sort(key=lambda p: p.stat().st_mtime, reverse=True)
    return candidates[0]


class EvaluationDataset(Dataset[tuple[torch.Tensor, int, str]]):
    """PyTorch Dataset loading images for evaluation with TRD preprocessing."""

    def __init__(
        self,
        records: list[dict[str, Any]],
        transform: transforms.Compose,
    ) -> None:
        self.records = records
        self.transform = transform

    def __len__(self) -> int:
        return len(self.records)

    def __getitem__(self, idx: int) -> tuple[torch.Tensor, int, str]:
        rec = self.records[idx]
        file_path = Path(rec["path"])
        class_idx = int(rec.get("class_idx", -1))
        file_id = str(rec.get("id", file_path.name))

        try:
            image = Image.open(file_path).convert("RGB")
        except (OSError, ValueError) as exc:
            logger.warning(
                "Failed to load image %s: %s; using black placeholder",
                file_path,
                exc,
            )
            image = Image.new("RGB", (224, 224), (0, 0, 0))

        tensor = self.transform(image)
        return tensor, class_idx, file_id


def build_val_transform() -> transforms.Compose:
    """Construct deterministic validation transform per TRD Section 5.

    Resize shorter side to 256, then center crop to 224x224, normalized by ImageNet statistics.
    """
    return transforms.Compose(
        [
            transforms.Resize(256),
            transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize(mean=TRD_MEAN, std=TRD_STD),
        ]
    )


def load_model_and_labels(
    run_dir: Path,
    device: torch.device,
) -> tuple[PlantClassifier, dict[str, dict[str, Any]], dict[int, int]]:
    """Load PlantClassifier weights from best.pt and label metadata from labels.json."""
    checkpoint_path = run_dir / "best.pt"
    labels_path = run_dir / "labels.json"

    if not checkpoint_path.exists():
        raise FileNotFoundError(f"Checkpoint best.pt not found in {run_dir}")
    if not labels_path.exists():
        raise FileNotFoundError(f"labels.json not found in {run_dir}")

    with open(labels_path, mode="r", encoding="utf-8") as f:
        labels_meta: dict[str, dict[str, Any]] = json.load(f)

    num_classes = len(labels_meta)
    sid_to_class: dict[int, int] = {
        int(meta["species_id"]): int(class_idx)
        for class_idx, meta in labels_meta.items()
    }

    model = PlantClassifier(num_classes=num_classes, pretrained=False)
    checkpoint = torch.load(checkpoint_path, map_location="cpu", weights_only=True)
    if isinstance(checkpoint, dict) and "model_state_dict" in checkpoint:
        state_dict = checkpoint["model_state_dict"]
    else:
        state_dict = checkpoint
    model.load_state_dict(state_dict)
    model = model.to(device).float()
    model.eval()  # Strictly evaluation mode

    logger.info(
        "Loaded best.pt (%d classes) onto %s from %s",
        num_classes,
        device,
        run_dir.name,
    )
    return model, labels_meta, sid_to_class


def collect_dataset_records(
    splits_csv: Path,
    data_dir: Path,
    sid_to_class: dict[int, int],
) -> tuple[
    list[dict[str, Any]],
    list[dict[str, Any]],
    list[dict[str, Any]],
    list[dict[str, Any]],
    list[dict[str, Any]],
]:
    """Parse splits.csv and negative directories into record dictionaries."""
    if not splits_csv.exists():
        raise FileNotFoundError(f"splits.csv not found at {splits_csv}")

    with open(splits_csv, mode="r", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    train_records: list[dict[str, Any]] = []
    val_records: list[dict[str, Any]] = []
    test_records: list[dict[str, Any]] = []
    real_test_records: list[dict[str, Any]] = []

    for r in rows:
        split = r["split"]
        sid = int(r["species_id"])
        if sid not in sid_to_class:
            continue
        c_idx = sid_to_class[sid]
        rec = {
            "path": data_dir / r["file"],
            "species_id": sid,
            "class_idx": c_idx,
            "id": r["file"],
        }
        if split == "train":
            train_records.append(rec)
        elif split == "val":
            val_records.append(rec)
        elif split == "test":
            test_records.append(rec)
        elif split == "real_test":
            real_test_records.append(rec)

    # Check for standalone real_test directory if not inside splits.csv
    real_test_dir = data_dir / "real_test"
    if real_test_dir.exists() and real_test_dir.is_dir():
        for p in sorted(real_test_dir.rglob("*")):
            if p.suffix.lower() in (".jpg", ".jpeg", ".png"):
                real_test_records.append(
                    {"path": p, "class_idx": -1, "id": str(p.name)}
                )

    # Collect negatives
    non_plant_dir = data_dir / "negatives" / "non_plant"
    unseen_plant_dir = data_dir / "negatives" / "unseen_plant"

    non_plant_records: list[dict[str, Any]] = []
    if non_plant_dir.exists():
        for p in sorted(non_plant_dir.rglob("*")):
            if p.suffix.lower() in (".jpg", ".jpeg", ".png"):
                non_plant_records.append(
                    {"path": p, "class_idx": -1, "id": str(p.name)}
                )

    unseen_plant_records: list[dict[str, Any]] = []
    if unseen_plant_dir.exists():
        for p in sorted(unseen_plant_dir.rglob("*")):
            if p.suffix.lower() in (".jpg", ".jpeg", ".png"):
                unseen_plant_records.append(
                    {"path": p, "class_idx": -1, "id": str(p.name)}
                )

    logger.info(
        "Collected records: train=%d, val=%d, test=%d, real_test=%d, non_plant=%d, unseen_plant=%d",
        len(train_records),
        len(val_records),
        len(test_records),
        len(real_test_records),
        len(non_plant_records),
        len(unseen_plant_records),
    )
    return (
        train_records,
        val_records,
        test_records,
        real_test_records,
        non_plant_records + unseen_plant_records,
    )


def extract_embeddings_and_logits(
    model: PlantClassifier,
    dataloader: DataLoader[tuple[torch.Tensor, int, str]],
    device: torch.device,
    desc: str = "Inference",
) -> tuple[torch.Tensor, torch.Tensor, torch.Tensor, list[str]]:
    """Pass batches through model in eval mode, returning logits, embeddings, labels, and IDs."""
    model.eval()
    all_logits: list[torch.Tensor] = []
    all_embeddings: list[torch.Tensor] = []
    all_labels: list[torch.Tensor] = []
    all_ids: list[str] = []

    total_batches = len(dataloader)
    logger.info("Extracting representations [%s]: %d batches...", desc, total_batches)

    with torch.no_grad():
        for batch_idx, (images, targets, file_ids) in enumerate(dataloader, start=1):
            images = images.to(device, non_blocking=True).float()
            logits, embeddings, _ = model.forward_features_and_embedding(images)

            all_logits.append(logits.cpu())
            all_embeddings.append(embeddings.cpu())
            all_labels.append(targets.cpu())
            all_ids.extend(file_ids)

            if (
                batch_idx % max(1, total_batches // 5) == 0
                or batch_idx == total_batches
            ):
                logger.info(
                    "  [%s] batch %d / %d completed", desc, batch_idx, total_batches
                )

    logits_tensor = (
        torch.cat(all_logits, dim=0)
        if all_logits
        else torch.empty((0, model.num_classes))
    )
    embeddings_tensor = (
        torch.cat(all_embeddings, dim=0)
        if all_embeddings
        else torch.empty((0, EMBEDDING_DIM))
    )
    labels_tensor = (
        torch.cat(all_labels, dim=0)
        if all_labels
        else torch.empty((0,), dtype=torch.long)
    )

    return logits_tensor, embeddings_tensor, labels_tensor, all_ids


def compute_class_centroids(
    train_embeddings: torch.Tensor,
    train_labels: torch.Tensor,
    num_classes: int,
) -> torch.Tensor:
    """Compute mean 1280-d training set embedding for each class per TRD Section 6.

    HARD RULE: Centroids are computed strictly from the TRAINING set, NEVER the test set.
    """
    centroids = torch.zeros((num_classes, EMBEDDING_DIM), dtype=torch.float32)
    for c in range(num_classes):
        mask = train_labels == c
        if mask.any():
            centroids[c] = train_embeddings[mask].mean(dim=0)
        else:
            logger.warning(
                "Class %d has zero training samples for centroid computation!", c
            )
    return centroids


class TemperatureScaler(nn.Module):
    """Post-hoc temperature scaling calibration strictly fitting T on validation logits."""

    def __init__(self, min_t: float = 0.05, max_t: float = 10.0) -> None:
        super().__init__()
        self.min_t = min_t
        self.max_t = max_t
        self.log_temperature = nn.Parameter(torch.zeros(1, dtype=torch.float32))

    @property
    def temperature(self) -> float:
        """Current temperature value bounded within [min_t, max_t]."""
        return float(
            torch.exp(self.log_temperature).clamp(self.min_t, self.max_t).item()
        )

    def forward(self, logits: torch.Tensor) -> torch.Tensor:
        """Scale logits by fitted temperature."""
        if self.training:
            t = torch.exp(self.log_temperature).clamp(self.min_t, self.max_t)
            return logits / t
        with torch.no_grad():
            return logits.detach() / self.temperature

    def fit(self, val_logits: torch.Tensor, val_labels: torch.Tensor) -> float:
        """Fit single temperature parameter on validation logits via L-BFGS to minimize NLL."""
        # Detach and cast
        logits = val_logits.detach().float()
        labels = val_labels.detach().long()

        nll_criterion = nn.CrossEntropyLoss()
        optimizer = torch.optim.LBFGS(
            [self.log_temperature],
            lr=0.05,
            max_iter=100,
            line_search_fn="strong_wolfe",
        )

        def closure() -> torch.Tensor:
            optimizer.zero_grad()
            t = torch.exp(self.log_temperature).clamp(self.min_t, self.max_t)
            loss = nll_criterion(logits / t, labels)
            loss.backward()
            return loss

        optimizer.step(closure)
        fitted_t = self.temperature
        logger.info("Temperature scaling converged: T = %.4f", fitted_t)
        return fitted_t


def compute_ece_and_bins(
    probs: torch.Tensor,
    labels: torch.Tensor,
    n_bins: int = DEFAULT_BINS,
) -> tuple[float, list[dict[str, Any]]]:
    """Calculate Expected Calibration Error (ECE) across 15 equal-width bins in [0, 1].

    Formula:
      ECE = sum_{m=1}^M (|B_m| / N) * |acc(B_m) - conf(B_m)|
    """
    confidences, predictions = torch.max(probs, dim=1)
    accuracies = (predictions == labels).float()

    bin_boundaries = torch.linspace(0.0, 1.0, n_bins + 1)
    total_samples = len(labels)
    if total_samples == 0:
        return 0.0, []

    ece = 0.0
    bins_data: list[dict[str, Any]] = []

    for i in range(n_bins):
        bin_lower = float(bin_boundaries[i].item())
        bin_upper = float(bin_boundaries[i + 1].item())
        bin_center = (bin_lower + bin_upper) / 2.0

        if i == 0:
            in_bin = (confidences >= bin_lower) & (confidences <= bin_upper)
        else:
            in_bin = (confidences > bin_lower) & (confidences <= bin_upper)

        count = int(in_bin.sum().item())
        if count > 0:
            acc = float(accuracies[in_bin].mean().item())
            conf = float(confidences[in_bin].mean().item())
            gap = abs(acc - conf)
            ece += (count / total_samples) * gap
        else:
            acc = 0.0
            conf = bin_center
            gap = 0.0

        bins_data.append(
            {
                "bin_index": i,
                "bin_lower": round(bin_lower, 4),
                "bin_upper": round(bin_upper, 4),
                "bin_center": round(bin_center, 4),
                "sample_count": count,
                "accuracy": round(acc, 4),
                "confidence": round(conf, 4),
                "gap": round(gap, 4),
            }
        )

    return float(ece), bins_data


def compute_test_metrics(
    calibrated_probs: torch.Tensor,
    labels: torch.Tensor,
    num_classes: int,
    labels_meta: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    """Compute comprehensive test-set classification metrics."""
    calibrated_probs = calibrated_probs.detach()
    labels = labels.detach()
    total_samples = len(labels)
    y_true = labels.cpu().numpy()
    confidences, preds = torch.max(calibrated_probs, dim=1)
    y_pred = preds.cpu().numpy()

    # Top-1 accuracy
    top1_correct = (preds == labels).sum().item()
    top1_acc = (top1_correct / total_samples) * 100.0 if total_samples > 0 else 0.0

    # Top-5 accuracy
    _, top5_preds = torch.topk(calibrated_probs, k=min(5, num_classes), dim=1)
    labels_expanded = labels.view(-1, 1).expand_as(top5_preds)
    top5_correct = (top5_preds == labels_expanded).any(dim=1).sum().item()
    top5_acc = (top5_correct / total_samples) * 100.0 if total_samples > 0 else 0.0

    # Macro Precision, Recall, F1
    precision, recall, f1, _ = precision_recall_fscore_support(
        y_true, y_pred, average="macro", zero_division=0
    )

    # Per-class metrics
    p_per, r_per, f1_per, support_per = precision_recall_fscore_support(
        y_true, y_pred, labels=list(range(num_classes)), average=None, zero_division=0
    )

    per_class_list: list[dict[str, Any]] = []
    classes_below_70: list[dict[str, Any]] = []

    for c in range(num_classes):
        meta = labels_meta.get(str(c), {})
        supp = int(support_per[c])
        mask_c = y_true == c
        c_acc = float((y_pred[mask_c] == c).sum() / supp * 100.0) if supp > 0 else 0.0
        row_info = {
            "class_idx": c,
            "species_id": meta.get("species_id", c),
            "common_name": meta.get("common_name", f"Class {c}"),
            "scientific_name": meta.get("scientific_name", f"Species {c}"),
            "family": meta.get("family", "Unknown"),
            "genus": meta.get("genus", "Unknown"),
            "support": supp,
            "top1_accuracy": round(c_acc, 2),
            "precision": round(float(p_per[c]), 4),
            "recall": round(float(r_per[c]), 4),
            "f1": round(float(f1_per[c]), 4),
        }
        per_class_list.append(row_info)
        if row_info["f1"] < 0.70:
            classes_below_70.append(row_info)

    classes_below_70.sort(key=lambda x: x["f1"])

    # Full Confusion Matrix
    cm = confusion_matrix(y_true, y_pred, labels=list(range(num_classes)))

    # 20 Most Confused Pairs
    confused_pairs: list[dict[str, Any]] = []
    for i in range(num_classes):
        for j in range(num_classes):
            if i != j and cm[i, j] > 0:
                i_meta = labels_meta.get(str(i), {})
                j_meta = labels_meta.get(str(j), {})
                supp_i = int(support_per[i])
                pct = (cm[i, j] / supp_i * 100.0) if supp_i > 0 else 0.0
                confused_pairs.append(
                    {
                        "true_class_idx": i,
                        "pred_class_idx": j,
                        "true_name": f"{i_meta.get('common_name', i)} ({i_meta.get('scientific_name', '')})",
                        "pred_name": f"{j_meta.get('common_name', j)} ({j_meta.get('scientific_name', '')})",
                        "count": int(cm[i, j]),
                        "percent_of_true_class": round(pct, 2),
                    }
                )

    confused_pairs.sort(key=lambda x: x["count"], reverse=True)
    top20_confused = confused_pairs[:20]

    # Accuracy per Confidence Tier (High > 0.85, Medium 0.60..0.85, Low < 0.60)
    conf_np = confidences.cpu().numpy()
    correct_np = (preds == labels).cpu().numpy()

    high_mask = conf_np > 0.85
    med_mask = (conf_np >= 0.60) & (conf_np <= 0.85)
    low_mask = conf_np < 0.60

    tier_metrics = {
        "high": {
            "range": "> 0.85",
            "count": int(high_mask.sum()),
            "percentage": (
                round(float(high_mask.sum() / total_samples * 100.0), 2)
                if total_samples > 0
                else 0.0
            ),
            "accuracy": (
                round(float(correct_np[high_mask].mean() * 100.0), 2)
                if high_mask.sum() > 0
                else 0.0
            ),
        },
        "medium": {
            "range": "0.60 - 0.85",
            "count": int(med_mask.sum()),
            "percentage": (
                round(float(med_mask.sum() / total_samples * 100.0), 2)
                if total_samples > 0
                else 0.0
            ),
            "accuracy": (
                round(float(correct_np[med_mask].mean() * 100.0), 2)
                if med_mask.sum() > 0
                else 0.0
            ),
        },
        "low": {
            "range": "< 0.60",
            "count": int(low_mask.sum()),
            "percentage": (
                round(float(low_mask.sum() / total_samples * 100.0), 2)
                if total_samples > 0
                else 0.0
            ),
            "accuracy": (
                round(float(correct_np[low_mask].mean() * 100.0), 2)
                if low_mask.sum() > 0
                else 0.0
            ),
        },
    }

    return {
        "top1_accuracy": round(top1_acc, 2),
        "top5_accuracy": round(top5_acc, 2),
        "macro_precision": round(float(precision), 4),
        "macro_recall": round(float(recall), 4),
        "macro_f1": round(float(f1), 4),
        "tier_metrics": tier_metrics,
        "per_class": per_class_list,
        "classes_below_f1_70": classes_below_70,
        "top20_confused_pairs": top20_confused,
        "confusion_matrix": cm.tolist(),
    }


def compute_max_cosine_sims(
    embeddings: torch.Tensor,
    centroids: torch.Tensor,
) -> torch.Tensor:
    """Compute maximum cosine similarity to any class centroid for each sample."""
    norm_emb = F.normalize(embeddings.float(), p=2, dim=1)
    norm_cent = F.normalize(centroids.float(), p=2, dim=1)
    # Cosine similarities matrix: (N, num_classes)
    sims = torch.mm(norm_emb, norm_cent.t())
    max_sims, _ = torch.max(sims, dim=1)
    return max_sims


def tune_unknown_rejection(
    val_pmax: np.ndarray,
    val_smax: np.ndarray,
    val_correct: np.ndarray,
    neg_pmax_tune: np.ndarray,
    neg_smax_tune: np.ndarray,
    min_neg_rejection: float = 0.90,
    trd_prob_baseline: float = TRD_DEFAULT_PROB_THRESH,
) -> tuple[float, float, dict[str, Any]]:
    """Grid search for (prob_threshold, tau_similarity_threshold).

    Rejection rule per TRD Section 5:
      Rejected if p_max < theta OR s_max < tau
      Accepted if p_max >= theta AND s_max >= tau

    Selects (theta, tau) on validation + tuning negatives to reject >=90% of non_plant negatives
    while maximizing the number of accepted correctly classified validation images.
    """
    total_val_correct = int(val_correct.sum())
    total_neg = len(neg_pmax_tune)

    if total_neg == 0:
        logger.warning(
            "Zero tuning negatives available; using TRD baseline thresholds."
        )
        return trd_prob_baseline, 0.40, {"note": "No tuning negatives available"}

    val_correct_pmax = val_pmax[val_correct]
    val_correct_smax = val_smax[val_correct]

    theta_grid = np.linspace(0.20, 0.80, 61)  # step 0.01
    tau_grid = np.linspace(0.20, 0.80, 61)  # step 0.01

    best_theta = trd_prob_baseline
    best_tau = 0.40
    best_val_accepted_count = -1
    best_neg_rej_rate = 0.0

    valid_candidates: list[tuple[float, float, int, float]] = []
    all_candidates: list[tuple[float, float, int, float]] = []

    for theta in theta_grid:
        for tau in tau_grid:
            # Rejection rule on negatives
            neg_rej = (neg_pmax_tune < theta) | (neg_smax_tune < tau)
            rej_rate = float(neg_rej.mean())

            # Acceptance rule on correct validation samples
            val_acc = (val_correct_pmax >= theta) & (val_correct_smax >= tau)
            val_acc_count = int(val_acc.sum())

            candidate = (float(theta), float(tau), val_acc_count, rej_rate)
            all_candidates.append(candidate)

            if rej_rate >= min_neg_rejection:
                valid_candidates.append(candidate)

    if valid_candidates:
        # Sort by:
        # 1. Maximize accepted validation images (descending)
        # 2. Maximize negative rejection rate (descending)
        # 3. Minimize distance to TRD default 0.35 (ascending)
        valid_candidates.sort(
            key=lambda x: (x[2], x[3], -abs(x[0] - trd_prob_baseline)),
            reverse=True,
        )
        best_theta, best_tau, best_val_accepted_count, best_neg_rej_rate = (
            valid_candidates[0]
        )
    else:
        logger.warning(
            "No candidate threshold pair met %.1f%% non_plant rejection on tuning set. Selecting closest.",
            min_neg_rejection * 100.0,
        )
        # Fallback: maximize rejection rate, then validation acceptance
        all_candidates.sort(key=lambda x: (x[3], x[2]), reverse=True)
        best_theta, best_tau, best_val_accepted_count, best_neg_rej_rate = (
            all_candidates[0]
        )

    val_acc_pct = (
        (best_val_accepted_count / total_val_correct * 100.0)
        if total_val_correct > 0
        else 0.0
    )

    tuning_summary = {
        "prob_threshold": round(best_theta, 4),
        "tau_threshold": round(best_tau, 4),
        "neg_tune_count": total_neg,
        "neg_tune_rejection_rate": round(best_neg_rej_rate * 100.0, 2),
        "val_correct_accepted_count": best_val_accepted_count,
        "val_correct_total": total_val_correct,
        "val_correct_accepted_pct": round(val_acc_pct, 2),
        "target_met": bool(best_neg_rej_rate >= min_neg_rejection),
    }

    return best_theta, best_tau, tuning_summary


def evaluate_rejection_on_splits(
    theta: float,
    tau: float,
    test_pmax: np.ndarray,
    test_smax: np.ndarray,
    test_correct: np.ndarray,
    non_plant_holdout_pmax: np.ndarray,
    non_plant_holdout_smax: np.ndarray,
    unseen_plant_holdout_pmax: np.ndarray,
    unseen_plant_holdout_smax: np.ndarray,
) -> dict[str, Any]:
    """Evaluate calibrated rejection rules on test set and negative holdout splits."""
    # Test set acceptance: p_max >= theta AND s_max >= tau
    test_accepted = (test_pmax >= theta) & (test_smax >= tau)
    test_acc_rate = float(test_accepted.mean() * 100.0) if len(test_pmax) > 0 else 0.0

    test_correct_accepted = (test_pmax[test_correct] >= theta) & (
        test_smax[test_correct] >= tau
    )
    test_correct_acc_rate = (
        float(test_correct_accepted.mean() * 100.0)
        if len(test_correct_accepted) > 0
        else 0.0
    )

    test_incorrect = ~test_correct
    test_incorrect_accepted = (test_pmax[test_incorrect] >= theta) & (
        test_smax[test_incorrect] >= tau
    )
    test_incorrect_acc_rate = (
        float(test_incorrect_accepted.mean() * 100.0)
        if len(test_incorrect_accepted) > 0
        else 0.0
    )

    # Negative holdout rejection: p_max < theta OR s_max < tau
    # non_plant holdout
    np_rej = (non_plant_holdout_pmax < theta) | (non_plant_holdout_smax < tau)
    np_rej_rate = (
        float(np_rej.mean() * 100.0) if len(non_plant_holdout_pmax) > 0 else 0.0
    )

    # unseen_plant holdout
    up_rej = (unseen_plant_holdout_pmax < theta) | (unseen_plant_holdout_smax < tau)
    up_rej_rate = (
        float(up_rej.mean() * 100.0) if len(unseen_plant_holdout_pmax) > 0 else 0.0
    )

    return {
        "thresholds": {
            "prob_threshold": round(theta, 4),
            "tau_threshold": round(tau, 4),
        },
        "holdout": {
            "non_plant_holdout_count": len(non_plant_holdout_pmax),
            "non_plant_rejection_rate_pct": round(np_rej_rate, 2),
            "non_plant_target_met": bool(np_rej_rate >= 90.0),
            "unseen_plant_holdout_count": len(unseen_plant_holdout_pmax),
            "unseen_plant_rejection_rate_pct": round(up_rej_rate, 2),
        },
        "test_set": {
            "total_test_samples": len(test_pmax),
            "overall_acceptance_rate_pct": round(test_acc_rate, 2),
            "correct_predictions_acceptance_rate_pct": round(test_correct_acc_rate, 2),
            "incorrect_predictions_acceptance_rate_pct": round(
                test_incorrect_acc_rate, 2
            ),
        },
    }


def plot_reliability_diagram(
    bins_before: list[dict[str, Any]],
    ece_before: float,
    bins_after: list[dict[str, Any]],
    ece_after: float,
    temperature: float,
    output_path: Path,
) -> None:
    """Generate side-by-side reliability diagram comparison before and after calibration."""
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 6), dpi=150)

    for ax, bins_data, ece_val, title, t_val in [
        (ax1, bins_before, ece_before, "Uncalibrated", 1.0),
        (ax2, bins_after, ece_after, "Calibrated", temperature),
    ]:
        bin_centers = [b["bin_center"] for b in bins_data]
        accuracies = [b["accuracy"] for b in bins_data]
        confidences = [b["confidence"] for b in bins_data]
        counts = [b["sample_count"] for b in bins_data]

        width = 1.0 / len(bins_data)
        # Accuracy bars
        ax.bar(
            bin_centers,
            accuracies,
            width=width * 0.9,
            color="#1f7a4d",
            alpha=0.85,
            edgecolor="#165335",
            label="Outputs (Accuracy)",
        )

        # Gap bars
        gaps = [abs(a - c) for a, c in zip(accuracies, confidences)]
        ax.bar(
            bin_centers,
            gaps,
            bottom=[min(a, c) for a, c in zip(accuracies, confidences)],
            width=width * 0.9,
            color="#e53e3e",
            alpha=0.35,
            edgecolor="#9b2c2c",
            linestyle="--",
            label="Gap (|Acc - Conf|)",
        )

        # Diagonal identity line
        ax.plot(
            [0, 1],
            [0, 1],
            linestyle="--",
            color="#4a5568",
            linewidth=1.5,
            label="Perfect calibration",
        )

        ax.set_xlim(0, 1)
        ax.set_ylim(0, 1.02)
        ax.set_xlabel("Confidence", fontsize=11)
        ax.set_ylabel("Accuracy", fontsize=11)
        ax.set_title(
            f"{title} (T = {t_val:.3f})\nECE = {ece_val * 100.0:.2f}%",
            fontsize=12,
            fontweight="bold",
        )
        ax.grid(True, linestyle=":", alpha=0.6)
        ax.legend(loc="upper left", framealpha=0.9)

        # Inset histogram for sample distribution
        ax_inset = ax.inset_axes([0.60, 0.12, 0.35, 0.25])
        ax_inset.bar(bin_centers, counts, width=width * 0.9, color="#2d3748", alpha=0.7)
        ax_inset.set_title("Sample count", fontsize=8)
        ax_inset.set_xticks([0.0, 0.5, 1.0])
        ax_inset.tick_params(labelsize=7)

    plt.suptitle(
        "Reliability Diagram & Expected Calibration Error (Test Set)",
        fontsize=14,
        fontweight="bold",
    )
    plt.tight_layout()
    plt.savefig(output_path)
    plt.close(fig)
    logger.info("Saved reliability diagram to %s", output_path)


def plot_confusion_matrix(
    cm: np.ndarray,
    labels_meta: dict[str, dict[str, Any]],
    output_path: Path,
) -> None:
    """Generate high-resolution confusion matrix heatmap visualization."""
    fig, ax = plt.subplots(figsize=(16, 14), dpi=150)
    cax = ax.imshow(cm, interpolation="nearest", cmap="Greens")
    fig.colorbar(cax, ax=ax, fraction=0.046, pad=0.04)

    num_classes = cm.shape[0]
    step = max(1, num_classes // 20)
    ticks = list(range(0, num_classes, step))
    tick_labels = [
        labels_meta.get(str(i), {}).get("common_name", str(i)) for i in ticks
    ]

    ax.set_xticks(ticks)
    ax.set_xticklabels(tick_labels, rotation=45, ha="right", fontsize=8)
    ax.set_yticks(ticks)
    ax.set_yticklabels(tick_labels, fontsize=8)

    ax.set_xlabel("Predicted Species Index", fontsize=12)
    ax.set_ylabel("True Species Index", fontsize=12)
    ax.set_title(
        f"Test Set Confusion Matrix ({num_classes} Classes)",
        fontsize=14,
        fontweight="bold",
    )

    plt.tight_layout()
    plt.savefig(output_path)
    plt.close(fig)
    logger.info("Saved confusion matrix heatmap to %s", output_path)


def export_evaluation_artifacts(
    eval_dir: Path,
    test_metrics: dict[str, Any],
    calibration_data: dict[str, Any],
    thresholds_data: dict[str, Any],
    rejection_data: dict[str, Any],
    centroids: torch.Tensor,
    real_test_metrics: dict[str, Any] | None = None,
) -> None:
    """Write all structured artifacts to ml/runs/<run>/eval/."""
    eval_dir.mkdir(parents=True, exist_ok=True)

    # 1. metrics.json
    metrics_summary: dict[str, Any] = {
        "evaluated_at": datetime.datetime.now(datetime.UTC).isoformat(),
        "test_top1_accuracy": test_metrics["top1_accuracy"],
        "test_top5_accuracy": test_metrics["top5_accuracy"],
        "macro_precision": test_metrics["macro_precision"],
        "macro_recall": test_metrics["macro_recall"],
        "macro_f1": test_metrics["macro_f1"],
        "calibration": {
            "temperature": calibration_data["temperature"],
            "test_ece_before": round(calibration_data["test_ece_before"] * 100.0, 2),
            "test_ece_after": round(calibration_data["test_ece_after"] * 100.0, 2),
        },
        "thresholds": thresholds_data,
        "confidence_tiers": test_metrics["tier_metrics"],
        "classes_below_f1_70": test_metrics["classes_below_f1_70"],
        "top20_confused_pairs": test_metrics["top20_confused_pairs"],
    }
    if real_test_metrics is not None:
        metrics_summary["real_test_metrics"] = real_test_metrics
    with open(eval_dir / "metrics.json", mode="w", encoding="utf-8") as f:
        json.dump(metrics_summary, f, indent=2)

    # 2. per_class.csv
    per_class_csv_path = eval_dir / "per_class.csv"
    with open(per_class_csv_path, mode="w", newline="", encoding="utf-8") as f:
        fieldnames = [
            "class_idx",
            "species_id",
            "common_name",
            "scientific_name",
            "family",
            "genus",
            "support",
            "top1_accuracy",
            "precision",
            "recall",
            "f1",
        ]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in test_metrics["per_class"]:
            writer.writerow(row)

    # 3. confusion_matrix.csv & confusion_matrix.json
    cm = test_metrics["confusion_matrix"]
    with open(eval_dir / "confusion_matrix.json", mode="w", encoding="utf-8") as f:
        json.dump(cm, f)

    with open(
        eval_dir / "confusion_matrix.csv", mode="w", newline="", encoding="utf-8"
    ) as f:
        writer = csv.writer(f)
        writer.writerow(["true_class_idx"] + [f"pred_{j}" for j in range(len(cm))])
        for idx, row in enumerate(cm):
            writer.writerow([idx] + row)

    # 4. calibration.json
    with open(eval_dir / "calibration.json", mode="w", encoding="utf-8") as f:
        json.dump(calibration_data, f, indent=2)

    # 5. thresholds.json
    with open(eval_dir / "thresholds.json", mode="w", encoding="utf-8") as f:
        json.dump(thresholds_data, f, indent=2)

    # 6. rejection.json
    with open(eval_dir / "rejection.json", mode="w", encoding="utf-8") as f:
        json.dump(rejection_data, f, indent=2)

    # 7. centroids.json
    centroids_list = centroids.cpu().numpy().tolist()
    centroids_dict = {str(i): centroids_list[i] for i in range(len(centroids_list))}
    with open(eval_dir / "centroids.json", mode="w", encoding="utf-8") as f:
        json.dump(centroids_dict, f)

    logger.info("Successfully exported all evaluation artifacts into %s", eval_dir)


def main() -> None:
    """CLI Entry point for model evaluation and rejection calibration."""
    parser = argparse.ArgumentParser(
        description="Evaluate plant species classification model."
    )
    parser.add_argument(
        "--run",
        type=str,
        default="",
        help="Path or directory name of the run in ml/runs/ (default: latest).",
    )
    parser.add_argument(
        "--data-dir",
        type=str,
        default="ml/data",
        help="Base data directory (default: ml/data).",
    )
    parser.add_argument(
        "--splits-csv",
        type=str,
        default="ml/data/splits.csv",
        help="Splits CSV file path (default: ml/data/splits.csv).",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=DEFAULT_BATCH_SIZE,
        help="Evaluation batch size (default: 64).",
    )
    parser.add_argument(
        "--workers",
        type=int,
        default=DEFAULT_WORKERS,
        help="DataLoader worker count (default: 4).",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=DEFAULT_SEED,
        help="Evaluation random seed (default: 42).",
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default="",
        help="Custom output directory for evaluation artifacts.",
    )
    parser.add_argument(
        "--recompute-centroids",
        action="store_true",
        help="Force recomputing class centroids from training set even if cached.",
    )
    args = parser.parse_args()

    seed_everything(args.seed)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    logger.info("Evaluation device: %s", device)

    # Resolve run directory
    runs_root = Path("ml/runs")
    if args.run:
        run_path = Path(args.run)
        if not run_path.exists():
            run_path = runs_root / args.run
        if not run_path.exists():
            raise FileNotFoundError(f"Run directory not found: {args.run}")
        run_dir = run_path
    else:
        run_dir = find_latest_run_dir(runs_root)

    eval_dir = Path(args.output_dir) if args.output_dir else run_dir / "eval"
    eval_dir.mkdir(parents=True, exist_ok=True)
    logger.info(
        "Evaluating run: %s -> Output dir: %s", run_dir.resolve(), eval_dir.resolve()
    )

    # 1. Load model and label metadata
    model, labels_meta, sid_to_class = load_model_and_labels(run_dir, device)
    num_classes = model.num_classes

    # 2. Collect dataset records
    data_dir = Path(args.data_dir)
    splits_csv = Path(args.splits_csv)
    (
        train_records,
        val_records,
        test_records,
        real_test_records,
        _,
    ) = collect_dataset_records(splits_csv, data_dir, sid_to_class)

    # Preprocessing per TRD Section 5
    val_transform = build_val_transform()

    # DataLoaders
    loader_kwargs = {
        "batch_size": args.batch_size,
        "num_workers": args.workers,
        "pin_memory": (device.type == "cuda"),
        "shuffle": False,
        "persistent_workers": (args.workers > 0),
    }

    # A) TRAINING SET: Compute centroids per TRD Section 6
    centroids_cache_path = eval_dir / "centroids.pt"
    if centroids_cache_path.exists() and not args.recompute_centroids:
        logger.info("Loading cached training centroids from %s", centroids_cache_path)
        centroids = torch.load(
            centroids_cache_path, map_location="cpu", weights_only=True
        )
    else:
        logger.info("=== Step 1: Computing Training Set Embeddings for Centroids ===")
        train_dataset = EvaluationDataset(train_records, transform=val_transform)
        train_loader = DataLoader(train_dataset, **loader_kwargs)
        _, train_embeddings, train_labels, _ = extract_embeddings_and_logits(
            model, train_loader, device, desc="Train Embeddings"
        )
        centroids = compute_class_centroids(train_embeddings, train_labels, num_classes)
        torch.save(centroids, centroids_cache_path)
        logger.info(
            "Computed and cached centroids tensor of shape: %s", centroids.shape
        )

    # B) VALIDATION SET: Collect logits for temperature scaling & rejection tuning
    logger.info("=== Step 2: Evaluating Validation Set (Calibration & Tuning) ===")
    val_dataset = EvaluationDataset(val_records, transform=val_transform)
    val_loader = DataLoader(val_dataset, **loader_kwargs)
    val_logits, val_embeddings, val_labels, _ = extract_embeddings_and_logits(
        model, val_loader, device, desc="Val Inference"
    )

    # Fit Temperature Scaler strictly on validation logits
    scaler = TemperatureScaler()
    fitted_t = scaler.fit(val_logits, val_labels)
    scaler.eval()

    val_probs_uncal = F.softmax(val_logits, dim=1).detach()
    val_probs_cal = F.softmax(scaler(val_logits), dim=1).detach()
    val_ece_before, val_bins_before = compute_ece_and_bins(val_probs_uncal, val_labels)
    val_ece_after, val_bins_after = compute_ece_and_bins(val_probs_cal, val_labels)
    logger.info(
        "Validation ECE: Before = %.2f%%, After = %.2f%% (T = %.4f)",
        val_ece_before * 100.0,
        val_ece_after * 100.0,
        fitted_t,
    )

    # C) TEST SET: Evaluate final calibrated model (NEVER fitted on test set)
    logger.info("=== Step 3: Evaluating Test Set (Final Verification) ===")
    test_dataset = EvaluationDataset(test_records, transform=val_transform)
    test_loader = DataLoader(test_dataset, **loader_kwargs)
    test_logits, test_embeddings, test_labels, _ = extract_embeddings_and_logits(
        model, test_loader, device, desc="Test Inference"
    )

    test_probs_uncal = F.softmax(test_logits, dim=1).detach()
    test_probs_cal = F.softmax(scaler(test_logits), dim=1).detach()
    test_ece_before, test_bins_before = compute_ece_and_bins(
        test_probs_uncal, test_labels
    )
    test_ece_after, test_bins_after = compute_ece_and_bins(test_probs_cal, test_labels)
    logger.info(
        "Test Set ECE: Before = %.2f%%, After = %.2f%% (T = %.4f)",
        test_ece_before * 100.0,
        test_ece_after * 100.0,
        fitted_t,
    )

    test_metrics = compute_test_metrics(
        test_probs_cal, test_labels, num_classes, labels_meta
    )

    # C2) REAL_TEST SET (if present): evaluate separately
    real_test_metrics: dict[str, Any] | None = None
    if real_test_records:
        logger.info(
            "=== Step 3b: Evaluating real_test Set (%d images) ===",
            len(real_test_records),
        )
        real_test_dataset = EvaluationDataset(
            real_test_records, transform=val_transform
        )
        real_test_loader = DataLoader(real_test_dataset, **loader_kwargs)
        (
            real_test_logits,
            real_test_embeddings,
            real_test_labels,
            _,
        ) = extract_embeddings_and_logits(
            model, real_test_loader, device, desc="real_test Inference"
        )
        real_test_probs = F.softmax(scaler(real_test_logits), dim=1)
        if (real_test_labels >= 0).all():
            real_test_metrics = compute_test_metrics(
                real_test_probs, real_test_labels, num_classes, labels_meta
            )
            logger.info(
                "real_test Top-1 Accuracy: %.2f%% | Top-5: %.2f%%",
                real_test_metrics["top1_accuracy"],
                real_test_metrics["top5_accuracy"],
            )
        else:
            real_pmax, _ = torch.max(real_test_probs, dim=1)
            real_smax = compute_max_cosine_sims(real_test_embeddings, centroids)
            real_accepted = (real_pmax.cpu().numpy() >= 0.35) & (
                real_smax.cpu().numpy() >= 0.40
            )
            real_test_metrics = {
                "total_images": len(real_test_records),
                "acceptance_rate_pct": round(float(real_accepted.mean() * 100.0), 2),
            }

    # D) UNKNOWN REJECTION TUNING: Non-plant and Unseen-plant negatives
    logger.info("=== Step 4: Unknown Rejection Tuning & Evaluation ===")
    non_plant_dir = data_dir / "negatives" / "non_plant"
    unseen_plant_dir = data_dir / "negatives" / "unseen_plant"

    non_plant_files = (
        sorted(
            [
                p
                for p in non_plant_dir.rglob("*")
                if p.suffix.lower() in (".jpg", ".jpeg", ".png")
            ]
        )
        if non_plant_dir.exists()
        else []
    )
    unseen_plant_files = (
        sorted(
            [
                p
                for p in unseen_plant_dir.rglob("*")
                if p.suffix.lower() in (".jpg", ".jpeg", ".png")
            ]
        )
        if unseen_plant_dir.exists()
        else []
    )

    # 50/50 split with seed 42 into tuning and holdout sets
    rng = random.Random(args.seed)

    shuffled_np = list(non_plant_files)
    rng.shuffle(shuffled_np)
    np_split = len(shuffled_np) // 2
    np_tune_files = shuffled_np[:np_split]
    np_holdout_files = shuffled_np[np_split:]

    shuffled_up = list(unseen_plant_files)
    rng.shuffle(shuffled_up)
    up_split = len(shuffled_up) // 2
    up_tune_files = shuffled_up[:up_split]
    up_holdout_files = shuffled_up[up_split:]

    logger.info(
        "Negative sets split: non_plant (tune=%d, holdout=%d), unseen_plant (tune=%d, holdout=%d)",
        len(np_tune_files),
        len(np_holdout_files),
        len(up_tune_files),
        len(up_holdout_files),
    )

    def extract_neg_stats(
        files: list[Path], desc_name: str
    ) -> tuple[np.ndarray, np.ndarray]:
        if not files:
            return np.empty(0, dtype=np.float32), np.empty(0, dtype=np.float32)
        records = [{"path": p, "class_idx": -1, "id": str(p.name)} for p in files]
        ds = EvaluationDataset(records, transform=val_transform)
        dl = DataLoader(ds, **loader_kwargs)
        lg, emb, _, _ = extract_embeddings_and_logits(model, dl, device, desc=desc_name)
        probs = F.softmax(scaler(lg), dim=1).detach()
        pmax, _ = torch.max(probs, dim=1)
        smax = compute_max_cosine_sims(emb, centroids)
        return pmax.cpu().numpy(), smax.cpu().numpy()

    np_tune_pmax, np_tune_smax = extract_neg_stats(np_tune_files, "NonPlant-Tune")
    np_holdout_pmax, np_holdout_smax = extract_neg_stats(
        np_holdout_files, "NonPlant-Holdout"
    )
    up_tune_pmax, up_tune_smax = extract_neg_stats(up_tune_files, "UnseenPlant-Tune")
    up_holdout_pmax, up_holdout_smax = extract_neg_stats(
        up_holdout_files, "UnseenPlant-Holdout"
    )

    # Compute validation max prob and max cosine similarity
    val_pmax, val_preds = torch.max(val_probs_cal, dim=1)
    val_smax = compute_max_cosine_sims(val_embeddings, centroids)
    val_correct_mask = (val_preds == val_labels).cpu().numpy()

    # Tune thresholds on validation correct + non_plant_tune
    best_theta, best_tau, tuning_summary = tune_unknown_rejection(
        val_pmax=val_pmax.cpu().numpy(),
        val_smax=val_smax.cpu().numpy(),
        val_correct=val_correct_mask,
        neg_pmax_tune=np_tune_pmax,
        neg_smax_tune=np_tune_smax,
        min_neg_rejection=0.90,
    )
    up_rej = (up_tune_pmax < best_theta) | (up_tune_smax < best_tau)
    tuning_summary["unseen_plant_tune_rejection_rate"] = (
        round(float(up_rej.mean() * 100.0), 2) if len(up_tune_pmax) > 0 else 0.0
    )
    logger.info(
        "Tuned rejection thresholds: prob_threshold=%.4f, tau_threshold=%.4f | Non-plant tune rejection=%.2f%%",
        best_theta,
        best_tau,
        tuning_summary["neg_tune_rejection_rate"],
    )

    # Evaluate rejection on test set and holdout splits
    test_pmax, test_preds = torch.max(test_probs_cal, dim=1)
    test_smax = compute_max_cosine_sims(test_embeddings, centroids)
    test_correct_mask = (test_preds == test_labels).cpu().numpy()

    rejection_eval = evaluate_rejection_on_splits(
        theta=best_theta,
        tau=best_tau,
        test_pmax=test_pmax.cpu().numpy(),
        test_smax=test_smax.cpu().numpy(),
        test_correct=test_correct_mask,
        non_plant_holdout_pmax=np_holdout_pmax,
        non_plant_holdout_smax=np_holdout_smax,
        unseen_plant_holdout_pmax=up_holdout_pmax,
        unseen_plant_holdout_smax=up_holdout_smax,
    )

    # 4. Generate Visualizations
    logger.info("=== Step 5: Generating Matplotlib Plots ===")
    plot_reliability_diagram(
        bins_before=test_bins_before,
        ece_before=test_ece_before,
        bins_after=test_bins_after,
        ece_after=test_ece_after,
        temperature=fitted_t,
        output_path=eval_dir / "reliability_diagram.png",
    )
    plot_confusion_matrix(
        cm=np.array(test_metrics["confusion_matrix"]),
        labels_meta=labels_meta,
        output_path=eval_dir / "confusion_matrix.png",
    )

    # 5. Export Artifacts
    calibration_export = {
        "temperature": round(fitted_t, 4),
        "test_ece_before": round(test_ece_before, 4),
        "test_ece_after": round(test_ece_after, 4),
        "val_ece_before": round(val_ece_before, 4),
        "val_ece_after": round(val_ece_after, 4),
        "test_bins_before": test_bins_before,
        "test_bins_after": test_bins_after,
        "val_bins_before": val_bins_before,
        "val_bins_after": val_bins_after,
    }

    thresholds_export = {
        "prob_threshold": round(best_theta, 4),
        "tau_threshold": round(best_tau, 4),
        "temperature": round(fitted_t, 4),
        "trd_default_prob_baseline": TRD_DEFAULT_PROB_THRESH,
    }

    rejection_export = {
        "tuning": tuning_summary,
        "evaluation": rejection_eval,
    }

    export_evaluation_artifacts(
        eval_dir=eval_dir,
        test_metrics=test_metrics,
        calibration_data=calibration_export,
        thresholds_data=thresholds_export,
        rejection_data=rejection_export,
        centroids=centroids,
        real_test_metrics=real_test_metrics,
    )

    # Print summary report
    print("\n" + "=" * 60)
    print("           PLANT CLASSIFIER EVALUATION REPORT")
    print("=" * 60)
    print(f"Model Checkpoint : {run_dir / 'best.pt'}")
    print(f"Top-1 Accuracy   : {test_metrics['top1_accuracy']:.2f}%")
    print(f"Top-5 Accuracy   : {test_metrics['top5_accuracy']:.2f}%")
    print(f"Macro F1 Score   : {test_metrics['macro_f1']:.4f}")
    print(f"Temperature (T)  : {fitted_t:.4f}")
    print(f"Test ECE Before  : {test_ece_before * 100.0:.2f}%")
    print(f"Test ECE After   : {test_ece_after * 100.0:.2f}%")
    print("-" * 60)
    print("Accuracy by Confidence Tier:")
    for tier_name, tier_info in test_metrics["tier_metrics"].items():
        print(
            f"  {tier_name.capitalize():<6} ({tier_info['range']:<11}): "
            f"{tier_info['count']} samples ({tier_info['percentage']:5.1f}%) | "
            f"Accuracy: {tier_info['accuracy']:5.1f}%"
        )
    print("-" * 60)
    print(f"Tuned Thresholds : prob_threshold = {best_theta:.4f}, tau = {best_tau:.4f}")
    print(
        f"Rejection Rates  : non_plant holdout    = {rejection_eval['holdout']['non_plant_rejection_rate_pct']:.2f}%"
    )
    print(
        f"                   unseen_plant holdout = {rejection_eval['holdout']['unseen_plant_rejection_rate_pct']:.2f}%"
    )
    print(
        f"Test Acceptance  : {rejection_eval['test_set']['overall_acceptance_rate_pct']:.2f}%"
    )
    print("-" * 60)
    print(
        f"Classes with F1 < 0.70 ({len(test_metrics['classes_below_f1_70'])} classes):"
    )
    for cls in test_metrics["classes_below_f1_70"][:10]:
        print(
            f"  [{cls['class_idx']:3d}] {cls['common_name']} ({cls['scientific_name']}): F1 = {cls['f1']:.4f}, Acc = {cls['top1_accuracy']:.1f}%"
        )
    print("-" * 60)
    print("Top 10 Most Confused Pairs:")
    for p in test_metrics["top20_confused_pairs"][:10]:
        print(
            f"  {p['true_name']} -> {p['pred_name']}: {p['count']} images ({p['percent_of_true_class']}%)"
        )
    print("=" * 60 + "\n")


if __name__ == "__main__":
    main()
