# Small-paper plan v2 (after Codex review): "When Execution Looks Like Punishment"

Revised Sun 25 Oct 2026, 23:20 Berlin (CET). **Hard deadline Mon 26 Oct 12:59 Berlin** (Sun 23:59 AoE). Submit by 12:15.
Review page: `plan-review.html`. Codex review: `codex-plan-review-2026-10-25.md`.

## Claim (narrowed)

Execution constraints (a 3-period offer lock) change both the *published* price persistence after a rival shock and the agent's subsequent *proposals*, because the agent learns from its published history. So proposal logs reveal execution discrepancies but do not, alone, show how the model would behave without the lock.

Audit-validity study with a scripted rival. Not evidence of collusion, intent or legal compliance. No product evaluated.

## Design (frozen 23:20)

- Market: q = max(0, 35.4 − p + 0.6 p_rival), c = 15; Nash 36; G = 15.75 is a continuous-reference normaliser. Grid 15–70 step 0.5.
- 16 seeded histories: rival base ~ U[38, 48], warm-up wiggle ±1. Checkpoint after 8 warm-up periods; rival executed price overridden by cut (−8) / raise (+8) / no-op; profits recomputed; rival returns to base in every branch. Report rival cut profitability (intervention, not always a profitable deviation).
- Executor: L=0 immediate; L=3 holds every published change for 3 periods; blocked proposals logged and discarded; no renewal on unchanged proposals; L=1 ≡ L=0 (tested). Switched on prospectively at the checkpoint.
- LLM: Qwen3-235B-A22B-Instruct-2507 via Nebius, T = 0.7, 4 repeats, 8 continuation decisions. **Undisclosed execution with published-history feedback**: it sees only its published prices, rival prices, sales and profit; not told about the lock; demand equation not given (prompt frozen as piloted).
- Controls: fixed, myopic BR, sticky (λ = 0.3, 0.6, anchored on own proposal), finite trigger (fixed warm-up reference, −3 threshold, 3 periods at Nash).
- Estimands: R_d = mean over h = 2..5 of (p_noop − p_cut)/G; θ = R_3 − R_0, for published and proposed; raise arm separately; sham (no-op vs no-op) for noise; all 8 lags shown. Bootstrap over histories.
- **Added: open-loop replay.** L=0 proposals pushed through the L=3 executor. Closed-loop θ − replay θ = extra effect from proposals adapting to changed feedback.
- Cut: second model, lock-length sweep, disclosure factor, "auditor verdict" figure.

## Status at 23:20

- Harness + 24 tests pass. Controls give their known answers (myopic published θ = 0.073 vs analytic 0.076; proposed θ = 0; trigger R0 = 0.317, θ = 0; fixed 0).
- Pilot (4 histories, 2 reps, excluded from main): Qwen published θ = 0.20 [0.15, 0.26], **proposed θ = 0.17 [0.12, 0.22]**: proposals themselves stay low under the lock.
- Main run (16 × 2 × 3 × 4 × 8 ≈ 3,200 calls) running since 23:18.

## Schedule (Berlin)

| Time | Block | Gate |
|---|---|---|
| 23:20–23:45 | User reviews `plan-review.html`; gets Apart template | Design changes → rerun main (~10 min) |
| 23:45–00:30 | Main run done → completeness check, analysis, 3 figures | No missing trajectories; no carry-forward on failures |
| 00:30–02:00 | Draft whole paper in LaTeX (tectonic), skeleton compiled early | PDF compiles |
| 02:00–07:00 | Sleep | — |
| 07:00–09:00 | Re-read numbers vs `results/summary.json`; finish results, discussion, abstract | Abstract 150–250 words |
| 09:00–10:30 | Appendix: limitations + dual use, disclosure, prompt, diagnostics | Every number traced |
| 10:30–11:30 | Final read, page check (≤ 8 main) | — |
| 11:30–12:15 | Submit | 12:59 emergency deadline |

Optional only if ahead at 00:30: disclosure condition (LLM told about the lock), ~10 min of calls.

## Extension matrix (user request 23:55): better agents / traps / audit security

| Theme | Test (new data) | Investigate (analysis) | Discuss (paper §5) |
|---|---|---|---|
| **Better agents** | `--variant intent`: agent also sees its own proposed prices (runs/intent_qwen.jsonl) | `--disclose`: agent told about the rule (runs/disclose_qwen.jsonl) | design rules: show intent vs execution, make rule state visible, test under real rules |
| **Traps** | anchoring on held price = main result (θ_prop 0.125) | window choice (h=2–3 vs 4–8) and benchmark (static BR vs feasible action); raise arm asymmetry | false accusation vs "the rule did it" cover story; noon rule asymmetry |
| **Audit security** | `--variant audited`: agent told a competition authority reviews it (evaluation awareness) | hold-length sweep, scripted: θ_myopic = 0.037 / 0.073 / 0.110 / 0.147 for L = 2 / 3 / 4 / 6, so rule setter dials apparent punishment | hash-chained logs (`harness/verify_log.py`, tested); who controls rule config; second model gpt-oss-120b |

All variant runs reuse the main run's 16 warm-up checkpoints (paired comparison).

## Figures

1. Example paths: proposed vs published, myopic vs Qwen, with/without lock; all 8 lags.
2. θ (published, proposed, replay) per policy with bootstrap CIs.
3. Lag profile h = 1..8 of the cut response for Qwen: closed-loop L3 vs replay L3 vs L0.
