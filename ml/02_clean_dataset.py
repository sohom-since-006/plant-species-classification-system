"""02_clean_dataset.py - Dataset sanitization, deduplication, and leakage-proof splitting.

Performs quality filtering, 64-bit dHash perceptual deduplication using Multi-Index
Hashing, occurrence-level and near-duplicate cluster grouping via Union-Find, and
stratified 80/10/10 train/val/test splitting per species.

Outputs:
  - ml/data/splits.csv: manifest of kept images with assigned split and group_id
  - ml/data/cleaning_report.json: detailed report of removals, counts, and cross-species duplicates
  - web/public/data/dataset_stats.json: dashboard analytics (images per species, origin split, families)
"""

from __future__ import annotations

import argparse
import concurrent.futures
import csv
import datetime
import hashlib
import io
import json
import logging
import random
import shutil
import sys
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image

try:
    from tqdm import tqdm
except ImportError:

    def tqdm(iterable: Any, *args: Any, **kwargs: Any) -> Any:  # type: ignore[no-redef]
        return iterable


logger = logging.getLogger("clean_dataset")

# Default parameter contracts
DEFAULT_SEED = 42
DEFAULT_HAMMING_THRESHOLD = 5
DEFAULT_MIN_SIZE = 160
DEFAULT_MAX_ASPECT_RATIO = 4.0
MIN_VAL_PER_SPECIES = 10
MIN_TEST_PER_SPECIES = 10
MIN_KEPT_PER_SPECIES = 150
DEFAULT_WORKERS = 8

# Multi-index hashing chunk configuration for 64-bit hashes (k <= 5 bits)
# 6 chunks guarantee at least one identical chunk by Pigeonhole Principle (64 = 4x11 + 2x10)
MIH_CHUNKS: list[tuple[int, int]] = [
    (0, 0x7FF),  # bits 0..10 (11 bits)
    (11, 0x7FF),  # bits 11..21 (11 bits)
    (22, 0x7FF),  # bits 22..32 (11 bits)
    (33, 0x7FF),  # bits 33..43 (11 bits)
    (44, 0x3FF),  # bits 44..53 (10 bits)
    (54, 0x3FF),  # bits 54..63 (10 bits)
]


class UnionFind:
    """Disjoint-set data structure with path compression and rank optimization."""

    def __init__(self) -> None:
        self.parent: dict[str, str] = {}
        self.rank: dict[str, int] = {}

    def find(self, x: str) -> str:
        """Find the representative root of element x with path compression."""
        if x not in self.parent:
            self.parent[x] = x
            self.rank[x] = 0
            return x

        root = x
        while self.parent[root] != root:
            root = self.parent[root]

        # Path compression
        curr = x
        while curr != root:
            nxt = self.parent[curr]
            self.parent[curr] = root
            curr = nxt

        return root

    def union(self, x: str, y: str) -> None:
        """Union the sets containing x and y by rank."""
        rx = self.find(x)
        ry = self.find(y)
        if rx == ry:
            return

        if self.rank[rx] < self.rank[ry]:
            rx, ry = ry, rx

        self.parent[ry] = rx
        if self.rank[rx] == self.rank[ry]:
            self.rank[rx] += 1


class MultiIndexHash:
    """Multi-Index Hashing (MIH) index for fast sub-Hamming distance lookups on 64-bit hashes."""

    def __init__(self, chunk_defs: list[tuple[int, int]] | None = None) -> None:
        self.chunk_defs = chunk_defs or MIH_CHUNKS
        self.tables: list[dict[int, list[int]]] = [{} for _ in self.chunk_defs]

    def add(self, index: int, h: int) -> None:
        """Index an image hash under each chunk."""
        for c_idx, (shift, mask) in enumerate(self.chunk_defs):
            chunk_val = (h >> shift) & mask
            self.tables[c_idx].setdefault(chunk_val, []).append(index)

    def find_all_near_duplicate_pairs(
        self, hashes: list[int], max_dist: int = DEFAULT_HAMMING_THRESHOLD
    ) -> list[tuple[int, int, int]]:
        """Find all pairs (i, j) with i < j whose Hamming distance is <= max_dist."""
        candidate_pairs: set[tuple[int, int]] = set()

        for table in self.tables:
            for idxs in table.values():
                if len(idxs) > 1:
                    for i in range(len(idxs)):
                        for j in range(i + 1, len(idxs)):
                            u, v = idxs[i], idxs[j]
                            if u > v:
                                u, v = v, u
                            candidate_pairs.add((u, v))

        results: list[tuple[int, int, int]] = []
        for u, v in candidate_pairs:
            dist = (hashes[u] ^ hashes[v]).bit_count()
            if dist <= max_dist:
                results.append((u, v, dist))

        # Sort for determinism
        results.sort(key=lambda item: (item[0], item[1]))
        return results


