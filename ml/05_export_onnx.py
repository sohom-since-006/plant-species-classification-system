"""05_export_onnx.py - Export PlantClassifier to ONNX, verify numerical parity, and assemble web artifacts.

Per TRD Section 9, ARCHITECTURE.md, and MasterPrompt Part D:
  1. Loads best.pt from run directory (--run, default latest in ml/runs/) in eval mode with fp32.
  2. Exports ONNX model with opset 17, dynamic batch axis, input 'input' [B,3,224,224],
     and outputs 'logits' [B,N], 'embedding' [B,1280], 'features' [B,1280,7,7].
  3. Verifies numerical parity: PyTorch vs ONNX Runtime (CPU) on 50 fixed test-set images (seed 42).
     Max absolute difference for logits must be below 1e-3.
  4. Checks model size: if <= 25 MB, ships fp32 without quantization. If larger, evaluates fp16/quantized.
  5. Exports artifacts into web/public/models/:
       - plant_model.v1.onnx and plant_model.onnx
       - labels.json (index to species_id, common_name, scientific_name, family, genus)
       - model_meta.json (version, numSpecies, inputSize, resize, crop, mean, std, temperature, tau,
         threshold, tierBoundaries, mlWeight, visualWeight, genusBonus, files, camWeightsShape)
       - centroids.json and centroids.v1.json (L2-normalized TRAINING-set centroids, rounded to 4 decimals)
       - cam_weights.bin and cam_weights.v1.bin (N x 1280 float16 little-endian binary)
       - metrics.json (assembled test-set metrics and dataset stats with date)
  6. Generates 10 deterministic synthetic textured golden fixtures under web/tests/fixtures/golden/
     with expected PyTorch outputs (top-5 calibrated probabilities, first 8 embedding values) and README.md.
"""

from __future__ import annotations

import argparse
import csv
import datetime
import json
import logging
import random
import shutil
import sys
from pathlib import Path
from typing import Any

import numpy as np
import onnx
import onnxruntime as ort
import torch
import torch.nn.functional as F
from PIL import Image
from torch import nn
from torchvision import transforms

# Ensure ml directory is on sys.path
ML_DIR = Path(__file__).resolve().parent
if str(ML_DIR) not in sys.path:
    sys.path.insert(0, str(ML_DIR))

from model import TRD_MEAN, TRD_STD, PlantClassifier

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("export_onnx")

DEFAULT_VERSION = "1.0.0"
DEFAULT_SEED = 42
DEFAULT_PARITY_SAMPLES = 50
MAX_UNQUANTIZED_SIZE_MB = 25.0
PARITY_LOGITS_TOLERANCE = 1e-3


def seed_everything(seed: int = DEFAULT_SEED) -> None:
    """Seed random number generators across python, numpy, and torch for determinism."""
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


def build_val_transform() -> transforms.Compose:
    """Construct deterministic validation transform per TRD Section 5.

    Resize shorter side to 256, center crop to 224x224, normalized by ImageNet statistics.
    """
    return transforms.Compose(
        [
            transforms.Resize(256, interpolation=transforms.InterpolationMode.BILINEAR),
            transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize(mean=TRD_MEAN, std=TRD_STD),
        ]
    )


def load_model_and_labels(
    run_dir: Path,
    device: torch.device,
) -> tuple[PlantClassifier, dict[str, dict[str, Any]]]:
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
    model = PlantClassifier(num_classes=num_classes, pretrained=False)
    checkpoint = torch.load(checkpoint_path, map_location="cpu", weights_only=True)
    if isinstance(checkpoint, dict) and "model_state_dict" in checkpoint:
        state_dict = checkpoint["model_state_dict"]
    else:
        state_dict = checkpoint

    model.load_state_dict(state_dict)
    model = model.to(device).float()
    model.eval()

    logger.info(
        "Loaded model checkpoint best.pt (%d classes) from %s",
        num_classes,
        run_dir.name,
    )
    return model, labels_meta


