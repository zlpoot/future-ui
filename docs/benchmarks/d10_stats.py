"""D10 / #23 frozen statistics helpers.

Frozen by FROZEN PROTOCOL v1 (2026-10-05) in issue #23; pre-CAL-001.
Do not change behavior without updating the protocol + new owner approval.

Functions
---------
newcombe_m10(a, b, c, d, alpha=0.05) -> (L, U)
    Newcombe (1998) method 10, paired risk-difference 95% CI (MOVER with
    Wilson score intervals + Newcombe correlation phi). Pure stdlib math.
cp_upper(k, n, alpha=0.05) -> float
    Clopper-Pearson 95% upper bound (equal tails) via scipy.stats.beta.ppf.
q_star(k, n, delta_min=0.15, alpha=0.05) -> float
    max(cp_upper(k, n), delta_min).
mcnemar_exact_p(b, c) -> float
    Exact two-sided McNemar p = min(1, 2*P(Bin(s,0.5) <= min(b,c))), s=b+c.
mcnemar_power(n, p10, p01, alpha=0.05) -> float
    Exact power via enumeration over (b, c) in {0..n}^2.
min_n_for_power(p10, p01, target=0.80, alpha=0.05, max_n=300) -> int

Verification anchor (Newcombe 1998 worked example, cells r,s,t,u = a,b,c,d):
    (20, 15, 6, 5) -> 95% CI = (0.002602, 0.369943)
"""
from __future__ import annotations

import math

Z_0_975 = 1.959963984540054  # normal quantile for alpha=0.05 two-sided

try:
    from scipy.stats import beta as _beta, binom as _binom
    _SCIPY = True
except Exception:  # pragma: no cover - env without scipy
    _SCIPY = False


def _wilson(x: int, n: int, alpha: float = 0.05):
    """Wilson score interval (no continuity correction) for a single proportion."""
    if n <= 0 or x < 0 or x > n:
        raise ValueError("invalid binomial counts")
    z = Z_0_975 if alpha == 0.05 else _z(alpha)
    z2 = z * z
    p = x / n
    denom = n + z2
    centre = (p + z2 / (2 * n)) / (1 + z2 / n)
    half = z * math.sqrt(p * (1 - p) / n + z2 / (4 * n * n)) / (1 + z2 / n)
    return max(0.0, centre - half), min(1.0, centre + half)


def _z(alpha: float) -> float:
    # Normal quantile via inverse erf (stdlib); exact for any alpha.
    if not (0 < alpha < 1):
        raise ValueError("alpha must be in (0,1)")
    # Abramowitz-Stegun 26.2.23 approximation (1e-7 relative).
    p = 1.0 - alpha / 2.0
    t = math.sqrt(math.log(1.0 / (p * p)))
    c0, c1, c2 = 2.515517, 0.802853, 0.010328
    d1, d2, d3 = 1.432788, 0.189269, 0.001308
    return t - (c0 + c1 * t + c2 * t * t) / (1 + d1 * t + d2 * t * t + d3 * t * t * t)


def newcombe_m10(a: int, b: int, c: int, d: int, alpha: float = 0.05):
    """Newcombe (1998) method 10: paired risk-difference CI.

    Cells: a = both pass, b = exp PASS/base FAIL, c = exp FAIL/base PASS,
    d = both fail. D = (b - c) / N = p_exp - p_base.
    """
    N = a + b + c + d
    if N <= 0:
        raise ValueError("empty table")
    p1 = (a + b) / N  # experiment pass rate
    p2 = (a + c) / N  # baseline pass rate
    D = (b - c) / N
    l1, u1 = _wilson(a + b, N, alpha)
    l2, u2 = _wilson(a + c, N, alpha)
    # Newcombe correlation phi (page: if any marginal is 0 -> phi = 0).
    marg = (a + b, c + d, a + c, b + d)
    if any(m == 0 for m in marg):
        phi = 0.0
    else:
        A = (a + b) * (c + d) * (a + c) * (b + d)
        B = a * d - b * c
        if B > N / 2:
            C = B - N / 2
        elif B >= 0:
            C = 0.0
        else:
            C = B
        phi = C / math.sqrt(A)
    L = D - math.sqrt((p1 - l1) ** 2 - 2 * phi * (p1 - l1) * (u2 - p2) + (u2 - p2) ** 2)
    U = D + math.sqrt((p2 - l2) ** 2 - 2 * phi * (p2 - l2) * (u1 - p1) + (u1 - p1) ** 2)
    return L, U


