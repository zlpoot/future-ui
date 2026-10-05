# -*- coding: utf-8 -*-
"""d10-harness · check_harness.py — 干跑自检（无真实模型调用）。

覆盖：
1. capsule 隔离：workspace 无任何 @future-ui 引用（baseline 无法偷看 treatment）；
2. evaluator 判别力：12 个任务「正确修复 spec → PASS」×「初始 spec → FAIL」；
3. 反馈测试（vitest）在正确 spec 下通过；
4. 实验组 bridge：真实 preview/validate-spec 查询返回结构化结果；
5. 基线组 ## TOOL 拒绝（工具不可用）与账本记录；
6. budget fail-closed：配置单价下 cost 计算 + 全局 cap 拒绝。
"""
import io, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
LIB = os.path.join(HERE, "lib")
sys.path.insert(0, LIB)
REPO_ROOT = os.path.abspath(os.path.join(HERE, "..", "..", "..", ".."))
RUNS_DIR = os.path.join(HERE, "runs")

from capsule import load_task, load_golden, build_workspace, GROUPS  # noqa: E402
from ledger import Ledger  # noqa: E402
from agent_loop import run_feedback, run_bridge_query, run_evaluator, run_task_run  # noqa: E402
from dry_model import DryModel, FIXED_SPECS  # noqa: E402

TASK_IDS = ["cal-t1-001", "cal-t1-002", "cal-t1-003",
            "cal-t2-001", "cal-t2-002", "cal-t2-003",
            "cal-t3-001", "cal-t3-002", "cal-t3-003",
            "cal-t4-001", "cal-t4-002", "cal-t4-003"]

with io.open(os.path.join(HERE, "config.json"), encoding="utf-8") as f:
    CONFIG = json.load(f)


def scan_future_ui(dirpath):
    hits = []
    for root, _dirs, files in os.walk(dirpath):
        for name in files:
            p = os.path.join(root, name)
            try:
                text = io.open(p, encoding="utf-8", errors="replace").read()
            except OSError:
                continue
            for token in ("@future-ui", "future-ui", "ai-dev", "ai-contract-core"):
                if token in text:
                    hits.append((os.path.relpath(p, dirpath), token))
    return hits


def test_capsule_isolation():
    task = load_task(TASK_IDS[0])
    ws = build_workspace(task, RUNS_DIR)
    assert set(ws.keys()) == set(GROUPS), ws.keys()
    for group in GROUPS:
        d = ws[group]
        for name in ("README.md", "spec.json", "render.js", "app.test.js", "package.json"):
            assert os.path.exists(os.path.join(d, name)), (group, name)
    # workspace 内不得出现 future-ui 任何痕迹
    hits = scan_future_ui(os.path.join(RUNS_DIR, TASK_IDS[0]))
    assert not hits, hits
    print("capsule isolation: PASS (no future-ui trace in workspace)")


def test_evaluator_discrimination():
    n_pass = n_fail = 0
    for tid in TASK_IDS:
        task = load_task(tid)
        ws = build_workspace(task, RUNS_DIR)
        ws_dir = ws["baseline"]
        # 正确修复 → PASS
        with io.open(os.path.join(ws_dir, "spec.json"), "w", encoding="utf-8") as f:
            json.dump(FIXED_SPECS[tid], f, ensure_ascii=False, indent=2)
        v1, _ = run_evaluator(task, ws_dir, RUNS_DIR)
        assert v1["pass"] is True, (tid, "fixed should pass", v1.get("summary"))
        n_pass += 1
        # 初始（未修复）→ FAIL（全部任务初始态均未达 golden）
        with io.open(os.path.join(ws_dir, "spec.json"), "w", encoding="utf-8") as f:
            json.dump(task["initialSpec"], f, ensure_ascii=False, indent=2)
        v2, _ = run_evaluator(task, ws_dir, RUNS_DIR)
        assert v2["pass"] is False, (tid, "initial should fail", v2.get("summary"))
        n_fail += 1
    print("evaluator discrimination: PASS ({0} fixed->PASS, {1} initial->FAIL)".format(n_pass, n_fail))