@dataclass
class ImageScanResult:
    """Represents the raw inspection outcome of a single image file."""

    file_path: Path
    relative_path: str
    species_id: int
    source: str  # 'gbif' | 'custom' | 'real_test'
    status: str  # 'ok' | 'corrupt' | 'small' | 'aspect_ratio' | 'exact_duplicate'
    sha256: str | None = None
    dhash: int | None = None
    width: int | None = None
    height: int | None = None
    occurrence_key: str | None = None


def compute_dhash(img: Image.Image) -> int:
    """Calculate a 64-bit difference hash (dHash) for a PIL Image.

    Resizes to 9x8 grayscale, evaluates row-wise adjacent horizontal pixel differences,
    and returns a 64-bit integer.
    """
    gray = img.convert("L").resize((9, 8), Image.Resampling.BILINEAR)
    arr = np.asarray(gray)
    diff = arr[:, :-1] > arr[:, 1:]
    return int.from_bytes(np.packbits(diff).tobytes(), byteorder="big")


def inspect_single_image(
    file_path: Path,
    relative_path: str,
    species_id: int,
    source: str,
    occurrence_key: str | None,
    min_size: int = DEFAULT_MIN_SIZE,
    max_aspect_ratio: float = DEFAULT_MAX_ASPECT_RATIO,
) -> ImageScanResult:
    """Read and validate image bytes, check dimensions and aspect ratio, and compute dHash."""
    try:
        raw_bytes = file_path.read_bytes()
        if len(raw_bytes) == 0:
            return ImageScanResult(
                file_path=file_path,
                relative_path=relative_path,
                species_id=species_id,
                source=source,
                status="corrupt",
                occurrence_key=occurrence_key,
            )

        sha = hashlib.sha256(raw_bytes).hexdigest()

        with Image.open(io.BytesIO(raw_bytes)) as img:
            w, h = img.size
            if min(w, h) < min_size:
                return ImageScanResult(
                    file_path=file_path,
                    relative_path=relative_path,
                    species_id=species_id,
                    source=source,
                    status="small",
                    sha256=sha,
                    width=w,
                    height=h,
                    occurrence_key=occurrence_key,
                )

            ratio = max(w, h) / min(w, h)
            if ratio > max_aspect_ratio:
                return ImageScanResult(
                    file_path=file_path,
                    relative_path=relative_path,
                    species_id=species_id,
                    source=source,
                    status="aspect_ratio",
                    sha256=sha,
                    width=w,
                    height=h,
                    occurrence_key=occurrence_key,
                )

            dhash_val = compute_dhash(img)

        return ImageScanResult(
            file_path=file_path,
            relative_path=relative_path,
            species_id=species_id,
            source=source,
            status="ok",
            sha256=sha,
            dhash=dhash_val,
            width=w,
            height=h,
            occurrence_key=occurrence_key,
        )
    except Exception:  # noqa: BLE001
        return ImageScanResult(
            file_path=file_path,
            relative_path=relative_path,
            species_id=species_id,
            source=source,
            status="corrupt",
            occurrence_key=occurrence_key,
        )


