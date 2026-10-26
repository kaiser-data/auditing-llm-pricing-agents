/* Pricing Audit Playground: client UI.
 * Same behaviour as demo/app.js; charts drawn with Observable Plot, one anime.js moment. */
import * as Plot from "@observablehq/plot";
import { createTimeline, svg as animeSvg } from "animejs";
import * as S from "../lib/sim.js";

const SAVE_ENDPOINT = document.body.dataset.saveEndpoint || ""; // POST {params, results} -> {id}
const LOAD_ENDPOINT = document.body.dataset.loadEndpoint || ""; // GET  ?id=<id> -> {params}

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const MINUS = "−";
const fmtR = (v) => (Math.abs(v) < 5e-5 ? "0.000" : (v < 0 ? MINUS : "+") + Math.abs(v).toFixed(3));
const fmtU = (v) => (Math.abs(v) < 5e-5 ? "0.000" : (v < 0 ? MINUS : "") + Math.abs(v).toFixed(3));
const eur = (v) => "€" + v.toFixed(2);
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ================================================================ state */
const DEFAULTS = { agent: "myopic", lam: 0.5, rule: "hold", hold: 3, noon: 3, phase: 0, base: 40, shock: 8, arm: "cut", tau: 0.05 };
const NUMERIC = ["lam", "hold", "noon", "phase", "base", "shock", "tau"];
const LIMITS = { lam: [0.1, 0.9], hold: [2, 8], noon: [2, 6], phase: [0, 5], base: [38, 48], shock: [2, 12], tau: [0.01, 0.2] };
const CHOICES = { agent: ["fixed", "myopic", "sticky", "trigger"], rule: ["none", "hold", "noon"], arm: ["cut", "raise"] };
let state = Object.assign({}, DEFAULTS);
let tab = "play";

function sanitize(p) {
  const out = Object.assign({}, state);
  for (const [k, v] of Object.entries(p || {})) {
    if (CHOICES[k] && CHOICES[k].includes(v)) out[k] = v;
    else if (NUMERIC.includes(k) && v !== "" && isFinite(+v)) {
      const [lo, hi] = LIMITS[k];
      out[k] = Math.min(hi, Math.max(lo, +v));
    }
  }
  out.lam = Math.round(out.lam * 10) / 10;
  out.base = Math.round(out.base * 2) / 2;
  out.shock = Math.round(out.shock * 2) / 2;
  out.hold = Math.round(out.hold); out.noon = Math.round(out.noon);
  out.phase = Math.min(Math.round(out.phase), out.noon - 1);
  out.tau = Math.round(out.tau * 100) / 100;
  return out;
}

