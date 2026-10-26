"""All numbers the paper cites, in one file.

Usage: python3 -m harness.report runs/controls.jsonl runs/main_qwen.jsonl [runs/disclose_qwen.jsonl] --out results/summary.json
"""
from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path

import numpy as np

from .analyze import load, per_history, summarise
from .metrics import paired_bootstrap


def decomposition(rows, pm: tuple[str, str], lock: int):
    """Closed-loop published theta minus open-loop replay theta, paired by history."""
    pub = per_history(rows, "published")
    real, repl = pub[pm], pub[(pm[0], pm[1] + " [replay]")]
    ks = [k for k in real if lock in real[k] and 0 in real[k] and k in repl and lock in repl[k]]
    th_real = np.array([real[k][lock] - real[k][0] for k in ks])
    th_repl = np.array([repl[k][lock] - repl[k][0] for k in ks])
    return {"n_hist": len(ks), "theta_closed": paired_bootstrap(th_real), "theta_replay": paired_bootstrap(th_repl),
            "adaptation": paired_bootstrap(th_real - th_repl),
            "replay_share": float(th_repl.mean() / th_real.mean()) if th_real.mean() else None}


def awareness(rows, model: str):
    """Price awareness without a rule, per history (bootstrap unit).

    slope: first reaction to the cut, (p_noop - p_cut)/shock at h=1; best response predicts 0.30.
    above_br: warm-up proposal minus the exact best response to the rival's previous price (EUR).
    delta: warm-up price on the Nash (0) to joint-profit (1) scale.
    """
    from .sim import P_MONO, P_NASH, best_response
    by, warm = {}, {}
    for r in rows:
        if r.get("policy") != "llm" or r.get("model") != model or r.get("disclose") or r.get("variant", "base") != "base":
            continue
        if r["kind"] == "branch" and r["lock"] == 0:
            by.setdefault(r["k"], {}).setdefault(r["rep"], {})[r["arm"]] = r["branch"]
        if r["kind"] == "warmup":
            h = r["history"]
            warm[r["k"]] = [(h[i]["proposed"], best_response(h[i - 1]["rival"])) for i in range(1, len(h))]
    # only histories with at least one complete cut/no-op pair; partial or failed runs never average to NaN
    ks = sorted(k for k in set(by) & set(warm) if any("noop" in v and "cut" in v for v in by[k].values()))
    slope = [np.mean([(v["noop"][1]["proposed"] - v["cut"][1]["proposed"]) / 8 for v in by[k].values()
                      if "noop" in v and "cut" in v]) for k in ks]
    above = [np.mean([p - br for p, br in warm[k]]) for k in ks]
    delta = [np.mean([(p - P_NASH) / (P_MONO - P_NASH) for p, _ in warm[k]]) for k in ks]
    return {"n_hist": len(ks), "slope": paired_bootstrap(slope), "above_br": paired_bootstrap(above),
            "delta": paired_bootstrap(delta), "slope_theory": 0.3}


def panel_eligible(rows, model: str, min_hist: int = 12, max_missing: float = 0.10) -> bool:
    """Panel inclusion rule: at least `min_hist` histories with a complete
    cut/no-op pair and at most `max_missing` of the expected no-rule branches missing (failed runs may not be random)."""
    a = awareness(rows, model)
    done = {(r["k"], r["arm"], r["rep"]) for r in rows if r["kind"] == "branch" and r["model"] == model
            and r["lock"] == 0 and not r.get("disclose") and r.get("variant", "base") == "base"}
    reps = max(2, 1 + max((rep for _, _, rep in done), default=0))  # panel runs plan 2 repeats; main runs 4
    expected = 16 * 3 * reps
    return a["n_hist"] >= min_hist and 1 - len(done) / expected <= max_missing


def diagnostics(rows):
    calls = tokens_in = tokens_out = retries = 0
    secs = []
    failed = Counter(r["model"] for r in rows if r["kind"] == "failed")
    for r in rows:
        if r.get("model", "").endswith("[replay]") or r["policy"] != "llm" or r["kind"] == "failed":
            continue
        recs = r["history"] if r["kind"] == "warmup" else r["branch"]
        for x in recs:
            info = x.get("info")
            if info and "in" in info:
                calls += 1
                tokens_in += info["in"]
                tokens_out += info["out"]
                retries += info.get("attempt", 0)
                secs.append(info["sec"])
    gains = [r["rival_cut_gain"] for r in rows if r["kind"] == "warmup" and r["policy"] == "llm"]
    branches = Counter((r["model"], r["lock"], r.get("disclose", False)) for r in rows
                       if r["kind"] == "branch" and r["policy"] == "llm" and not r["model"].endswith("[replay]"))
    return {"llm_calls": calls, "tokens_in": tokens_in, "tokens_out": tokens_out, "retries_logged": retries,
            "median_sec": float(np.median(secs)) if secs else None,
            "rival_cut_profitable": f"{sum(g > 0 for g in gains)}/{len(gains)}",
            "branches": {f"{m}|L{l}|disclose={d}": n for (m, l, d), n in branches.items()},
            "failed_branches": dict(failed)}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("paths", nargs="+")
    ap.add_argument("--out", default="results/summary.json")
    args = ap.parse_args()
    rows = load(args.paths)
    out = {"summary": summarise(rows), "diagnostics": diagnostics(rows), "decomposition": {}, "awareness": {}}
    llm_models = {r["model"] for r in rows if r["kind"] == "branch" and r["policy"] == "llm"
                  and not r["model"].endswith("[replay]") and not r.get("disclose")}
    for m in llm_models:
        if "[" not in m:  # prompt variants reuse the base run's warm-ups, so they have none of their own
            out["awareness"][m] = awareness(rows, m)
        locks = {r["lock"] for r in rows if r["kind"] == "branch" and r["model"] == m} - {0}
        for l in sorted(locks):
            out["decomposition"][f"{m}|L{l}"] = decomposition([r for r in rows if not r.get("disclose")], ("llm", m), l)
    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    Path(args.out).write_text(json.dumps(out, indent=1))
    print(json.dumps({"diagnostics": out["diagnostics"], "decomposition": out["decomposition"]}, indent=1))


if __name__ == "__main__":
    main()
