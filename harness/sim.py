"""Market, offer-lock executor, scripted policies and fork-before-feedback audit.

Linear differentiated duopoly with a fresh cohort each period (no inventory carry-over).
The focal firm proposes a price; the executor decides what is published; the rival is scripted.
"""
from __future__ import annotations

import copy
from dataclasses import dataclass, field

import numpy as np

A, B, D, C = 35.4, 1.0, 0.6, 15.0
GRID = np.round(np.arange(15.0, 70.0 + 1e-9, 0.5), 2)
P_NASH = (A + B * C) / (2 * B - D)                  # 36.0
P_MONO = (A + (B - D) * C) / (2 * (B - D))          # 51.75
G = P_MONO - P_NASH                                 # 15.75


def demand(p_own: float, p_rival: float) -> float:
    return max(0.0, A - B * p_own + D * p_rival)


def profit(p_own: float, p_rival: float) -> float:
    return (p_own - C) * demand(p_own, p_rival)


def snap(p: float) -> float:
    return float(GRID[np.argmin(np.abs(GRID - p))])


def best_response(p_rival: float) -> float:
    """Exact static best response on the price grid."""
    profits = (GRID - C) * np.maximum(0.0, A - B * GRID + D * p_rival)
    return float(GRID[int(np.argmax(profits))])


# ---------------------------------------------------------------- executor

@dataclass
class Executor:
    """Execution rule between the agent's proposal and the published price.

    lock > 1: offer lock. A newly published price is held for `lock` periods (incl. its first).
              Unchanged proposals do not renew the lock. lock=0 or 1 publishes every proposal.
    lock < 0: noon rule (as in Germany's KPAnG 2026 / Austria's Spritpreisverordnung). Decreases
              publish at once; increases publish only in "noon" periods, one in every |lock|
              periods (t % |lock| == phase). Blocked proposals are logged and dropped.
    """
    lock: int
    published: float | None = None
    locked_until: int = -1          # last period (inclusive) the current price is held
    phase: int = 0

    def step(self, period: int, proposed: float) -> tuple[float, bool]:
        """Return (published price, was_blocked) for this period."""
        if self.lock < 0:
            if self.published is None or proposed <= self.published or period % -self.lock == self.phase:
                self.published = proposed
                return self.published, False
            return self.published, True
        if self.published is not None and period <= self.locked_until:
            return self.published, True
        if self.published is None or proposed != self.published:
            self.published = proposed
            if self.lock > 1:
                self.locked_until = period + self.lock - 1
        return self.published, False


# ---------------------------------------------------------------- policies
# A policy sees the public history (list of period records) and keeps its own `state`.
# decide(history, state, rng) -> (proposed price, info dict)

class Fixed:
    name = "fixed"

    def __init__(self, price: float = 42.0):
        self.price = price

    def init_state(self):
        return {}

    def decide(self, history, state, rng):
        return self.price, {}


class Myopic:
    name = "myopic"

    def init_state(self):
        return {}

    def decide(self, history, state, rng):
        return best_response(history[-1]["rival"]), {}


class Sticky:
    """Partial adjustment u_t = (1-lam) u_{t-1} + lam BR(p_rival), anchored on its own last proposal
    (not the published price), so its persistence is internal to the policy."""

    def __init__(self, lam: float):
        self.lam = lam
        self.name = f"sticky{lam:g}"

    def init_state(self):
        return {"last": None}

    def decide(self, history, state, rng):
        target = best_response(history[-1]["rival"])
        last = state["last"] if state["last"] is not None else history[-1]["published"]
        p = snap(last + self.lam * (target - last))
        state["last"] = p
        return p, {}


class Trigger:
    """Known finite-trigger rule (not a verified collusive equilibrium).

    Reference = mean rival price over the warm-up, frozen at the checkpoint. A rival price at least
    `drop` below the reference starts `k` periods at the Nash price; the timer is not reset while running.
    """
    name = "trigger"

    def __init__(self, coop: float = 46.0, punish: float = P_NASH, drop: float = 3.0, k: int = 3, n_warmup: int = 8):
        self.coop, self.punish, self.drop, self.k, self.n_warmup = coop, punish, drop, k, n_warmup

    def init_state(self):
        return {"left": 0, "ref": None}

    def decide(self, history, state, rng):
        if len(history) <= self.n_warmup:
            state["ref"] = float(np.mean([r["rival"] for r in history]))
            return self.coop, {}
        if state["left"] == 0 and history[-1]["rival"] <= state["ref"] - self.drop:
            state["left"] = self.k
        if state["left"] > 0:
            state["left"] -= 1
            return self.punish, {}
        return self.coop, {}


