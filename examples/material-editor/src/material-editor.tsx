/**
 * R2-A1 (#96) → R2-A2 (#98) · 素材编辑 React 页面（浏览器图）。
 *
 * 只从同一份素材声明派生 UI；复用 shadcn Adapter 的 EditDialog 与
 * r1-edit-dialog-reference Profile。本文件不导入任何 Node-only 模块。
 * R2-A2：同一组件实例由宿主两套受控视觉预设（Light/Dark）换肤；主题是
 * 宿主视觉偏好，不触碰业务状态、声明或 Agent 只读投影。
 */
import { useEffect, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { ThemeProvider } from '@future-ui/theme';
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
import { applyThemeToRoot, themes } from './themes.js';
import type { ThemeName } from './themes.js';

const SAVE_DELAY_MS = 1200;

export function MaterialEditorPage(): ReactElement {
  const [materials, setMaterials] = useState<MaterialRow[]>(() => [...VIRTUAL_MATERIALS]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);
  // 宿主视觉偏好（独立于业务状态；换肤不触碰 editingId/materials/log/草稿）
  const [themeName, setThemeName] = useState<ThemeName>('light');

  const activeTheme = useMemo(() => themes[themeName], [themeName]);

  // Portal 内的 Dialog 挂载在 <html> 子树外，示例端把同一组 token 同步到
  // <html>，保证 Dialog 与页面一起换肤（纯视觉副作用）。
  useEffect(() => {
    applyThemeToRoot(activeTheme);
  }, [activeTheme]);

  // P1-2 键盘路径：模态 Dialog 的 Radix FocusScope 会把 Tab 限制在弹窗内
  // （标准模态语义），右上角浮层在弹窗打开时不可 Tab 到达；示例端提供
  // 按键 T 切换主题。焦点在输入框/文本域内时不触发（避免打断输入）。
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 't' && event.key !== 'T') return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      setThemeName((prev) => (prev === 'light' ? 'dark' : 'light'));
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

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
    <ThemeProvider theme={activeTheme}>
      <section data-testid="material-editor-page" className="me-page">
        <div className="me-header">
          <h1>素材信息编辑（R2-A2 双主题换肤）</h1>
        </div>
        {/* 主题切换为 fixed 浮层（z-60 > Dialog overlay z-50）：Dialog 打开时
            仍可真实指针点击换肤；键盘路径见按键 T（FocusScope 将 Tab 限制在
            弹窗内，故浮层不可 Tab 到达——标准模态语义）。主题只是宿主视觉
            偏好，不触碰业务状态。 */}
        <div className="me-theme-float">
          <ShadcnButton
            type="button"
            variant="outline"
            data-testid="theme-toggle"
            aria-pressed={themeName === 'dark'}
            onClick={() => setThemeName((prev) => (prev === 'light' ? 'dark' : 'light'))}
          >
            {themeName === 'light' ? '切换到深色' : '切换到浅色'}
          </ShadcnButton>
        </div>
        <p className="me-note">
          同一份 <code>MATERIAL_FIELDS</code> 声明驱动 UI 与 dev-only Agent 只读投影；复用
          <code> r1-edit-dialog-reference</code> Profile；敏感字段 <code>secretNote</code> 仅 UI 可见。
          Light/Dark 为宿主视觉偏好，不改变业务状态、语义与投影。切换：右上角按钮，或按键
          <code> T</code>（弹窗内焦点不在输入框时也可用）。
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
    </ThemeProvider>
  );
}
