"""02b_download_negatives.py - Parallel out-of-distribution negatives downloader.

Downloads out-of-distribution negative images from GBIF / iNaturalist Research-grade Observations
that the plant classification model must learn to reject during inference:
  1. non_plant/: Non-plant organisms spread evenly across birds (Aves), insects (Insecta),
     mammals (Mammalia), fungi (Fungi), reptiles (Squamata), amphibians (Amphibia), and
     arachnids (Arachnida) (~285 images each, ~2,000 total).
  2. unseen_plant/: Plants outside the classification domain (~1,000 images total, up to 8 images
     from each of ~125 randomly selected plant species, strictly excluding all species and
     genera present in ml/species_list.csv, plus genus Rosa).

Images are resized so their longer side is at most 512 px, saved as RGB JPEG, and logged to
ml/data/negatives_credits.csv.

CRITICAL CONTRACT:
These negative images are NEVER used for model training or validation in ml/03_train.py,
nor are they discovered or processed by ml/02_clean_dataset.py. They are strictly reserved
for out-of-distribution rejection evaluation and open-set confidence calibration.
"""

from __future__ import annotations

import argparse
import concurrent.futures
import csv
import importlib.util
import logging
import random
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import requests
from requests.adapters import HTTPAdapter
from tqdm import tqdm

# Ensure ml directory is on sys.path
SCRIPT_DIR = Path(__file__).resolve().parent
ML_DIR = SCRIPT_DIR
if str(ML_DIR) not in sys.path:
    sys.path.insert(0, str(ML_DIR))

# Dynamically import ml/01_download_images.py to reuse networking, licenses, and image processing
DL_SCRIPT = ML_DIR / "01_download_images.py"
if not DL_SCRIPT.exists():
    raise FileNotFoundError(f"Required base downloader not found at {DL_SCRIPT}")

spec = importlib.util.spec_from_file_location("download_images", DL_SCRIPT)
assert spec is not None and spec.loader is not None
dl_mod = importlib.util.module_from_spec(spec)
sys.modules["download_images"] = dl_mod
spec.loader.exec_module(dl_mod)

USER_AGENT = dl_mod.USER_AGENT
GBIF_API_BASE = dl_mod.GBIF_API_BASE
ALLOWED_GBIF_LICENSES = dl_mod.ALLOWED_GBIF_LICENSES
DEFAULT_WORKERS = dl_mod.DEFAULT_WORKERS
normalize_license = dl_mod.normalize_license
make_slug = dl_mod.make_slug
get_inaturalist_dataset_key = dl_mod.get_inaturalist_dataset_key
download_and_process_image_worker = dl_mod.download_and_process_image_worker
check_disk_space = dl_mod.check_disk_space

logger = logging.getLogger("download_negatives")

DEFAULT_NON_PLANT_TOTAL = 2000
DEFAULT_UNSEEN_PLANT_TOTAL = 1000
DEFAULT_SEED = 42

# 7 taxonomic non-plant groups with verified GBIF Backbone taxonKeys
NON_PLANT_CATEGORIES: dict[str, dict[str, Any]] = {
    "birds": {"taxon_key": 212, "name": "Aves"},
    "insects": {"taxon_key": 216, "name": "Insecta"},
    "mammals": {"taxon_key": 359, "name": "Mammalia"},
    "fungi": {"taxon_key": 5, "name": "Fungi"},
    "reptiles": {"taxon_key": 11592253, "name": "Squamata"},
    "amphibians": {"taxon_key": 131, "name": "Amphibia"},
    "arachnids": {"taxon_key": 367, "name": "Arachnida"},
}


@dataclass(frozen=True)
class NegativeCandidateJob:
    """Metadata for a pending negative image download."""

    group: str
    sub_category: str
    file_rel_path: str
    taxon_name: str
    occurrence_key: int
    creator: str
    norm_lic: str
    source_url: str


