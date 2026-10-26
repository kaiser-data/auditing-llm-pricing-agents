# Verdict

**Build an adaptive booking-and-payments product with owner-approved offers. Use its actual price-commitment mechanism as the experimental object in the paper.**

My pick is **OwnSlot**: an owner describes their classes, availability, prices and offer rules; the product creates a booking page, collects payments through Stripe Connect, and preserves approved offer prices until expiry.

The paper asks a narrower, defensible question:

> **When an LLM recommends prices through a booking platform, can ordinary platform controls create the persistent price responses that an auditor might attribute to the model?**

That is a better bridge than “antitrust-safe dynamic pricing.” It gives Saturday a useful SMB product and Sunday a concrete deployment mechanism to investigate.

**I would reject the original seed at its proposed scope.** Adaptive software, autonomous pricing, pooled-data experiments, a counterfactual auditor and a compliance report are too much for one person this weekend. Combining those would probably weaken both entries. Sharing one small, instrumented component is worthwhile.

**Do not interpret this as a prediction of winning both events.** The recommended product has a plausible hackathon story; the research contribution has moderate novelty and needs a convincing result.

I read all four requested files. No files were modified.

## 1. Important corrections before choosing

- **[fatal, if you lack admission] The Berlin event currently says “Event Full.”** Confirm that you already have an accepted place. The official page confirms the required stack, 18:00 opt-in and 19:00 finalist demos. It advertises **€1,500 cash prizes**, not necessarily €1,500 for the winner. [Official event](https://luma.com/vx78o719)

- **[major] Apart’s live requirements differ from the handoff.** They now specify **150–250 abstract words**, a maximum of eight main-text pages, and explicitly allow AI writing assistance while making the team responsible for accuracy. An abstract of exactly 150 words satisfies both the live requirements and your brief. [Current guidelines](https://apartresearch.com/sprints/ai-collusion-research-sprint-2026-10-23-to-2026-10-25)

- **[major] The submission deadline is Monday October 26 at 12:59 Berlin time.** Sunday 23:59 AoE converts to Monday 11:59 UTC; Berlin has switched to CET. Treat that as emergency buffer, not planned working time.

- **[fatal to generic novelty] Another relevant paper appeared after the October 19 review.** Tran and Yu’s October 20 paper already includes counterfactual LLM market audits, coherent cloning, best-response benchmarks, myopic placebos, positive controls and symmetric deviations. “Twin Auditor for LLM pricing” is even less novel now. Its treatment of execution-layer price commitments appears to leave room for the narrower question proposed here, but that is a candidate gap, not a verified first. [Primary paper](https://arxiv.org/html/2610.28787v1)

## 2. Ranked bridges

Scores are my judgments, not calibrated win probabilities. Five is best for the benefit columns; **five means greatest risk** in the final column. Research novelty and identification are scored separately.

| Rank | Bridge | Demo wow | GTM | Research novelty / identification | Feasibility | Combining risk |
|---|---|---:|---:|---:|---:|---:|
| **1** | **Adaptive booking + approved offers; audit the offer-execution controls** | **4** | **4** | **3 / 4** | **4** | **2** |
| 2 | Platform audit SDK, demonstrated through a small booking application | 3 | 3 | 3 / 4 | 3 | 3 |
| 3 | Booking + deposits; test collusion between refund-request and refund-review agents | 4 | 4 | 3 / 2 | 3 | 3 |
| 4 | Local services marketplace; study coordinated ranking or booking allocation | 4 | 3 | 3 / 3 | 2 | 4 |
| 5 | SMB purchasing assistant; study legitimate group buying versus harmful supplier coordination | 3 | 3 | 3 / 2 | 2 | 4 |
| 6 | Original seed: autonomous smart pricing + pooled-data comparison + “antitrust-safe” report | 3 | 2 | 2 / 2 | 1 | 5 |

### Why the alternatives lose

**Audit SDK:** the platform operator is a more plausible buyer for competition-risk tooling. However, it is a weaker answer to “a business owner describes what they need and the software adapts.” You would spend Saturday building a demonstration customer for an enterprise product.

**Refund-agent collusion:** payment fraud and inappropriate refunds are understandable pains. But you need to construct a new benchmark, define legitimate cooperation, establish adversarial ground truth and investigate novelty. This abandons the useful work already done on pricing.

**Marketplace allocation:** an attractive demo could show AI matching customers to studios and splitting payments. Research could test preferential treatment among agents. Unfortunately, marketplace demand, ranking quality and coalition labels become additional unresolved problems.

**Group purchasing:** potentially useful, but cooperation is often the intended benefit. Distinguishing efficient collective purchasing from anticompetitive conduct creates a substantial legal and economic identification burden.

**Original seed:** a common platform and pooled data are a credible risk mechanism. They do not automatically establish collusion, and removing a data feed does not certify its absence. The proposed product also confuses two buyers: the SMB buying bookings and the platform buying risk assessment.

**Commitment:** choose the first bridge. Keep the product useful without the research dashboard, and make the research depend on a real product mechanism rather than its branding.

## 3–4. [Removed before publication]

*Sections 3 (go-to-market) and 4 (product MVP) concerned a separate commercial product idea, including named local businesses as prospects. They are not part of the research and were removed when the repository was made public on 26 Oct 2026. The research design (section 5) is unchanged.*

## 5. Research: audit the deployed pricing stack

### Research question

> **How does a platform’s minimum offer duration change the apparent persistence of an LLM pricing agent’s response to a rival’s one-period price shock?**

A secondary question is whether logging proposals and execution state prevents that persistence from being misattributed to the model.

This is an **audit-validity study**. It does not establish emergent collusion, legal agreement or an antitrust-safe deployment.

### The platform’s experimental factor

Use the product’s actual offer-execution code.

| Condition | Execution rule |
|---|---|
| Immediate execution | Publish each valid recommendation |
| Offer commitment | When an approved price changes, hold it for three synthetic periods |

During a commitment, continue recording proposed prices, but leave the published price unchanged. Unchanged proposals must not continually renew the commitment.

Start both conditions from the same checkpoint, with no active commitment. Apply the differing executor prospectively. This identifies the effect of activating that controller at the checkpoint, **not** its long-run effect on market formation.

Keep the model, prompt, information permissions and underlying market fixed.

**Do not add pooled-versus-siloed data or same-versus-different models this weekend.** Pooled data changes legitimate forecasting information as well as competitive visibility. A price change would not identify coordination. Those factors deserve later experiments.

### Why this mechanism matters

Suppose a memoryless best responder recommends:

- €24 before a rival’s temporary cut;
- €22 immediately after observing it;
- €24 again once the rival restores its price.

A platform that holds an approved €22 offer for three periods publishes:

> €24 → €22 → €22 → €22 → €24.

That has persistence, an apparent short-run profit sacrifice and recovery. The pricing rule itself has no punishment state.

**[major] This does not refute every existing enforcement test.** In particular, the initial response need not exceed the static best response. The result challenges persistence-based interpretation and attribution of controller memory to the LLM.

Arslan, Kim and Xiao already apply forced-deviation probes to prompted LLMs and obtain different interpretations under different best-response benchmarks. Your additional contribution must be the execution mechanism and its measured consequences. [Appendix E](https://arxiv.org/html/2609.35402v1#A5)

### Minimal experimental design

For Sunday, use **16 independently generated, prespecified market histories**, with eight focal-agent warm-up decisions each against a scripted rival.

The histories must be economically consistent and clearly labeled as constructed. This removes dependence on waiting for collusion to emerge.

At a fixed checkpoint:

1. Snapshot immediately before market feedback.
2. Preserve the focal price already chosen.
3. Override the rival’s executed action with **cut, raise or no-op**.
4. Recompute demand, sales, profits and all derived observations.
5. Deliver feedback through the ordinary interface.
6. Continue for ten decisions, forcing the **same subsequent rival-price path** in every branch.
7. Run both execution conditions and two stochastic continuations.

The first continuation decision sees the shock. The second sees the restored rival price.

Use a predeclared interior rival price and symmetric, feasible shocks. Calculate whether the cut was profitable in the shock period. If it was not, describe it as a price intervention rather than a profitable deviation.

Record full executor state, including commitment expiry, alongside model memory. A fake rival-price field paired with unchanged profits would invalidate the experiment.

### Estimand and interpretation

Let \(d\in\{0,3\}\) denote commitment duration, \(a\) the shock, and \(G=p^M-p^N\) the reference one-period market’s Nash-to-monopoly price gap.

Define persistent cut response:

\[
R_d^-=
\frac{1}{4}\sum_{h=2}^{5}
\frac{\mathbb E[p_{h,d}^{0}-p_{h,d}^{-}]}{G}.
\]

The primary contrast is:

\[
\theta=R_3^- - R_0^-.
\]

This measures how the commitment changes persistent published-price suppression. Calculate the corresponding statistic for **proposed prices**, and report the raise arm separately.

Important boundaries:

- \(G\) is a normalization from the reference market, not proof of the committed-price system’s equilibrium.
- A nonzero proposal response still need not be strategic punishment.
- The controller changes subsequent own sales and profits, so the closed-loop contrast includes those downstream effects.
- Replaying a fixed proposal sequence through both executors isolates mechanical effects, but must be labeled an **open-loop replay**, not a complete counterfactual market run.

### Controls that must survive

| Control | What it tests |
|---|---|
| Exact myopic best responder | Ordinary competitive response |
| Same responder through the offer executor | Purely external persistence |
| Sticky best responder at several adjustment speeds | Persistence inside the pricing policy |
| Finite-duration trigger | Known punishment with recovery |
| Fixed-price policy | Zero-response plumbing |
| Repeated no-op continuations | API nondeterminism and sham-fork behavior |

The sticky control remains indispensable. Proposal logs cannot prove that persistence inside a model reflects strategic intent.

Use the **feasible-action benchmark** during a commitment. If a price cannot change until expiry, comparing it with an unconstrained static optimum does not establish a voluntary sacrifice.

Do not publish an ROC mixing scripted labels with unlabeled LLM trajectories. Report control-specific failures with denominators.

### Booking economics: where the bridge must stop

**[fatal to the original benchmark] Scarce, expiring inventory can invalidate the textbook interpretation.**

When a price cut changes remaining capacity, it changes future opportunity costs. Holding the future rival price path constant then does not equalize the economic state. Capacity and rationing can also alter equilibrium existence and pricing dynamics. [Dynamic price competition with capacity constraints](https://www.nber.org/papers/w32673)

For this study:

- Each period represents a **fresh cohort of equivalent off-peak sessions**.
- No unsold inventory carries forward.
- Choose capacity to remain nonbinding across the entire allowed price grid.
- Use the same differentiated demand and cost model in all conditions.
- Compute the reference best responses and benchmarks from that exact environment.

This retains a tractable pricing experiment while reusing the product’s offer schema and executor.

**State the limitation plainly:** the paper does not model realistic scarce-court revenue management. Stripe transactions and customer bookings demonstrate the artifact; they are not empirical market observations.

### Run budget

One model, one prompt, one market specification:

| Component | Calls |
|---|---:|
| 16 histories × 8 focal warm-up decisions | 128 |
| 16 × 2 executors × 3 shock arms × 2 repeats × 10 decisions | 1,920 |
| Extra no-op continuation per history | 160 |
| Pilot allowance | 200 |
| **Total** | **2,408** |

Scripted controls require no API calls.

At illustrative averages of 4,000 input and 400 billable output tokens, with assumed prices of $1/M input and $5/M output, this costs approximately **$18 including 25% overhead**. These are budgeting assumptions, not a provider quotation. Set a $40 ceiling and measure actual token use, reasoning charges and latency in the pilot.

Require projected collection to fit within two hours under available rate limits. Parallelize independent histories, not decisions within a trajectory.

The independent unit is the original history. Average repeats within it; show paired estimates and uncertainty across the 16 histories. This is a small study of potentially large effects, not a validated low-false-positive detector.

### What would make the paper worthwhile?

Three figures:

1. Proposed versus published prices for myopic, sticky and LLM policies.
2. Pairwise commitment effects with uncertainty and the common rival path marked.
3. Audit interpretation before and after accounting for execution constraints.

A worthwhile result would show that an apparently model-driven response materially changes when execution provenance is included.

**[major] The obvious scripted example alone is insufficient for a strong novelty claim.** If the LLM results add little, present an engineering case study and measurement warning. Do not inflate it into a new collusion detector.

## 6. Ethics, prior work and reuse

### Does the product itself create risk?

Yes, potentially. A shared recommendation service can become a coordination mechanism through pooled information, common guidance or a platform objective that favors aggregate revenue.

The proposed deployment reduces some channels through owner approval, tenant-scoped inputs, no competitor data and explicit offers. **None of those establishes legal safety.**

The appendix should cover:

- All experimental merchants, demand and transactions are synthetic.
- No real competing businesses receive coordinated price recommendations.
- Production suggestions use the merchant’s own permitted information.
- The research-only rival feed and automated approval differ from deployment.
- Execution controls can change strategic incentives; they are not inherently procompetitive.
- The audit could help a malicious designer evaluate coordination or disguise its source.
- Results do not establish legality, collusive intent or absence of collusion.
- One model, constructed histories, short horizons and nonbinding capacity limit generalization.

Publish reproducible controls and provenance. Avoid turning the artifact into a service that recommends joint-profit-maximizing prices to real competitors.

### Disclosure for both events

| Work | How to describe it |
|---|---|
| October 13 briefs and October 19 review | Pre-sprint conceptual work |
| Friday research implementation | Work during Apart; preexisting relative to Saturday’s hack |
| Saturday product code | Hack work, also developed during Apart’s dates |
| Sunday adapter, experiments and analysis | Apart research work |
| Borrowed repositories, prompts and model assistance | Attribute their actual contribution |

Apart permits building on prior work, requires distinguishing new work, and warns that undisclosed prior work can disqualify an entry. Its current rules permit AI assistance, including writing, while assigning responsibility to the team. [Official rules](https://apartresearch.com/sprints/ai-collusion-research-sprint-2026-10-23-to-2026-10-25)

**[major] The Berlin public page does not settle prebuilding or reuse rules.** Obtain an organizer ruling before relying on Friday-built product code in the competition. Until then, spend Friday on the research harness, fixtures, account readiness and protocol; build the hack application Saturday.

Reusing code is not itself an identified Apart conflict. Do not assume either event permits undisclosed duplicate work or has no additional prize terms.

## 7. Hour-by-hour execution plan

Assumption: Friday evening begins at 18:00. All times are Berlin local time. Friday and Saturday use CEST; Sunday uses CET.

### Friday: protect the scientific core

| Time | Work |
|---|---|
| 18:00–19:00 | Check admission and hack reuse rules. Freeze product scope, research question and contribution relative to recent papers. |
| 19:00–20:00 | Implement the minimal market and exact best-response calculation. Generate consistent synthetic histories. |
| 20:00–21:00 | Implement myopic, sticky, finite-trigger and fixed-price controls. Define the offer-lock semantics. |
| 21:00–22:00 | Implement coherent forks, common future rival path and no-op checks. Produce a scripted response figure. |
| 22:00–23:00 | Connect one model; pilot parsing, economic competence, latency and cost. |
| 23:00–00:00 | Freeze provisional protocol, preserve pilot logs, prepare the paper outline and disclosure inventory. Stop. |

**Friday gate:** if coherent branching and controls do not work, abandon claims about LLM audit validity. Preserve a smaller reproducible mechanism study rather than carrying a broken harness into Sunday.

**What to pre-build:** research code and synthetic fixtures. Prepare Stripe/Supabase access. Do not spend Friday building polished UI or a broad booking system.

### Saturday: complete the paid booking flow

| Time | Work |
|---|---|
| 10:00–11:00 | Opening, confirm rules, scaffold app, auth and schema. |
| 11:00–12:00 | Natural-language configuration and booking-page rendering. |
| 12:00–13:00 | Connected account and server-created Checkout. |
| 13:00–14:00 | Lunch and sponsor help; complete the first sandbox payment. |
| 14:00–15:00 | Signed webhook, reservation integrity, tenant isolation. |
| 15:00–16:00 | Offer proposal, owner approval and fixed expiry. |
| 16:00–17:00 | Decision logging, full-flow checks, exportable executor. |
| 17:00–18:00 | Freeze features; record backup demo; opt in by **17:40**. |
| 18:00–19:00 | Rehearse, inspect payment evidence, fix only blockers. |
| 19:00–20:00 | Demo and closing. |

**Saturday gates:**

- **12:00:** AI must change actual configuration.
- **14:00:** Checkout must work.
- **15:00:** Booking confirmation must depend on verified payment.
- **17:00:** No new features.

If behind, cut the research visualization first. Next cut the separate AI offer-suggestion call: AI configuration plus an owner-specified offer still provides a coherent adaptive product.

### Sunday: integrate once, then write

| Time | Work |
|---|---|
| 09:00–10:00 | Import Saturday’s actual executor into the harness; verify behavior against fixtures. |
| 10:00–11:00 | Run controls and final pilot; freeze model, protocol, analysis and sample size. |
| 11:00–12:00 | Launch confirmatory collection; write methods while it runs. |
| 12:00–13:00 | Check completion and provenance; finish methods. |
| 13:00–14:00 | Freeze collected data; calculate primary estimates and failures. |
| 14:00–15:00 | Produce the decisive figures. |
| 15:00–16:00 | Write results with uncertainty and denominators. |
| 16:00–17:00 | Write introduction and related work. |
| 17:00–18:00 | Describe the product artifact and deployment differences. |
| 18:00–19:00 | Write limitations and dual-use appendix. |
| 19:00–20:00 | Rewrite for clarity; verify every result and reference. |
| 20:00–21:00 | Format a roughly six-page main report using the official template. |
| 21:00–22:00 | Final PDF, abstract, attribution and link checks. |
| 22:00–23:00 | Submit and verify confirmation. |

### Fallback if Saturday consumes everything

At Sunday 11:00, choose based on implementation readiness, not whether results look favorable:

- **Working executor and harness:** run the planned one-model study.
- **Working harness, failed product integration:** submit the smaller study and describe the product as an application case study. Do not claim its actual code was evaluated.
- **Only scripted controls work:** submit a transparent mechanism note with the concrete counterexample and runnable artifact. Research novelty will be limited.
- **Controls fail:** report incomplete work honestly; do not turn unexplained trajectories into evidence.

Protect writing time. A second model, pooled-data condition or larger architecture is the wrong rescue operation.

## 8. Names and abstract

**Product:** **OwnSlot** — *Describe your classes and offer rules; get a booking page with payments and prices you control.*

Working name only; availability has not been checked.

**Paper:** **Audit the Whole Stack: Separating LLM Pricing Responses from Platform Price Commitments**

**Hypothetical abstract — exactly 150 words. No results exist yet. Use this only if the completed experiments support its findings.**

> Shared booking platforms combine language model recommendations with software controls that constrain published prices. Deviation audits can attribute the resulting price dynamics to strategic behavior by the model. We study this attribution problem using OwnSlot, an adaptive booking and payments prototype, as an executable research artifact. In a synthetic differentiated market, we fork agent states before feedback, impose rival price cuts, increases, or no change, and hold subsequent rival prices constant. We compare immediate execution with fixed duration offer commitments, logging both proposed and published prices. Scripted myopic, sticky best response, and finite punishment policies provide adversarial controls. Our experiments show offer commitments generate persistent price reductions after recommendations have recovered; accounting for execution state reduces apparent enforcement signals. These findings concern audit specificity, not legal compliance or proof of collusion. Capacity remains nonbinding, all transactions are simulated, and conclusions are limited to one model and the tested pricing environment.