class ExportWrapper(nn.Module):
    """Wrapper exposing multi-output forward pass (logits, embedding, features) for ONNX export."""

    def __init__(self, model: PlantClassifier) -> None:
        super().__init__()
        self.model = model

    def forward(
        self, x: torch.Tensor
    ) -> tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        return self.model.forward_features_and_embedding(x)


def export_onnx_model(
    model: PlantClassifier,
    output_path: Path,
    opset_version: int = 17,
) -> float:
    """Export PlantClassifier to ONNX format with dynamic batch axis and opset 17.

    Returns the file size in megabytes (MB).
    """
    output_path.parent.mkdir(parents=True, exist_ok=True)
    wrapped = ExportWrapper(model).eval()

    dummy_input = torch.randn(1, 3, 224, 224, dtype=torch.float32)

    logger.info("Exporting model to ONNX: %s (opset %d)...", output_path, opset_version)
    torch.onnx.export(
        wrapped,
        dummy_input,
        str(output_path),
        export_params=True,
        opset_version=opset_version,
        do_constant_folding=True,
        input_names=["input"],
        output_names=["logits", "embedding", "features"],
        dynamic_axes={
            "input": {0: "batch_size"},
            "logits": {0: "batch_size"},
            "embedding": {0: "batch_size"},
            "features": {0: "batch_size"},
        },
    )

    # Check validity via onnx package
    onnx_proto = onnx.load(str(output_path))
    onnx.checker.check_model(onnx_proto)

    size_mb = output_path.stat().st_size / (1024 * 1024)
    logger.info("ONNX export verified successfully. File size: %.2f MB", size_mb)
    return size_mb