def test_feedback():
    task = load_task("cal-t1-001")
    ws = build_workspace(task, RUNS_DIR)
    ws_dir = ws["baseline"]
    with io.open(os.path.join(ws_dir, "spec.json"), "w", encoding="utf-8") as f:
        json.dump(FIXED_SPECS["cal-t1-001"], f, ensure_ascii=False, indent=2)
    fr = run_feedback(task, "baseline", ws_dir, RUNS_DIR)
    assert fr["passed"] is True, fr["tail"]
    print("feedback test on fixed spec: PASS (rc=0)")


def test_bridge():
    task = load_task("cal-t1-001")
    ws = build_workspace(task, RUNS_DIR)
    ws_dir = ws["experiment"]
    spec_path = os.path.join(ws_dir, "spec.json")
    with io.open(spec_path, "w", encoding="utf-8") as f:
        json.dump(FIXED_SPECS["cal-t1-001"], f, ensure_ascii=False, indent=2)
    res1, _ = run_bridge_query({"tool": "preview", "args": {"componentId": "button", "props": {"disabled": True}}}, spec_path, RUNS_DIR)
    assert res1.get("tool") == "preview" and "renderTarget" in (res1.get("result") or {}), res1
    res2, _ = run_bridge_query({"tool": "validate-spec"}, spec_path, RUNS_DIR)
    assert res2.get("tool") == "validate-spec" and isinstance(res2.get("result", {}).get("components"), list), res2
    assert not (res2.get("result", {}).get("components") or [{}])[0].get("diagnostics"), res2  # 正确 spec 应零诊断
    print("bridge real future-ui tools: PASS (preview + validate-spec)")


def test_baseline_tool_rejection_and_loop():
    # 干跑完整 run：实验组（工具+spec 两轮）与基线组（直接 spec）
    ledger = Ledger(RUNS_DIR)
    before = ledger.count()
    task = load_task("cal-t1-002")
    ws = build_workspace(task, RUNS_DIR)
    e1 = run_task_run(task, "experiment", ws["experiment"], RUNS_DIR, None, CONFIG, ledger,
                      fake_model=DryModel(lambda: FIXED_SPECS["cal-t1-002"]),
                      subject_sha="dry", harness_sha="dry")
    assert e1["finalEval"]["pass"] is True, e1.get("evalError")
    assert e1["bridgeCalls"], "experiment should have bridge calls"
    e2 = run_task_run(task, "baseline", ws["baseline"], RUNS_DIR, None, CONFIG, ledger,
                      fake_model=DryModel(lambda: FIXED_SPECS["cal-t1-002"], emit_tool_for_experiment=False),
                      subject_sha="dry", harness_sha="dry")
    assert e2["finalEval"]["pass"] is True
    assert ledger.count() == before + 2
    print("full dry loop: PASS (experiment bridge + baseline, both eval PASS)")


def test_baseline_tool_rejected():
    ledger = Ledger(RUNS_DIR)
    task = load_task("cal-t4-001")
    ws = build_workspace(task, RUNS_DIR)

    class ToolSpam(DryModel):
        def __call__(self, messages, group, attempt):
            if attempt == 1:
                return {"content": "## TOOL {\"tool\":\"preview\"}\n## SPEC\n" + json.dumps(FIXED_SPECS["cal-t4-001"], ensure_ascii=False) + "\n",
                        "usage": {"prompt": 100, "completion": 100, "cached": 0, "total": 200}, "cost": 0.0, "elapsed": 0.01}
            return super().__call__(messages, group, attempt)

    e = run_task_run(task, "baseline", ws["baseline"], RUNS_DIR, None, CONFIG, ledger,
                     fake_model=ToolSpam(lambda: FIXED_SPECS["cal-t4-001"]),
                     subject_sha="dry", harness_sha="dry")
    assert e["finalEval"]["pass"] is True
    assert e["bridgeCalls"] and e["bridgeCalls"][0].get("rejected"), e["bridgeCalls"]
    print("baseline ## TOOL rejection: PASS (recorded, not executed)")


