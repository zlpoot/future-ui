import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Runtime alias for the UNMODIFIED vendored shadcn registry sources:
// their delivered code imports siblings as '@/registry/new-york-v4/*'.
// Type-time equivalent lives in packages/shadcn-adapter/tsconfig.json.
const registryRoot = fileURLToPath(
  new URL('./packages/shadcn-adapter/src/upstream/registry/new-york-v4', import.meta.url),
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
    include: ['tests/**/*.test.{ts,tsx}', 'packages/*/tests/**/*.test.{ts,tsx}', 'examples/*/tests/**/*.test.{ts,tsx}'],
  },
});
