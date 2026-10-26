# Task: adversarial review of a 12-hour research-paper plan

You are a senior reviewer (economist + ML-evaluation researcher + Apart Research sprint judge). Think deeply. Be blunt. Output markdown.

## Context

- Apart Research "AI Collusion Research Sprint". Deliverable: 4–8 page PDF, 150–250 word abstract, mandatory "Limitations and Dual-Use / Ethical Considerations" appendix, prior work disclosed. Deadline Mon 26 Oct 2026 12:59 Berlin. It is now Sun 25 Oct 23:10 Berlin. One person + AI assistants. ~12 hours total, incl. some sleep.
- Read these files in the current directory:
  - `PLAN.md`: the plan under review (primary).
  - `codex-gtm-bridge-2026-10-23.md` §5 (research design, estimand, controls, run budget) and §7 fallback.
  - `codex-review-2026-10-19.md`: earlier critique (sticky best-responder counterexample, state-consistent forking).
- Changes since those docs: no product was built (the hack went to another topic). The offer lock is a small function inside the harness. LLM = `Qwen/Qwen3-235B-A22B-Instruct-2507` via Nebius (OpenAI-compatible, ~0.8 s/call, cost negligible). Other available models include DeepSeek-V4.1-Flash, Kimi-K3, GLM-5.3, gpt-oss-120b, Llama-free list. So the API budget is no longer a constraint; wall-clock and the author's time are.

## Current concrete design (draft, not yet coded)

- Market: linear differentiated duopoly, q_i = A − B p_i + D p_j, A=35.4, B=1, D=0.6, c=15. Nash 36, joint-monopoly 51.75, G = 15.75. Price grid 15..70, step 0.5. Fresh cohort each period, nonbinding capacity.
- Rival: scripted. Per history k, base price b_k in [38, 48] with small deterministic ±1 wiggle during 8 warm-up periods. Checkpoint period t0: focal price already chosen; rival executed price overridden by cut (b_k − 8), raise (b_k + 8) or no-op (b_k); profits recomputed. Afterwards the rival returns to b_k (common path) in all branches. Report whether the cut was profitable for the rival in the shock period.
- Executor: L=0 publish every proposal; L=3: when the published price changes, it is held for 3 periods (including the one it starts); proposals still logged; unchanged proposals do not renew; after expiry publish the current proposal. Warm-up under L=0; executor switched on prospectively from t0+1 with no active lock.
- Focal observation each decision: last ≤10 periods of {own published price, rival price, own quantity, own profit}, own cost. The LLM is NOT told about the lock (it just sees its published price). JSON output {"reasoning": ≤40 words, "price": x}, temperature 0.7.
- Fork: the LLM is stateless; state = prompt history (+ executor state + scripted policy internal state), deep-copied at the checkpoint.
- Policies: fixed price (42); myopic exact BR to last rival price; sticky BR p_t = p_{t−1}^{proposed} + λ(BR − p_{t−1}), λ ∈ {0.3, 0.6}; finite trigger (coop 46; if rival drops ≥3 vs previous rival price, price 36 for 3 periods); LLM.
- Sample: 16 histories × 2 executors × 3 arms × 2 repeats × 8 continuation decisions ≈ 1,536 LLM calls + 128 warm-up.
- Estimand: R_d^- = mean_{h=2..5} (p^0 − p^-)/G, θ = R_3^- − R_0^-, for published AND proposed prices; raise arm separately; paired bootstrap over histories.
- Figures: (1) proposed vs published path for myopic / sticky / LLM; (2) θ per policy with CIs; (3) audit verdict: naive auditor (published prices, flags if R^- > τ) vs execution-aware auditor (proposed prices / excludes locked periods), share of histories flagged per policy × executor.

## What I want from you

1. **Is this worth a paper at all in 12 h?** What is the single strongest claim it can honestly make, and is it novel vs Arslan/Kim/Xiao 2609.35402 App. E, Tran & Yu 2610.28787, Moraes & De-Losso 2610.21867? Is "a lock makes a myopic agent look like it punishes" too trivial on its own? What would make the LLM part non-trivial (e.g., does the LLM itself react to its stuck published price — feedback contamination — which is the closed-loop effect a proposal log cannot remove)?
2. **Design bugs.** Lock semantics, fork timing, h-window choice (2..5 vs lock length 3), what the LLM sees, telling vs not telling the LLM about the lock, temperature/repeats, shock size and grid resolution, the trigger and sticky controls, normalisation, the auditor threshold τ, anything that would make a reviewer reject the result.
3. **Cheaper/sharper alternatives** now that LLM calls are ~free: e.g., second model as robustness, lock length sweep L ∈ {0,1,2,3,5}, telling-vs-not-telling the LLM about the lock as a factor. Which ONE addition gives the most value per hour? Which should be cut?
4. **Schedule realism.** Re-time the blocks; name hard gates and fallbacks.
5. **Paper outline + title + abstract skeleton** (no invented results; placeholders for numbers).
6. A final **"Revised plan"** section: concrete, ordered, with times (Berlin), that I can execute directly.

Keep the whole review under ~2,500 words. Severity-tag issues [fatal]/[major]/[minor].
