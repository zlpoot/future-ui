/**
 * R1-RC-001 (#86) — v0.1 manual acceptance host entry.
 *
 * Dev-only. This entry wires the REAL adapters and the dev-only Project AI
 * View panel into one loopback page. The independent UI-only sample lives in
 * its own module whose import graph never touches ai-dev / capability-runtime /
 * jsdom / Agent/MCP (guarded by tests).
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app.js';
import './styles.css';

const container = document.getElementById('root');
if (container === null) {
  throw new Error('rc-manual-host: #root element missing from index.html');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
