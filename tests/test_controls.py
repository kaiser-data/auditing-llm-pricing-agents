"""Every scripted control must give its known answer before any LLM run is trusted."""
import numpy as np
import pytest

from harness.metrics import response
from harness.sim import (P_MONO, P_NASH, Executor, Fixed, Myopic, Sticky, Trigger, best_response,
                         make_histories, profit, run_branch, warmup)


def theta(policy, key, hist):
    rng = np.random.default_rng(0)
    ck = warmup(policy, hist, rng)
    r = {}
    for lock in (0, 3):
        noop = run_branch(policy, ck, hist, "noop", lock, 8, rng)
        cut = run_branch(policy, ck, hist, "cut", lock, 8, rng)
        r[lock] = response(noop, cut, key)
    return r[3] - r[0], r


def test_reference_prices():
    assert P_NASH == pytest.approx(36.0)
    assert P_MONO == pytest.approx(51.75)
    assert best_response(36.0) == 36.0


def test_executor_holds_three_periods_and_does_not_renew():
    ex = Executor(lock=3, published=24.0)
    pubs = [ex.step(t, p)[0] for t, p in enumerate([22, 24, 24, 24, 24, 23, 23, 23, 23], start=1)]
    # every change is held: 22 for t=1..3, the recovery to 24 for t=4..6, then 23
    assert pubs == [22, 22, 22, 24, 24, 24, 23, 23, 23]


def test_lock_zero_publishes_everything():
    ex = Executor(lock=0, published=24.0)
    assert [ex.step(t, p)[0] for t, p in enumerate([22, 24, 23], 1)] == [22, 24, 23]


@pytest.mark.parametrize("hist", make_histories(4))
def test_fixed_price_has_no_response(hist):
    th, r = theta(Fixed(), "published", hist)
    assert r[0] == 0 and r[3] == 0


@pytest.mark.parametrize("hist", make_histories(4))
def test_myopic_lock_creates_published_persistence_but_not_proposed(hist):
    th_pub, r_pub = theta(Myopic(), "published", hist)
    th_prop, r_prop = theta(Myopic(), "proposed", hist)
    assert r_pub[0] == 0          # immediate execution: recovers at h=2
    assert th_pub > 0             # lock: published price stays down
    assert r_prop[0] == 0 and r_prop[3] == 0   # proposals never persist


@pytest.mark.parametrize("hist", make_histories(4))
def test_trigger_persists_in_proposals_without_lock(hist):
    _, r = theta(Trigger(), "proposed", hist)
    assert r[0] > 0


@pytest.mark.parametrize("hist", make_histories(4))
def test_sticky_persists_in_proposals_without_lock(hist):
    _, r = theta(Sticky(0.3), "proposed", hist)
    assert r[0] > 0


def test_profits_recomputed_after_override():
    hist = make_histories(1)[0]
    ck = warmup(Myopic(), hist, np.random.default_rng(0))
    cut = run_branch(Myopic(), ck, hist, "cut", 0, 3, np.random.default_rng(0))
    noop = run_branch(Myopic(), ck, hist, "noop", 0, 3, np.random.default_rng(0))
    assert cut[0]["rival"] < noop[0]["rival"]
    assert cut[0]["profit"] == pytest.approx(profit(ck.focal_price, cut[0]["rival"]))
    assert cut[0]["profit"] < noop[0]["profit"]
    # continuation rival path is common
    assert [r["rival"] for r in cut[1:]] == [r["rival"] for r in noop[1:]]


def test_lock_one_equals_lock_zero():
    for hist in make_histories(4):
        ck = warmup(Myopic(), hist, np.random.default_rng(0))
        a = run_branch(Myopic(), ck, hist, "cut", 0, 8, np.random.default_rng(0))
        b = run_branch(Myopic(), ck, hist, "cut", 1, 8, np.random.default_rng(0))
        assert [r["published"] for r in a] == [r["published"] for r in b]


def test_myopic_matches_analytic_theta():
    # continuous BR = 25.2 + 0.3 p_j; an 8-unit cut moves it by 2.4, held for h=2,3 of the 4-lag window
    th, _ = theta(Myopic(), "published", make_histories(1)[0])
    assert th == pytest.approx(2 * 2.4 / (4 * 15.75), abs=0.02)


def test_trigger_not_set_off_by_return_from_raise():
    hist = make_histories(1)[0]
    ck = warmup(Trigger(), hist, np.random.default_rng(0))
    up = run_branch(Trigger(), ck, hist, "raise", 0, 8, np.random.default_rng(0))
    assert all(r["proposed"] == 46.0 for r in up[1:])


def test_replay_of_immediate_myopic_equals_closed_loop_lock():
    from harness.sim import replay
    hist = make_histories(1)[0]
    ck = warmup(Myopic(), hist, np.random.default_rng(0))
    b0 = run_branch(Myopic(), ck, hist, "cut", 0, 8, np.random.default_rng(0))
    b3 = run_branch(Myopic(), ck, hist, "cut", 3, 8, np.random.default_rng(0))
    assert [r["published"] for r in replay(b0, 3)] == [r["published"] for r in b3]


def test_noon_rule_cuts_at_once_raises_only_at_noon():
    ex = Executor(lock=-3, published=40.0, phase=0)
    # t=1 cut publishes; t=2 raise blocked; t=3 is noon (3 % 3 == 0) so the raise publishes
    assert [ex.step(t, p) for t, p in [(1, 35.0), (2, 40.0), (3, 40.0), (4, 38.0)]] == \
        [(35.0, False), (35.0, True), (40.0, False), (38.0, False)]


def test_myopic_under_noon_rule_looks_like_punishment():
    for hist in make_histories(3):  # phases 0, 1, 2
        ck = warmup(Myopic(), hist, np.random.default_rng(0))
        noop = run_branch(Myopic(), ck, hist, "noop", -3, 8, np.random.default_rng(0))
        cut = run_branch(Myopic(), ck, hist, "cut", -3, 8, np.random.default_rng(0))
        assert response(noop, cut, "proposed") == 0
        assert response(noop, cut, "published", window=(2,)) >= 0


def test_hash_chain_detects_edit(tmp_path):
    import json
    import subprocess
    import sys
    out = tmp_path / "log.jsonl"
    subprocess.run([sys.executable, "-m", "harness.run", "--policy", "myopic", "--model", "scripted", "--n-hist", "2",
                    "--reps", "1", "--out", str(out)], check=True, capture_output=True)
    from harness.verify_log import verify
    assert verify(str(out))[0]
    lines = out.read_text().splitlines()
    i = next(i for i, l in enumerate(lines) if '"branch"' in l)
    row = json.loads(lines[i])
    row["branch"][1]["published"] += 1.0  # tamper with one published price
    lines[i] = json.dumps(row)
    out.write_text("\n".join(lines) + "\n")
    assert not verify(str(out))[0]
