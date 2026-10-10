/**
 * R2-A4 (#102) · 任务管理与编辑（页面 B）—— 首次 AI 输出（浏览器图）。
 *
 * 生成依据（S1）：原始业务提示 + S0 冻结的共享规范（同一 `r1-edit-dialog-reference`
 * Profile、同一 `themes` 对象、styles.css 的 `.fp-*` 共享配方）。本页面不导入任何
 * Node-only 模块；业务字段/列表与素材页 A 实质独立，不复制 A 的 JSX/CSS。
 *
 * 业务语义：本地内存虚拟任务；打开编辑 → 预填 → 修改保存 → 列表更新一次；
 * 取消/关闭不保存；保存 pending 与素材页同一 EditDialog 语义（~1.2s、
 * disabled/aria-busy、一次 reason=save）。
 */
import { useState } from 'react';
import type { ReactElement } from 'react';
import { ThemeProvider } from '@future-ui/theme';
import { EditDialog, ShadcnButton, editDialogProfile } from '@future-ui/shadcn-adapter/browser';
import type { EditDialogOpenChangeDetail } from '@future-ui/shadcn-adapter/browser';
import {
  TASK_DIALOG_INSTANCE_ID,
  TASK_FIELDS,
  TASK_SAVE_ACTION,
  TASK_SCOPE,
  VIRTUAL_TASKS,
  toEditDialogFields,
} from './task-declaration.js';
import type { TaskRow } from './task-declaration.js';
import { ThemeFloatToggle, useHostTheme } from './page-shell.js';

/** 任务管理与编辑页（与素材页共用同一 Profile/Adapter/Theme 配方；业务独立）。 */
export function TaskEditorPage(): ReactElement {
  const { themeName, activeTheme, toggleTheme } = useHostTheme();
  const [tasks, setTasks] = useState<TaskRow[]>(() =>
    VIRTUAL_TASKS.map((t) => ({ id: t.id, values: { ...t.values } })),
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);

  const editing = tasks.find((t) => t.id === editingId) ?? null;
  const pushLog = (line: string): void => setLog((prev) => [...prev, line]);

  const handleOpenChange = (detail: EditDialogOpenChangeDetail): void => {
    if (!detail.open) {
      pushLog(`close reason=${detail.reason} open=${detail.open}`);
      setEditingId(null);
    }
  };

  // 本地内存业务保存（~1.2s pending；同一 EditDialog 防重复提交语义；取消不保存）。
  // 日志只记录开始/结束与 Action 引用，不扩散敏感/草稿值（与素材页同约束）。
  const handleSave = async (values: Record<string, string>): Promise<void> => {
    if (editingId === null) return;
    pushLog(`save pending action=${TASK_SAVE_ACTION.ref}`);
    await new Promise((resolve) => setTimeout(resolve, 1200));
    setTasks((prev) => prev.map((t) => (t.id === editingId ? { ...t, values: { ...values } } : t)));
    pushLog(`saved id=${editingId} action=${TASK_SAVE_ACTION.ref}`);
  };

  return (
    <ThemeProvider theme={activeTheme}>
      <section data-testid="task-editor-page" className="fp-page">
        <div className="fp-header">
          <h1>任务管理与编辑（R2-A4 第二业务页）</h1>
        </div>
        {/* 与素材页同一主题浮层入口（共享配方；Dialog 打开时可真实指针点击换肤）。 */}
        <ThemeFloatToggle themeName={themeName} onToggle={toggleTheme} />
        <p className="fp-note">
          与素材页共用同一 <code>r1-edit-dialog-reference</code> Profile / Adapter / Light-Dark
          主题；业务字段与列表独立（<code>task/manage</code>）。内部备注为敏感字段，仅 UI 可见。
        </p>

        <ul className="fp-list" data-testid="tp-list">
          {tasks.map((row) => (
            <li key={row.id} className="fp-row" data-testid={`tp-row-${row.id}`}>
              <div className="fp-text">
                <strong data-testid={`tp-name-${row.id}`}>{row.values['taskName']}</strong>
                <span data-testid={`tp-owner-${row.id}`}>
                  负责人：{row.values['owner']} · {row.values['status']}
                </span>
              </div>
              <ShadcnButton type="button" variant="outline" onClick={() => setEditingId(row.id)}>
                编辑
              </ShadcnButton>
            </li>
          ))}
        </ul>

        <pre className="fp-log" data-testid="tp-log">{log.join('\n') || '(尚无事件)'}</pre>

        <EditDialog
          open={editing !== null}
          profile={editDialogProfile}
          label="任务信息编辑"
          description={`维护任务字段（scope=${TASK_SCOPE}，实例 ${TASK_DIALOG_INSTANCE_ID}）`}
          fields={toEditDialogFields(TASK_FIELDS, editing?.values ?? {})}
          onSave={handleSave}
          onOpenChange={handleOpenChange}
        />
      </section>
    </ThemeProvider>
  );
}

export type { TaskRow };