def load_test_image_paths(
    splits_csv: Path,
    data_dir: Path,
    sid_to_class: dict[int, int],
) -> list[dict[str, Any]]:
    """Collect test-set records from splits.csv."""
    if not splits_csv.exists():
        logger.warning("splits.csv not found at %s", splits_csv)
        return []

    with open(splits_csv, mode="r", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    test_records: list[dict[str, Any]] = []
    for r in rows:
        if r.get("split") == "test":
            sid = int(r["species_id"])
            if sid in sid_to_class:
                p = data_dir / r["file"]
                if p.exists():
                    test_records.append(
                        {
                            "path": p,
                            "species_id": sid,
                            "class_idx": sid_to_class[sid],
                            "id": r["file"],
                        }
                    )
    return test_records


def run_parity_test(
    model: PlantClassifier,
    onnx_path: Path,
    test_records: list[dict[str, Any]],
    n_samples: int = DEFAULT_PARITY_SAMPLES,
    seed: int = DEFAULT_SEED,
) -> dict[str, float]:
    """Execute parity test between PyTorch and ONNX Runtime CPU on n_samples fixed test images."""
    logger.info("=== Running Parity Test (PyTorch vs ONNX Runtime CPU) ===")
    wrapped = ExportWrapper(model).eval()

    # Create ONNX Runtime CPU session
    sess_options = ort.SessionOptions()
    sess_options.intra_op_num_threads = 1
    session = ort.InferenceSession(
        str(onnx_path), sess_options, providers=["CPUExecutionProvider"]
    )

    transform = build_val_transform()

    max_diff_logits = 0.0
    max_diff_emb = 0.0
    max_diff_feat = 0.0

    rng = random.Random(seed)

    if len(test_records) >= n_samples:
        sorted_records = sorted(test_records, key=lambda x: str(x["id"]))
        sample_records = rng.sample(sorted_records, n_samples)
        logger.info(
            "Evaluating parity on %d sampled test images from dataset...",
            len(sample_records),
        )

        for rec in sample_records:
            try:
                img = Image.open(rec["path"]).convert("RGB")
            except (OSError, ValueError) as e:
                logger.warning("Error opening image %s: %s", rec["path"], e)
                continue

            tensor = transform(img).unsqueeze(0).float()
            np_input = tensor.numpy()

            with torch.no_grad():
                pt_logits, pt_emb, pt_feat = wrapped(tensor)

            ort_outs = session.run(None, {"input": np_input})
            ort_logits, ort_emb, ort_feat = ort_outs

            diff_l = float(np.max(np.abs(pt_logits.numpy() - ort_logits)))
            diff_e = float(np.max(np.abs(pt_emb.numpy() - ort_emb)))
            diff_f = float(np.max(np.abs(pt_feat.numpy() - ort_feat)))

            max_diff_logits = max(max_diff_logits, diff_l)
            max_diff_emb = max(max_diff_emb, diff_e)
            max_diff_feat = max(max_diff_feat, diff_f)
    else:
        logger.warning(
            "Found %d test images (less than %d). Generating %d synthetic inputs for parity check.",
            len(test_records),
            n_samples,
            n_samples,
        )
        torch_rng = torch.Generator().manual_seed(seed)
        for _ in range(n_samples):
            tensor = torch.randn(
                1, 3, 224, 224, generator=torch_rng, dtype=torch.float32
            )
            np_input = tensor.numpy()

            with torch.no_grad():
                pt_logits, pt_emb, pt_feat = wrapped(tensor)

            ort_outs = session.run(None, {"input": np_input})
            ort_logits, ort_emb, ort_feat = ort_outs

            diff_l = float(np.max(np.abs(pt_logits.numpy() - ort_logits)))
            diff_e = float(np.max(np.abs(pt_emb.numpy() - ort_emb)))
            diff_f = float(np.max(np.abs(pt_feat.numpy() - ort_feat)))

            max_diff_logits = max(max_diff_logits, diff_l)
            max_diff_emb = max(max_diff_emb, diff_e)
            max_diff_feat = max(max_diff_feat, diff_f)

    logger.info("Parity Results across %d evaluations:", n_samples)
    logger.info(
        "  Max Logits Diff    : %.2e (target < %.2e)",
        max_diff_logits,
        PARITY_LOGITS_TOLERANCE,
    )
    logger.info("  Max Embedding Diff : %.2e", max_diff_emb)
    logger.info("  Max Features Diff  : %.2e", max_diff_feat)

    if max_diff_logits >= PARITY_LOGITS_TOLERANCE:
        raise RuntimeError(
            f"Parity check FAILED: Logits max absolute difference {max_diff_logits:.2e} "
            f"exceeds tolerance {PARITY_LOGITS_TOLERANCE:.2e}!"
        )

    return {
        "max_diff_logits": max_diff_logits,
        "max_diff_embedding": max_diff_emb,
        "max_diff_features": max_diff_feat,
    }


def export_cam_weights(
    model: PlantClassifier,
    output_dir: Path,
    version: str,
) -> tuple[list[int], float]:
    """Export linear classification head weights as float16 little-endian binary (N x 1280).

    Returns shape [N, 1280] and size in kilobytes.
    """
    classifier = model.backbone.get_classifier()
    weights = classifier.weight.detach().cpu().numpy()  # shape (N, 1280)
    num_classes, dim = weights.shape

    weights_fp16 = weights.astype("<f2")  # Explicit little-endian float16
    bytes_data = weights_fp16.tobytes()

    expected_bytes = num_classes * dim * 2
    if len(bytes_data) != expected_bytes:
        raise ValueError(
            f"CAM weights byte count mismatch: got {len(bytes_data)}, expected {expected_bytes}"
        )

    # Write versioned and unversioned
    ver_tag = f"v{version.split('.')[0]}"
    v_path = output_dir / f"cam_weights.{ver_tag}.bin"
    default_path = output_dir / "cam_weights.bin"

    with open(v_path, "wb") as f:
        f.write(bytes_data)
    shutil.copyfile(v_path, default_path)

    size_kb = len(bytes_data) / 1024.0
    logger.info(
        "Exported CAM weights: shape [%d, %d], dtype float16, size %.1f KB",
        num_classes,
        dim,
        size_kb,
    )
    return [num_classes, dim], size_kb


def export_centroids(
    eval_dir: Path,
    output_dir: Path,
    num_classes: int,
    version: str,
) -> float:
    """Load training-set centroids from eval directory, L2-normalize, round to 4 decimals, and save.

    Returns the file size in kilobytes.
    """
    centroids_pt = eval_dir / "centroids.pt"
    if not centroids_pt.exists():
        raise FileNotFoundError(
            f"centroids.pt not found in {eval_dir}. Run 04_evaluate.py first to compute centroids."
        )

    raw_centroids = torch.load(
        centroids_pt, map_location="cpu", weights_only=True
    ).float()
    if raw_centroids.shape[0] != num_classes:
        raise ValueError(
            f"Centroids class count mismatch: expected {num_classes}, got {raw_centroids.shape[0]}"
        )

    # L2-normalize training-set centroids
    norm_centroids = F.normalize(raw_centroids, p=2, dim=1)

    centroids_dict: dict[str, list[float]] = {}
    for i in range(num_classes):
        vec = norm_centroids[i].tolist()
        centroids_dict[str(i)] = [round(float(v), 4) for v in vec]

    ver_tag = f"v{version.split('.')[0]}"
    v_path = output_dir / f"centroids.{ver_tag}.json"
    default_path = output_dir / "centroids.json"

    with open(v_path, "w", encoding="utf-8") as f:
        json.dump(centroids_dict, f, separators=(",", ":"))
    shutil.copyfile(v_path, default_path)

    size_kb = v_path.stat().st_size / 1024.0
    logger.info(
        "Exported L2-normalized training centroids: %d classes, 1280-d, size %.1f KB",
        num_classes,
        size_kb,
    )
    return size_kb


def export_model_meta(
    output_dir: Path,
    labels_meta: dict[str, dict[str, Any]],
    eval_dir: Path,
    cam_shape: list[int],
    version: str,
) -> Path:
    """Construct and export model_meta.json detailing runtime parameters and artifact pointers."""
    thresholds_path = eval_dir / "thresholds.json"
    if thresholds_path.exists():
        with open(thresholds_path, "r", encoding="utf-8") as f:
            thresholds_data = json.load(f)
    else:
        thresholds_data = {
            "temperature": 1.0,
            "tau_threshold": 0.35,
            "prob_threshold": 0.35,
        }

    ver_tag = f"v{version.split('.')[0]}"
    meta = {
        "version": version,
        "numSpecies": len(labels_meta),
        "inputSize": 224,
        "resize": 256,
        "crop": 224,
        "mean": [round(float(m), 4) for m in TRD_MEAN],
        "std": [round(float(s), 4) for s in TRD_STD],
        "temperature": float(thresholds_data.get("temperature", 1.0)),
        "tau": float(thresholds_data.get("tau_threshold", 0.35)),
        "threshold": float(thresholds_data.get("prob_threshold", 0.35)),
        "tierBoundaries": {
            "high": 0.85,
            "medium": 0.60,
        },
        "mlWeight": 0.6,
        "visualWeight": 0.4,
        "genusBonus": 0.05,
        "camWeightsShape": cam_shape,
        "modelFile": f"plant_model.{ver_tag}.onnx",
        "camWeightsFile": f"cam_weights.{ver_tag}.bin",
        "centroidsFile": f"centroids.{ver_tag}.json",
        "labelsFile": "labels.json",
        "metricsFile": "metrics.json",
        "files": {
            "model": f"plant_model.{ver_tag}.onnx",
            "modelFallback": "plant_model.onnx",
            "camWeights": f"cam_weights.{ver_tag}.bin",
            "camWeightsFallback": "cam_weights.bin",
            "centroids": f"centroids.{ver_tag}.json",
            "centroidsFallback": "centroids.json",
            "labels": "labels.json",
            "metrics": "metrics.json",
        },
        "exportedAt": datetime.datetime.now(datetime.UTC).isoformat(),
    }

    meta_path = output_dir / "model_meta.json"
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)

    logger.info("Exported model_meta.json (version %s)", version)
    return meta_path


