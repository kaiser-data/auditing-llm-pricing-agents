# Site plan: Pricing Audit Playground

Live: https://llm-pricing-audit.pages.dev (v1, vanilla JS). v2 (Astro) in `demo-astro/`, being built.
Written 26 Oct 2026, 00:35. Owner: Martin Kaiser.

## Job of the site

Let a reviewer **feel** the paper's claim in 30 seconds: pick an innocent agent, switch on a legal price rule, and watch a naive auditor call it punishment while an execution-aware auditor does not. Then show that the real LLM is different: its own proposals stay low too.

Audience, in order: Apart judges (from the paper link), competition-policy readers, other researchers who want to reuse the harness.

## Architecture

| Layer | Choice | Why |
|---|---|---|
| Site | Astro 5, static output | content-first, zero server, deploys to Cloudflare Pages |
| Simulation | `src/lib/sim.js`, port of `harness/sim.py` | runs in the browser, instant feedback, no API cost |
| Truth check | `parity_check.mjs` runs JS and Python on a 600-scenario grid | the page may never disagree with the paper |
| Real results | `llm-results.json` exported from `runs/` by the project's own analysis code | numbers come from one source, never typed in |
| Charts | Observable Plot | small data, statistical defaults, tips built in |
| Design | DESIGN.md adopted from `VoltAgent/awesome-design-md` (rules, not brand) | a documented system reads as designed, not generated |
| Motion | anime.js, one moment (shock applied → verdict) | one deliberate animation; off under reduced motion |
| Saved scenarios | Supabase edge function `scenarios` + RLS-locked table | whitelisted params, size cap, per-IP rate limit, no personal data |
| Hosting | Cloudflare Pages project `llm-pricing-audit` | already authenticated, free |

## Page structure

1. **Header**: one sentence of the claim, a link to the paper and the code.
2. **Playground** (default): controls (agent, rule, rival, shock) → price-path chart → two auditors side by side → instrument panel (R published, R proposed, θ, replay, adaptation). Preset buttons for the three key cases.
3. **Real LLM**: lag profiles, decomposition with 95% intervals, example browser with the model's own one-line reasons.
4. **About**: what an audit looks for, the real rules (Germany KPAnG, Western Australia FuelWatch), limits, not legal advice.

## Release gates (all must pass before deploy)

1. `npm run build` clean.
2. Parity check passes (600/600).
3. Screenshots at 1280 px and a true 400 px viewport (Playwright, not headless Chrome, which clamps width), light and dark; no console errors.
4. Save → load round trip against the live function; bad input rejected; test rows deleted.
5. Every number on the page traced to `llm-results.json` or computed live.

## Next steps

| # | Step | When |
|---|---|---|
| 1 | Finish v2 build (agent running) and pass gates 1–5 | tonight |
| 2 | Deploy v2 to the same Pages project, keep v1 as rollback | after gates |
| 3 | Refresh `llm-results.json` after the gpt-oss run; add a model switch | tomorrow morning if time |
| 4 | Make the GitHub repo public so the About link works | needs Martin's go |
| 5 | Add the noon-rule and variant results to the Real LLM tab | after submission |

## Risks

- Page and paper disagree → parity check and single-source export.
- Shared links break after a parameter rename → keep param names stable; the edge function whitelists them.
- Abuse of the save endpoint → rate limit, size cap, no free text stored.
- Overclaiming → copy says "looks like", never "is collusion".
