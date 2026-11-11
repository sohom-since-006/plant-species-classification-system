"""test_export.py - Tests for ONNX model export, numerical parity, and artifact schemas.

Tests:
  1. Parity test between PyTorch and ONNX Runtime CPU (skipped if checkpoint is missing).
  2. model_meta.json schema and validation against TRD specifications.
  3. cam_weights.bin shape, data type (float16), little-endian order, and byte size.
  4. centroids.json unit-norm assertion (L2-normalized training centroids).
  5. Golden fixtures structure, expected outputs JSON format, and documentation.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
import pytest
import torch

# Ensure ml directory is on sys.path
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
ML_DIR = REPO_ROOT / "ml"
if str(ML_DIR) not in sys.path:
    sys.path.insert(0, str(ML_DIR))

from model import PlantClassifier

MODELS_DIR = REPO_ROOT / "web" / "public" / "models"
GOLDEN_DIR = REPO_ROOT / "web" / "tests" / "fixtures" / "golden"
RUNS_DIR = ML_DIR / "runs"


def get_latest_checkpoint() -> tuple[Path, Path] | None:
    """Find latest best.pt and labels.json in ml/runs."""
    if not RUNS_DIR.exists():
        return None
    candidates = [
        d
        for d in RUNS_DIR.iterdir()
        if d.is_dir() and (d / "best.pt").is_file() and (d / "labels.json").is_file()
    ]
    if not candidates:
        return None
    candidates.sort(key=lambda p: p.stat().st_mtime, reverse=True)
    latest = candidates[0]
    return latest / "best.pt", latest / "labels.json"


def test_export_parity() -> None:
    """Test numerical parity between PyTorch and ONNX Runtime on deterministic input."""
    onnx_path = MODELS_DIR / "plant_model.onnx"
    ckpt_info = get_latest_checkpoint()

    if not onnx_path.exists() or ckpt_info is None:
        pytest.skip("ONNX model or checkpoint not available for parity test.")

    import onnxruntime as ort

    ckpt_path, labels_path = ckpt_info
    with open(labels_path, "r", encoding="utf-8") as f:
        labels_meta = json.load(f)
    num_classes = len(labels_meta)

    # Load PyTorch model in eval mode
    model = PlantClassifier(num_classes=num_classes, pretrained=False)
    checkpoint = torch.load(ckpt_path, map_location="cpu", weights_only=True)
    state_dict = (
        checkpoint["model_state_dict"]
        if isinstance(checkpoint, dict) and "model_state_dict" in checkpoint
        else checkpoint
    )
    model.load_state_dict(state_dict)
    model.float().eval()

    # Create ONNX session
    sess_options = ort.SessionOptions()
    sess_options.intra_op_num_threads = 1
    session = ort.InferenceSession(
        str(onnx_path), sess_options, providers=["CPUExecutionProvider"]
    )

    # Test on deterministic fixed tensor
    rng = torch.Generator().manual_seed(42)
    dummy_input = torch.randn(1, 3, 224, 224, generator=rng, dtype=torch.float32)

    with torch.no_grad():
        pt_logits, pt_emb, pt_feat = model.forward_features_and_embedding(dummy_input)

    ort_outs = session.run(None, {"input": dummy_input.numpy()})
    ort_logits, ort_emb, ort_feat = ort_outs

    diff_logits = float(np.max(np.abs(pt_logits.numpy() - ort_logits)))
    diff_emb = float(np.max(np.abs(pt_emb.numpy() - ort_emb)))
    diff_feat = float(np.max(np.abs(pt_feat.numpy() - ort_feat)))

    # Hard gate from TRD Section 9: max difference must be below 1e-3
    assert diff_logits < 1e-3, f"Logits parity failed: {diff_logits:.2e} >= 1e-3"
    assert diff_emb < 1e-3, f"Embedding parity failed: {diff_emb:.2e} >= 1e-3"
    assert diff_feat < 1e-3, f"Features parity failed: {diff_feat:.2e} >= 1e-3"


def test_model_meta_schema() -> None:
    """Validate model_meta.json schema against TRD and ARCHITECTURE contracts."""
    meta_path = MODELS_DIR / "model_meta.json"
    if not meta_path.exists():
        pytest.skip("model_meta.json not yet generated.")

    with open(meta_path, "r", encoding="utf-8") as f:
        meta = json.load(f)

    # Required core fields
    assert isinstance(meta.get("version"), str) and len(meta["version"]) > 0
    assert isinstance(meta.get("numSpecies"), int) and meta["numSpecies"] > 0
    assert meta.get("inputSize") == 224
    assert meta.get("resize") == 256
    assert meta.get("crop") == 224

    # Mean and std
    assert isinstance(meta.get("mean"), list) and len(meta["mean"]) == 3
    assert isinstance(meta.get("std"), list) and len(meta["std"]) == 3
    assert all(isinstance(v, (int, float)) for v in meta["mean"])
    assert all(isinstance(v, (int, float)) for v in meta["std"])

    # Calibration and rejection thresholds
    assert isinstance(meta.get("temperature"), (int, float)) and meta["temperature"] > 0
    assert isinstance(meta.get("tau"), (int, float)) and 0.0 <= meta["tau"] <= 1.0
    assert (
        isinstance(meta.get("threshold"), (int, float))
        and 0.0 <= meta["threshold"] <= 1.0
    )

    # Confidence tier boundaries
    tiers = meta.get("tierBoundaries", {})
    assert tiers.get("high") == 0.85
    assert tiers.get("medium") == 0.60

    # Similar species parameters
    assert meta.get("mlWeight") == 0.6
    assert meta.get("visualWeight") == 0.4
    assert meta.get("genusBonus") == 0.05

    # CAM weights shape
    assert isinstance(meta.get("camWeightsShape"), list)
    assert len(meta["camWeightsShape"]) == 2
    assert meta["camWeightsShape"][0] == meta["numSpecies"]
    assert meta["camWeightsShape"][1] == 1280

    # Pointers to versioned artifacts
    assert "files" in meta
    for k in ["model", "camWeights", "centroids", "labels", "metrics"]:
        assert k in meta["files"]


def test_cam_weights_shape_and_size() -> None:
    """Verify cam_weights.bin has exact shape N x 1280, float16 dtype, and no NaN values."""
    bin_path = MODELS_DIR / "cam_weights.bin"
    meta_path = MODELS_DIR / "model_meta.json"
    if not bin_path.exists() or not meta_path.exists():
        pytest.skip("cam_weights.bin or model_meta.json not yet generated.")

    with open(meta_path, "r", encoding="utf-8") as f:
        meta = json.load(f)

    shape = meta["camWeightsShape"]
    num_classes, dim = shape[0], shape[1]
    assert dim == 1280

    # float16 = 2 bytes per element
    expected_bytes = num_classes * dim * 2
    actual_bytes = bin_path.stat().st_size
    assert (
        actual_bytes == expected_bytes
    ), f"Expected {expected_bytes} bytes, got {actual_bytes}"

    # Load binary data into numpy array
    weights = np.fromfile(bin_path, dtype="<f2").reshape((num_classes, dim))
    assert weights.shape == (num_classes, dim)
    assert not np.isnan(weights).any(), "cam_weights contains NaN values"
    assert not np.isinf(weights).any(), "cam_weights contains Inf values"


def test_centroids_unit_norm() -> None:
    """Verify centroids.json contains 1280-d unit-normalized vectors for each species."""
    centroids_path = MODELS_DIR / "centroids.json"
    meta_path = MODELS_DIR / "model_meta.json"
    if not centroids_path.exists() or not meta_path.exists():
        pytest.skip("centroids.json or model_meta.json not yet generated.")

    with open(meta_path, "r", encoding="utf-8") as f:
        meta = json.load(f)
    num_classes = meta["numSpecies"]

    with open(centroids_path, "r", encoding="utf-8") as f:
        centroids = json.load(f)

    assert len(centroids) == num_classes

    for class_idx_str, vec in centroids.items():
        assert (
            len(vec) == 1280
        ), f"Class {class_idx_str} vector dimension is {len(vec)}, expected 1280"
        norm = np.linalg.norm(vec)
        # 4 decimal places rounding preserves norm within 0.005 of 1.0
        assert (
            abs(norm - 1.0) < 0.01
        ), f"Class {class_idx_str} centroid is not unit norm: {norm:.4f}"


def test_golden_fixtures() -> None:
    """Verify golden fixtures directory contains 10 PNGs, README.md, and expected_outputs.json."""
    if not GOLDEN_DIR.exists():
        pytest.skip("Golden fixtures directory not yet generated.")

    readme = GOLDEN_DIR / "README.md"
    expected_json = GOLDEN_DIR / "expected_outputs.json"
    images_dir = GOLDEN_DIR / "images"

    assert readme.exists(), "README.md missing in golden fixtures"
    assert expected_json.exists(), "expected_outputs.json missing in golden fixtures"
    assert images_dir.exists(), "images/ directory missing in golden fixtures"

    png_files = sorted(images_dir.glob("golden_*.png"))
    assert len(png_files) == 10, f"Expected 10 golden images, found {len(png_files)}"

    with open(expected_json, "r", encoding="utf-8") as f:
        data = json.load(f)

    fixtures = data.get("fixtures", [])
    assert len(fixtures) == 10

    for item in fixtures:
        assert "fixture_id" in item
        assert "original_dimensions" in item
        assert "temperature" in item
        assert "top5_predictions" in item
        assert len(item["top5_predictions"]) == 5
        assert "embedding_first_8" in item
        assert len(item["embedding_first_8"]) == 8
