"""01_download_images.py - Download and prepare botanical training images.

Fetches research-grade, openly licensed plant images (CC0, CC-BY, CC-BY-NC) from
GBIF (iNaturalist Research-grade Observations dataset) for species listed in
ml/species_list.csv. Resizes images so the longer side is at most 512 px, saves
them to ml/data/raw/<id>_<slug>/<n>.jpg, and writes provenance credits to
ml/data/dataset_credits.csv.
"""

from __future__ import annotations

import argparse
import csv
import io
import logging
import random
import re
import shutil
import time
from pathlib import Path
from typing import Any

import requests
from PIL import Image, UnidentifiedImageError
from tqdm import tqdm

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("download_images")

USER_AGENT = (
    "PlantSpeciesClassifierBot/1.0 (academic botanical research; contact: none)"
)
GBIF_API_BASE = "https://api.gbif.org/v1"
MIN_FREE_DISK_GB = 15.0
DEFAULT_TARGET_PER_SPECIES = 300
MAX_PER_SPECIES = 400


def check_disk_space(target_path: Path, min_gb: float = MIN_FREE_DISK_GB) -> bool:
    """Check available disk space for target path and warn if below threshold."""
    check_dir = target_path if target_path.exists() else target_path.parent
    try:
        usage = shutil.disk_usage(check_dir)
        free_gb = usage.free / (1024**3)
        if free_gb < min_gb:
            logger.warning(
                "Disk space warning: Only %.2f GB free on %s (recommended >= %.1f GB).",
                free_gb,
                check_dir.resolve(),
                min_gb,
            )
            return False
        logger.info("Free disk space on %s: %.2f GB", check_dir.resolve(), free_gb)
        return True
    except OSError as exc:
        logger.warning("Could not determine free disk space: %s", exc)
        return True


def make_slug(name: str) -> str:
    """Generate a filesystem-friendly lowercase slug from a botanical name."""
    cleaned = re.sub(r"[^a-zA-Z0-9]+", "_", name.strip())
    return cleaned.strip("_").lower()


def normalize_license(raw: str | None) -> str | None:
    """Normalize and validate license strings.

    Permits only CC0, CC-BY, and CC-BY-NC. Rejects ShareAlike (-SA),
    NoDerivatives (-ND), and all other non-approved licenses.
    """
    if not raw:
        return None
    lic = raw.strip().lower()

    # Reject any license with share-alike or no-derivatives
    if any(
        bad in lic
        for bad in [
            "-sa",
            "/sa",
            "_sa",
            "sharealike",
            "-nd",
            "/nd",
            "_nd",
            "noderiv",
        ]
    ):
        return None

    if "publicdomain/zero" in lic or "cc0" in lic:
        return "CC0"
    if "by-nc" in lic or "by_nc" in lic or "/by-nc/" in lic:
        return "CC-BY-NC"
    if "/by/" in lic or "cc-by" in lic or "cc_by" in lic:
        return "CC-BY"

    return None


def get_inaturalist_dataset_key(session: requests.Session) -> str:
    """Query GBIF dataset API to find the iNaturalist Research-grade Observations dataset key."""
    url = f"{GBIF_API_BASE}/dataset"
    params = {"q": "iNaturalist Research-grade Observations"}

    for attempt in range(3):
        try:
            resp = session.get(url, params=params, timeout=15)
            resp.raise_for_status()
            data = resp.json()
            for result in data.get("results", []):
                title = result.get("title", "")
                if "iNaturalist" in title and "Research-grade" in title:
                    dataset_key = result.get("key")
                    logger.info("Resolved dataset '%s' -> key: %s", title, dataset_key)
                    return str(dataset_key)
            break
        except requests.RequestException as exc:
            delay = 2**attempt
            logger.warning(
                "Dataset query attempt %d failed: %s. Retrying in %ds...",
                attempt + 1,
                exc,
                delay,
            )
            time.sleep(delay)

    fallback_key = "50c9509d-22c7-4a22-a47d-8c48425ef4a7"
    logger.warning("Using verified fallback dataset key: %s", fallback_key)
    return fallback_key


