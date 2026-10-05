# -*- coding: utf-8 -*-
"""d10-harness · 任务定义单一事实源。

生成 tasks/cal-*.json（任务胶囊定义）与 golden/cal-*.json（隐藏判定断言）。
设计约束（负责人 Review 关注面）：
- 任务文本为公共措辞：行为描述、显式语义要求，不出现任何 future-ui 工具名/提示；
- 可测面严格限制在现有真实能力：button/select 的 preview/test 可测交互；
  T1-003 含 textinput，但只由统一隐藏 evaluator 判定（ui.test 不假装支持它）；
- 全部为 config 级（spec.json 声明式数据），TypeScript 无法提前截获；
- golden 为组中立行为断言，两组同判据。
"""
import json, io, os

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # d10-harness（tasks.py 位于 tasks/ 子目录）
TASKS_DIR = os.path.join(HERE, "tasks")
GOLDEN_DIR = os.path.join(HERE, "golden")
os.makedirs(TASKS_DIR, exist_ok=True)
os.makedirs(GOLDEN_DIR, exist_ok=True)

# ---------------- T1 创建合法 UI ----------------
T1 = {}

T1["cal-t1-001"] = {
    "seed": 1001,
    "taskText": (
        "根据以下需求实现一个页面（编辑 spec.json，components 描述控件）：\n"
        "1. 渲染一个「提交」按钮（type=button）；\n"
        "2. 渲染一个筛选下拉框：选项「已启用/已禁用」（值分别为 enabled/disabled），"
        "占位文案「请选择」，默认不选中任何值。\n"
        "交互语义：按钮可点击（点击产生 click 事件）；下拉框切换选项产生 change 事件。\n"
        "产物：仅编辑 spec.json。"
    ),
    "initialSpec": {"components": []},
    "feedbackBody": (
        "it('renders button and select per requirements', () => {\n"
        "  const btn = container.querySelector('button[data-part=root]');\n"
        "  expect(btn).toBeTruthy(); expect(btn.textContent).toBe('提交');\n"
        "  expect(btn.disabled).toBe(false);\n"
        "  const sel = container.querySelector('select[data-part=root]');\n"
        "  expect(sel).toBeTruthy();\n"
        "  const opts = Array.from(sel.options).map(o => o.value + ':' + o.textContent);\n"
        "  expect(opts).toContain(':请选择'); expect(opts).toContain('enabled:已启用'); expect(opts).toContain('disabled:已禁用');\n"
        "});\n"
        "it('button click fires and select change fires', () => {\n"
        "  const btn = container.querySelector('button[data-part=root]');\n"
        "  let clicked = false; btn.addEventListener('click', () => { clicked = true; });\n"
        "  btn.click(); expect(clicked).toBe(true);\n"
        "  const sel = container.querySelector('select[data-part=root]');\n"
        "  let changed = null; sel.addEventListener('change', () => { changed = sel.value; });\n"
        "  sel.value = 'disabled'; sel.dispatchEvent(new Event('change', { bubbles: true }));\n"
        "  expect(changed).toBe('disabled');\n"
        "});"
    ),
}

T1["cal-t1-002"] = {
    "seed": 1002,
    "taskText": (
        "根据以下需求实现一个页面（编辑 spec.json）：\n"
        "1. 渲染一个「保存」按钮；\n"
        "2. 渲染一个「状态」下拉框：选项「未保存/已保存」（值 unsaved/saved），"
        "占位文案「请选择状态」，默认选中「未保存」。\n"
        "按钮要求：处于 loading 状态——应呈现为禁用并带 aria-busy 提示，loading 时点击不产生任何事件。\n"
        "下拉框要求：可正常切换选项并产生 change 事件。\n"
        "产物：仅编辑 spec.json。"
    ),
    "initialSpec": {"components": []},
    "feedbackBody": (
        "it('renders loading button and working select', () => {\n"
        "  const btn = container.querySelector('button[data-part=root]');\n"
        "  expect(btn).toBeTruthy(); expect(btn.textContent).toBe('保存');\n"
        "  expect(btn.disabled).toBe(true); expect(btn.getAttribute('aria-busy')).toBe('true');\n"
        "  const sel = container.querySelector('select[data-part=root]');\n"
        "  expect(sel).toBeTruthy(); expect(sel.value).toBe('unsaved');\n"
        "});\n"
        "it('loading button click does not fire; select change fires', () => {\n"
        "  const btn = container.querySelector('button[data-part=root]');\n"
        "  let clicked = false; btn.addEventListener('click', () => { clicked = true; });\n"
        "  btn.click(); expect(clicked).toBe(false);\n"
        "  const sel = container.querySelector('select[data-part=root]');\n"
        "  let changed = null; sel.addEventListener('change', () => { changed = sel.value; });\n"
        "  sel.value = 'saved'; sel.dispatchEvent(new Event('change', { bubbles: true }));\n"
        "  expect(changed).toBe('saved');\n"
        "});"
    ),
}

