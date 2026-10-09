import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * R1-RC-001 (#86) — thinnest private local demo host.
 *
 * Loopback-only by construction: the dev server must never bind a public
 * interface (Owner: 强制监听 127.0.0.1). strictPort fails loudly instead of
 * silently hopping to another port, so the documented URL is deterministic.
 *
 * The `@` alias mirrors the package tsconfig paths: the VENDORED shadcn
 * registry imports its siblings via "@/registry/new-york-v4/...", which only
 * resolves under a bundler when vite is given the same mapping (registry root
 * is src/upstream, same as tsconfig "paths"). This is dev-only tooling; the
 * UI-only boundary is enforced by tests, not the config.
 *
 * This config is dev-only tooling. The UI-only boundary (the independent
 * sample's import graph must not contain ai-dev / capability-runtime / jsdom /
 * Agent/MCP) is enforced by tests, not by the bundler config.
 */
export default defineConfig({
  root: import.meta.dirname,
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('../shadcn-adapter/src/upstream', import.meta.url)),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
  build: {
    // The host exists only for local manual acceptance; an optimized build
    // target is out of scope for v0.1 and is not configured.
    outDir: '.vite-build',
  },
});
