"""01_download_images.py - Parallel botanical training image downloader.

Fetches research-grade, openly licensed plant images (CC0, CC-BY, CC-BY-NC) from
GBIF (iNaturalist Research-grade Observations dataset) for species listed in
ml/species_list.csv. Image downloading and Pillow resizing run concurrently across
a ThreadPoolExecutor (default 8 workers). GBIF API queries remain polite and sequential.
Resizes images so the longer side is at most 512 px, saves them to
ml/data/raw/<id>_<slug>/<n>.jpg, and writes provenance credits to
ml/data/dataset_credits.csv.
"""

from __future__ import annotations

import argparse
import concurrent.futures
import csv
import io
import logging
import random
import re
import shutil
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import requests
from PIL import Image, UnidentifiedImageError
from requests.adapters import HTTPAdapter
from tqdm import tqdm

USER_AGENT = (
    "PlantSpeciesClassifierBot/1.0 (academic botanical research; contact: none)"
)
GBIF_API_BASE = "https://api.gbif.org/v1"
MIN_FREE_DISK_GB = 15.0
DEFAULT_TARGET_PER_SPECIES = 300
MAX_PER_SPECIES = 400
DEFAULT_WORKERS = 8
ALLOWED_GBIF_LICENSES: list[str] = ["CC0_1_0", "CC_BY_4_0", "CC_BY_NC_4_0"]

logger = logging.getLogger("download_images")


class TqdmLoggingHandler(logging.Handler):
    """Logging handler that emits messages through tqdm.write to preserve clean progress bars."""

    def emit(self, record: logging.LogRecord) -> None:
        try:
            msg = self.format(record)
            tqdm.write(msg, file=sys.stderr)
            self.flush()
        except Exception:  # noqa: BLE001
            self.handleError(record)