function readHash() {
  const h = new URLSearchParams(location.hash.replace(/^#/, ""));
  const p = {};
  for (const [k, v] of h) p[k] = v;
  if (["play", "llm", "about"].includes(p.tab)) tab = p.tab;
  state = sanitize(p);
}
function writeHash() {
  const q = new URLSearchParams();
  q.set("tab", tab);
  for (const k of Object.keys(DEFAULTS)) q.set(k, state[k]);
  history.replaceState(null, "", location.pathname + location.search + "#" + q.toString());
}

/* ================================================================ chart plumbing */
const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
function palette() {
  return {
    pub: css("--c-pub"), prop: css("--c-prop"), none: css("--c-none"), replay: css("--c-replay"),
    rival: css("--c-rival"), blocked: css("--c-blocked"), window: css("--c-window"),
    ink: css("--ink"), muted: css("--ink-muted"), subtle: css("--ink-subtle"), grid: css("--c-grid"),
    canvas: css("--canvas"), hairline: css("--hairline"),
  };
}
let C = palette();
const DASH = { prop: "5 4", replay: "1.5 4" };

const charts = new Map(); // element -> draw(width)
const ro = new ResizeObserver((entries) => {
  for (const e of entries) {
    const w = Math.round(e.contentRect.width);
    if (w && w !== e.target._w) { e.target._w = w; const f = charts.get(e.target); if (f) f(w); }
  }
});
function mount(el, draw) {
  if (!charts.has(el)) ro.observe(el);
  charts.set(el, draw);
  const w = Math.round(el.clientWidth);
  if (w) { el._w = w; draw(w); }
}
function put(el, fig) {
  el.replaceChildren(fig);
  return fig;
}
function redrawAll() {
  C = palette();
  for (const [el, f] of charts) if (el.clientWidth) f(Math.round(el.clientWidth));
}

const baseStyle = () => ({ background: "transparent", color: C.ink, fontFamily: css("--font-body"), fontSize: "12px", fontVariantNumeric: "tabular-nums", overflow: "visible" });
const windowBand = () => Plot.rect([{ x1: 2, x2: 5 }], { x1: "x1", x2: "x2", fill: C.window, fillOpacity: 0.09 });
const blockedBands = (hs) => Plot.rect(hs, { x1: (h) => h - 0.5, x2: (h) => h + 0.5, fill: C.blocked, fillOpacity: 0.13 });
const tipOpts = () => ({ fill: C.canvas, stroke: C.hairline, fontFamily: css("--font-body"), fontSize: 12, lineHeight: 1.35 });

function swatch(kind, color, dash) {
  if (kind === "band") return `<svg width="16" height="12" aria-hidden="true"><rect width="16" height="12" fill="${color}" fill-opacity="0.22"/></svg>`;
  return `<svg width="20" height="8" aria-hidden="true"><line x1="1" y1="4" x2="19" y2="4" stroke="${color}" stroke-width="2.5"${dash ? ` stroke-dasharray="${dash}"` : ""}/></svg>`;
}
function legend(el, items) {
  el.innerHTML = items.map((it) => `<span>${swatch(it.band ? "band" : "line", it.color, it.dash)}${esc(it.label)}</span>`).join("");
}

/* ================================================================ playground */
const AGENT_HINT = {
  fixed: "Always posts €42 and ignores the rival. Nothing should ever be flagged.",
  myopic: "Best-responds to the rival's latest price. No memory, so no intent to punish.",
  sticky: "Moves a share λ of the way to the best response each period, anchored on its own last proposal.",
  trigger: "Prices at €46; if the rival undercuts its usual price by ≥ 3, drops to the Nash price €36 for 3 periods. A known punishment rule, included as a check.",
};
const RULE_HINT = {
  none: "Every proposal is published at once.",
  hold: "A newly published price is held for a set number of periods, like an offer hold or Western Australia's 24-hour lock.",
  noon: "Cuts publish at once; increases only in a noon slot, like Germany's 2026 fuel-price rule.",
};
const AGENT_NAME = { fixed: "Fixed-price", myopic: "Myopic", sticky: "Sticky", trigger: "Finite-trigger" };

function syncControls() {
  const f = $("controls");
  for (const name of ["agent", "rule", "arm"]) f.querySelectorAll(`input[name=${name}]`).forEach((r) => (r.checked = r.value === state[name]));
  $("phase").max = state.noon - 1;
  for (const k of ["lam", "hold", "noon", "phase", "base", "shock", "tau"]) $(k).value = state[k];
  $("lam-out").textContent = state.lam.toFixed(1);
  $("hold-out").textContent = `${state.hold} periods`;
  $("noon-out").textContent = `${state.noon} periods`;
  $("phase-out").textContent = `${state.phase} of 0–${state.noon - 1}`;
  $("base-out").textContent = eur(state.base);
  $("shock-out").textContent = eur(state.shock);
  $("tau-out").textContent = state.tau.toFixed(2);
  document.querySelectorAll("[data-show]").forEach((el) => {
    const [k, v] = el.dataset.show.split("=");
    el.hidden = state[k] !== v;
  });
  $("agent-hint").textContent = AGENT_HINT[state.agent];
  $("rule-hint").textContent = RULE_HINT[state.rule];
}

function ruleText(p) {
  if (p.rule === "hold") return `a ${p.hold}-period hold`;
  if (p.rule === "noon") return `a noon rule (increases every ${p.noon} periods, slot ${p.phase})`;
  return "no execution rule";
}

let lastResult = null;
function renderPlay() {
  const out = S.simulate(state);
  lastResult = out;
  const { res, sign, arm } = out;
  const pre = out.warmupHistory.slice(-4);
  const xs = [-4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8];
  const cat = (br, key) => pre.map((r) => r[key]).concat(br.map((r) => r[key]));
  const pub = cat(out.rule.shock, "published"), prop = cat(out.rule.shock, "proposed");
  const none = cat(out.none.shock, "published"), rival = cat(out.rule.shock, "rival");
  const basePub = cat(out.rule.noop, "published");
  const blocked = out.rule.shock.filter((r) => r.locked && r.proposed !== r.published).map((r) => r.h);
  const rivalShock = out.rule.shock[0].rival;
  const rows = xs.map((h, i) => ({ h, published: pub[i], proposed: prop[i], none: none[i], rival: rival[i], noShock: basePub[i], blocked: blocked.includes(h) }));

  $("price-sub").textContent = `${AGENT_NAME[state.agent]} agent${state.agent === "sticky" ? ` (λ = ${state.lam.toFixed(1)})` : ""} under ${ruleText(state)}. `
    + `Rival usually at ${eur(state.base)}, ${arm === "cut" ? "cuts" : "raises"} to ${eur(rivalShock)} in period 0 only, then returns.`;
  legend($("price-legend"), [
    { color: C.pub, label: "published (with rule)" },
    { color: C.prop, dash: DASH.prop, label: "proposed by the agent" },
    { color: C.none, label: "same agent, no rule" },
    { color: C.rival, label: "rival price" },
    ...(blocked.length ? [{ band: true, color: C.blocked, label: "rule blocked the proposal" }] : []),
  ]);

  const priceTitle = (d) => [
    `Period ${d.h}${d.h === 0 ? " (shock)" : ""}`,
    `published  ${eur(d.published)}`, `proposed   ${eur(d.proposed)}`, `no rule    ${eur(d.none)}`, `rival      ${eur(d.rival)}`,
    `without the shock: ${eur(d.noShock)}`, ...(d.blocked ? ["Rule blocked this proposal."] : []),
  ].join("\n");
  mount($("price-chart"), (w) => {
    const all = rows.flatMap((d) => [d.published, d.proposed, d.none, d.rival]);
    const fig = Plot.plot({
      width: w, height: w < 520 ? 260 : 320, marginLeft: 46, marginRight: 12, marginTop: 18, marginBottom: 40,
      style: baseStyle(),
      x: { domain: [-4.5, 8.5], ticks: xs.filter((x) => w >= 480 || x % 2 === 0), label: "periods relative to the rival's shock", labelAnchor: "center", labelArrow: "none", tickSize: 0 },
      y: { domain: [Math.min(...all) - 1, Math.max(...all) + 1], nice: true, grid: true, label: null, tickFormat: (v) => "€" + v, ticks: 5 },
      marks: [
        blockedBands(blocked),
        Plot.ruleX([0], { stroke: C.muted, strokeDasharray: "2 3" }),
        Plot.text([0], { x: (d) => d, frameAnchor: "top", dx: 5, dy: -12, textAnchor: "start", text: () => (arm === "cut" ? "rival cut" : "rival raise"), fill: C.muted }),
        Plot.lineY(rows, { x: "h", y: "rival", stroke: C.rival, strokeWidth: 1.25, strokeOpacity: 0.8 }),
        Plot.lineY(rows, { x: "h", y: "none", stroke: C.none, strokeWidth: 2 }),
        Plot.lineY(rows, { x: "h", y: "published", stroke: C.pub, strokeWidth: 2.75, className: "m-pub" }),
        Plot.lineY(rows, { x: "h", y: "proposed", stroke: C.prop, strokeWidth: 2, strokeDasharray: DASH.prop }),
        Plot.ruleX(rows, Plot.pointerX({ x: "h", stroke: C.subtle, strokeWidth: 1 })),
        Plot.dot(rows, Plot.pointerX({ x: "h", y: "published", fill: C.pub, r: 4.5 })),
        Plot.dot(rows, Plot.pointerX({ x: "h", y: "proposed", fill: C.prop, r: 4 })),
        Plot.tip(rows, Plot.pointerX({ x: "h", y: "published", title: priceTitle, ...tipOpts() })),
      ],
      ariaLabel: `Price paths around the shock. Published ${pub.slice(4).join(", ")}; proposed ${prop.slice(4).join(", ")}.`,
    });
    put($("price-chart"), fig);
  });
  $("price-table").innerHTML = `<table><thead><tr><th>Period</th><th>Rival</th><th>Proposed</th><th>Published</th><th>No rule</th><th>No shock</th><th>Blocked</th></tr></thead><tbody>`
    + rows.map((d) => `<tr><td>${d.h}</td><td>${d.rival.toFixed(2)}</td><td>${d.proposed.toFixed(2)}</td><td>${d.published.toFixed(2)}</td><td>${d.none.toFixed(2)}</td><td>${d.noShock.toFixed(2)}</td><td>${d.blocked ? "yes" : ""}</td></tr>`).join("")
    + "</tbody></table>";

  // Gap profile (the paper's lag figure for this one scenario).
  const hs = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  const gap = (br, key) => hs.map((h) => (sign * (br.noop[h][key] - br.shock[h][key])) / S.G);
  const gPub = gap(out.rule, "published"), gProp = gap(out.rule, "proposed"), gNone = gap(out.none, "published"), gRep = gap(out.replay, "published");
  const hasRule = state.rule !== "none";
  legend($("gap-legend"), [
    { color: C.none, label: "no rule" },
    ...(hasRule ? [{ color: C.pub, label: "rule: published" }, { color: C.prop, dash: DASH.prop, label: "rule: proposed" }, { color: C.replay, dash: DASH.replay, label: "replay of no-rule proposals" }] : []),
    { band: true, color: C.window, label: "audit window" },
  ]);
  const gRows = hs.map((h, i) => ({ h, none: gNone[i], pub: gPub[i], prop: gProp[i], rep: gRep[i] }));
  mount($("gap-chart"), (w) => {
    const series = [["none", C.none, null, 2.5], ...(hasRule ? [["pub", C.pub, null, 2.5], ["prop", C.prop, DASH.prop, 2], ["rep", C.replay, DASH.replay, 2.25]] : [])];
    const title = (d) => [`Period ${d.h}`, `no rule    ${fmtR(d.none)}`, ...(hasRule ? [`published  ${fmtR(d.pub)}`, `proposed   ${fmtR(d.prop)}`, `replay     ${fmtR(d.rep)}`] : [])].join("\n");
    put($("gap-chart"), lagPlot(w, gRows, series, title, `periods after the ${arm}`, null));
  });

  // Instrument panel.
  const tiles = [
    { lbl: "R published", color: C.pub, v: fmtU(res.R_pub), d: "what a price-only audit measures" },
    { lbl: "R proposed", color: C.prop, dash: DASH.prop, v: fmtU(res.R_prop), d: "the agent's own intent" },
    { lbl: "R without rule", color: C.none, v: fmtU(res.R_pub_none), d: "same agent, immediate execution" },
    { lbl: "θ = R(rule) − R(no rule)", v: fmtR(res.theta_pub), d: "persistence added by the rule", key: true },
    { lbl: "replay", color: C.replay, dash: DASH.replay, v: fmtR(res.theta_replay), d: "the no-rule proposals pushed through the rule" },
    { lbl: "adaptation = θ − replay", v: fmtR(res.adaptation), d: "proposals changed by facing the rule" },
  ];
  $("tiles").innerHTML = tiles.map((t) => `<div class="${t.key ? "key" : ""}"><dt>${t.color ? swatch("line", t.color, t.dash) : ""}${t.lbl}</dt><dd class="v">${t.v}</dd><dd class="d">${t.d}</dd></div>`).join("");

  // Auditors.
  const flagWord = arm === "cut" ? "Looks like punishment" : "Looks like accommodation";
  const okWord = "Looks like a competitive response";
  const naive = res.R_pub > state.tau, aware = res.R_prop > state.tau;
  const verdict = (who, sees, flag, val) => `<div class="who">${who}</div><div class="sees">${sees}</div>`
    + `<div class="tag">${flag ? "Flagged" : "Not flagged"}</div>`
    + `<div class="say">${flag ? flagWord : okWord}</div>`
    + `<div class="val">R = ${fmtU(val)} ${flag ? ">" : "≤"} τ = ${state.tau.toFixed(2)}</div>`;
  const vn = $("v-naive"), va = $("v-aware");
  vn.className = "verdict " + (naive ? "flag" : "ok");
  va.className = "verdict " + (aware ? "flag" : "ok");
  vn.innerHTML = verdict("Naive auditor", "reads published prices only", naive, res.R_pub);
  va.innerHTML = verdict("Execution-aware auditor", "reads the agent's proposed prices", aware, res.R_prop);
  const inWin = blocked.filter((h) => h >= 2 && h <= 5).length;
  let note;
  if (naive && !aware) note = `The two disagree. The agent had already proposed to move back, but the rule held the published price in ${inWin} of the 4 window periods. The rule added θ = ${fmtR(res.theta_pub)} of persistence on its own.`;
  else if (naive && aware) note = res.theta_pub > 1e-9
    ? `Both flag it. The agent's own proposals stay away from the no-shock path, and the rule adds θ = ${fmtR(res.theta_pub)} on top.`
    : "Both flag it, and the rule changes nothing: the persistence is in the agent's own proposals.";
  else if (!naive && aware) note = "Only the proposals respond persistently; the rule keeps the published price from showing it.";
  else note = res.theta_pub > 1e-9
    ? `Neither flags it at this threshold, though the rule still adds θ = ${fmtR(res.theta_pub)}. Lower τ to see the naive auditor flip.`
    : "Neither flags it at this threshold.";
  $("verdict-note").textContent = note;
  writeHash();
}

/* Shared lag-profile plot: rows {h, <key>...}; series [key, colour, dash, width]. */
function lagPlot(w, rows, series, title, xLabel, yDomain, ariaLabel) {
  const vals = rows.flatMap((d) => series.map(([k]) => d[k]));
  const dom = yDomain || [Math.min(0, ...vals), Math.max(...vals)];
  const pad = (dom[1] - dom[0] || 1) * 0.08;
  return Plot.plot({
    width: w, height: 230, marginLeft: 46, marginRight: 12, marginTop: 14, marginBottom: 40,
    style: baseStyle(),
    x: { domain: [0, 8], ticks: 9, label: xLabel, labelAnchor: "center", labelArrow: "none", tickSize: 0 },
    y: { domain: [dom[0] - (dom[0] < 0 ? pad : 0), dom[1] + pad], nice: true, grid: true, label: "gap ÷ G", labelArrow: "none", tickFormat: (v) => v.toFixed(2), ticks: 4 },
    marks: [
      windowBand(),
      Plot.ruleY([0], { stroke: C.muted }),
      ...series.map(([k, color, dash, sw]) => Plot.lineY(rows, { x: "h", y: k, stroke: color, strokeWidth: sw, strokeDasharray: dash || undefined })),
      Plot.ruleX(rows, Plot.pointerX({ x: "h", stroke: C.subtle })),
      Plot.tip(rows, Plot.pointerX({ x: "h", y: series[series.length > 1 ? 1 : 0][0], title, ...tipOpts() })),
    ],
    ariaLabel: ariaLabel || "Gap to the no-shock path, as a share of G",
  });
}

/* ================================================================ the one orchestrated moment */
let moment = null;
function playMoment() {
  if (reducedMotion()) return;
  const path = $("price-chart").querySelector("g.m-pub path");
  const say = $("v-naive").querySelector(".say");
  const tag = $("v-naive").querySelector(".tag");
  if (!path || !say) return;
  if (moment) moment.revert();
  const [drawable] = animeSvg.createDrawable(path);
  moment = createTimeline({ defaults: { ease: "outQuad" } })
    .add(drawable, { draw: ["0 0", "0 1"], duration: 900, ease: "inOutQuad" })
    .add(say, { translateY: [10, 0], duration: 420 }, "-=260")
    .add(tag, { scale: [1.12, 1], duration: 360, ease: "outBack(2)" }, "<<");
  moment.then(() => { moment = null; });
}

function onInput(e) {
  const t = e.target;
  if (!t.name) return;
  const patch = {};
  patch[t.name] = t.type === "radio" ? t.value : +t.value;
  state = sanitize(Object.assign({}, state, patch));
  syncControls();
  renderPlay();
}
$("controls").addEventListener("submit", (e) => e.preventDefault());
$("controls").addEventListener("input", onInput);
$("controls").addEventListener("change", (e) => { if (e.target.name === "shock" || e.target.name === "arm") playMoment(); });
$("tau").addEventListener("input", onInput);
document.querySelectorAll("[data-preset]").forEach((b) => b.addEventListener("click", () => {
  const p = Object.fromEntries(new URLSearchParams(b.dataset.preset));
  state = sanitize(Object.assign({}, DEFAULTS, { base: state.base, shock: state.shock, arm: "cut", tau: state.tau }, p));
  syncControls();
  renderPlay();
  playMoment();
}));

/* ================================================================ save / share */
function initShare() {
  if (!SAVE_ENDPOINT) { $("share-box").hidden = true; return; }
  $("share-btn").addEventListener("click", async () => {
    const outEl = $("share-out");
    outEl.textContent = "Saving…";
    try {
      // Accepted names: agent, rule, arm (strings); lam, hold, noon, phase, base, shock, tau (numbers).
      const params = Object.assign({}, state);
      const r = await fetch(SAVE_ENDPOINT, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ params, results: lastResult ? lastResult.res : null }),
      });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const { id } = await r.json();
      if (!id) throw new Error("no id in reply");
      const url = `${location.origin}${location.pathname}?s=${encodeURIComponent(id)}${location.hash}`;
      outEl.innerHTML = `Share link: <a href="${esc(url)}">${esc(url)}</a>`;
      if (navigator.clipboard) navigator.clipboard.writeText(url).then(() => outEl.insertAdjacentText("beforeend", " (copied)"), () => {});
    } catch (err) {
      outEl.textContent = "Could not save (" + err.message + "). The address bar link still works.";
    }
  });
}
async function loadShared() {
  const id = new URLSearchParams(location.search).get("s");
  if (!id || !LOAD_ENDPOINT) return;
  try {
    const r = await fetch(`${LOAD_ENDPOINT}?id=${encodeURIComponent(id)}`);
    if (!r.ok) throw new Error("HTTP " + r.status);
    const data = await r.json();
    state = sanitize(Object.assign({}, DEFAULTS, data.params || {}));
    syncControls();
    renderPlay();
  } catch (err) {
    console.warn("Could not load shared scenario", err);
  }
}

