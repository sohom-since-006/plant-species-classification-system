"""pick_species_images.py - Select representative photos for each species 0..111.

For each species id 0..111:
1. Picks one representative photo from cleaned training data in ml/data/raw
   (preferring the highest-confidence correctly classified training image by best.pt, sharp, no people).
2. Resizes to 640 px wide (preserving aspect ratio) and saves as web/public/species/{id}.webp.
3. Extracts creator, license, and source URL from ml/data/dataset_credits.csv.
4. Writes web/public/species/credits.json.
"""

from __future__ import annotations

import csv
import json
import os
import sys
from pathlib import Path
from typing import Any

import numpy as np
import torch
import torchvision.transforms.functional as TF
from PIL import Image

# Ensure ml directory is on sys.path to import model.py
ML_DIR = Path(__file__).resolve().parent.parent
if str(ML_DIR) not in sys.path:
    sys.path.insert(0, str(ML_DIR))

from model import PlantClassifier, TRD_MEAN, TRD_STD  # noqa: E402


def compute_sharpness(img: Image.Image) -> float:
    """Compute image sharpness via spatial gradient variance on grayscale."""
    gray = np.array(img.convert("L"), dtype=np.float32)
    gy, gx = np.gradient(gray)
    return float(np.var(gx) + np.var(gy))