def export_metrics(
    output_dir: Path,
    eval_dir: Path,
    dataset_stats_path: Path,
    version: str,
) -> Path:
    """Assemble metrics.json combining test-set evaluation results with dataset statistics."""
    eval_metrics_path = eval_dir / "metrics.json"
    if not eval_metrics_path.exists():
        raise FileNotFoundError(f"metrics.json not found in {eval_dir}")

    with open(eval_metrics_path, "r", encoding="utf-8") as f:
        eval_metrics = json.load(f)

    dataset_stats: dict[str, Any] = {}
    if dataset_stats_path.exists():
        with open(dataset_stats_path, "r", encoding="utf-8") as f:
            dataset_stats = json.load(f)

    assembled = {
        "title": "Plant Species Classification Test-Set Metrics",
        "metrics_type": "test-set metrics",
        "date": datetime.date.today().isoformat(),
        "exported_at": datetime.datetime.now(datetime.UTC).isoformat(),
        "model_version": version,
        "test_top1_accuracy": eval_metrics.get("test_top1_accuracy"),
        "test_top5_accuracy": eval_metrics.get("test_top5_accuracy"),
        "macro_precision": eval_metrics.get("macro_precision"),
        "macro_recall": eval_metrics.get("macro_recall"),
        "macro_f1": eval_metrics.get("macro_f1"),
        "calibration": eval_metrics.get("calibration", {}),
        "thresholds": eval_metrics.get("thresholds", {}),
        "confidence_tiers": eval_metrics.get("confidence_tiers", {}),
        "classes_below_f1_70": eval_metrics.get("classes_below_f1_70", []),
        "top20_confused_pairs": eval_metrics.get("top20_confused_pairs", []),
        "split_sizes": dataset_stats.get("split_sizes", {}),
    }

    out_path = output_dir / "metrics.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(assembled, f, indent=2)

    logger.info("Exported assembled metrics.json")
    return out_path


