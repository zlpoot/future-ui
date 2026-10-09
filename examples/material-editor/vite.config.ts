import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// 与仓库根配置一致：vendored registry 的 '@/registry/new-york-v4/*' 别名。
const registryRoot = fileURLToPath(
  new URL('../../packages/shadcn-adapter/src/upstream/registry/new-york-v4', import.meta.url),
);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@/registry/new-york-v4': registryRoot,
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5175,
    strictPort: true,
  },
});
