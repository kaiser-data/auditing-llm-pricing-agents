"""Summarise fork-audit runs: R and theta for published and proposed prices, per policy.

Usage: python3 -m harness.analyze runs/controls.jsonl runs/main.jsonl --out results/summary.json
"""
from __future__ import annotations

import argparse
import json
from collections import defaultdict
from pathlib import Path

import numpy as np

from .metrics import paired_bootstrap, response
from .sim import replay


def load(paths, with_replay: bool = True):
    rows = []
    for p in paths:
        rows += [json.loads(l) for l in Path(p).read_text().splitlines() if l.strip()]
    for r in rows:  # keep prompt variants apart: they share policy and model
        tag = r.get("variant", "base")
        if r.get("disclose"):
            tag = "disclose"
        if tag != "base" and not r["model"].endswith(f"[{tag}]"):
            r["model"] = f"{r['model']} [{tag}]"
    if with_replay:
        rows += replay_rows(rows)
    return rows


def replay_rows(rows):
    """Open-loop reference: immediate-execution proposals pushed through each tested rule."""
    tested = {r["lock"] for r in rows if r["kind"] == "branch"} - {0, 1}
    out = []
    for r in rows:
        if r["kind"] == "branch" and r["lock"] == 0:
            m = f"{r['model']} [replay]"
            out.append({**r, "model": m})
            for lock in tested:
                phase = r["k"] % -lock if lock < 0 else 0
                out.append({**r, "model": m, "lock": lock, "branch": replay(r["branch"], lock, phase)})
    return out


def per_history(rows, key: str, arm: str = "cut"):
    """{(policy, model): {k: {lock: R averaged over repeats}}}; repeats paired by index."""
    by = defaultdict(lambda: defaultdict(lambda: defaultdict(dict)))
    for r in rows:
        if r["kind"] == "branch":
            by[(r["policy"], r["model"])][(r["k"], r["lock"])][r["arm"]][r["rep"]] = r["branch"]
    sign = 1 if arm == "cut" else -1
    out = defaultdict(lambda: defaultdict(dict))
    for pm, cells in by.items():
        for (k, lock), arms in cells.items():
            if arm not in arms or "noop" not in arms:
                continue
            vals = [response(arms["noop"][rep], arms[arm][rep], key, sign) for rep in arms[arm] if rep in arms["noop"]]
            if vals:  # a cell with no complete matched pair is missing, not NaN
                out[pm][k][lock] = float(np.mean(vals))
    return out


def sham(rows, key: str):
    """No-op vs no-op across repeats: the response an audit sees from sampling noise alone."""
    by = defaultdict(lambda: defaultdict(dict))
    for r in rows:
        if r["kind"] == "branch" and r["arm"] == "noop":
            by[(r["policy"], r["model"])][(r["k"], r["lock"])][r["rep"]] = r["branch"]
    out = defaultdict(lambda: defaultdict(dict))
    for pm, cells in by.items():
        for (k, lock), reps in cells.items():
            if 0 in reps and 1 in reps:
                out[pm][k][lock] = response(reps[0], reps[1], key)
    return out


def summarise(rows):
    res = {}
    for key in ("published", "proposed"):
        for arm in ("cut", "raise"):
            for pm, hs in per_history(rows, key, arm).items():
                locks = sorted({l for v in hs.values() for l in v})
                d = res.setdefault(f"{pm[0]}|{pm[1]}", {}).setdefault(f"{key}_{arm}", {"n_hist": len(hs)})
                for l in locks:
                    d[f"R{l}"] = paired_bootstrap([hs[k][l] for k in hs if l in hs[k]])
                for l in locks:
                    if l != 0 and 0 in locks:
                        name = "theta" if l == 3 else f"theta_noon{-l}" if l < 0 else f"theta_L{l}"
                        d[name] = paired_bootstrap([hs[k][l] - hs[k][0] for k in hs if l in hs[k] and 0 in hs[k]])
        for pm, hs in sham(rows, key).items():
            d = res.setdefault(f"{pm[0]}|{pm[1]}", {}).setdefault(f"{key}_sham", {"n_hist": len(hs)})
            for l in sorted({l for v in hs.values() for l in v}):
                d[f"R{l}"] = paired_bootstrap([hs[k][l] for k in hs if l in hs[k]])
    return res


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("paths", nargs="+")
    ap.add_argument("--out")
    args = ap.parse_args()
    res = summarise(load(args.paths))
    for pm, d in res.items():
        print(f"\n== {pm}")
        for name, s in d.items():
            cells = "  ".join(f"{k}={v[0]:+.3f}[{v[1]:+.3f},{v[2]:+.3f}]" for k, v in s.items() if k != "n_hist")
            print(f"  {name:18s} n={s['n_hist']:2d}  {cells}")
    if args.out:
        Path(args.out).parent.mkdir(parents=True, exist_ok=True)
        Path(args.out).write_text(json.dumps(res, indent=1))


if __name__ == "__main__":
    main()
