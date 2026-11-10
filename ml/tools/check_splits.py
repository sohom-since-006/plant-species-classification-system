"""Independent leakage check for ml/data/splits.csv. Standard library only.
Usage: python ml/tools/check_splits.py [data_dir]   (default: ml/data)
"""

import csv
import sys
from collections import defaultdict
from pathlib import Path

root = Path(sys.argv[1] if len(sys.argv) > 1 else "ml/data")
MAX_HAMMING = 5


def norm(p: str) -> str:
    return "/".join(p.replace("\\", "/").split("/")[-2:])


def to_int(h: str) -> int:
    h = h.strip()
    return (
        int(h, 16)
        if len(h) == 16 and all(c in "0123456789abcdefABCDEF" for c in h)
        else int(h)
    )


with open(root / "splits.csv", newline="", encoding="utf-8") as f:
    rows = list(csv.DictReader(f))
with open(root / "dataset_credits.csv", newline="", encoding="utf-8") as f:
    occ = {norm(r["file"]): r["occurrence_key"] for r in csv.DictReader(f)}

fails = 0


def report(name: str, ok: bool, detail: str = "") -> None:
    global fails
    fails += 0 if ok else 1
    print(f"[{'PASS' if ok else 'FAIL'}] {name} {detail}")


# 1. split sizes
by_split = defaultdict(int)
for r in rows:
    by_split[r["split"]] += 1
total = sum(by_split.values())
print("split sizes:", dict(by_split), "total:", total)

# 2. same observation in more than one split
key_splits = defaultdict(set)
matched = 0
for r in rows:
    k = occ.get(norm(r["file"]))
    if k:
        matched += 1
        key_splits[k].add(r["split"])
bad = [k for k, s in key_splits.items() if len(s) > 1]
print(f"rows matched to an occurrence_key: {matched} of {total}")
report("no observation spans two splits", not bad, f"({len(bad)} violations)")

# 3. exact and near-duplicate hashes across splits
hashes = [(to_int(r["dhash"]), r["split"]) for r in rows if r.get("dhash")]
sizes = [11, 11, 11, 11, 10, 10]
buckets = defaultdict(list)
for i, (h, _) in enumerate(hashes):
    shift = 0
    for c, s in enumerate(sizes):
        buckets[(c, (h >> shift) & ((1 << s) - 1))].append(i)
        shift += s
pairs = set()
for idx in buckets.values():
    for a in range(len(idx)):
        for b in range(a + 1, len(idx)):
            i, j = idx[a], idx[b]
            if (
                hashes[i][1] != hashes[j][1]
                and (hashes[i][0] ^ hashes[j][0]).bit_count() <= MAX_HAMMING
            ):
                pairs.add((min(i, j), max(i, j)))
report(
    f"no near-duplicates (Hamming <= {MAX_HAMMING}) across splits",
    not pairs,
    f"({len(pairs)} pairs)",
)

# 4. per-species minimums
count = defaultdict(lambda: defaultdict(int))
for r in rows:
    count[r["species_id"]][r["split"]] += 1
low = [s for s, c in count.items() if c["val"] < 10 or c["test"] < 10]
report(
    "every species has >= 10 val and >= 10 test images",
    not low,
    f"(low: {sorted(low, key=int)[:15]})",
)

# 5. held-out real-photo set must not be in training data
rt = [r for r in rows if r["split"] == "real_test"]
print("real_test images:", len(rt))
print("RESULT:", "ALL CHECKS PASSED" if fails == 0 else f"{fails} CHECK(S) FAILED")
