"""Export the real-LLM results the demo shows, from the run logs, with provenance.

Usage: python3 -m harness.export_demo runs/main_qwen.jsonl --out demo/llm-results.json
The demo must never show a number that this script did not write.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
from pathlib import Path

from .analyze import load
from .origin import family, origin, short
from .report import awareness, decomposition, panel_eligible

MODEL = "Qwen/Qwen3-235B-A22B-Instruct-2507"


def lag_means(rows, model, lock, key):
    """Mean over histories of (p_noop - p_cut)/G per lag, repeats averaged within history."""
    import sys
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
    from paper.figures import lag_gaps
    g = lag_gaps(rows, f"llm|{model}", lock, key)
    return {"mean": [round(float(v), 4) for v in g.mean(0)], "n": int(len(g))} if len(g) else None


def reasoning(rec):
    raw = (rec.get("info") or {}).get("raw")
    try:
        return json.loads(raw).get("reasoning", "") if raw else ""
    except Exception:
        return ""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("paths", nargs="+")
    ap.add_argument("--out", default="demo/llm-results.json")
    args = ap.parse_args()
    rows = load(args.paths)
    out = {"model": MODEL.split("/")[1], "n_hist": 16, "reps": 4, "lags": {}, "decomposition": {}, "examples": []}
    for name, model, lock, key in [("no rule", MODEL, 0, "published"),
                                   ("hold 3: published", MODEL, 3, "published"),
                                   ("hold 3: proposed", MODEL, 3, "proposed"),
                                   ("replay through hold 3", MODEL + " [replay]", 3, "published"),
                                   ("noon 3: published", MODEL, -3, "published"),
                                   ("noon 3: proposed", MODEL, -3, "proposed")]:
        lm = lag_means(rows, model, lock, key)
        if lm:
            out["lags"][name] = lm
    base_rows = [r for r in rows if not r.get("disclose")]
    for lock, name in ((3, "hold3"), (-3, "noon3")):
        out["decomposition"][name] = decomposition(base_rows, ("llm", MODEL), lock)
    out["decomposition_hold3"] = out["decomposition"]["hold3"]  # name the demo already reads
    for r in rows:
        if (r["kind"] == "branch" and r["policy"] == "llm" and r["model"] == MODEL and r["rep"] == 0
                and r["arm"] in ("cut", "noop") and r["lock"] in (0, 3, -3)):
            out["examples"].append({"k": r["k"], "base": r["base"], "lock": r["lock"], "arm": r["arm"],
                                    "proposed": [x["proposed"] for x in r["branch"]],
                                    "published": [x["published"] for x in r["branch"]],
                                    "rival": [x["rival"] for x in r["branch"]],
                                    "blocked": [bool(x.get("locked")) for x in r["branch"]],
                                    "reasoning": [reasoning(x) for x in r["branch"]]})
    # model panel: cut responsiveness without a rule; hold-3 rule effect where that run exists
    out["panel"] = []
    for m in sorted({r["model"] for r in rows if r["kind"] == "warmup" and r.get("policy") == "llm"}):
        a = awareness(rows, m)
        if not panel_eligible(rows, m):
            continue
        locks = {r["lock"] for r in rows if r["kind"] == "branch" and r["model"] == m and not r.get("disclose")}
        entry = {"model": short(m), "origin": origin(m), "family": family(m)[0], "size_rank": family(m)[1], "n_hist": a["n_hist"],
                 "cut_eur": [round(v * 8, 3) for v in a["slope"]], "above_br": [round(v, 3) for v in a["above_br"]]}
        if 3 in locks:
            dec = decomposition(base_rows, ("llm", m), 3)
            if dec["n_hist"] >= 12:
                entry["hold3_theta"] = [round(v, 4) for v in dec["theta_closed"]]
                entry["hold3_adaptation"] = [round(v, 4) for v in dec["adaptation"]]
        out["panel"].append(entry)
    try:
        commit = subprocess.run(["git", "rev-parse", "--short", "HEAD"], capture_output=True, text=True).stdout.strip()
    except Exception:
        commit = ""
    out["provenance"] = {
        "generated_by": "python3 -m harness.export_demo " + " ".join(args.paths),
        "git_commit": commit,
        "inputs_sha256": {p: hashlib.sha256(Path(p).read_bytes()).hexdigest()[:16] for p in args.paths},
    }
    Path(args.out).write_text(json.dumps(out))
    print(f"wrote {args.out}: {len(out['lags'])} lag series, {len(out['examples'])} examples, "
          f"hold3 theta {out['decomposition']['hold3']['theta_closed'][0]:.3f}, "
          f"noon3 theta {out['decomposition']['noon3']['theta_closed'][0]:.3f}, {len(out['panel'])} panel models")


if __name__ == "__main__":
    main()
