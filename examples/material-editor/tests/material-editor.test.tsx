/**
 * R2-A1 (#96) + R2-A2 (#98) · 定向测试：
 *   1) 交互闭环（jsdom）：预填 → 修改 → 异步保存 → 关闭 → 列表更新，保存中防重复提交；
 *   2) 同源性：UI 字段与 Agent 投影取自同一声明，改 label 双端变化，顺序/Action ref 一致；
 *   3) 注册表 + 工具安全面：显式实例、未注册 scope not-covered、0 capability → 业务工具数 0、
 *      secretNote 不出现在 listInstances；
 *   4) 负例投影：draft value 被 allowlist 拦截（withheld），敏感字段不注册不投影；
 *   5) R2-A2 双主题换肤：Light/Dark 切换只改视觉（data-theme + token），不触发额外
 *      onSave/onOpenChange；Dialog 打开/草稿/pending/aria-busy/焦点/投影均不受影响。
 */
// @vitest-environment jsdom
import { describe, expect, test } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { executeProjectTool } from '@future-ui/ai-dev';
import { createMaterialEditorApp, MaterialEditorPage } from '../src/material-editor.js';
import { createDevAgent } from '../src/dev-agent-entry.js';
import {
  createMaterialEditorContext,
  registerMaterialEditorInstances,
  projectFieldMetadata,
  scopeCoverage,
} from '../src/agent-projection.js';
import {
  MATERIAL_FIELDS,
  MATERIAL_SAVE_ACTION,
  MATERIAL_SCOPE,
  DIALOG_INSTANCE_ID,
  VIRTUAL_MATERIALS,
  materialSaveAction,
  publicFieldMetadata,
  toEditDialogFields,
} from '../src/material-declaration.js';
import { projectSaveAction } from '../src/agent-projection.js';
import type { MaterialFieldDecl } from '../src/material-declaration.js';

describe('R2-A1 素材编辑交互闭环（UI）', () => {
  test('预填→修改→保存中阻止重复提交→保存并关闭→列表更新', async () => {
    render(<MaterialEditorPage />);

    // 列表渲染 3 条虚拟素材
    expect(screen.getByTestId('me-name-m1').textContent).toBe('春日山景.mp4');
    expect(screen.getAllByRole('button', { name: '编辑' })).toHaveLength(3);

    // 打开编辑弹窗（预填）
    fireEvent.click(screen.getByTestId('me-row-m1').querySelector('button')!);
    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy());
    expect(screen.getByDisplayValue('春日山景.mp4')).toBeTruthy();
    expect(screen.getByDisplayValue('8K 航拍镜头，10 秒')).toBeTruthy();
    // 敏感字段 secretNote 允许在 UI 中编辑（业务数据），但绝不进入 Agent 投影
    expect(screen.getByDisplayValue('版权归属：自摄')).toBeTruthy();

    // 修改名称
    fireEvent.change(screen.getByDisplayValue('春日山景.mp4'), { target: { value: '春日山景-改.mp4' } });

    // 保存：pending 状态（disabled + aria-busy），重复点击被忽略
    const saveBtn = screen.getByRole('button', { name: /保存/ });
    fireEvent.click(saveBtn);
    const pendingBtn = await screen.findByRole('button', { name: '保存中…' }, { timeout: 2500 });
    expect((pendingBtn as HTMLButtonElement).disabled).toBe(true);
    expect(pendingBtn.getAttribute('aria-busy')).toBe('true');
    fireEvent.click(pendingBtn); // 防重复提交：无第二个 pending 日志

    // 保存完成：弹窗关闭（reason=save），列表更新（保存为真实异步 1.2s，放宽 waitFor 超时）
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull(), { timeout: 2500 });
    expect(screen.getByTestId('me-name-m1').textContent).toBe('春日山景-改.mp4');
    const logText = screen.getByTestId('me-log').textContent!;
    // 日志只记录保存开始/结束与 Action 引用（与声明同源），不扩散敏感/草稿值
    expect(logText).toContain(`save pending action=${MATERIAL_SAVE_ACTION.ref}`);
    expect(logText).toContain(`saved id=m1 action=${MATERIAL_SAVE_ACTION.ref}`);
    expect(logText).toContain('close reason=save open=false');
    expect(logText).not.toContain('版权归属');
    expect(logText).not.toContain('secretNote');
    expect(logText).not.toContain('displayName');
    const pendingCount = logText.match(/save pending/g)!.length;
    expect(pendingCount).toBe(1);
  });

  test('取消不修改列表', async () => {
    render(<MaterialEditorPage />);
    fireEvent.click(screen.getByTestId('me-row-m2').querySelector('button')!);
    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy());
    fireEvent.change(screen.getByDisplayValue('城市夜景延时.mov'), { target: { value: '不应保存.mov' } });
    fireEvent.click(screen.getByRole('button', { name: '取消' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByTestId('me-name-m2').textContent).toBe('城市夜景延时.mov');
    expect(screen.getByTestId('me-log').textContent).toContain('close reason=cancel open=false');
  });
});

