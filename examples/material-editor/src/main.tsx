import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MaterialEditorPage } from './material-editor.js';
import './styles.css';

// 浏览器入口只走浏览器安全图（shadcn /browser + 声明）；agent-projection 为 Node-only。
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MaterialEditorPage />
  </StrictMode>,
);