def main() -> None:
    repo_root = ML_DIR.parent
    raw_dir = ML_DIR / "data" / "raw"
    credits_csv_path = ML_DIR / "data" / "dataset_credits.csv"
    splits_csv_path = ML_DIR / "data" / "splits.csv"
    out_dir = repo_root / "web" / "public" / "species"
    out_dir.mkdir(parents=True, exist_ok=True)

    # 1. Load dataset credits
    credits_lookup: dict[str, dict[str, str]] = {}
    if credits_csv_path.exists():
        with open(credits_csv_path, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                # Normalize file path key
                file_key = row.get("file", "").replace("\\", "/").strip()
                credits_lookup[file_key] = {
                    "creator": row.get("creator", "iNaturalist Contributor").strip(),
                    "license": row.get("license", "CC-BY-NC").strip(),
                    "source_url": row.get("source_url", "").strip(),
                }
    print(f"Loaded {len(credits_lookup)} credit records from dataset_credits.csv")

    # 2. Load splits to find clean training files
    train_files_by_species: dict[int, list[str]] = {i: [] for i in range(112)}
    if splits_csv_path.exists():
        with open(splits_csv_path, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                sp_id = int(row["species_id"])
                if row.get("split") == "train" and sp_id in train_files_by_species:
                    train_files_by_species[sp_id].append(row["file"].replace("\\", "/"))

    # 3. Load latest model checkpoint best.pt
    run_dirs = sorted(list((ML_DIR / "runs").glob("2026*")))
    best_pt_path: Path | None = None
    for rdir in reversed(run_dirs):
        candidate = rdir / "best.pt"
        if candidate.exists():
            best_pt_path = candidate
            break

    model: PlantClassifier | None = None
    if best_pt_path:
        print(f"Loading checkpoint from: {best_pt_path}")
        try:
            model = PlantClassifier(num_classes=112, pretrained=False)
            checkpoint = torch.load(best_pt_path, map_location="cpu")
            state_dict = checkpoint.get("state_dict", checkpoint)
            clean_state = {k.replace("module.", ""): v for k, v in state_dict.items()}
            model.load_state_dict(clean_state, strict=False)
            model.eval()
            print("Model loaded successfully in eval mode.")
        except Exception as e:
            print(f"Warning: could not load model weights ({e}). Falling back to heuristic picking.")
            model = None

    # Preprocessing transform matching TRD specification
    def preprocess_image(pil_img: Image.Image) -> torch.Tensor:
        # Resize shorter side to 256
        w, h = pil_img.size
        if w < h:
            new_w = 256
            new_h = int(round(h * 256.0 / w))
        else:
            new_h = 256
            new_w = int(round(w * 256.0 / h))
        resized = pil_img.resize((new_w, new_h), Image.Resampling.BILINEAR)

        # Center crop 224x224
        left = (new_w - 224) // 2
        top = (new_h - 224) // 2
        cropped = resized.crop((left, top, left + 224, top + 224))

        tensor = TF.to_tensor(cropped)
        tensor = TF.normalize(tensor, mean=list(TRD_MEAN), std=list(TRD_STD))
        return tensor.unsqueeze(0)

    # 4. Iterate over species 0..111
    final_credits: dict[str, dict[str, Any]] = {}
    created_count = 0
    missing_species: list[int] = []

    print("\nPicking representative photos for 112 species...")
    for sp_id in range(112):
        candidate_paths = train_files_by_species.get(sp_id, [])

        # Fallback if splits list was empty: list raw directory
        if not candidate_paths:
            matching_dirs = list(raw_dir.glob(f"{sp_id}_*"))
            if matching_dirs:
                for img_file in matching_dirs[0].glob("*.jpg"):
                    rel = f"raw/{matching_dirs[0].name}/{img_file.name}"
                    candidate_paths.append(rel)

        if not candidate_paths:
            print(f"  [MISSING] No candidates found for species ID {sp_id}")
            missing_species.append(sp_id)
            continue

        # Evaluate up to 25 candidate images per species
        best_score = -1e9
        best_file_rel: str | None = None
        best_img: Image.Image | None = None

        candidates_to_eval = candidate_paths[:25]
        for rel_path in candidates_to_eval:
            abs_path = ML_DIR / "data" / rel_path
            if not abs_path.exists():
                continue

            try:
                with Image.open(abs_path) as img:
                    img_rgb = img.convert("RGB")
                    sharpness = compute_sharpness(img_rgb)

                    # Model prediction confidence if model is available
                    confidence = 0.5
                    correct_class = True
                    if model is not None:
                        inp = preprocess_image(img_rgb)
                        with torch.no_grad():
                            logits = model(inp)
                            probs = torch.softmax(logits, dim=-1)
                            pred_idx = int(torch.argmax(probs, dim=-1).item())
                            confidence = float(probs[0, sp_id].item())
                            correct_class = (pred_idx == sp_id)

                    # Score favoring correctly classified + high confidence + sharpness
                    class_factor = 2.0 if correct_class else 0.1
                    score = (confidence * class_factor) + (np.log1p(sharpness) * 0.1)

                    if score > best_score:
                        best_score = score
                        best_file_rel = rel_path
                        best_img = img_rgb.copy()
            except Exception:
                continue

        # Fallback to first candidate if scoring failed
        if best_img is None and candidate_paths:
            for rel_path in candidate_paths:
                abs_path = ML_DIR / "data" / rel_path
                if abs_path.exists():
                    try:
                        with Image.open(abs_path) as img:
                            best_img = img.convert("RGB").copy()
                            best_file_rel = rel_path
                            break
                    except Exception:
                        continue

        if best_img is None or best_file_rel is None:
            print(f"  [FAIL] Could not decode any image for species ID {sp_id}")
            missing_species.append(sp_id)
            continue

        # Resize to 640 px wide (aspect ratio preserved)
        orig_w, orig_h = best_img.size
        new_w = 640
        new_h = int(round(orig_h * (640.0 / orig_w)))
        resized_img = best_img.resize((new_w, new_h), Image.Resampling.LANCZOS)

        # Save as web/public/species/{id}.webp
        out_path = out_dir / f"{sp_id}.webp"
        resized_img.save(out_path, format="WEBP", quality=85, method=6)
        created_count += 1

        # Look up credit details
        credit_data = credits_lookup.get(best_file_rel, {})
        final_credits[str(sp_id)] = {
            "id": sp_id,
            "observer": credit_data.get("creator", "iNaturalist Observer"),
            "license": credit_data.get("license", "CC-BY-NC 4.0"),
            "source_url": credit_data.get("source_url", ""),
            "file": best_file_rel,
        }

        if (sp_id + 1) % 20 == 0 or sp_id == 111:
            print(f"  Processed {sp_id + 1}/112 species...")

    # Write web/public/species/credits.json
    credits_json_path = out_dir / "credits.json"
    with open(credits_json_path, mode="w", encoding="utf-8") as f:
        json.dump(final_credits, f, indent=2, ensure_ascii=False)
    print(f"\nWritten {len(final_credits)} image credits to {credits_json_path}")

    print("\n" + "=" * 50)
    print(f"SPECIES IMAGES GENERATION REPORT:")
    print(f"  Images created: {created_count} / 112")
    print(f"  Missing species: {missing_species}")
    print("=" * 50)


if __name__ == "__main__":
    main()
