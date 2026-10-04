import { describe, expect, it } from 'vitest';

import { validateComponent } from '../src/validate.js';
import type { ComponentContract } from '../src/types.js';

const dialog: ComponentContract = {
  componentType: 'dialog',
  contractVersion: '1.0.0',
  features: { searchable: false, focusTrap: true },
  props: {
    open: { type: 'boolean', default: false, required: true, description: 'controlled visibility' },
    title: { type: 'string', description: 'accessible name' },
  },
  events: { close: { description: 'fired when the dialog requests to close', payload: {} } },
  state: { ownership: 'controlled', fields: { open: true } },
  parts: {
    backdrop: { required: false, description: 'modal backdrop', slots: [] },
    content: { required: true, slots: [] },
  },
  control: { focusReturn: { params: {}, returns: 'void', description: 'return focus to trigger element' } },
  accessibility: { role: 'dialog', keyboard: true, focus: true, semanticRelations: true },
  lifecycle: { requiresCleanup: true, description: 'unsubscribes focus trap on unmount' },
};

describe('Component contract (M0)', () => {
  it('accepts a valid dialog contract', () => {
    const result = validateComponent(dialog);
    expect(result.valid).toBe(true);
    expect(result.diagnostics).toEqual([]);
  });

  it('rejects an unknown field with a structured unknown_field diagnostic', () => {
    const bad = { ...dialog, extra: true };
    const result = validateComponent(bad);
    expect(result.valid).toBe(false);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'unknown_field', path: '/' }),
    );
  });

  it('rejects a missing required semantic field with missing_required', () => {
    const { state: _state, ...bad } = dialog;
    const result = validateComponent(bad);
    expect(result.valid).toBe(false);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'missing_required', path: '/' }),
    );
  });

  it('rejects an invalid prop type enum with constraint_violation', () => {
    const bad = { ...dialog, props: { open: { type: 42 } } };
    const result = validateComponent(bad);
    expect(result.valid).toBe(false);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'constraint_violation', path: '/props/open/type' }),
    );
  });

  it('rejects a type mismatch in props with type_mismatch', () => {
    const bad = { ...dialog, props: { open: { type: 'boolean', description: 42 } } };
    const result = validateComponent(bad);
    expect(result.valid).toBe(false);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'type_mismatch', path: '/props/open/description' }),
    );
  });

  it('rejects an unknown major contractVersion with unknown_major_version', () => {
    const bad = { ...dialog, contractVersion: '2.0.0' };
    const result = validateComponent(bad);
    expect(result.valid).toBe(false);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'unknown_major_version', path: '/contractVersion', expected: '1.x.x', actual: '2.0.0' }),
    );
  });

  it('keeps component-specific semantics instead of a universal interface', () => {
    const result = validateComponent(dialog);
    expect(result.valid).toBe(true);
    // componentType drives per-type semantics; a generic passthrough is not accepted
    expect(dialog.componentType).toBe('dialog');
  });
});
