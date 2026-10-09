// @vitest-environment jsdom
/**
 * @future-ui/rc-consumer — 可复现运行入口（README / PR 命令）：
 *   pnpm --filter @future-ui/rc-consumer demo
 *
 * 打印【真实】四步接入结果（非硬编码）：
 *   1) Adapter：shadcn browser 面导出的真实组件与 frozen Profile；
 *   2) Profile：复用的 profile identity（profileId / version / scope）；
 *   3) AI View：真实组件 definitions（componentType / mappingStatus / limits）；
 *   4) UI 组件：真实 EditDialog 挂载后的渲染证据（role=dialog / aria-modal / 关闭入口）。
 * 断言仅为确定性守护；主要交付物是可复制命令 + 真实 stdout。
 */
import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { profile, readAiView, renderConsumerDemo } from '../src/consumer-demo.js';

const hr = (label: string): void => console.log(`\n===== ${label} =====`);

it('consumer: adapter + profile + AI view + one UI component (deterministic)', async () => {
  // Step 1/2 — Adapter 与 Profile
  hr('STEP 1/2 · ADAPTER + PROFILE');
  console.log(
    JSON.stringify(
      {
        adapter: 'shadcn (browser-safe surface)',
        profileId: profile.identity.profileId,
        profileVersion: profile.identity.profileVersion,
        scope: profile.identity.scope,
        explicitCloseEntries: profile.dialogConventions.explicitCloseEntries,
        escapeAndOverlayAreAdditionalOnly: profile.dialogConventions.escapeAndOverlayAreAdditionalOnly,
      },
      null,
      2,
    ),
  );

  // Step 3 — AI View
  hr('STEP 3 · AI VIEW (real definitions / limits)');
  const view = readAiView();
  console.log(
    JSON.stringify(
      {
        projectName: view.project.name,
        definitions: view.definitions.map((d) => ({
          componentType: d.componentType,
          mappingStatus: d.mappingStatus,
          identity: d.identity,
          limits: d.limits,
        })),
      },
      null,
      2,
    ),
  );

  // Step 4 — 运行一个 UI 组件
  hr('STEP 4 · RUN ONE UI COMPONENT (EditDialog rendered evidence)');
  const { unmount } = render(renderConsumerDemo());
  const dialog = document.querySelector('[role="dialog"]') as HTMLElement;
  const cancelBtn = document.querySelector('[data-testid="edit-dialog-cancel"]');
  const saveBtn = document.querySelector('[data-testid="edit-dialog-save"]');
  const evidence = {
    role: dialog?.getAttribute('role') ?? null,
    ariaModal: dialog?.getAttribute('aria-modal') ?? null,
    labelledbyText: screen.queryByText('成员编辑') ? '成员编辑 (DialogTitle)' : null,
    explicitCloseEntries: [cancelBtn ? 'cancel (取消)' : null, saveBtn ? 'save (保存并关闭)' : null].filter(
      Boolean,
    ),
  };
  console.log(JSON.stringify(evidence, null, 2));
  unmount();

  // Determinism guard
  expect(profile.identity.profileId).toBe('r1-edit-dialog-reference');
  expect(view.project.name).toBe('future-ui/r1-reference');
  expect(view.definitions.length).toBeGreaterThanOrEqual(3);
  expect(dialog).not.toBeNull();
  expect(dialog.getAttribute('aria-modal')).toBe('true');
  expect(cancelBtn).not.toBeNull();
  expect(saveBtn).not.toBeNull();
});
