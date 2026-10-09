// @vitest-environment jsdom
/**
 * R1-RC-001 (#86) — live validator helpers produce deterministic PASS / FAIL
 * against the frozen bounded rules, with 0 business tools (no Capability /
 * Binding). jsdom mirror of the in-browser panel; the drift gate itself is
 * Node-only and covered by the ai-dev test suite.
 */
import '../../ark-ui-adapter/tests/setup.js';
import { describe, expect, it } from 'vitest';
import { readAiViewSummaries, runNegativeValidator, runPositiveValidator } from '../src/index.js';

describe('live validator helpers (jsdom mirror)', () => {
  it('positive: real EditDialog evidence → R1-DLG-02 PASS (rendered) and 0 tools', async () => {
    const result = await runPositiveValidator();
    expect(result.toolCount).toBe(0);
    expect(result.evidence.role).toBe('dialog');
    expect(result.evidence.ariaModal).toBe(true);
    const close = result.findings.find((f) => f.ruleId === 'R1-DLG-02');
    expect(close).toBeDefined();
    expect(close!.status).toBe('pass');
    expect(close!.tier).toBe('rendered');
  });

  it('negative: dialog without any close entry → R1-DLG-02 FAIL with reason and repair hint', async () => {
    const result = await runNegativeValidator();
    const close = result.findings.find((f) => f.ruleId === 'R1-DLG-02');
    expect(close).toBeDefined();
    expect(close!.status).toBe('fail');
    expect(close!.reason).toContain('no explicit close entry');
    expect(close!.repairHint).toContain('close control');
  });

  it('read-only AI View summaries expose real identity, components and limits', () => {
    const summaries = readAiViewSummaries();
    expect(summaries.shadcn.adapterId).toBe('shadcn-react');
    expect(summaries.shadcn.profileId).toBe('r1-edit-dialog-reference');
    expect(summaries.mv.profileId).toBe('mv-auto-editor');
    expect(summaries.mv.upstreamArtifacts.length).toBeGreaterThanOrEqual(3);
    expect(summaries.mv.components.some((c) => c.componentType === 'future-ui.dialog')).toBe(true);
    expect(
      summaries.shadcn.components.find((c) => c.componentType === 'future-ui.button')?.limits.some(
        (l) => l.member === 'features.loading',
      ),
    ).toBe(true);
  });
});