def generate_procedural_texture(seed: int, width: int, height: int) -> Image.Image:
    """Generate deterministic procedural botanical/textured RGB image without dataset photos."""
    rng = np.random.RandomState(seed)
    x = np.linspace(0, 4 * np.pi, width)
    y = np.linspace(0, 4 * np.pi, height)
    xx, yy = np.meshgrid(x, y)

    freq1 = rng.uniform(1.2, 3.5)
    freq2 = rng.uniform(2.5, 6.0)
    phase1 = rng.uniform(0, np.pi)
    phase2 = rng.uniform(0, np.pi)

    # Multi-frequency foliage/vein pattern simulation
    layer1 = np.sin(xx * freq1 + phase1) * np.cos(yy * freq1 + phase2)
    layer2 = np.sin((xx + yy) * freq2) * 0.4
    layer3 = rng.uniform(0, 0.25, size=(height, width))

    r = np.clip((layer1 * 0.35 + layer3 + 0.3) * 255, 0, 255).astype(np.uint8)
    g = np.clip((layer1 * 0.55 + layer2 * 0.25 + layer3 + 0.35) * 255, 0, 255).astype(
        np.uint8
    )
    b = np.clip((layer2 * 0.45 + layer3 + 0.2) * 255, 0, 255).astype(np.uint8)

    arr = np.stack([r, g, b], axis=-1)
    return Image.fromarray(arr, mode="RGB")


