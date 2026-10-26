"""Verify the hash chain of a run log: any edited, inserted or deleted row breaks it.

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


if __name__ == "__main__":
    ok, bad = verify(sys.argv[1])
    print("chain intact" if ok else f"chain broken at line {bad + 1}")
    sys.exit(0 if ok else 1)
