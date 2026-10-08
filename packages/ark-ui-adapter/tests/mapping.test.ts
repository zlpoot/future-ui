import { describe, expect, it } from 'vitest';

import { buttonContract, dialogContract, textInputContract } from '@future-ui/react-provider';

import {
  arkButtonMapping,
  arkComponentMappings,
  arkDialogMapping,
  arkTextInputMapping,
  hasArkErrors,
  r1ArkAdapterErrorCodes,
  validateArkComponentMapping,
  validateArkMappings,
} from '../src/index.js';
import type { ArkComponentMapping } from '../src/index.js';

function clone(m: ArkComponentMapping): ArkComponentMapping {
  return structuredClone(m);
}

describe('Ark adapter mapping — frozen contract anchoring', () => {
  it('covers exactly Dialog, Button, TextInput against contractVersion 1.0.0', () => {
    expect(arkComponentMappings.map((m) => m.anchor.componentType)).toEqual([
      'future-ui.dialog',
      'future-ui.button',
      'future-ui.text-input',
    ]);
    for (const m of arkComponentMappings) {
      expect(m.anchor.contractVersion).toBe('1.0.0');
    }
  });

  it('Dialog = supported (real Ark primitive across every literal domain)', () => {
    const { diagnostics, report } = validateArkComponentMapping(arkDialogMapping, dialogContract);
    expect(diagnostics).toEqual([]);
    expect(report.status).toBe('supported');
    expect(report.unsupported).toEqual([]);
  });

  it('Button = partial: only loading is unsupported (no Ark Button primitive)', () => {
    const { diagnostics, report } = validateArkComponentMapping(arkButtonMapping, buttonContract);
    expect(diagnostics).toEqual([]);
    expect(report.status).toBe('partial');
    expect(report.unsupported).toContain('features.loading');
    expect(report.unsupported).toContain('props.loading');
    expect(report.unsupported).toContain('state.loading');
    // disabled/click/root remain genuinely mapped.
    expect(report.unsupported).not.toContain('parts.root');
    expect(report.unsupported).not.toContain('events.click');
  });

  it('TextInput = partial: only the cross-type role guarantee is unsupported', () => {
    const { diagnostics, report } = validateArkComponentMapping(arkTextInputMapping, textInputContract);
    expect(diagnostics).toEqual([]);
    expect(report.status).toBe('partial');
    expect(report.unsupported).toEqual(['accessibility.role']);
  });

  it('all three tables validate together with no diagnostics', () => {
    const { diagnostics, reports } = validateArkMappings([
      { mapping: arkDialogMapping, contract: dialogContract },
      { mapping: arkButtonMapping, contract: buttonContract },
      { mapping: arkTextInputMapping, contract: textInputContract },
    ]);
    expect(diagnostics).toEqual([]);
    expect(reports.map((r) => r.status)).toEqual(['supported', 'partial', 'partial']);
  });
});

