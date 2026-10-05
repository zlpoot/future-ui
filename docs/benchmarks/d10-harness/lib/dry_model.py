# -*- coding: utf-8 -*-
"""d10-harness · dry_model.py — 干跑 fake model（无真实调用）。

提供每个任务的「正确修复」参考 spec（golden 目标态），供自检验证 evaluator 判别力，
并作为可审阅的参考答案。响应模拟协议：实验组第 1 次尝试输出一个 ## TOOL preview，
第 2 次输出 ## SPEC 最终 spec；基线组第 1 次直接输出 ## SPEC。
"""
import json

FIXED_SPECS = {
    "cal-t1-001": {"components": [
        {"id": "submit", "type": "button", "label": "提交", "props": {"type": "button"}},
        {"id": "filter", "type": "select", "props": {
            "options": [{"label": "已启用", "value": "enabled"}, {"label": "已禁用", "value": "disabled"}],
            "placeholder": "请选择"}},
    ]},
    "cal-t1-002": {"components": [
        {"id": "save", "type": "button", "label": "保存", "props": {"loading": True}},
        {"id": "status", "type": "select", "props": {
            "options": [{"label": "未保存", "value": "unsaved"}, {"label": "已保存", "value": "saved"}],
            "placeholder": "请选择状态", "defaultValue": "unsaved"}},
    ]},
    "cal-t1-003": {"components": [
        {"id": "name", "type": "textinput", "props": {"value": "张三", "placeholder": "请输入名称", "name": "名称"}},
        {"id": "submit", "type": "button", "label": "提交", "props": {}},
        {"id": "cat", "type": "select", "props": {
            "options": [{"label": "A", "value": "a"}, {"label": "B", "value": "b"}], "defaultValue": "b"}},
    ]},
    "cal-t2-001": {"components": [
        {"id": "filter", "type": "select", "props": {
            "options": [{"label": "已启用", "value": "enabled"}, {"label": "已禁用", "value": "disabled"}],
            "placeholder": "请选择", "defaultValue": "enabled"}},
    ]},
    "cal-t2-002": {"components": [
        {"id": "submit", "type": "button", "label": "提交", "props": {"type": "submit"}},
    ]},
    "cal-t2-003": {"components": [
        {"id": "filter", "type": "select", "props": {
            "options": [{"label": "A", "value": "a"}, {"label": "B", "value": "b"}],
            "placeholder": "请选择", "defaultValue": "a"}},
    ]},
    "cal-t3-001": {"components": [
        {"id": "submit", "type": "button", "label": "提交", "props": {"type": "button"}},
        {"id": "filter", "type": "select", "props": {
            "options": [{"label": "全部", "value": ""}, {"label": "已启用", "value": "enabled"}, {"label": "已禁用", "value": "disabled"}],
            "defaultValue": "disabled"}},
    ]},
    "cal-t3-002": {"components": [
        {"id": "submit", "type": "button", "label": "保存", "props": {"type": "button"}},
        {"id": "filter", "type": "select", "props": {
            "options": [{"label": "全部", "value": ""}, {"label": "已启用", "value": "enabled"}, {"label": "已禁用", "value": "disabled"}],
            "defaultValue": "enabled"}},
    ]},
    "cal-t3-003": {"components": [
        {"id": "submit", "type": "button", "label": "提交", "props": {"type": "button"}},
        {"id": "filter", "type": "select", "props": {
            "options": [{"label": "已启用", "value": "enabled"}, {"label": "已禁用", "value": "disabled"}],
            "placeholder": "选择筛选条件", "defaultValue": "enabled"}},
    ]},
    "cal-t4-001": {"components": [
        {"id": "submit", "type": "button", "label": "提交", "props": {"type": "submit"}},
    ]},
    "cal-t4-002": {"components": [
        {"id": "filter", "type": "select", "props": {
            "options": [{"label": "A", "value": "a"}, {"label": "B", "value": "b"}],
            "placeholder": "请选择", "defaultValue": "b"}},
    ]},
    "cal-t4-003": {"components": [
        {"id": "filter", "type": "select", "props": {
            "options": [{"label": "A", "value": "a"}, {"label": "B", "value": "b"}],
            "placeholder": "请选择", "defaultValue": "a"}},
    ]},
}


class DryModel:
    def __init__(self, spec_provider=None, emit_tool_for_experiment=True):
        self.spec_provider = spec_provider or (lambda: {})
        self.emit_tool_for_experiment = emit_tool_for_experiment

    def __call__(self, messages, group, attempt):
        # 从 messages[1]（user 首条）里取不到 taskId，改为由调用方通过 provider 闭包携带
        content = ""
        if group == "experiment" and attempt == 1 and self.emit_tool_for_experiment:
            content = "## TOOL {\"tool\":\"preview\",\"args\":{\"componentId\":\"button\",\"props\":{\"disabled\":true}}}\n"
        else:
            spec = self.spec_provider()
            content = "## SPEC\n" + json.dumps(spec, ensure_ascii=False, indent=2) + "\n"
        usage = {"prompt_tokens": 500, "completion_tokens": 400,
                 "prompt_tokens_details": {"cached_tokens": 100}}
        cost = (400 * 500 + 100 * 250 + 400 * 1500) / 1_000_000.0
        # 与 relay 归一化一致：usage = {prompt, completion, cached, total}
        return {"content": content,
                "usage": {"prompt": 500, "completion": 400, "cached": 100, "total": 900},
                "cost": round(cost, 8), "elapsed": 0.01}