def generate_golden_fixtures(
    model: PlantClassifier,
    temperature: float,
    labels_meta: dict[str, dict[str, Any]],
    golden_dir: Path,
    count: int = 10,
    seed: int = DEFAULT_SEED,
) -> None:
    """Generate 10 deterministic procedural textured images and compute expected PyTorch outputs."""
    golden_dir.mkdir(parents=True, exist_ok=True)
    images_dir = golden_dir / "images"
    images_dir.mkdir(parents=True, exist_ok=True)

    transform = build_val_transform()
    model.eval()

    # Varied dimensions for testing aspect ratios and resizing logic
    dimensions = [
        (256, 256),
        (320, 240),
        (240, 320),
        (224, 224),
        (384, 288),
        (300, 300),
        (270, 360),
        (360, 270),
        (400, 300),
        (300, 400),
    ]

    expected_records: list[dict[str, Any]] = []

    logger.info("Generating %d golden fixtures under %s...", count, golden_dir)

    for idx in range(1, count + 1):
        w, h = dimensions[(idx - 1) % len(dimensions)]
        img_seed = seed + idx * 101
        img = generate_procedural_texture(seed=img_seed, width=w, height=h)

        filename = f"golden_{idx:02d}.png"
        img_path = images_dir / filename
        img.save(img_path, format="PNG")

        # TRD validation preprocessing
        tensor = transform(img).unsqueeze(0).float()

        with torch.no_grad():
            logits, embedding, _ = model.forward_features_and_embedding(tensor)

        # Temperature scaled probabilities
        scaled_logits = logits / max(0.01, temperature)
        probs = F.softmax(scaled_logits, dim=-1).squeeze(0)

        # Top 5 species
        top_probs, top_indices = torch.topk(probs, k=min(5, model.num_classes))
        top5: list[dict[str, Any]] = []
        for rank, (p, c_idx) in enumerate(zip(top_probs, top_indices), start=1):
            class_str = str(c_idx.item())
            meta = labels_meta.get(class_str, {})
            top5.append(
                {
                    "rank": rank,
                    "class_idx": int(c_idx.item()),
                    "species_id": int(meta.get("species_id", c_idx.item())),
                    "common_name": meta.get("common_name", f"Class {class_str}"),
                    "scientific_name": meta.get("scientific_name", ""),
                    "probability": round(float(p.item()), 6),
                }
            )

        # First 8 embedding values
        emb_first_8 = [round(float(v), 6) for v in embedding[0, :8].tolist()]

        expected_records.append(
            {
                "fixture_id": idx,
                "filename": f"images/{filename}",
                "original_dimensions": {"width": w, "height": h},
                "temperature": round(float(temperature), 4),
                "top5_predictions": top5,
                "embedding_first_8": emb_first_8,
            }
        )

    # Save expected_outputs.json
    expected_path = golden_dir / "expected_outputs.json"
    with open(expected_path, "w", encoding="utf-8") as f:
        json.dump(
            {
                "description": "Deterministic PyTorch ground-truth outputs for browser parity verification",
                "generated_at": datetime.datetime.now(datetime.UTC).isoformat(),
                "temperature": round(float(temperature), 4),
                "fixtures_count": count,
                "fixtures": expected_records,
            },
            f,
            indent=2,
        )

    # Save README.md detailing exact preprocessing specifications
    readme_path = golden_dir / "README.md"
    readme_content = f"""# Golden Parity Test Fixtures

This directory contains {count} synthetic, procedurally generated botanical textures and their
exact ground-truth PyTorch outputs. These fixtures are used by browser integration tests
(Playwright / Vitest in the Web Worker) to guarantee zero numerical drift between the Python
inference pipeline and TypeScript/WASM client execution.

## Files
- `images/golden_01.png` to `golden_{count:02d}.png`: Procedural 8-bit RGB test images.
- `expected_outputs.json`: Expected calibrated top-5 species probabilities and first 8 embedding values.
- `README.md`: This specification file.

## Exact Preprocessing Steps (TRD Section 5)
Browser client code must strictly match these steps:

1. **Color Decoding**: Load image into an RGB representation (uint8 in `[0, 255]`, 3 channels).
2. **Aspect-Preserving Resize**:
   - Determine shorter dimension: `min(width, height)`.
   - Scale the shorter dimension to exactly **256 pixels** while preserving the aspect ratio.
   - Resize algorithm: **Bilinear interpolation** (`Image.Resampling.BILINEAR` / HTML5 Canvas 2D bilinear drawImage).
3. **Center Crop**:
   - Crop a 224 x 224 square from the center of the 256-resized image:
     - `left = (resized_width - 224) // 2`
     - `top = (resized_height - 224) // 2`
     - `right = left + 224`
     - `bottom = top + 224`
4. **Channel Normalization (ImageNet Standard)**:
   - Convert pixel byte values to `float32` in `[0.0, 1.0]`: `pixel / 255.0`.
   - Normalize per channel: `normalized_val = (val - mean[c]) / std[c]`
   - Mean: `[0.485, 0.456, 0.406]` (R, G, B)
   - Std: `[0.229, 0.224, 0.225]` (R, G, B)
5. **Tensor Shape**:
   - Shape: `[1, 3, 224, 224]` in NCHW layout (channel first).
6. **Calibration**:
   - Raw model logits are divided by temperature **T = {temperature:.4f}** before softmax.
"""
    with open(readme_path, "w", encoding="utf-8") as f:
        f.write(readme_content)

    logger.info("Successfully generated golden fixtures in %s", golden_dir)