describe('Ark adapter mapping — fail-closed negatives', () => {
  it('anchor componentType drift is rejected', () => {
    const m = clone(arkDialogMapping);
    m.anchor.componentType = 'future-ui.button';
    const { diagnostics } = validateArkComponentMapping(m, dialogContract);
    expect(diagnostics.some((d) => d.code === 'r1_ark_adapter_anchor_mismatch')).toBe(true);
  });

  it('anchor contractVersion drift is rejected', () => {
    const m = clone(arkDialogMapping);
    m.anchor.contractVersion = '2.0.0';
    const { diagnostics } = validateArkComponentMapping(m, dialogContract);
    expect(diagnostics.some((d) => d.code === 'r1_ark_adapter_anchor_mismatch')).toBe(true);
  });

  it('removing a frozen member conclusion is a member_missing error', () => {
    const m = clone(arkDialogMapping);
    m.domains.events = m.domains.events.filter((c) => c.member !== 'openChange');
    const { diagnostics, report } = validateArkComponentMapping(m, dialogContract);
    expect(diagnostics.some((d) => d.code === 'r1_ark_adapter_member_missing' && d.path.includes('openChange'))).toBe(true);
    expect(report.missing).toContain('events.openChange');
  });

  it('a conclusion naming a non-contract member is unknown_member', () => {
    const m = clone(arkDialogMapping);
    m.domains.parts.push({ member: 'ghost', status: 'mapped', via: 'native', mapsTo: 'x' });
    const { diagnostics } = validateArkComponentMapping(m, dialogContract);
    expect(diagnostics.some((d) => d.code === 'r1_ark_adapter_unknown_member')).toBe(true);
  });

  it('mapped without via/mapsTo is rejected', () => {
    const m = clone(arkDialogMapping);
    m.domains.props = m.domains.props.map((c) => (c.member === 'open' ? { ...c, via: undefined, mapsTo: '' } : c));
    const { diagnostics } = validateArkComponentMapping(m, dialogContract);
    expect(diagnostics.filter((d) => d.code === 'r1_ark_adapter_evidence_required').length).toBeGreaterThan(0);
  });

  it('unsupported without reason/impact is rejected (no hand-wave)', () => {
    const m = clone(arkButtonMapping);
    m.domains.features = m.domains.features.map((c) =>
      c.member === 'loading' ? { ...c, reason: '', impact: '' } : c,
    );
    const { diagnostics } = validateArkComponentMapping(m, buttonContract);
    expect(diagnostics.filter((d) => d.code === 'r1_ark_adapter_reason_required').length).toBeGreaterThan(0);
  });

  it('member-level not-applicable is a forbidden fail-open escape', () => {
    const m = clone(arkButtonMapping);
    m.domains.features = m.domains.features.map((c) =>
      c.member === 'loading'
        ? { member: 'loading', status: 'not-applicable' as const }
        : c,
    );
    const { diagnostics } = validateArkComponentMapping(m, buttonContract);
    expect(diagnostics.some((d) => d.code === 'r1_ark_adapter_not_applicable_forbidden')).toBe(true);
  });

  it('empty token domain is rejected (headless scope must be confessed)', () => {
    const m = clone(arkDialogMapping);
    m.domains.token = [];
    const { diagnostics } = validateArkComponentMapping(m, dialogContract);
    expect(diagnostics.some((d) => d.code === 'r1_ark_adapter_token_unbacked')).toBe(true);
  });

  it('P2: a fabricated MAPPED visual token is rejected (headless cannot provide one)', () => {
    const m = clone(arkDialogMapping);
    m.domains.token = [
      {
        member: 'visual-layer',
        status: 'mapped',
        via: 'composition',
        mapsTo: 'some host stylesheet',
        evidence: 'claimed',
      },
    ];
    const { diagnostics } = validateArkComponentMapping(m, dialogContract);
    expect(diagnostics.some((d) => d.code === 'r1_ark_adapter_token_false_claim')).toBe(true);
  });

  it('P2: an inherited-equivalent visual token is also rejected (tokens are not inherited)', () => {
    const m = clone(arkDialogMapping);
    m.domains.token = [
      { member: 'visual-layer', status: 'inherited-equivalent', evidence: 'claimed platform default' },
    ];
    const { diagnostics } = validateArkComponentMapping(m, dialogContract);
    expect(diagnostics.some((d) => d.code === 'r1_ark_adapter_token_false_claim')).toBe(true);
  });

  it('P2 (no false positive): an honest headless `unsupported` token with reason+impact is accepted', () => {
    const m = clone(arkDialogMapping);
    m.domains.token = [
      {
        member: 'visual-layer',
        status: 'unsupported',
        reason: '@ark-ui/react@5.39.3 ships no CSS/theme/design tokens (JS/.d.ts only).',
        impact: 'All visuals are the host application responsibility; jsdom asserts structure, never pixels.',
      },
    ];
    const { diagnostics } = validateArkComponentMapping(m, dialogContract);
    expect(diagnostics.some((d) => d.code === 'r1_ark_adapter_token_unbacked')).toBe(false);
    expect(diagnostics.some((d) => d.code === 'r1_ark_adapter_token_false_claim')).toBe(false);
  });

  it('P2 (scope): Dialog is supported across the 8 semantic domains while the token layer is independently unsupported', () => {
    const { diagnostics, report } = validateArkComponentMapping(arkDialogMapping, dialogContract);
    expect(diagnostics).toEqual([]);
    // supported means the 8 Component Contract semantic domains; it does NOT
    // claim visual-token support, which stays honestly unsupported.
    expect(report.status).toBe('supported');
    expect(report.unsupported).toEqual([]);
    expect(arkDialogMapping.domains.token).toHaveLength(1);
    expect(arkDialogMapping.domains.token[0]?.status).toBe('unsupported');
  });

  it('diagnostic code set is the package-independent namespace', () => {
    for (const code of r1ArkAdapterErrorCodes) expect(code).toMatch(/^r1_ark_adapter_/);
    const { diagnostics } = validateArkComponentMapping(clone(arkDialogMapping), dialogContract);
    expect(hasArkErrors(diagnostics)).toBe(false);
  });
});