def load_species_list(species_list_csv: Path) -> dict[int, dict[str, str]]:
    """Load taxonomy and metadata records from species_list.csv."""
    species_info: dict[int, dict[str, str]] = {}
    if not species_list_csv.exists():
        logger.warning("Species list file not found at %s", species_list_csv.resolve())
        return species_info

    with open(species_list_csv, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                sid = int(row["id"])
                species_info[sid] = row
            except (ValueError, KeyError):
                continue
    return species_info


def load_credits_map(credits_csv: Path) -> dict[str, str]:
    """Map normalized relative file paths to GBIF occurrence_key from dataset_credits.csv."""
    credits_map: dict[str, str] = {}
    if not credits_csv.exists():
        logger.info(
            "Credits CSV %s does not exist; continuing with per-file occurrence grouping.",
            credits_csv,
        )
        return credits_map

    with open(credits_csv, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            file_rel = row.get("file", "").replace("\\", "/").strip()
            occ_key = row.get("occurrence_key", "").strip()
            if file_rel and occ_key:
                credits_map[file_rel] = occ_key
    return credits_map


def discover_files(
    data_dir: Path,
) -> list[tuple[Path, str, int, str]]:
    """Discover all botanical candidate images across raw/, extra/, and real_test/ directories.

    Returns: list of (file_path, relative_path, species_id, source).
    """
    candidates: list[tuple[Path, str, int, str]] = []
    supported_exts = {".jpg", ".jpeg", ".png", ".webp"}

    # 1. Standard raw dataset (GBIF)
    raw_dir = data_dir / "raw"
    if raw_dir.exists():
        for sp_dir in sorted(raw_dir.iterdir()):
            if sp_dir.is_dir():
                try:
                    sid = int(sp_dir.name.split("_", 1)[0])
                except (ValueError, IndexError):
                    continue
                for f in sorted(sp_dir.iterdir()):
                    if f.is_file() and f.suffix.lower() in supported_exts:
                        rel = f.relative_to(data_dir).as_posix()
                        candidates.append((f, rel, sid, "gbif"))

    # 2. Optional extra training images (custom)
    extra_dir = data_dir / "extra"
    if extra_dir.exists():
        for sp_dir in sorted(extra_dir.iterdir()):
            if sp_dir.is_dir():
                try:
                    sid = int(sp_dir.name.split("_", 1)[0])
                except (ValueError, IndexError):
                    continue
                for f in sorted(sp_dir.iterdir()):
                    if f.is_file() and f.suffix.lower() in supported_exts:
                        rel = f.relative_to(data_dir).as_posix()
                        candidates.append((f, rel, sid, "custom"))

    # 3. Held-out real test images
    real_test_dir = data_dir / "real_test"
    if real_test_dir.exists():
        for sp_dir in sorted(real_test_dir.iterdir()):
            if sp_dir.is_dir():
                try:
                    sid = int(sp_dir.name.split("_", 1)[0])
                except (ValueError, IndexError):
                    continue
                for f in sorted(sp_dir.iterdir()):
                    if f.is_file() and f.suffix.lower() in supported_exts:
                        rel = f.relative_to(data_dir).as_posix()
                        candidates.append((f, rel, sid, "real_test"))

    # Sort deterministically
    candidates.sort(key=lambda x: x[1])
    return candidates


def scan_dataset(
    candidates: list[tuple[Path, str, int, str]],
    credits_map: dict[str, str],
    min_size: int = DEFAULT_MIN_SIZE,
    max_aspect_ratio: float = DEFAULT_MAX_ASPECT_RATIO,
    num_workers: int = DEFAULT_WORKERS,
) -> tuple[
    list[ImageScanResult],
    list[ImageScanResult],
    list[dict[str, Any]],
]:
    """Inspect and filter candidates across threads, detecting corrupt, small, aspect, and exact duplicates.

    Returns: (kept_images, rejected_images, cross_species_exact_duplicates).
    """
    logger.info("Scanning %d images with %d workers...", len(candidates), num_workers)

    tasks: list[tuple[Path, str, int, str, str | None]] = []
    for f_path, rel_path, sid, source in candidates:
        occ_key = credits_map.get(rel_path)
        tasks.append((f_path, rel_path, sid, source, occ_key))

    scan_results: list[ImageScanResult] = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=num_workers) as executor:
        futures = [
            executor.submit(
                inspect_single_image,
                task[0],
                task[1],
                task[2],
                task[3],
                task[4],
                min_size,
                max_aspect_ratio,
            )
            for task in tasks
        ]
        pbar = tqdm(
            concurrent.futures.as_completed(futures),
            total=len(futures),
            desc="Inspecting images",
            unit="img",
        )
        for fut in pbar:
            scan_results.append(fut.result())

    # Sort results back into deterministic relative path order
    scan_results.sort(key=lambda r: r.relative_path)

    # Process exact byte duplicates deterministically
    seen_byte_hashes: dict[str, tuple[str, int]] = {}  # sha -> (rel_path, species_id)
    kept_images: list[ImageScanResult] = []
    rejected_images: list[ImageScanResult] = []
    cross_species_exact_dupes: list[dict[str, Any]] = []

    for res in scan_results:
        if res.status != "ok":
            rejected_images.append(res)
            continue

        assert res.sha256 is not None
        if res.sha256 in seen_byte_hashes:
            orig_path, orig_sid = seen_byte_hashes[res.sha256]
            res.status = "exact_duplicate"
            rejected_images.append(res)
            if orig_sid != res.species_id:
                cross_species_exact_dupes.append(
                    {
                        "original_file": orig_path,
                        "original_species_id": orig_sid,
                        "duplicate_file": res.relative_path,
                        "duplicate_species_id": res.species_id,
                        "type": "exact_byte_duplicate",
                    }
                )
        else:
            seen_byte_hashes[res.sha256] = (res.relative_path, res.species_id)
            kept_images.append(res)

    logger.info(
        "Scan complete: %d kept, %d rejected (%d corrupt, %d small, %d aspect_ratio, %d exact_duplicate)",
        len(kept_images),
        len(rejected_images),
        sum(1 for r in rejected_images if r.status == "corrupt"),
        sum(1 for r in rejected_images if r.status == "small"),
        sum(1 for r in rejected_images if r.status == "aspect_ratio"),
        sum(1 for r in rejected_images if r.status == "exact_duplicate"),
    )
    return kept_images, rejected_images, cross_species_exact_dupes


@dataclass
class GroupInfo:
    """Botanical observation group metadata used for leakage-proof stratified splitting."""

    group_id: int
    images: list[ImageScanResult]
    species_counts: dict[int, int]
    allow_test: bool = True


def cluster_and_group(
    kept_images: list[ImageScanResult],
    hamming_threshold: int = DEFAULT_HAMMING_THRESHOLD,
) -> tuple[
    dict[str, int],  # relative_path -> group_id
    list[dict[str, Any]],  # cross_species_near_duplicates
    list[tuple[int, int, int]],  # near_duplicate_pairs
]:
    """Form initial groups and cluster near-duplicates with Union-Find via MultiIndexHash."""
    # Separate held-out real_test images (they do not participate in train/val/test groups)
    train_pool = [r for r in kept_images if r.source != "real_test"]

    # Initial group keys: occurrence_key for GBIF, or extra_{rel_path} for custom, or file_{rel_path}
    image_initial_groups: list[str] = []
    for r in train_pool:
        if r.source == "custom":
            image_initial_groups.append(f"extra_{r.relative_path}")
        elif r.occurrence_key:
            image_initial_groups.append(f"occ_{r.occurrence_key}")
        else:
            image_initial_groups.append(f"file_{r.relative_path}")

    uf = UnionFind()
    for g_key in image_initial_groups:
        uf.find(g_key)

    # Multi-index hashing for fast Hamming distance <= threshold
    mih = MultiIndexHash()
    hashes: list[int] = []
    for idx, r in enumerate(train_pool):
        assert r.dhash is not None
        hashes.append(r.dhash)
        mih.add(idx, r.dhash)

    logger.info(
        "Clustering near-duplicates across %d training-pool images (Hamming <= %d)...",
        len(train_pool),
        hamming_threshold,
    )
    nd_pairs = mih.find_all_near_duplicate_pairs(hashes, max_dist=hamming_threshold)
    logger.info("Identified %d near-duplicate pairs.", len(nd_pairs))

    cross_species_near_dupes: list[dict[str, Any]] = []
    for u, v, dist in nd_pairs:
        img_u, img_v = train_pool[u], train_pool[v]
        g_u, g_v = image_initial_groups[u], image_initial_groups[v]

        if img_u.species_id != img_v.species_id:
            cross_species_near_dupes.append(
                {
                    "file1": img_u.relative_path,
                    "species_id1": img_u.species_id,
                    "file2": img_v.relative_path,
                    "species_id2": img_v.species_id,
                    "hamming_distance": dist,
                    "type": "near_duplicate_cluster",
                }
            )

        # Merge groups connected by near-duplicate clusters
        uf.union(g_u, g_v)

    # Assign contiguous deterministic group IDs to roots
    unique_roots = sorted({uf.find(g) for g in image_initial_groups})
    root_to_gid = {root: i for i, root in enumerate(unique_roots)}

    image_to_gid: dict[str, int] = {}
    for r, g_key in zip(train_pool, image_initial_groups):
        image_to_gid[r.relative_path] = root_to_gid[uf.find(g_key)]

    return image_to_gid, cross_species_near_dupes, nd_pairs


def split_groups_stratified(
    kept_images: list[ImageScanResult],
    image_to_gid: dict[str, int],
    seed: int = DEFAULT_SEED,
) -> tuple[
    dict[str, str],  # relative_path -> split
    dict[str, int],  # split -> count
    list[dict[str, Any]],  # flagged species
]:
    """Perform deterministic group-level stratified 80/10/10 split per species."""
    # Group images by group_id
    groups_map: dict[int, list[ImageScanResult]] = defaultdict(list)
    for r in kept_images:
        if r.source == "real_test":
            continue
        gid = image_to_gid[r.relative_path]
        groups_map[gid].append(r)

    # Build GroupInfo records
    group_records: list[GroupInfo] = []
    for gid, imgs in groups_map.items():
        sp_counts: dict[int, int] = Counter(img.species_id for img in imgs)
        # Custom extra photos can only be train/val, never test
        allow_test = not any(img.source == "custom" for img in imgs)
        group_records.append(
            GroupInfo(
                group_id=gid,
                images=imgs,
                species_counts=sp_counts,
                allow_test=allow_test,
            )
        )

    # Calculate target counts per species
    total_per_species: dict[int, int] = defaultdict(int)
    for g in group_records:
        for sid, count in g.species_counts.items():
            total_per_species[sid] += count

    targets: dict[int, dict[str, int]] = {}
    for sid, total in total_per_species.items():
        if total < (MIN_VAL_PER_SPECIES + MIN_TEST_PER_SPECIES):
            t_val = max(1, total // 3)
            t_test = max(1, total // 3)
            t_train = total - t_val - t_test
        else:
            t_val = max(MIN_VAL_PER_SPECIES, round(total * 0.10))
            t_test = max(MIN_TEST_PER_SPECIES, round(total * 0.10))
            t_train = total - t_val - t_test
        targets[sid] = {"train": t_train, "val": t_val, "test": t_test}

    current: dict[int, dict[str, int]] = {
        sid: {"train": 0, "val": 0, "test": 0} for sid in total_per_species
    }
    group_split_assignment: dict[int, str] = {}

    # Sort groups deterministically for reproducible assignment
    # 1. Multi-species groups first so they satisfy deficits before single-species fill quotas
    # 2. Stable shuffle with seeded RNG
    rng = random.Random(seed)
    sorted_groups = sorted(group_records, key=lambda g: g.group_id)
    rng.shuffle(sorted_groups)
    sorted_groups.sort(key=lambda g: len(g.species_counts) > 1, reverse=True)

    for g in sorted_groups:
        test_needed = g.allow_test and any(
            current[s]["test"] < targets[s]["test"] for s in g.species_counts
        )
        val_needed = any(
            current[s]["val"] < targets[s]["val"] for s in g.species_counts
        )

        if test_needed and not val_needed:
            chosen = "test"
        elif val_needed and not test_needed:
            chosen = "val"
        elif test_needed and val_needed:
            test_deficit = sum(
                max(0, targets[s]["test"] - current[s]["test"])
                for s in g.species_counts
            )
            val_deficit = sum(
                max(0, targets[s]["val"] - current[s]["val"]) for s in g.species_counts
            )
            chosen = "test" if test_deficit >= val_deficit else "val"
        else:
            chosen = "train"

        group_split_assignment[g.group_id] = chosen
        for s, count in g.species_counts.items():
            current[s][chosen] += count

    # Map individual file paths to splits
    file_to_split: dict[str, str] = {}
    for r in kept_images:
        if r.source == "real_test":
            file_to_split[r.relative_path] = "real_test"
        else:
            gid = image_to_gid[r.relative_path]
            file_to_split[r.relative_path] = group_split_assignment[gid]

    # Calculate overall split sizes
    split_sizes: dict[str, int] = Counter(file_to_split.values())

    # Check minimums per species and flag if under threshold
    flagged_species: list[dict[str, Any]] = []
    for sid, counts in sorted(current.items()):
        val_c = counts["val"]
        test_c = counts["test"]
        if val_c < MIN_VAL_PER_SPECIES or test_c < MIN_TEST_PER_SPECIES:
            flagged_species.append(
                {
                    "species_id": sid,
                    "val_count": val_c,
                    "test_count": test_c,
                    "min_required": 10,
                    "warning": f"Species {sid} does not satisfy split minimums (val={val_c}, test={test_c})",
                }
            )

    return file_to_split, split_sizes, flagged_species


def check_real_test_duplicates(
    kept_images: list[ImageScanResult],
    file_to_split: dict[str, str],
    hamming_threshold: int = DEFAULT_HAMMING_THRESHOLD,
) -> list[dict[str, Any]]:
    """Compare held-out real_test photos against training photos to flag potential contamination."""
    real_test_imgs = [r for r in kept_images if r.source == "real_test"]
    train_imgs = [
        r
        for r in kept_images
        if r.source != "real_test" and file_to_split.get(r.relative_path) == "train"
    ]

    if not real_test_imgs or not train_imgs:
        return []

    logger.info(
        "Checking %d real_test images against %d train images for duplicate leakage...",
        len(real_test_imgs),
        len(train_imgs),
    )
    matches: list[dict[str, Any]] = []
    for r_img in real_test_imgs:
        assert r_img.dhash is not None
        for t_img in train_imgs:
            assert t_img.dhash is not None
            dist = (r_img.dhash ^ t_img.dhash).bit_count()
            if dist <= hamming_threshold:
                matches.append(
                    {
                        "real_test_file": r_img.relative_path,
                        "real_test_species_id": r_img.species_id,
                        "train_file": t_img.relative_path,
                        "train_species_id": t_img.species_id,
                        "hamming_distance": dist,
                    }
                )

    return matches


def build_dashboard_stats(
    kept_images: list[ImageScanResult],
    file_to_split: dict[str, str],
    species_info: dict[int, dict[str, str]],
) -> dict[str, Any]:
    """Generate exact metrics for web/public/data/dataset_stats.json without fabricating data."""
    # Split sizes (excluding held-out real_test from the 3 standard training partitions)
    split_sizes = {
        "train": sum(1 for s in file_to_split.values() if s == "train"),
        "val": sum(1 for s in file_to_split.values() if s == "val"),
        "test": sum(1 for s in file_to_split.values() if s == "test"),
    }

    # Images per species after cleaning
    per_species_kept = Counter(r.species_id for r in kept_images)
    images_per_species: list[dict[str, Any]] = []
    for sid in sorted(species_info.keys()):
        sp_meta = species_info[sid]
        common = sp_meta.get("common_name", f"Species_{sid}")
        images_per_species.append(
            {
                "species": common,
                "count": per_species_kept.get(sid, 0),
            }
        )

    # Indian vs Global breakdown (from species_list.csv)
    origin_counter: Counter[str] = Counter()
    for sp_meta in species_info.values():
        origin = sp_meta.get("origin", "").strip()
        if origin:
            origin_counter[origin] += 1

    indian_vs_global = [
        {"name": "Native (Indian)", "value": origin_counter.get("Native", 0)},
        {
            "name": "Introduced (Global)",
            "value": origin_counter.get("Introduced", 0),
        },
        {"name": "Invasive", "value": origin_counter.get("Invasive", 0)},
    ]

    # Botanical family breakdown (ranked descending)
    family_counter: Counter[str] = Counter()
    for sp_meta in species_info.values():
        fam = sp_meta.get("family", "").strip()
        if fam:
            family_counter[fam] += 1

    family_breakdown = [
        {"family": fam, "count": count} for fam, count in family_counter.most_common()
    ]

    return {
        "split_sizes": split_sizes,
        "images_per_species": images_per_species,
        "indian_vs_global": indian_vs_global,
        "family_breakdown": family_breakdown,
        "total_images": len(kept_images),
        "total_species": len(species_info),
        "generated_at": datetime.datetime.now(datetime.UTC).isoformat(),
    }


def execute_cleaning_pipeline(
    data_dir: Path,
    species_list_csv: Path,
    credits_csv: Path,
    web_stats_json: Path,
    seed: int = DEFAULT_SEED,
    min_size: int = DEFAULT_MIN_SIZE,
    max_aspect_ratio: float = DEFAULT_MAX_ASPECT_RATIO,
    hamming_threshold: int = DEFAULT_HAMMING_THRESHOLD,
    num_workers: int = DEFAULT_WORKERS,
    dry_run: bool = False,
) -> tuple[dict[str, Any], dict[str, Any]]:
    """Execute the full dataset cleaning, deduplication, grouping, and split pipeline."""
    species_info = load_species_list(species_list_csv)
    credits_map = load_credits_map(credits_csv)
    candidates = discover_files(data_dir)

    if not candidates:
        logger.warning("No candidate images discovered in %s", data_dir)
        empty_report: dict[str, Any] = {
            "error": "No images discovered",
            "dry_run": dry_run,
        }
        return empty_report, {}

    # 1. Quality Filters & Exact Duplicate Detection
    kept_images, rejected_images, cross_species_exact_dupes = scan_dataset(
        candidates,
        credits_map,
        min_size=min_size,
        max_aspect_ratio=max_aspect_ratio,
        num_workers=num_workers,
    )

    # 2. Near-duplicate Clustering via Union-Find & MIH
    image_to_gid, cross_species_near_dupes, _nd_pairs = cluster_and_group(
        kept_images, hamming_threshold=hamming_threshold
    )

    # 3. Stratified Split (80/10/10) per species
    file_to_split, split_sizes, flagged_minimums = split_groups_stratified(
        kept_images, image_to_gid, seed=seed
    )

    # 4. Check held-out real_test photos against train
    held_out_dupes = check_real_test_duplicates(
        kept_images, file_to_split, hamming_threshold=hamming_threshold
    )

    # Combine all cross-species duplicate reports
    all_cross_species_dupes = cross_species_exact_dupes + cross_species_near_dupes

    # 5. Build Cleaning Report
    counts_removed = {
        "corrupt": sum(1 for r in rejected_images if r.status == "corrupt"),
        "small": sum(1 for r in rejected_images if r.status == "small"),
        "aspect_ratio": sum(1 for r in rejected_images if r.status == "aspect_ratio"),
        "exact_duplicate": sum(
            1 for r in rejected_images if r.status == "exact_duplicate"
        ),
        "total_rejected": len(rejected_images),
    }

    per_species_before: dict[int, int] = Counter(c[2] for c in candidates)
    per_species_after: dict[int, int] = Counter(r.species_id for r in kept_images)

    per_species_counts: dict[str, dict[str, Any]] = {}
    species_under_150: list[dict[str, Any]] = []

    for sid in sorted(set(per_species_before.keys()) | set(species_info.keys())):
        common = species_info.get(sid, {}).get("common_name", f"Species_{sid}")
        scientific = species_info.get(sid, {}).get("scientific_name", "Unknown")
        before = per_species_before.get(sid, 0)
        after = per_species_after.get(sid, 0)
        removed = before - after

        per_species_counts[str(sid)] = {
            "species_id": sid,
            "common_name": common,
            "scientific_name": scientific,
            "before": before,
            "after": after,
            "removed": removed,
        }

        if after < MIN_KEPT_PER_SPECIES:
            species_under_150.append(
                {
                    "species_id": sid,
                    "common_name": common,
                    "scientific_name": scientific,
                    "kept_count": after,
                    "minimum_threshold": MIN_KEPT_PER_SPECIES,
                }
            )

    report: dict[str, Any] = {
        "dry_run": dry_run,
        "seed": seed,
        "generated_at": datetime.datetime.now(datetime.UTC).isoformat(),
        "total_scanned": len(candidates),
        "total_kept": len(kept_images),
        "counts_removed": counts_removed,
        "split_sizes": dict(split_sizes),
        "per_species_counts": per_species_counts,
        "species_under_150": species_under_150,
        "cross_species_duplicates": all_cross_species_dupes,
        "flagged_species_split_minimum": flagged_minimums,
        "held_out_real_test_duplicates": held_out_dupes,
    }

    # 6. Generate Dashboard Stats
    dataset_stats = build_dashboard_stats(kept_images, file_to_split, species_info)

    # 7. Apply Changes or Print Dry-Run
    if dry_run:
        logger.info("[DRY-RUN MODE] No files were moved or written to disk.")
    else:
        # Move rejected files to ml/data/rejected/<reason>/<species_dir>/<file>
        rejected_dir = data_dir / "rejected"
        for r in rejected_images:
            species_dir_name = r.file_path.parent.name
            dest_dir = rejected_dir / r.status / species_dir_name
            dest_dir.mkdir(parents=True, exist_ok=True)
            dest_file = dest_dir / r.file_path.name
            if dest_file.exists():
                dest_file.unlink()
            shutil.move(str(r.file_path), str(dest_file))

        # Write ml/data/splits.csv
        splits_csv = data_dir / "splits.csv"
        splits_csv.parent.mkdir(parents=True, exist_ok=True)
        with open(splits_csv, mode="w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(
                ["file", "species_id", "split", "group_id", "dhash", "source"]
            )
            for r in kept_images:
                rel = r.relative_path
                split = file_to_split[rel]
                gid = image_to_gid.get(rel, -1)
                assert r.dhash is not None
                dhash_hex = f"{r.dhash:016x}"
                writer.writerow([rel, r.species_id, split, gid, dhash_hex, r.source])

        # Write ml/data/cleaning_report.json
        report_file = data_dir / "cleaning_report.json"
        with open(report_file, mode="w", encoding="utf-8") as f:
            json.dump(report, f, indent=2, ensure_ascii=False)

        # Write web/public/data/dataset_stats.json
        web_stats_json.parent.mkdir(parents=True, exist_ok=True)
        with open(web_stats_json, mode="w", encoding="utf-8") as f:
            json.dump(dataset_stats, f, indent=2, ensure_ascii=False)

        logger.info(
            "Saved manifest %s, report %s, and web stats %s",
            splits_csv,
            report_file,
            web_stats_json,
        )

    return report, dataset_stats


def print_cleaning_report(report: dict[str, Any]) -> None:
    """Print an exhaustive, human-readable terminal summary of the cleaning pass."""
    mode_str = "DRY-RUN (CHANGES NOTHING)" if report.get("dry_run") else "LIVE PASS"
    print("\n" + "=" * 70)
    print(f" BOTANICAL DATASET CLEANING REPORT [{mode_str}]")
    print("=" * 70)

    print(f"Total Scanned Images:  {report.get('total_scanned', 0)}")
    print(f"Total Kept Images:     {report.get('total_kept', 0)}")
    print(
        f"Total Removed Images:  {report.get('counts_removed', {}).get('total_rejected', 0)}"
    )

    print("\n--- REMOVAL BREAKDOWN ---")
    rem = report.get("counts_removed", {})
    print(f"  • Corrupt / unreadable:    {rem.get('corrupt', 0)}")
    print(f"  • Shorter side < 160 px:   {rem.get('small', 0)}")
    print(f"  • Extreme aspect (> 4:1):  {rem.get('aspect_ratio', 0)}")
    print(f"  • Exact byte duplicates:   {rem.get('exact_duplicate', 0)}")

    print("\n--- DATASET SPLIT SIZES ---")
    splits = report.get("split_sizes", {})
    total_splits = sum(splits.values())
    for s_name, s_count in splits.items():
        pct = (s_count / total_splits * 100) if total_splits > 0 else 0
        print(f"  • {s_name:<10}: {s_count:>6} images ({pct:5.1f}%)")

    under_150 = report.get("species_under_150", [])
    print(f"\n--- SPECIES UNDER 150 KEPT IMAGES ({len(under_150)}) ---")
    if under_150:
        for sp in under_150[:10]:
            print(
                f"  [ID {sp['species_id']}] {sp['common_name']} ({sp['scientific_name']}): {sp['kept_count']} kept"
            )
        if len(under_150) > 10:
            print(f"  ... and {len(under_150) - 10} more species.")
    else:
        print("  None! All species meet the >= 150 kept images requirement.")

    cross_dupes = report.get("cross_species_duplicates", [])
    print(f"\n--- CROSS-SPECIES DUPLICATES ({len(cross_dupes)}) ---")
    if cross_dupes:
        for cd in cross_dupes[:10]:
            print(
                f"  • {cd['type']}: {cd.get('file1') or cd.get('original_file')} (sp {cd.get('species_id1') or cd.get('original_species_id')}) <-> "
                f"{cd.get('file2') or cd.get('duplicate_file')} (sp {cd.get('species_id2') or cd.get('duplicate_species_id')})"
            )
        if len(cross_dupes) > 10:
            print(f"  ... and {len(cross_dupes) - 10} more cross-species duplicates.")
    else:
        print("  None detected.")

    flagged_min = report.get("flagged_species_split_minimum", [])
    print(
        f"\n--- FLAGGED SPLIT MINIMUMS (<10 val or <10 test) ({len(flagged_min)}) ---"
    )
    if flagged_min:
        for fm in flagged_min:
            print(
                f"  • [ID {fm['species_id']}] val={fm['val_count']}, test={fm['test_count']}"
            )
    else:
        print("  All species satisfy the minimum 10 validation and 10 test images.")

    real_test_dupes = report.get("held_out_real_test_duplicates", [])
    if real_test_dupes:
        print(
            f"\n--- HELD-OUT REAL TEST DUPLICATES WITH TRAIN ({len(real_test_dupes)}) ---"
        )
        for rtd in real_test_dupes:
            print(
                f"  • {rtd['real_test_file']} matches train {rtd['train_file']} (dist={rtd['hamming_distance']})"
            )

    print("=" * 70 + "\n")


def setup_logger() -> None:
    """Configure terminal logging."""
    logger.setLevel(logging.INFO)
    logger.handlers.clear()
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(logging.INFO)
    fmt = logging.Formatter(
        "%(asctime)s [%(levelname)s] %(message)s", datefmt="%H:%M:%S"
    )
    handler.setFormatter(fmt)
    logger.addHandler(handler)


def main() -> None:
    """CLI entrypoint."""
    setup_logger()
    parser = argparse.ArgumentParser(
        description="Sanitize plant dataset, cluster near-duplicates, and create leakage-proof splits."
    )
    parser.add_argument(
        "--data-dir",
        type=Path,
        default=Path("ml/data"),
        help="Root path containing raw/, extra/, real_test/, rejected/ (default: ml/data)",
    )
    parser.add_argument(
        "--species-list",
        type=Path,
        default=Path("ml/species_list.csv"),
        help="Path to species_list.csv (default: ml/species_list.csv)",
    )
    parser.add_argument(
        "--credits-file",
        type=Path,
        default=Path("ml/data/dataset_credits.csv"),
        help="Path to dataset_credits.csv (default: ml/data/dataset_credits.csv)",
    )
    parser.add_argument(
        "--web-stats",
        type=Path,
        default=Path("web/public/data/dataset_stats.json"),
        help="Output path for web dashboard statistics (default: web/public/data/dataset_stats.json)",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=DEFAULT_SEED,
        help="Deterministic random seed (default: 42)",
    )
    parser.add_argument(
        "--workers",
        type=int,
        default=DEFAULT_WORKERS,
        help="Number of concurrent worker threads (default: 8)",
    )
    parser.add_argument(
        "--min-size",
        type=int,
        default=DEFAULT_MIN_SIZE,
        help="Minimum shorter side dimension in pixels (default: 160)",
    )
    parser.add_argument(
        "--max-aspect-ratio",
        type=float,
        default=DEFAULT_MAX_ASPECT_RATIO,
        help="Maximum allowed aspect ratio (default: 4.0)",
    )
    parser.add_argument(
        "--hamming-threshold",
        type=int,
        default=DEFAULT_HAMMING_THRESHOLD,
        help="Maximum Hamming distance for near-duplicate clustering (default: 5)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Execute inspection and splitting in memory without modifying files on disk.",
    )

    args = parser.parse_args()

    report, _ = execute_cleaning_pipeline(
        data_dir=args.data_dir,
        species_list_csv=args.species_list,
        credits_csv=args.credits_file,
        web_stats_json=args.web_stats,
        seed=args.seed,
        min_size=args.min_size,
        max_aspect_ratio=args.max_aspect_ratio,
        hamming_threshold=args.hamming_threshold,
        num_workers=args.workers,
        dry_run=args.dry_run,
    )

    print_cleaning_report(report)


if __name__ == "__main__":
    main()