describe('R2-A1 同源性（同一字段表，无第二套副本）', () => {
  test('UI 字段与 Agent 投影的键/标签/顺序/Action ref 取自同一声明', () => {
    const values = VIRTUAL_MATERIALS[0].values;
    const uiFields = toEditDialogFields(MATERIAL_FIELDS, values);
    const agentFields = publicFieldMetadata(MATERIAL_FIELDS);

    // Agent 投影是允许公开的子集（敏感字段被过滤），其键/标签必须与同一声明的 UI 字段一致
    expect(uiFields.map((f) => f.name)).toEqual(['displayName', 'description', 'secretNote']);
    expect(agentFields.map((f) => f.name)).toEqual(['displayName', 'description']);
    for (const af of agentFields) {
      const ui = uiFields.find((f) => f.name === af.name)!;
      expect(ui.label).toBe(af.label);
      expect(af.order).toBe(MATERIAL_FIELDS.find((f) => f.name === af.name)!.order);
    }
    // 顺序与 Action ref 来自声明本身（投影顺序 == 声明的过滤后顺序）
    expect(agentFields.map((f) => f.actionRef)).toEqual(['material/edit#name', 'material/edit#description']);
  });

  test('修改声明中一处 label 后 UI 与投影双端同时变化（同源证明）', () => {
    const changed: readonly MaterialFieldDecl[] = MATERIAL_FIELDS.map((f) =>
      f.name === 'displayName' ? { ...f, label: '素材文件名' } : f,
    );
    const values = VIRTUAL_MATERIALS[0].values;
    const uiLabel = toEditDialogFields(changed, values).find((f) => f.name === 'displayName')!.label;
    const agentLabel = publicFieldMetadata(changed).find((f) => f.name === 'displayName')!.label;
    expect(uiLabel).toBe('素材文件名');
    expect(agentLabel).toBe('素材文件名');
    // 原始声明不受影响（证明变化来自同一数据源而非复制表）
    expect(publicFieldMetadata(MATERIAL_FIELDS).find((f) => f.name === 'displayName')!.label).toBe('素材名称');
  });

  test('字段乱序声明：UI 与投影均按声明 order 稳定排序（排序同源）', () => {
    const shuffled: readonly MaterialFieldDecl[] = [
      MATERIAL_FIELDS[1], // description (order 2)
      MATERIAL_FIELDS[2], // secretNote (order 3)
      MATERIAL_FIELDS[0], // displayName (order 1)
    ];
    const values = VIRTUAL_MATERIALS[0].values;
    const uiNames = toEditDialogFields(shuffled, values).map((f) => f.name);
    expect(uiNames).toEqual(['displayName', 'description', 'secretNote']);
    const agentNames = publicFieldMetadata(shuffled).map((f) => f.name);
    expect(agentNames).toEqual(['displayName', 'description']);
    // 投影输出的 order 与 UI 顺序一致（声明序）
    expect(publicFieldMetadata(shuffled).map((f) => f.order)).toEqual([1, 2]);
  });

  test('保存 Action 引用同一数据源：UI 日志与 Agent 投影共用，改动双端同步', () => {
    // 默认引用：UI（日志）与 Agent（投影）来自同一对象
    expect(projectSaveAction().ref).toBe(MATERIAL_SAVE_ACTION.ref);
    expect(materialSaveAction().ref).toBe(MATERIAL_SAVE_ACTION.ref);
    // 改动引用后双端同步（同一数据源派生；不创建可执行 tool，仅引用/描述）
    const v2 = { ref: 'material/edit#save-v2', label: '保存并关闭' };
    expect(projectSaveAction(v2).ref).toBe('material/edit#save-v2');
    expect(materialSaveAction(v2).ref).toBe('material/edit#save-v2');
    expect(projectSaveAction(v2)).toEqual({ ref: 'material/edit#save-v2', label: '保存并关闭' });
  });
});