T1["cal-t1-003"] = {
    "seed": 1003,
    "taskText": (
        "根据以下需求实现一个页面（编辑 spec.json）：\n"
        "1. 渲染一个名称输入框：占位文案「请输入名称」，默认值「张三」，aria-label 为「名称」；\n"
        "2. 渲染一个「提交」按钮（可点击，点击产生 click 事件）；\n"
        "3. 渲染一个类别下拉框：选项 A/B（值 a/b），默认选中 B。\n"
        "产物：仅编辑 spec.json。"
    ),
    "initialSpec": {"components": []},
    "feedbackBody": (
        "it('renders input, button and select', () => {\n"
        "  const input = container.querySelector('input[data-part=root]');\n"
        "  expect(input).toBeTruthy(); expect(input.placeholder).toBe('请输入名称');\n"
        "  expect(input.value).toBe('张三'); expect(input.getAttribute('aria-label')).toBe('名称');\n"
        "  const btn = container.querySelector('button[data-part=root]');\n"
        "  expect(btn).toBeTruthy(); expect(btn.textContent).toBe('提交');\n"
        "  const sel = container.querySelector('select[data-part=root]');\n"
        "  expect(sel).toBeTruthy(); expect(sel.value).toBe('b');\n"
        "});\n"
        "it('button click fires and select change fires', () => {\n"
        "  const btn = container.querySelector('button[data-part=root]');\n"
        "  let clicked = false; btn.addEventListener('click', () => { clicked = true; });\n"
        "  btn.click(); expect(clicked).toBe(true);\n"
        "  const sel = container.querySelector('select[data-part=root]');\n"
        "  let changed = null; sel.addEventListener('change', () => { changed = sel.value; });\n"
        "  sel.value = 'a'; sel.dispatchEvent(new Event('change', { bubbles: true }));\n"
        "  expect(changed).toBe('a');\n"
        "});"
    ),
}

# ---------------- T2 修复无效组合 ----------------
T2 = {}

T2["cal-t2-001"] = {
    "seed": 1004,
    "taskText": (
        "页面应渲染一个筛选下拉框：占位「请选择」，选项「已启用/已禁用」（值分别为 enabled/disabled），"
        "且默认选中「已启用」。\n"
        "当前 spec.json 渲染不正确（下拉框选项异常、默认值不生效），请修复 spec.json 使页面完全符合描述。\n"
        "产物：仅编辑 spec.json。"
    ),
    "initialSpec": {"components": [
        {"id": "filter", "type": "select", "props": {
            "options": [{"label": "已启用"}, {"label": "已禁用"}],
            "placeholder": "请选择", "defaultValue": "enabled"}},
    ]},
    "feedbackBody": (
        "it('options carry values and default applies', () => {\n"
        "  const sel = container.querySelector('select[data-part=root]');\n"
        "  expect(sel).toBeTruthy();\n"
        "  const opts = Array.from(sel.options).map(o => o.value + ':' + o.textContent);\n"
        "  expect(opts).toContain('enabled:已启用'); expect(opts).toContain('disabled:已禁用');\n"
        "  expect(sel.value).toBe('enabled');\n"
        "});\n"
        "it('select change fires', () => {\n"
        "  const sel = container.querySelector('select[data-part=root]');\n"
        "  let changed = null; sel.addEventListener('change', () => { changed = sel.value; });\n"
        "  sel.value = 'disabled'; sel.dispatchEvent(new Event('change', { bubbles: true }));\n"
        "  expect(changed).toBe('disabled');\n"
        "});"
    ),
}