/* ================================================================ real LLM tab */
let llm = null, llmRendered = false;
const ex = { k: 0, lock: 3, sel: { arm: "cut", h: 1 } };

async function loadLLM() {
  if (llm) return llm;
  try {
    const r = await fetch(new URL("/llm-results.json", location.origin));
    if (!r.ok) throw new Error("HTTP " + r.status);
    llm = await r.json();
  } catch (err) {
    $("llm-intro").textContent = "Could not load llm-results.json. Serve the built site over HTTP rather than opening the file directly.";
    throw err;
  }
  return llm;
}

const findKey = (obj, test) => Object.keys(obj).find(test);

function renderLLM() {
  const d = llm;
  const L = d.lags;
  const kNone = findKey(L, (k) => /^no rule/.test(k));
  const kHP = findKey(L, (k) => /^hold.*published/.test(k)), kHQ = findKey(L, (k) => /^hold.*proposed/.test(k));
  const kRep = findKey(L, (k) => /^replay/.test(k));
  const kNP = findKey(L, (k) => /^noon.*published/.test(k)), kNQ = findKey(L, (k) => /^noon.*proposed/.test(k));
  const hs = L[kNone].mean.map((_, i) => i);
  $("llm-intro").innerHTML = `Model: <strong>${esc(d.model)}</strong>, prompted as the pricing agent. ${d.n_hist} market histories, ${d.reps} sampled repeats each, `
    + "forked at the same moment into a rival cut and a no-cut baseline. The agent proposes; the rule decides what is published.";

  const all = [kNone, kHP, kHQ, kRep, kNP, kNQ].flatMap((k) => L[k].mean);
  const dom = [Math.min(0, ...all), Math.max(...all)];
  legend($("lag-legend"), [
    { color: C.none, label: "no rule" }, { color: C.pub, label: "rule: published" },
    { color: C.prop, dash: DASH.prop, label: "rule: proposed" }, { color: C.replay, dash: DASH.replay, label: "replay of no-rule proposals" },
    { band: true, color: C.window, label: "audit window" },
  ]);
  const lag = (el, defs, label) => {
    const rows = hs.map((h) => Object.fromEntries([["h", h], ...defs.map(([k], j) => ["s" + j, L[k].mean[h]])]));
    mount(el, (w) => {
      const series = defs.map(([, key, dash, sw], j) => ["s" + j, C[key], dash, sw]);
      const title = (r) => [`Period ${r.h}`, ...defs.map(([k], j) => `${k}: ${fmtU(r["s" + j])}`)].join("\n");
      put(el, lagPlot(w, rows, series, title, "periods after cut", dom, label));
    });
  };
  lag($("lag-hold"), [[kNone, "none", null, 2.5], [kHP, "pub", null, 2.5], [kHQ, "prop", DASH.prop, 2], [kRep, "replay", DASH.replay, 2.25]], "Lag profile under the hold");
  lag($("lag-noon"), [[kNone, "none", null, 2.5], [kNP, "pub", null, 2.5], [kNQ, "prop", DASH.prop, 2]], "Lag profile under the noon rule");

  // Decomposition with 95% intervals.
  const kDec = findKey(d, (k) => /^decomposition_hold\d+$/.test(k));  // per-rule object, not the nested "decomposition" map
  const dec = d[kDec];
  const holdN = (kDec.match(/\d+/) || ["?"])[0];
  $("decomp-sub").textContent = `Hold ${holdN}, published prices. Points are means over ${dec.n_hist} histories; bars are 95% bootstrap intervals (histories resampled).`;
  const defs = [
    ["theta_closed", "θ, total", "R(hold) − R(no rule)", "pub"],
    ["theta_replay", "replay", "the rule alone, on no-rule proposals", "replay"],
    ["adaptation", "adaptation", "the model's proposals change", "prop"],
  ];
  const drows = defs.map(([k, name, sub, key]) => ({ name, sub, key, m: dec[k][0], lo: dec[k][1], hi: dec[k][2] }));
  mount($("decomp-chart"), (w) => {
    const col = (r) => C[r.key];
    put($("decomp-chart"), Plot.plot({
      width: w, height: 170, marginLeft: w < 480 ? 84 : 96, marginRight: 16, marginTop: 8, marginBottom: 32,
      style: baseStyle(),
      x: { domain: [Math.min(0, ...drows.map((r) => r.lo)), Math.max(...drows.map((r) => r.hi))], nice: true, grid: true, label: "share of G", labelAnchor: "center", labelArrow: "none", ticks: 5 },
      y: { domain: drows.map((r) => r.name), label: null, tickSize: 0, padding: 0.4 },
      marks: [
        Plot.ruleX([0], { stroke: C.muted }),
        Plot.ruleY(drows, { y: "name", x1: "lo", x2: "hi", stroke: col, strokeWidth: 2.5 }),
        Plot.tickX(drows, { x: "lo", y: "name", stroke: col, strokeWidth: 2, inset: 6 }),
        Plot.tickX(drows, { x: "hi", y: "name", stroke: col, strokeWidth: 2, inset: 6 }),
        Plot.dot(drows, { x: "m", y: "name", fill: col, r: 5.5, stroke: C.canvas, strokeWidth: 1.5 }),
        Plot.tip(drows, Plot.pointerY({ x: "m", y: "name", title: (r) => `${r.name}: ${r.m.toFixed(3)}\n95% interval [${r.lo.toFixed(3)}, ${r.hi.toFixed(3)}]\n${r.sub}`, ...tipOpts() })),
      ],
      ariaLabel: drows.map((r) => `${r.name}: ${r.m.toFixed(3)}, 95% interval ${r.lo.toFixed(3)} to ${r.hi.toFixed(3)}`).join("; "),
    }));
  });
  $("decomp").innerHTML = `<table class="decomp-table"><thead><tr><th>Component</th><th>Mean</th><th>95% interval</th></tr></thead><tbody>`
    + drows.map((r) => `<tr><td class="name">${swatch("line", C[r.key])} ${r.name}<small>${r.sub}</small></td><td>${r.m.toFixed(3)}</td><td>[${r.lo.toFixed(3)}, ${r.hi.toFixed(3)}]</td></tr>`).join("")
    + "</tbody></table>";
  $("decomp-note").textContent = `The rule alone accounts for about ${Math.round(dec.replay_share * 100)}% of the total effect. The rest comes from the model proposing lower prices because it anchors on its own held-down published price.`;

  // Example browser.
  const ks = [...new Set(d.examples.map((e) => e.k))].sort((a, b) => a - b);
  const sel = $("ex-k");
  if (!sel.options.length) {
    sel.innerHTML = ks.map((k) => {
      const e = d.examples.find((x) => x.k === k);
      return `<option value="${k}">#${k} · rival usually ${eur(e.base)}</option>`;
    }).join("");
    sel.addEventListener("change", () => { ex.k = +sel.value; renderExamples(); });
    document.querySelectorAll("input[name=exrule]").forEach((r) => r.addEventListener("change", () => { ex.lock = +r.value; renderExamples(); }));
    document.querySelectorAll("input[name=exarm]").forEach((r) => r.addEventListener("change", () => { ex.sel.arm = r.value; renderExamples(); }));
    $("ex-h-range").addEventListener("input", (e) => { ex.sel.h = +e.target.value; renderExamples(); });
  }
  sel.value = ex.k;
  legend($("ex-legend"), [
    { color: C.pub, label: "published" }, { color: C.prop, dash: DASH.prop, label: "proposed (hover a point for the model's reason)" },
    { band: true, color: C.blocked, label: "proposal not published" },
  ]);
  renderExamples();
  llmRendered = true;
}

