"""Run the fork audit for one policy across histories, executors, arms and repeats. Logs JSONL.

Usage: python3 -m harness.run --policy llm --n-hist 16 --reps 2 --locks 0 3 --out runs/main.jsonl
"""
from __future__ import annotations

import argparse
import hashlib
import json
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import numpy as np

from .sim import Fixed, Myopic, Sticky, Trigger, make_histories, rival_cut_gain, run_branch, warmup

ARMS = ("noop", "cut", "raise")


def make_policy(name: str, args):
    if name == "llm":
        from .llm import LLMPolicy
        return LLMPolicy(model=args.model, temperature=args.temperature, disclose_lock=0, max_tokens=args.max_tokens,
                         variant=args.variant)
    return {"fixed": Fixed(), "myopic": Myopic(), "sticky0.3": Sticky(0.3), "sticky0.6": Sticky(0.6),
            "trigger": Trigger()}[name]


def run_history(hist, args, emit, done) -> None:
    """Warm up once, then fork every (lock, arm, rep) branch; emit rows as they finish.

    `done` holds already-logged keys so an interrupted run resumes. A resumed history
    re-uses its logged warm-up checkpoint instead of sampling a new one.
    """
    policy = make_policy(args.policy, args)
    rng = np.random.default_rng(1000 + hist.k)
    tag = (args.policy, args.model, args.variant, bool(args.disclose))
    if ("warmup", args.policy, args.model, hist.k) in done:  # warm-ups are shared across prompt variants
        w = done[("warmup", args.policy, args.model, hist.k)]
        from .sim import Checkpoint
        ckpt = Checkpoint(history=w["history"], focal_price=w["focal_price"], policy_state=w.get("state", {}),
                          t0=len(w["history"]))
    else:
        ckpt = warmup(policy, hist, rng)
        emit({"kind": "warmup", "policy": args.policy, "model": args.model, "k": hist.k, "base": hist.base,
              "history": ckpt.history, "focal_price": ckpt.focal_price, "state": ckpt.policy_state,
              "rival_cut_gain": rival_cut_gain(hist, ckpt.focal_price)})
    for rep in range(args.reps):
        for lock in args.locks:
            for arm in ARMS:
                if ("branch", *tag, hist.k, lock, arm, rep) in done:
                    continue
                if args.disclose:  # agent is told the platform rule for this executor
                    policy.disclose_lock = lock if lock > 1 else 0
                try:
                    branch = run_branch(policy, ckpt, hist, arm, lock, args.n_cont, rng)
                except RuntimeError as e:  # no valid price after retries: log it, never fill in a price
                    emit({"kind": "failed", "policy": args.policy, "model": args.model, "k": hist.k,
                          "lock": lock, "arm": arm, "rep": rep, "disclose": bool(args.disclose),
                          "error": str(e)[:300]})
                    continue
                emit({"kind": "branch", "policy": args.policy, "model": args.model, "k": hist.k,
                      "base": hist.base, "lock": lock, "arm": arm, "rep": rep,
                      "disclose": bool(args.disclose), "branch": branch})


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--policy", default="llm")
    ap.add_argument("--model", default="Qwen/Qwen3-235B-A22B-Instruct-2507")
    ap.add_argument("--temperature", type=float, default=0.7)
    ap.add_argument("--n-hist", type=int, default=16)
    ap.add_argument("--hist", type=int, nargs="*", help="subset of history indices")
    ap.add_argument("--reps", type=int, default=2)
    ap.add_argument("--locks", type=int, nargs="+", default=[0, 3])
    ap.add_argument("--n-cont", type=int, default=8)
    ap.add_argument("--disclose", action="store_true")
    ap.add_argument("--max-tokens", type=int, default=200)
    ap.add_argument("--variant", default="base", choices=["base", "intent", "audited"])
    ap.add_argument("--workers", type=int, default=8)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()

    hists = make_histories(args.n_hist)
    if args.hist:
        hists = [hists[i] for i in args.hist]
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    done = {}
    if out.exists():
        for line in out.read_text().splitlines():
            r = json.loads(line)
            if r["kind"] == "failed":  # retried on resume
                continue
            # resume key includes the agent, so different policies sharing one file never skip each other
            tag = (r["policy"], r["model"], r.get("variant", "base"), bool(r.get("disclose")))
            key = (("warmup", r["policy"], r["model"], r["k"]) if r["kind"] == "warmup"
                   else ("branch", *tag, r["k"], r["lock"], r["arm"], r["rep"]))
            done[key] = r
    lock, n, t0 = threading.Lock(), [0], time.time()
    prev = [json.loads(out.read_text().splitlines()[-1]).get("hash", "") if out.exists() and out.stat().st_size else ""]
    total = len(hists) * len(args.locks) * len(ARMS) * args.reps

    with out.open("a") as f:
        def emit(row):
            with lock:
                # tamper-evident log: each row commits to the previous row's hash
                row["variant"] = args.variant
                row["prev_hash"] = prev[0]
                row["hash"] = hashlib.sha256((prev[0] + json.dumps(row, sort_keys=True)).encode()).hexdigest()
                prev[0] = row["hash"]
                f.write(json.dumps(row) + "\n")
                f.flush()
                if row["kind"] == "branch":
                    n[0] += 1
                    if n[0] % 20 == 0 or n[0] == total:
                        print(f"{n[0]}/{total} new branches, {time.time() - t0:.0f}s", flush=True)

        with ThreadPoolExecutor(args.workers) as pool:
            for fut in [pool.submit(run_history, h, args, emit, done) for h in hists]:
                fut.result()
    print("finished", flush=True)


if __name__ == "__main__":
    main()