def test_budget_fail_closed():
    from relay import Relay
    from agent_loop import precall_max_tokens, config_digest
    r = Relay(CONFIG)
    c = r._cost({"prompt_tokens": 1_000_000, "completion_tokens": 1_000_000,
                 "prompt_tokens_details": {"cached_tokens": 0}})
    assert c[0] == round((5.0 + 15.0), 6), c  # $5 + $15 per M tokens
    # 预调用 gating：预算充足 → 允许 max_out；预算被占满 → 0（停止）
    ledger = Ledger(RUNS_DIR)
    full = precall_max_tokens(r, CONFIG, ledger, 0.0, 0)
    assert full == int(CONFIG["api"]["maxOutputTokens"]), full
    stopped = precall_max_tokens(r, CONFIG, ledger, float(CONFIG["usdHardCap"]), 0)
    assert stopped == 0, stopped
    # 最坏情况单次调用不超剩余预算：allowed 输出 token 的按单价成本 ≤ 剩余
    allowed = precall_max_tokens(r, CONFIG, ledger, 1.0, 0)
    worst_in = min(int(CONFIG["maxInputTokensPerCall"]), int(CONFIG["maxTokensPerRun"]))
    worst = (worst_in * r.price_in + allowed * r.price_out) / 1e6
    assert worst <= float(CONFIG["usdHardCap"]) - 1.0 + 1e-9, (worst, allowed)
    assert len(config_digest(CONFIG)) == 16
    print("budget fail-closed math: PASS (pre-call gating never overshoots; digest present)")


class _FakeRelay:
    def __init__(self, prices):
        self.price_in = prices["input"] / 1e6
        self.price_out = prices["output"] / 1e6
        self.model = "fake"
        self.base = "fake://"


def test_ab_order_deterministic():
    from run_calibration import order_groups
    from capsule import ab_order
    both = ["baseline", "experiment"]
    for seed in (1001, 1003, 1005, 1007, 1009, 1011):
        assert order_groups(both, seed) == ["experiment", "baseline"], (seed, ab_order(seed))
    for seed in (1002, 1004, 1006, 1008, 1010, 1012):
        assert order_groups(both, seed) == ["baseline", "experiment"], (seed, ab_order(seed))
    assert order_groups(["experiment"], 1002) == ["experiment"]
    print("A/B order by seed: PASS (odd->experiment first, even->baseline first)")


def test_relay_error_resilience():
    from agent_loop import run_task_run
    ledger = Ledger(RUNS_DIR)
    before = ledger.count()
    task = load_task("cal-t4-003")
    ws = build_workspace(task, RUNS_DIR)

    class BrokenModel:
        def __call__(self, messages, group, attempt):
            raise RuntimeError("simulated relay outage")

    e = run_task_run(task, "baseline", ws["baseline"], RUNS_DIR, None, CONFIG, ledger,
                     fake_model=BrokenModel(), subject_sha="dry", harness_sha="dry")
    assert ledger.count() == before + 1, "a failed run must still leave a ledger record"
    assert e["status"] == "error", e["status"]
    assert e["feedbackLog"] and "error" in e["feedbackLog"][0], e["feedbackLog"]
    assert e["finalEval"]["pass"] is False
    assert e["order"] == "baseline_first"
    assert e["modelId"] == "dry" and e["configDigest"]
    print("relay error resilience: PASS (ledger record + status=error + eval still runs)")


def main():
    test_capsule_isolation()
    test_evaluator_discrimination()
    test_feedback()
    test_bridge()
    test_budget_fail_closed()
    test_ab_order_deterministic()
    test_baseline_tool_rejection_and_loop()
    test_baseline_tool_rejected()
    test_relay_error_resilience()
    print("ALL HARNESS SELF-CHECKS PASSED")


if __name__ == "__main__":
    main()