describe('R2-A1 注册表 + 只读工具安全面（Node）', () => {
  test('显式注册 dialog + 字段实例；未注册 scope not-covered；0 capability → 业务工具数 0', () => {
    const ctx = createMaterialEditorContext();
    const { dialog, fields } = registerMaterialEditorInstances(ctx, MATERIAL_FIELDS);

    expect(dialog.instanceId).toBe(DIALOG_INSTANCE_ID);
    expect(fields.map((f) => f.instanceId)).toEqual([
      'material/edit-dialog/displayName',
      'material/edit-dialog/description',
    ]);
    // secretNote 敏感字段未注册 → 不出现
    expect(fields.some((f) => f.instanceId.includes('secretNote'))).toBe(false);

    // project.listInstances：只回读实例身份/路径/关系（无值、无敏感字段）
    const listed = executeProjectTool(ctx, 'project.listInstances', {});
    expect(listed.ok).toBe(true);
    const rows = (listed as { ok: true; data: { instances: Array<Record<string, unknown>> } }).data.instances;
    expect(rows).toHaveLength(3);
    expect(rows.every((r) => !JSON.stringify(r).includes('secretNote'))).toBe(true);
    expect(rows.every((r) => !JSON.stringify(r).includes('版权归属'))).toBe(true);
    const dialogRow = rows.find((r) => r.instanceId === DIALOG_INSTANCE_ID)!;
    expect(dialogRow.componentType).toBe('future-ui.dialog');
    expect(dialogRow.relations ?? []).toEqual([]);

    // describeInstance：scope covered + 0 业务工具（无 capabilityBindings / capabilities）
    const described = executeProjectTool(ctx, 'project.describeInstance', { instanceId: DIALOG_INSTANCE_ID });
    expect(described.ok).toBe(true);
    const d = (described as { ok: true; data: { coverage: string; boundCapabilities: string[] } }).data;
    expect(d.coverage).toBe('covered');
    expect(d.boundCapabilities).toEqual([]);

    // 未注册 scope → not-covered（绝不猜测）
    expect(scopeCoverage(ctx.registry, 'material/ghost').coverage).toBe('not-covered');
    expect(scopeCoverage(ctx.registry, MATERIAL_SCOPE).coverage).toBe('covered');

    // catalog：无显式 capability → 业务工具面为空
    const catalog = executeProjectTool(ctx, 'project.catalog', {});
    expect(catalog.ok).toBe(true);
    const cat = (catalog as { ok: true; data: { explicitCapabilities: string[] } }).data;
    expect(cat.explicitCapabilities).toEqual([]);
  });
});