T2["cal-t2-002"] = {
    "seed": 1005,
    "taskText": (
        "页面应渲染一个「提交」按钮：type=submit、可点击（点击产生 click 事件）、无 loading、无禁用。\n"
        "当前 spec.json 渲染不正确（按钮不可点击、状态异常），请修复 spec.json 使页面完全符合描述。\n"
        "产物：仅编辑 spec.json。"
    ),
    "initialSpec": {"components": [
        {"id": "submit", "type": "button", "label": "提交", "props": {"type": "bogus", "disabled": True, "loading": True}},
    ]},
    "feedbackBody": (
        "it('button is submit-typed and clickable', () => {\n"
        "  const btn = container.querySelector('button[data-part=root]');\n"
        "  expect(btn).toBeTruthy(); expect(btn.type).toBe('submit');\n"
        "  expect(btn.disabled).toBe(false); expect(btn.getAttribute('aria-busy')).toBeNull();\n"
        "  let clicked = false; btn.addEventListener('click', () => { clicked = true; });\n"
        "  btn.click(); expect(clicked).toBe(true);\n"
        "});"
    ),
}

T2["cal-t2-003"] = {
    "seed": 1006,
    "taskText": (
        "页面应渲染一个类别下拉框：选项 A/B（值 a/b，不得重复），占位「请选择」，默认选中「A」，"
        "且可正常切换（切换产生 change 事件）。\n"
        "当前 spec.json 渲染不正确（默认值不生效、切换无效果、选项异常），请修复 spec.json 使页面完全符合描述。\n"
        "产物：仅编辑 spec.json。"
    ),
    "initialSpec": {"components": [
        {"id": "filter", "type": "select", "props": {
            "options": [{"label": "A", "value": "a"}, {"label": "B", "value": "b"}, {"label": "B", "value": "b"}],
            "defaultValue": "z", "placeholder": "请选择", "disabled": True}},
    ]},
    "feedbackBody": (
        "it('unique options, default A, select enabled', () => {\n"
        "  const sel = container.querySelector('select[data-part=root]');\n"
        "  expect(sel).toBeTruthy(); expect(sel.disabled).toBe(false);\n"
        "  expect(sel.value).toBe('a');\n"
        "  const bCount = Array.from(sel.options).filter(o => o.value === 'b').length;\n"
        "  expect(bCount).toBe(1);\n"
        "});\n"
        "it('select change fires', () => {\n"
        "  const sel = container.querySelector('select[data-part=root]');\n"
        "  let changed = null; sel.addEventListener('change', () => { changed = sel.value; });\n"
        "  sel.value = 'b'; sel.dispatchEvent(new Event('change', { bubbles: true }));\n"
        "  expect(changed).toBe('b');\n"
        "});"
    ),
}

# ---------------- T3 局部修改不伤及他处 ----------------
T3 = {}

_T3_SELECT = {
    "id": "filter", "type": "select", "props": {
        "options": [{"label": "全部", "value": ""}, {"label": "已启用", "value": "enabled"}, {"label": "已禁用", "value": "disabled"}],
        "defaultValue": "enabled"}}
_T3_BUTTON = {"id": "submit", "type": "button", "label": "提交", "props": {"type": "button"}}

T3["cal-t3-001"] = {
    "seed": 1007,
    "taskText": (
        "页面已正常工作。现要求：把下拉框的默认选中值从「已启用」改为「已禁用」。\n"
        "除此之外，按钮文案、选项集合、占位、交互行为都必须保持原样。\n"
        "产物：仅编辑 spec.json。"
    ),
    "initialSpec": {"components": [_T3_BUTTON, _T3_SELECT]},
    "feedbackBody": (
        "it('default selection changed to disabled', () => {\n"
        "  const sel = container.querySelector('select[data-part=root]');\n"
        "  expect(sel.value).toBe('disabled');\n"
        "});\n"
        "it('regression: button and options unchanged, interactions work', () => {\n"
        "  const btn = container.querySelector('button[data-part=root]');\n"
        "  expect(btn.textContent).toBe('提交');\n"
        "  let clicked = false; btn.addEventListener('click', () => { clicked = true; });\n"
        "  btn.click(); expect(clicked).toBe(true);\n"
        "  const sel = container.querySelector('select[data-part=root]');\n"
        "  expect(Array.from(sel.options).length).toBe(3);\n"
        "  let changed = null; sel.addEventListener('change', () => { changed = sel.value; });\n"
        "  sel.value = 'enabled'; sel.dispatchEvent(new Event('change', { bubbles: true }));\n"
        "  expect(changed).toBe('enabled');\n"
        "});"
    ),
}

