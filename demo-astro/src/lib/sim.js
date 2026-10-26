/* Pricing-audit simulation: a line-by-line port of harness/sim.py and harness/metrics.py.
 * ES-module copy of demo/sim.js (identical logic; only the UMD wrapper was replaced by exports).
 *
 * Linear differentiated duopoly, fresh cohort each period. The focal firm proposes a price;
 * the executor (execution rule) decides what is published; the rival is scripted.
 */

const A = 35.4, B = 1.0, D = 0.6, C = 15.0;
const GRID = [];
for (let i = 0; i <= 110; i++) GRID.push(Math.round((15 + 0.5 * i) * 100) / 100); // 15.0 .. 70.0
const P_NASH = (A + B * C) / (2 * B - D);            // 36.0
const P_MONO = (A + (B - D) * C) / (2 * (B - D));    // 51.75
const G = P_MONO - P_NASH;                           // 15.75
const H_WINDOW = [2, 3, 4, 5];
const N_WARMUP = 8;

const demand = (p, pr) => Math.max(0, A - B * p + D * pr);
const profit = (p, pr) => (p - C) * demand(p, pr);

function snap(p) {
  let best = 0, bd = Infinity;
  for (let i = 0; i < GRID.length; i++) {
    const d = Math.abs(GRID[i] - p);
    if (d < bd) { bd = d; best = i; }            // first minimum, like np.argmin
  }
  return GRID[best];
}

function bestResponse(pr) {
  let best = 0, bp = -Infinity;
  for (let i = 0; i < GRID.length; i++) {
    const v = (GRID[i] - C) * Math.max(0, A - B * GRID[i] + D * pr);
    if (v > bp) { bp = v; best = i; }            // first maximum, like np.argmax
  }
  return GRID[best];
}

/* ------------------------------------------------------------- executor
 * lock > 1: hold. A newly published price is held for `lock` periods (incl. its first).
 *           Unchanged proposals do not renew the hold. lock 0 or 1 publishes every proposal.
 * lock < 0: noon rule. Decreases publish at once; increases only when t % |lock| == phase.
 */
class Executor {
  constructor(lock, published = null, lockedUntil = -1, phase = 0) {
    this.lock = lock; this.published = published; this.lockedUntil = lockedUntil; this.phase = phase;
  }
  step(period, proposed) {
    if (this.lock < 0) {
      if (this.published === null || proposed <= this.published || period % -this.lock === this.phase) {
        this.published = proposed;
        return [this.published, false];
      }
      return [this.published, true];
    }
    if (this.published !== null && period <= this.lockedUntil) return [this.published, true];
    if (this.published === null || proposed !== this.published) {
      this.published = proposed;
      if (this.lock > 1) this.lockedUntil = period + this.lock - 1;
    }
    return [this.published, false];
  }
}

/* ------------------------------------------------------------- policies */
class Fixed {
  constructor(price = 42.0) { this.price = price; this.name = "fixed"; }
  initState() { return {}; }
  decide() { return this.price; }
}

class Myopic {
  constructor() { this.name = "myopic"; }
  initState() { return {}; }
  decide(history) { return bestResponse(history[history.length - 1].rival); }
}

/* Partial adjustment anchored on its own last proposal (not the published price). */
class Sticky {
  constructor(lam) { this.lam = lam; this.name = "sticky" + lam; }
  initState() { return { last: null }; }
  decide(history, state) {
    const target = bestResponse(history[history.length - 1].rival);
    const last = state.last !== null ? state.last : history[history.length - 1].published;
    const p = snap(last + this.lam * (target - last));
    state.last = p;
    return p;
  }
}

/* Known finite-trigger rule (not a verified collusive equilibrium). */
class Trigger {
  constructor(coop = 46.0, punish = P_NASH, drop = 3.0, k = 3, nWarmup = N_WARMUP) {
    Object.assign(this, { coop, punish, drop, k, nWarmup, name: "trigger" });
  }
  initState() { return { left: 0, ref: null }; }
  decide(history, state) {
    if (history.length <= this.nWarmup) {
      state.ref = history.reduce((s, r) => s + r.rival, 0) / history.length;
      return this.coop;
    }
    if (state.left === 0 && history[history.length - 1].rival <= state.ref - this.drop) state.left = this.k;
    if (state.left > 0) { state.left -= 1; return this.punish; }
    return this.coop;
  }
}

function makePolicy(agent, lam) {
  switch (agent) {
    case "fixed": return new Fixed();
    case "myopic": return new Myopic();
    case "sticky": return new Sticky(lam);
    case "trigger": return new Trigger();
    default: throw new Error("unknown agent " + agent);
  }
}

/* ------------------------------------------------------------- histories and forks */
const record = (period, proposed, published, locked, rival) => ({
  period, proposed, published, locked, rival,
  qty: demand(published, rival), profit: profit(published, rival),
});

const clone = (o) => JSON.parse(JSON.stringify(o));

