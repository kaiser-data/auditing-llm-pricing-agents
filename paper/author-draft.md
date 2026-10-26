# Author sections, drafted from Martin's own words (26 Oct). Edit freely, then say "merge".

## 1. Introduction: new first paragraph (goes before "Software already sets many prices")

AI agents make more and more pricing decisions. We wanted to know how such an agent decides on its own, how it behaves when a rule limits what it can do, and how far it can be trusted with prices. As AI lowers the cost of work, it also changes how competition, work and payment function, and keeping that system sustainable requires understanding what drives these agents.

## Contributions: new point 4 (and point 3 reworded)

3. **Audit and policy recommendations**: log proposals, published prices and rule state together, and test each agent under the rules it actually faces.
4. **A panel of 16 open models.** Models differ hugely: in the same market with the same prompt, the reaction to a rival's cut ranges from none to more than twice the best response, and the hold produces a false punishment signal in 6 of 10 models tested. The model family matters more than the developer's country.

## 5. Discussion: new first paragraph (goes before "What this means for audits")

**Why the model's own pricing behaviour matters.** An agent can be given pricing rules, but when it has none for a situation, or loses them from a long context, its own sense of prices takes over. That underlying behaviour decides how it meets a rival's cut, whether the rival is another agent or a human-run shop, and whether a human owner gets the behaviour they expected. Punishment is only one of many strategies by which firms defend or attack prices, and real cartels are more complicated than one agent facing a scripted rival; our audit isolates one of these signals.

## Future work: replaces the current paragraph

**Future work.** More data, more cases, more models. More histories would narrow the intervals for small effects. Rules calibrated to the German and Western Australian fuel markets would show whether the pattern holds outside our synthetic duopoly. More models and prompt languages would show how far a model's own pricing behaviour carries over. The natural next step is to let two agents, or an agent and human players, meet under a shared rule.

## 6. Conclusion: replaces the placeholder

Legal price rules can produce exactly the punishment pattern that collusion audits look for. Under a three-period hold, part of Qwen3-235B's apparent punishment is the rule holding its price, and more than half is the agent adapting its own proposals to the held price, so logging proposals alone does not clear it. Across 16 open models the reaction to a rival's cut differs hugely, and the false signal appears in 6 of 10 models tested.

For AI safety auditors, the lesson is to audit the exact model under the rules it will face, recording proposals, published prices and rule state, instead of assuming that a result for one model carries over to the next.