def resolve_species_taxon(
    session: requests.Session, scientific_name: str
) -> tuple[int | None, str]:
    """Resolve a scientific name against the GBIF species match API.

    Returns the GBIF usageKey and accepted name. Emits warnings if the
    match is fuzzy, higher-rank, or a synonym.
    """
    url = f"{GBIF_API_BASE}/species/match"
    params = {"name": scientific_name, "strict": "true"}

    for attempt in range(3):
        try:
            resp = session.get(url, params=params, timeout=15)
            resp.raise_for_status()
            data = resp.json()

            match_type = data.get("matchType")
            status = data.get("status")
            matched_name = data.get("scientificName", "")
            usage_key = data.get("usageKey")

            if match_type != "EXACT":
                logger.warning(
                    "GBIF match for '%s' is not EXACT (type: %s, matched: '%s').",
                    scientific_name,
                    match_type,
                    matched_name,
                )
            if status != "ACCEPTED":
                logger.warning(
                    "GBIF taxon status for '%s' is not ACCEPTED (status: %s, acceptedKey: %s).",
                    scientific_name,
                    status,
                    data.get("acceptedUsageKey"),
                )

            return usage_key, matched_name
        except requests.RequestException as exc:
            delay = 2**attempt
            logger.warning(
                "Species match attempt %d failed for '%s': %s. Retrying in %ds...",
                attempt + 1,
                scientific_name,
                exc,
                delay,
            )
            time.sleep(delay)

    return None, scientific_name