T3["cal-t3-002"] = {
    "seed": 1008,
    "taskText": (
        "页面已正常工作。现要求：把按钮文案从「提交」改为「保存」。\n"
        "除此之外，下拉框选项/默认值/占位、按钮 type 与交互行为都必须保持原样。\n"
        "产物：仅编辑 spec.json。"
    ),
    "initialSpec": {"components": [_T3_BUTTON, _T3_SELECT]},
    "feedbackBody": (
        "it('button text changed to save', () => {\n"
        "  const btn = container.querySelector('button[data-part=root]');\n"
        "  expect(btn.textContent).toBe('保存'); expect(btn.type).toBe('button');\n"
        "});\n"
        "it('regression: select unchanged and interactions work', () => {\n"
        "  const sel = container.querySelector('select[data-part=root]');\n"
        "  expect(sel.value).toBe('enabled');\n"
        "  expect(Array.from(sel.options).length).toBe(3);\n"
        "  let changed = null; sel.addEventListener('change', () => { changed = sel.value; });\n"
        "  sel.value = 'disabled'; sel.dispatchEvent(new Event('change', { bubbles: true }));\n"
        "  expect(changed).toBe('disabled');\n"
        "});"
    ),
}

T3["cal-t3-003"] = {
    "seed": 1009,
    "taskText": (
        "页面已正常工作。现要求：把下拉框占位文案从「请选择」改为「选择筛选条件」。\n"
        "除此之外，选项集合、默认选中值、按钮与交互行为都必须保持原样。\n"
        "产物：仅编辑 spec.json。"
    ),
    "initialSpec": {"components": [
        {"id": "submit", "type": "button", "label": "提交", "props": {"type": "button"}},
        {"id": "filter", "type": "select", "props": {
            "options": [{"label": "已启用", "value": "enabled"}, {"label": "已禁用", "value": "disabled"}],
            "placeholder": "请选择", "defaultValue": "enabled"}},
    ]},
    "feedbackBody": (
        "it('placeholder changed', () => {\n"
        "  const sel = container.querySelector('select[data-part=root]');\n"
        "  expect(sel.options[0].textContent).toBe('选择筛选条件');\n"
        "});\n"
        "it('regression: options/default/interactions unchanged', () => {\n"
        "  const sel = container.querySelector('select[data-part=root]');\n"
        "  expect(sel.value).toBe('enabled');\n"
        "  expect(Array.from(sel.options).length).toBe(3);\n"
        "  let changed = null; sel.addEventListener('change', () => { changed = sel.value; });\n"
        "  sel.value = 'disabled'; sel.dispatchEvent(new Event('change', { bubbles: true }));\n"
        "  expect(changed).toBe('disabled');\n"
        "  const btn = container.querySelector('button[data-part=root]');\n"
        "  expect(btn.textContent).toBe('提交');\n"
        "});"
    ),
}

# ---------------- T4 定位交互 bug（行为描述，无工具提示） ----------------
T4 = {}

T4["cal-t4-001"] = {
    "seed": 1010,
    "taskText": (
        "定位并修复这个交互 bug：点击「提交」按钮应该触发提交事件，但现在点击没有任何反应。\n"
        "修复后其余行为不变。\n"
        "产物：仅编辑 spec.json。"
    ),
    "initialSpec": {"components": [
        {"id": "submit", "type": "button", "label": "提交", "props": {"type": "submit", "disabled": True}},
    ]},
    "feedbackBody": (
        "it('button click fires after fix', () => {\n"
        "  const btn = container.querySelector('button[data-part=root]');\n"
        "  expect(btn).toBeTruthy(); expect(btn.disabled).toBe(false);\n"
        "  let clicked = false; btn.addEventListener('click', () => { clicked = true; });\n"
        "  btn.click(); expect(clicked).toBe(true);\n"
        "});"
    ),
}

