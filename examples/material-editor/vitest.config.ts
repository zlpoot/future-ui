import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Runtime alias mirror of the repo root config: the UNMODIFIED vendored shadcn
// registry sources import siblings as '@/registry/new-york-v4/*'.
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
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
  },
});
