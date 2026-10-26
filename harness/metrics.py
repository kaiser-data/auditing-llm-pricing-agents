"""Estimands: persistent cut/raise response and the lock contrast theta."""
from __future__ import annotations

import numpy as np

from .sim import G

H_WINDOW = (2, 3, 4, 5)


def path(branch: list[dict], key: str) -> dict[int, float]:
    return {r["h"]: r[key] for r in branch}


def response(base: list[dict], shocked: list[dict], key: str, sign: int = 1, window=H_WINDOW) -> float:
    """Mean over the window of sign*(p_noop - p_shock)/G. sign=+1 for cuts, -1 for raises."""
    b, s = path(base, key), path(shocked, key)
    return float(np.mean([sign * (b[h] - s[h]) / G for h in window]))


def paired_bootstrap(values: np.ndarray, n_boot: int = 10_000, seed: int = 0) -> tuple[float, float, float]:
    """Mean and 95% percentile CI, resampling histories (the independent unit)."""
    rng = np.random.default_rng(seed)
    values = np.asarray(values, dtype=float)
    idx = rng.integers(0, len(values), size=(n_boot, len(values)))
    means = values[idx].mean(axis=1)
    return float(values.mean()), float(np.percentile(means, 2.5)), float(np.percentile(means, 97.5))