/* hist = { k, base, warmupRival: [..], shock } */
function rivalAtCheckpoint(hist, arm) {
  return { cut: hist.base - hist.shock, raise: hist.base + hist.shock, noop: hist.base }[arm];
}

function warmup(policy, hist, startPrice = 40.0) {
  const state = policy.initState();
  const history = [record(0, startPrice, startPrice, false, hist.warmupRival[0])];
  for (let t = 1; t < hist.warmupRival.length; t++) {
    const p = policy.decide(history, state);
    history.push(record(t, p, p, false, hist.warmupRival[t]));
  }
  const t0 = hist.warmupRival.length;
  const p0 = policy.decide(history, state);
  return { history, focalPrice: p0, policyState: state, t0 };
}

/* Fork at the checkpoint, override the rival's price for one period, continue n periods. */
function runBranch(policy, ckpt, hist, arm, lock, nCont = 8, phase = 0) {
  const history = clone(ckpt.history);
  const state = clone(ckpt.policyState);
  const shockRec = record(ckpt.t0, ckpt.focalPrice, ckpt.focalPrice, false, rivalAtCheckpoint(hist, arm));
  shockRec.h = 0;
  history.push(shockRec);
  const ex = new Executor(lock, ckpt.focalPrice, -1, phase);
  const out = [shockRec];
  for (let h = 1; h <= nCont; h++) {
    const t = ckpt.t0 + h;
    const p = policy.decide(history, state);
    const [pub, locked] = ex.step(t, p);
    const rec = record(t, p, pub, locked, hist.base);
    rec.h = h;
    history.push(rec);
    out.push(rec);
  }
  return out;
}

/* Open-loop replay: pass a branch's proposals through another executor. */
function replay(branch, lock, phase = 0) {
  const ex = new Executor(lock, branch[0].published, -1, phase);
  const out = [Object.assign({}, branch[0])];
  for (const r of branch.slice(1)) {
    const [pub, locked] = ex.step(r.period, r.proposed);
    out.push(Object.assign(record(r.period, r.proposed, pub, locked, r.rival), { h: r.h }));
  }
  return out;
}

/* Mean over the window of sign*(p_noop - p_shock)/G; sign +1 for cuts, -1 for raises. */
function response(base, shocked, key, sign = 1, window = H_WINDOW) {
  const b = {}, s = {};
  base.forEach((r) => (b[r.h] = r[key]));
  shocked.forEach((r) => (s[r.h] = r[key]));
  return window.reduce((acc, h) => acc + (sign * (b[h] - s[h])) / G, 0) / window.length;
}

/* lock code for a UI rule spec: {rule:'none'|'hold'|'noon', hold, noon} */
function lockOf(p) {
  if (p.rule === "hold") return p.hold;
  if (p.rule === "noon") return -p.noon;
  return 0;
}

/* One playground scenario: constant-base history (no warm-up wiggle), both arms, rule and no rule. */
function simulate(p) {
  const policy = makePolicy(p.agent, p.lam);
  const hist = { k: 0, base: p.base, warmupRival: Array(N_WARMUP).fill(p.base), shock: p.shock };
  const ckpt = warmup(policy, hist);
  const lock = lockOf(p);
  const phase = p.rule === "noon" ? p.phase : 0;
  const arm = p.arm === "raise" ? "raise" : "cut";
  const sign = arm === "cut" ? 1 : -1;
  const run = (a, l) => runBranch(policy, ckpt, hist, a, l, 8, phase);
  const rule = { noop: run("noop", lock), shock: run(arm, lock) };
  const none = { noop: run("noop", 0), shock: run(arm, 0) };
  const rep = { noop: replay(none.noop, lock, phase), shock: replay(none.shock, lock, phase) };
  const R = (br, key) => response(br.noop, br.shock, key, sign);
  const res = {
    R_pub: R(rule, "published"), R_prop: R(rule, "proposed"),
    R_pub_none: R(none, "published"), R_prop_none: R(none, "proposed"),
    R_replay: R(rep, "published"),
  };
  res.theta_pub = res.R_pub - res.R_pub_none;
  res.theta_prop = res.R_prop - res.R_prop_none;
  res.theta_replay = res.R_replay - res.R_pub_none;
  res.adaptation = res.theta_pub - res.theta_replay;
  return { params: p, lock, phase, arm, sign, warmupHistory: ckpt.history, rule, none, replay: rep, res };
}

const api = {
  A, B, D, C, GRID, P_NASH, P_MONO, G, H_WINDOW, N_WARMUP,
  demand, profit, snap, bestResponse, Executor, Fixed, Myopic, Sticky, Trigger, makePolicy,
  warmup, runBranch, replay, response, lockOf, simulate,
};

export {
  A, B, D, C, GRID, P_NASH, P_MONO, G, H_WINDOW, N_WARMUP,
  demand, profit, snap, bestResponse, Executor, Fixed, Myopic, Sticky, Trigger, makePolicy,
  warmup, runBranch, replay, response, lockOf, simulate,
};
export default api;
