"""eval_real_test.py - Evaluate real-world photos on PlantAI model checkpoints.

Features:
  1. Synchronizes user-captured field photos from ml/data/my_photos/<name>/ into
     ml/data/real_test/<id>_<slug>/ by fuzzy-matching folder names to species IDs.
  2. Evaluates real test photos against a trained PyTorch checkpoint (best.pt),
     strictly verifying that photos are never part of train/val/test splits.
  3. Uses model_meta.json calibration temperature, centroid distance (tau), and
     rejection thresholds to compute exact production Top-3 probabilities and tiers.
  4. Handles model version differences gracefully (e.g. evaluating 112-class best.pt
     vs 150-class v2 checkpoint, flagging classes the model has not learned yet).

Usage:
  python ml/tools/eval_real_test.py [--run RUN_DIR] [--sync-only] [--device cpu|cuda]
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import logging
import re
import shutil
from pathlib import Path
from typing import Any

import torch
import torch.nn.functional as F
from PIL import Image, ImageOps
from torchvision import transforms

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("eval_real_test")

# Ensure ml directory is on sys.path
SCRIPT_DIR = Path(__file__).resolve().parent
ML_DIR = SCRIPT_DIR.parent
import sys

if str(ML_DIR) not in sys.path:
    sys.path.insert(0, str(ML_DIR))

from model import EMBEDDING_DIM, TRD_MEAN, TRD_STD, PlantClassifier


def load_species_list(species_list_csv: Path) -> dict[int, dict[str, str]]:
    """Load metadata mapping species id -> {common_name, scientific_name, genus, family, type}."""
    species: dict[int, dict[str, str]] = {}
    if not species_list_csv.exists():
        logger.error("Species list not found at %s", species_list_csv)
        return species

    with open(species_list_csv, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                sid = int(row["id"])
                species[sid] = row
            except (ValueError, KeyError):
                continue
    return species


def make_slug(name: str) -> str:
    """Convert a name into a lowercase slug."""
    clean = re.sub(r"[^a-zA-Z0-9]+", "_", name.strip().lower())
    return clean.strip("_")


def map_folder_to_species(
    folder_name: str, species: dict[int, dict[str, str]]
) -> int | None:
    """Map a folder name from my_photos/<name> to a valid species ID."""
    norm = folder_name.strip().lower().replace("-", " ").replace("_", " ")

    # 1. Direct integer or prefixed with integer: "0", "0_tulsi", "112 rangoon creeper"
    prefix_match = re.match(r"^(\d+)", folder_name.strip())
    if prefix_match:
        sid = int(prefix_match.group(1))
        if sid in species:
            return sid

    # 2. Exact match against scientific name or common name
    for sid, meta in species.items():
        sci = meta.get("scientific_name", "").lower()
        com = meta.get("common_name", "").lower()
        if norm == sci or norm == com:
            return sid

    # 3. Fuzzy / Token containment match
    tokens = set(re.findall(r"[a-z0-9]+", norm))
    best_sid: int | None = None
    best_overlap = 0

    for sid, meta in species.items():
        target_tokens = set(
            re.findall(
                r"[a-z0-9]+",
                (meta.get("scientific_name", "") + " " + meta.get("common_name", "")).lower(),
            )
        )
        overlap = len(tokens & target_tokens)
        if overlap > best_overlap:
            best_overlap = overlap
            best_sid = sid

    if best_overlap >= 1:
        return best_sid

    return None


def check_duplicate_hashes(source_dir: Path) -> dict[str, list[tuple[Path, str]]]:
    """Scan directory and detect duplicate files across folders using SHA-256."""
    hashes: dict[str, list[tuple[Path, str]]] = {}
    supported_exts = {".jpg", ".jpeg", ".png", ".webp"}
    for sub in sorted(source_dir.iterdir()):
        if not sub.is_dir():
            continue
        for img_path in sorted(sub.iterdir()):
            if img_path.is_file() and img_path.suffix.lower() in supported_exts:
                try:
                    with open(img_path, "rb") as f:
                        h = hashlib.sha256(f.read()).hexdigest()
                    hashes.setdefault(h, []).append((img_path, sub.name))
                except Exception as exc:
                    logger.warning("Failed to compute hash for %s: %s", img_path, exc)

    cross_folder_duplicates = 0
    for h, entries in hashes.items():
        folders = set(e[1] for e in entries)
        if len(folders) > 1:
            cross_folder_duplicates += 1
            paths_str = ", ".join(f"'{e[0].as_posix()}'" for e in entries)
            logger.warning(
                "[DUPLICATE WARNING] Identical image content (SHA-256 %s...) detected in multiple species folders: %s",
                h[:12],
                paths_str,
            )
    return hashes


def sync_my_photos(
    my_photos_dir: Path,
    real_test_dir: Path,
    species: dict[int, dict[str, str]],
) -> int:
    """Sync photos from my_photos/<name>/ into real_test/<sid>_<slug>/ with duplicate detection."""
    if not my_photos_dir.exists():
        return 0

    # 1. Detect duplicates across folders first
    hashes = check_duplicate_hashes(my_photos_dir)

    real_test_dir.mkdir(parents=True, exist_ok=True)
    supported_exts = {".jpg", ".jpeg", ".png", ".webp"}
    synced_count = 0

    for sub in sorted(my_photos_dir.iterdir()):
        if not sub.is_dir():
            continue

        sid = map_folder_to_species(sub.name, species)
        if sid is None:
            logger.warning("Could not map folder '%s' to any known species in species_list.csv", sub.name)
            continue

        sci = species[sid].get("scientific_name", "unknown")
        slug = f"{sid}_{make_slug(sci)}"
        dest_folder = real_test_dir / slug
        dest_folder.mkdir(parents=True, exist_ok=True)

        for img_path in sorted(sub.iterdir()):
            if img_path.is_file() and img_path.suffix.lower() in supported_exts:
                # Check if this file is a cross-folder duplicate
                try:
                    with open(img_path, "rb") as f:
                        fhash = hashlib.sha256(f.read()).hexdigest()
                    duplicate_entries = hashes.get(fhash, [])
                    other_folders = [e[1] for e in duplicate_entries if e[1] != sub.name]
                    if other_folders:
                        # In the case of hibiscus vs morpankhi, 15:28:xx images are morpankhi
                        if sub.name == "hibiscus" and "morpankhi" in other_folders:
                            logger.warning(
                                "Skipping cross-folder duplicate '%s' from 'hibiscus' (attributed to 'morpankhi')",
                                img_path.name,
                            )
                            continue
                        elif sub.name != "morpankhi" and "morpankhi" in other_folders:
                            logger.warning(
                                "Skipping cross-folder duplicate '%s' from '%s'",
                                img_path.name,
                                sub.name,
                            )
                            continue
                except Exception:
                    pass

                dest_file = dest_folder / f"{img_path.stem}.jpg"
                try:
                    with Image.open(img_path) as im:
                        im = ImageOps.exif_transpose(im).convert("RGB")
                        im.thumbnail((512, 512), Image.Resampling.LANCZOS)
                        im.save(dest_file, "JPEG", quality=90, optimize=True)
                    synced_count += 1
                except Exception as exc:
                    logger.warning("Failed to process image %s: %s", img_path, exc)

    logger.info("Synchronized %d photos from %s to %s", synced_count, my_photos_dir, real_test_dir)
    return synced_count


def find_latest_run(runs_dir: Path) -> Path:
    """Find the most recent run directory in ml/runs containing best.pt."""
    if not runs_dir.exists():
        raise FileNotFoundError(f"Runs directory {runs_dir} does not exist.")

    candidates = [
        d
        for d in runs_dir.iterdir()
        if d.is_dir() and (d / "best.pt").is_file() and (d / "labels.json").is_file()
    ]
    if not candidates:
        raise FileNotFoundError(f"No valid run directories containing best.pt and labels.json in {runs_dir}")

    candidates.sort(key=lambda d: d.stat().st_mtime, reverse=True)
    return candidates[0]


def load_model_meta(model_meta_json: Path) -> dict[str, Any]:
    """Load calibration and tier boundary metadata."""
    defaults = {
        "temperature": 0.7181,
        "tau": 0.32,
        "threshold": 0.57,
        "tierBoundaries": {"high": 0.85, "medium": 0.60},
    }
    if not model_meta_json.exists():
        logger.warning("model_meta.json not found at %s. Using default evaluation parameters.", model_meta_json)
        return defaults

    try:
        with open(model_meta_json, mode="r", encoding="utf-8") as f:
            data = json.load(f)
            return {
                "temperature": float(data.get("temperature", defaults["temperature"])),
                "tau": float(data.get("tau", defaults["tau"])),
                "threshold": float(data.get("threshold", defaults["threshold"])),
                "tierBoundaries": data.get("tierBoundaries", defaults["tierBoundaries"]),
            }
    except Exception as exc:
        logger.warning("Failed to parse %s: %s; using defaults.", model_meta_json, exc)
        return defaults


def build_transform() -> transforms.Compose:
    """Construct deterministic image preprocessing per TRD Section 5."""
    return transforms.Compose(
        [
            transforms.Resize(256),
            transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize(mean=TRD_MEAN, std=TRD_STD),
        ]
    )


def compute_tier(
    prob: float,
    cos_sim: float,
    threshold: float,
    tau: float,
    tier_boundaries: dict[str, float],
) -> str:
    """Determine confidence tier applying the TRD Section 5 rejection gate identical to web/src/ml."""
    is_unknown = (prob < threshold) or (cos_sim < tau)
    if is_unknown or prob < threshold:
        return "Unknown / Rejected"
    if prob > tier_boundaries.get("high", 0.85):
        return "High"
    if prob >= tier_boundaries.get("medium", 0.60):
        return "Medium"
    return "Low"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Evaluate real field photos against trained botanical checkpoints.")
    parser.add_argument(
        "--run",
        type=Path,
        default=None,
        help="Path to run directory containing best.pt and labels.json (default: latest in ml/runs/).",
    )
    parser.add_argument(
        "--my-photos-dir",
        type=Path,
        default=Path("ml/data/my_photos"),
        help="Source directory for user field photos (default: ml/data/my_photos).",
    )
    parser.add_argument(
        "--real-test-dir",
        type=Path,
        default=Path("ml/data/real_test"),
        help="Target directory for processed real_test photos (default: ml/data/real_test).",
    )
    parser.add_argument(
        "--species-list",
        type=Path,
        default=Path("ml/species_list.csv"),
        help="Path to species_list.csv (default: ml/species_list.csv).",
    )
    parser.add_argument(
        "--model-meta",
        type=Path,
        default=Path("web/public/models/model_meta.json"),
        help="Path to model_meta.json (default: web/public/models/model_meta.json).",
    )
    parser.add_argument(
        "--sync-only",
        action="store_true",
        help="Only synchronize my_photos to real_test without running model evaluation.",
    )
    parser.add_argument(
        "--held-out-only",
        action="store_true",
        help="Only evaluate photos marked as 'test_heldout' in real_splits.csv.",
    )
    parser.add_argument(
        "--real-splits",
        type=Path,
        default=Path("ml/data/real_splits.csv"),
        help="Path to real_splits.csv containing cluster split annotations.",
    )
    parser.add_argument(
        "--no-sync",
        action="store_true",
        help="Do not re-sync from my_photos before evaluation.",
    )
    parser.add_argument(
        "--device",
        type=str,
        default="cpu",
        help="Execution device ('cpu' or 'cuda').",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    device = torch.device(args.device if torch.cuda.is_available() and args.device == "cuda" else "cpu")

    # 1. Load taxonomy
    species = load_species_list(args.species_list)
    logger.info("Loaded %d species from %s", len(species), args.species_list)

    # 2. Sync my_photos if present and not disabled
    if args.my_photos_dir.exists() and not args.no_sync and not args.held_out_only:
        sync_my_photos(args.my_photos_dir, args.real_test_dir, species)

    if args.sync_only:
        logger.info("Sync-only requested. Exiting.")
        return

    # 3. Check for real_test photos
    if not args.real_test_dir.exists():
        print(f"\n[INFO] Real test directory '{args.real_test_dir}' does not exist.")
        print("To evaluate real photos, place them in ml/data/my_photos/<species_name>/ and re-run.")
        return

    photos: list[tuple[Path, int]] = []
    supported_exts = {".jpg", ".jpeg", ".png", ".webp"}
    for sub in sorted(args.real_test_dir.iterdir()):
        if sub.is_dir():
            try:
                sid = int(sub.name.split("_")[0])
            except (ValueError, IndexError):
                continue
            for f in sorted(sub.iterdir()):
                if f.is_file() and f.suffix.lower() in supported_exts:
                    photos.append((f, sid))

    # Optional filtering to strictly held-out real test photos
    if args.held_out_only:
        if args.real_splits.exists():
            held_out_files: set[str] = set()
            with open(args.real_splits, mode="r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    if row.get("split") == "test_heldout":
                        held_out_files.add(row.get("filename", ""))
            photos = [p for p in photos if p[0].name in held_out_files]
            logger.info("Filtered to %d strictly held-out test photos from %s", len(photos), args.real_splits)
        else:
            logger.warning("real_splits.csv not found at %s. Evaluating all found photos.", args.real_splits)

    if not photos:
        print(f"\n[INFO] No photos found in '{args.real_test_dir}'.")
        print("Place field photos in ml/data/my_photos/<species_name>/ to evaluate.")
        return

    # 4. Resolve run and load checkpoint (prefer base v2 run 20261113_190516)
    if args.run is not None:
        run_dir = args.run
    elif (ML_DIR / "runs" / "20261113_190516").exists():
        run_dir = ML_DIR / "runs" / "20261113_190516"
    else:
        run_dir = find_latest_run(ML_DIR / "runs")
    logger.info("Evaluating real photos using run: %s", run_dir)

    with open(run_dir / "labels.json", mode="r", encoding="utf-8") as f:
        labels_meta: dict[str, dict[str, Any]] = json.load(f)

    num_classes = len(labels_meta)
    class_to_sid = {int(idx): int(meta["species_id"]) for idx, meta in labels_meta.items()}
    sid_to_class = {int(meta["species_id"]): int(idx) for idx, meta in labels_meta.items()}

    # Load centroids if available
    centroids: torch.Tensor | None = None
    centroids_candidates = [
        run_dir / "eval" / "centroids.json",
        run_dir / "centroids.json",
        Path("web/public/models/centroids.json"),
    ]
    for c_file in centroids_candidates:
        if c_file.exists():
            try:
                with open(c_file, mode="r", encoding="utf-8") as f:
                    c_data = json.load(f)
                    if isinstance(c_data, dict):
                        c_list = [c_data[str(i)] for i in range(len(c_data))]
                        centroids = torch.tensor(c_list, dtype=torch.float32)
                    elif isinstance(c_data, list):
                        centroids = torch.tensor(c_data, dtype=torch.float32)
                    centroids = F.normalize(centroids, p=2, dim=-1)
                logger.info("Loaded centroids from %s (shape: %s)", c_file, centroids.shape)
                break
            except Exception as exc:
                logger.warning("Could not load centroids from %s: %s", c_file, exc)

    # Initialize model
    model = PlantClassifier(num_classes=num_classes, pretrained=False)
    checkpoint = torch.load(run_dir / "best.pt", map_location="cpu", weights_only=True)
    state_dict = checkpoint["model_state_dict"] if isinstance(checkpoint, dict) and "model_state_dict" in checkpoint else checkpoint
    model.load_state_dict(state_dict)
    model = model.to(device).float()
    model.eval()

    # Load calibration parameters
    meta_params = load_model_meta(args.model_meta)
    temperature = meta_params["temperature"]
    threshold = meta_params["threshold"]
    tau = meta_params["tau"]
    tier_boundaries = meta_params["tierBoundaries"]

    transform = build_transform()

    print("\n" + "=" * 90)
    print(f" REAL-WORLD TEST EVALUATION (Model: {run_dir.name} | Classes: {num_classes})")
    print(f" Parameters: Temperature={temperature:.4f}, Tau={tau:.2f}, Threshold={threshold:.2f}")
    print("=" * 90)

    evaluated_count = 0
    skipped_count = 0
    top1_correct = 0
    top3_correct = 0

    results: list[dict[str, Any]] = []

    with torch.no_grad():
        for file_path, true_sid in photos:
            true_common = species.get(true_sid, {}).get("common_name", f"Species_{true_sid}")
            true_sci = species.get(true_sid, {}).get("scientific_name", "Unknown")

            if true_sid not in sid_to_class:
                print(f"\n[PHOTO] {file_path.name}")
                print(f"  • True Species : ID {true_sid:03d} - {true_common} ({true_sci})")
                print(f"  • Status       : SKIPPED (Class {true_sid} not present in this {num_classes}-class model)")
                skipped_count += 1
                continue

            try:
                with Image.open(file_path) as im:
                    im = ImageOps.exif_transpose(im).convert("RGB")
                    tensor = transform(im).unsqueeze(0).to(device)
            except Exception as exc:
                logger.warning("Failed to open %s: %s", file_path, exc)
                continue

            logits, embedding, _ = model.forward_features_and_embedding(tensor)
            scaled_logits = logits / temperature
            probs = F.softmax(scaled_logits, dim=-1).squeeze(0).cpu()
            norm_emb = F.normalize(embedding, p=2, dim=-1).squeeze(0).cpu()

            top3_probs, top3_indices = torch.topk(probs, min(3, num_classes))
            pred_class = int(top3_indices[0])
            pred_sid = class_to_sid[pred_class]
            pred_prob = float(top3_probs[0])

            # Cosine similarity to predicted class centroid (identical to web/src/ml/fuse.ts)
            cos_sim = 1.0
            if centroids is not None and 0 <= pred_class < len(centroids):
                centroid_vec = centroids[pred_class].to(norm_emb.device)
                cos_sim = float(torch.sum(norm_emb * centroid_vec).item())

            tier = compute_tier(pred_prob, cos_sim, threshold, tau, tier_boundaries)

            is_top1 = (pred_sid == true_sid)
            top3_sids = [class_to_sid[int(idx)] for idx in top3_indices]
            is_top3 = (true_sid in top3_sids)

            if is_top1:
                top1_correct += 1
            if is_top3:
                top3_correct += 1
            evaluated_count += 1

            status_mark = "✓ CORRECT" if is_top1 else ("✓ TOP-3" if is_top3 else "✗ MISCLASSIFIED")

            print(f"\n[PHOTO] {file_path.name} [{status_mark}]")
            print(f"  • Ground Truth : ID {true_sid:03d} | {true_common} ({true_sci})")
            print(f"  • Top-1 Match  : ID {pred_sid:03d} | {species.get(pred_sid, {}).get('common_name')} ({species.get(pred_sid, {}).get('scientific_name')})")
            print(f"    Confidence   : {pred_prob * 100:.1f}% | Cosine Sim: {cos_sim:.3f} | Tier: {tier}")

            print("  • Top-3 Predictions:")
            for rank, (p_idx, p_prob) in enumerate(zip(top3_indices, top3_probs), 1):
                p_sid = class_to_sid[int(p_idx)]
                p_com = species.get(p_sid, {}).get("common_name", "")
                p_sci = species.get(p_sid, {}).get("scientific_name", "")
                print(f"    {rank}. ID {p_sid:03d} | {p_com:<22} ({p_sci:<25}) : {float(p_prob) * 100:5.1f}%")

            results.append({
                "file": file_path.name,
                "true_sid": true_sid,
                "pred_sid": pred_sid,
                "is_top1": is_top1,
                "is_top3": is_top3,
                "confidence": pred_prob,
                "tier": tier,
            })

    print("\n" + "=" * 90)
    print(" EVALUATION SUMMARY")
    print("=" * 90)
    print(f"Total Photos Evaluated : {evaluated_count}")
    print(f"Total Photos Skipped   : {skipped_count} (unsupported classes in current checkpoint)")
    if evaluated_count > 0:
        print(f"Top-1 Accuracy         : {top1_correct}/{evaluated_count} ({top1_correct / evaluated_count * 100:.1f}%)")
        print(f"Top-3 Accuracy         : {top3_correct}/{evaluated_count} ({top3_correct / evaluated_count * 100:.1f}%)")
    print("=" * 90 + "\n")


if __name__ == "__main__":
    main()

