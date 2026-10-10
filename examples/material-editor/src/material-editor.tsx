/**
 * R2-A1 (#96) → R2-A2 (#98) → R2-A3 (#100) · 素材编辑 React 页面（浏览器图）。
 *
 * 只从同一份素材声明派生 UI；复用 shadcn Adapter 的 EditDialog 与
 * r1-edit-dialog-reference Profile。本文件不导入任何 Node-only 模块。
 * R2-A2：同一组件实例由宿主两套受控视觉预设（Light/Dark）换肤；主题是
 * 宿主视觉偏好，不触碰业务状态、声明或 Agent 只读投影。
 * R2-A3：业务保存收敛为应用提供的**唯一业务 handler** + 权威内存 store；
 * 人类 UI 与 dev-only 程序化 Agent 共用同一 handler/同一权威状态；UI 通过
 * store 订阅直接呈现权威结果，Agent 通过获准的 committed-state 只读 API 回读。
 */
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
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
import { MaterialActionBridge, createSaveMaterialHandler } from './material-bridge.js';
import { MaterialStoreService } from './material-store.js';

/** 应用装配：唯一权威 store + 唯一业务 handler 的 bridge（main 注入 / 测试自建）。 */
export interface MaterialEditorApp {
  store: MaterialStoreService;
  bridge: MaterialActionBridge;
}

export function createMaterialEditorApp(): MaterialEditorApp {
  const store = new MaterialStoreService(VIRTUAL_MATERIALS);
  const bridge = new MaterialActionBridge(store);
  // 显式注册唯一业务 handler（绑定 MATERIAL_SAVE_ACTION.ref）；UI 与 Agent 共用。
  bridge.registerHandler(MATERIAL_SAVE_ACTION.ref, createSaveMaterialHandler(store));
  return { store, bridge };
}

export function MaterialEditorPage({ app }: { app?: MaterialEditorApp } = {}): ReactElement {
  // 未注入时惰性自建（既有测试无参渲染）；main.tsx 显式注入同一实例并挂 dev Agent。
  const [instance] = useState<MaterialEditorApp>(() => app ?? createMaterialEditorApp());
  const { store, bridge } = instance;

  // 权威素材状态：UI 直接订阅 store；Agent 提交后页面自动呈现权威结果（无刷新/无 DOM 点击）。
  const materials = useSyncExternalStore(store.subscribe.bind(store), store.getSnapshot.bind(store));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);
  // 宿主视觉偏好（独立于业务状态；换肤不触碰 editingId/materials/log/草稿）
  const [themeName, setThemeName] = useState<ThemeName>('light');
  // UI 保存会话序号：每次保存生成唯一幂等键（防重复提交二次写）。
  const uiSaveSeq = useRef(0);
  // Dialog 打开时的权威版本快照：UI 保存以此为 precondition（version/precondition
  // reject），避免用户在过时快照上的编辑盲覆盖期间 Agent 已提交的权威结果。
  const openVersionRef = useRef(0);

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
    if (editingId === null) return;
    // 只记录保存开始/结束与 Action 引用；不把（含 secretNote 的）字段值写入 UI 日志。
    const action = materialSaveAction(MATERIAL_SAVE_ACTION);
    pushLog(`save pending action=${action.ref}`);
    const outcome = await bridge.invoke({
      caller: 'ui',
      actionRef: action.ref,
      materialId: editingId,
      values,
      expectedVersion: openVersionRef.current,
      idempotencyKey: `ui-${editingId}-${uiSaveSeq.current++}`,
    });
    if (outcome.status !== 'completed') {
      // 失败显示失败：抛给 EditDialog → alert 展示、不关闭、可重试；0 write。
      // 日志只写 code 与 Action 引用，不携带字段名/值（避免间接泄露敏感字段）。
      const detail = outcome.status === 'rejected' ? outcome.reason : outcome.message;
      pushLog(`save rejected code=${outcome.code} action=${action.ref}`);
      throw new Error(`${outcome.code}: ${detail}`);
    }
    pushLog(`saved id=${editingId} action=${action.ref} version=${outcome.version}`);
  };

  return (
    <ThemeProvider theme={activeTheme}>
      <section data-testid="material-editor-page" className="me-page">
        <div className="me-header">
          <h1>素材信息编辑（R2-A3 业务 Action 双入口）</h1>
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
          UI 保存与 dev-only 程序化 Agent 共用同一业务 handler 与权威内存 store。
          Light/Dark 为宿主视觉偏好，不改变业务状态、语义与投影。切换：右上角按钮，或按键
          <code> T</code>（弹窗内焦点不在输入框时也可用）。
        </p>
        <p className="me-version" data-testid="me-version">
          权威状态 version={store.getVersion()}
        </p>

        <ul className="me-list" data-testid="me-list">
          {materials.map((row) => (
            <li key={row.id} className="me-row" data-testid={`me-row-${row.id}`}>
              <div className="me-text">
                <strong data-testid={`me-name-${row.id}`}>{row.values['displayName']}</strong>
                <span data-testid={`me-desc-${row.id}`}>{row.values['description']}</span>
              </div>
              <ShadcnButton type="button" variant="outline" onClick={() => { openVersionRef.current = store.getVersion(); setEditingId(row.id); }}>
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

export type { MaterialRow };
