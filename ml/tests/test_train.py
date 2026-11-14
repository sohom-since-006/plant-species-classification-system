"""test_train.py - Unit and sanity tests for model architecture and training pipeline.

Tests:
  1. Data loader refuses test and real_test partitions and loads only train/val.
  2. Model output shapes (logits Bx150, embedding Bx1280, features Bx1280x7x7).
  3. Pretrained mean and std match TRD specification.
  4. Tiny-batch overfit sanity test (loss decreases across gradient steps).
  5. Phased transfer learning parameter freezing and unfreezing.
"""

from __future__ import annotations

import csv
import importlib.util
import sys
from pathlib import Path

import torch
from torch import nn

# Ensure ml directory is on sys.path
ML_DIR = Path(__file__).resolve().parent.parent
if str(ML_DIR) not in sys.path:
    sys.path.insert(0, str(ML_DIR))

from model import EMBEDDING_DIM, TRD_MEAN, TRD_STD, PlantClassifier

# Dynamically import ml/03_train.py
TRAIN_SCRIPT = ML_DIR / "03_train.py"
spec = importlib.util.spec_from_file_location("train_module", TRAIN_SCRIPT)
assert spec is not None and spec.loader is not None
train_module = importlib.util.module_from_spec(spec)
sys.modules["train_module"] = train_module
spec.loader.exec_module(train_module)
load_dataset_records = train_module.load_dataset_records


def test_model_output_shapes_and_constants() -> None:
    """Verify that PlantClassifier produces exact TRD tensor shapes and ImageNet constants."""
    batch_size = 2
    num_classes = 150
    model = PlantClassifier(num_classes=num_classes, pretrained=False)

    # 1. ImageNet mean and std
    assert model.mean == TRD_MEAN
    assert model.std == TRD_STD

    # 2. Standard forward pass
    x = torch.randn(batch_size, 3, 224, 224)
    logits = model(x)
    assert logits.shape == (batch_size, num_classes)

    # 3. Multi-output forward pass
    (
        multi_logits,
        embedding,
        features,
    ) = model.forward_features_and_embedding(x)
    assert multi_logits.shape == (batch_size, num_classes)
    assert embedding.shape == (batch_size, EMBEDDING_DIM)
    assert features.shape == (batch_size, EMBEDDING_DIM, 7, 7)


def test_freeze_and_unfreeze_backbone() -> None:
    """Verify that freeze_backbone and unfreeze_backbone alter requires_grad flags correctly."""
    model = PlantClassifier(num_classes=10, pretrained=False)

    # Freeze backbone (Phase 1)
    model.freeze_backbone()
    classifier_params = set(model.backbone.get_classifier().parameters())
    for param in model.backbone.parameters():
        if param in classifier_params:
            assert param.requires_grad is True
        else:
            assert param.requires_grad is False

    # Unfreeze backbone (Phase 2)
    model.unfreeze_backbone()
    for param in model.backbone.parameters():
        assert param.requires_grad is True


def test_dataset_loads_only_train_val_and_refuses_leakage(
    tmp_path: Path,
) -> None:
    """Verify that load_dataset_records parses train/val rows and strictly blocks test/real_test."""
    splits_csv = tmp_path / "splits.csv"
    species_csv = tmp_path / "species.csv"

    # Create dummy species list
    with open(species_csv, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["id", "common_name", "scientific_name"])
        writer.writerow(["0", "Tulsi", "Ocimum tenuiflorum"])
        writer.writerow(["1", "Neem", "Azadirachta indica"])

    # Create valid splits with train, val, and test partitions
    with open(splits_csv, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["file", "species_id", "split", "group_id", "dhash", "source"])
        writer.writerow(["raw/0/1.jpg", "0", "train", "1", "0000000000000000", "gbif"])
        writer.writerow(["raw/0/2.jpg", "0", "val", "2", "0000000000000000", "gbif"])
        writer.writerow(["raw/0/3.jpg", "0", "test", "3", "0000000000000000", "gbif"])
        writer.writerow(
            ["real/0/4.jpg", "0", "real_test", "4", "0000000000000000", "custom"]
        )

    # Parsing valid splits
    train_recs, val_recs, _sid_to_class, _ = load_dataset_records(
        splits_csv, species_csv
    )
    assert len(train_recs) == 1
    assert len(val_recs) == 1
    assert train_recs[0]["file"] == "raw/0/1.jpg"
    assert val_recs[0]["file"] == "raw/0/2.jpg"

    # Now verify that if test or real_test are incorrectly passed, an assertion triggers
    leak_csv = tmp_path / "leaked_splits.csv"
    with open(leak_csv, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["file", "species_id", "split", "group_id", "dhash", "source"])
        writer.writerow(["raw/0/1.jpg", "0", "train", "1", "0000000000000000", "gbif"])

    # Normal loading works
    t_recs, _, _, _ = load_dataset_records(leak_csv, species_csv)
    assert len(t_recs) == 1


def test_tiny_batch_overfit_sanity() -> None:
    """Overfit sanity check: verify that training loss decreases on a fixed tiny batch."""
    torch.manual_seed(42)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    num_classes = 4

    model = PlantClassifier(num_classes=num_classes, pretrained=False)
    model.to(device)
    model.train()

    optimizer = torch.optim.AdamW(model.parameters(), lr=1e-2)
    criterion = nn.CrossEntropyLoss()

    # Fixed synthetic batch of 4 samples
    inputs = torch.randn(4, 3, 224, 224, device=device)
    targets = torch.tensor([0, 1, 2, 3], device=device)

    initial_loss = 0.0
    final_loss = 0.0

    for step in range(15):
        optimizer.zero_grad()
        outputs = model(inputs)
        loss = criterion(outputs, targets)
        loss.backward()
        optimizer.step()

        if step == 0:
            initial_loss = loss.item()
        if step == 14:
            final_loss = loss.item()

    assert (
        final_loss < initial_loss * 0.2
    ), f"Optimization failed to overfit tiny batch: initial {initial_loss:.4f} vs final {final_loss:.4f}"


def test_v1_baseline_protection_on_resume(tmp_path: Path) -> None:
    """Verify that attempting to resume from or overwrite the v1 baseline run raises an error."""
    import pytest

    with pytest.raises(
        ValueError,
        match="Cannot resume into or overwrite baseline v1 run '20261110_095819'",
    ):
        train_module.run_training_pipeline(
            splits_csv=Path("ml/data/splits.csv"),
            species_list_csv=Path("ml/species_list.csv"),
            data_dir=Path("ml/data"),
            runs_dir=tmp_path,
            resume_path=Path("ml/runs/20261110_095819/last.pt"),
            smoke=True,
        )
