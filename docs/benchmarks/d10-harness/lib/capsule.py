# -*- coding: utf-8 -*-
"""d10-harness · capsule.py — 任务胶囊与 fresh workspace 构建。

公平性硬规则（负责人 Review 关注面）：
- 任务胶囊 = tasks/<taskId>.json（不可变，read-only 源）+ golden/<taskId>.json（不可变，不进 workspace）；
- 每个 paired task 从同一胶囊生成两个 fresh workspace（baseline / experiment），互不共享；
- workspace 内容两组完全一致：README.md（任务文本）、spec.json（初始状态）、render.js（canonical 副本）、app.test.js（反馈测试正文）、package.json；
- workspace 内**不含** future-ui 任何内容（无包、无文档、无工具桥）；实验组工具桥由 runner 侧注入，不进 workspace；
- A/B 顺序由 seed 派生并记录：seed 偶 → baseline 先跑；奇 → experiment 先跑。
"""
import io, json, os, shutil

HERE = os.path.dirname(os.path.abspath(__file__))
HARNESS = os.path.dirname(HERE)  # d10-harness
LIB = HERE
RENDER_SRC = os.path.join(LIB, "render.js")
TASKS_DIR = os.path.join(HARNESS, "tasks")
GOLDEN_DIR = os.path.join(HARNESS, "golden")
PKG_JSON = '{\n  "name": "cal-task-workspace",\n  "private": true,\n  "type": "module"\n}\n'

GROUPS = ("baseline", "experiment")


def task_path(task_id):
    return os.path.join(TASKS_DIR, task_id + ".json")


def golden_path(task_id):
    return os.path.join(GOLDEN_DIR, task_id + ".json")


def load_task(task_id):
    with io.open(task_path(task_id), encoding="utf-8") as f:
        return json.load(f)


def load_golden(task_id):
    with io.open(golden_path(task_id), encoding="utf-8") as f:
        return json.load(f)


def ab_order(seed):
    """seed 派生 A/B 顺序（确定性，预注册口径）。"""
    return "baseline_first" if seed % 2 == 0 else "experiment_first"


def _feedback_test_file(task):
    """workspace app.test.js（相对导入，供模型阅读）。"""
    body = task["feedbackBody"]
    return (
        "// @vitest-environment jsdom\n"
        "// 本文件是你的验证脚手架（runner 会以同一断言生成可执行反馈测试）。\n"
        "import { describe, it, expect, beforeAll } from 'vitest';\n"
        "import { render } from './render.js';\n"
        "import spec from './spec.json';\n"
        "let container;\n"
        "beforeAll(() => { container = document.createElement('div'); document.body.appendChild(container); render(spec, container); });\n"
        "describe('feedback', () => {\n" + body + "\n});\n"
    )


def build_workspace(task, run_dir):
    """为给定 task 创建两组 fresh workspace，返回 {group: workspace_dir}。"""
    task_id = task["taskId"]
    workspaces = {}
    for group in GROUPS:
        ws = os.path.join(run_dir, task_id, group, "workspace")
        if os.path.exists(ws):
            shutil.rmtree(ws)
        os.makedirs(ws)
        with io.open(os.path.join(ws, "README.md"), "w", encoding="utf-8") as f:
            f.write("# 任务\n\n" + task["taskText"] + "\n\n## 工作方式\n\n"
                    "- 你**只编辑 spec.json**（声明式控件配置；components 数组描述控件）。\n"
                    "- 渲染语义见 render.js 注释；验证脚手架见 app.test.js。\n")
        with io.open(os.path.join(ws, "spec.json"), "w", encoding="utf-8") as f:
            json.dump(task["initialSpec"], f, ensure_ascii=False, indent=2)
        with io.open(os.path.join(ws, "render.js"), "w", encoding="utf-8") as f:
            f.write(io.open(RENDER_SRC, encoding="utf-8").read())
        with io.open(os.path.join(ws, "app.test.js"), "w", encoding="utf-8") as f:
            f.write(_feedback_test_file(task))
        with io.open(os.path.join(ws, "package.json"), "w", encoding="utf-8") as f:
            f.write(PKG_JSON)
        workspaces[group] = ws
    return workspaces