def setup_logging(out_dir: Path) -> None:
    """Configure logging to write to console via tqdm and to ml/data/download.log."""
    out_dir.mkdir(parents=True, exist_ok=True)
    log_file = out_dir / "download.log"

    logger.setLevel(logging.INFO)
    logger.handlers.clear()

    # Formatter
    fmt = logging.Formatter(
        "%(asctime)s [%(levelname)s] %(message)s", datefmt="%H:%M:%S"
    )

    # Console handler
    console_handler = TqdmLoggingHandler()
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(fmt)
    logger.addHandler(console_handler)

    # File handler
    file_handler = logging.FileHandler(log_file, encoding="utf-8")
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(fmt)
    logger.addHandler(file_handler)


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

    Returns the GBIF taxon key (accepted key if synonym/doubtful, else usage key)
    and accepted scientific name. Emits warnings if the match is fuzzy or unaccepted.
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
            accepted_key = data.get("acceptedUsageKey") or data.get("acceptedKey")

            if match_type != "EXACT":
                logger.warning(
                    "GBIF match for '%s' is not EXACT (type: %s, matched: '%s').",
                    scientific_name,
                    match_type,
                    matched_name,
                )

            # When the GBIF species match returns status SYNONYM (or DOUBTFUL) with an
            # acceptedKey and the match is exact, use the acceptedKey for occurrence queries
            # and log the accepted scientific name.
            if (
                match_type == "EXACT"
                and status in ("SYNONYM", "DOUBTFUL")
                and accepted_key
            ):
                accepted_name = (
                    data.get("species") or data.get("canonicalName") or matched_name
                )
                try:
                    acc_resp = session.get(
                        f"{GBIF_API_BASE}/species/{accepted_key}", timeout=10
                    )
                    if acc_resp.ok:
                        acc_data = acc_resp.json()
                        accepted_name = (
                            acc_data.get("scientificName")
                            or acc_data.get("canonicalName")
                            or accepted_name
                        )
                except requests.RequestException:
                    pass

                logger.info(
                    "Taxon '%s' is %s with exact match. Using acceptedKey %s ('%s') for occurrence queries.",
                    scientific_name,
                    status,
                    accepted_key,
                    accepted_name,
                )
                return int(accepted_key), str(accepted_name)

            if status != "ACCEPTED":
                logger.warning(
                    "GBIF taxon status for '%s' is not ACCEPTED (status: %s, acceptedKey: %s).",
                    scientific_name,
                    status,
                    accepted_key,
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


def get_occurrence_image_count(
    session: requests.Session,
    dataset_key: str,
    taxon_key: int,
    licenses: list[str] | None = None,
) -> int:
    """Perform a count-only (limit=0) occurrence query for a taxon under allowed licenses."""
    url = f"{GBIF_API_BASE}/occurrence/search"
    if licenses is None:
        licenses = ALLOWED_GBIF_LICENSES
    params: dict[str, Any] = {
        "datasetKey": dataset_key,
        "taxonKey": taxon_key,
        "mediaType": "StillImage",
        "occurrenceStatus": "PRESENT",
        "license": licenses,
        "limit": 0,
    }
    for attempt in range(3):
        try:
            resp = session.get(url, params=params, timeout=15)
            resp.raise_for_status()
            data = resp.json()
            return int(data.get("count", 0))
        except requests.RequestException as exc:
            delay = 2**attempt
            logger.warning(
                "Count query attempt %d failed for taxonKey %d: %s. Retrying in %ds...",
                attempt + 1,
                taxon_key,
                exc,
                delay,
            )
            time.sleep(delay)
    return 0


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


@dataclass(frozen=True)
class ImageJobMeta:
    """Metadata for an image download job."""

    species_id: int
    slug: str
    occurrence_key: int
    creator: str
    norm_lic: str
    source_url: str
    sub_species_name: str = ""


def download_and_process_image_worker(
    session: requests.Session,
    image_url: str,
    max_dim: int = 512,
) -> tuple[bool, bytes | None]:
    """Worker task: download image, verify with Pillow, resize max side <= 512px, encode to JPEG.

    Returns:
        (True, jpeg_bytes) on success, (False, None) on failure. Never raises.
    """
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
                resp = session.get(attempt_url, timeout=15)
                if resp.status_code == 200 and resp.content:
                    content = resp.content
                    break
                if resp.status_code == 404:
                    break
            except requests.RequestException:
                time.sleep(2**attempt)
        if content:
            break

    if not content:
        return False, None

    try:
        with Image.open(io.BytesIO(content)) as raw_img:
            raw_img.load()
            rgb_img = raw_img.convert("RGB")

        rgb_img.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)

        bio = io.BytesIO()
        rgb_img.save(bio, "JPEG", quality=90, optimize=True)
        return True, bio.getvalue()
    except (OSError, SyntaxError, UnidentifiedImageError) as exc:
        logger.debug("Image decode error from %s: %s", image_url, exc)
        return False, None


