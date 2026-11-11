"""test_evaluate.py - Unit and invariant tests for evaluation and calibration pipeline.

Tests:
  1. ECE calculation on synthetic perfectly calibrated and miscalibrated data.
  2. Temperature scaling optimization recovers known ground truth temperature T.
  3. Top-k accuracy metrics calculation against exact expected values.
  4. Unknown rejection threshold selection logic and constraints satisfaction.
  5. Invariant assertion: test partition is NEVER used for fitting temperature,
     thresholds, or class centroids (training set only).
"""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

import numpy as np
import pytest
import torch
import torch.nn.functional as F

# Ensure ml directory is on sys.path
ML_DIR = Path(__file__).resolve().parent.parent
if str(ML_DIR) not in sys.path:
    sys.path.insert(0, str(ML_DIR))

# Dynamically import ml/04_evaluate.py
EVAL_SCRIPT = ML_DIR / "04_evaluate.py"
spec = importlib.util.spec_from_file_location("eval_module", EVAL_SCRIPT)
assert spec is not None and spec.loader is not None
eval_module = importlib.util.module_from_spec(spec)
sys.modules["eval_module"] = eval_module
spec.loader.exec_module(eval_module)

TemperatureScaler = eval_module.TemperatureScaler
compute_ece_and_bins = eval_module.compute_ece_and_bins
compute_test_metrics = eval_module.compute_test_metrics
compute_class_centroids = eval_module.compute_class_centroids
tune_unknown_rejection = eval_module.tune_unknown_rejection
evaluate_rejection_on_splits = eval_module.evaluate_rejection_on_splits


def test_ece_calculation_synthetic() -> None:
    """Verify ECE calculation on known synthetic distributions."""
    # Case 1: Perfectly calibrated probabilities (100 samples, 80% confidence, exactly 80 correct)
    probs_perfect = torch.zeros((100, 2), dtype=torch.float32)
    probs_perfect[:, 0] = 0.80  # Predicted class 0 with 0.80 confidence
    probs_perfect[:, 1] = 0.20

    labels_perfect = torch.zeros((100,), dtype=torch.long)
    labels_perfect[80:] = 1  # 80 correct (accuracy = 80%)

    ece_perfect, bins_perfect = compute_ece_and_bins(
        probs_perfect, labels_perfect, n_bins=15
    )
    assert len(bins_perfect) == 15
    assert ece_perfect == pytest.approx(0.0, abs=1e-5)

    # Case 2: Completely miscalibrated (100% confidence, 0% accuracy)
    probs_bad = torch.zeros((100, 2), dtype=torch.float32)
    probs_bad[:, 0] = 1.0  # Predicted class 0 with 1.0 confidence
    labels_bad = torch.ones((100,), dtype=torch.long)  # True class 1 (accuracy = 0%)

    ece_bad, bins_bad = compute_ece_and_bins(probs_bad, labels_bad, n_bins=15)
    assert ece_bad == pytest.approx(1.0, abs=1e-4)

    # Bin properties verification
    for b in bins_bad:
        assert 0.0 <= b["bin_lower"] < b["bin_upper"] <= 1.0001
        assert b["sample_count"] >= 0


def test_temperature_scaling_recovers_known_t() -> None:
    """Verify that TemperatureScaler recovers a known ground-truth temperature."""
    torch.manual_seed(42)
    num_samples = 4000
    num_classes = 10
    true_t = 1.80

    # Generate synthetic calibrated logits
    base_logits = torch.randn(num_samples, num_classes) * 2.0
    probs = F.softmax(base_logits, dim=1)
    labels = torch.multinomial(probs, num_samples=1).squeeze(1)

    # Overconfident uncalibrated logits: scaled by true_t
    uncalibrated_logits = base_logits * true_t

    scaler = TemperatureScaler(min_t=0.05, max_t=10.0)
    recovered_t = scaler.fit(uncalibrated_logits, labels)

    assert (
        abs(recovered_t - true_t) < 0.20
    ), f"Recovered T {recovered_t} differs from true {true_t}"

    # Calibrated logits
    scaled = scaler(uncalibrated_logits)
    assert scaled.shape == uncalibrated_logits.shape