describe('R2-A1 负例：draft 值 / 敏感字段不泄露', () => {
  test('字段实例的窄 allowlist：draft value 一律 withheld，仅元数据投影', () => {
    const ctx = createMaterialEditorContext();
    registerMaterialEditorInstances(ctx, MATERIAL_FIELDS);
    const rawDraft = { displayName: '春日山景-改.mp4', description: '新描述', secretNote: '绝密备注' };
    const display = projectFieldMetadata(ctx.registry, MATERIAL_FIELDS[0], rawDraft);
    // 元数据可投影
    expect(display.projected).toMatchObject({ name: 'displayName', label: '素材名称', order: 1, actionRef: 'material/edit#name' });
    // 草稿值被 allowlist 拦截
    expect(display.projected['value']).toBeUndefined();
    expect(display.withheld).toContain('value');
  });

  test('secretNote 不在任何投影 / 工具输出中；缺失 handler 不构成业务工具', () => {
    const ctx = createMaterialEditorContext();
    registerMaterialEditorInstances(ctx, MATERIAL_FIELDS);

    // 敏感字段不注册：describeInstance 报 not-found（不存在即为不泄露）
    const secret = executeProjectTool(ctx, 'project.describeInstance', { instanceId: 'material/edit-dialog/secretNote' });
    expect(secret.ok).toBe(false);

    // 用原始业务数据跑 projectVisibleState：sensitive 语义之外，未注册实例同样被拒绝投影
    const snap = ctx.registry.projectVisibleState('material/edit-dialog/secretNote', { label: '内部版权备注', value: 'x' });
    expect(snap.projected).toEqual({});
    expect(snap.withheld).toEqual(['label', 'value']);

    // 业务工具数 0：capabilities 为空 + 实例无 capabilityBindings
    const list = executeProjectTool(ctx, 'project.listInstances', {});
    const rows = (list as { ok: true; data: { instances: Array<{ boundCapabilities?: string[] }> } }).data.instances;
    expect(rows.every((r) => (r.boundCapabilities ?? []).length === 0)).toBe(true);
  });
});

