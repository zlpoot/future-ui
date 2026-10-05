# -*- coding: utf-8 -*-
"""d10-harness · agent_loop.py — 单 run 执行循环（attempt / 反馈 / 判定 / 预算护栏）。

协议（两组相同，仅工具集不同）：
- 模型只编辑 spec.json；交付 = 输出 ## SPEC 块（完整 JSON）；
- 实验组额外可输出 ## TOOL <json> 块调用 future-ui 工具桥（bridge.run.ts，真实实现）；
- 基线组的 ## TOOL 块会被拒绝并记录（工具不可用），防止基线假装使用 treatment；
- 反馈 = vitest 运行生成的 feedback 测试（同一断言，两组相同）；
- 最终判定 = 隐藏 evaluator.run.ts（组中立，workspace 外）；
- 护栏：attempt ≤ attemptsPerTask；run 内 aggregate tokens ≤ maxTokensPerRun；
  全局累计 cost ≤ usdHardCap（fail-closed，超过即停）。
"""
import io, json, os, re, subprocess, time

HERE = os.path.dirname(os.path.abspath(__file__))
HARNESS = os.path.dirname(HERE)
REPO_ROOT = os.path.abspath(os.path.join(HERE, "..", "..", "..", ".."))
BRIDGE_TS = os.path.join(HERE, "bridge.run.ts")
EVAL_TS = os.path.join(HERE, "evaluator.run.ts")

SPEC_RE = re.compile(r"##\s*SPEC\s*\n(.*?)(?=\n##\s*TOOL|\Z)", re.S)
TOOL_RE = re.compile(r"##\s*TOOL\s*\n?(\{.*?\})\s*(?=\n##|\Z)", re.S)

SYSTEM_COMMON = (
    "You are a front-end engineer completing a small UI task in a fresh workspace.\n"
    "Rules:\n"
    "1. You may ONLY edit the file spec.json. Declarative schema: {components:[{id, type, label?, props}]}.\n"
    "   - label: component-level display text (e.g. button caption); NOT a contract prop.\n"
    "   - props: contract-declared fields only (see render.js comments).\n"
    "2. Rendering semantics are documented in the comments of render.js; your verification scaffold is app.test.js.\n"
    "3. Output protocol: to deliver your final spec, emit a block starting with `## SPEC` followed by the COMPLETE JSON content of spec.json on the following lines. You may emit brief reasoning before it.\n"
    "4. You have limited attempts; stop once the feedback reports all checks passing.\n"
    "5. Do not modify render.js or app.test.js; they are fixed."
)

SYSTEM_EXPERIMENT_EXTRA = (
    "\n\nYour dev toolchain (additional to standard checks) — query by emitting `## TOOL <json>` blocks:\n"
    "- {\"tool\":\"catalog\"} — contract catalog (kinds, required fields, constraints).\n"
    "- {\"tool\":\"validate-spec\"} — validate each component's props against the frozen component contracts (declared props only, type/options shape).\n"
    "- {\"tool\":\"patch\",\"args\":{\"nodeId\":\"component:<id>\",\"expectedVersion\":0,\"changes\":{\"props\":{...}}}} — optimistic-concurrency patch on the declarative node store (rejected when stale).\n"
    "- {\"tool\":\"preview\",\"args\":{\"componentId\":\"button|select\",\"props\":{...}}} — controlled DOM render + render target.\n"
    "- {\"tool\":\"test\",\"args\":{\"componentId\":\"button|select\",\"props\":{...},\"checks\":[...]}} — deterministic structure/interaction checks.\n"
    "Tool outputs are returned in the next feedback. `## SPEC` is still the only way to deliver your final spec.json."
)

SYSTEM_BASELINE_NOTE = "\n\n(You have no additional toolchain in this run.)"


def _run_vitest(test_file, env_extra, timeout=180):
    env = dict(os.environ)
    env.update(env_extra)
    # Windows：pnpm 经 corepack 解析（packageManager=pnpm@11.28.4）；vitest 用 harness 独立
    # config（include 覆盖 lib/*.run.ts 与 runs/_feedback）并显式传文件路径过滤。
    cfg = os.path.join(HARNESS, "vitest.config.ts").replace("\\", "/")
    cmd = ["cmd", "/c", "corepack", "pnpm", "exec", "vitest", "run", "--config", cfg,
           test_file.replace("\\", "/")]
    t0 = time.time()
    try:
        proc = subprocess.run(cmd, cwd=REPO_ROOT, env=env, capture_output=True, text=True,
                              timeout=timeout, encoding="utf-8", errors="replace")
        rc = proc.returncode
        out = (proc.stdout or "")[-4000:]
    except subprocess.TimeoutExpired as e:
        rc = 124
        out = (e.stdout or b"" if isinstance(e.stdout, bytes) else e.stdout or "")[-4000:]
    return rc, out, round(time.time() - t0, 2)


