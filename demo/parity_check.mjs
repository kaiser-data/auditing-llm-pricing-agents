// Parity check: demo/sim.js against harness/sim.py.  Run: node demo/parity_check.mjs
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sim from "./sim.js";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "..");
let failures = 0;
const ok = (cond, msg) => { console.log(`${cond ? "PASS" : "FAIL"}  ${msg}`); if (!cond) failures++; };
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const close = (a, b, tol = 1e-9) => Math.abs(a - b) < tol;

const base = { agent: "myopic", lam: 0.5, rule: "hold", hold: 3, noon: 3, phase: 0, base: 40, shock: 8, arm: "cut" };

// 1. The required Myopic / base 40 / shock 8 / hold 3 paths.
const s = sim.simulate(base);
const prop = s.rule.shock.map((r) => r.proposed), pub = s.rule.shock.map((r) => r.published);
ok(eq(prop, [37, 35, 37, 37, 37, 37, 37, 37, 37]), `myopic hold3 proposed  ${JSON.stringify(prop)}`);
ok(eq(pub, [37, 35, 35, 35, 37, 37, 37, 37, 37]), `myopic hold3 published ${JSON.stringify(pub)}`);

// 2. Python reference over a grid of agents x rules x bases x arms (constant-base history, no wiggle).
const py = `
import json, numpy as np
from harness.sim import History, Myopic, Sticky, Trigger, Fixed, warmup, run_branch, Executor, record, replay
from harness.metrics import response
import harness.sim as S
out = {}
for name, mk in [("fixed", lambda: Fixed()), ("myopic", lambda: Myopic()), ("sticky", lambda: Sticky(0.5)),
                 ("sticky3", lambda: Sticky(0.3)), ("trigger", lambda: Trigger())]:
    for base in (38.0, 40.0, 44.5, 48.0):
        for shock in (3.0, 8.0, 12.0):
            for lock in (0, 3, 5, -3, -4):
                for phase in ((0,) if lock >= 0 else tuple(range(-lock))):
                    S.noon_phase = (lambda ph: (lambda hist, lk: ph))(phase)
                    pol = mk(); h = History(k=0, base=base, warmup_rival=[base]*8, shock=shock)
                    ck = warmup(pol, h, np.random.default_rng(0))
                    br = {a: run_branch(pol, ck, h, a, lock, 8, None) for a in ("noop", "cut", "raise")}
                    nr = {a: run_branch(pol, ck, h, a, 0, 8, None) for a in ("noop", "cut", "raise")}
                    rp = {a: replay(nr[a], lock, phase) for a in nr}
                    key = f"{name}|{base}|{shock}|{lock}|{phase}"
                    out[key] = {
                        "pub": {a: [r["published"] for r in br[a]] for a in br},
                        "prop": {a: [r["proposed"] for r in br[a]] for a in br},
                        "R_pub_cut": response(br["noop"], br["cut"], "published", 1),
                        "R_prop_cut": response(br["noop"], br["cut"], "proposed", 1),
                        "R_pub_raise": response(br["noop"], br["raise"], "published", -1),
                        "R_rep_cut": response(rp["noop"], rp["cut"], "published", 1),
                        "theta_pub_cut": response(br["noop"], br["cut"], "published", 1) - response(nr["noop"], nr["cut"], "published", 1),
                    }
print(json.dumps(out))
`;
const ref = JSON.parse(execFileSync("python3", ["-c", py], { cwd: repo, maxBuffer: 64 << 20 }).toString());

let n = 0, bad = 0;
for (const [key, r] of Object.entries(ref)) {
  const [name, b, shock, lock, phase] = key.split("|");
  const agent = name.startsWith("sticky") ? "sticky" : name;
  const lam = name === "sticky3" ? 0.3 : 0.5;
  const L = +lock;
  const rule = L === 0 ? "none" : L > 0 ? "hold" : "noon";
  const p = { agent, lam, rule, hold: L > 0 ? L : 3, noon: L < 0 ? -L : 3, phase: +phase, base: +b, shock: +shock };
  const cut = sim.simulate({ ...p, arm: "cut" }), raise = sim.simulate({ ...p, arm: "raise" });
  const checks = [
    eq(cut.rule.noop.map((x) => x.published), r.pub.noop),
    eq(cut.rule.shock.map((x) => x.published), r.pub.cut),
    eq(cut.rule.shock.map((x) => x.proposed), r.prop.cut),
    eq(raise.rule.shock.map((x) => x.published), r.pub.raise),
    close(cut.res.R_pub, r.R_pub_cut), close(cut.res.R_prop, r.R_prop_cut),
    close(raise.res.R_pub, r.R_pub_raise), close(cut.res.R_replay, r.R_rep_cut),
    close(cut.res.theta_pub, r.theta_pub_cut),
  ];
  n++;
  if (!checks.every(Boolean)) { bad++; if (bad <= 5) console.log("  mismatch", key, checks); }
}
ok(bad === 0, `grid parity vs harness/sim.py: ${n - bad}/${n} scenarios identical (paths, R, replay, theta)`);

// 3. theta_published for Myopic, base 40, 8-unit cut, hold 3.
const pyTheta = ref["myopic|40.0|8.0|3|0"].theta_pub_cut;
console.log(`      theta_published (myopic, base 40, cut 8, hold 3): JS ${s.res.theta_pub.toFixed(4)}  Python ${pyTheta.toFixed(4)}`
  + `  (brief quoted ~0.0762; 0.0762 = 1.2/G, whereas this path gives 2 x 2 / 4 / G = 0.0635)`);
ok(close(s.res.theta_pub, pyTheta), "theta_published matches Python");

// 4. Trigger: theta = 0 under hold 3; Fixed: 0 everywhere.
const trig = sim.simulate({ ...base, agent: "trigger" });
ok(close(trig.res.theta_pub, 0) && close(trig.res.theta_prop, 0), `trigger hold3 theta_pub ${trig.res.theta_pub}, theta_prop ${trig.res.theta_prop}`);
let fixedMax = 0;
for (const rule of ["none", "hold", "noon"]) for (const arm of ["cut", "raise"]) for (const b of [38, 43, 48]) {
  const f = sim.simulate({ ...base, agent: "fixed", rule, arm, base: b, phase: 1 }).res;
  fixedMax = Math.max(fixedMax, ...Object.values(f).map(Math.abs));
}
ok(fixedMax === 0, `fixed: every R / theta / replay value is 0 (max |value| = ${fixedMax})`);

console.log(failures ? `\n${failures} check(s) FAILED` : "\nAll parity checks passed.");
process.exit(failures ? 1 : 0);
