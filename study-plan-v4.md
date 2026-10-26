# Study plan v4 — more models, US/China framing, model origin

Status: draft for review, 26 Oct 2026 ~08:45 Berlin. Paper submit target 12:15, hard deadline 12:59.
Anything not finished and analysed by ~11:15 stays out of the paper (or goes in as "preliminary" in one paragraph + appendix).

## Where we are

- Harness: synthetic duopoly (q = 35.4 − p + 0.6 p_rival, c = 15, Nash 36, joint 51.75, G = 15.75), scripted rival, fork audit with
  cut / raise / no-op, rules: none, hold 3, noon 3. Logs proposed + published + rule state, hash-chained.
- Prompt framing today: small sports-court business on a booking platform, EUR (harness/llm.py SYSTEM). Germany enters only via the noon rule.
- Results: Qwen3-235B (CN) big rule effect (θ hold = 0.159), overreacts to cuts (slope 0.42 vs theory 0.30).
  gpt-oss-120b (US) ignores cuts (slope 0.00), tiny rule effect (0.028). Price awareness predicts rule effect.
- Price-awareness metrics (Table 3) need only the no-rule arm: reaction slope at h = 1, € above best response in warm-up, Δ (Nash→joint).

## Author's questions

1. **More relatable, non-German use cases**, especially American.
2. **Model origin.** Hypothesis from the author: a model reflects the economy whose text it was trained on. Chinese-developed models might
   show *less* price awareness / less competitive reaction (author's prior: less price competition in some Chinese markets);
   US-developed models more. If true, this matters for firms choosing open-weight models.
   Note: our two data points already go the *other* way (CN Qwen overreacts, US gpt-oss ignores cuts), so this must be a real test, not a confirmation.
3. More data, more cases, more models.

## Proposed design

### A. Model panel — price awareness, no rule (highest value per hour)

Same market, same prompt (base framing), L = 0 only, all three arms, 16 histories × 2 repeats.
Output: Table 3 extended to ~10 models: reaction slope, € above BR, Δ, plus R(no rule).

Models available on Nebius today (developer origin):
- CN: Qwen3-235B (done), Qwen3.5-397B, Qwen3-30B-A3B, DeepSeek-V4.1-Flash, Kimi-K3, GLM-5.3, MiniMax-M3
- US: gpt-oss-120b (done), Nemotron-3-super-120b (NVIDIA), Hermes-4-405B (Nous, Llama-based), gemma-3-27b (Google), muse-spark-open (Meta)
- Reasoning models need max_tokens 3000 (gpt-oss lesson; DeepSeek-V4.1-Flash returned empty content at the default — pilot pending).

Pilot: Qwen3-30B, 1 history, L 0/3 → 6 branches in 32 s with 3 workers. Estimate per model, L0 only, 16×2: ~5–15 min; run ~6 models in parallel.

Analysis: per-model metrics with bootstrap CIs over histories. Origin comparison CN vs US: model is the unit (n ≈ 5 vs 5),
so report it as descriptive / exploratory (rank plot, permutation test over models), NOT a causal claim about national economies.
Confounds we name: size, reasoning vs instruct, training recipe, RLHF, release date, provider serving settings.

### B. Rule effect for the new models (if A finishes by ~10:15)

Hold 3 (L0 + L3) for the 3–4 models that span the awareness range (most / least reactive, one per origin at least).
Tests the paper's mechanism claim: "rule effect ≈ increasing in reaction slope". One scatter: slope (x) vs θ hold (y), one dot per model.

### C. Framing: US and China market stories (same numbers, different story)

Three framings, identical market and numbers, only the system prompt changes:
- **US**: beer/wine wholesaler in a US state with a *post-and-hold* law: prices posted and held for the period (real US rule;
  Costco v. Maleng, 9th Cir. 2008, found parts of Washington's post-and-hold scheme facilitated collusion). USD.
  Alt US story: apartment rents set by revenue-management software, rent fixed for the lease (RealPage context).
- **China**: a seller on a Chinese e-commerce / food-delivery platform, CNY (price scaled ×1, labels only), platform price rules.
- **Base**: current sports-court/EUR story.
Run for 2 models (one CN, one US) × 3 framings, L0 (+ L3 if time). Asks: does the agent's price awareness depend on the
country story rather than on the model's origin? This separates "model origin" from "market context in prompt".
Code change: a `--framing` option adding SYSTEM variants in harness/llm.py and the run resume key (~20 min incl. test).

### What goes into the paper (if done)

- Table 3 → panel table (A); one figure slope vs θ (B); one robustness paragraph (C).
- Origin result phrased as: "In our panel, developer origin does / does not predict price awareness; the variation within
  origin is larger/smaller than between." No claims about national economies causing it.

## Risks / open questions for the reviewer

1. Is "model origin → price awareness" testable at all with ~10 models? Better framing?
2. Is the CNY/China framing meaningful in English prompts? Should the China framing be in Chinese?
3. Is post-and-hold a faithful mapping of our hold-3 rule (it holds a month and applies to all sellers)? Better US case?
4. Time: is anything here unsafe to add 4 h before a deadline? What to cut first?
5. Statistics: 16 histories × 2 repeats enough for the slope? Multiple comparisons across 10 models?

## Decision log (after Codex review, 09:08)

- A: run to cutoff 10:15; endpoints still failing then (DeepSeek-V4.1-Flash, Kimi-K3, muse-spark-open; Qwen3.5-397B empty content) are excluded with reasons.
- B selection rule, fixed before any hold-3 result: the three models that finished A first, each from a family not already in the paper:
  MiniMax-M3 (CN), Hermes-4-405B (US, Llama-based), gemma-3-27b-it (US). Reuses their A warm-ups. Reported: θ published, θ proposed, adaptation (closed loop − replay).
- C (framing): cut today, future work.
- Origin: exploratory wording only — "among these served checkpoints under one English prompt, cut responses differed; developer-country contrasts are exploratory". No permutation test.
- Paper wording fixes from review: "cut responsiveness" not "price awareness" as a measured construct; "consistent with anchoring" not "because it anchors"; Qwen "overreacts" only as point estimate (CI includes 0.30); slope→θ is not a validated prediction (trigger control reacts strongly with zero hold effect); Discussion should not infer higher market prices.