def _write_feedback_test(task, group, runs_dir):
    body = task["feedbackBody"]
    path = os.path.join(runs_dir, "_feedback", "{0}-{1}.test.ts".format(task["taskId"], group))
    os.makedirs(os.path.dirname(path), exist_ok=True)
    content = (
        "// @vitest-environment jsdom\n"
        "import { describe, it, expect, beforeAll } from 'vitest';\n"
        "import { pathToFileURL } from 'node:url';\n"
        "let render, spec, container;\n"
        "beforeAll(async () => {\n"
        "  const rp = process.env.FB_RENDER; const sp = process.env.FB_SPEC;\n"
        "  render = (await import(pathToFileURL(rp).href)).render;\n"
        "  spec = (await import(pathToFileURL(sp).href)).default;\n"
        "  container = document.createElement('div'); document.body.appendChild(container);\n"
        "  render(spec, container);\n"
        "});\n"
        "describe('feedback', () => {\n" + body + "\n});\n"
    )
    with io.open(path, "w", encoding="utf-8") as f:
        f.write(content)
    return path


def run_feedback(task, group, workspace, runs_dir):
    test_file = _write_feedback_test(task, group, runs_dir)
    rc, out, dt = _run_vitest(test_file, {"FB_RENDER": os.path.join(workspace, "render.js"),
                                          "FB_SPEC": os.path.join(workspace, "spec.json")})
    return {"rc": rc, "passed": rc == 0, "tail": out, "elapsed": dt}


def run_bridge_query(query, spec_path, runs_dir):
    qpath = os.path.join(runs_dir, "_bridge", "q_{0}_{1}.json".format(int(time.time() * 1000), abs(hash(json.dumps(query, sort_keys=True)) % 100000)))
    opath = qpath.replace(".json", ".out.json")
    os.makedirs(os.path.dirname(qpath), exist_ok=True)
    with io.open(qpath, "w", encoding="utf-8") as f:
        json.dump(query, f, ensure_ascii=False)
    rc, out, dt = _run_vitest(BRIDGE_TS, {"BRIDGE_QUERY_PATH": qpath, "BRIDGE_SPEC": spec_path,
                                          "BRIDGE_OUTPUT": opath})
    if os.path.exists(opath):
        with io.open(opath, encoding="utf-8") as f:
            result = json.load(f)
    else:
        result = {"tool": query.get("tool"), "error": "bridge failed rc={0}".format(rc), "tail": out}
    return result, dt


def run_evaluator(task, workspace, runs_dir):
    gpath = os.path.join(HARNESS, "golden", task["taskId"] + ".json")
    opath = os.path.join(runs_dir, "_eval", "{0}-{1}.json".format(task["taskId"], int(time.time() * 1000)))
    os.makedirs(os.path.dirname(opath), exist_ok=True)
    rc, out, dt = _run_vitest(EVAL_TS, {"EVAL_WORKSPACE": workspace, "EVAL_GOLDEN": gpath,
                                        "EVAL_OUTPUT": opath})
    if os.path.exists(opath):
        with io.open(opath, encoding="utf-8") as f:
            verdict = json.load(f)
    else:
        verdict = {"taskId": task["taskId"], "pass": False, "error": "evaluator failed rc={0}".format(rc), "tail": out}
    return verdict, dt


def parse_blocks(content):
    specs = [m.group(1).strip() for m in SPEC_RE.finditer("\n" + content + "\n")]
    tools = []
    for m in TOOL_RE.finditer("\n" + content + "\n"):
        raw = m.group(1).strip()
        try:
            tools.append(json.loads(raw))
        except ValueError:
            tools.append({"tool": None, "parse_error": raw[:120]})
    return specs, tools


