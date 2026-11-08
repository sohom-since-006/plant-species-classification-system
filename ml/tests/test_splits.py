"""test_splits.py - Unit and regression tests for dataset cleaning and splitting.

Tests:
  1. No group in two splits.
  2. No near-duplicate cluster across splits.
  3. Per-species minimums (flags under minimums, validates adequate counts).
  4. Manifest covers exactly the kept files.
  5. Deterministic across runs with the same seed.
  6. Extra photos assigned to train/val only, never test.
  7. Held-out real-test photos marked split=real_test.
  8. Dry-run mode changes nothing on disk.
"""

from __future__ import annotations

import csv
import importlib.util
import sys
from collections import defaultdict
from pathlib import Path
from typing import Any

import numpy as np
import pytest
from PIL import Image

# Dynamically import ml/02_clean_dataset.py
SCRIPT_PATH = Path(__file__).resolve().parent.parent / "02_clean_dataset.py"
spec = importlib.util.spec_from_file_location("clean_dataset_mod", SCRIPT_PATH)
assert spec is not None and spec.loader is not None
clean_dataset = importlib.util.module_from_spec(spec)
sys.modules["clean_dataset_mod"] = clean_dataset
spec.loader.exec_module(clean_dataset)


def create_test_image(
    path: Path, width: int = 200, height: int = 200, pattern: str = "gradient"
) -> None:
    """Create a synthetic test image with a predictable visual pattern."""
    path.parent.mkdir(parents=True, exist_ok=True)
    if pattern == "gradient":
        arr = np.tile(np.linspace(0, 255, width, dtype=np.uint8), (height, 1))
    elif pattern == "gradient_alt":
        arr = np.tile(np.linspace(0, 255, width, dtype=np.uint8), (height, 1))
        arr[10:30, 10:30] = 128
    elif pattern == "vertical":
        arr = np.tile(
            np.linspace(0, 255, height, dtype=np.uint8).reshape(-1, 1),
            (1, width),
        )
    elif pattern == "constant":
        arr = np.full((height, width), fill_value=128, dtype=np.uint8)
    else:
        rng = np.random.RandomState(hash(pattern) % (2**31))
        arr = rng.randint(0, 256, size=(height, width), dtype=np.uint8)

    img = Image.fromarray(arr)
    img.save(path, format="JPEG", quality=90)