T4["cal-t4-002"] = {
    "seed": 1011,
    "taskText": (
        "定位并修复这个交互 bug：页面加载时应默认选中「B」，但现在下拉框显示为空白占位。\n"
        "修复后其余行为不变。\n"
        "产物：仅编辑 spec.json。"
    ),
    "initialSpec": {"components": [
        {"id": "filter", "type": "select", "props": {
            "options": [{"label": "A", "value": "a"}, {"label": "B", "value": "B"}],
            "defaultValue": "b", "placeholder": "请选择"}},
    ]},
    "feedbackBody": (
        "it('default B applies after fix', () => {\n"
        "  const sel = container.querySelector('select[data-part=root]');\n"
        "  expect(sel).toBeTruthy(); expect(sel.value).toBe('b');\n"
        "});\n"
        "it('change still works', () => {\n"
        "  const sel = container.querySelector('select[data-part=root]');\n"
        "  let changed = null; sel.addEventListener('change', () => { changed = sel.value; });\n"
        "  sel.value = 'a'; sel.dispatchEvent(new Event('change', { bubbles: true }));\n"
        "  expect(changed).toBe('a');\n"
        "});"
    ),
}

T4["cal-t4-003"] = {
    "seed": 1012,
    "taskText": (
        "定位并修复这个交互 bug：切换下拉框选项没有任何效果（选择「B」后应触发变更并选中 B）。\n"
        "修复后其余行为不变。\n"
        "产物：仅编辑 spec.json。"
    ),
    "initialSpec": {"components": [
        {"id": "filter", "type": "select", "props": {
            "options": [{"label": "A", "value": "a"}, {"label": "B", "value": "b"}],
            "defaultValue": "a", "placeholder": "请选择", "disabled": True}},
    ]},
    "feedbackBody": (
        "it('select is enabled after fix', () => {\n"
        "  const sel = container.querySelector('select[data-part=root]');\n"
        "  expect(sel.disabled).toBe(false); expect(sel.value).toBe('a');\n"
        "});\n"
        "it('change fires and selects B', () => {\n"
        "  const sel = container.querySelector('select[data-part=root]');\n"
        "  let changed = null; sel.addEventListener('change', () => { changed = sel.value; });\n"
        "  sel.value = 'b'; sel.dispatchEvent(new Event('change', { bubbles: true }));\n"
        "  expect(changed).toBe('b');\n"
        "});"
    ),
}

# ---------------- Golden 断言 ----------------
GOLDENS = {}

def S(path, expect):
    return {"id": path + ":" + (expect.get("text") or expect.get("tag") or "s"), "type": "structure", "path": path, "expect": expect}

def I(cid, action, expect):
    return {"id": "i-" + cid, "type": "interaction", "action": action, "expect": expect}