def setup_negatives_logging(out_dir: Path) -> None:
    """Configure console and file logging."""
    out_dir.mkdir(parents=True, exist_ok=True)
    log_file = out_dir / "download_negatives.log"

    logger.setLevel(logging.INFO)
    logger.handlers.clear()

    fmt = logging.Formatter(
        "%(asctime)s [%(levelname)s] %(message)s", datefmt="%H:%M:%S"
    )

    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(fmt)
    logger.addHandler(console_handler)

    file_handler = logging.FileHandler(log_file, encoding="utf-8")
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(fmt)
    logger.addHandler(file_handler)


def load_forbidden_taxa(species_list_csv: Path) -> tuple[set[str], set[str]]:
    """Parse species_list.csv into sets of forbidden species names and genus names.

    Also explicitly excludes the entire genus Rosa (as Rose is a genus-level class).
    """
    if not species_list_csv.exists():
        raise FileNotFoundError(f"species_list.csv not found at {species_list_csv}")

    forbidden_species: set[str] = set()
    forbidden_genera: set[str] = set()

    with open(species_list_csv, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            sci = row.get("scientific_name", "").strip().lower()
            if not sci:
                continue
            forbidden_species.add(sci)
            genus = sci.split()[0].strip()
            forbidden_genera.add(genus)

    # Exclude entire genus Rosa per requirement
    forbidden_genera.add("rosa")
    return forbidden_species, forbidden_genera


def load_existing_credits(
    credits_csv: Path,
) -> tuple[set[str], dict[str, int], dict[str, dict[str, int]]]:
    """Parse existing ml/data/negatives_credits.csv for idempotency and resuming.

    Returns:
        downloaded_urls: set of source_url strings
        counts_by_group: dict mapping group -> count
        counts_by_sub: dict mapping group -> subcategory/species -> count
    """
    downloaded_urls: set[str] = set()
    counts_by_group: dict[str, int] = {"non_plant": 0, "unseen_plant": 0}
    counts_by_sub: dict[str, dict[str, int]] = {
        "non_plant": {},
        "unseen_plant": {},
    }

    if not credits_csv.exists():
        return downloaded_urls, counts_by_group, counts_by_sub

    with open(credits_csv, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            url = row.get("source_url", "").strip()
            group = row.get("group", "").strip()
            rel_file = row.get("file", "").strip()
            if url:
                downloaded_urls.add(url)
            if group in counts_by_group:
                counts_by_group[group] += 1
                parts = Path(rel_file).parts
                sub = parts[2] if len(parts) >= 3 else "default"
                counts_by_sub[group][sub] = counts_by_sub[group].get(sub, 0) + 1

    return downloaded_urls, counts_by_group, counts_by_sub


def query_candidate_unseen_species(
    session: requests.Session,
    dataset_key: str,
    forbidden_species: set[str],
    forbidden_genera: set[str],
    num_species_target: int,
    seed: int = DEFAULT_SEED,
) -> list[dict[str, Any]]:
    """Query Plantae occurrence facets and return random, non-conflicting species candidates."""
    logger.info(
        "Querying GBIF for top Plantae speciesKey facets in iNaturalist dataset..."
    )
    params: dict[str, Any] = {
        "datasetKey": dataset_key,
        "kingdomKey": 6,  # Plantae
        "mediaType": "StillImage",
        "occurrenceStatus": "PRESENT",
        "license": ALLOWED_GBIF_LICENSES,
        "facet": "speciesKey",
        "facetLimit": max(500, num_species_target * 4),
        "limit": 0,
    }

    resp = session.get(f"{GBIF_API_BASE}/occurrence/search", params=params, timeout=20)
    resp.raise_for_status()
    data = resp.json()

    facets = [
        f["counts"] for f in data.get("facets", []) if f.get("field") == "SPECIES_KEY"
    ]
    if not facets or not facets[0]:
        raise RuntimeError("No speciesKey facets returned for Plantae.")

    raw_counts = facets[0]
    logger.info("Retrieved %d candidate species facets from GBIF.", len(raw_counts))

    # Resolve species details in parallel
    def resolve_info(item: dict[str, Any]) -> dict[str, Any] | None:
        try:
            skey = int(item["name"])
            sp_resp = session.get(f"{GBIF_API_BASE}/species/{skey}", timeout=10)
            if not sp_resp.ok:
                return None
            info = sp_resp.json()
            canon = (
                info.get("canonicalName") or info.get("scientificName", "")
            ).strip()
            genus = (
                (info.get("genus") or (canon.split()[0] if canon else ""))
                .strip()
                .lower()
            )

            if not canon or not genus:
                return None
            # Exclude our classes and matching genera
            if canon.lower() in forbidden_species or genus in forbidden_genera:
                return None

            return {
                "key": skey,
                "name": canon,
                "genus": genus,
                "count": int(item.get("count", 0)),
            }
        except Exception:  # noqa: BLE001
            return None

    candidates: list[dict[str, Any]] = []
    # Evaluate enough facets to fill candidates
    eval_slice = raw_counts[: max(300, num_species_target * 3)]
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as ex:
        for res in ex.map(resolve_info, eval_slice):
            if res is not None:
                candidates.append(res)

    logger.info(
        "Resolved %d eligible, non-conflicting unseen plant species.", len(candidates)
    )
    if len(candidates) < num_species_target:
        logger.warning(
            "Found %d candidate species, fewer than target %d.",
            len(candidates),
            num_species_target,
        )
        selected = candidates
    else:
        rng = random.Random(seed)
        selected = rng.sample(candidates, num_species_target)

    # Sort deterministically by canonical name
    selected.sort(key=lambda x: x["name"])
    return selected


def download_negatives_pipeline(
    data_dir: Path,
    species_list_csv: Path,
    per_group: int | None = None,
    seed: int = DEFAULT_SEED,
    num_workers: int = DEFAULT_WORKERS,
    dry_run: bool = False,
) -> dict[str, Any]:
    """Execute the out-of-distribution negatives download pipeline."""
    # Enforce separation contract
    assert "raw" not in str(
        data_dir / "negatives"
    ), "Safety check failed: negatives must not write to raw/"

    negatives_dir = data_dir / "negatives"
    non_plant_dir = negatives_dir / "non_plant"
    unseen_plant_dir = negatives_dir / "unseen_plant"
    credits_csv = data_dir / "negatives_credits.csv"

    setup_negatives_logging(data_dir)
    check_disk_space(data_dir, min_gb=10.0)

    # Target counts
    if per_group is not None:
        target_non_plant = max(1, per_group)
        target_unseen_plant = max(1, per_group)
    else:
        target_non_plant = DEFAULT_NON_PLANT_TOTAL
        target_unseen_plant = DEFAULT_UNSEEN_PLANT_TOTAL

    logger.info(
        "Starting negatives download | Target non_plant: %d | Target unseen_plant: %d | Dry-run: %s",
        target_non_plant,
        target_unseen_plant,
        dry_run,
    )

    # Setup polite requests session
    session = requests.Session()
    session.headers.update({"User-Agent": USER_AGENT})
    adapter = HTTPAdapter(
        pool_connections=num_workers * 2, pool_maxsize=num_workers * 2, max_retries=2
    )
    session.mount("https://", adapter)
    session.mount("http://", adapter)

    dataset_key = get_inaturalist_dataset_key(session)

    # Load forbidden species and genera
    forbidden_species, forbidden_genera = load_forbidden_taxa(species_list_csv)
    logger.info(
        "Loaded %d forbidden species and %d forbidden genera from %s.",
        len(forbidden_species),
        len(forbidden_genera),
        species_list_csv,
    )

    # Load existing credits for idempotency
    (
        downloaded_urls,
        counts_by_group,
        counts_by_sub,
    ) = load_existing_credits(credits_csv)
    logger.info(
        "Existing negatives: %d non_plant, %d unseen_plant (total urls: %d).",
        counts_by_group["non_plant"],
        counts_by_group["unseen_plant"],
        len(downloaded_urls),
    )

    # Ensure credits CSV headers exist if creating fresh
    if not dry_run and not credits_csv.exists():
        credits_csv.parent.mkdir(parents=True, exist_ok=True)
        with open(credits_csv, mode="w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(
                [
                    "group",
                    "file",
                    "taxon",
                    "occurrence_key",
                    "creator",
                    "license",
                    "source_url",
                ]
            )

    results_summary: dict[str, Any] = {
        "non_plant_total": counts_by_group["non_plant"],
        "non_plant_by_category": {},
        "unseen_plant_total": counts_by_group["unseen_plant"],
        "unseen_plant_species_count": len(counts_by_sub["unseen_plant"]),
        "newly_downloaded": 0,
        "dry_run": dry_run,
    }

    # ─────────────────────────────────────────────────────────────────
    # 1. NON-PLANT DOWNLOAD (7 categories)
    # ─────────────────────────────────────────────────────────────────
    num_cats = len(NON_PLANT_CATEGORIES)
    per_cat_target = max(1, target_non_plant // num_cats)
    logger.info(
        "--- [1/2] Processing non_plant (~%d images across %d categories) ---",
        target_non_plant,
        num_cats,
    )

    pbar_non_plant = tqdm(
        total=target_non_plant,
        initial=min(target_non_plant, counts_by_group["non_plant"]),
        desc="non_plant",
        unit="img",
    )

    with concurrent.futures.ThreadPoolExecutor(max_workers=num_workers) as executor:
        for cat_name, cat_meta in NON_PLANT_CATEGORIES.items():
            if counts_by_group["non_plant"] >= target_non_plant:
                break

            cat_dir = non_plant_dir / cat_name
            cat_existing = counts_by_sub["non_plant"].get(cat_name, 0)
            if not dry_run and cat_dir.exists():
                cat_existing = max(cat_existing, len(list(cat_dir.glob("*.jpg"))))

            cat_needed = max(0, per_cat_target - cat_existing)
            # If total target allows extra, adjust needed
            cat_needed = min(
                cat_needed, target_non_plant - counts_by_group["non_plant"]
            )

            results_summary["non_plant_by_category"][cat_name] = cat_existing
            if cat_needed <= 0:
                continue

            # Query occurrences for this category
            taxon_key = cat_meta["taxon_key"]
            cat_downloaded = 0
            offset = 0
            end_of_records = False

            active_futs: set[concurrent.futures.Future[tuple[bool, bytes | None]]] = (
                set()
            )
            fut_meta: dict[
                concurrent.futures.Future[tuple[bool, bytes | None]],
                NegativeCandidateJob,
            ] = {}
            queued_urls: set[str] = set()

            while (
                cat_downloaded < cat_needed
                and counts_by_group["non_plant"] < target_non_plant
            ):
                # Queue candidates if worker pool backlog is low
                if (
                    len(active_futs) < num_workers * 2
                    and not end_of_records
                    and offset < 1000
                ):
                    time.sleep(0.1)  # Polite pacing
                    params = {
                        "datasetKey": dataset_key,
                        "taxonKey": taxon_key,
                        "mediaType": "StillImage",
                        "occurrenceStatus": "PRESENT",
                        "license": ALLOWED_GBIF_LICENSES,
                        "limit": min(50, cat_needed * 2),
                        "offset": offset,
                    }
                    try:
                        resp = session.get(
                            f"{GBIF_API_BASE}/occurrence/search",
                            params=params,
                            timeout=15,
                        )
                        resp.raise_for_status()
                        occ_data = resp.json()
                        records = occ_data.get("results", [])
                        end_of_records = occ_data.get("endOfRecords", False)
                        offset += len(records)
                        if not records:
                            end_of_records = True
                    except requests.RequestException as exc:
                        logger.warning(
                            "Error fetching occurrences for %s: %s", cat_name, exc
                        )
                        break

                    for occ in records:
                        if (
                            cat_downloaded >= cat_needed
                            or counts_by_group["non_plant"] >= target_non_plant
                        ):
                            break
                        occ_key = occ.get("key")
                        if not occ_key:
                            continue
                        occ_lic = occ.get("license")
                        media_items = occ.get("media", [])

                        for m in media_items:
                            if (
                                cat_downloaded >= cat_needed
                                or counts_by_group["non_plant"] >= target_non_plant
                            ):
                                break
                            if m.get("type") != "StillImage" and not m.get(
                                "format", ""
                            ).startswith("image/"):
                                continue
                            norm_lic = normalize_license(m.get("license") or occ_lic)
                            if not norm_lic:
                                continue
                            img_url = m.get("identifier")
                            if (
                                not img_url
                                or img_url in downloaded_urls
                                or img_url in queued_urls
                            ):
                                continue

                            creator = (
                                m.get("creator")
                                or m.get("rightsHolder")
                                or occ.get("recordedBy")
                                or "Unknown"
                            )
                            queued_urls.add(img_url)

                            next_idx = (
                                cat_existing + cat_downloaded + len(active_futs) + 1
                            )
                            rel_path = f"negatives/non_plant/{cat_name}/{next_idx}.jpg"
                            job = NegativeCandidateJob(
                                group="non_plant",
                                sub_category=cat_name,
                                file_rel_path=rel_path,
                                taxon_name=cat_meta["name"],
                                occurrence_key=occ_key,
                                creator=creator,
                                norm_lic=norm_lic,
                                source_url=img_url,
                            )

                            if dry_run:
                                cat_downloaded += 1
                                counts_by_group["non_plant"] += 1
                                pbar_non_plant.update(1)
                                downloaded_urls.add(img_url)
                                if (
                                    cat_downloaded >= cat_needed
                                    or counts_by_group["non_plant"] >= target_non_plant
                                ):
                                    break
                                continue

                            fut = executor.submit(
                                download_and_process_image_worker, session, img_url, 512
                            )
                            active_futs.add(fut)
                            fut_meta[fut] = job

                            if (
                                len(active_futs) + cat_downloaded >= cat_needed
                                or counts_by_group["non_plant"] + len(active_futs)
                                >= target_non_plant
                            ):
                                break

                if dry_run:
                    break

                if not active_futs:
                    break

                # Harvest completed downloads
                done, active_futs = concurrent.futures.wait(
                    active_futs, return_when=concurrent.futures.FIRST_COMPLETED
                )
                for f in done:
                    meta = fut_meta.pop(f)
                    success, jpeg_bytes = f.result()
                    if (
                        success
                        and jpeg_bytes
                        and cat_downloaded < cat_needed
                        and counts_by_group["non_plant"] < target_non_plant
                    ):
                        dest_path = data_dir / meta.file_rel_path
                        dest_path.parent.mkdir(parents=True, exist_ok=True)
                        dest_path.write_bytes(jpeg_bytes)

                        with open(
                            credits_csv, mode="a", newline="", encoding="utf-8"
                        ) as cf:
                            csv.writer(cf).writerow(
                                [
                                    meta.group,
                                    meta.file_rel_path,
                                    meta.taxon_name,
                                    meta.occurrence_key,
                                    meta.creator,
                                    meta.norm_lic,
                                    meta.source_url,
                                ]
                            )

                        downloaded_urls.add(meta.source_url)
                        cat_downloaded += 1
                        counts_by_group["non_plant"] += 1
                        results_summary["newly_downloaded"] += 1
                        pbar_non_plant.update(1)

            results_summary["non_plant_by_category"][cat_name] = (
                cat_existing + cat_downloaded
            )

    pbar_non_plant.close()
    results_summary["non_plant_total"] = counts_by_group["non_plant"]

    # ─────────────────────────────────────────────────────────────────
    # 2. UNSEEN PLANT DOWNLOAD (~125 species, up to 8 images each)
    # ─────────────────────────────────────────────────────────────────
    logger.info(
        "--- [2/2] Processing unseen_plant (Target: ~%d images) ---",
        target_unseen_plant,
    )

    if per_group is not None and per_group <= 8:
        target_species_count = max(1, per_group)
        max_imgs_per_species = 1
    else:
        target_species_count = max(1, (target_unseen_plant + 7) // 8)
        max_imgs_per_species = 8

    unseen_species = query_candidate_unseen_species(
        session=session,
        dataset_key=dataset_key,
        forbidden_species=forbidden_species,
        forbidden_genera=forbidden_genera,
        num_species_target=target_species_count,
        seed=seed,
    )

    pbar_unseen = tqdm(
        total=target_unseen_plant,
        initial=min(target_unseen_plant, counts_by_group["unseen_plant"]),
        desc="unseen_plant",
        unit="img",
    )

    with concurrent.futures.ThreadPoolExecutor(max_workers=num_workers) as executor:
        for sp in unseen_species:
            if counts_by_group["unseen_plant"] >= target_unseen_plant:
                break

            sp_name = sp["name"]
            sp_key = sp["key"]
            sp_slug = make_slug(sp_name)
            sp_dir = unseen_plant_dir / sp_slug

            sp_existing = counts_by_sub["unseen_plant"].get(sp_slug, 0)
            if not dry_run and sp_dir.exists():
                sp_existing = max(sp_existing, len(list(sp_dir.glob("*.jpg"))))

            sp_needed = min(
                max_imgs_per_species - sp_existing,
                target_unseen_plant - counts_by_group["unseen_plant"],
            )
            if sp_needed <= 0:
                continue

            time.sleep(0.1)  # Polite pacing
            params = {
                "datasetKey": dataset_key,
                "taxonKey": sp_key,
                "mediaType": "StillImage",
                "occurrenceStatus": "PRESENT",
                "license": ALLOWED_GBIF_LICENSES,
                "limit": 20,
            }
            try:
                resp = session.get(
                    f"{GBIF_API_BASE}/occurrence/search", params=params, timeout=15
                )
                resp.raise_for_status()
                records = resp.json().get("results", [])
            except requests.RequestException as exc:
                logger.warning("Error fetching occurrences for %s: %s", sp_name, exc)
                continue

            sp_downloaded = 0
            active_futs = set()
            fut_meta = {}
            queued_urls = set()

            for occ in records:
                if (
                    sp_downloaded >= sp_needed
                    or counts_by_group["unseen_plant"] >= target_unseen_plant
                ):
                    break

                occ_key = occ.get("key")
                if not occ_key:
                    continue
                occ_lic = occ.get("license")
                media_items = occ.get("media", [])

                for m in media_items:
                    if (
                        sp_downloaded >= sp_needed
                        or counts_by_group["unseen_plant"] >= target_unseen_plant
                    ):
                        break
                    if m.get("type") != "StillImage" and not m.get(
                        "format", ""
                    ).startswith("image/"):
                        continue
                    norm_lic = normalize_license(m.get("license") or occ_lic)
                    if not norm_lic:
                        continue
                    img_url = m.get("identifier")
                    if (
                        not img_url
                        or img_url in downloaded_urls
                        or img_url in queued_urls
                    ):
                        continue

                    creator = (
                        m.get("creator")
                        or m.get("rightsHolder")
                        or occ.get("recordedBy")
                        or "Unknown"
                    )
                    queued_urls.add(img_url)

                    next_idx = sp_existing + sp_downloaded + len(active_futs) + 1
                    rel_path = f"negatives/unseen_plant/{sp_slug}/{next_idx}.jpg"
                    job = NegativeCandidateJob(
                        group="unseen_plant",
                        sub_category=sp_slug,
                        file_rel_path=rel_path,
                        taxon_name=sp_name,
                        occurrence_key=occ_key,
                        creator=creator,
                        norm_lic=norm_lic,
                        source_url=img_url,
                    )

                    if dry_run:
                        sp_downloaded += 1
                        counts_by_group["unseen_plant"] += 1
                        pbar_unseen.update(1)
                        downloaded_urls.add(img_url)
                        if (
                            sp_downloaded >= sp_needed
                            or counts_by_group["unseen_plant"] >= target_unseen_plant
                        ):
                            break
                        continue

                    fut = executor.submit(
                        download_and_process_image_worker, session, img_url, 512
                    )
                    active_futs.add(fut)
                    fut_meta[fut] = job
                    if (
                        len(active_futs) + sp_downloaded >= sp_needed
                        or counts_by_group["unseen_plant"] + len(active_futs)
                        >= target_unseen_plant
                    ):
                        break

            if dry_run:
                continue

            # Harvest completed downloads for this species
            while active_futs:
                done, active_futs = concurrent.futures.wait(
                    active_futs, return_when=concurrent.futures.FIRST_COMPLETED
                )
                for f in done:
                    meta = fut_meta.pop(f)
                    success, jpeg_bytes = f.result()
                    if (
                        success
                        and jpeg_bytes
                        and sp_downloaded < sp_needed
                        and counts_by_group["unseen_plant"] < target_unseen_plant
                    ):
                        dest_path = data_dir / meta.file_rel_path
                        dest_path.parent.mkdir(parents=True, exist_ok=True)
                        dest_path.write_bytes(jpeg_bytes)

                        with open(
                            credits_csv, mode="a", newline="", encoding="utf-8"
                        ) as cf:
                            csv.writer(cf).writerow(
                                [
                                    meta.group,
                                    meta.file_rel_path,
                                    meta.taxon_name,
                                    meta.occurrence_key,
                                    meta.creator,
                                    meta.norm_lic,
                                    meta.source_url,
                                ]
                            )

                        downloaded_urls.add(meta.source_url)
                        sp_downloaded += 1
                        counts_by_group["unseen_plant"] += 1
                        results_summary["newly_downloaded"] += 1
                        pbar_unseen.update(1)

    pbar_unseen.close()
    results_summary["unseen_plant_total"] = counts_by_group["unseen_plant"]
    results_summary["total_negatives"] = (
        results_summary["non_plant_total"] + results_summary["unseen_plant_total"]
    )
    return results_summary


def print_summary(summary: dict[str, Any], data_dir: Path) -> None:
    """Print clean formatted summary of downloaded negatives."""
    print("\n" + "=" * 65)
    print(" NEGATIVES DATASET SUMMARY")
    print("=" * 65)
    print(f"Directory:             {data_dir / 'negatives'}")
    print(f"Credits File:          {data_dir / 'negatives_credits.csv'}")
    print(f"Dry-run Mode:          {summary['dry_run']}")
    print(f"Newly Downloaded:      {summary['newly_downloaded']}")
    print("-" * 65)
    print(f"1. Non-Plant Group:    {summary['non_plant_total']} images")
    for cat, cnt in summary.get("non_plant_by_category", {}).items():
        print(f"   - {cat:<12}:      {cnt} images")
    print(f"2. Unseen-Plant Group: {summary['unseen_plant_total']} images")
    print("-" * 65)
    print(f"TOTAL NEGATIVES:       {summary['total_negatives']} images")
    print("=" * 65 + "\n")


def parse_args() -> argparse.Namespace:
    """Parse CLI arguments."""
    parser = argparse.ArgumentParser(
        description="Download negative out-of-distribution evaluation images from GBIF."
    )
    parser.add_argument(
        "--per-group",
        type=int,
        default=None,
        help="Number of images per group (default: ~2000 for non_plant, ~1000 for unseen_plant).",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=DEFAULT_SEED,
        help=f"Random seed for unseen species sampling (default: {DEFAULT_SEED}).",
    )
    parser.add_argument(
        "--workers",
        type=int,
        default=DEFAULT_WORKERS,
        help=f"Concurrent download worker threads (default: {DEFAULT_WORKERS}).",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Query GBIF and simulate download without saving files.",
    )
    parser.add_argument(
        "--data-dir",
        type=Path,
        default=Path("ml/data"),
        help="Base directory for output data (default: ml/data).",
    )
    parser.add_argument(
        "--species-list",
        type=Path,
        default=Path("ml/species_list.csv"),
        help="Path to species_list.csv (default: ml/species_list.csv).",
    )
    return parser.parse_args()


def main() -> None:
    """CLI entrypoint."""
    args = parse_args()
    summary = download_negatives_pipeline(
        data_dir=args.data_dir,
        species_list_csv=args.species_list,
        per_group=args.per_group,
        seed=args.seed,
        num_workers=args.workers,
        dry_run=args.dry_run,
    )
    print_summary(summary, args.data_dir)


if __name__ == "__main__":
    main()
