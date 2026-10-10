/**
 * R2-A4 (#102) · 任务管理与编辑（页面 B）Node-only Agent 显式只读实例投影。
 *
 * 复用既有 API（与素材页 agent-projection.ts 同一套）：
 *   - `createEditDialogProjectContext`（ai-dev）= 真实 shadcn Project AI View + 空 InstanceRegistry；
 *   - `InstanceRegistry.register / coverage`（ai-contract-core）。
 *
 * 边界：
 *   - 显式注册任务 Dialog 实例与每个非敏感字段的 text-input 实例（relation field-of）；
 *   - 字段元数据（name/label/order/actionRef）走实例的显式 allowlist；
 *   - draft 值（value）不在 allowlist 中 → projectVisibleState 一律 withheld；
 *   - internalNote 敏感字段不注册 → 不出现在 listInstances / 投影；
 *   - 无 capabilityBindings 且 view.capabilities 为空 → 业务工具数 0（未注册 scope not-covered）。
 *
 * 浏览器图禁止导入本文件。
 */
import { createEditDialogProjectContext } from '@future-ui/ai-dev';
import type { EditDialogProjectContext } from '@future-ui/ai-dev';
import {
  InstanceRegistry,
  identityRefFor,
  type InstanceRegistration,
} from '@future-ui/ai-contract-core';
import { TASK_DIALOG_INSTANCE_ID, TASK_SCOPE } from './task-declaration.js';
import type { TaskFieldDecl } from './task-declaration.js';

export type { EditDialogProjectContext } from '@future-ui/ai-dev';

/** 建真实 shadcn Project AI View + 显式实例注册表（复用既有 API）。 */
export function createTaskEditorContext(): EditDialogProjectContext {
  return createEditDialogProjectContext();
}

/** 注册任务 Dialog 实例 + 每个非敏感字段实例（字段元数据走显式 allowlist）。 */
export function registerTaskEditorInstances(
  ctx: EditDialogProjectContext,
  fields: readonly TaskFieldDecl[],
): { dialog: InstanceRegistration; fields: InstanceRegistration[] } {
  const dialogDef = ctx.view.definitions.find((d) => d.componentType === 'future-ui.dialog');
  if (dialogDef === undefined) throw new Error('future-ui.dialog definition missing from shadcn view');
  const dialog: InstanceRegistration = {
    instanceId: TASK_DIALOG_INSTANCE_ID,
    componentType: 'future-ui.dialog',
    scopeId: TASK_SCOPE,
    identityRef: identityRefFor(dialogDef.identity),
    metadata: { path: 'task/EditTaskDialog' },
    visibleState: { allow: ['open'], sensitive: [] },
    // 无 capabilityBindings → 不产生任何业务工具
  };
  const result = ctx.registry.register(dialog);
  if (result.diagnostics.length > 0) {
    throw new Error(`register dialog failed: ${result.diagnostics.map((d) => `${d.code}@${d.path}`).join(', ')}`);
  }

  const fieldRegs: InstanceRegistration[] = [];
  for (const f of fields) {
    if (f.sensitive === true) continue; // 敏感字段不注册、不投影
    const inputDef = ctx.view.definitions.find((d) => d.componentType === 'future-ui.text-input');
    if (inputDef === undefined) throw new Error('future-ui.text-input definition missing from shadcn view');
    const reg: InstanceRegistration = {
      instanceId: `${TASK_DIALOG_INSTANCE_ID}/${f.name}`,
      componentType: 'future-ui.text-input',
      scopeId: TASK_SCOPE,
      identityRef: identityRefFor(inputDef.identity),
      relations: [{ kind: 'field-of', target: TASK_DIALOG_INSTANCE_ID }],
      metadata: { path: `task/EditTaskDialog/${f.name}` },
      // 只允许公开字段元数据；draft 值（value）不在 allowlist 中。
      visibleState: { allow: ['name', 'label', 'order', 'actionRef'], sensitive: [] },
    };
    const r = ctx.registry.register(reg);
    if (r.diagnostics.length > 0) {
      throw new Error(`register field ${f.name} failed: ${r.diagnostics.map((d) => `${d.code}@${d.path}`).join(', ')}`);
    }
    fieldRegs.push(reg);
  }
  return { dialog, fields: fieldRegs };
}

/** 字段实例的窄 allowlist 投影（只读；draft 值必然 withheld）。 */
export function projectTaskFieldMetadata(
  registry: InstanceRegistry,
  field: TaskFieldDecl,
  rawDraft: Record<string, string>,
): { projected: Record<string, unknown>; withheld: string[] } {
  const snap = registry.projectVisibleState(`${TASK_DIALOG_INSTANCE_ID}/${field.name}`, {
    name: field.name,
    label: field.label,
    order: field.order,
    actionRef: field.actionRef,
    value: rawDraft[field.name] ?? '',
  });
  return { projected: snap.projected, withheld: snap.withheld };
}

/** 覆盖情况（显式注册才有 covered；未注册 scope 一律 not-covered）。 */
export function taskScopeCoverage(registry: InstanceRegistry, scopeId: string): { coverage: string; instanceIds: string[] } {
  return registry.coverage(scopeId);
}

export { InstanceRegistry, identityRefFor };
