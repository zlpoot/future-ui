import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Runtime alias mirror of the repo root config: the UNMODIFIED vendored shadcn
// registry sources import siblings as '@/registry/new-york-v4/*'.
const registryRoot = fileURLToPath(
  new URL('../../packages/shadcn-adapter/src/upstream/registry/new-york-v4', import.meta.url),
);

// R2-A2 (#98)：与 vite.config.ts 相同——把 '@future-ui/theme' 别名指向
// ThemeProvider 源文件（provider.tsx），跳过包索引里的 node:fs 依赖链。
const themeProviderRoot = fileURLToPath(
  new URL('../../packages/theme/src/provider.tsx', import.meta.url),
);

export default defineConfig({
  resolve: {
    alias: {
      '@/registry/new-york-v4': registryRoot,
      '@future-ui/theme': themeProviderRoot,
    },
  },
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
  },
});