describe('R2-A2 双主题换肤（状态保持 + 事件次数）', () => {
  test('切换主题：ThemeProvider 表面与 <html>（Portal 作用域）同步更新 data-theme + token', () => {
    render(<MaterialEditorPage />);

    const surface = () => document.querySelector('.future-ui-theme-surface')!;
    const html = () => document.documentElement;
    const toggle = () => screen.getByTestId('theme-toggle');

    // 初始 Light：表面与 <html> 均带 light；token 同步
    expect(surface().getAttribute('data-theme')).toBe('light');
    expect(html().getAttribute('data-theme')).toBe('light');
    expect(html().style.getPropertyValue('--future-ui-bg')).toBe('#ffffff');

    // 切到 Dark：两者一起变化（Portal 内 Dialog 继承 <html> token 才会真实换肤）
    fireEvent.click(toggle());
    expect(surface().getAttribute('data-theme')).toBe('dark');
    expect(html().getAttribute('data-theme')).toBe('dark');
    expect(html().style.getPropertyValue('--future-ui-bg')).toBe('#0b1220');
    expect(toggle().getAttribute('aria-pressed')).toBe('true');

    // 切回 Light
    fireEvent.click(toggle());
    expect(surface().getAttribute('data-theme')).toBe('light');
    expect(html().getAttribute('data-theme')).toBe('light');
    expect(toggle().getAttribute('aria-pressed')).toBe('false');
  });

  test('Dialog 打开 + 未保存草稿：切换主题不关闭 Dialog、草稿与可编辑性保持、无额外事件', () => {
    render(<MaterialEditorPage />);
    fireEvent.click(screen.getByTestId('me-row-m1').querySelector('button')!);
    const input = screen.getByDisplayValue('春日山景.mp4') as HTMLInputElement;

    fireEvent.change(input, { target: { value: '草稿-未保存.mp4' } });
    input.focus();
    expect(document.activeElement).toBe(input);

    const logBefore = screen.getByTestId('me-log').textContent!;
    fireEvent.click(screen.getByTestId('theme-toggle')); // Dialog 打开时切主题

    // Dialog 仍打开；草稿值保持；输入仍可编辑；焦点仍在该输入框上
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByDisplayValue('草稿-未保存.mp4')).toBeTruthy();
    fireEvent.change(screen.getByDisplayValue('草稿-未保存.mp4'), { target: { value: '草稿-仍可编辑.mp4' } });
    expect(screen.getByDisplayValue('草稿-仍可编辑.mp4')).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByDisplayValue('草稿-仍可编辑.mp4'));
    // 主题切换不触发额外 onSave/onOpenChange：日志无任何新增
    expect(screen.getByTestId('me-log').textContent).toBe(logBefore);
  });

  test('保存 pending 时切换主题：aria-busy/disabled 保持、不重复保存、reason=save 恰好一次', async () => {
    render(<MaterialEditorPage />);
    fireEvent.click(screen.getByTestId('me-row-m1').querySelector('button')!);
    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy());
    fireEvent.change(screen.getByDisplayValue('春日山景.mp4'), { target: { value: '春日山景-改.mp4' } });

    fireEvent.click(screen.getByRole('button', { name: /保存/ }));
    const pendingBtn = await screen.findByRole('button', { name: '保存中…' }, { timeout: 2500 });
    expect((pendingBtn as HTMLButtonElement).disabled).toBe(true);
    expect(pendingBtn.getAttribute('aria-busy')).toBe('true');

    // pending 期间切换主题：保存不被打断、不重复
    fireEvent.click(screen.getByTestId('theme-toggle'));
    const pendingAfter = screen.getByRole('button', { name: '保存中…' });
    expect((pendingAfter as HTMLButtonElement).disabled).toBe(true);
    expect(pendingAfter.getAttribute('aria-busy')).toBe('true');

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull(), { timeout: 2500 });
    const logText = screen.getByTestId('me-log').textContent!;
    expect(logText.match(/save pending/g)!.length).toBe(1);
    expect(logText.match(/saved id=m1/g)!.length).toBe(1);
    expect(logText.match(/close reason=save/g)!.length).toBe(1);
    expect(screen.getByTestId('me-name-m1').textContent).toBe('春日山景-改.mp4');
  });

  test('重复切换不触发任何业务事件；UI 字段顺序/标签与 Agent 投影换肤前后不变', () => {
    render(<MaterialEditorPage />);

    // 未打开 Dialog 时反复切换：日志保持为空占位，无 onSave/onOpenChange 痕迹
    const toggle = screen.getByTestId('theme-toggle');
    fireEvent.click(toggle);
    fireEvent.click(toggle);
    fireEvent.click(toggle);
    expect(screen.getByTestId('me-log').textContent).toBe('(尚无事件)');

    // Dialog 字段（含 secretNote 仅 UI）顺序/标签换肤前后一致
    fireEvent.click(screen.getByTestId('me-row-m2').querySelector('button')!);
    const labelsBefore = Array.from(
      document.querySelectorAll('[data-testid="edit-dialog-fields"] label'),
    ).map((el) => el.textContent);
    fireEvent.click(toggle);
    const labelsAfter = Array.from(
      document.querySelectorAll('[data-testid="edit-dialog-fields"] label'),
    ).map((el) => el.textContent);
    expect(labelsAfter).toEqual(labelsBefore);

    // Agent 只读投影与主题无关：换肤前后字段元数据、Action 引用不变
    const beforeProjection = publicFieldMetadata(MATERIAL_FIELDS).map((f) => ({
      name: f.name,
      order: f.order,
      actionRef: f.actionRef,
    }));
    fireEvent.click(toggle);
    const afterProjection = publicFieldMetadata(MATERIAL_FIELDS).map((f) => ({
      name: f.name,
      order: f.order,
      actionRef: f.actionRef,
    }));
    expect(afterProjection).toEqual(beforeProjection);
    expect(afterProjection.map((f) => f.name)).toEqual(['displayName', 'description']);
    expect(projectSaveAction().ref).toBe(MATERIAL_SAVE_ACTION.ref);
  });

  test('P1-2 键盘路径：按键 T 切换主题，但焦点在输入框内时不触发（输入守卫）', () => {
    render(<MaterialEditorPage />);
    const html = () => document.documentElement;
    expect(html().getAttribute('data-theme')).toBe('light');

    // 焦点在非输入元素（如取消按钮）→ 按 T 切换
    fireEvent.click(screen.getByTestId('me-row-m1').querySelector('button')!);
    const cancelBtn = screen.getByRole('button', { name: '取消' });
    cancelBtn.focus();
    fireEvent.keyDown(cancelBtn, { key: 't' });
    expect(html().getAttribute('data-theme')).toBe('dark');

    // 焦点在输入框内 → 按 T 不切换（避免打断输入）
    const input = screen.getByDisplayValue('春日山景.mp4') as HTMLInputElement;
    input.focus();
    fireEvent.keyDown(input, { key: 't' });
    expect(html().getAttribute('data-theme')).toBe('dark');
    // 输入框里实际输入 t 也属于正常输入，不触发切换
    fireEvent.change(input, { target: { value: '春日山景-t.mp4' } });
    expect(html().getAttribute('data-theme')).toBe('dark');
    expect(screen.getByDisplayValue('春日山景-t.mp4')).toBeTruthy();
  });
});

