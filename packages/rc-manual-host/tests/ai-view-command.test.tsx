// @vitest-environment jsdom
/**
 * R1-RC-001 (#86) · P1 AI 开发命令入口（README: `pnpm --filter @future-ui/rc-manual-host ai-view`）
 *
 * 在现有 Node/jsdom 测试宿主中稳定运行，打印【真实】Project AI View 与 Validator
 * 正/负例结果 —— 数据全部来自 @future-ui/ai-dev + 真实 EditDialog 渲染证据：
 *   - AI View：组件 definitions（componentType / mappingStatus / limits）、
 *     upstream 版本（contentHash 摘要）、映射限制（member/status/reason）；
 *   - Validator 正例：真实 EditDialog 证据 → R1-DLG-02 PASS（tier=rendered）；
 *   - Validator 负例：无任何关闭入口的 dialog → R1-DLG-02 FAIL（ruleId/reason/repairHint）。
 * 不打印硬编码假数据；不在浏览器运行 Node-only validator；不引入新通用 CLI。
 * 下方断言仅为确定性守护，主用途是“可复制命令 + 真实 stdout”。
 */
import '../../ark-ui-adapter/tests/setup.js';
import { expect, it } from 'vitest';
import { readAiViewSummaries, runNegativeValidator, runPositiveValidator } from '../src/index.js';

const hr = (label: string): void => console.log(`\n===== ${label} =====`);

it('prints real Project AI View and validator PASS/FAIL output (deterministic)', async () => {
  // 1) Project AI View —— 真实 definitions / versions / limits
  const summaries = readAiViewSummaries();
  hr('AI VIEW · shadcn (r1-edit-dialog-reference)');
  console.log(
    JSON.stringify(
      {
        projectName: summaries.shadcn.projectName,
        adapterId: summaries.shadcn.adapterId,
        profileId: summaries.shadcn.profileId,
        // vendored upstream — no external upstream artifacts to digest
        upstreamArtifacts: [],
        components: summaries.shadcn.components,
      },
      null,
      2,
    ),
  );
  hr('AI VIEW · mv-auto-editor (read-only sample)');
  console.log(
    JSON.stringify(
      {
        projectName: summaries.mv.projectName,
        adapterId: summaries.mv.adapterId,
        profileId: summaries.mv.profileId,
        upstreamArtifacts: summaries.mv.upstreamArtifacts,
        components: summaries.mv.components,
      },
      null,
      2,
    ),
  );

  // 2) Validator 正例 —— 真实 EditDialog 渲染证据
  const positive = await runPositiveValidator();
  hr('VALIDATOR · POSITIVE (real EditDialog rendered evidence)');
  console.log(
    JSON.stringify(
      {
        evidence: positive.evidence,
        findings: positive.findings.map((f) => ({
          ruleId: f.ruleId,
          status: f.status,
          tier: f.tier,
          reason: f.reason,
          repairHint: f.repairHint,
        })),
        toolCount: positive.toolCount,
      },
      null,
      2,
    ),
  );

  // 3) Validator 负例 —— 无任何关闭入口的 dialog
  const negative = await runNegativeValidator();
  hr('VALIDATOR · NEGATIVE (no explicit close entry)');
  console.log(
    JSON.stringify(
      {
        evidence: negative.evidence,
        findings: negative.findings.map((f) => ({
          ruleId: f.ruleId,
          status: f.status,
          tier: f.tier,
          reason: f.reason,
          repairHint: f.repairHint,
        })),
        toolCount: negative.toolCount,
      },
      null,
      2,
    ),
  );

  // Determinism guard (same facts the validator-demo suite asserts)
  expect(summaries.shadcn.adapterId).toBe('shadcn-react');
  expect(summaries.shadcn.profileId).toBe('r1-edit-dialog-reference');
  expect(summaries.mv.profileId).toBe('mv-auto-editor');
  expect(summaries.mv.upstreamArtifacts.length).toBeGreaterThanOrEqual(3);
  const positiveClose = positive.findings.find((f) => f.ruleId === 'R1-DLG-02');
  expect(positiveClose?.status).toBe('pass');
  expect(positiveClose?.tier).toBe('rendered');
  const negativeClose = negative.findings.find((f) => f.ruleId === 'R1-DLG-02');
  expect(negativeClose?.status).toBe('fail');
  expect(negativeClose?.reason).toContain('no explicit close entry');
  expect(negativeClose?.repairHint).toContain('close control');
  expect(positive.toolCount).toBe(0);
  expect(negative.toolCount).toBe(0);
});
