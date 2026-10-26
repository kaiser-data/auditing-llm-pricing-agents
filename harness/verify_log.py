"""Verify the hash chain of a run log: an edited, inserted or deleted hashed row breaks it.

Rows written before hashing was added carry no hash and are NOT covered; the CLI reports how many rows are.
The chain checks internal consistency only: it cannot detect a deleted tail or a fully recomputed chain.

Usage: python3 -m harness.verify_log runs/intent_qwen.jsonl
"""
import hashlib
import json
import sys


def verify(path: str) -> tuple[bool, int]:
    prev = ""
    for i, line in enumerate(open(path)):
        row = json.loads(line)
        if "hash" not in row:
            continue  # rows written before hashing was added
        h = row.pop("hash")
        if row["prev_hash"] != prev:
            return False, i
        if hashlib.sha256((prev + json.dumps(row, sort_keys=True)).encode()).hexdigest() != h:
            return False, i
        prev = h
    return True, -1


def coverage(path: str) -> tuple[int, int]:
    rows = [json.loads(line) for line in open(path)]
    return sum("hash" in r for r in rows), len(rows)


if __name__ == "__main__":
    ok, bad = verify(sys.argv[1])
    hashed, total = coverage(sys.argv[1])
    print(f"chain intact for {hashed}/{total} hashed rows" if ok else f"chain broken at line {bad + 1}")
    sys.exit(0 if ok else 1)
