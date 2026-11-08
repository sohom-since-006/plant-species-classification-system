"""check_candidates.py - Check botanical candidate species on GBIF & iNaturalist.

For scientific names provided via command-line arguments or an input text file,
queries the GBIF species match API, resolves synonyms to their accepted taxa,
and queries the iNaturalist Research-grade Observations dataset for occurrences
that contain images under approved licenses (CC0, CC-BY, CC-BY-NC) using limit=0.
Reuses networking and filter parameters from 01_download_images.py.
"""

from __future__ import annotations

import argparse
import importlib
import logging
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import requests
from requests.adapters import HTTPAdapter

SCRIPT_DIR = Path(__file__).resolve().parent
ML_DIR = SCRIPT_DIR.parent if SCRIPT_DIR.name == "tools" else SCRIPT_DIR
if str(ML_DIR) not in sys.path:
    sys.path.insert(0, str(ML_DIR))

# Dynamic import of 01_download_images (module starts with digits)
try:
    downloader = importlib.import_module("01_download_images")
    USER_AGENT = downloader.USER_AGENT
    GBIF_API_BASE = downloader.GBIF_API_BASE
    ALLOWED_GBIF_LICENSES = downloader.ALLOWED_GBIF_LICENSES
    get_inaturalist_dataset_key = downloader.get_inaturalist_dataset_key
    get_occurrence_image_count = downloader.get_occurrence_image_count
except Exception as exc:
    raise ImportError(
        f"Could not import components from 01_download_images.py: {exc}"
    ) from exc

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("check_candidates")


@dataclass
class CandidateResult:
    """Evaluation result for a candidate botanical name."""

    input_name: str
    match_type: str
    status: str
    usage_key: int | None
    accepted_key: int | None
    query_key: int | None
    matched_name: str
    accepted_name: str
    occurrence_count: int


def resolve_candidate(
    session: requests.Session,
    dataset_key: str,
    name: str,
    delay: float = 0.12,
) -> CandidateResult:
    """Resolve candidate name against GBIF match API and query available image occurrences."""
    time.sleep(delay)
    match_url = f"{GBIF_API_BASE}/species/match"

    data: dict[str, Any] = {}
    for strict in ["true", "false"]:
        try:
            resp = session.get(
                match_url, params={"name": name, "strict": strict}, timeout=15
            )
            resp.raise_for_status()
            match_data = resp.json()
            if match_data.get("matchType") != "NONE":
                data = match_data
                break
        except requests.RequestException as exc:
            logger.warning(
                "Match query failed for '%s' (strict=%s): %s", name, strict, exc
            )

    match_type = str(data.get("matchType", "NONE"))
    status = str(data.get("status", "UNKNOWN"))
    matched_name = str(data.get("scientificName", name))
    usage_key = data.get("usageKey")
    accepted_key = data.get("acceptedUsageKey") or data.get("acceptedKey")

    accepted_name = matched_name
    query_key = usage_key

    # If synonym or doubtful with an acceptedKey and exact match, query through acceptedKey
    if match_type == "EXACT" and status in ("SYNONYM", "DOUBTFUL") and accepted_key:
        query_key = accepted_key
        accepted_name = data.get("species") or data.get("canonicalName") or matched_name
        time.sleep(delay)
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
    elif status == "ACCEPTED" and data.get("scientificName"):
        accepted_name = str(data.get("scientificName"))

    # Count occurrences in iNaturalist research-grade dataset under allowed licenses
    occurrence_count = 0
    if query_key is not None:
        time.sleep(delay)
        occurrence_count = get_occurrence_image_count(
            session=session,
            dataset_key=dataset_key,
            taxon_key=int(query_key),
            licenses=ALLOWED_GBIF_LICENSES,
        )

    return CandidateResult(
        input_name=name,
        match_type=match_type,
        status=status,
        usage_key=usage_key,
        accepted_key=accepted_key,
        query_key=query_key,
        matched_name=matched_name,
        accepted_name=accepted_name,
        occurrence_count=occurrence_count,
    )


def format_table(results: list[CandidateResult]) -> str:
    """Format candidate results into a markdown-compatible table."""
    headers = [
        "Candidate Name",
        "GBIF Taxon Key",
        "Status",
        "Match Type",
        "Accepted / Matched Name",
        "Image Occurrences",
    ]

    rows: list[list[str]] = []
    for r in results:
        key_str = str(r.query_key) if r.query_key is not None else "None"
        if r.status in ("SYNONYM", "DOUBTFUL") and r.accepted_key:
            key_str = f"{r.query_key} (acc)"

        rows.append(
            [
                r.input_name,
                key_str,
                r.status,
                r.match_type,
                r.accepted_name,
                f"{r.occurrence_count:,}",
            ]
        )

    # Compute column widths
    widths = [len(h) for h in headers]
    for row in rows:
        for idx, cell in enumerate(row):
            widths[idx] = max(widths[idx], len(cell))

    def make_line(cells: list[str]) -> str:
        return "| " + " | ".join(c.ljust(widths[i]) for i, c in enumerate(cells)) + " |"

    def make_sep() -> str:
        return "|-" + "-|-".join("-" * widths[i] for i in range(len(headers))) + "-|"

    output_lines = [
        make_line(headers),
        make_sep(),
    ]
    for row in rows:
        output_lines.append(make_line(row))

    return "\n".join(output_lines)


def parse_args() -> argparse.Namespace:
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description="Check candidate botanical species on GBIF & iNaturalist (count-only)."
    )
    parser.add_argument(
        "names",
        nargs="*",
        help="One or more scientific names to evaluate.",
    )
    parser.add_argument(
        "--file",
        "-f",
        type=Path,
        default=None,
        help="Path to a text file with scientific names (one per line).",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=0.12,
        help="Delay in seconds between GBIF API calls (default 0.12s).",
    )
    return parser.parse_args()


def main() -> None:
    """Run candidate evaluation."""
    args = parse_args()

    candidates: list[str] = list(args.names)
    if args.file:
        if not args.file.exists():
            logger.error("Candidate file not found: %s", args.file)
            sys.exit(1)
        with open(args.file, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#"):
                    candidates.append(line)

    if not candidates:
        logger.warning(
            "No candidate names provided. Pass names as arguments or via --file."
        )
        sys.exit(0)

    # Setup polite requests session
    session = requests.Session()
    session.headers.update({"User-Agent": USER_AGENT})
    adapter = HTTPAdapter(pool_connections=4, pool_maxsize=4, max_retries=2)
    session.mount("https://", adapter)
    session.mount("http://", adapter)

    logger.info("Resolving iNaturalist Research-grade Observations dataset key...")
    dataset_key = get_inaturalist_dataset_key(session)

    logger.info("Evaluating %d candidate name(s)...", len(candidates))
    results: list[CandidateResult] = []
    for name in candidates:
        res = resolve_candidate(session, dataset_key, name, delay=args.delay)
        results.append(res)
        logger.info(
            "Checked: %-25s -> Key: %-10s Status: %-10s Count: %5d (%s)",
            res.input_name,
            str(res.query_key),
            res.status,
            res.occurrence_count,
            res.accepted_name,
        )

    print("\n" + format_table(results) + "\n")


if __name__ == "__main__":
    main()
