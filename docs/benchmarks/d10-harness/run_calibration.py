# -*- coding: utf-8 -*-
"""d10-harness · run_calibration.py — calibration 入口。

用法：
  python run_calibration.py --all                 # 12 paired × 2 组 = 24 runs（真实模型）
  python run_calibration.py --tasks cal-t1-001,cal-t4-002 --groups both
  python run_calibration.py --all --dry           # 干跑自检（fake model，无真实调用）
A/B 顺序由 seed 派生；subject_sha / harness_sha 按当前 checkout 记录并分开保存。
"""
import argparse, io, json, os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
LIB = os.path.join(HERE, "lib")
sys.path.insert(0, LIB)
REPO_ROOT = os.path.abspath(os.path.join(HERE, "..", "..", "..", ".."))
RUNS_DIR = os.path.join(HERE, "runs")

from capsule import load_task, load_golden, build_workspace, ab_order, GROUPS  # noqa: E402
from ledger import Ledger  # noqa: E402


def order_groups(groups, seed):
    """A/B 顺序由 seed 派生（偶→baseline 先；奇→experiment 先）。Review P1 修复：真实执行必须按此顺序。"""
    ordered = [g for g in GROUPS if g in groups]
    if ab_order(seed) == "experiment_first":
        ordered = list(reversed(ordered))
    return ordered


def resume_skipped(entries):
    """resume 消费规则：任何已落账的 (taskId, group) 都视为已消费（done/budget_stop/token_stop/error
    全部不再重跑，除非 --force）——冻结的 attempt 边界不允许同一 sample 在普通 --all 下再次获得 attempts
    （Review P1：status=error 也必须被消费）。"""
    return {(e["taskId"], e["group"]) for e in entries
            if e.get("taskId") and e.get("group")}


def current_shas():
    try:
        head = subprocess.run(["git", "rev-parse", "HEAD"], cwd=REPO_ROOT, capture_output=True,
                              text=True, encoding="utf-8").stdout.strip()
        status = subprocess.run(["git", "status", "--porcelain"], cwd=REPO_ROOT, capture_output=True,
                                text=True, encoding="utf-8").stdout.strip()
        return head, ("clean" if not status else "dirty")
    except Exception as e:
        return "unknown", str(e)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--tasks", default="")
    ap.add_argument("--groups", default="both", choices=["both", "baseline", "experiment"])
    ap.add_argument("--dry", action="store_true")
    ap.add_argument("--force", action="store_true", help="rerun samples already present in the ledger")
    args = ap.parse_args()

    with io.open(os.path.join(HERE, "config.json"), encoding="utf-8") as f:
        config = json.load(f)

    if args.all:
        task_ids = ["cal-t1-001", "cal-t1-002", "cal-t1-003",
                    "cal-t2-001", "cal-t2-002", "cal-t2-003",
                    "cal-t3-001", "cal-t3-002", "cal-t3-003",
                    "cal-t4-001", "cal-t4-002", "cal-t4-003"]
    elif args.tasks:
        task_ids = [t.strip() for t in args.tasks.split(",") if t.strip()]
    else:
        ap.error("pass --all or --tasks")

    groups = list(GROUPS) if args.groups == "both" else [args.groups]

    shas = current_shas()
    # dry/real ledger 隔离（Review P1）：干跑自检写独立账本，绝不进入正式 ledger.jsonl
    ledger = Ledger(RUNS_DIR, "ledger-dry.jsonl" if args.dry else "ledger.jsonl")
    relay = None
    fake = None
    if args.dry:
        from dry_model import DryModel  # noqa: E402
        fake = DryModel()
    else:
        from relay import Relay  # noqa: E402
        relay = Relay(config)
        if not relay.ready:
            print("relay not configured (check .env)", file=sys.stderr)
            return 2

    # resume：跳过 ledger 中已存在的 (taskId, group)（含 error，见 resume_skipped）；--force 重跑
    done = resume_skipped(ledger._entries) if not args.force else set()

    print("subject/harness sha: {0} ({1})".format(*shas))
    print("existing ledger entries:", ledger.count(), "total tokens:", ledger.total_tokens(),
          "| observed cost(non-authoritative): $%.6f" % ledger.total_cost(),
          "| resume skip:", len(done))
    if ledger.total_tokens() >= int(config["globalMaxTokens"]):
        print("FAIL-CLOSED: global token cap already reached; refusing to run.", file=sys.stderr)
        return 2

    total_tokens = ledger.total_tokens()
    for task_id in task_ids:
        task = load_task(task_id)
        seed = task["seed"]
        order = ab_order(seed)
        # A/B 顺序必须由 seed 决定（Review P1：不得固定 baseline→experiment）
        run_groups = order_groups(groups, seed)
        print("[{0}] seed={1} order={2} groups={3}".format(task_id, seed, order, run_groups))
        workspaces = build_workspace(task, RUNS_DIR)
        for group in run_groups:
            if (task_id, group) in done:
                print("  {0:10s} skip (already in ledger)".format(group))
                continue
            ws = workspaces[group]
            entry = __import__("agent_loop", fromlist=["run_task_run"]).run_task_run(
                task, group, ws, RUNS_DIR, relay, config, ledger,
                fake_model=fake, subject_sha=shas[0], harness_sha=shas[0])
            total_tokens += int((entry.get("usage") or {}).get("total", 0) or 0)
            ev = entry["finalEval"]
            print("  {0:10s} attempts={1} tokens={2} eval_pass={3} status={4}".format(
                group, entry["attempts"], entry["usage"]["total"], ev["pass"], entry["status"]))
        print("  cumulative tokens so far:", total_tokens)
        if total_tokens >= int(config["globalMaxTokens"]):
            print("FAIL-CLOSED: global token cap reached; stopping.", file=sys.stderr)
            return 0

    print("done. ledger:", ledger.path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