def parse_args() -> argparse.Namespace:
    """Parse CLI arguments."""
    parser = argparse.ArgumentParser(
        description="Parallel botanical training image downloader (GBIF / iNaturalist)."
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
        "--workers",
        type=int,
        default=DEFAULT_WORKERS,
        help=f"Number of concurrent worker threads for image downloads (default {DEFAULT_WORKERS}).",
    )
    parser.add_argument(
        "--replace",
        action="store_true",
        help="For specified species, move existing folder to ml/data/replaced/, back up credits CSV, and download fresh.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Query GBIF and report availability without downloading files.",
    )
    parser.add_argument(
        "--count-only",
        action="store_true",
        help="Perform count-only (limit=0) query for occurrences with images without downloading.",
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
    """Run parallel botanical image download pipeline."""
    args = parse_args()
    random.seed(args.seed)

    target_per_species = min(max(args.per_species, 1), MAX_PER_SPECIES)
    num_workers = max(1, args.workers)
    out_dir: Path = args.out
    raw_dir = out_dir / "raw"
    credits_file = out_dir / "dataset_credits.csv"

    # Initialize logging with file and clean tqdm console handler
    setup_logging(out_dir)

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
        "Selected %d species to process (target per species: %d, workers: %d)",
        len(selected_species),
        target_per_species,
        num_workers,
    )

    # Setup session with connection pooling sized to workers
    session = requests.Session()
    session.headers.update({"User-Agent": USER_AGENT})
    adapter = HTTPAdapter(
        pool_connections=num_workers * 2, pool_maxsize=num_workers * 2, max_retries=1
    )
    session.mount("https://", adapter)
    session.mount("http://", adapter)

    # Resolve iNaturalist dataset key
    dataset_key = get_inaturalist_dataset_key(session)

    if args.count_only:
        print("\n--- Available Image Occurrence Counts (limit=0) ---")
        for sp in selected_species:
            sid = int(sp["id"])
            common_name = sp["common_name"]
            sci_name = sp["scientific_name"]
            taxon_key, resolved_name = resolve_species_taxon(session, sci_name)
            if not taxon_key:
                print(
                    f"ID {sid:03d} | {common_name} ({sci_name}) -> Could not resolve taxonKey"
                )
                continue
            count = get_occurrence_image_count(session, dataset_key, taxon_key)
            print(
                f"ID {sid:03d} | {common_name} ({sci_name}) -> Key Used: {taxon_key} ({resolved_name}) | Available occurrences with images: {count}"
            )
        return

    if args.replace and not args.dry_run and not args.count_only:
        replace_ids = {int(sp["id"]) for sp in selected_species}
        replaced_dir = out_dir / "replaced"
        replaced_dir.mkdir(parents=True, exist_ok=True)

        # 1. Move existing raw directories for selected species to ml/data/replaced/
        if raw_dir.exists():
            for folder in list(raw_dir.iterdir()):
                if folder.is_dir():
                    prefix = folder.name.split("_")[0]
                    if prefix.isdigit() and int(prefix) in replace_ids:
                        target_folder = replaced_dir / folder.name
                        if target_folder.exists():
                            target_folder = (
                                replaced_dir / f"{folder.name}_{int(time.time())}"
                            )
                        shutil.move(str(folder), str(target_folder))
                        logger.info(
                            "Moved existing raw folder for ID %s to replaced archive: %s -> %s",
                            prefix,
                            folder,
                            target_folder,
                        )

        # 2. Back up credits CSV and remove rows for replaced species
        if credits_file.exists():
            backup_file = (
                credits_file.parent / f"dataset_credits_backup_{int(time.time())}.csv"
            )
            shutil.copy2(credits_file, backup_file)
            logger.info("Backed up dataset credits to %s", backup_file)

            kept_rows: list[list[str]] = []
            with open(credits_file, mode="r", encoding="utf-8") as cf:
                reader = csv.reader(cf)
                header = next(reader, None)
                if header:
                    kept_rows.append(header)
                for row in reader:
                    if row and len(row) > 0:
                        try:
                            row_sid = int(row[0])
                            if row_sid in replace_ids:
                                continue
                        except ValueError:
                            pass
                        kept_rows.append(row)

            with open(credits_file, mode="w", newline="", encoding="utf-8") as cf:
                writer = csv.writer(cf)
                writer.writerows(kept_rows)
            logger.info(
                "Removed credits rows for replaced species IDs: %s",
                sorted(replace_ids),
            )

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

    final_counts: dict[int, int] = {}
    total_newly_downloaded = 0

    run_start_time = time.time()

    with concurrent.futures.ThreadPoolExecutor(max_workers=num_workers) as executor:
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

            is_genus_level = "genus-level" in sp.get("notes", "").lower()
            query_targets: list[tuple[int, str, int]] = []
            species_composition: dict[str, int] = {}

            if is_genus_level:
                genus_key, genus_name = resolve_species_taxon(session, sci_name)
                if not genus_key:
                    logger.error(
                        "Could not resolve genus taxonKey for '%s'. Skipping.",
                        sci_name,
                    )
                    continue

                logger.info(
                    "Species %d (%s) is genus-level. Querying top species facets for genusKey %d (%s)...",
                    sid,
                    common_name,
                    genus_key,
                    genus_name,
                )

                # Check establishmentMeans field
                est_params: dict[str, Any] = {
                    "datasetKey": dataset_key,
                    "genusKey": genus_key,
                    "mediaType": "StillImage",
                    "occurrenceStatus": "PRESENT",
                    "license": ALLOWED_GBIF_LICENSES,
                    "facet": "establishmentMeans",
                    "facetLimit": 20,
                    "limit": 0,
                }
                cultivated_managed_count = 0
                try:
                    time.sleep(0.12)
                    est_resp = session.get(
                        f"{GBIF_API_BASE}/occurrence/search",
                        params=est_params,
                        timeout=15,
                    )
                    if est_resp.ok:
                        for facet in est_resp.json().get("facets", []):
                            if facet.get("field") == "ESTABLISHMENT_MEANS":
                                for count_entry in facet.get("counts", []):
                                    name_val = str(count_entry.get("name", "")).lower()
                                    if any(
                                        term in name_val
                                        for term in ["cultivated", "managed"]
                                    ):
                                        cultivated_managed_count += int(
                                            count_entry.get("count", 0)
                                        )
                except requests.RequestException:
                    pass

                if cultivated_managed_count > 0:
                    logger.info(
                        "Found %d cultivated/managed occurrences in GBIF for genus %s.",
                        cultivated_managed_count,
                        genus_name,
                    )
                else:
                    logger.info(
                        "GBIF establishmentMeans check for genus %s (dataset: %s): "
                        "0 cultivated/managed records exposed in the iNaturalist Research-grade dataset "
                        "(iNaturalist captive/cultivated records are excluded from research-grade).",
                        genus_name,
                        dataset_key,
                    )

                # Query top 40 species under this genus
                facet_params: dict[str, Any] = {
                    "datasetKey": dataset_key,
                    "genusKey": genus_key,
                    "mediaType": "StillImage",
                    "occurrenceStatus": "PRESENT",
                    "license": ALLOWED_GBIF_LICENSES,
                    "facet": "speciesKey",
                    "facetLimit": 50,
                    "limit": 0,
                }
                top_species_keys: list[int] = []
                try:
                    time.sleep(0.12)
                    f_resp = session.get(
                        f"{GBIF_API_BASE}/occurrence/search",
                        params=facet_params,
                        timeout=15,
                    )
                    f_resp.raise_for_status()
                    for facet in f_resp.json().get("facets", []):
                        if facet.get("field") == "SPECIES_KEY":
                            for count_entry in facet.get("counts", []):
                                try:
                                    top_species_keys.append(int(count_entry["name"]))
                                except (KeyError, ValueError):
                                    continue
                except requests.RequestException as exc:
                    logger.error(
                        "Failed to query species facets for genus %s: %s",
                        genus_name,
                        exc,
                    )
                    continue

                top_species_keys = top_species_keys[:40]
                logger.info(
                    "Selected top %d species for genus %s. Fetching species names...",
                    len(top_species_keys),
                    genus_name,
                )

                for skey in top_species_keys:
                    s_name = f"Species {skey}"
                    try:
                        time.sleep(0.05)
                        sp_info = session.get(
                            f"{GBIF_API_BASE}/species/{skey}", timeout=10
                        )
                        if sp_info.ok:
                            s_data = sp_info.json()
                            s_name = (
                                s_data.get("canonicalName")
                                or s_data.get("scientificName")
                                or s_name
                            )
                    except requests.RequestException:
                        pass
                    query_targets.append((skey, s_name, 8))
            else:
                # Regular single species
                taxon_key, _ = resolve_species_taxon(session, sci_name)
                if not taxon_key:
                    logger.error(
                        "Could not resolve taxonKey for '%s'. Skipping.",
                        sci_name,
                    )
                    continue
                query_targets.append((taxon_key, sci_name, target_per_species))

            # Page through occurrences and submit download tasks
            next_file_idx = len(existing_images) + 1

            sp_download_bar = tqdm(
                total=target_per_species,
                initial=current_count,
                desc=f"sp {sid:03d} {sci_name[:18]}",
                unit="img",
                leave=False,
            )

            active_futures: set[
                concurrent.futures.Future[tuple[bool, bytes | None]]
            ] = set()
            fut_to_meta: dict[
                concurrent.futures.Future[tuple[bool, bytes | None]],
                ImageJobMeta,
            ] = {}
            queued_urls: set[str] = set()

            for target_key, target_name, max_target_imgs in query_targets:
                if current_count >= target_per_species:
                    break

                target_downloaded = 0
                offset = 0
                page_size = 20 if is_genus_level else 100
                end_of_records = False

                while (
                    target_downloaded < max_target_imgs
                    and current_count < target_per_species
                ):
                    # Top up worker pool with candidates if backlog is low
                    if (
                        len(active_futures) < num_workers * 3
                        and not end_of_records
                        and offset < 1000
                    ):
                        search_url = f"{GBIF_API_BASE}/occurrence/search"
                        params = {
                            "datasetKey": dataset_key,
                            "taxonKey": target_key,
                            "mediaType": "StillImage",
                            "occurrenceStatus": "PRESENT",
                            "limit": page_size,
                            "offset": offset,
                        }

                        results: list[dict[str, Any]] = []
                        for attempt in range(3):
                            try:
                                time.sleep(0.12)  # Polite pacing for GBIF API
                                resp = session.get(
                                    search_url, params=params, timeout=15
                                )
                                resp.raise_for_status()
                                data = resp.json()
                                results = data.get("results", [])
                                end_of_records = data.get("endOfRecords", False)
                                break
                            except requests.RequestException:
                                time.sleep(2**attempt)
                                end_of_records = False

                        offset += page_size

                        if not results:
                            end_of_records = True

                        for occ in results:
                            occ_key = occ.get("key")
                            if not occ_key:
                                continue

                            occ_license = occ.get("license")
                            media_list = occ.get("media", [])

                            for media_item in media_list:
                                m_type = media_item.get("type", "")
                                m_format = media_item.get("format", "")
                                if m_type != "StillImage" and not m_format.startswith(
                                    "image/"
                                ):
                                    continue

                                raw_lic = media_item.get("license") or occ_license
                                norm_lic = normalize_license(raw_lic)
                                if not norm_lic:
                                    continue

                                image_url = media_item.get("identifier")
                                if (
                                    not image_url
                                    or image_url in downloaded_urls
                                    or image_url in queued_urls
                                ):
                                    continue

                                creator = (
                                    media_item.get("creator")
                                    or media_item.get("rightsHolder")
                                    or occ.get("recordedBy")
                                    or "Unknown"
                                )

                                if args.dry_run:
                                    current_count += 1
                                    target_downloaded += 1
                                    sp_download_bar.update(1)
                                    downloaded_urls.add(image_url)
                                    if (
                                        target_downloaded >= max_target_imgs
                                        or current_count >= target_per_species
                                    ):
                                        break
                                    continue

                                queued_urls.add(image_url)
                                meta = ImageJobMeta(
                                    species_id=sid,
                                    slug=slug,
                                    occurrence_key=occ_key,
                                    creator=creator,
                                    norm_lic=norm_lic,
                                    source_url=image_url,
                                    sub_species_name=target_name,
                                )
                                fut = executor.submit(
                                    download_and_process_image_worker,
                                    session,
                                    image_url,
                                    512,
                                )
                                active_futures.add(fut)
                                fut_to_meta[fut] = meta

                                if (
                                    target_downloaded + len(active_futures)
                                    >= max_target_imgs
                                    or current_count + len(active_futures)
                                    >= target_per_species
                                ):
                                    break

                            if (
                                target_downloaded >= max_target_imgs
                                or current_count >= target_per_species
                            ):
                                break

                    if args.dry_run:
                        break

                    if not active_futures:
                        if end_of_records:
                            break
                        continue

                    # Wait for at least one worker task to complete
                    done, _ = concurrent.futures.wait(
                        active_futures,
                        timeout=0.2,
                        return_when=concurrent.futures.FIRST_COMPLETED,
                    )

                    for fut in done:
                        active_futures.remove(fut)
                        meta = fut_to_meta.pop(fut)

                        try:
                            success, jpeg_bytes = fut.result()
                        except Exception as exc:  # noqa: BLE001
                            logger.debug(
                                "Worker error for %s: %s", meta.source_url, exc
                            )
                            success, jpeg_bytes = False, None

                        if (
                            success
                            and jpeg_bytes
                            and current_count < target_per_species
                        ):
                            current_count += 1
                            target_downloaded += 1
                            dest_file = species_dir / f"{next_file_idx}.jpg"
                            dest_file.parent.mkdir(parents=True, exist_ok=True)
                            dest_file.write_bytes(jpeg_bytes)

                            rel_file_path = f"raw/{slug}/{next_file_idx}.jpg"
                            next_file_idx += 1
                            total_newly_downloaded += 1
                            sp_download_bar.update(1)
                            downloaded_urls.add(meta.source_url)
                            downloaded_occurrences.add((sid, meta.occurrence_key))

                            if meta.sub_species_name:
                                species_composition[meta.sub_species_name] = (
                                    species_composition.get(meta.sub_species_name, 0)
                                    + 1
                                )

                            # Safely record credit row from main thread
                            with open(
                                credits_file,
                                mode="a",
                                newline="",
                                encoding="utf-8",
                            ) as cf:
                                cwriter = csv.writer(cf)
                                cwriter.writerow(
                                    [
                                        sid,
                                        rel_file_path,
                                        meta.occurrence_key,
                                        meta.creator,
                                        meta.norm_lic,
                                        meta.source_url,
                                    ]
                                )
                                cf.flush()

            # Drain any remaining active futures
            while active_futures and current_count < target_per_species:
                done, _ = concurrent.futures.wait(
                    active_futures,
                    timeout=0.5,
                    return_when=concurrent.futures.FIRST_COMPLETED,
                )
                for fut in done:
                    active_futures.remove(fut)
                    meta = fut_to_meta.pop(fut)
                    try:
                        success, jpeg_bytes = fut.result()
                    except Exception:  # noqa: BLE001
                        success, jpeg_bytes = False, None
                    if success and jpeg_bytes and current_count < target_per_species:
                        current_count += 1
                        dest_file = species_dir / f"{next_file_idx}.jpg"
                        dest_file.parent.mkdir(parents=True, exist_ok=True)
                        dest_file.write_bytes(jpeg_bytes)

                        rel_file_path = f"raw/{slug}/{next_file_idx}.jpg"
                        next_file_idx += 1
                        total_newly_downloaded += 1
                        sp_download_bar.update(1)
                        downloaded_urls.add(meta.source_url)
                        downloaded_occurrences.add((sid, meta.occurrence_key))

                        if meta.sub_species_name:
                            species_composition[meta.sub_species_name] = (
                                species_composition.get(meta.sub_species_name, 0) + 1
                            )

                        with open(
                            credits_file, mode="a", newline="", encoding="utf-8"
                        ) as cf:
                            cwriter = csv.writer(cf)
                            cwriter.writerow(
                                [
                                    sid,
                                    rel_file_path,
                                    meta.occurrence_key,
                                    meta.creator,
                                    meta.norm_lic,
                                    meta.source_url,
                                ]
                            )
                            cf.flush()

            # Clean up any leftover futures for this species
            for fut in active_futures:
                fut.cancel()

            sp_download_bar.close()
            final_counts[sid] = current_count

            if is_genus_level and species_composition:
                logger.info(
                    "Genus composition for %s (%s, ID %03d): %d images across %d species:",
                    common_name,
                    sci_name,
                    sid,
                    current_count,
                    len(species_composition),
                )
                for sname, cnt in sorted(
                    species_composition.items(), key=lambda x: -x[1]
                ):
                    logger.info("  * %s: %d image(s)", sname, cnt)

    elapsed_time = time.time() - run_start_time
    speed_ips = total_newly_downloaded / elapsed_time if elapsed_time > 0 else 0.0

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
        "Finished: %d images newly downloaded across %d species in %.2fs (%.2f images/sec).",
        total_newly_downloaded,
        len(selected_species),
        elapsed_time,
        speed_ips,
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