def run_task_run(task, group, workspace, runs_dir, relay, config, ledger, fake_model=None, subject_sha="", harness_sha=""):
    """执行单个 (task, group) run。fake_model 为干跑模式提供响应（不调用中转站）。"""
    task_id = task["taskId"]
    family = task["family"]
    seed = task["seed"]
    cfg_api = config["api"]
    attempts_max = int(config["attemptsPerTask"])
    tokens_max = int(config["maxTokensPerRun"])
    cost_max = float(config["usdHardCap"])

    system = SYSTEM_COMMON + (SYSTEM_EXPERIMENT_EXTRA if group == "experiment" else SYSTEM_BASELINE_NOTE)
    spec_now = json.dumps(task["initialSpec"], ensure_ascii=False)
    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": task["taskText"] + "\n\n当前 spec.json：\n" + spec_now + "\n\n开始工作。"},
    ]

    usage = {"prompt": 0, "completion": 0, "cached": 0, "total": 0}
    cost = 0.0
    attempts = 0
    feedback_log = []
    bridge_log = []
    status = "done"
    final_spec = task["initialSpec"]
    spec_delivered = False
    t0 = time.time()

    while attempts < attempts_max:
        attempts += 1
        if fake_model is not None:
            resp = fake_model(messages, group, attempts)
        else:
            resp = relay.chat(messages)
        usage["prompt"] += resp["usage"]["prompt"]
        usage["completion"] += resp["usage"]["completion"]
        usage["cached"] += resp["usage"]["cached"]
        usage["total"] += resp["usage"]["total"]
        cost += resp["cost"]

        if usage["total"] > tokens_max:
            status = "token_stop"
            feedback_log.append({"attempt": attempts, "note": "aggregate tokens exceeded cap"})
            break
        # 全局护栏：累计 cost 超 cap 立即停止（fail-closed）
        if ledger.total_cost() + cost > cost_max:
            status = "budget_stop"
            feedback_log.append({"attempt": attempts, "note": "global budget cap exceeded (fail-closed)"})
            break

        content = resp["content"]
        specs, tools = parse_blocks(content)
        fb = {"attempt": attempts, "tools": len(tools), "specs": len(specs)}
        msgs_feedback = []

        if tools:
            if group == "experiment":
                for tq in tools:
                    if not tq.get("tool"):
                        bridge_log.append({"attempt": attempts, "error": "parse_error", "raw": tq.get("parse_error")})
                        msgs_feedback.append("[tool parse error] " + str(tq.get("parse_error", "")))
                        continue
                    res, dt = run_bridge_query(tq, os.path.join(workspace, "spec.json"), runs_dir)
                    bridge_log.append({"attempt": attempts, "query": tq, "result": res, "elapsed": dt})
                    msgs_feedback.append("## TOOL RESULT " + json.dumps(res, ensure_ascii=False)[:3000])
            else:
                bridge_log.append({"attempt": attempts, "query": tools, "rejected": "tools_not_available_for_baseline"})
                msgs_feedback.append("[tools not available in this run — baseline group has no future-ui toolchain]")

        if specs:
            spec_delivered = True
            try:
                final_spec = json.loads(specs[-1])
                with io.open(os.path.join(workspace, "spec.json"), "w", encoding="utf-8") as f:
                    json.dump(final_spec, f, ensure_ascii=False, indent=2)
                msgs_feedback.append("[spec.json updated from your ## SPEC block]")
            except ValueError as e:
                msgs_feedback.append("[SPEC block was not valid JSON: {0} — not written]".format(e))
                spec_delivered = False

        # 反馈：运行同一 feedback 测试
        fr = run_feedback(task, group, workspace, runs_dir)
        fb.update({"feedback": {"passed": fr["passed"], "rc": fr["rc"], "elapsed": fr["elapsed"]}})
        feedback_log.append(fb)

        if fr["passed"] and spec_delivered:
            msgs_feedback.append("FEEDBACK: all checks passed — you are done.")
            messages.append({"role": "assistant", "content": content})
            messages.append({"role": "user", "content": "\n".join(msgs_feedback)})
            break

        if not msgs_feedback:
            msgs_feedback.append("[no ## SPEC or ## TOOL block detected — deliver via ## SPEC]")
        msgs_feedback.append("FEEDBACK (attempt {0}/{1}):\n{2}".format(attempts, attempts_max, fr["tail"]))
        messages.append({"role": "assistant", "content": content})
        messages.append({"role": "user", "content": "\n".join(msgs_feedback)})

    # 最终判定：组中立隐藏 evaluator
    verdict, ev_dt = run_evaluator(task, workspace, runs_dir)

    entry = {
        "taskId": task_id, "family": family, "seed": seed, "group": group,
        "order": "seed-derived",
        "subjectSha": subject_sha, "harnessSha": harness_sha,
        "attempts": attempts, "specDelivered": spec_delivered,
        "usage": usage, "cost": round(cost, 6),
        "elapsed": round(time.time() - t0, 2),
        "feedbackLog": feedback_log, "bridgeCalls": bridge_log,
        "finalEval": {"pass": bool(verdict.get("pass")), "summary": verdict.get("summary"),
                      "elapsed": ev_dt},
        "failureCategory": "none" if verdict.get("pass") else status if status != "done" else "task_failed",
        "status": status,
        "evalError": verdict.get("error"),
    }
    ledger.append(entry)
    return entry
