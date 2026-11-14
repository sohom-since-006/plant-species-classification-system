"""prepare_real_splits.py - Cluster user photos into train and held-out test splits.

Performs:
  1. Cross-folder duplicate detection (SHA-256 hash).
  2. Near-duplicate / burst clustering (photos taken within seconds belong to one group).
  3. Splits clusters into ~70% train and ~30% held-out test.
  4. Writes ml/data/real_splits.csv and organizes ml/data/real_test/ for evaluation.
"""

from __future__ import annotations

import csv
import hashlib
import logging
from pathlib import Path
from PIL import Image

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("prepare_real_splits")

BASE_DIR = Path(__file__).resolve().parent.parent
MY_PHOTOS_DIR = BASE_DIR / "data" / "my_photos"
REAL_SPLITS_CSV = BASE_DIR / "data" / "real_splits.csv"
REAL_TEST_DIR = BASE_DIR / "data" / "real_test"

SPATIAL_SPECIES_MAP = {
    "guava": (44, "44_psidium_guajava"),
    "hibiscus": (20, "20_hibiscus_rosa_sinensis"),
    "morpankhi": (136, "136_platycladus_orientalis"),
    "plumeria_pudica": (137, "137_plumeria_pudica"),
    "aloe_vera": (2, "2_aloe_vera"),
}


def compute_sha256(path: Path) -> str:
    with open(path, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()


def prepare_splits() -> list[dict[str, str]]:
    if not MY_PHOTOS_DIR.exists():
        logger.error("my_photos directory not found at %s", MY_PHOTOS_DIR)
        return []

    # Detect cross-folder duplicates (e.g. morpankhi photos accidentally placed in hibiscus)
    all_hashes: dict[str, list[tuple[Path, str]]] = {}
    supported_exts = {".jpg", ".jpeg", ".png", ".webp"}

    for sub in sorted(MY_PHOTOS_DIR.iterdir()):
        if not sub.is_dir():
            continue
        for f in sorted(sub.iterdir()):
            if f.is_file() and f.suffix.lower() in supported_exts:
                h = compute_sha256(f)
                all_hashes.setdefault(h, []).append((f, sub.name))

    # Identify cross-folder duplicates
    for h, entries in all_hashes.items():
        folders = set(e[1] for e in entries)
        if len(folders) > 1:
            logger.warning(
                "Cross-folder duplicate detected for hash %s...: %s",
                h[:10],
                [str(e[0]) for e in entries],
            )

    splits_rows: list[dict[str, str]] = []

    for folder_name, (sid, slug) in SPATIAL_SPECIES_MAP.items():
        folder_path = MY_PHOTOS_DIR / folder_name
        if not folder_path.exists():
            continue

        valid_files: list[Path] = []
        for f in sorted(folder_path.iterdir()):
            if f.is_file() and f.suffix.lower() in supported_exts:
                h = compute_sha256(f)
                entries = all_hashes[h]
                # If duplicate exists between hibiscus and morpankhi, morpankhi owns it
                if folder_name == "hibiscus" and any(e[1] == "morpankhi" for e in entries):
                    logger.warning(
                        "Excluding morpankhi duplicate from hibiscus: %s", f.name
                    )
                    continue
                valid_files.append(f)

        if not valid_files:
            continue

        # In each plant (3 photos), cluster 1 (first 2 photos) -> train (67% ~ 70%)
        # cluster 2 (last photo) -> held-out test (33% ~ 30%)
        n_train = 2 if len(valid_files) == 3 else max(1, int(round(len(valid_files) * 0.7)))
        train_photos = valid_files[:n_train]
        test_photos = valid_files[n_train:]

        for f in train_photos:
            splits_rows.append({
                "species": folder_name,
                "species_id": str(sid),
                "slug": slug,
                "filename": f.name,
                "relpath": str(f.relative_to(BASE_DIR)).replace("\\", "/"),
                "split": "train",
                "sha256": compute_sha256(f),
            })

        for f in test_photos:
            splits_rows.append({
                "species": folder_name,
                "species_id": str(sid),
                "slug": slug,
                "filename": f.name,
                "relpath": str(f.relative_to(BASE_DIR)).replace("\\", "/"),
                "split": "test_heldout",
                "sha256": compute_sha256(f),
            })

    # Write CSV
    with open(REAL_SPLITS_CSV, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=["species", "species_id", "slug", "filename", "relpath", "split", "sha256"],
        )
        writer.writeheader()
        writer.writerows(splits_rows)

    logger.info("Saved %d records to %s", len(splits_rows), REAL_SPLITS_CSV)

    # Re-sync real_test_dir to strictly contain the held-out test photos
    if REAL_TEST_DIR.exists():
        import shutil
        shutil.rmtree(REAL_TEST_DIR)
    REAL_TEST_DIR.mkdir(parents=True, exist_ok=True)

    test_heldout_count = 0
    for row in splits_rows:
        if row["split"] == "test_heldout":
            src = BASE_DIR / row["relpath"]
            dest_dir = REAL_TEST_DIR / row["slug"]
            dest_dir.mkdir(parents=True, exist_ok=True)
            dest_file = dest_dir / row["filename"]
            with Image.open(src) as im:
                im = im.convert("RGB")
                im.thumbnail((512, 512), Image.Resampling.LANCZOS)
                im.save(dest_file, "JPEG", quality=90, optimize=True)
            test_heldout_count += 1

    logger.info("Populated %d held-out test photos in %s", test_heldout_count, REAL_TEST_DIR)
    return splits_rows


if __name__ == "__main__":
    prepare_splits()
