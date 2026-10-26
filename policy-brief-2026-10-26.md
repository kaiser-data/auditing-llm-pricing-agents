# Policy brief (research agent, 26 Oct 2026 ~00:30) — condensed, for §5 and Appendix A

Verified unless marked UNVERIFIED / snippet.

## Corrections to our premise
- ZEW/DICE noon-rule study (Jung, Schildknecht, Gregor, Haucap 2026): ZEW page (fetched by us) says gasoline margins +≈5–6 c/l, no significant diesel effect, strongest at small/independent stations. Use "about 5–6 c/l for gasoline".
- WA FuelWatch: ACCC finding is contested (snippets suggest the 2007 ACCC report found a 1.9 c/l margin fall; criticism came from independents). Write "contested", do not attribute criticism to the ACCC.

## A. Landscape
| Measure | Where | Status | Relevance | URL |
|---|---|---|---|---|
| Preventing Algorithmic Collusion Act S.232 | US | reintroduced 23 Jan 2025; latest action UNVERIFIED | presumptions for algorithm users | https://www.dlapiper.com/insights/publications/2025/02/the-preventing-algorithmic-collusion-act-2025 |
| CA AB 325 (+SB 763) | California | signed 6 Oct 2025, in force 1 Jan 2026 | "common pricing algorithm"; no ban on algorithmic pricing | https://www.wilmerhale.com/en/insights/client-alerts/20251114-california-zeroes-in-on-common-pricing-algorithms |
| NY S7882, GBL §340-b | New York | signed 16 Oct 2025 | bans rent tools with a coordinating function | https://www.velaw.com/insights/new-york-enacts-s7882-prohibiting-algorithmic-coordination-in-residential-rent-setting/ |
| US v. RealPage consent decree | US | proposed 24 Nov 2025; entry UNVERIFIED | no rival nonpublic runtime data, training data ≥12 months old, monitor; regulates data pipeline, not prices | https://www.justice.gov/opa/pr/justice-department-requires-realpage-end-sharing-competitively-sensitive-information-and |
| EU AI Act Annex III | EU | in force | pricing high-risk only for life/health insurance | https://artificialintelligenceact.eu/annex/3/ |
| Horizontal Guidelines 2023 | EU | 2023 | shared third-party tools, hub-and-spoke, foreseeability | via OECD G7 report |
| CMA pricing-algorithm guidance | UK | 8 Nov 2024 | "not knowing what an algorithm is doing is no excuse" | https://competitionandmarkets.blog.gov.uk/2024/11/08/pricing-algorithms-and-competition-law-what-you-need-to-know/ |
| CMA "AI and collusion" | UK | 4 Mar 2026 | cites Fish et al.; recommends stress testing; no record-keeping duty | https://competitionandmarkets.blog.gov.uk/2026/03/04/ai-and-collusion-frontiers-opportunities-and-challenges/ |
| OECD Algorithmic Competition | OECD | Jun 2023 | auditing, XAI as investigation tools | https://www.oecd.org/en/publications/algorithmic-competition_cb3b2075-en.html |
| OECD G7 report | G7 | Oct 2025 | ex-ante rules "not common practice" | https://www.oecd.org/content/dam/oecd/en/publications/reports/2025/10/algorithmic-pricing-and-competition-in-g7-jurisdictions_f936689b/f36dacf8-en.pdf |
| KPAnG noon rule | DE | in force 1 Apr 2026, evaluation after 1 year | rises once a day at 12:00, cuts anytime; MTS-K logs all published prices; ~22 changes/day before | https://dserver.bundestag.de/btd/21/047/2104744.pdf |
| Spritpreis-Verordnungen | AT | since 2009, noon since 2011, extended 3 years from 2026 | same rule; E-Control price database | https://www.bmwet.gv.at/Presse/Archiv/BMWET-Pressemeldungen-2025/PA-BMWET-Dezember-2025/spritpreis-verordnungen-spritpreisrechner-verlaengert.html |
| Omnibus Art. 6a Dir. 98/6/EC | EU | since 28 May 2022 | 30-day prior price for discounts | (snippet) |

## B. Levers our finding supports
1. Execution-provenance logging: proposed price, published price, time, rule state. Precedent: MiFID II RTS 6 (Reg. 2017/589) record-keeping; MTS-K / E-Control already log published prices. https://www.legislation.gov.uk/eur/2017/589/contents
2. Audit protocols that model the execution layer (proposals + rule state as outcome/conditioning).
3. Ex-ante testing / sandboxes under the rules actually in force (RTS 6 Arts. 5–10 testing precedent; CMA stress-testing).
4. Design price-change rules with AI agents in mind; use KPAnG 1-year evaluation and Austria reviews (Brown & MacKay 2023; ZEW margins).
5. Right-to-audit / monitor for shared pricing AI, extending the RealPage decree model to LLM vendors.
6. Mystery-shopper / scraping audits need rule metadata (CMA 2021 techniques via OECD G7 report).

## C. Cheap-AI-pricing future
- Assad et al. (JPE 2024): algorithmic pricing adoption in German fuel raised margins 9% (non-monopoly), 28% in duopolies only when both adopt → universal cheap adoption may raise prices.
- Brown & MacKay (AEJ Micro 2023): faster pricing tech raises prices; best-equipped firms gain most.
- KPAnG margin rises largest at small chains/independents. No direct evidence that cheap LLM tools close the SME gap (UNVERIFIED either way).
- CMA "Agentic AI and consumers" (9 Mar 2026): consumer agents can cut search/switching costs; risks of lock-in and steering; calls for common permissions and logging. https://www.gov.uk/government/publications/agentic-ai-and-consumers/agentic-ai-and-consumers
- Monoculture: Kleinberg & Raghavan (PNAS 2021). One model/vendor across many firms ~ a hub; legal status open (speculation).
- Design principles (our recommendations): (1) provenance by default; (2) data firewalls, not price bans; (3) diversity and interoperable consumer agents; (4) test rules against agents before and after adoption.

## D. Dual use
"The rule did it" can cover coordinated stickiness; a vendor could pick hold lengths or windows that soften competition and call it compliance. Published-price logs, and even proposed-vs-published logs alone, cannot rebut this. Tamper-evident logs of rule state + proposals at each step let an auditor check whether proposals stayed low after the rule lifted (agent adaptation) and whether rule settings moved in step across rivals (possible hub).

## E. References
Assad et al. 2024 JPE 132(3); Brown & MacKay 2023 AEJ Micro 15(2); Kleinberg & Raghavan 2021 PNAS 118(22); OECD 2023; OECD 2025 G7; CMA 2026 (two); US DOJ 2025 RealPage; Bundestag Drs. 21/4744 (2026); Reg. (EU) 2017/589.