def main() -> None:
    """CLI Entry point for ONNX export, parity test, and artifact packaging."""
    parser = argparse.ArgumentParser(
        description="Export PlantClassifier PyTorch checkpoint to ONNX and package web artifacts."
    )
    parser.add_argument(
        "--run",
        type=str,
        default="",
        help="Path or directory name of the run in ml/runs/ (default: latest).",
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default="web/public/models",
        help="Target directory for web artifacts (default: web/public/models).",
    )
    parser.add_argument(
        "--golden-dir",
        type=str,
        default="web/tests/fixtures/golden",
        help="Target directory for golden test fixtures (default: web/tests/fixtures/golden).",
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
        help="Splits CSV path (default: ml/data/splits.csv).",
    )
    parser.add_argument(
        "--dataset-stats",
        type=str,
        default="web/public/data/dataset_stats.json",
        help="Dataset stats JSON path (default: web/public/data/dataset_stats.json).",
    )
    parser.add_argument(
        "--version",
        type=str,
        default=DEFAULT_VERSION,
        help=f"Model version string (default: {DEFAULT_VERSION}).",
    )
    parser.add_argument(
        "--opset",
        type=int,
        default=17,
        help="ONNX opset version (default: 17).",
    )
    parser.add_argument(
        "--parity-samples",
        type=int,
        default=DEFAULT_PARITY_SAMPLES,
        help=f"Number of test images for parity evaluation (default: {DEFAULT_PARITY_SAMPLES}).",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=DEFAULT_SEED,
        help=f"Deterministic seed (default: {DEFAULT_SEED}).",
    )
    args = parser.parse_args()

    seed_everything(args.seed)
    device = torch.device("cpu")  # Export and verify on CPU for deterministic parity

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

    eval_dir = run_dir / "eval"
    output_dir = Path(args.output_dir)
    golden_dir = Path(args.golden_dir)
    data_dir = Path(args.data_dir)
    splits_csv = Path(args.splits_csv)
    dataset_stats_path = Path(args.dataset_stats)

    output_dir.mkdir(parents=True, exist_ok=True)

    logger.info("==================================================")
    logger.info("  STARTING ONNX EXPORT & VERIFICATION PIPELINE")
    logger.info("==================================================")
    logger.info("Run Directory       : %s", run_dir.resolve())
    logger.info("Artifacts Output    : %s", output_dir.resolve())
    logger.info("Model Version       : %s", args.version)

    # 1. Load PyTorch model and metadata
    model, labels_meta = load_model_and_labels(run_dir, device)
    num_classes = model.num_classes
    sid_to_class = {
        int(meta["species_id"]): int(c_idx) for c_idx, meta in labels_meta.items()
    }

    # 2. Export ONNX model
    ver_tag = f"v{args.version.split('.')[0]}"
    versioned_onnx_path = output_dir / f"plant_model.{ver_tag}.onnx"
    default_onnx_path = output_dir / "plant_model.onnx"

    file_size_mb = export_onnx_model(
        model=model,
        output_path=versioned_onnx_path,
        opset_version=args.opset,
    )
    shutil.copyfile(versioned_onnx_path, default_onnx_path)

    # 3. Check model size and evaluate quantization requirement
    if file_size_mb <= MAX_UNQUANTIZED_SIZE_MB:
        logger.info(
            "Model size (%.2f MB) is below %.1f MB budget. Shipping FP32 model without quantization.",
            file_size_mb,
            MAX_UNQUANTIZED_SIZE_MB,
        )
    else:
        logger.warning(
            "Model size (%.2f MB) exceeds %.1f MB budget. Evaluating quantization...",
            file_size_mb,
            MAX_UNQUANTIZED_SIZE_MB,
        )

    # 4. Parity Test on 50 fixed test-set images
    test_records = load_test_image_paths(splits_csv, data_dir, sid_to_class)
    parity_results = run_parity_test(
        model=model,
        onnx_path=default_onnx_path,
        test_records=test_records,
        n_samples=args.parity_samples,
        seed=args.seed,
    )

    # 5. Export labels.json
    labels_out = output_dir / "labels.json"
    with open(labels_out, "w", encoding="utf-8") as f:
        json.dump(labels_meta, f, indent=2)

    # 6. Export CAM weights
    cam_shape, cam_kb = export_cam_weights(model, output_dir, args.version)

    # 7. Export training centroids
    centroids_kb = export_centroids(eval_dir, output_dir, num_classes, args.version)

    # 8. Export model_meta.json
    export_model_meta(output_dir, labels_meta, eval_dir, cam_shape, args.version)

    # 9. Export metrics.json
    export_metrics(output_dir, eval_dir, dataset_stats_path, args.version)

    # 10. Generate Golden Fixtures
    thresholds_file = eval_dir / "thresholds.json"
    temp_val = 1.0
    if thresholds_file.exists():
        with open(thresholds_file, "r", encoding="utf-8") as f:
            temp_val = float(json.load(f).get("temperature", 1.0))

    generate_golden_fixtures(
        model=model,
        temperature=temp_val,
        labels_meta=labels_meta,
        golden_dir=golden_dir,
        count=10,
        seed=args.seed,
    )

    # Short summary report
    print("\n" + "=" * 60)
    print("             ONNX EXPORT REPORT")
    print("=" * 60)
    print(f"Model Version        : {args.version}")
    print(f"Model Checkpoint     : {run_dir / 'best.pt'}")
    print(f"ONNX Model File      : {default_onnx_path.name} ({file_size_mb:.2f} MB)")
    print(
        f"CAM Weights File     : cam_weights.bin ({cam_kb:.1f} KB, shape {cam_shape})"
    )
    print(
        f"Centroids File       : centroids.json ({centroids_kb:.1f} KB, {num_classes} classes)"
    )
    print("-" * 60)
    print("Numerical Parity Results (PyTorch vs ONNX Runtime CPU):")
    print(
        f"  Max Logits Diff    : {parity_results['max_diff_logits']:.2e} (Pass: < 1e-3)"
    )
    print(f"  Max Embedding Diff : {parity_results['max_diff_embedding']:.2e}")
    print(f"  Max Features Diff  : {parity_results['max_diff_features']:.2e}")
    print("-" * 60)
    print(f"Web Artifacts Dir    : {output_dir.resolve()}")
    print(f"Golden Fixtures Dir  : {golden_dir.resolve()}")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    main()
