// d10-harness 独立 vitest 配置：lib/*.run.ts 与 runs/_feedback 由 runner 显式驱动。
// 根 vitest.config.ts 的 include 不覆盖 docs/benchmarks/d10-harness，避免 CI 误跑无 env 的 .run.ts。
// workspace 包（@future-ui/*）入口为 TS 源码（exports → src/index.ts），经 alias 直连。
import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(dirname(dirname(dirname(fileURLToPath(import.meta.url)))));

export default defineConfig({
  resolve: {
    alias: {
      '@future-ui/ai-dev': join(root, 'packages/ai-dev/src/index.ts'),
      '@future-ui/ai-contract-core': join(root, 'packages/ai-contract-core/src/index.ts'),
      '@future-ui/react-provider': join(root, 'packages/react-provider/src/index.ts'),
      '@future-ui/conformance': join(root, 'packages/conformance/src/index.ts'),
      '@future-ui/contracts': join(root, 'packages/contracts/src/index.ts'),
    },
  },
  test: {
    environment: 'node',
    include: [
      'docs/benchmarks/d10-harness/lib/*.run.ts',
      'docs/benchmarks/d10-harness/runs/_feedback/**/*.test.ts',
    ],
  },
});