@pytest.fixture
def synthetic_dataset(tmp_path: Path) -> dict[str, Any]:
    """Build a comprehensive synthetic dataset with edge cases and occurrences."""
    data_dir = tmp_path / "data"
    raw_dir = data_dir / "raw"
    extra_dir = data_dir / "extra"
    real_test_dir = data_dir / "real_test"
    species_csv = tmp_path / "species_list.csv"
    credits_csv = data_dir / "dataset_credits.csv"
    web_stats = tmp_path / "web" / "dataset_stats.json"

    # 1. Species list (2 species with adequate images for minimums, 1 small species)
    with open(species_csv, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(
            [
                "id",
                "common_name",
                "scientific_name",
                "family",
                "genus",
                "type",
                "origin",
                "hindi_name",
                "bengali_name",
                "notes",
            ]
        )
        writer.writerow(
            [
                "0",
                "Tulsi",
                "Ocimum tenuiflorum",
                "Lamiaceae",
                "Ocimum",
                "Herb",
                "Native",
                "तुलसी",
                "তুলসী",
                "",
            ]
        )
        writer.writerow(
            [
                "1",
                "Neem",
                "Azadirachta indica",
                "Meliaceae",
                "Azadirachta",
                "Tree",
                "Native",
                "नीम",
                "নিম",
                "",
            ]
        )
        writer.writerow(
            [
                "2",
                "Rare Plant",
                "Rara avis",
                "Fabaceae",
                "Rara",
                "Herb",
                "Introduced",
                "",
                "",
                "",
            ]
        )

    credits_rows: list[list[str]] = [
        [
            "species_id",
            "file",
            "occurrence_key",
            "creator",
            "license",
            "source_url",
        ]
    ]

    # Species 0: 35 normal images + defective files
    sp0_dir = raw_dir / "0_ocimum_tenuiflorum"
    occ_counter = 1000
    for i in range(1, 36):
        fpath = sp0_dir / f"{i}.jpg"
        create_test_image(fpath, width=220, height=220, pattern=f"sp0_{i}")
        occ_key = occ_counter + (i % 8)  # Groups of ~4-5 images
        credits_rows.append(
            [
                "0",
                f"raw/0_ocimum_tenuiflorum/{i}.jpg",
                str(occ_key),
                "author",
                "CC-BY",
                "http://example.com",
            ]
        )

    # Deliberate near-duplicate pair in species 0: image 36 and 37
    create_test_image(sp0_dir / "36.jpg", width=220, height=220, pattern="gradient")
    create_test_image(sp0_dir / "37.jpg", width=220, height=220, pattern="gradient_alt")
    credits_rows.append(
        [
            "0",
            "raw/0_ocimum_tenuiflorum/36.jpg",
            "2001",
            "author",
            "CC-BY",
            "http://example.com",
        ]
    )
    credits_rows.append(
        [
            "0",
            "raw/0_ocimum_tenuiflorum/37.jpg",
            "2002",
            "author",
            "CC-BY",
            "http://example.com",
        ]
    )

    # Defect 1: corrupt file
    corrupt_file = sp0_dir / "corrupt.jpg"
    corrupt_file.write_bytes(b"broken corrupted bytes that cannot be decoded")
    credits_rows.append(
        [
            "0",
            "raw/0_ocimum_tenuiflorum/corrupt.jpg",
            "2003",
            "author",
            "CC-BY",
            "http://example.com",
        ]
    )

    # Defect 2: small file (< 160 px)
    small_file = sp0_dir / "small.jpg"
    create_test_image(small_file, width=120, height=120)
    credits_rows.append(
        [
            "0",
            "raw/0_ocimum_tenuiflorum/small.jpg",
            "2004",
            "author",
            "CC-BY",
            "http://example.com",
        ]
    )

    # Defect 3: extreme aspect ratio (> 4:1) with shorter side >= 160 px
    aspect_file = sp0_dir / "aspect.jpg"
    create_test_image(
        aspect_file, width=1000, height=200
    )  # 5:1 aspect ratio, min_size=200 >= 160
    credits_rows.append(
        [
            "0",
            "raw/0_ocimum_tenuiflorum/aspect.jpg",
            "2005",
            "author",
            "CC-BY",
            "http://example.com",
        ]
    )

    # Defect 4: exact byte duplicate
    dupe_orig = sp0_dir / "dupe_orig.jpg"
    create_test_image(dupe_orig, width=200, height=200, pattern="exact_dupe")
    dupe_copy = sp0_dir / "dupe_copy.jpg"
    dupe_copy.write_bytes(dupe_orig.read_bytes())
    credits_rows.append(
        [
            "0",
            "raw/0_ocimum_tenuiflorum/dupe_orig.jpg",
            "2006",
            "author",
            "CC-BY",
            "http://example.com",
        ]
    )
    credits_rows.append(
        [
            "0",
            "raw/0_ocimum_tenuiflorum/dupe_copy.jpg",
            "2007",
            "author",
            "CC-BY",
            "http://example.com",
        ]
    )

    # Species 1: 35 images
    sp1_dir = raw_dir / "1_azadirachta_indica"
    for i in range(1, 36):
        fpath = sp1_dir / f"{i}.jpg"
        create_test_image(fpath, width=220, height=220, pattern=f"sp1_{i}")
        credits_rows.append(
            [
                "1",
                f"raw/1_azadirachta_indica/{i}.jpg",
                str(3000 + (i % 7)),
                "author",
                "CC-BY",
                "http://example.com",
            ]
        )

    # Species 2: Under-sized species (only 5 images) -> triggers minimum flags
    sp2_dir = raw_dir / "2_rara_avis"
    for i in range(1, 6):
        fpath = sp2_dir / f"{i}.jpg"
        create_test_image(fpath, width=220, height=220, pattern=f"sp2_{i}")
        credits_rows.append(
            [
                "2",
                f"raw/2_rara_avis/{i}.jpg",
                str(4000 + i),
                "author",
                "CC-BY",
                "http://example.com",
            ]
        )

    # Extra training images (species 1)
    extra_sp1 = extra_dir / "1_azadirachta_indica"
    create_test_image(
        extra_sp1 / "extra_1.jpg", width=220, height=220, pattern="extra_sp1_1"
    )

    # Real-test held-out images (species 0)
    real_test_sp0 = real_test_dir / "0_ocimum_tenuiflorum"
    create_test_image(
        real_test_sp0 / "real_1.jpg",
        width=220,
        height=220,
        pattern="real_test_1",
    )

    # Save credits CSV
    credits_csv.parent.mkdir(parents=True, exist_ok=True)
    with open(credits_csv, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerows(credits_rows)

    return {
        "data_dir": data_dir,
        "species_csv": species_csv,
        "credits_csv": credits_csv,
        "web_stats": web_stats,
    }


def test_quality_filters_and_rejected_files(synthetic_dataset: dict[str, Any]) -> None:
    """Verify that corrupt, small, aspect_ratio, and exact duplicate files are rejected and moved."""
    data_dir = synthetic_dataset["data_dir"]

    report, _stats = clean_dataset.execute_cleaning_pipeline(
        data_dir=data_dir,
        species_list_csv=synthetic_dataset["species_csv"],
        credits_csv=synthetic_dataset["credits_csv"],
        web_stats_json=synthetic_dataset["web_stats"],
        seed=42,
        dry_run=False,
    )

    counts = report["counts_removed"]
    assert counts["corrupt"] >= 1, "Corrupt file was not detected"
    assert counts["small"] >= 1, "Small file was not detected"
    assert counts["aspect_ratio"] >= 1, "Aspect ratio file was not detected"
    assert counts["exact_duplicate"] >= 1, "Exact duplicate was not detected"

    # Verify moved files exist in rejected/
    rejected_dir = data_dir / "rejected"
    assert (rejected_dir / "corrupt" / "0_ocimum_tenuiflorum" / "corrupt.jpg").exists()
    assert (rejected_dir / "small" / "0_ocimum_tenuiflorum" / "small.jpg").exists()
    assert (
        rejected_dir / "aspect_ratio" / "0_ocimum_tenuiflorum" / "aspect.jpg"
    ).exists()
    assert (
        rejected_dir / "exact_duplicate" / "0_ocimum_tenuiflorum" / "dupe_orig.jpg"
    ).exists()

    # Verify rejected files are no longer in raw/
    raw_sp0 = data_dir / "raw" / "0_ocimum_tenuiflorum"
    assert not (raw_sp0 / "corrupt.jpg").exists()
    assert not (raw_sp0 / "small.jpg").exists()
    assert not (raw_sp0 / "aspect.jpg").exists()
    assert not (raw_sp0 / "dupe_orig.jpg").exists()


def test_no_group_in_two_splits(synthetic_dataset: dict[str, Any]) -> None:
    """Verify that no group appears in more than one split partition."""
    data_dir = synthetic_dataset["data_dir"]

    clean_dataset.execute_cleaning_pipeline(
        data_dir=data_dir,
        species_list_csv=synthetic_dataset["species_csv"],
        credits_csv=synthetic_dataset["credits_csv"],
        web_stats_json=synthetic_dataset["web_stats"],
        seed=42,
        dry_run=False,
    )

    splits_csv = data_dir / "splits.csv"
    assert splits_csv.exists()

    group_splits: dict[str, set[str]] = defaultdict(set)
    with open(splits_csv, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row["split"] != "real_test":
                group_splits[row["group_id"]].add(row["split"])

    for gid, splits in group_splits.items():
        assert (
            len(splits) == 1
        ), f"Group {gid} was leaked across multiple splits: {splits}"


def test_no_near_duplicate_cluster_across_splits(
    synthetic_dataset: dict[str, Any],
) -> None:
    """Verify that near-duplicate clusters (Hamming <= 5) never leak across splits."""
    data_dir = synthetic_dataset["data_dir"]

    clean_dataset.execute_cleaning_pipeline(
        data_dir=data_dir,
        species_list_csv=synthetic_dataset["species_csv"],
        credits_csv=synthetic_dataset["credits_csv"],
        web_stats_json=synthetic_dataset["web_stats"],
        seed=42,
        dry_run=False,
    )

    splits_csv = data_dir / "splits.csv"
    records: list[dict[str, str]] = []
    with open(splits_csv, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        records = [r for r in reader if r["split"] != "real_test"]

    # Compute distances between all pairs
    for i in range(len(records)):
        h1 = int(records[i]["dhash"], 16)
        s1 = records[i]["split"]
        for j in range(i + 1, len(records)):
            h2 = int(records[j]["dhash"], 16)
            s2 = records[j]["split"]
            dist = (h1 ^ h2).bit_count()
            if dist <= 5:
                assert (
                    s1 == s2
                ), f"Near duplicates {records[i]['file']} and {records[j]['file']} (dist {dist}) split into '{s1}' vs '{s2}'"


def test_per_species_minimums_and_flagging(synthetic_dataset: dict[str, Any]) -> None:
    """Verify minimum thresholds per species and proper reporting of deficient species."""
    data_dir = synthetic_dataset["data_dir"]

    report, _stats = clean_dataset.execute_cleaning_pipeline(
        data_dir=data_dir,
        species_list_csv=synthetic_dataset["species_csv"],
        credits_csv=synthetic_dataset["credits_csv"],
        web_stats_json=synthetic_dataset["web_stats"],
        seed=42,
        dry_run=False,
    )

    # Species 0 and 1 had >=35 images, so they should achieve >= 10 val and >= 10 test
    splits_csv = data_dir / "splits.csv"
    sp_split_counts: dict[int, dict[str, int]] = defaultdict(lambda: defaultdict(int))
    with open(splits_csv, mode="r", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            sid = int(row["species_id"])
            sp_split_counts[sid][row["split"]] += 1

    assert sp_split_counts[0]["val"] >= 10
    assert sp_split_counts[0]["test"] >= 10
    assert sp_split_counts[1]["val"] >= 10
    assert sp_split_counts[1]["test"] >= 10

    # Species 2 only had 5 images; check that it is flagged in the report
    flagged = [item["species_id"] for item in report["flagged_species_split_minimum"]]
    assert 2 in flagged, "Deficient species 2 was not properly flagged"


def test_manifest_covers_exactly_kept_files(synthetic_dataset: dict[str, Any]) -> None:
    """Verify that splits.csv manifest lists exactly the surviving files on disk."""
    data_dir = synthetic_dataset["data_dir"]

    clean_dataset.execute_cleaning_pipeline(
        data_dir=data_dir,
        species_list_csv=synthetic_dataset["species_csv"],
        credits_csv=synthetic_dataset["credits_csv"],
        web_stats_json=synthetic_dataset["web_stats"],
        seed=42,
        dry_run=False,
    )

    splits_csv = data_dir / "splits.csv"
    manifest_files: set[str] = set()
    with open(splits_csv, mode="r", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            manifest_files.add(row["file"])

    # Collect actual remaining files across raw/, extra/, and real_test/
    actual_files: set[str] = set()
    for sub in ["raw", "extra", "real_test"]:
        p = data_dir / sub
        if p.exists():
            for f in p.glob("*/*"):
                if f.is_file():
                    actual_files.add(f.relative_to(data_dir).as_posix())

    assert (
        manifest_files == actual_files
    ), f"Difference: manifest - disk = {manifest_files - actual_files}, disk - manifest = {actual_files - manifest_files}"


def test_deterministic_with_same_seed(synthetic_dataset: dict[str, Any]) -> None:
    """Verify identical splits and group IDs when executed with the same random seed."""
    data_dir = synthetic_dataset["data_dir"]

    # Run 1
    clean_dataset.execute_cleaning_pipeline(
        data_dir=data_dir,
        species_list_csv=synthetic_dataset["species_csv"],
        credits_csv=synthetic_dataset["credits_csv"],
        web_stats_json=synthetic_dataset["web_stats"],
        seed=42,
        dry_run=False,
    )
    splits_1 = (data_dir / "splits.csv").read_text(encoding="utf-8")

    # Run 2 on the cleaned directory
    clean_dataset.execute_cleaning_pipeline(
        data_dir=data_dir,
        species_list_csv=synthetic_dataset["species_csv"],
        credits_csv=synthetic_dataset["credits_csv"],
        web_stats_json=synthetic_dataset["web_stats"],
        seed=42,
        dry_run=False,
    )
    splits_2 = (data_dir / "splits.csv").read_text(encoding="utf-8")

    assert (
        splits_1 == splits_2
    ), "Pipeline execution is non-deterministic with the same seed"


def test_custom_extra_never_in_test(synthetic_dataset: dict[str, Any]) -> None:
    """Verify that images with source=custom are allocated only to train or val, never test."""
    data_dir = synthetic_dataset["data_dir"]

    clean_dataset.execute_cleaning_pipeline(
        data_dir=data_dir,
        species_list_csv=synthetic_dataset["species_csv"],
        credits_csv=synthetic_dataset["credits_csv"],
        web_stats_json=synthetic_dataset["web_stats"],
        seed=42,
        dry_run=False,
    )

    splits_csv = data_dir / "splits.csv"
    with open(splits_csv, mode="r", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            if row["source"] == "custom":
                assert row["split"] in {
                    "train",
                    "val",
                }, f"Custom extra file {row['file']} was placed in '{row['split']}'"


def test_real_test_photos_marked_real_test(synthetic_dataset: dict[str, Any]) -> None:
    """Verify that images in real_test/ receive split=real_test and are held out from training."""
    data_dir = synthetic_dataset["data_dir"]

    clean_dataset.execute_cleaning_pipeline(
        data_dir=data_dir,
        species_list_csv=synthetic_dataset["species_csv"],
        credits_csv=synthetic_dataset["credits_csv"],
        web_stats_json=synthetic_dataset["web_stats"],
        seed=42,
        dry_run=False,
    )

    splits_csv = data_dir / "splits.csv"
    real_test_rows = []
    with open(splits_csv, mode="r", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            if "real_test" in row["file"]:
                real_test_rows.append(row)

    assert len(real_test_rows) > 0
    for r in real_test_rows:
        assert (
            r["split"] == "real_test"
        ), f"Real test photo {r['file']} got split '{r['split']}'"


def test_dry_run_leaves_disk_untouched(synthetic_dataset: dict[str, Any]) -> None:
    """Verify that --dry-run produces complete reports in memory while modifying zero files on disk."""
    data_dir = synthetic_dataset["data_dir"]
    web_stats = synthetic_dataset["web_stats"]

    raw_files_before = set((data_dir / "raw").rglob("*"))

    report, _stats = clean_dataset.execute_cleaning_pipeline(
        data_dir=data_dir,
        species_list_csv=synthetic_dataset["species_csv"],
        credits_csv=synthetic_dataset["credits_csv"],
        web_stats_json=web_stats,
        seed=42,
        dry_run=True,
    )

    raw_files_after = set((data_dir / "raw").rglob("*"))

    assert (
        raw_files_before == raw_files_after
    ), "Dry run modified raw image files on disk"
    assert not (data_dir / "rejected").exists(), "Dry run created rejected directory"
    assert not (data_dir / "splits.csv").exists(), "Dry run wrote splits.csv manifest"
    assert not (
        data_dir / "cleaning_report.json"
    ).exists(), "Dry run wrote cleaning_report.json"
    assert not web_stats.exists(), "Dry run wrote dataset_stats.json"
    assert report["total_scanned"] > 0, "Dry run failed to calculate scanned counts"
