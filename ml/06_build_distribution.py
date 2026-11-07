"""06_build_distribution.py - Aggregate coarse botanical occurrence distribution data.

IMPORTANT BOTANICAL DISTINCTION:
This dataset represents *recorded observations* logged in GBIF/iNaturalist, NOT botanical
native range. Occurrence counts reflect observer recording density, regional biodiversity
monitoring activity, and naturalized/cultivated sightings. The user interface and downstream
applications must display this data strictly under the label 'Recorded observations (GBIF)'
and never misrepresent it as historical or ecological native range.
"""

from __future__ import annotations

import argparse
import datetime
import importlib
import json
import logging
import re
import sys
import time
from pathlib import Path
from typing import Any

import requests
from requests.adapters import HTTPAdapter
from urllib3.util import Retry

# Ensure repo root and ml directory are in sys.path
SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

# Dynamic import of 01_download_images (starts with digit)
try:
    downloader = importlib.import_module("01_download_images")
    resolve_species_taxon = downloader.resolve_species_taxon
    load_species_list = downloader.load_species_list
    make_slug = downloader.make_slug
except Exception as exc:
    raise ImportError(
        f"Could not import functions from 01_download_images.py: {exc}"
    ) from exc

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("build_distribution")

USER_AGENT = (
    "PlantSpeciesClassifierBot/1.0 (academic botanical research; contact: none)"
)
GBIF_API_BASE = "https://api.gbif.org/v1"
DISTRIBUTION_LABEL = "Recorded observations (GBIF)"
DATA_SOURCE = "GBIF"

# ---------------------------------------------------------------------------
# Canonical Indian Administrative Entities (28 States + 8 Union Territories)
# ---------------------------------------------------------------------------
CANONICAL_INDIAN_STATES: list[str] = [
    # 28 States
    "Andhra Pradesh",
    "Arunachal Pradesh",
    "Assam",
    "Bihar",
    "Chhattisgarh",
    "Goa",
    "Gujarat",
    "Haryana",
    "Himachal Pradesh",
    "Jharkhand",
    "Karnataka",
    "Kerala",
    "Madhya Pradesh",
    "Maharashtra",
    "Manipur",
    "Meghalaya",
    "Mizoram",
    "Nagaland",
    "Odisha",
    "Punjab",
    "Rajasthan",
    "Sikkim",
    "Tamil Nadu",
    "Telangana",
    "Tripura",
    "Uttar Pradesh",
    "Uttarakhand",
    "West Bengal",
    # 8 Union Territories
    "Andaman and Nicobar Islands",
    "Chandigarh",
    "Dadra and Nagar Haveli and Daman and Diu",
    "Delhi",
    "Jammu and Kashmir",
    "Ladakh",
    "Lakshadweep",
    "Puducherry",
]

