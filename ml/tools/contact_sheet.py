"""contact_sheet.py - Generate botanical image contact sheets for visual inspection.

For each species folder in ml/data/raw/, builds a single JPEG contact sheet grid
of 24 randomly sampled thumbnails (seed 42), with species name and image count as
a title banner, saving to ml/data/contact_sheets/<id>_<slug>.jpg.
"""

from __future__ import annotations

import argparse
import csv
import logging
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps
from tqdm import tqdm

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("contact_sheet")

GRID_COLS = 6
GRID_ROWS = 4
MAX_THUMBNAILS = GRID_COLS * GRID_ROWS  # 24
THUMB_SIZE = 200
PADDING = 8
MARGIN = 12
HEADER_HEIGHT = 64


def load_species_meta(species_list_path: Path) -> dict[int, dict[str, str]]:
    """Load metadata mapping species id -> {common_name, scientific_name}."""
    meta: dict[int, dict[str, str]] = {}
    if not species_list_path.exists():
        logger.warning(
            "Species list not found at %s. Names will be parsed from directory slugs.",
            species_list_path,
        )
        return meta

    with open(species_list_path, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                sid = int(row["id"])
                meta[sid] = {
                    "common_name": row.get("common_name", ""),
                    "scientific_name": row.get("scientific_name", ""),
                }
            except (ValueError, KeyError):
                continue
    return meta


def parse_species_filter(filter_str: str | None) -> set[int] | None:
    """Parse a string like '0,1,2' or '0-5' into a set of integer IDs."""
    if not filter_str:
        return None
    ids: set[int] = set()
    for token in filter_str.split(","):
        token = token.strip()
        if not token:
            continue
        if "-" in token:
            start_str, end_str = token.split("-", 1)
            start, end = int(start_str.strip()), int(end_str.strip())
            ids.update(range(start, end + 1))
        else:
            ids.add(int(token))
    return ids


def build_contact_sheet(
    species_id: int,
    species_dir: Path,
    out_file: Path,
    common_name: str,
    scientific_name: str,
    seed: int = 42,
) -> bool:
    """Generate a 6x4 thumbnail contact sheet for a species directory."""
    image_paths = sorted(species_dir.glob("*.jpg")) + sorted(species_dir.glob("*.jpeg"))
    total_images = len(image_paths)

    if total_images == 0:
        logger.warning(
            "No images found for species %s in %s. Skipping.",
            species_dir.name,
            species_dir,
        )
        return False

    rng = random.Random(seed)
    sample_count = min(total_images, MAX_THUMBNAILS)
    sampled_paths = rng.sample(image_paths, sample_count)

    # Calculate dimensions
    grid_w = (GRID_COLS * THUMB_SIZE) + ((GRID_COLS - 1) * PADDING) + (2 * MARGIN)
    grid_h = (
        HEADER_HEIGHT
        + (GRID_ROWS * THUMB_SIZE)
        + ((GRID_ROWS - 1) * PADDING)
        + (2 * MARGIN)
    )

    # Base canvas (dark forest slate)
    sheet = Image.new("RGB", (grid_w, grid_h), color=(14, 22, 18))
    draw = ImageDraw.Draw(sheet)

    # Draw header banner
    draw.rectangle([(0, 0), (grid_w, HEADER_HEIGHT)], fill=(20, 32, 26))

    # Font handling
    font_large: ImageFont.ImageFont | ImageFont.FreeTypeFont
    font_small: ImageFont.ImageFont | ImageFont.FreeTypeFont
    try:
        font_large = ImageFont.load_default(size=20)
        font_small = ImageFont.load_default(size=14)
    except TypeError:
        font_large = ImageFont.load_default()
        font_small = ImageFont.load_default()

    title_text = f"[{species_id:03d}] {common_name} ({scientific_name})"
    count_text = (
        f"Total: {total_images} images | Showing {sample_count} sample thumbnails"
    )

    draw.text((MARGIN, 12), title_text, fill=(235, 245, 240), font=font_large)
    draw.text((MARGIN, 38), count_text, fill=(140, 180, 160), font=font_small)

    # Place thumbnails
    for idx, img_path in enumerate(sampled_paths):
        row = idx // GRID_COLS
        col = idx % GRID_COLS

        x = MARGIN + col * (THUMB_SIZE + PADDING)
        y = HEADER_HEIGHT + MARGIN + row * (THUMB_SIZE + PADDING)

        try:
            with Image.open(img_path) as img:
                thumb = ImageOps.fit(
                    img.convert("RGB"),
                    (THUMB_SIZE, THUMB_SIZE),
                    Image.Resampling.LANCZOS,
                )
                sheet.paste(thumb, (x, y))
        except (OSError, SyntaxError) as exc:
            logger.debug("Failed to render thumbnail %s: %s", img_path.name, exc)
            # Fill with subtle placeholder box
            draw.rectangle(
                [(x, y), (x + THUMB_SIZE, y + THUMB_SIZE)],
                fill=(30, 40, 35),
                outline=(50, 70, 60),
            )

    out_file.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out_file, "JPEG", quality=92, optimize=True)
    return True


def parse_args() -> argparse.Namespace:
    """Parse CLI arguments for contact sheet generator."""
    parser = argparse.ArgumentParser(
        description="Build visual inspection contact sheet grids from raw botanical images."
    )
    parser.add_argument(
        "--species-ids",
        type=str,
        default=None,
        help="Comma-separated species IDs or ranges to process (e.g. '0,1,2' or '0-5').",
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=Path("ml/data/contact_sheets"),
        help="Output directory for contact sheets (default ml/data/contact_sheets).",
    )
    parser.add_argument(
        "--raw-dir",
        type=Path,
        default=Path("ml/data/raw"),
        help="Directory containing species raw image subfolders (default ml/data/raw).",
    )
    parser.add_argument(
        "--species-list",
        type=Path,
        default=Path("ml/species_list.csv"),
        help="Path to species list CSV (default ml/species_list.csv).",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=42,
        help="Random seed for sampling thumbnails (default 42).",
    )
    return parser.parse_args()


def main() -> None:
    """Run contact sheet generation."""
    args = parse_args()
    raw_dir: Path = args.raw_dir
    out_dir: Path = args.out

    if not raw_dir.exists():
        logger.error("Raw directory %s does not exist. Nothing to process.", raw_dir)
        return

    filter_ids = parse_species_filter(args.species_ids)
    species_meta = load_species_meta(args.species_list)

    # Collect all species directories in raw_dir
    folder_paths = sorted([p for p in raw_dir.iterdir() if p.is_dir()])
    logger.info("Found %d species folders in %s", len(folder_paths), raw_dir)

    processed_count = 0
    for folder in tqdm(folder_paths, desc="Contact Sheets", unit="sheet"):
        slug = folder.name
        # Parse ID from leading number in folder name
        prefix = slug.split("_", 1)[0]
        try:
            sid = int(prefix)
        except ValueError:
            sid = -1

        if filter_ids is not None and sid not in filter_ids:
            continue

        meta = species_meta.get(sid, {})
        common_name = meta.get("common_name") or slug
        scientific_name = meta.get("scientific_name") or slug

        out_file = out_dir / f"{slug}.jpg"
        success = build_contact_sheet(
            species_id=sid,
            species_dir=folder,
            out_file=out_file,
            common_name=common_name,
            scientific_name=scientific_name,
            seed=args.seed,
        )
        if success:
            processed_count += 1

    logger.info(
        "Successfully generated %d contact sheets in %s", processed_count, out_dir
    )


if __name__ == "__main__":
    main()