def test_top_k_accuracy() -> None:
    """Verify top-1 and top-5 accuracy calculation logic against known ground truth."""
    num_classes = 10
    # Construct 10 samples with strictly ranked probabilities (no ties at zero)
    # Rows 0..6: correct at rank 1
    # Rows 7..8: correct at rank 2 (within top-5, but not top-1)
    # Row 9: correct class is class 9, but ranked 7th (not in top-5)
    probs = torch.zeros((10, num_classes), dtype=torch.float32)
    labels = torch.zeros((10,), dtype=torch.long)

    # Base decaying probabilities for ranks 0..9
    decay = torch.tensor([0.40, 0.20, 0.15, 0.10, 0.06, 0.04, 0.02, 0.015, 0.01, 0.005])

    for i in range(10):
        # Permute classes: place rank 0 at class i
        p_row = torch.zeros(num_classes)
        # Class ordering for this row
        order = list(range(num_classes))
        order.remove(i)
        class_ranking = [i] + order  # class i is top-1, class_ranking[1] is top-2, etc.

        for rank_idx, cls in enumerate(class_ranking):
            p_row[cls] = decay[rank_idx]
        probs[i] = p_row

        if i < 7:
            # Correct at top-1
            labels[i] = i
        elif i in (7, 8):
            # True label is ranked 2nd (top-5 correct, top-1 wrong)
            labels[i] = class_ranking[1]
        else:
            # True label is ranked 7th (not in top-5)
            labels[i] = class_ranking[7]

    labels_meta = {
        str(i): {"species_id": i, "common_name": f"Species {i}"}
        for i in range(num_classes)
    }
    metrics = compute_test_metrics(probs, labels, num_classes, labels_meta)

    # Expected: 7 / 10 = 70.0% top-1, 9 / 10 = 90.0% top-5
    assert metrics["top1_accuracy"] == 70.0
    assert metrics["top5_accuracy"] == 90.0
    assert 0.0 <= metrics["macro_f1"] <= 1.0


def test_rejection_threshold_selection() -> None:
    """Verify that tune_unknown_rejection satisfies the >=90% negative rejection constraint."""
    np.random.seed(42)

    # Synthetic validation correct: high pmax in [0.70, 0.98], high smax in [0.70, 0.95]
    n_val = 500
    val_pmax = np.random.uniform(0.70, 0.98, size=n_val)
    val_smax = np.random.uniform(0.70, 0.95, size=n_val)
    val_correct = np.ones(n_val, dtype=bool)

    # Synthetic negatives: low pmax in [0.10, 0.35], low smax in [0.10, 0.35]
    n_neg = 200
    neg_pmax = np.random.uniform(0.10, 0.35, size=n_neg)
    neg_smax = np.random.uniform(0.10, 0.35, size=n_neg)

    theta, tau, summary = tune_unknown_rejection(
        val_pmax=val_pmax,
        val_smax=val_smax,
        val_correct=val_correct,
        neg_pmax_tune=neg_pmax,
        neg_smax_tune=neg_smax,
        min_neg_rejection=0.90,
    )

    assert summary["target_met"] is True
    assert summary["neg_tune_rejection_rate"] >= 90.0
    assert summary["val_correct_accepted_pct"] > 85.0
    assert 0.20 <= theta <= 0.80
    assert 0.20 <= tau <= 0.80


def test_test_set_never_fitted_on() -> None:
    """Strictly assert that test set is never passed to fit, tune, or centroid functions."""
    import inspect

    # 1. TemperatureScaler.fit signature: takes val_logits, val_labels
    sig_fit = inspect.signature(TemperatureScaler.fit)
    param_names = list(sig_fit.parameters.keys())
    assert "val_logits" in param_names
    assert "val_labels" in param_names
    assert "test_logits" not in param_names

    # 2. Centroids function: takes train_embeddings, train_labels
    sig_cent = inspect.signature(compute_class_centroids)
    cent_params = list(sig_cent.parameters.keys())
    assert "train_embeddings" in cent_params
    assert "train_labels" in cent_params
    assert "test_embeddings" not in cent_params

    # 3. Source code audit: ensure test_logits is never passed to scaler.fit()
    with open(EVAL_SCRIPT, mode="r", encoding="utf-8") as f:
        source_code = f.read()

    assert "scaler.fit(val_logits, val_labels)" in source_code
    assert "scaler.fit(test_logits" not in source_code
    assert "tune_unknown_rejection(" in source_code
    tune_args = source_code.split("tune_unknown_rejection(")[1].split(")")[0]
    assert "test_pmax=" not in tune_args
    assert "test_smax=" not in tune_args
