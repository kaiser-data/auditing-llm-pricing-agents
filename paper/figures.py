"""Paper figures from run files only. Prints every plotted number.

Usage: python3 paper/figures.py runs/controls.jsonl runs/main_qwen.jsonl
Writes paper/fig-lags.{pdf,png} and paper/fig-theta.{pdf,png}.
"""
from __future__ import annotations

import sys
from collections import defaultdict
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from harness.analyze import load, per_history  # noqa: E402
from harness.metrics import paired_bootstrap  # noqa: E402
from harness.sim import G  # noqa: E402

OUT = Path(__file__).resolve().parent
plt.rcParams.update({"font.family": "serif", "font.size": 8.5, "pdf.fonttype": 42, "axes.spines.top": False,
                     "axes.spines.right": False, "axes.titlesize": 9})
C_L0, C_PUB, C_PROP, C_REPLAY = "#8a8f8c", "#1f6f5c", "#b4532a", "#3b6fb6"
LLM = "llm|Qwen/Qwen3-235B-A22B-Instruct-2507"
AGENTS = [("myopic|scripted", "Myopic best response"), ("sticky0.6|scripted", "Sticky (λ = 0.6)"),
          ("trigger|scripted", "Finite trigger"), (LLM, "Qwen3-235B")]


def lag_gaps(rows, pm, lock, key):
    """Mean over histories of (p_noop - p_cut)/G at each lag h, repeats averaged within history."""
    cell = defaultdict(lambda: defaultdict(dict))
    for r in rows:
        if r["kind"] == "branch" and f"{r['policy']}|{r['model']}" == pm and r["lock"] == lock:
            cell[r["k"]][r["arm"]][r["rep"]] = {x["h"]: x[key] for x in r["branch"]}
    per_k = []
    for k, arms in cell.items():
        reps = [rep for rep in arms.get("cut", {}) if rep in arms.get("noop", {})]
        per_k.append([np.mean([(arms["noop"][rep][h] - arms["cut"][rep][h]) / G for rep in reps]) for h in range(9)])
    return np.array(per_k)


def fig_lags(rows):
    fig, axes = plt.subplots(1, 4, figsize=(6.9, 2.0), sharey=True)
    for ax, (pm, title) in zip(axes, AGENTS):
        series = [(f"{pm.split('|')[0]}|{pm.split('|')[1]}", 0, "published", C_L0, "-", "no rule"),
                  (pm, 3, "published", C_PUB, "-", "hold 3: published"),
                  (pm, 3, "proposed", C_PROP, "--", "hold 3: proposed")]
        if pm == LLM:
            series.append((f"{pm} [replay]", 3, "published", C_REPLAY, ":", "replay of no-rule proposals"))
        for spm, lock, key, color, ls, label in series:
            g = lag_gaps(rows, spm.replace(f"{LLM} [replay]", LLM + " [replay]"), lock, key)
            if len(g) == 0:
                continue
            m = g.mean(axis=0)
            print(f"lags {title:22s} {label:30s} n={len(g):2d} " + " ".join(f"{v:+.3f}" for v in m))
            ax.plot(range(9), m, ls, color=color, lw=1.6, label=label)
        ax.axvspan(2, 5, color="#000000", alpha=0.05, lw=0)
        ax.axhline(0, color="#000000", lw=0.5)
        ax.set_title(title)
        ax.set_xticks(range(0, 9, 2))
        ax.set_xlabel("periods after cut")
    axes[0].set_ylabel("gap to no-shock (÷G)")
    handles, labels = axes[-1].get_legend_handles_labels()
    fig.legend(handles, labels, loc="lower center", ncol=4, frameon=False, bbox_to_anchor=(0.5, -0.08))
    fig.tight_layout(rect=(0, 0.08, 1, 1))
    save(fig, "fig-lags")


def theta_cell(rows, pm, lock, key):
    hs = per_history(rows, key).get(tuple(pm.split("|", 1)), {})
    vals = [hs[k][lock] - hs[k][0] for k in hs if lock in hs[k] and 0 in hs[k]]
    return paired_bootstrap(vals) if vals else None


def fig_theta(rows):
    labels, rowsets = [], []
    for pm, title in AGENTS:
        for lock, rule in ((3, "hold 3"), (-3, "noon 3")):
            th = {key: theta_cell(rows, pm, lock, key) for key in ("published", "proposed")}
            if pm == LLM:
                th["replay"] = theta_cell(rows, pm + " [replay]", lock, "published")
            labels.append(f"{title}, {rule}")
            rowsets.append(th)
            print(f"theta {labels[-1]:30s} " + "  ".join(f"{k}={v[0]:+.3f}[{v[1]:+.3f},{v[2]:+.3f}]"
                                                       for k, v in th.items() if v))
    fig, ax = plt.subplots(figsize=(3.6, 3.6))
    off = {"published": 0.22, "proposed": 0.0, "replay": -0.22}
    col = {"published": C_PUB, "proposed": C_PROP, "replay": C_REPLAY}
    for i, th in enumerate(rowsets):
        y = len(rowsets) - 1 - i
        for key, v in th.items():
            if v is None:
                continue
            ax.errorbar(v[0], y + off[key], xerr=[[v[0] - v[1]], [v[2] - v[0]]], fmt="o", ms=3.5, color=col[key],
                        capsize=2, lw=1, label=key if i == len(rowsets) - 1 else None)
    ax.set_yticks(range(len(labels)))
    ax.set_yticklabels(labels[::-1])
    ax.axvline(0, color="#000000", lw=0.5)
    for y in range(1, len(labels), 2):
        ax.axhline(y + 0.5, color="#000000", lw=0.3, alpha=0.3)
    ax.set_xlabel("θ (rule − no rule), cut arm")
    ax.legend(frameon=False, fontsize=7.5, loc="lower center", bbox_to_anchor=(0.4, 1.0), ncol=3,
              handletextpad=0.2, columnspacing=0.8)
    fig.tight_layout()
    save(fig, "fig-theta")


def save(fig, name):
    fig.savefig(OUT / f"{name}.pdf", bbox_inches="tight")
    fig.savefig(OUT / f"{name}.png", dpi=300, bbox_inches="tight")
    plt.close(fig)


if __name__ == "__main__":
    rows = load(sys.argv[1:])
    fig_lags(rows)
    fig_theta(rows)