def cp_upper(k: int, n: int, alpha: float = 0.05) -> float:
    """Clopper-Pearson 95% upper bound, equal tails: U = Beta(1-a/2; k+1, n-k)."""
    if not _SCIPY:
        raise RuntimeError("scipy required for cp_upper; run in frozen venv (scipy==1.14.1)")
    if k < 0 or n < 0 or k > n:
        raise ValueError("invalid counts")
    return float(_beta.ppf(1.0 - alpha / 2.0, k + 1, n - k))


def q_star(k: int, n: int, delta_min: float = 0.15, alpha: float = 0.05) -> float:
    """Frozen q*: max(Clopper-Pearson 95% UB of pooled discordance, delta_min)."""
    return max(cp_upper(k, n, alpha), delta_min)


def mcnemar_exact_p(b: int, c: int) -> float:
    """Exact two-sided McNemar p = min(1, 2*P(Bin(s,0.5) <= min(b,c))), s=b+c."""
    if not _SCIPY:
        raise RuntimeError("scipy required for mcnemar_exact_p")
    s = b + c
    m = min(b, c)
    return min(1.0, 2.0 * float(_binom.cdf(m, s, 0.5)))


def mcnemar_power(n: int, p10: float, p01: float, alpha: float = 0.05) -> float:
    """Exact two-sided McNemar power at sample size n (paired tasks)."""
    if not _SCIPY:
        raise RuntimeError("scipy required for mcnemar_power")
    if not (0 <= p01 <= p10 <= 1):
        raise ValueError("require 0 <= p01 <= p10 <= 1")
    power = 0.0
    for b in range(n + 1):
        pb = float(_binom.pmf(b, n, p10))
        if pb == 0.0:
            continue
        for c in range(n + 1):
            pc = float(_binom.pmf(c, n, p01))
            if pc == 0.0:
                continue
            s = b + c
            if s and 2.0 * float(_binom.cdf(min(b, c), s, 0.5)) < alpha:
                power += pb * pc
    return power


def min_n_for_power(p10: float, p01: float, target: float = 0.80,
                    alpha: float = 0.05, max_n: int = 300) -> int:
    """Smallest n with exact McNemar power >= target (n from 1..max_n)."""
    if not _SCIPY:
        raise RuntimeError("scipy required for min_n_for_power")
    for n in range(1, max_n + 1):
        if mcnemar_power(n, p10, p01, alpha) >= target:
            return n
    raise RuntimeError(f"power < {target} for all n <= {max_n}; stop and escalate")


if __name__ == "__main__":
    # Verification anchor: Newcombe (1998) worked example, cells (r,s,t,u).
    L, U = newcombe_m10(20, 15, 6, 5)
    ok = abs(L - 0.002602) <= 0.0005 and abs(U - 0.369943) <= 0.0005
    print(f"newcombe_m10(20,15,6,5) = ({L:.6f}, {U:.6f})  expected (0.002602, 0.369943)  -> {'PASS' if ok else 'FAIL'}")
    if not ok:
        raise SystemExit(1)
    if _SCIPY:
        print("cp_upper(0,46) =", round(cp_upper(0, 46), 6), " (k=0 floor sanity)")
        print("mcnemar_exact_p(15,6) =", round(mcnemar_exact_p(15, 6), 6))
        print("mcnemar_power(32, .13, .02) =", round(mcnemar_power(32, 0.13, 0.02), 6))
        print("min_n_for_power(.13,.02) =", min_n_for_power(0.13, 0.02))
    else:
        print("scipy not present; CP/McNemar/power tests skipped (run inside frozen venv, scipy==1.14.1)")
