import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createMaterialEditorApp, MaterialEditorPage } from './material-editor.js';
import { createDevAgent } from './dev-agent-entry.js';
import './styles.css';

// 浏览器入口只走浏览器安全图（shadcn /browser + 声明 + 示例级 bridge）；
// agent-projection 为 Node-only，dev-only 程序化 Agent 走 material-bridge 的
// 显式注册 handler（同一业务 handler，非 DOM 点击、非 UI 按钮）。
const app = createMaterialEditorApp();

// dev-only 受控程序化 Agent 入口（明确命名空间；仅开发构建暴露，生产不挂载）。
// Chrome smoke / 调试在页面上下文调用：
//   __futureUiR2A3DevAgent.invokeSave({ materialId, values, expectedVersion, idempotencyKey })
//   __futureUiR2A3DevAgent.committedRead({ materialId })
if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__futureUiR2A3DevAgent = createDevAgent(app.bridge);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MaterialEditorPage app={app} />
  </StrictMode>,
);
