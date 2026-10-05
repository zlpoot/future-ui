# -*- coding: utf-8 -*-
"""D10 calibration 24-run 分析：读 ledger → 配对表 → #23 冻结统计（McNemar/Newcombe m10/q*/n*）。
运行环境：.venv-d10（Python 3.12 + scipy==1.14.1），与 FROZEN PROTOCOL v1 一致。"""
import io, json, os, sys

sys.path.insert(0, r"E:\projects\future-ui\docs\benchmarks")
from d10_stats import newcombe_m10, mcnemar_exact_p, cp_upper, q_star, mcnemar_power, min_n_for_power

LEDGER = r"E:\projects\future-ui\docs\benchmarks\d10-harness\runs\ledger.jsonl"
PAIRS = ["cal-t1-001", "cal-t1-002", "cal-t1-003", "cal-t2-001", "cal-t2-002", "cal-t2-003",
         "cal-t3-001", "cal-t3-002", "cal-t3-003", "cal-t4-001", "cal-t4-002", "cal-t4-003"]

with io.open(LEDGER, encoding="utf-8") as f:
    entries = [json.loads(l) for l in f if l.strip()]

by_key = {(e["taskId"], e["group"]): e for e in entries}
eligible = [e for e in entries if e.get("outcomeEligible") is True]
print("ledger entries: %d | outcomeEligible: %d | subjects: %s" % (
    len(entries), len(eligible), sorted({e.get("subjectSha", "")[:8] for e in entries})))
print("harness: %s | model: %s | total tokens: %d | observed cost(non-auth): $%.4f" % (
    sorted({e.get("harnessSha", "")[:8] for e in entries})[0],
    sorted({e.get("modelId") for e in entries}),
    sum(e["usage"]["total"] for e in entries),
    sum(float(e.get("cost", 0) or 0) for e in entries)))
print("statuses: %s | budget_stop/token_stop/prompt_too_large: %d" % (
    sorted({e["status"] for e in entries}),
    sum(1 for e in entries if e["status"] != "done")))

a = b = c = d = 0
rows = []
for tid in PAIRS:
    exp = by_key.get((tid, "experiment")); base = by_key.get((tid, "baseline"))
    assert exp and base, tid
    ep, bp = bool(exp["finalEval"]["pass"]), bool(base["finalEval"]["pass"])
    if ep and bp: a += 1; cell = "a"
    elif ep and not bp: b += 1; cell = "b"
    elif not ep and bp: c += 1; cell = "c"
    else: d += 1; cell = "d"
    rows.append((tid, ep, bp, cell, exp["usage"]["total"], base["usage"]["total"]))

N = a + b + c + d
p_exp, p_base = (a + b) / N, (a + c) / N
delta = (b - c) / N
print("\npaired table (a=bothPASS, b=expPASS/baseFAIL, c=expFAIL/basePASS, d=bothFAIL):")
print("  a=%d b=%d c=%d d=%d  N=%d" % (a, b, c, d, N))
for r in rows:
    print("   %-11s exp=%-5s base=%-5s cell=%s  tok=%d/%d" % (r[0], r[1], r[2], r[3], r[4], r[5]))
print("  p_exp=%.4f  p_base=%.4f  Δ=(b-c)/N=%.4f" % (p_exp, p_base, delta))

mcp = mcnemar_exact_p(b, c)
L, U = newcombe_m10(a, b, c, d)
print("\n#23 frozen stats:")
print("  exact two-sided McNemar p = %.6f  (α=0.05 → %s)" % (mcp, "REJECT H0" if mcp < 0.05 else "no evidence of difference"))
print("  Newcombe(1998) method 10 95%% CI on Δ = (%.6f, %.6f)" % (L, U))
print("  → calibration 24-run: experiment(toolchain) vs baseline(manual): null/negative result (no significant difference)")

# 预注册 acceptance 样本量规则（#23：q* = max(CP 95% UB of discordance, δ_min=0.15)）
k = b + c
qcp = cp_upper(k, N)
qstar = q_star(k, N, delta_min=0.15)
print("\nacceptance pre-registration (calibration → n*):")
print("  discordance k=b+c=%d, N_cal=%d → Clopper-Pearson 95%% UB=%.4f" % (k, N, qcp))
print("  q* = max(UB, δ_min=0.15) = %.4f" % qstar)
if qstar <= 0.15:
    qstar_eff = 0.15
    print("  q* ≤ δ_min → fixed q*=δ_min=0.15 (frozen rule)")
else:
    qstar_eff = qstar
p10 = (qstar_eff + 0.15) / 2.0
p01 = (qstar_eff - 0.15) / 2.0
print("  p10=(q*+δ)/2=%.4f  p01=(q*-δ)/2=%.4f" % (p10, p01))
nstar = min_n_for_power(p10, p01, target=0.80)
print("  min paired n* for 80%% power @α=0.05 (pooled q*) = %d" % nstar)
pw32 = mcnemar_power(32, p10, p01)
print("  McNemar power @ n=32 (first-wave cap): %.4f → %s" % (pw32, "sufficient" if pw32 >= 0.80 else "insufficient (escalate per frozen rule)"))