describe('R2-A3 业务 Action 双入口 + 权威状态回读', () => {
  type AgentInvokeResult = Awaited<ReturnType<ReturnType<typeof createDevAgent>['invokeSave']>>;

  function setup(): { app: ReturnType<typeof createMaterialEditorApp>; agent: ReturnType<typeof createDevAgent> } {
    const app = createMaterialEditorApp();
    const agent = createDevAgent(app.bridge);
    return { app, agent };
  }

  test('UI 保存 → 权威 version 更新一次 → Agent authorized committed read 看见修改后公开字段；secretNote 不可见', async () => {
    const { app, agent } = setup();
    render(<MaterialEditorPage app={app} />);

    fireEvent.click(screen.getByTestId('me-row-m1').querySelector('button')!);
    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy());
    fireEvent.change(screen.getByDisplayValue('春日山景.mp4'), { target: { value: '春日山景-改.mp4' } });
    fireEvent.change(screen.getByDisplayValue('8K 航拍镜头，10 秒'), { target: { value: '8K 航拍镜头，12 秒' } });
    fireEvent.click(screen.getByRole('button', { name: /保存/ }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull(), { timeout: 2500 });

    // 权威状态更新一次（version 0 → 1）
    expect(app.store.getVersion()).toBe(1);
    expect(screen.getByTestId('me-version').textContent).toContain('version=1');

    // Agent 获准的 committed-state 回读：可见修改后公开字段，secretNote 不可见
    const read = agent.committedRead({ materialId: 'm1' });
    expect(read.status).toBe('completed');
    if (read.status === 'completed') {
      expect(read.values['displayName']).toBe('春日山景-改.mp4');
      expect(read.values['description']).toBe('8K 航拍镜头，12 秒');
      expect(Object.keys(read.values)).toEqual(['displayName', 'description']);
      expect(JSON.stringify(read.values)).not.toContain('secretNote');
      expect(JSON.stringify(read.values)).not.toContain('版权归属');
    }
  });

  test('dev-only Agent invoke → 权威状态更新一次 → 已挂载 UI 列表可见变化（无刷新、无 DOM 回读/模拟点击）', async () => {
    const { app, agent } = setup();
    render(<MaterialEditorPage app={app} />);
    expect(screen.getByTestId('me-name-m2').textContent).toBe('城市夜景延时.mov');

    let outcome: AgentInvokeResult;
    await act(async () => {
      outcome = await agent.invokeSave({
        materialId: 'm2',
        values: { displayName: 'Agent-提交的夜景.mov', description: '4K 延时摄影，45 秒' },
        idempotencyKey: 'agent-m2-1',
      });
    });
    expect(outcome!.status).toBe('completed');
    expect(app.store.getVersion()).toBe(1);

    // UI 直接呈现权威结果（store 订阅），无刷新、无 DOM 点击
    await waitFor(() => expect(screen.getByTestId('me-name-m2').textContent).toBe('Agent-提交的夜景.mov'));
    expect(screen.getByTestId('me-desc-m2').textContent).toBe('4K 延时摄影，45 秒');
    expect(screen.getByTestId('me-version').textContent).toContain('version=1');
    // UI 无任何保存事件日志（程序化入口不产生 UI 交互痕迹）
    expect(screen.getByTestId('me-log').textContent).toBe('(尚无事件)');
  });

  test('负例：未注册 handler / 未授权 caller → rejected 且 0 business write', async () => {
    const { app } = setup();
    const unregistered = await app.bridge.invoke({
      caller: 'dev-agent',
      actionRef: 'material/edit#ghost',
      materialId: 'm1',
      values: { displayName: 'x' },
    });
    expect(unregistered.status).toBe('rejected');
    if (unregistered.status === 'rejected') expect(unregistered.code).toBe('unregistered');

    const unauthorized = await app.bridge.invoke({
      caller: 'admin' as never,
      actionRef: 'material/edit#save',
      materialId: 'm1',
      values: { displayName: 'x' },
    });
    expect(unauthorized.status).toBe('rejected');
    if (unauthorized.status === 'rejected') expect(unauthorized.code).toBe('unauthorized-caller');

    const ghostRead = app.bridge.committedRead({ caller: 'admin' as never, materialId: 'm1' });
    expect(ghostRead.status).toBe('rejected');
    if (ghostRead.status === 'rejected') expect(ghostRead.code).toBe('unauthorized-caller');

    expect(app.store.getVersion()).toBe(0);
    expect(app.store.find('m1')!.values['displayName']).toBe('春日山景.mp4');
  });

  test('负例：Agent 对 secretNote 读写 → 拒绝且 0 write；错误不含值，UI 渲染不含敏感字段', async () => {
    const { app, agent } = setup();
    const before = app.store.find('m1')!.values['secretNote'];

    const write = await agent.invokeSave({ materialId: 'm1', values: { secretNote: '恶意改写' } });
    expect(write.status).toBe('rejected');
    if (write.status === 'rejected') {
      expect(write.code).toBe('field-not-allowed');
      expect(write.reason).not.toContain('恶意改写');
    }
    // 0 write：version 与 secretNote 均不变
    expect(app.store.getVersion()).toBe(0);
    expect(app.store.find('m1')!.values['secretNote']).toBe(before);

    // committedRead 绝不返回 secretNote
    const read = agent.committedRead({ materialId: 'm1' });
    expect(read.status).toBe('completed');
    if (read.status === 'completed') {
      expect(Object.keys(read.values)).toEqual(['displayName', 'description']);
      expect(JSON.stringify(read.values)).not.toContain('secretNote');
      expect(JSON.stringify(read.values)).not.toContain('版权归属');
    }

    // UI 渲染（列表/日志/版本）不含敏感字段值
    render(<MaterialEditorPage app={app} />);
    const pageText = (screen.getByTestId('material-editor-page').textContent ?? '') + screen.getByTestId('me-log').textContent!;
    expect(pageText).not.toContain('恶意改写');
  });

  test('负例：未知素材 / 陈旧版本 / 无效输入 → 拒绝且 0 write', async () => {
    const { app, agent } = setup();
    const unknown = await agent.invokeSave({ materialId: 'ghost', values: { displayName: 'x' } });
    expect(unknown.status).toBe('failed');
    if (unknown.status === 'failed') expect(unknown.code).toBe('unknown-material');

    const stale = await agent.invokeSave({ materialId: 'm1', values: { displayName: 'x' }, expectedVersion: 99 });
    expect(stale.status).toBe('failed');
    if (stale.status === 'failed') expect(stale.code).toBe('stale-version');

    const invalid = await app.bridge.invoke({
      caller: 'dev-agent',
      actionRef: 'material/edit#save',
      materialId: 'm1',
      values: { displayName: 123 as unknown as string },
    });
    expect(invalid.status).toBe('rejected');
    if (invalid.status === 'rejected') expect(invalid.code).toBe('invalid-input');

    expect(app.store.getVersion()).toBe(0);
  });

  test('负例：pending 冲突——UI 保存进行中，Agent 保存同素材被拒（0 write）；UI 结果不被覆盖', async () => {
    const { app, agent } = setup();
    render(<MaterialEditorPage app={app} />);
    fireEvent.click(screen.getByTestId('me-row-m1').querySelector('button')!);
    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy());
    fireEvent.change(screen.getByDisplayValue('春日山景.mp4'), { target: { value: 'UI-保存中.mp4' } });
    fireEvent.click(screen.getByRole('button', { name: /保存/ }));
    await screen.findByRole('button', { name: '保存中…' }, { timeout: 2500 });

    // UI 保存进行中（handler 1.2s 模拟延迟）：Agent 并发保存同素材 → pending-conflict
    let outcome: AgentInvokeResult;
    await act(async () => {
      outcome = await agent.invokeSave({ materialId: 'm1', values: { displayName: 'Agent-并发.mp4' } });
    });
    expect(outcome!.status).toBe('rejected');
    if (outcome!.status === 'rejected') expect(outcome!.code).toBe('pending-conflict');

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull(), { timeout: 2500 });
    // 权威结果 = UI 的保存，未被 Agent 盲覆盖；version 只 +1
    expect(app.store.getVersion()).toBe(1);
    expect(app.store.find('m1')!.values['displayName']).toBe('UI-保存中.mp4');
    expect(screen.getByTestId('me-name-m1').textContent).toBe('UI-保存中.mp4');
  });

  test('幂等：同 idempotencyKey 重复提交 → 第二次为重放，不再写第二次（version 不再 +1）', async () => {
    const { app, agent } = setup();
    const first = await agent.invokeSave({ materialId: 'm3', values: { description: '描述-v1' }, idempotencyKey: 'k-dup-1' });
    expect(first.status).toBe('completed');
    expect(app.store.getVersion()).toBe(1);

    const second = await agent.invokeSave({ materialId: 'm3', values: { description: '描述-v1' }, idempotencyKey: 'k-dup-1' });
    expect(second.status).toBe('completed');
    if (second.status === 'completed') {
      expect(second.idempotentReplay).toBe(true);
    }
    expect(app.store.getVersion()).toBe(1);
  });

  test('UI 在过时快照上保存 → stale-version 拒绝：失败显示在 Dialog、不覆盖 Agent 已提交的权威结果', async () => {
    const { app, agent } = setup();
    render(<MaterialEditorPage app={app} />);
    fireEvent.click(screen.getByTestId('me-row-m1').querySelector('button')!);
    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy());
    fireEvent.change(screen.getByDisplayValue('春日山景.mp4'), { target: { value: 'UI-过时编辑.mp4' } });

    // Agent 抢先提交同一素材（version 0 → 1），UI 直接呈现权威结果
    let agentOutcome: AgentInvokeResult;
    await act(async () => {
      agentOutcome = await agent.invokeSave({
        materialId: 'm1',
        values: { displayName: 'Agent-抢先.mp4' },
        idempotencyKey: 'agent-race-1',
      });
    });
    expect(agentOutcome!.status).toBe('completed');
    await waitFor(() => expect(screen.getByTestId('me-name-m1').textContent).toBe('Agent-抢先.mp4'));

    // UI 基于打开时的快照（version 0）保存 → 与当前权威版本（1）冲突 → stale-version 拒绝
    fireEvent.click(screen.getByRole('button', { name: /保存/ }));
    await waitFor(() => expect(screen.getByTestId('edit-dialog-save-error')).toBeTruthy(), { timeout: 2500 });

    // 失败显示失败：Dialog 保持打开、错误可见，不标成功
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByTestId('edit-dialog-save-error').textContent).toContain('stale-version');
    // 0 write：权威结果仍是 Agent 提交的，version 仍为 1
    expect(app.store.getVersion()).toBe(1);
    expect(app.store.find('m1')!.values['displayName']).toBe('Agent-抢先.mp4');
    expect(screen.getByTestId('me-name-m1').textContent).toBe('Agent-抢先.mp4');
  });

  test('Agent 提交后主题切换正常；A1 公开字段元数据/顺序与只读投影不变', async () => {
    const { app, agent } = setup();
    render(<MaterialEditorPage app={app} />);
    const before = publicFieldMetadata(MATERIAL_FIELDS).map((f) => ({
      name: f.name,
      order: f.order,
      actionRef: f.actionRef,
    }));

    let outcome: AgentInvokeResult;
    await act(async () => {
      outcome = await agent.invokeSave({
        materialId: 'm1',
        values: { displayName: 'Agent-主题.mp4' },
        idempotencyKey: 'agent-theme-1',
      });
    });
    expect(outcome!.status).toBe('completed');
    await waitFor(() => expect(screen.getByTestId('me-name-m1').textContent).toBe('Agent-主题.mp4'));

    // 主题切换仍正常（宿主视觉偏好与业务状态无关）
    fireEvent.click(screen.getByTestId('theme-toggle'));
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(screen.getByTestId('me-name-m1').textContent).toBe('Agent-主题.mp4');

    const after = publicFieldMetadata(MATERIAL_FIELDS).map((f) => ({
      name: f.name,
      order: f.order,
      actionRef: f.actionRef,
    }));
    expect(after).toEqual(before);
    expect(after.map((f) => f.name)).toEqual(['displayName', 'description']);
    expect(projectSaveAction().ref).toBe(MATERIAL_SAVE_ACTION.ref);
  });
});