# T1-001
GOLDENS["cal-t1-001"] = [
    S("/button[0]", {"tag": "button", "part": "root", "text": "提交", "attrs": {"type": "button", "disabled": None, "aria-busy": None}}),
    S("/select[0]", {"tag": "select", "part": "root", "attrs": {"disabled": None}}),
    S("/select[0]/option[0]", {"tag": "option", "text": "请选择", "attrs": {"value": ""}}),
    S("/select[0]/option[1]", {"tag": "option", "text": "已启用", "attrs": {"value": "enabled"}}),
    S("/select[0]/option[2]", {"tag": "option", "text": "已禁用", "attrs": {"value": "disabled"}}),
    I("btn", {"kind": "click", "target": "/button[0]"}, {"event": "click"}),
    I("sel", {"kind": "change", "target": "/select[0]", "value": "disabled"}, {"event": "change", "state": {"value": "disabled"}}),
]
# T1-002
GOLDENS["cal-t1-002"] = [
    S("/button[0]", {"tag": "button", "part": "root", "text": "保存", "attrs": {"type": "button", "disabled": "", "aria-busy": "true"}}),
    I("btn-loading", {"kind": "click", "target": "/button[0]"}, {"event": None}),
    S("/select[0]", {"tag": "select", "part": "root", "attrs": {"disabled": None}}),
    S("/select[0]/option[0]", {"tag": "option", "text": "请选择状态", "attrs": {"value": ""}}),
    S("/select[0]/option[1]", {"tag": "option", "text": "未保存", "attrs": {"value": "unsaved"}}),
    S("/select[0]/option[2]", {"tag": "option", "text": "已保存", "attrs": {"value": "saved"}}),
    {"id": "select-default", "type": "state", "path": "/select[0]", "state": {"value": "unsaved"}},
    I("sel", {"kind": "change", "target": "/select[0]", "value": "saved"}, {"event": "change", "state": {"value": "saved"}}),
]
# T1-003
GOLDENS["cal-t1-003"] = [
    S("/input[0]", {"tag": "input", "part": "root", "attrs": {"placeholder": "请输入名称", "aria-label": "名称", "disabled": None}}),
    {"id": "input-value", "type": "state", "path": "/input[0]", "state": {"value": "张三"}},
    S("/button[0]", {"tag": "button", "part": "root", "text": "提交", "attrs": {"disabled": None}}),
    I("btn", {"kind": "click", "target": "/button[0]"}, {"event": "click"}),
    S("/select[0]", {"tag": "select", "part": "root"}),
    {"id": "select-default", "type": "state", "path": "/select[0]", "state": {"value": "b"}},
    S("/select[0]/option[1]", {"tag": "option", "text": "B", "attrs": {"value": "b"}}),
    I("sel", {"kind": "change", "target": "/select[0]", "value": "a"}, {"event": "change", "state": {"value": "a"}}),
]
# T2-001
GOLDENS["cal-t2-001"] = [
    S("/select[0]", {"tag": "select", "part": "root"}),
    S("/select[0]/option[1]", {"tag": "option", "text": "已启用", "attrs": {"value": "enabled"}}),
    S("/select[0]/option[2]", {"tag": "option", "text": "已禁用", "attrs": {"value": "disabled"}}),
    {"id": "default-applied", "type": "state", "path": "/select[0]", "state": {"value": "enabled"}},
    I("default", {"kind": "change", "target": "/select[0]", "value": "enabled"}, {"event": "change", "state": {"value": "enabled"}}),
]
# T2-002
GOLDENS["cal-t2-002"] = [
    S("/button[0]", {"tag": "button", "part": "root", "text": "提交", "attrs": {"type": "submit", "disabled": None, "aria-busy": None}}),
    I("btn", {"kind": "click", "target": "/button[0]"}, {"event": "click"}),
]
# T2-003
GOLDENS["cal-t2-003"] = [
    S("/select[0]", {"tag": "select", "part": "root", "attrs": {"disabled": None}}),
    S("/select[0]/option[1]", {"tag": "option", "text": "A", "attrs": {"value": "a"}}),
    S("/select[0]/option[2]", {"tag": "option", "text": "B", "attrs": {"value": "b"}}),
    S("/select[0]/option[3]", {"absent": True}),
    {"id": "default-a", "type": "state", "path": "/select[0]", "state": {"value": "a"}},
    I("default", {"kind": "change", "target": "/select[0]", "value": "a"}, {"event": "change", "state": {"value": "a"}}),
    I("switch", {"kind": "change", "target": "/select[0]", "value": "b"}, {"event": "change", "state": {"value": "b"}}),
]
# T3-001
GOLDENS["cal-t3-001"] = [
    S("/button[0]", {"tag": "button", "part": "root", "text": "提交", "attrs": {"type": "button", "disabled": None}}),
    I("btn", {"kind": "click", "target": "/button[0]"}, {"event": "click"}),
    S("/select[0]/option[0]", {"tag": "option", "text": "全部", "attrs": {"value": ""}}),
    S("/select[0]/option[1]", {"tag": "option", "text": "已启用", "attrs": {"value": "enabled"}}),
    S("/select[0]/option[2]", {"tag": "option", "text": "已禁用", "attrs": {"value": "disabled"}}),
    {"id": "default-changed", "type": "state", "path": "/select[0]", "state": {"value": "disabled"}},
    I("changed-default", {"kind": "change", "target": "/select[0]", "value": "disabled"}, {"event": "change", "state": {"value": "disabled"}}),
]
# T3-002
GOLDENS["cal-t3-002"] = [
    S("/button[0]", {"tag": "button", "part": "root", "text": "保存", "attrs": {"type": "button", "disabled": None}}),
    I("btn", {"kind": "click", "target": "/button[0]"}, {"event": "click"}),
    S("/select[0]", {"tag": "select", "part": "root"}),
    {"id": "default-unchanged", "type": "state", "path": "/select[0]", "state": {"value": "enabled"}},
    S("/select[0]/option[0]", {"tag": "option", "text": "全部", "attrs": {"value": ""}}),
    S("/select[0]/option[1]", {"tag": "option", "text": "已启用", "attrs": {"value": "enabled"}}),
    S("/select[0]/option[2]", {"tag": "option", "text": "已禁用", "attrs": {"value": "disabled"}}),
    I("sel", {"kind": "change", "target": "/select[0]", "value": "disabled"}, {"event": "change", "state": {"value": "disabled"}}),
]
# T3-003
GOLDENS["cal-t3-003"] = [
    S("/select[0]/option[0]", {"tag": "option", "text": "选择筛选条件", "attrs": {"value": ""}}),
    S("/select[0]/option[1]", {"tag": "option", "text": "已启用", "attrs": {"value": "enabled"}}),
    S("/select[0]/option[2]", {"tag": "option", "text": "已禁用", "attrs": {"value": "disabled"}}),
    {"id": "default-unchanged", "type": "state", "path": "/select[0]", "state": {"value": "enabled"}},
    I("sel", {"kind": "change", "target": "/select[0]", "value": "disabled"}, {"event": "change", "state": {"value": "disabled"}}),
    S("/button[0]", {"tag": "button", "part": "root", "text": "提交", "attrs": {"type": "button", "disabled": None}}),
    I("btn", {"kind": "click", "target": "/button[0]"}, {"event": "click"}),
]
# T4-001
GOLDENS["cal-t4-001"] = [
    S("/button[0]", {"tag": "button", "part": "root", "text": "提交", "attrs": {"type": "submit", "disabled": None}}),
    I("btn", {"kind": "click", "target": "/button[0]"}, {"event": "click"}),
]
# T4-002
GOLDENS["cal-t4-002"] = [
    S("/select[0]", {"tag": "select", "part": "root"}),
    S("/select[0]/option[2]", {"tag": "option", "text": "B", "attrs": {"value": "b"}}),
    {"id": "default-b", "type": "state", "path": "/select[0]", "state": {"value": "b"}},
    I("default", {"kind": "change", "target": "/select[0]", "value": "b"}, {"event": "change", "state": {"value": "b"}}),
    I("switch", {"kind": "change", "target": "/select[0]", "value": "a"}, {"event": "change", "state": {"value": "a"}}),
]
# T4-003
GOLDENS["cal-t4-003"] = [
    S("/select[0]", {"tag": "select", "part": "root", "attrs": {"disabled": None}}),
    S("/select[0]/option[2]", {"tag": "option", "text": "B", "attrs": {"value": "b"}}),
    {"id": "default-a", "type": "state", "path": "/select[0]", "state": {"value": "a"}},
    I("sel", {"kind": "change", "target": "/select[0]", "value": "b"}, {"event": "change", "state": {"value": "b"}}),
]

