"""Model panel figure: how each model reacts to a rival's price cut, by developer origin. Prints every plotted number.

Usage: python3 paper/fig_panel.py runs/main_qwen.jsonl runs/main_gptoss.jsonl runs/panel_*.jsonl
Right panel only for models run with hold 3.
Writes paper/fig-panel.{pdf,png}.
"""
from __future__ import annotations

import sys
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from harness.analyze import load  # noqa: E402
from harness.origin import family, origin, short  # noqa: E402
from harness.report import awareness, decomposition, panel_eligible  # noqa: E402
from harness.sim import G  # noqa: E402

OUT = Path(__file__).resolve().parent
plt.rcParams.update({"font.family": "serif", "font.size": 8.5, "pdf.fonttype": 42, "axes.spines.top": False,
                     "axes.spines.right": False, "axes.titlesize": 9})
COLOR = {"CN": "#1b2330", "US": "#1b2330"}  # neutral: orange/green mean proposed/published in Figs 1-2
MARKER = {"CN": "o", "US": "s"}


def main(paths):
    rows = load(paths)
    models = sorted({r["model"] for r in rows if r["kind"] == "warmup" and r.get("policy") == "llm"})
    res = []
    for m in models:
        a = awareness(rows, m)
        if not panel_eligible(rows, m):
            print(f"skip {m}: {a['n_hist']} histories, too many missing branches")
            continue
        locks = {r["lock"] for r in rows if r["kind"] == "branch" and r["model"] == m and not r.get("disclose")}
        if 3 in locks:
            dec = decomposition([r for r in rows if not r.get("disclose")], ("llm", m), 3)
            if dec["n_hist"] >= 12 and all(v == v for v in dec["theta_closed"]):  # complete and finite only
                a = {**a, "theta": dec["theta_closed"]}
        res.append((m, origin(m), a))
    # families with a size ladder first (largest family mean on top), then single models by slope; small -> large inside
    fams = {}
    for m, o, a in res:
        fams.setdefault(family(m)[0], []).append(a["slope"][0])
    rank = {f: (len(v) > 1, sum(v) / len(v)) for f, v in fams.items()}
    res.sort(key=lambda t: (rank[family(t[0])[0]], -family(t[0])[1]))

    fig, axes = plt.subplots(1, 2, figsize=(6.9, 0.26 * len(res) + 0.9), sharey=True, sharex=True,
                             gridspec_kw={"width_ratios": [1, 1]})
    panels = [("slope", "No rule: own cut after an €8 rival cut\n(% of the rival's cut)", 30, "best response 30%"),
              ("theta", "What the hold adds\n(% of the competitive–cartel gap)", 0.0, "")]
    for ax, (key, xlabel, ref, ref_label) in zip(axes, panels):
        for y, (m, o, a) in enumerate(res):
            if key not in a:
                ax.text(0.5, y, "not run with the rule", transform=ax.get_yaxis_transform(), ha="center", va="center",
                        fontsize=7, color="#8a8f8c", style="italic")
                continue
            mean, lo, hi = (100 * v for v in a[key])
            ax.errorbar(mean, y, xerr=[[mean - lo], [hi - mean]], fmt=MARKER[o], color=COLOR[o], ms=4.5,
                        elinewidth=1.2, capsize=0, mfc=COLOR[o] if o == "CN" else "white")
            print(f"{key:8s} {m:42s} {o} n={a['n_hist']:2d} {mean:.2f} [{lo:.2f}, {hi:.2f}]")
        ax.axvline(ref, color="#000000", lw=0.8, ls="--")
        if ref_label:
            ax.text(ref, len(res) - 0.4, f" {ref_label}", fontsize=7.5, va="bottom", ha="left")
        if key == "slope":
            ax.axvline(0, color="#000000", lw=0.5)
        ax.set_xlabel(xlabel)
        ax.grid(axis="x", color="#000000", alpha=0.08, lw=0.5)
    axes[0].set_yticks(range(len(res)), [f"{short(m)}  ({o})" for m, o, _ in res])
    for y in range(1, len(res)):  # thin rule between families
        if family(res[y][0])[0] != family(res[y - 1][0])[0]:
            for ax in axes:
                ax.axhline(y - 0.5, color="#000000", lw=0.4, alpha=0.35)
    axes[0].set_ylim(-0.6, len(res) - 0.1)
    handles = [axes[1].plot([], [], MARKER[o], color=COLOR[o], mfc=COLOR[o] if o == "CN" else "white")[0] for o in ("CN", "US")]
    fig.tight_layout(w_pad=1.0)
    fig.legend(handles, ["China-based developer", "US-based developer"], frameon=False, fontsize=7.5, ncol=2,
               loc="upper center", bbox_to_anchor=(0.5, 0.0))
    fig.savefig(OUT / "fig-panel.pdf", bbox_inches="tight")
    fig.savefig(OUT / "fig-panel.png", dpi=300, bbox_inches="tight")


if __name__ == "__main__":
    main(sys.argv[1:])
