/**
 * R2-A4 (#102) · 任务管理与编辑（页面 B）定向测试：
 *   1) UI 闭环（jsdom）：渲染 3 条虚拟任务（名称/负责人/状态）→ 打开编辑 → 预填 →
 *      修改 → 保存 pending（disabled/aria-busy、一次 reason=save）→ 列表更新一次；
 *      取消不保存；
 *   2) 业务独立 + 共享配方：B 字段/scope 与素材页 A 实质不同；两页共用同一
 *      `r1-edit-dialog-reference` Profile identity/version 与唯一 Light/Dark 数据源
 *      （同一 themes 对象 token 值）；
 *   3) Node-only 只读实例投影：task 实例显式注册、internalNote 敏感字段不注册、
 *      draft value withheld、未注册 scope not-covered、0 业务工具。
 */
// @vitest-environment jsdom
import { describe, expect, test } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { executeProjectTool } from '@future-ui/ai-dev';
import { editDialogProfile } from '@future-ui/shadcn-adapter/browser';
import { TaskEditorPage } from '../src/task-editor.js';
import { themes } from '../src/themes.js';
import {
  TASK_DIALOG_INSTANCE_ID,
  TASK_FIELDS,
  TASK_SAVE_ACTION,
  TASK_SCOPE,
  VIRTUAL_TASKS,
} from '../src/task-declaration.js';
import { MATERIAL_FIELDS, MATERIAL_SCOPE } from '../src/material-declaration.js';
import {
  createTaskEditorContext,
  registerTaskEditorInstances,
  projectTaskFieldMetadata,
  taskScopeCoverage,
} from '../src/task-projection.js';

describe('R2-A4 任务页 UI 闭环（页面 B）', () => {
  test('渲染 3 条虚拟任务（任务名称/负责人/状态）', () => {
    render(<TaskEditorPage />);
    expect(screen.getByTestId('tp-name-t1').textContent).toBe('季度素材盘点');
    expect(screen.getByTestId('tp-owner-t1').textContent).toContain('负责人：李芳');
    expect(screen.getByTestId('tp-owner-t1').textContent).toContain('进行中');
    expect(screen.getByTestId('tp-name-t2').textContent).toBe('官网改版走查');
    expect(screen.getByTestId('tp-name-t3').textContent).toBe('年会视频粗剪');
    expect(screen.getAllByRole('button', { name: '编辑' })).toHaveLength(3);
  });

  test('打开编辑 → 预填 → 修改 → 保存 pending（disabled/aria-busy）→ 列表更新一次；日志不扩散敏感/草稿值', async () => {
    render(<TaskEditorPage />);
    fireEvent.click(screen.getByTestId('tp-row-t1').querySelector('button')!);
    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy());
    // 预填（含敏感字段 internalNote，UI 允许编辑）
    expect(screen.getByDisplayValue('季度素材盘点')).toBeTruthy();
    expect(screen.getByDisplayValue('李芳')).toBeTruthy();
    expect(screen.getByDisplayValue('进行中')).toBeTruthy();
    expect(screen.getByDisplayValue('需在周五前输出清单')).toBeTruthy();

    // 修改任务名称
    fireEvent.change(screen.getByDisplayValue('季度素材盘点'), { target: { value: '季度素材盘点-改' } });

    // 保存：pending 状态（disabled + aria-busy），重复点击被忽略
    const saveBtn = screen.getByRole('button', { name: /保存/ });
    fireEvent.click(saveBtn);
    const pendingBtn = await screen.findByRole('button', { name: '保存中…' }, { timeout: 2500 });
    expect((pendingBtn as HTMLButtonElement).disabled).toBe(true);
    expect(pendingBtn.getAttribute('aria-busy')).toBe('true');
    fireEvent.click(pendingBtn); // 防重复提交

    // 保存完成：弹窗关闭（reason=save），列表更新一次（~1.2s 异步）
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull(), { timeout: 2500 });
    expect(screen.getByTestId('tp-name-t1').textContent).toBe('季度素材盘点-改');
    const logText = screen.getByTestId('tp-log').textContent!;
    expect(logText).toContain(`save pending action=${TASK_SAVE_ACTION.ref}`);
    expect(logText).toContain(`saved id=t1 action=${TASK_SAVE_ACTION.ref}`);
    expect(logText).toContain('close reason=save open=false');
    // 日志只记录开始/结束与 Action 引用，不扩散敏感/草稿值
    expect(logText).not.toContain('需在周五前输出清单');
    expect(logText).not.toContain('internalNote');
    expect(logText).not.toContain('季度素材盘点-改');
    expect(logText.match(/save pending/g)!.length).toBe(1);
  });

  test('取消不保存（列表不变）', async () => {
    render(<TaskEditorPage />);
    fireEvent.click(screen.getByTestId('tp-row-t2').querySelector('button')!);
    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy());
    fireEvent.change(screen.getByDisplayValue('官网改版走查'), { target: { value: '不应保存的任务' } });
    fireEvent.click(screen.getByRole('button', { name: '取消' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByTestId('tp-name-t2').textContent).toBe('官网改版走查');
    expect(screen.getByTestId('tp-log').textContent).toContain('close reason=cancel open=false');
  });
});