FAMILIES = {"cal-t1-001": "t1", "cal-t1-002": "t1", "cal-t1-003": "t1",
            "cal-t2-001": "t2", "cal-t2-002": "t2", "cal-t2-003": "t2",
            "cal-t3-001": "t3", "cal-t3-002": "t3", "cal-t3-003": "t3",
            "cal-t4-001": "t4", "cal-t4-002": "t4", "cal-t4-003": "t4"}

def main():
    pools = {"t1": T1, "t2": T2, "t3": T3, "t4": T4}
    all_ids = []
    for fam, pool in pools.items():
        for task_id, defn in pool.items():
            assert FAMILIES[task_id] == fam
            assert task_id not in all_ids
            all_ids.append(task_id)
            # task def (含反馈测试正文；starter 由 capsule.py 生成)
            task_def = {
                "taskId": task_id,
                "family": fam,
                "seed": defn["seed"],
                "taskText": defn["taskText"],
                "initialSpec": defn["initialSpec"],
                "feedbackBody": defn["feedbackBody"],
            }
            with io.open(os.path.join(TASKS_DIR, task_id + ".json"), "w", encoding="utf-8") as f:
                json.dump(task_def, f, ensure_ascii=False, indent=2)
            # golden
            golden = {"taskId": task_id, "family": fam, "checks": GOLDENS[task_id]}
            with io.open(os.path.join(GOLDEN_DIR, task_id + ".json"), "w", encoding="utf-8") as f:
                json.dump(golden, f, ensure_ascii=False, indent=2)
    print("generated", len(all_ids), "tasks + goldens:", ", ".join(all_ids))

if __name__ == "__main__":
    main()
