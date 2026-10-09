/**
 * R2-A1 (#96) · 素材编辑 React 页面（浏览器图）。
 *
 * 只从同一份素材声明派生 UI；复用 shadcn Adapter 的 EditDialog 与
 * r1-edit-dialog-reference Profile。本文件不导入任何 Node-only 模块。
 */
import { useState } from 'react';
import type { ReactElement } from 'react';
import { EditDialog, ShadcnButton, editDialogProfile } from '@future-ui/shadcn-adapter/browser';
import type { EditDialogOpenChangeDetail } from '@future-ui/shadcn-adapter/browser';
import {
  DIALOG_INSTANCE_ID,
  MATERIAL_FIELDS,
  MATERIAL_SAVE_ACTION,
  MATERIAL_SCOPE,
  VIRTUAL_MATERIALS,
  materialSaveAction,
  toEditDialogFields,
} from './material-declaration.js';
import type { MaterialRow } from './material-declaration.js';

const SAVE_DELAY_MS = 1200;

export function MaterialEditorPage(): ReactElement {
  const [materials, setMaterials] = useState<MaterialRow[]>(() => [...VIRTUAL_MATERIALS]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);

  const editing = materials.find((m) => m.id === editingId) ?? null;
  const pushLog = (line: string): void => setLog((prev) => [...prev, line]);

  const handleOpenChange = (detail: EditDialogOpenChangeDetail): void => {
    if (!detail.open) {
      pushLog(`close reason=${detail.reason} open=${detail.open}`);
      setEditingId(null);
    }
  };

  const handleSave = async (values: Record<string, string>): Promise<void> => {
    // 只记录保存开始/结束与 Action 引用；不把（含 secretNote 的）字段值写入 UI 日志。
    const action = materialSaveAction(MATERIAL_SAVE_ACTION);
    pushLog(`save pending action=${action.ref}`);
    await new Promise((resolve) => setTimeout(resolve, SAVE_DELAY_MS));
    setMaterials((prev) => prev.map((m) => (m.id === editingId ? { ...m, values } : m)));
    pushLog(`saved id=${editingId} action=${action.ref}`);
  };

  return (
    <section data-testid="material-editor-page" className="me-page">
      <h1>素材信息编辑（R2-A1 同源声明）</h1>
      <p className="me-note">
        同一份 <code>MATERIAL_FIELDS</code> 声明驱动 UI 与 dev-only Agent 只读投影；复用
        <code> r1-edit-dialog-reference</code> Profile；敏感字段 <code>secretNote</code> 仅 UI 可见。
      </p>

      <ul className="me-list" data-testid="me-list">
        {materials.map((row) => (
          <li key={row.id} className="me-row" data-testid={`me-row-${row.id}`}>
            <div className="me-text">
              <strong data-testid={`me-name-${row.id}`}>{row.values['displayName']}</strong>
              <span data-testid={`me-desc-${row.id}`}>{row.values['description']}</span>
            </div>
            <ShadcnButton type="button" variant="outline" onClick={() => setEditingId(row.id)}>
              编辑
            </ShadcnButton>
          </li>
        ))}
      </ul>

      <pre className="me-log" data-testid="me-log">
        {log.join('\n') || '(尚无事件)'}
      </pre>

      <EditDialog
        open={editing !== null}
        profile={editDialogProfile}
        label="素材信息编辑"
        description={`维护素材字段（scope=${MATERIAL_SCOPE}，实例 ${DIALOG_INSTANCE_ID}）`}
        fields={toEditDialogFields(MATERIAL_FIELDS, editing?.values ?? {})}
        onSave={handleSave}
        onOpenChange={handleOpenChange}
      />
    </section>
  );
}
