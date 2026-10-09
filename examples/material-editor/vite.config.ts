import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// 与仓库根配置一致：vendored registry 的 '@/registry/new-york-v4/*' 别名。
const registryRoot = fileURLToPath(
  new URL('../../packages/shadcn-adapter/src/upstream/registry/new-york-v4', import.meta.url),
);

// R2-A2 (#98)：@future-ui/theme 包入口（index.ts → theme-contract → @future-ui/contracts
// validate.ts）依赖 node:fs，浏览器导入会因 "node:fs externalized" 崩溃。示例端不改包，
// 仅把 '@future-ui/theme' 别名指向 ThemeProvider 源文件（provider.tsx 只依赖 react，
// 即 D08 的公开 token/data-theme 表面实现），实现真实复用且不引入 node 依赖。
const themeProviderRoot = fileURLToPath(
  new URL('../../packages/theme/src/provider.tsx', import.meta.url),
);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@/registry/new-york-v4': registryRoot,
      '@future-ui/theme': themeProviderRoot,
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5175,
    strictPort: true,
  },
});
