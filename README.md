# How Price-Aware Are AI Pricing Agents? Rival Price Cuts, Legal Price Rules and False Punishment Signals

Research code for an Apart Research AI Collusion Sprint project (Track 2: Detection & Audit), Oct 2026. Author: Martin Kaiser (individual contributor).

**Question.** Collusion audits look for a punishment pattern: after a rival cuts its price, the agent stays low and later recovers. Legal execution rules that hold or delay price changes (platform offer holds, Western Australia's 24-hour fuel price lock, Germany's 2026 noon rule for fuel price increases) can produce the same pattern. Do they, and does logging proposed vs published prices separate the model from the rule?

**Setup.** A synthetic differentiated duopoly with a scripted rival. We fork the agent just before market feedback, impose a rival price cut, raise or no change, and compare execution rules: immediate (L0), a 3-period offer hold (L3) and a noon rule (N3, encoded as `lock=-3`). Scripted controls (fixed, myopic, sticky, finite trigger) have known answers; LLM agents run through Nebius Token Factory.

This is an audit-validity study. It does not establish or rule out collusion, and it gives no legal advice.

**Live demo:** https://llm-pricing-audit.pages.dev (simulation runs in the browser; saved scenarios go to a Supabase edge function in `supabase/functions/scenarios`).

## Layout

| Path | What |
|---|---|
| `harness/sim.py` | market, execution rules, scripted policies, fork-before-feedback audit, open-loop replay |
| `harness/llm.py` | LLM pricing policy (prompt, JSON parsing, retries) |
| `harness/run.py` | resumable runner, JSONL logs |
| `harness/analyze.py`, `harness/report.py` | estimands, bootstrap over histories, decomposition, diagnostics |
| `tests/` | control and rule tests |
| `paper/figures.py`, `paper/draft.md` | figures and paper draft |
| `demo/` | interactive playground (`node demo/parity_check.mjs` checks it against `harness/sim.py`) |
| `supabase/` | scenarios table migration and edge function |
| `runs/` | raw logs: every proposal, publication, rule state and model reply |
| `results/` | computed summaries |
| `PLAN.md`, `codex-*.md`, `policy-brief-*.md` | plan, design reviews, policy brief |

Files dated before 23 Oct 2026 (`collusion-sprint-ideas.html`, `codex-review-2026-10-19.md`, `codex-gtm-bridge-2026-10-23.md`) are pre-sprint idea material, kept for prior-work disclosure; commercial product sections and pitch pages unrelated to the research were removed before publication. All code was written during the sprint.

## Reproduce

```bash
python3 -m pytest -q tests
for p in fixed myopic sticky0.3 sticky0.6 trigger; do
  python3 -m harness.run --policy $p --model scripted --reps 1 --locks 0 3 -3 --out runs/controls.jsonl
done
echo "NEBIUS_API_KEY=..." > .env
python3 -m harness.run --policy llm --n-hist 16 --reps 4 --locks 0 3 -3 --workers 4 --out runs/main_qwen.jsonl
python3 -m harness.report runs/controls.jsonl runs/main_qwen.jsonl --out results/summary.json
python3 paper/figures.py runs/controls.jsonl runs/main_qwen.jsonl
```
