/**
 * @future-ui/rc-consumer — Future UI v0.1 最小 Consumer 示例（R1-RC-001 #86）。
 *
 * 演示四步接入，全部复用仓库既有资产（不新建 Profile / Contract / 框架，不触碰
 * MV-Auto-Editor 业务）：
 *   1) 选一个已支持的 Adapter —— 从浏览器安全面导入真实组件；
 *   2) 复用同一 Project Profile —— 显式引用 frozen profile，不复制；
 *   3) 读取 Project AI View —— Node 侧只读（buildShadcnProjectView）；
 *   4) 运行一个 UI 组件 —— 在测试宿主挂载 EditDialog 并收集真实渲染证据。
 *
 * 运行命令（一条）：
 *   pnpm --filter @future-ui/rc-consumer demo
 */
// Step 1 — 选 Adapter（浏览器安全面；Node-only 校验器不进入此 import 图）
import { EditDialog, editDialogProfile } from '@future-ui/shadcn-adapter/browser';
// Step 3 — 读取 Project AI View（Node 侧只读，与页面/命令同一来源）
import { buildShadcnProjectView } from '@future-ui/ai-dev';
import type { ReactElement } from 'react';

export { EditDialog, editDialogProfile } from '@future-ui/shadcn-adapter/browser';

/** Step 2 — 复用同一 Project Profile（不复制、不新建）。 */
export const profile = editDialogProfile;

/** Step 3 — AI View：真实 definitions / 版本 / 映射限制。 */
export function readAiView() {
  const built = buildShadcnProjectView();
  if (built.view === null) {
    throw new Error(`shadcn project view failed to build: ${built.diagnostics.map((d) => d.code).join(', ')}`);
  }
  return built.view;
}

/** Step 4 — 运行一个 UI 组件（真实 EditDialog，复用上面的 profile）。 */
export function renderConsumerDemo(): ReactElement {
  return (
    <EditDialog
      open
      profile={profile}
      label="成员编辑"
      description="Consumer 示例复用 r1-edit-dialog-reference Profile"
      fields={[
        { name: 'displayName', label: '名称', type: 'text', defaultValue: '' },
        { name: 'note', label: '备注', type: 'text', description: '仅内部可见' },
      ]}
      onSave={async () => {}}
      onOpenChange={() => {}}
    />
  );
}
