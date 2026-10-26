/* Pricing Audit Playground: UI. Depends on sim.js (window.PricingSim). No build step. */
const SAVE_ENDPOINT = window.SAVE_ENDPOINT || "";   // POST {params, results} -> {id}
const LOAD_ENDPOINT = window.LOAD_ENDPOINT || "";   // GET  ?id=<id> -> {params}

(function () {
  "use strict";
  const S = window.PricingSim;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const MINUS = "−";
  const fmtR = (v) => (Math.abs(v) < 5e-5 ? "0.000" : (v < 0 ? MINUS : "+") + Math.abs(v).toFixed(3));
  const fmtU = (v) => (Math.abs(v) < 5e-5 ? "0.000" : (v < 0 ? MINUS : "") + Math.abs(v).toFixed(3));
  const eur = (v) => "€" + v.toFixed(2);

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

  /* ================================================================ tooltip */
  const tip = $("tooltip");
  function showTip(html, x, y) {
    tip.innerHTML = html;
    tip.hidden = false;
    const w = tip.offsetWidth, hgt = tip.offsetHeight, vw = document.documentElement.clientWidth;
    let left = x + 14, top = y - hgt - 12;
    if (left + w > vw - 8) left = x - w - 14;
    if (left < 8) left = 8;
    if (top < 8) top = y + 16;
    tip.style.left = left + "px";
    tip.style.top = top + "px";
  }
  const hideTip = () => { tip.hidden = true; };
  const sw = (cls, dash) => `<svg width="18" height="8" aria-hidden="true"><line x1="1" y1="4" x2="17" y2="4" class="series ${cls}" stroke-width="2.5"${dash ? ` stroke-dasharray="${dash}"` : ""}/></svg>`;
  const row = (cls, dash, k, v) => `<div class="row"><span class="k">${sw(cls, dash)}${k}</span><span>${v}</span></div>`;

  /* ================================================================ line chart (hand-drawn SVG) */
  function niceStep(span, target) {
    const raw = span / target;
    const steps = [0.02, 0.05, 0.1, 0.2, 0.25, 0.5, 1, 2, 2.5, 5, 10, 20];
    return steps.find((s) => s >= raw) || 20;
  }

  function lineChart(el, opts) {
    el._opts = opts;
    if (!el._ro) {
      el._ro = new ResizeObserver(() => drawChart(el));
      el._ro.observe(el);
    }
    drawChart(el);
  }

  function drawChart(el) {
    const o = el._opts;
    if (!o) return;
    const W = el.clientWidth, H = el.clientHeight;
    if (!W || !H) return;
    const m = { l: 46, r: 10, t: 12, b: 36 };
    const iw = W - m.l - m.r, ih = H - m.t - m.b;
    const xs = o.xs, x0 = xs[0], x1 = xs[xs.length - 1];
    let [ylo, yhi] = o.yDomain || (() => {
      const all = o.series.flatMap((s) => s.values).filter((v) => v != null);
      return [Math.min(...all), Math.max(...all)];
    })();
    if (yhi - ylo < 1e-9) { ylo -= 1; yhi += 1; }
    const step = niceStep(yhi - ylo, ih < 180 ? 4 : 5);
    const lo0 = ylo, hi0 = yhi;
    ylo = Math.floor(ylo / step + 1e-9) * step;
    yhi = Math.ceil(yhi / step - 1e-9) * step;
    if (lo0 - ylo < 1e-9 && Math.abs(lo0) > 1e-9) ylo -= step; // breathing room unless the floor is zero
    if (yhi - hi0 < step * 0.15) yhi += step;
    if (o.padTop) yhi += step * 0.5;
    const X = (x) => m.l + ((x - x0) / (x1 - x0)) * iw;
    const Y = (y) => m.t + (1 - (y - ylo) / (yhi - ylo)) * ih;
    const yFmt = o.yFmt || ((v) => +v.toFixed(2));
    const parts = [];

    for (const b of o.bands || []) {
      const a = X(Math.max(x0, b.x0)), z = X(Math.min(x1, b.x1));
      parts.push(`<rect class="${b.cls}" x="${a}" y="${m.t}" width="${Math.max(0, z - a)}" height="${ih}"/>`);
      if (b.cls === "band-blocked") parts.push(`<line class="band-blocked-edge" x1="${a}" x2="${z}" y1="${m.t + ih}" y2="${m.t + ih}" stroke-width="3"/>`);
    }
    parts.push('<g class="axis">');
    for (let v = ylo; v <= yhi + 1e-9; v += step) {
      const y = Y(v);
      parts.push(`<line class="${Math.abs(v) < 1e-9 && o.zeroLine ? "zeroline" : "gridline"}" x1="${m.l}" x2="${m.l + iw}" y1="${y}" y2="${y}"/>`);
      parts.push(`<text x="${m.l - 6}" y="${y + 3.5}" text-anchor="end">${esc(yFmt(Math.round(v / step) * step))}</text>`);
    }
    const xEvery = iw < 260 && xs.length > 9 ? 2 : 1;
    xs.forEach((x, i) => {
      if (x % xEvery !== 0 && i !== 0) return;
      parts.push(`<text x="${X(x)}" y="${m.t + ih + 15}" text-anchor="middle">${x}</text>`);
    });
    if (o.xTitle) parts.push(`<text class="title" x="${m.l + iw / 2}" y="${H - 3}" text-anchor="middle">${esc(o.xTitle)}</text>`);
    if (o.yTitle) parts.push(`<text class="title" transform="translate(11 ${m.t + ih / 2}) rotate(-90)" text-anchor="middle">${esc(o.yTitle)}</text>`);
    parts.push("</g>");
    if (o.vline != null) {
      parts.push(`<line class="shockline" x1="${X(o.vline.x)}" x2="${X(o.vline.x)}" y1="${m.t}" y2="${m.t + ih}"/>`);
      if (o.vline.label) parts.push(`<text class="shocklabel" x="${X(o.vline.x) + 4}" y="${m.t + 10}">${esc(o.vline.label)}</text>`);
    }
    for (const s of o.series) {
      let d = "", pen = false;
      s.values.forEach((v, i) => {
        if (v == null) { pen = false; return; }
        d += `${pen ? "L" : "M"}${X(xs[i]).toFixed(1)},${Y(v).toFixed(1)}`;
        pen = true;
      });
      parts.push(`<path class="series ${s.cls}" d="${d}" stroke-width="${s.width || 2}"${s.dash ? ` stroke-dasharray="${s.dash}"` : ""}/>`);
      if (s.dots) s.values.forEach((v, i) => {
        if (v != null) parts.push(`<circle class="dot ${s.cls}" cx="${X(xs[i])}" cy="${Y(v)}" r="3.5"/>`);
      });
    }
    if (o.selected != null) parts.push(`<line class="selmark" x1="${X(xs[o.selected])}" x2="${X(xs[o.selected])}" y1="${m.t}" y2="${m.t + ih}"/>`);
    parts.push('<g class="hover"></g>');
    parts.push(`<rect class="hit" x="${m.l - 8}" y="0" width="${iw + 16}" height="${H}" fill="transparent"/>`);

    el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" tabindex="0" role="img" aria-label="${esc(o.ariaLabel || "")}">${parts.join("")}</svg>`;
    const svg = el.firstChild, hov = svg.querySelector(".hover");
    let cur = o.selected != null ? o.selected : null;

    function mark(i, cx, cy) {
      const x = X(xs[i]);
      let g = `<line class="crosshair" x1="${x}" x2="${x}" y1="${m.t}" y2="${m.t + ih}"/>`;
      for (const s of o.series) {
        if (s.noHover || s.values[i] == null) continue;
        g += `<circle class="dot ${s.cls}" cx="${x}" cy="${Y(s.values[i])}" r="${s.dots ? 5.5 : 4.5}"/>`;
      }
      hov.innerHTML = g;
      if (o.tooltip) {
        const r = svg.getBoundingClientRect();
        showTip(o.tooltip(i), cx != null ? cx : r.left + (x / W) * r.width, cy != null ? cy : r.top + m.t + 10);
      }
    }
    function nearest(evt) {
      const r = svg.getBoundingClientRect();
      const px = ((evt.clientX - r.left) / r.width) * W;
      let best = 0;
      xs.forEach((x, i) => { if (Math.abs(X(x) - px) < Math.abs(X(xs[best]) - px)) best = i; });
      return best;
    }
    svg.addEventListener("pointermove", (e) => { cur = nearest(e); mark(cur, e.clientX, e.clientY); });
    svg.addEventListener("pointerdown", (e) => { cur = nearest(e); mark(cur, e.clientX, e.clientY); if (o.onSelect) o.onSelect(cur); });
    svg.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") { hov.innerHTML = ""; hideTip(); } });
    svg.addEventListener("focus", () => { if (cur == null) cur = 0; mark(cur); });
    svg.addEventListener("blur", () => { hov.innerHTML = ""; hideTip(); });
    svg.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight" && e.key !== "Home" && e.key !== "End") return;
      e.preventDefault();
      if (cur == null) cur = 0;
      if (e.key === "ArrowLeft") cur = Math.max(0, cur - 1);
      if (e.key === "ArrowRight") cur = Math.min(xs.length - 1, cur + 1);
      if (e.key === "Home") cur = 0;
      if (e.key === "End") cur = xs.length - 1;
      mark(cur);
      if (o.onSelect) o.onSelect(cur, true);
    });
  }
  document.addEventListener("scroll", hideTip, { passive: true });

  function legend(el, items) {
    el.innerHTML = items.map((it) => it.band
      ? `<span><svg width="16" height="12" aria-hidden="true"><rect width="16" height="12" class="${it.band}"/></svg>${esc(it.label)}</span>`
      : `<span>${sw(it.cls, it.dash)}${esc(it.label)}</span>`).join("");
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

    $("price-sub").textContent = `${AGENT_NAME[state.agent]} agent${state.agent === "sticky" ? ` (λ = ${state.lam.toFixed(1)})` : ""} under ${ruleText(state)}. `
      + `Rival usually at ${eur(state.base)}, ${arm === "cut" ? "cuts" : "raises"} to ${eur(rivalShock)} in period 0 only, then returns.`;
    legend($("price-legend"), [
      { cls: "s-pub", label: "published (with rule)" },
      { cls: "s-prop", dash: "5 4", label: "proposed by the agent" },
      { cls: "s-none", label: "same agent, no rule" },
      { cls: "s-rival", label: "rival price" },
      ...(blocked.length ? [{ band: "band-blocked", label: "rule blocked the proposal" }] : []),
    ]);
    lineChart($("price-chart"), {
      xs,
      series: [
        { cls: "s-rival", values: rival, width: 1.25 },
        { cls: "s-none", values: none, width: 2 },
        { cls: "s-pub", values: pub, width: 2.75 },
        { cls: "s-prop", values: prop, width: 2, dash: "5 4" },
      ],
      bands: blocked.map((h) => ({ x0: h - 0.5, x1: h + 0.5, cls: "band-blocked" })),
      vline: { x: 0, label: arm === "cut" ? "rival cut" : "rival raise" },
      yFmt: (v) => "€" + v,
      xTitle: "periods relative to the rival's shock",
      ariaLabel: `Price paths around the shock. Published ${pub.slice(4).join(", ")}; proposed ${prop.slice(4).join(", ")}.`,
      tooltip: (i) => {
        const h = xs[i], j = i;
        const blk = blocked.includes(h);
        return `<div class="t-head">Period ${h}${h === 0 ? " (shock)" : ""}</div>`
          + row("s-pub", "", "published", eur(pub[j]))
          + row("s-prop", "5 4", "proposed", eur(prop[j]))
          + row("s-none", "", "no rule", eur(none[j]))
          + row("s-rival", "", "rival", eur(rival[j]))
          + `<div class="note">without the shock: ${eur(basePub[j])}${blk ? "<br>Rule blocked this proposal." : ""}</div>`;
      },
    });
    $("price-table").innerHTML = `<table><thead><tr><th>Period</th><th>Rival</th><th>Proposed</th><th>Published</th><th>No rule</th><th>No shock</th><th>Blocked</th></tr></thead><tbody>`
      + xs.map((h, i) => `<tr><td>${h}</td><td>${rival[i].toFixed(2)}</td><td>${prop[i].toFixed(2)}</td><td>${pub[i].toFixed(2)}</td><td>${none[i].toFixed(2)}</td><td>${basePub[i].toFixed(2)}</td><td>${blocked.includes(h) ? "yes" : ""}</td></tr>`).join("")
      + "</tbody></table>";

    // Gap profile (the paper's lag figure for this one scenario).
    const hs = [0, 1, 2, 3, 4, 5, 6, 7, 8];
    const gap = (br, key) => hs.map((h) => (sign * (br.noop[h][key] - br.shock[h][key])) / S.G);
    const gPub = gap(out.rule, "published"), gProp = gap(out.rule, "proposed"), gNone = gap(out.none, "published"), gRep = gap(out.replay, "published");
    const hasRule = state.rule !== "none";
    legend($("gap-legend"), [
      { cls: "s-none", label: "no rule" },
      ...(hasRule ? [{ cls: "s-pub", label: "rule: published" }, { cls: "s-prop", dash: "5 4", label: "rule: proposed" }, { cls: "s-replay", dash: "1.5 4", label: "replay of no-rule proposals" }] : []),
      { band: "band-window", label: "audit window" },
    ]);
    lineChart($("gap-chart"), {
      xs: hs,
      series: [
        { cls: "s-none", values: gNone, width: 2.5 },
        ...(hasRule ? [
          { cls: "s-pub", values: gPub, width: 2.5 },
          { cls: "s-prop", values: gProp, width: 2, dash: "5 4" },
          { cls: "s-replay", values: gRep, width: 2.25, dash: "1.5 4" },
        ] : []),
      ],
      bands: [{ x0: 2, x1: 5, cls: "band-window" }],
      zeroLine: true,
      yFmt: (v) => v.toFixed(2),
      xTitle: `periods after the ${arm}`,
      yTitle: "gap ÷ G",
      ariaLabel: "Gap to the no-shock path, as a share of G",
      tooltip: (i) => `<div class="t-head">Period ${hs[i]}</div>` + row("s-none", "", "no rule", fmtR(gNone[i]))
        + (hasRule ? row("s-pub", "", "published", fmtR(gPub[i])) + row("s-prop", "5 4", "proposed", fmtR(gProp[i])) + row("s-replay", "1.5 4", "replay", fmtR(gRep[i])) : ""),
    });

    // Tiles.
    const tiles = [
      { lbl: "R published", cls: "s-pub", v: fmtU(res.R_pub), d: "what a price-only audit measures" },
      { lbl: "R proposed", cls: "s-prop", dash: "5 4", v: fmtU(res.R_prop), d: "the agent's own intent" },
      { lbl: "R without rule", cls: "s-none", v: fmtU(res.R_pub_none), d: "same agent, immediate execution" },
      { lbl: "θ = R(rule) − R(no rule)", v: fmtR(res.theta_pub), d: "persistence added by the rule", key: true },
      { lbl: "replay", cls: "s-replay", dash: "1.5 4", v: fmtR(res.theta_replay), d: "the no-rule proposals pushed through the rule" },
      { lbl: "adaptation = θ − replay", v: fmtR(res.adaptation), d: "proposals changed by facing the rule" },
    ];
    $("tiles").innerHTML = tiles.map((t) => `<div class="tile${t.key ? " key" : ""}"><div class="lbl">${t.cls ? sw(t.cls, t.dash) : ""}${t.lbl}</div><div class="v">${t.v}</div><div class="d">${t.d}</div></div>`).join("");

    // Auditors.
    const flagWord = arm === "cut" ? "Looks like punishment" : "Looks like accommodation";
    const okWord = "Looks like a competitive response";
    const naive = res.R_pub > state.tau, aware = res.R_prop > state.tau;
    const verdict = (who, sees, flag, val) => `<div class="who">${who}</div><div class="sees">${sees}</div>`
      + `<div class="say">${flag ? "⚠︎ " + flagWord : "✓ " + okWord}</div>`
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

  function onInput(e) {
    const t = e.target;
    if (!t.name) return;
    const patch = {};
    patch[t.name] = t.type === "radio" ? t.value : +t.value;
    state = sanitize(Object.assign({}, state, patch));
    syncControls();
    renderPlay();
  }
  $("controls").addEventListener("input", onInput);
  $("tau").addEventListener("input", onInput);
  document.querySelectorAll("[data-preset]").forEach((b) => b.addEventListener("click", () => {
    const p = Object.fromEntries(new URLSearchParams(b.dataset.preset));
    state = sanitize(Object.assign({}, DEFAULTS, { base: state.base, shock: state.shock, arm: "cut", tau: state.tau }, p));
    syncControls();
    renderPlay();
  }));

  /* ================================================================ save / share */
  function initShare() {
    if (!SAVE_ENDPOINT) { $("share-box").hidden = true; return; }
    $("share-btn").addEventListener("click", async () => {
      const outEl = $("share-out");
      outEl.textContent = "Saving…";
      try {
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
      const r = await fetch("llm-results.json");
      if (!r.ok) throw new Error("HTTP " + r.status);
      llm = await r.json();
    } catch (err) {
      $("llm-intro").textContent = "Could not load llm-results.json. Serve this folder over HTTP (python3 -m http.server) rather than opening the file directly.";
      throw err;
    }
    return llm;
  }

  function findKey(obj, test) { return Object.keys(obj).find(test); }

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
      { cls: "s-none", label: "no rule" }, { cls: "s-pub", label: "rule: published" },
      { cls: "s-prop", dash: "5 4", label: "rule: proposed" }, { cls: "s-replay", dash: "1.5 4", label: "replay of no-rule proposals" },
      { band: "band-window", label: "audit window" },
    ]);
    const lagChart = (el, defs, title) => lineChart(el, {
      xs: hs, yDomain: dom, zeroLine: true, yFmt: (v) => v.toFixed(2),
      series: defs.map(([k, cls, dash, w]) => ({ cls, dash, width: w, values: L[k].mean, key: k })),
      bands: [{ x0: 2, x1: 5, cls: "band-window" }],
      xTitle: "periods after cut", yTitle: "gap ÷ G", ariaLabel: title,
      tooltip: (i) => `<div class="t-head">Period ${hs[i]}</div>` + defs.map(([k, cls, dash]) => row(cls, dash, esc(k), fmtU(L[k].mean[i]))).join(""),
    });
    lagChart($("lag-hold"), [[kNone, "s-none", "", 2.5], [kHP, "s-pub", "", 2.5], [kHQ, "s-prop", "5 4", 2], [kRep, "s-replay", "1.5 4", 2.25]], "Lag profile under the hold");
    lagChart($("lag-noon"), [[kNone, "s-none", "", 2.5], [kNP, "s-pub", "", 2.5], [kNQ, "s-prop", "5 4", 2]], "Lag profile under the noon rule");

    // Decomposition.
    const kDec = findKey(d, (k) => /^decomposition/.test(k));
    const dec = d[kDec];
    const holdN = (kDec.match(/\d+/) || ["?"])[0];
    $("decomp-sub").textContent = `Hold ${holdN}, published prices. Points are means over ${dec.n_hist} histories; bars are 95% bootstrap intervals (histories resampled).`;
    const rows = [
      ["theta_closed", "θ, total", "R(hold) − R(no rule)", "s-pub"],
      ["theta_replay", "replay", "the rule alone, on no-rule proposals", "s-replay"],
      ["adaptation", "adaptation", "the model's proposals change", "s-prop"],
    ];
    const lo = Math.min(0, ...rows.map(([k]) => dec[k][1])), hi = Math.max(...rows.map(([k]) => dec[k][2]));
    const step = niceStep(hi - lo, 5), a0 = Math.floor(lo / step) * step, a1 = Math.ceil(hi / step) * step;
    const P = (v) => 4 + ((v - a0) / (a1 - a0)) * 92; // percent
    const ticks = [];
    for (let v = a0; v <= a1 + 1e-9; v += step) ticks.push(v);
    const grid = ticks.map((v) => `<line x1="${P(v)}%" x2="${P(v)}%" y1="0" y2="28" class="${Math.abs(v) < 1e-9 ? "zeroline" : "gridline"}"/>`).join("");
    $("decomp").innerHTML = rows.map(([k, name, sub, cls]) => {
      const [m, l, h] = dec[k];
      return `<div class="decomp-row"><div class="name">${name}<small>${sub}</small></div>`
        + `<svg role="img" aria-label="${name}: ${m.toFixed(3)}, 95% interval ${l.toFixed(3)} to ${h.toFixed(3)}">${grid}`
        + `<line x1="${P(l)}%" x2="${P(h)}%" y1="14" y2="14" class="series ${cls}" stroke-width="2.5"/>`
        + `<line x1="${P(l)}%" x2="${P(l)}%" y1="9" y2="19" class="series ${cls}" stroke-width="2"/><line x1="${P(h)}%" x2="${P(h)}%" y1="9" y2="19" class="series ${cls}" stroke-width="2"/>`
        + `<circle cx="${P(m)}%" cy="14" r="5.5" class="dot ${cls}"/></svg>`
        + `<div class="nums">${m.toFixed(3)}<small>[${l.toFixed(3)}, ${h.toFixed(3)}]</small></div></div>`;
    }).join("") + `<div class="decomp-axis"><div></div><svg class="axis" aria-hidden="true">${ticks.map((v) => `<text x="${P(v)}%" y="12" text-anchor="middle">${+v.toFixed(2)}</text>`).join("")}</svg><div></div></div>`;
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
    }
    sel.value = ex.k;
    document.querySelectorAll("input[name=exrule]").forEach((r) => (r.checked = +r.value === ex.lock));
    legend($("ex-legend"), [
      { cls: "s-pub", label: "published" }, { cls: "s-prop", dash: "5 4", label: "proposed (hover a point for the model's reason)" },
      { band: "band-blocked", label: "proposal not published" },
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
    const draw = (el, e, arm) => {
      if (!e) { el.innerHTML = '<p class="fine">No example for this combination.</p>'; return; }
      const hs = e.proposed.map((_, i) => i);
      const blocked = hs.filter((h) => h > 0 && e.proposed[h] !== e.published[h]);
      lineChart(el, {
        xs: hs, yDomain: dom, yFmt: (v) => "€" + v,
        series: [
          { cls: "s-pub", values: e.published, width: 2.75 },
          { cls: "s-prop", values: e.proposed, width: 2, dash: "5 4", dots: true },
        ],
        bands: blocked.map((h) => ({ x0: h - 0.5, x1: h + 0.5, cls: "band-blocked" })),
        vline: arm === "cut" ? { x: 0, label: "cut" } : null,
        selected: ex.sel.arm === arm ? ex.sel.h : null,
        xTitle: "periods after the fork",
        ariaLabel: `${arm === "cut" ? "Rival cut" : "No cut"}, ${ruleName}. Proposed ${e.proposed.join(", ")}. Published ${e.published.join(", ")}.`,
        tooltip: (i) => `<div class="t-head">Period ${i}</div>` + row("s-pub", "", "published", eur(e.published[i])) + row("s-prop", "5 4", "proposed", eur(e.proposed[i]))
          + `<div class="note">${blocked.includes(i) ? "Proposal not published. " : ""}Tap for the model's reason.</div>`,
        onSelect: (i, fromKeyboard) => {
          const changed = ex.sel.arm !== arm || ex.sel.h !== i;
          ex.sel = { arm, h: i };
          showReason();
          if (changed && !fromKeyboard) drawBoth(); // keep focus on the chart for keyboard users
        },
      });
    };
    const drawBoth = () => { draw($("ex-cut"), cut, "cut"); draw($("ex-noop"), noop, "noop"); };
    drawBoth();
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
    hideTip();
    writeHash();
    if (t === "llm" && !llmRendered) loadLLM().then(renderLLM).catch(() => {});
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
})();