def load_species_list(csv_path: Path) -> list[dict[str, str]]:
    """Load species list from CSV into a list of row dictionaries."""
    if not csv_path.exists():
        raise FileNotFoundError(f"Species list CSV not found at {csv_path}")

    with open(csv_path, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        return list(reader)


def load_existing_credits(
    credits_path: Path,
) -> tuple[set[str], set[tuple[int, int]], dict[int, int]]:
    """Load existing credits to ensure idempotency and avoid duplicates.

    Returns:
        downloaded_urls: set of source_url strings
        downloaded_occurrences: set of (species_id, occurrence_key)
        counts_by_species: dict mapping species_id -> downloaded image count
    """
    downloaded_urls: set[str] = set()
    downloaded_occurrences: set[tuple[int, int]] = set()
    counts_by_species: dict[int, int] = {}

    if not credits_path.exists():
        return downloaded_urls, downloaded_occurrences, counts_by_species

    with open(credits_path, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                sid = int(row.get("species_id", -1))
                occ_key = int(row.get("occurrence_key", -1))
                url = row.get("source_url", "").strip()
                if url:
                    downloaded_urls.add(url)
                if sid >= 0 and occ_key >= 0:
                    downloaded_occurrences.add((sid, occ_key))
                if sid >= 0:
                    counts_by_species[sid] = counts_by_species.get(sid, 0) + 1
            except (ValueError, TypeError):
                continue

    return downloaded_urls, downloaded_occurrences, counts_by_species


def download_and_save_image(
    session: requests.Session,
    image_url: str,
    dest_path: Path,
    max_dim: int = 512,
) -> bool:
    """Download an image, verify with Pillow, resize max side to 512px, and save as RGB JPEG."""
    # Attempt optimized variant if URL is from iNaturalist S3 original
    urls_to_try = [image_url]
    if "inaturalist-open-data.s3.amazonaws.com" in image_url and image_url.endswith(
        "/original.jpg"
    ):
        large_url = image_url.rsplit("/original.jpg", 1)[0] + "/large.jpg"
        urls_to_try.insert(0, large_url)

    content: bytes | None = None
    for attempt_url in urls_to_try:
        for attempt in range(3):
            try:
                resp = session.get(attempt_url, timeout=20)
                if resp.status_code == 200 and resp.content:
                    content = resp.content
                    break
                if resp.status_code == 404:
                    break
            except requests.RequestException:
                delay = 2**attempt
                time.sleep(delay)
        if content:
            break

    if not content:
        return False

    try:
        with Image.open(io.BytesIO(content)) as raw_img:
            # Force decode and verify integrity
            raw_img.load()
            rgb_img = raw_img.convert("RGB")

        # Resize preserving aspect ratio so longer side is at most 512 px
        rgb_img.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)

        dest_path.parent.mkdir(parents=True, exist_ok=True)
        rgb_img.save(dest_path, "JPEG", quality=90, optimize=True)
        return True
    except (OSError, SyntaxError, UnidentifiedImageError) as exc:
        logger.debug("Failed to decode/save image from %s: %s", image_url, exc)
        return False


def parse_args() -> argparse.Namespace:
    """Parse CLI arguments."""
    parser = argparse.ArgumentParser(
        description="Download botanical training images from GBIF/iNaturalist."
    )
    parser.add_argument(
        "--species-ids",
        type=str,
        default=None,
        help="Comma-separated species IDs or ranges to process (e.g. '0,1,2' or '0-5').",
    )
    parser.add_argument(
        "--limit-species",
        type=int,
        default=None,
        help="Limit number of species to process.",
    )
    parser.add_argument(
        "--per-species",
        type=int,
        default=DEFAULT_TARGET_PER_SPECIES,
        help=f"Target number of images per species (default {DEFAULT_TARGET_PER_SPECIES}, max {MAX_PER_SPECIES}).",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Query GBIF and report availability without downloading files.",
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=Path("ml/data"),
        help="Base directory for output data (default ml/data).",
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
        help="Random seed for reproducibility (default 42).",
    )
    return parser.parse_args()


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


def main() -> None:
    """Run GBIF botanical image download pipeline."""
    args = parse_args()
    random.seed(args.seed)

    target_per_species = min(max(args.per_species, 1), MAX_PER_SPECIES)
    out_dir: Path = args.out
    raw_dir = out_dir / "raw"
    credits_file = out_dir / "dataset_credits.csv"

    # Pre-flight disk space check
    check_disk_space(out_dir, min_gb=MIN_FREE_DISK_GB)

    # Load species list
    all_species = load_species_list(args.species_list)
    logger.info("Loaded %d species from %s", len(all_species), args.species_list)

    # Filter species
    filter_ids = parse_species_filter(args.species_ids)
    selected_species: list[dict[str, str]] = []
    for sp in all_species:
        sid = int(sp["id"])
        if filter_ids is not None and sid not in filter_ids:
            continue
        selected_species.append(sp)

    if args.limit_species is not None:
        selected_species = selected_species[: args.limit_species]

    logger.info(
        "Selected %d species to process (target per species: %d)",
        len(selected_species),
        target_per_species,
    )

    # Setup session
    session = requests.Session()
    session.headers.update({"User-Agent": USER_AGENT})

    # Resolve iNaturalist dataset key
    dataset_key = get_inaturalist_dataset_key(session)

    # Load existing credits for idempotency
    downloaded_urls, downloaded_occurrences, counts_by_species = load_existing_credits(
        credits_file
    )

    if not args.dry_run:
        raw_dir.mkdir(parents=True, exist_ok=True)
        if not credits_file.exists():
            credits_file.parent.mkdir(parents=True, exist_ok=True)
            with open(credits_file, mode="w", newline="", encoding="utf-8") as f:
                writer = csv.writer(f)
                writer.writerow(
                    [
                        "species_id",
                        "file",
                        "occurrence_key",
                        "creator",
                        "license",
                        "source_url",
                    ]
                )

    # Track final counts
    final_counts: dict[int, int] = {}
    total_newly_downloaded = 0

    species_pbar = tqdm(selected_species, desc="Overall Species", unit="sp")
    for sp in species_pbar:
        sid = int(sp["id"])
        common_name = sp["common_name"]
        sci_name = sp["scientific_name"]
        slug = f"{sid}_{make_slug(sci_name)}"
        species_dir = raw_dir / slug

        species_pbar.set_postfix_str(f"{common_name} ({sci_name})")

        # Determine existing downloaded images for this species
        existing_images: list[Path] = []
        if species_dir.exists():
            existing_images = sorted(
                species_dir.glob("*.jpg"),
                key=lambda p: int(p.stem) if p.stem.isdigit() else 999999,
            )

        current_count = max(len(existing_images), counts_by_species.get(sid, 0))
        final_counts[sid] = current_count

        if current_count >= target_per_species:
            continue

        # Resolve taxonKey in GBIF
        taxon_key, _ = resolve_species_taxon(session, sci_name)
        if not taxon_key:
            logger.error("Could not resolve taxonKey for '%s'. Skipping.", sci_name)
            continue

        # Page through occurrences
        next_file_idx = len(existing_images) + 1
        offset = 0
        page_size = 100
        species_done = False

        sp_download_bar = tqdm(
            total=target_per_species,
            initial=current_count,
            desc=f"sp {sid:03d} {sci_name[:18]}",
            unit="img",
            leave=False,
        )

        while not species_done and current_count < target_per_species:
            search_url = f"{GBIF_API_BASE}/occurrence/search"
            params = {
                "datasetKey": dataset_key,
                "taxonKey": taxon_key,
                "mediaType": "StillImage",
                "occurrenceStatus": "PRESENT",
                "limit": page_size,
                "offset": offset,
            }

            results: list[dict[str, Any]] = []
            for attempt in range(3):
                try:
                    time.sleep(0.12)  # Polite pacing between API requests
                    resp = session.get(search_url, params=params, timeout=15)
                    resp.raise_for_status()
                    data = resp.json()
                    results = data.get("results", [])
                    end_of_records = data.get("endOfRecords", False)
                    break
                except requests.RequestException:
                    delay = 2**attempt
                    time.sleep(delay)
                    end_of_records = False

            if not results:
                break

            for occ in results:
                if current_count >= target_per_species:
                    species_done = True
                    break

                occ_key = occ.get("key")
                if not occ_key:
                    continue

                occ_license = occ.get("license")
                media_list = occ.get("media", [])

                for media_item in media_list:
                    if current_count >= target_per_species:
                        species_done = True
                        break

                    # Check media type
                    m_type = media_item.get("type", "")
                    m_format = media_item.get("format", "")
                    if m_type != "StillImage" and not m_format.startswith("image/"):
                        continue

                    # Validate license (media item license overrides occurrence license)
                    raw_lic = media_item.get("license") or occ_license
                    norm_lic = normalize_license(raw_lic)
                    if not norm_lic:
                        continue  # Skip unapproved licenses

                    image_url = media_item.get("identifier")
                    if not image_url or image_url in downloaded_urls:
                        continue

                    creator = (
                        media_item.get("creator")
                        or media_item.get("rightsHolder")
                        or occ.get("recordedBy")
                        or "Unknown"
                    )

                    if args.dry_run:
                        current_count += 1
                        sp_download_bar.update(1)
                        downloaded_urls.add(image_url)
                        continue

                    dest_file = species_dir / f"{next_file_idx}.jpg"
                    rel_file_path = f"raw/{slug}/{next_file_idx}.jpg"

                    success = download_and_save_image(
                        session=session,
                        image_url=image_url,
                        dest_path=dest_file,
                        max_dim=512,
                    )

                    if success:
                        current_count += 1
                        next_file_idx += 1
                        total_newly_downloaded += 1
                        sp_download_bar.update(1)
                        downloaded_urls.add(image_url)
                        downloaded_occurrences.add((sid, occ_key))

                        # Log credit to CSV immediately
                        with open(
                            credits_file, mode="a", newline="", encoding="utf-8"
                        ) as cf:
                            cwriter = csv.writer(cf)
                            cwriter.writerow(
                                [
                                    sid,
                                    rel_file_path,
                                    occ_key,
                                    creator,
                                    norm_lic,
                                    image_url,
                                ]
                            )

                    time.sleep(0.08)  # Polite pacing between image downloads

            offset += page_size
            if end_of_records or offset >= 1000:
                break

        sp_download_bar.close()
        final_counts[sid] = current_count

    # Print summary table
    print("\n" + "=" * 82)
    print(
        f"{'ID':<4} {'Common Name':<20} {'Scientific Name':<28} {'Target':<8} {'Count':<8} {'Status':<10}"
    )
    print("-" * 82)

    deficient_species: list[tuple[int, str, str, int]] = []
    for sp in selected_species:
        sid = int(sp["id"])
        cname = sp["common_name"][:19]
        sname = sp["scientific_name"][:27]
        count = final_counts.get(sid, 0)
        status = (
            "OK"
            if count >= target_per_species
            else ("LOW" if count < 150 else "PARTIAL")
        )
        print(
            f"{sid:<4} {cname:<20} {sname:<28} {target_per_species:<8} {count:<8} {status:<10}"
        )
        if count < 150:
            deficient_species.append(
                (sid, sp["common_name"], sp["scientific_name"], count)
            )

    print("=" * 82)
    logger.info(
        "Summary: %d images newly downloaded across %d species.",
        total_newly_downloaded,
        len(selected_species),
    )

    if deficient_species:
        print("\n" + "!" * 82)
        print(f"WARNING: {len(deficient_species)} species have fewer than 150 images:")
        for sid, cname, sname, count in deficient_species:
            print(
                f"  [ID {sid:03d}] {cname} ({sname}): {count} images (target: {target_per_species})"
            )
        print("!" * 82 + "\n")
    else:
        print("\nAll selected species met the minimum requirement (>= 150 images).\n")


if __name__ == "__main__":
    main()
