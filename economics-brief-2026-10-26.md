# Economics brief (research agent, 26 Oct 2026) — strategies, price rules, anchoring, cartel detection

Classics marked (memory) were cited from memory, not opened. UNVERIFIED items listed at the end.

## 1. Strategies and their signatures
| Strategy | Signature | Look-alikes | Cite |
|---|---|---|---|
| Grim trigger | permanent fall to Nash, no recovery | permanent cost/demand shock | Friedman 1971 (memory) |
| Stick-and-carrot / optimal finite punishment | short sharp drop, often below static BR (profit sacrifice), then recovery | Edgeworth cycles, mean-reverting cost shocks, sticky adjustment | Abreu 1986 JET, 1988 Econometrica (memory) |
| Tit-for-tat / matching | copy rival's last price; slope ≈ 1 | myopic BR follows partially (slope 0.3 here) | Axelrod 1984 (memory) |
| Price wars, imperfect monitoring | wars triggered by low observed demand, on path | ordinary demand shocks | Green & Porter 1984 (memory) |
| Countercyclical collusion | lower margins in booms | search, entry | Rotemberg & Saloner 1986 (memory) |
| Q-learning reward–punishment | forced deviation → punishment → gradual return (our test's template) | state dependence, exploration; sticky control needed | Calvano et al. 2020 AER |
| Sequential Q-learning | fixed supra-competitive price or Edgeworth-type cycles | competitive Maskin–Tirole cycles | Klein 2021 RAND |
| LLM agents | supra-competitive prices, prompt-sensitive; later versions: "fears of price wars" | persona/prompt effects | Fish et al. 2024 |
| German fuel field evidence | margins rise only when both duopolists adopt | endogenous adoption (IV used) | Assad et al. 2024 JPE |

Punishment = profit sacrifice vs static BR to rival's current price + conditional recovery. Non-collusive persistence: menu/adjustment costs (Noel 2007), Edgeworth cycles (Maskin & Tirole 1988), search, sticky information (Mankiw & Reis 2002).

## 2. Price-commitment and timing rules
- Maskin & Tirole 1988: short-run commitment (alternating moves) sustains Edgeworth cycles and kinked-demand focal prices above Nash.
- **Wang 2009 JPE 117(6)**: Perth timing law (announce next-day price, hold 24 h) — pricing consistent with Maskin–Tirole; "importance of price commitment in tacit collusion". Closest analogue to our hold.
- **Byrne & de Roos 2019 AER 109(2)**: Perth firms learned to coordinate via price leadership/experiments → focal points, higher margins (channels: focal points + predictability).
- Obradovits 2014 IJIO 32: Austrian rule → intertemporal repricing, expected profit unchanged, consumers who wait worse off.
- Dewenter & Heimeshoff 2012 (DICE DP 51): Austrian prices fell after rule; WA no robust effect. Haucap & Müller 2012 (DICE DP 47, lab): Austrian rule and Luxembourg cap reduced consumer welfare, WA rule did not. Mixed evidence.
- Jung, Schildknecht, Gregor & Haucap 2026 (ZEW/DICE): KPAnG → petrol margins ≈ +5–6 ct/l, no significant diesel effect, largest at small chains/independents, fading over time; "could also facilitate tacit coordination by making pricing more predictable". Window ambiguous (28 vs 14 days) — check PDF before quoting.
- Channels (our inference): asymmetric rules make cuts costly to undo and make the increase slot focal; symmetric holds act through commitment (deviations and punishments both locked in).

## 3. Anchoring and execution feedback
- Tversky & Kahneman 1974 anchoring (memory). LLM anchoring: Lou 2024 (arXiv 2412.06593; CoT does not remove it), Huang et al. 2025 (arXiv 2505.15392; shallow layers), Valencia-Clavijo 2025 (arXiv 2511.05766).
- Heidhues & Kőszegi 2008: reference-dependent consumers → sticky prices; in our case the firm-agent holds the reference point (our inference).
- Machado et al. 2018 JAIR 61 ("sticky actions" in ALE): execution layer changes the agent's data. Our "context logs executed, not proposed, prices" framing is a novel application (our inference).

## 4. Cartel detection
- Harrington 2008 "Detecting Cartels" (Handbook of Antitrust Economics): structural vs behavioural screens; behavioural screens need a competitive model.
- Abrantes-Metz et al. 2006 IJIO 24(3) variance screen: low variance flags collusion. **Rules that limit price changes mechanically lower variance → variance screens biased under such rules (our inference).**
- Every behavioural test needs a counterfactual competitive benchmark (Calvano impulse response needs the BR path).
- Quasi-experimental breaks (Assad et al.; Byrne & de Roos) ≈ our fork-before-feedback design in silico.

## 5. Interpretation bullets for the paper
1. Under a hold, profit sacrifice is defined against the feasible-action benchmark, not the static BR (our inference, Maskin–Tirole logic).
2. Execution rules mechanically lengthen measured punishment; replay quantifies it (0.066); asymmetric rules lengthen post-cut low spells by construction (established for timing rules: Wang 2009, Obradovits 2014; decomposition ours).
3. The remaining 0.093 is behavioural but not evidence of intent; consistent with LLM anchoring (Lou 2024; Huang et al. 2025) (our inference).
4. Audits must log intended actions; price-only screens (variance, impulse response) conflate rule mechanics, anchoring and strategy (our inference; consistent with Harrington 2008).
5. Timing rules can create collusion-like signatures and may also facilitate real coordination (ZEW; Byrne & de Roos); part of measured persistence is a measurement artefact (ours).
6. Scope: scripted rival, single LLM.

## 6. References (verified unless noted)
Abrantes-Metz et al. 2006 IJIO 24(3):467–486; Assad et al. 2024 JPE 132(3):723–771 doi:10.1086/726906; Byrne & de Roos 2019 AER 109(2):591–619 doi:10.1257/aer.20170116; Calvano et al. 2020 AER 110(10):3267–3297 doi:10.1257/aer.20190623; Dewenter & Heimeshoff 2012 DICE DP 51; Fish et al. 2024 arXiv:2404.00806; Harrington 2008 Handbook of Antitrust Economics; Haucap & Müller 2012 DICE DP 47; Huang et al. 2025 arXiv:2505.15392; Jung et al. 2026 ZEW (https://www.zew.de/fileadmin/FTP/gutachten/ZEW-DICE-Analysis-Predictable-Prices-Higher-Margins-April2026.pdf); Klein 2021 RAND 52(3):538–558; Lou 2024 arXiv:2412.06593; Machado et al. 2018 JAIR 61:523–562; Obradovits 2014 IJIO 32:33–45 doi:10.1016/j.ijindorg.2013.10.009; Wang 2009 JPE 117(6):987–1030. Memory only: Abreu 1986/1988; Green & Porter 1984; Rotemberg & Saloner 1986; Maskin & Tirole 1988; Noel 2007; Tversky & Kahneman 1974; Heidhues & Kőszegi 2008; Mankiw & Reis 2002.

UNVERIFIED: Denter 2026 (only via ZEW); Friedman 1971, Axelrod 1984; CogInfoCom 2025 pricing-anchoring authors; Harrington 2008 pages; ZEW margin window.