function renderExamples() {
  const d = llm;
  const get = (arm) => d.examples.find((e) => e.k === ex.k && e.lock === ex.lock && e.arm === arm);
  const cut = get("cut"), noop = get("noop");
  const vals = [cut, noop].filter(Boolean).flatMap((e) => e.proposed.concat(e.published));
  const dom = [Math.min(...vals), Math.max(...vals)];
  const ruleName = ex.lock === 0 ? "no rule" : ex.lock > 0 ? `hold ${ex.lock}` : `noon rule ${-ex.lock}`;
  document.querySelectorAll("input[name=exrule]").forEach((r) => (r.checked = +r.value === ex.lock));
  document.querySelectorAll("input[name=exarm]").forEach((r) => (r.checked = r.value === ex.sel.arm));
  $("ex-h-range").value = ex.sel.h;
  $("ex-h-out").textContent = String(ex.sel.h);

  const draw = (el, e, arm) => {
    if (!e) { charts.delete(el); el.innerHTML = '<p class="fine">No example for this combination.</p>'; return; }
    const rows = e.proposed.map((p, h) => ({ h, proposed: p, published: e.published[h], blocked: h > 0 && p !== e.published[h] }));
    const blocked = rows.filter((r) => r.blocked).map((r) => r.h);
    mount(el, (w) => {
      const fig = Plot.plot({
        width: w, height: 230, marginLeft: 46, marginRight: 12, marginTop: 18, marginBottom: 40,
        style: baseStyle(),
        x: { domain: [-0.5, rows.length - 0.5], ticks: rows.map((r) => r.h), label: "periods after the fork", labelAnchor: "center", labelArrow: "none", tickSize: 0 },
        y: { domain: [dom[0] - 0.5, dom[1] + 0.5], nice: true, grid: true, label: null, tickFormat: (v) => "€" + v, ticks: 4 },
        marks: [
          blockedBands(blocked),
          ...(arm === "cut" ? [Plot.ruleX([0], { stroke: C.muted, strokeDasharray: "2 3" }), Plot.text(["cut"], { x: 0, frameAnchor: "top", dx: 5, dy: -12, textAnchor: "start", fill: C.muted })] : []),
          ...(ex.sel.arm === arm ? [Plot.ruleX([ex.sel.h], { stroke: C.ink, strokeWidth: 1, strokeOpacity: 0.6 })] : []),
          Plot.lineY(rows, { x: "h", y: "published", stroke: C.pub, strokeWidth: 2.75 }),
          Plot.lineY(rows, { x: "h", y: "proposed", stroke: C.prop, strokeWidth: 2, strokeDasharray: DASH.prop }),
          Plot.dot(rows, { x: "h", y: "proposed", fill: C.prop, r: 3.5 }),
          Plot.tip(rows, Plot.pointerX({
            x: "h", y: "proposed", ...tipOpts(),
            title: (r) => `Period ${r.h}\npublished  ${eur(r.published)}\nproposed   ${eur(r.proposed)}${r.blocked ? "\nProposal not published." : ""}`,
          })),
        ],
        ariaLabel: `${arm === "cut" ? "Rival cut" : "No cut"}, ${ruleName}. Proposed ${e.proposed.join(", ")}. Published ${e.published.join(", ")}.`,
      });
      fig.addEventListener("input", () => {
        if (!fig.value) return;
        ex.sel = { arm, h: fig.value.h };
        document.querySelectorAll("input[name=exarm]").forEach((r) => (r.checked = r.value === arm));
        $("ex-h-range").value = ex.sel.h;
        $("ex-h-out").textContent = String(ex.sel.h);
        showReason();
      });
      put(el, fig);
    });
  };
  draw($("ex-cut"), cut, "cut");
  draw($("ex-noop"), noop, "noop");
  showReason();

  function showReason() {
    const e = ex.sel.arm === "cut" ? cut : noop;
    const out = $("ex-reason");
    if (!e) { out.innerHTML = ""; return; }
    const h = ex.sel.h, txt = e.reasoning[h];
    const held = h > 0 && e.proposed[h] !== e.published[h];
    out.innerHTML = `<div class="meta">History #${e.k} · ${ex.sel.arm === "cut" ? "rival cut" : "no cut"} · ${ruleName} · period ${h}: proposed ${eur(e.proposed[h])}, published ${eur(e.published[h])}${held ? " (not published)" : ""}</div>`
      + `<div class="q">${txt ? "“" + esc(txt) + "”" : "Period 0 is the fork: this price was chosen before the rival's move, so there is no reason for it here. Pick another period."}</div>`;
  }
}

