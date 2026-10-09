import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Runtime alias mirror of the ROOT vitest.config.ts: the UNMODIFIED vendored
// shadcn registry sources import siblings as '@/registry/new-york-v4/*'. The
// example runs vitest from its own cwd, so it carries the same alias.
const registryRoot = fileURLToPath(
  new URL('../../packages/shadcn-adapter/src/upstream/registry/new-york-v4', import.meta.url),
);

export default defineConfig({
  resolve: {
    alias: {
      '@/registry/new-york-v4': registryRoot,
    },
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.{ts,tsx}'],
  },
});