describe('R2-A4 业务独立 + 共享配方（A/B）', () => {
  test('B 业务字段/scope 与素材页 A 实质不同（非复制字段表）', () => {
    expect(TASK_FIELDS.map((f) => f.name)).not.toEqual(MATERIAL_FIELDS.map((f) => f.name));
    expect(TASK_SCOPE).toBe('task/manage');
    expect(MATERIAL_SCOPE).toBe('material/edit');
    expect(TASK_SAVE_ACTION.ref).toBe('task/manage#save');
    // 敏感字段同样存在（UI 可编辑、Agent 不可见），但业务身份独立
    expect(TASK_FIELDS.filter((f) => f.sensitive === true).map((f) => f.name)).toEqual(['internalNote']);
    expect(VIRTUAL_TASKS).toHaveLength(3);
  });

  test('两页共用同一 r1-edit-dialog-reference Profile identity/version 与唯一 Light/Dark 数据源', () => {
    expect(editDialogProfile.identity.profileId).toBe('r1-edit-dialog-reference');
    expect(editDialogProfile.identity.profileVersion).toBe('1.0.0');
    render(<TaskEditorPage />);
    // B 与 A 同一 themes 对象：切深色后 <html> token 值 = themes.dark（A 使用的同一来源）
    fireEvent.click(screen.getByTestId('theme-toggle'));
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(document.documentElement.style.getPropertyValue('--future-ui-bg')).toBe(
      themes.dark.tokens['--future-ui-bg'],
    );
    expect(document.documentElement.style.getPropertyValue('--future-ui-primary')).toBe(
      themes.dark.tokens['--future-ui-primary'],
    );
  });
});

describe('R2-A4 任务页 Node-only 只读实例投影（页面 B）', () => {
  test('显式注册 task 实例；internalNote 敏感字段不注册；scope covered；未注册 scope not-covered', () => {
    const ctx = createTaskEditorContext();
    const { dialog, fields } = registerTaskEditorInstances(ctx, TASK_FIELDS);

    expect(dialog.instanceId).toBe(TASK_DIALOG_INSTANCE_ID);
    expect(fields.map((f) => f.instanceId)).toEqual([
      'task/manage-dialog/taskName',
      'task/manage-dialog/owner',
      'task/manage-dialog/status',
    ]);
    // internalNote 敏感字段未注册 → 不出现
    expect(fields.some((f) => f.instanceId.includes('internalNote'))).toBe(false);

    // project.listInstances：只回读实例身份/路径/关系（无值、无敏感字段）
    const listed = executeProjectTool(ctx, 'project.listInstances', {});
    expect(listed.ok).toBe(true);
    const rows = (listed as { ok: true; data: { instances: Array<Record<string, unknown>> } }).data.instances;
    expect(rows).toHaveLength(4); // dialog + 3 公开字段
    expect(rows.every((r) => !JSON.stringify(r).includes('internalNote'))).toBe(true);
    expect(rows.every((r) => !JSON.stringify(r).includes('需在周五前输出清单'))).toBe(true);

    // describeInstance：scope covered + 0 业务工具（无 capabilityBindings）
    const described = executeProjectTool(ctx, 'project.describeInstance', { instanceId: TASK_DIALOG_INSTANCE_ID });
    expect(described.ok).toBe(true);
    const d = (described as { ok: true; data: { coverage: string; boundCapabilities: string[] } }).data;
    expect(d.coverage).toBe('covered');
    expect(d.boundCapabilities).toEqual([]);

    // 未注册 scope → not-covered（绝不猜测）
    expect(taskScopeCoverage(ctx.registry, 'task/ghost').coverage).toBe('not-covered');
    expect(taskScopeCoverage(ctx.registry, TASK_SCOPE).coverage).toBe('covered');
  });

  test('draft 值 withheld：仅元数据投影，草稿/敏感值不泄露', () => {
    const ctx = createTaskEditorContext();
    registerTaskEditorInstances(ctx, TASK_FIELDS);
    const rawDraft = { taskName: '草稿任务名', owner: '草稿负责人', status: '草稿状态', internalNote: '绝密内部备注' };
    const p = projectTaskFieldMetadata(ctx.registry, TASK_FIELDS[0], rawDraft);
    expect(p.projected).toMatchObject({ name: 'taskName', label: '任务名称', order: 1, actionRef: 'task/manage#name' });
    expect(p.projected['value']).toBeUndefined();
    expect(p.withheld).toContain('value');

    // internalNote 未注册：describeInstance not-found；projectVisibleState 拒绝投影
    const secret = executeProjectTool(ctx, 'project.describeInstance', {
      instanceId: 'task/manage-dialog/internalNote',
    });
    expect(secret.ok).toBe(false);
    const snap = ctx.registry.projectVisibleState('task/manage-dialog/internalNote', { label: '内部备注', value: 'x' });
    expect(snap.projected).toEqual({});
    expect(snap.withheld).toEqual(['label', 'value']);
  });
});