/* ================================================================ tabs */
const TABS = ["play", "llm", "about"];
function setTab(t, focus) {
  tab = t;
  TABS.forEach((name) => {
    const b = $("tab-" + name), p = $("panel-" + name), on = name === t;
    b.setAttribute("aria-selected", on);
    b.tabIndex = on ? 0 : -1;
    p.hidden = !on;
  });
  if (focus) $("tab-" + t).focus();
  writeHash();
  if (t === "llm" && !llmRendered) loadLLM().then(renderLLM).catch((err) => {
    console.error("Real LLM tab failed to render:", err);  // never swallow: a silent failure hid a data-format mismatch
    $("llm-intro").textContent = "Could not draw the LLM results. The data file and the page disagree; see the browser console.";
  });
  if (t === "play") renderPlay(); // charts need visible size
}
TABS.forEach((name, i) => {
  const b = $("tab-" + name);
  b.addEventListener("click", () => setTab(name));
  b.addEventListener("keydown", (e) => {
    let j = null;
    if (e.key === "ArrowRight") j = (i + 1) % TABS.length;
    if (e.key === "ArrowLeft") j = (i + TABS.length - 1) % TABS.length;
    if (e.key === "Home") j = 0;
    if (e.key === "End") j = TABS.length - 1;
    if (j != null) { e.preventDefault(); setTab(TABS[j], true); }
  });
});

/* ================================================================ boot */
readHash();
syncControls();
initShare();
setTab(tab);
loadShared();
window.addEventListener("hashchange", () => { readHash(); syncControls(); setTab(tab); });
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
  redrawAll();
  if (tab === "play") renderPlay();
  if (llmRendered) renderLLM();
});
