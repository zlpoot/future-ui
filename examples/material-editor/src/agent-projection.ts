/**
 * R2-A1 (#96) · dev-only Agent 只读投影（Node 侧；浏览器图禁止导入本文件）。
 *
 * 复用现有 API：
 *   - `createEditDialogProjectContext`（ai-dev）= 真实 shadcn Project AI View + 空 InstanceRegistry；
 *   - `InstanceRegistry.register / projectVisibleState / coverage`（ai-contract-core）；
 *   - `executeProjectTool`（ai-dev）只读安全面：project.listInstances / describeInstance / catalog。
 *
 * 边界：
 *   - 显式注册 dialog 实例与每个非敏感字段的 text-input 实例（relation field-of）；
 *   - 字段元数据（name/label/order/actionRef）走实例的显式 allowlist；
 *   - draft 值（value）不在 allowlist 中 → projectVisibleState 一律 withheld；
 *   - secretNote 字段不注册 → 不出现在 listInstances / 投影；
 *   - 无 capabilityBindings 且 view.capabilities 为空 → 业务工具数 0。
 */
import { createEditDialogProjectContext } from '@future-ui/ai-dev';
import type { EditDialogProjectContext } from '@future-ui/ai-dev';
import {
  InstanceRegistry,
  identityRefFor,
  type InstanceRegistration,
  type ProjectAIView,
} from '@future-ui/ai-contract-core';
import { DIALOG_INSTANCE_ID, MATERIAL_SCOPE, materialSaveAction } from './material-declaration.js';
import type { MaterialFieldDecl, MaterialSaveAction } from './material-declaration.js';

export type { EditDialogProjectContext } from '@future-ui/ai-dev';

/** 建真实 shadcn Project AI View + 显式实例注册表（复用既有 API）。 */
export function createMaterialEditorContext(): EditDialogProjectContext {
  return createEditDialogProjectContext();
}

/** 注册 dialog 实例 + 每个非敏感字段实例（字段元数据走显式 allowlist）。 */
export function registerMaterialEditorInstances(
  ctx: EditDialogProjectContext,
  fields: readonly MaterialFieldDecl[],
): { dialog: InstanceRegistration; fields: InstanceRegistration[] } {
  const dialogDef = ctx.view.definitions.find((d) => d.componentType === 'future-ui.dialog');
  if (dialogDef === undefined) throw new Error('future-ui.dialog definition missing from shadcn view');
  const dialog: InstanceRegistration = {
    instanceId: DIALOG_INSTANCE_ID,
    componentType: 'future-ui.dialog',
    scopeId: MATERIAL_SCOPE,
    identityRef: identityRefFor(dialogDef.identity),
    metadata: { path: 'material/EditMaterialDialog' },
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
      instanceId: `${DIALOG_INSTANCE_ID}/${f.name}`,
      componentType: 'future-ui.text-input',
      scopeId: MATERIAL_SCOPE,
      identityRef: identityRefFor(inputDef.identity),
      relations: [{ kind: 'field-of', target: DIALOG_INSTANCE_ID }],
      metadata: { path: `material/EditMaterialDialog/${f.name}` },
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
export function projectFieldMetadata(
  registry: InstanceRegistry,
  field: MaterialFieldDecl,
  rawDraft: Record<string, string>,
): { projected: Record<string, unknown>; withheld: string[] } {
  const snap = registry.projectVisibleState(`${DIALOG_INSTANCE_ID}/${field.name}`, {
    name: field.name,
    label: field.label,
    order: field.order,
    actionRef: field.actionRef,
    value: rawDraft[field.name] ?? '',
  });
  return { projected: snap.projected, withheld: snap.withheld };
}

/** 覆盖情况（显式注册才有 covered；未注册 scope 一律 not-covered）。 */
export function scopeCoverage(registry: InstanceRegistry, scopeId: string): { coverage: string; instanceIds: string[] } {
  return registry.coverage(scopeId);
}

/**
 * 只读保存 Action 引用（非可执行描述）——与 UI 的提交行为标识共用同一对象。
 */
export function projectSaveAction(action: MaterialSaveAction = materialSaveAction()): MaterialSaveAction {
  return { ref: action.ref, label: action.label };
}

export { InstanceRegistry, identityRefFor };
export type { ProjectAIView };