# ---------------------------------------------------------------- histories and forks

@dataclass
class History:
    """A constructed market history: rival path for warm-up, checkpoint and continuation."""
    k: int
    base: float
    warmup_rival: list[float]
    shock: float = 8.0

    def rival_at_checkpoint(self, arm: str) -> float:
        return {"cut": self.base - self.shock, "raise": self.base + self.shock, "noop": self.base}[arm]


def make_histories(n: int, seed: int = 2026, n_warmup: int = 8) -> list[History]:
    """Constructed histories: base ~ U[38, 48] on the 0.5 grid, warm-up wiggle ~ U{-1..1} step 0.5."""
    rng = np.random.default_rng(seed)
    out = []
    for k in range(n):
        b = float(np.round(rng.uniform(38, 48) * 2) / 2)
        wiggle = rng.choice([-1.0, -0.5, 0.0, 0.5, 1.0], size=n_warmup)
        out.append(History(k=k, base=b, warmup_rival=[float(b + w) for w in wiggle]))
    return out


def record(period, proposed, published, locked, rival, info=None):
    return {
        "period": period, "proposed": proposed, "published": published, "locked": locked,
        "rival": rival, "qty": demand(published, rival), "profit": profit(published, rival),
        **({"info": info} if info else {}),
    }


@dataclass
class Checkpoint:
    """State immediately before market feedback in the checkpoint period."""
    history: list[dict]          # completed periods before the checkpoint
    focal_price: float           # price already chosen and published for the checkpoint period
    policy_state: dict
    t0: int


def warmup(policy, hist: History, rng, start_price: float = 40.0) -> Checkpoint:
    """Run warm-up periods under immediate execution, then choose the checkpoint price."""
    state = policy.init_state()
    history = [record(0, start_price, start_price, False, hist.warmup_rival[0])]
    for t in range(1, len(hist.warmup_rival)):
        p, info = policy.decide(history, state, rng)
        history.append(record(t, p, p, False, hist.warmup_rival[t], info))
    t0 = len(hist.warmup_rival)
    p0, _ = policy.decide(history, state, rng)
    return Checkpoint(history=history, focal_price=p0, policy_state=state, t0=t0)


def run_branch(policy, ckpt: Checkpoint, hist: History, arm: str, lock: int, n_cont: int, rng) -> list[dict]:
    """Fork at the checkpoint: override the rival's executed price, recompute, continue.

    Every branch then faces the same rival path (back to base). The executor starts at t0+1
    with no active lock. Returns records for the checkpoint period and n_cont continuation periods.
    """
    history = copy.deepcopy(ckpt.history)
    state = copy.deepcopy(ckpt.policy_state)
    shock_rec = record(ckpt.t0, ckpt.focal_price, ckpt.focal_price, False, hist.rival_at_checkpoint(arm))
    history.append(shock_rec)
    ex = Executor(lock=lock, published=ckpt.focal_price, locked_until=-1, phase=noon_phase(hist, lock))
    out = [shock_rec]
    for h in range(1, n_cont + 1):
        t = ckpt.t0 + h
        p, info = policy.decide(history, state, rng)
        pub, locked = ex.step(t, p)
        rec = record(t, p, pub, locked, hist.base, info)
        rec["h"] = h
        history.append(rec)
        out.append(rec)
    out[0]["h"] = 0
    return out


def noon_phase(hist: History, lock: int) -> int:
    """Noon slot for the noon rule, varied across histories so results average over timing."""
    return hist.k % -lock if lock < 0 else 0


def rival_cut_gain(hist: History, focal_price: float) -> float:
    """Rival's one-period profit change from the cut vs no-op (given the focal price)."""
    return profit(hist.base - hist.shock, focal_price) - profit(hist.base, focal_price)


def replay(branch: list[dict], lock: int, phase: int = 0) -> list[dict]:
    """Open-loop replay: pass a branch's proposals through another executor; proposals stay fixed."""
    ex = Executor(lock=lock, published=branch[0]["published"], locked_until=-1, phase=phase)
    out = [dict(branch[0])]
    for r in branch[1:]:
        pub, locked = ex.step(r["period"], r["proposed"])
        out.append({**record(r["period"], r["proposed"], pub, locked, r["rival"]), "h": r["h"]})
    return out