# Canonical lookup mapping normalized strings to official Indian States / UTs.
INDIAN_STATE_ALIASES: dict[str, str] = {
    # Andhra Pradesh
    "andhra pradesh": "Andhra Pradesh",
    "andhrapradesh": "Andhra Pradesh",
    "andhra": "Andhra Pradesh",
    "ap": "Andhra Pradesh",
    # Arunachal Pradesh
    "arunachal pradesh": "Arunachal Pradesh",
    "arunachalpradesh": "Arunachal Pradesh",
    "arunachal": "Arunachal Pradesh",
    # Assam
    "assam": "Assam",
    "asom": "Assam",
    # Bihar
    "bihar": "Bihar",
    # Chhattisgarh
    "chhattisgarh": "Chhattisgarh",
    "chattisgarh": "Chhattisgarh",
    "chhatisgarh": "Chhattisgarh",
    "cg": "Chhattisgarh",
    # Goa
    "goa": "Goa",
    # Gujarat
    "gujarat": "Gujarat",
    "gujrat": "Gujarat",
    # Haryana
    "haryana": "Haryana",
    "haryan": "Haryana",
    "hr": "Haryana",
    # Himachal Pradesh
    "himachal pradesh": "Himachal Pradesh",
    "himachalpradesh": "Himachal Pradesh",
    "himachal": "Himachal Pradesh",
    "hp": "Himachal Pradesh",
    # Jharkhand
    "jharkhand": "Jharkhand",
    "jharkand": "Jharkhand",
    # Karnataka
    "karnataka": "Karnataka",
    "karnatka": "Karnataka",
    "mysore": "Karnataka",
    # Kerala
    "kerala": "Kerala",
    # Madhya Pradesh
    "madhya pradesh": "Madhya Pradesh",
    "madhyapradesh": "Madhya Pradesh",
    "mp": "Madhya Pradesh",
    # Maharashtra
    "maharashtra": "Maharashtra",
    "maharastra": "Maharashtra",
    "mh": "Maharashtra",
    # Manipur
    "manipur": "Manipur",
    # Meghalaya
    "meghalaya": "Meghalaya",
    # Mizoram
    "mizoram": "Mizoram",
    # Nagaland
    "nagaland": "Nagaland",
    # Odisha
    "odisha": "Odisha",
    "orissa": "Odisha",
    # Punjab
    "punjab": "Punjab",
    "punjap": "Punjab",
    "pb": "Punjab",
    # Rajasthan
    "rajasthan": "Rajasthan",
    "rajastan": "Rajasthan",
    "rj": "Rajasthan",
    # Sikkim
    "sikkim": "Sikkim",
    # Tamil Nadu
    "tamil nadu": "Tamil Nadu",
    "tamilnadu": "Tamil Nadu",
    "tamil nad": "Tamil Nadu",
    "tn": "Tamil Nadu",
    "madras": "Tamil Nadu",
    # Telangana
    "telangana": "Telangana",
    "telengana": "Telangana",
    "ts": "Telangana",
    "tg": "Telangana",
    # Tripura
    "tripura": "Tripura",
    # Uttar Pradesh
    "uttar pradesh": "Uttar Pradesh",
    "uttarpradesh": "Uttar Pradesh",
    "up": "Uttar Pradesh",
    # Uttarakhand
    "uttarakhand": "Uttarakhand",
    "uttaranchal": "Uttarakhand",
    "uttranchal": "Uttarakhand",
    "uk": "Uttarakhand",
    # West Bengal
    "west bengal": "West Bengal",
    "westbengal": "West Bengal",
    "wb": "West Bengal",
    "w bengal": "West Bengal",
    "bengal": "West Bengal",
    # Andaman and Nicobar Islands
    "andaman and nicobar islands": "Andaman and Nicobar Islands",
    "andaman and nicobar": "Andaman and Nicobar Islands",
    "andaman & nicobar": "Andaman and Nicobar Islands",
    "andaman & nicobar islands": "Andaman and Nicobar Islands",
    "andaman and nicobar island": "Andaman and Nicobar Islands",
    "a & n islands": "Andaman and Nicobar Islands",
    "andaman": "Andaman and Nicobar Islands",
    "nicobar": "Andaman and Nicobar Islands",
    # Chandigarh
    "chandigarh": "Chandigarh",
    # Dadra and Nagar Haveli and Daman and Diu
    "dadra and nagar haveli and daman and diu": "Dadra and Nagar Haveli and Daman and Diu",
    "dadra & nagar haveli and daman & diu": "Dadra and Nagar Haveli and Daman and Diu",
    "daman and diu": "Dadra and Nagar Haveli and Daman and Diu",
    "daman & diu": "Dadra and Nagar Haveli and Daman and Diu",
    "dadra and nagar haveli": "Dadra and Nagar Haveli and Daman and Diu",
    "dadra & nagar haveli": "Dadra and Nagar Haveli and Daman and Diu",
    "daman": "Dadra and Nagar Haveli and Daman and Diu",
    "diu": "Dadra and Nagar Haveli and Daman and Diu",
    "dnh": "Dadra and Nagar Haveli and Daman and Diu",
    # Delhi
    "delhi": "Delhi",
    "nct of delhi": "Delhi",
    "nct delhi": "Delhi",
    "national capital territory of delhi": "Delhi",
    "new delhi": "Delhi",
    "dl": "Delhi",
    # Jammu and Kashmir
    "jammu and kashmir": "Jammu and Kashmir",
    "jammu & kashmir": "Jammu and Kashmir",
    "jammu and kashmir state": "Jammu and Kashmir",
    "j&k": "Jammu and Kashmir",
    "jk": "Jammu and Kashmir",
    # Ladakh
    "ladakh": "Ladakh",
    # Lakshadweep
    "lakshadweep": "Lakshadweep",
    "laccadive": "Lakshadweep",
    # Puducherry
    "puducherry": "Puducherry",
    "pondicherry": "Puducherry",
    "py": "Puducherry",
}


