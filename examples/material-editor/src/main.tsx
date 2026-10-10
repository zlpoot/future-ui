import { StrictMode } from 'react';
import type { ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import { createMaterialEditorApp, MaterialEditorPage } from './material-editor.js';
import { TaskEditorPage } from './task-editor.js';
import { createDevAgent } from './dev-agent-entry.js';
import './styles.css';

// 浏览器入口只走浏览器安全图（shadcn /browser + 声明 + 示例级 bridge）；
// agent-projection / task-projection 为 Node-only；dev-only 程序化 Agent 走
// material-bridge 的显式注册 handler（同一业务 handler，非 DOM 点击、非 UI 按钮）。
const app = createMaterialEditorApp();

// dev-only 受控程序化 Agent 入口（明确命名空间；仅开发构建暴露，生产不挂载）。
// Chrome smoke / 调试在页面上下文调用：
//   __futureUiR2A3DevAgent.invokeSave({ materialId, values, expectedVersion, idempotencyKey })
//   __futureUiR2A3DevAgent.committedRead({ materialId })
if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__futureUiR2A3DevAgent = createDevAgent(app.bridge);
}

// R2-A4 (#102)：同一 Vite host 内轻量视图切换 —— `/?view=task` 显示任务管理页 B，
// 默认显示素材编辑页 A；两页共用同一 Profile / Adapter / Theme 配方。
const view = new URLSearchParams(window.location.search).get('view');

/** 演示 host 页面切换条（共享配方一部分；非业务功能）。 */
function HostNav(): ReactElement {
  return (
    <nav className="fp-host-nav" aria-label="演示页面切换">
      <a href="/" aria-current={view !== 'task' ? 'page' : undefined}>
        素材编辑页
      </a>
      <a href="/?view=task" aria-current={view === 'task' ? 'page' : undefined}>
        任务管理页
      </a>
    </nav>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HostNav />
    {view === 'task' ? <TaskEditorPage /> : <MaterialEditorPage app={app} />}
  </StrictMode>,
);
