import { describe, expect, it } from 'vitest';

import {
  buttonMapping,
  componentMappings,
  dialogMapping,
  textInputMapping,
  validateAdapterMappings,
  validateComponentMapping,
  validateMappingProfileLinkage,
  getComponentMappingReports,
} from '../src/index.js';
import { editDialogProfile, tryResolveToken } from '../src/index.js';

describe('D15 mapping tables', () => {
  it('all three shipped mappings validate against the frozen contracts', () => {
    expect(validateAdapterMappings()).toEqual([]);
  });

  it('covers the three frozen R1 component types', () => {
    expect(componentMappings.map((m) => m.anchor.componentType)).toEqual([
      'future-ui.dialog',
      'future-ui.button',
      'future-ui.text-input',
    ]);
  });

  it('flags a missing member-level conclusion', () => {
    const broken = structuredClone(buttonMapping);
    broken.domains.events = [];
    const diagnostics = validateComponentMapping(broken);
    expect(diagnostics.some((d) => d.code === 'r1_adapter_member_missing' && d.path.includes('events/click'))).toBe(true);
  });

  it('flags an inherited-equivalent conclusion without evidence', () => {
    const broken = structuredClone(dialogMapping);
    broken.domains.accessibility[0] = { member: 'role', status: 'inherited-equivalent' };
    const diagnostics = validateComponentMapping(broken);
    expect(diagnostics.some((d) => d.code === 'r1_adapter_evidence_required')).toBe(true);
  });

  it('flags an unknown member invented in a contract domain', () => {
    const broken = structuredClone(textInputMapping);
    broken.domains.control.push({ member: 'scrollIntoView', status: 'mapped', via: 'native', mapsTo: 'x' });
    const diagnostics = validateComponentMapping(broken);
    expect(diagnostics.some((d) => d.code === 'r1_adapter_unknown_member')).toBe(true);
  });

  it('flags a mismatched contract version anchor', () => {
    const broken = structuredClone(dialogMapping);
    broken.anchor.contractVersion = '2.0.0';
    const diagnostics = validateComponentMapping(broken);
    expect(diagnostics.some((d) => d.code === 'r1_adapter_anchor_mismatch')).toBe(true);
  });

  it('requires an empty token domain to be rejected (zero visual mapping)', () => {
    const broken = structuredClone(buttonMapping);
    broken.domains.token = [];
    const diagnostics = validateComponentMapping(broken);
    expect(diagnostics.some((d) => d.code === 'r1_adapter_token_domain_empty')).toBe(true);
  });

  it('reports Dialog supported; Button partial (loading) and TextInput partial (type/role)', () => {
    const reports = Object.fromEntries(getComponentMappingReports().map((r) => [r.componentType, r]));
    expect(reports['future-ui.dialog'].status).toBe('supported');
    expect(reports['future-ui.button'].status).toBe('partial');
    expect(reports['future-ui.button'].unsupported).toContain('features.loading');
    expect(reports['future-ui.button'].unsupported).toContain('props.loading');
    expect(reports['future-ui.button'].unsupported).toContain('state.loading');
    // TextInput cannot be "supported": the frozen contract claims role=textbox
    // for all contracted types, but number/search/password have different/none
    // implicit roles.
    expect(reports['future-ui.text-input'].status).toBe('partial');
    expect(reports['future-ui.text-input'].unsupported).toContain('accessibility.role');
  });

  it('rejects not-applicable on an enumerated contract member (no fail-open escape)', () => {
    const broken = structuredClone(textInputMapping);
    // Try to wave away the very role mismatch as "not-applicable" + a reason.
    broken.domains.accessibility = broken.domains.accessibility.map((c) =>
      c.member === 'role'
        ? { member: 'role', status: 'not-applicable', reason: 'pretend it does not apply' }
        : c,
    );
    const diagnostics = validateComponentMapping(broken);
    expect(
      diagnostics.some(
        (d) => d.code === 'r1_adapter_not_applicable_forbidden' && d.path.endsWith('accessibility/role'),
      ),
    ).toBe(true);
    // And such a table must not be able to surface as "supported": any
    // diagnostic forces at most "partial" (see reportFor).
    expect(diagnostics.length).toBeGreaterThan(0);
  });

  it('validates every token conclusion (no fail-open in the token domain)', () => {
    // token conclusion marked not-applicable
    const na = structuredClone(buttonMapping);
    na.domains.token[0] = { member: 'control.radius', status: 'not-applicable', reason: 'x' };
    const dNA = validateComponentMapping(na);
    expect(
      dNA.some((d) => d.code === 'r1_adapter_not_applicable_forbidden' && d.path.endsWith('token/control.radius')),
    ).toBe(true);

    // token conclusion with an illegal status
    const bad = structuredClone(buttonMapping);
    bad.domains.token[0] = { member: 'control.radius', status: 'bogus' as never };
    const dBad = validateComponentMapping(bad);
    expect(dBad.some((d) => d.code === 'r1_adapter_bad_status' && d.path.endsWith('token/control.radius'))).toBe(true);

    // token conclusion mapped but missing via/mapsTo
    const incomplete = structuredClone(buttonMapping);
    incomplete.domains.token[0] = { member: 'control.radius', status: 'mapped' };
    const dIncomplete = validateComponentMapping(incomplete);
    expect(
      dIncomplete.some((d) => d.code === 'r1_adapter_bad_status' && d.path.endsWith('token/control.radius')),
    ).toBe(true);

    // Any of these malformed tables must stay below "supported".
    expect(dNA.length).toBeGreaterThan(0);
    expect(dBad.length).toBeGreaterThan(0);
    expect(dIncomplete.length).toBeGreaterThan(0);
  });

  it('every concrete profileTokenKey resolves in the D16 Project Profile', () => {
    for (const mapping of componentMappings) {
      const diagnostics = validateMappingProfileLinkage(mapping, (key) => tryResolveToken(editDialogProfile, key));
      expect(diagnostics, `${mapping.anchor.componentType} linkage: ${diagnostics.map((d) => d.path).join(', ')}`).toEqual([]);
    }
  });

  it('shipped mapping data is frozen', () => {
    expect(Object.isFrozen(dialogMapping)).toBe(true);
    expect(Object.isFrozen(dialogMapping.domains)).toBe(true);
    expect(Object.isFrozen(buttonMapping.domains.props)).toBe(true);
    expect(Object.isFrozen(textInputMapping.domains.token[0])).toBe(true);
  });
});