def normalize_indian_state(raw_name: str | None) -> str | None:
    """Conservatively match messy free-text state strings to canonical Indian States/UTs.

    Returns the canonical state name if an exact or known alias match is found.
    Returns None if the value cannot be matched without guessing.
    """
    if not raw_name:
        return None

    cleaned = raw_name.strip().lower()
    if cleaned in ("none", "null", "unknown", "india", "unspecified", "undefined"):
        return None

    # Strip punctuation and normalize whitespace
    cleaned = re.sub(r"[^\w\s&]", " ", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()

    return INDIAN_STATE_ALIASES.get(cleaned)


def create_polite_session() -> requests.Session:
    """Create a requests session with retries, exponential backoff, and research user-agent."""
    session = requests.Session()
    session.headers.update({"User-Agent": USER_AGENT})

    retries = Retry(
        total=4,
        backoff_factor=1.2,
        status_forcelist=[429, 500, 502, 503, 504],
        raise_on_status=False,
    )
    adapter = HTTPAdapter(max_retries=retries)
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    return session


def load_country_name_map(session: requests.Session, cache_dir: Path) -> dict[str, str]:
    """Load ISO-3166 2-letter country code -> English country name mapping from GBIF or cache."""
    cache_file = cache_dir / "gbif_country_names.json"
    if cache_file.exists():
        try:
            with open(cache_file, mode="r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Failed to read country cache: %s. Re-fetching...", exc)

    logger.info("Fetching ISO country title enumeration from GBIF...")
    country_map: dict[str, str] = {}
    try:
        resp = session.get(f"{GBIF_API_BASE}/enumeration/country", timeout=15)
        if resp.status_code == 200:
            for item in resp.json():
                iso2 = item.get("iso2")
                title = item.get("title")
                if iso2 and title:
                    country_map[iso2] = title
            cache_dir.mkdir(parents=True, exist_ok=True)
            with open(cache_file, mode="w", encoding="utf-8") as f:
                json.dump(country_map, f, indent=2, ensure_ascii=False)
            logger.info("Cached %d country titles from GBIF.", len(country_map))
            return country_map
    except Exception as exc:  # noqa: BLE001
        logger.warning(
            "Could not fetch country names from GBIF: %s. Using default fallback map.",
            exc,
        )

    # Basic fallback if offline
    return {
        "IN": "India",
        "NP": "Nepal",
        "BD": "Bangladesh",
        "TH": "Thailand",
        "MM": "Myanmar",
        "LK": "Sri Lanka",
        "PK": "Pakistan",
        "ID": "Indonesia",
        "MY": "Malaysia",
        "VN": "Vietnam",
        "US": "United States",
        "GB": "United Kingdom",
        "AU": "Australia",
    }


def query_gbif_occurrence_facets(
    session: requests.Session,
    taxon_key: int,
    polite_delay: float = 0.35,
) -> tuple[int, list[dict[str, Any]], list[int]]:
    """Query GBIF for global occurrence count, country breakdown, and 12-month seasonality."""
    url = f"{GBIF_API_BASE}/occurrence/search"
    params: dict[str, Any] = {
        "taxonKey": taxon_key,
        "hasCoordinate": "true",
        "hasGeospatialIssue": "false",
        "occurrenceStatus": "PRESENT",
        "limit": 0,
        "facet": ["country", "month"],
        "country.facetLimit": 250,
        "month.facetLimit": 20,
    }

    for attempt in range(3):
        try:
            time.sleep(polite_delay)
            resp = session.get(url, params=params, timeout=20)
            resp.raise_for_status()
            data = resp.json()

            total_records = int(data.get("count", 0))

            # Extract facets
            facets = data.get("facets", [])
            country_raw_counts: list[dict[str, Any]] = []
            months: list[int] = [0] * 12

            for facet in facets:
                field = facet.get("field", "").upper()
                counts = facet.get("counts", [])

                if field == "COUNTRY":
                    country_raw_counts = counts
                elif field == "MONTH":
                    for item in counts:
                        try:
                            month_num = int(item.get("name", 0))
                            if 1 <= month_num <= 12:
                                months[month_num - 1] = int(item.get("count", 0))
                        except (ValueError, TypeError):
                            continue

            return total_records, country_raw_counts, months

        except requests.RequestException as exc:
            delay = 2**attempt
            logger.warning(
                "GBIF global facet query attempt %d failed for taxon %d: %s. Retrying in %ds...",
                attempt + 1,
                taxon_key,
                exc,
                delay,
            )
            time.sleep(delay)

    logger.error(
        "Failed to query global GBIF facets for taxon %d after 3 attempts.", taxon_key
    )
    return 0, [], [0] * 12


def query_gbif_indian_state_facets(
    session: requests.Session,
    taxon_key: int,
    polite_delay: float = 0.35,
) -> tuple[list[dict[str, Any]], float, int, int]:
    """Query GBIF for Indian state/province breakdown and normalize against canonical states.

    Returns:
        (india_states, match_rate_pct, matched_count, total_raw_count)
    """
    url = f"{GBIF_API_BASE}/occurrence/search"
    params: dict[str, Any] = {
        "taxonKey": taxon_key,
        "country": "IN",
        "hasCoordinate": "true",
        "hasGeospatialIssue": "false",
        "occurrenceStatus": "PRESENT",
        "limit": 0,
        "facet": "stateProvince",
        "stateProvince.facetLimit": 250,
    }

    for attempt in range(3):
        try:
            time.sleep(polite_delay)
            resp = session.get(url, params=params, timeout=20)
            resp.raise_for_status()
            data = resp.json()

            facets = data.get("facets", [])
            state_counts: dict[str, int] = {}
            total_raw_count = 0
            matched_count = 0
            dropped_samples: list[str] = []

            for facet in facets:
                if facet.get("field", "").upper() == "STATE_PROVINCE":
                    for item in facet.get("counts", []):
                        raw_name = str(item.get("name", "")).strip()
                        count = int(item.get("count", 0))
                        total_raw_count += count

                        matched_state = normalize_indian_state(raw_name)
                        if matched_state:
                            state_counts[matched_state] = (
                                state_counts.get(matched_state, 0) + count
                            )
                            matched_count += count
                        else:
                            if (
                                raw_name.lower() not in ("none", "null", "unknown")
                                and len(dropped_samples) < 5
                            ):
                                dropped_samples.append(f"'{raw_name}' ({count})")

            match_rate = (
                (matched_count / total_raw_count * 100.0)
                if total_raw_count > 0
                else 0.0
            )

            if dropped_samples:
                logger.debug(
                    "Taxon %d dropped unmatched state strings: %s",
                    taxon_key,
                    ", ".join(dropped_samples),
                )

            # Sort descending by count
            sorted_states = [
                {"name": s, "count": c}
                for s, c in sorted(
                    state_counts.items(), key=lambda x: x[1], reverse=True
                )
            ]

            return sorted_states, match_rate, matched_count, total_raw_count

        except requests.RequestException as exc:
            delay = 2**attempt
            logger.warning(
                "GBIF India state facet query attempt %d failed for taxon %d: %s. Retrying in %ds...",
                attempt + 1,
                taxon_key,
                exc,
                delay,
            )
            time.sleep(delay)

    logger.error(
        "Failed to query India state facets for taxon %d after 3 attempts.", taxon_key
    )
    return [], 0.0, 0, 0


def build_species_distribution_record(
    species_row: dict[str, str],
    session: requests.Session,
    country_names: dict[str, str],
    cache_dir: Path,
    refresh: bool = False,
    polite_delay: float = 0.35,
) -> dict[str, Any] | None:
    """Build or load from cache the distribution record for a single species."""
    species_id = int(species_row["id"])
    scientific_name = species_row["scientific_name"].strip()
    common_name = species_row["common_name"].strip()
    slug = make_slug(scientific_name)

    cache_file = cache_dir / f"{species_id}_{slug}.json"

    if cache_file.exists() and not refresh:
        try:
            with open(cache_file, mode="r", encoding="utf-8") as f:
                cached_data = json.load(f)
                logger.info(
                    "[CACHE] Species %d (%s) loaded from cache (total: %d records).",
                    species_id,
                    scientific_name,
                    cached_data.get("total", 0),
                )
                return cached_data
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "Cache read failed for species %d: %s. Querying GBIF...",
                species_id,
                exc,
            )

    logger.info("Resolving GBIF taxon key for '%s'...", scientific_name)
    taxon_key, accepted_name = resolve_species_taxon(session, scientific_name)

    if not taxon_key:
        logger.error(
            "Could not resolve GBIF taxon key for species %d (%s). Skipping.",
            species_id,
            scientific_name,
        )
        return None

    logger.info(
        "Querying GBIF facets for '%s' (Taxon Key: %d)...", accepted_name, taxon_key
    )
    total_records, raw_countries, months = query_gbif_occurrence_facets(
        session, taxon_key, polite_delay=polite_delay
    )

    india_states, match_rate, matched_count, raw_state_count = (
        query_gbif_indian_state_facets(session, taxon_key, polite_delay=polite_delay)
    )

    logger.info(
        "Species %d (%s): India state match rate: %.1f%% (%d / %d records matched to canonical states).",
        species_id,
        scientific_name,
        match_rate,
        matched_count,
        raw_state_count,
    )

    # Format countries list
    countries: list[dict[str, Any]] = []
    for item in raw_countries:
        code = str(item.get("name", "")).strip().upper()
        count = int(item.get("count", 0))
        if code:
            countries.append(
                {
                    "code": code,
                    "name": country_names.get(code, code),
                    "count": count,
                }
            )
    countries.sort(key=lambda x: x["count"], reverse=True)

    record: dict[str, Any] = {
        "species_id": species_id,
        "scientific_name": scientific_name,
        "common_name": common_name,
        "total": total_records,
        "countries": countries,
        "india_states": india_states,
        "months": months,
        "generated_at": datetime.datetime.now(datetime.UTC).isoformat(),
        "source": DATA_SOURCE,
        "label": DISTRIBUTION_LABEL,
    }

    # Save individual species cache
    try:
        cache_dir.mkdir(parents=True, exist_ok=True)
        with open(cache_file, mode="w", encoding="utf-8") as f:
            json.dump(record, f, indent=2, ensure_ascii=False)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Failed to write cache for species %d: %s", species_id, exc)

    return record


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Aggregate coarse recorded botanical occurrence distribution data from GBIF facets."
    )
    parser.add_argument(
        "--species-ids",
        type=str,
        default=None,
        help="Comma-separated or space-separated species IDs to process (e.g., '0,1,2').",
    )
    parser.add_argument(
        "--limit-species",
        type=int,
        default=None,
        help="Maximum number of species to process.",
    )
    parser.add_argument(
        "--refresh",
        action="store_true",
        help="Bypass local cache and re-query GBIF APIs.",
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=REPO_ROOT / "web" / "public" / "data" / "species_distribution.json",
        help="Output JSON file path (default: web/public/data/species_distribution.json).",
    )
    parser.add_argument(
        "--species-list",
        type=Path,
        default=SCRIPT_DIR / "species_list.csv",
        help="Path to species list CSV (default: ml/species_list.csv).",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=0.35,
        help="Polite delay between GBIF API calls in seconds (default: 0.35s).",
    )

    args = parser.parse_args()

    # Load species list
    species_list = load_species_list(args.species_list)
    logger.info(
        "Loaded %d candidate species from %s", len(species_list), args.species_list
    )

    # Filter species by IDs if requested
    if args.species_ids:
        raw_ids = [
            s.strip() for s in re.split(r"[\s,]+", args.species_ids) if s.strip()
        ]
        target_ids = {int(x) for x in raw_ids if x.isdigit()}
        species_list = [s for s in species_list if int(s["id"]) in target_ids]
        logger.info(
            "Filtered to %d target species: %s", len(species_list), sorted(target_ids)
        )

    # Apply limit if requested
    if args.limit_species and args.limit_species > 0:
        species_list = species_list[: args.limit_species]
        logger.info("Limited run to %d species.", len(species_list))

    session = create_polite_session()
    cache_dir = SCRIPT_DIR / "data" / "cache" / "distribution"
    cache_dir.mkdir(parents=True, exist_ok=True)

    country_names = load_country_name_map(session, SCRIPT_DIR / "data" / "cache")

    # Load existing consolidated output if present to allow incremental updates
    consolidated_data: dict[str, Any] = {
        "version": "1.0",
        "generated_at": datetime.datetime.now(datetime.UTC).isoformat(),
        "label": DISTRIBUTION_LABEL,
        "source": DATA_SOURCE,
        "species": {},
    }

    out_file: Path = args.out
    if out_file.exists():
        try:
            with open(out_file, mode="r", encoding="utf-8") as f:
                existing = json.load(f)
                if isinstance(existing, dict) and "species" in existing:
                    consolidated_data["species"] = existing["species"]
                    logger.info(
                        "Loaded %d existing species records from %s",
                        len(existing["species"]),
                        out_file,
                    )
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "Could not read existing consolidated file %s: %s", out_file, exc
            )

    processed_count = 0
    for row in species_list:
        sid = row["id"]
        rec = build_species_distribution_record(
            species_row=row,
            session=session,
            country_names=country_names,
            cache_dir=cache_dir,
            refresh=args.refresh,
            polite_delay=args.delay,
        )
        if rec:
            consolidated_data["species"][str(sid)] = rec
            processed_count += 1

    # Update top-level timestamp
    consolidated_data["generated_at"] = datetime.datetime.now(datetime.UTC).isoformat()

    # Save to consolidated output
    out_file.parent.mkdir(parents=True, exist_ok=True)
    with open(out_file, mode="w", encoding="utf-8") as f:
        json.dump(consolidated_data, f, indent=2, ensure_ascii=False)

    logger.info(
        "Successfully wrote distribution data for %d species (%d in file) to %s.",
        processed_count,
        len(consolidated_data["species"]),
        out_file,
    )


if __name__ == "__main__":
    main()
