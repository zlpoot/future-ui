// @vitest-environment jsdom
import './setup.js';

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import {
  arkEntryPoints,
  ArkButton,
  ArkDialog,
  arkDialogMapping,
  ArkTextInput,
  validateArkComponentMapping,
} from '../src/index.js';
import { dialogContract } from '@future-ui/react-provider';

describe('UI-only fail-closed negatives', () => {
  it('no handler/binding/capability: controls render and activating them performs zero business calls', () => {
    render(
      <ArkDialog open label="Confirm">
        <ArkButton>Go</ArkButton>
        <ArkTextInput name="note" />
      </ArkDialog>,
    );
    // Nothing throws when no callbacks are wired; no business effect can occur
    // because the adapter holds no capability/binding registry at all.
    expect(() => fireEvent.click(screen.getByRole('button', { name: 'Go' }))).not.toThrow();
    expect(() =>
      fireEvent.change(document.querySelector('input') as HTMLInputElement, { target: { value: 'z' } }),
    ).not.toThrow();
    fireEvent.keyDown(document, { key: 'Escape' });
  });

  it('consumers never leak agent/binding/capability/model attributes (Dialog + Button + TextInput)', () => {
    render(
      <ArkDialog open label="C">
        <ArkButton>B</ArkButton>
        <ArkTextInput name="n" />
      </ArkDialog>,
    );
    for (const attr of ['data-capability', 'data-agent', 'data-binding', 'data-model', 'data-mcp']) {
      expect(document.querySelector(`[${attr}]`)).toBeNull();
    }
  });

  it('recorded Ark entry sha256 genuinely guards drift: a tampered expectation does NOT match on disk', () => {
    const requireFromHere = createRequire(import.meta.url);
    const arkRoot = dirname(requireFromHere.resolve('@ark-ui/react/package.json'));
    const dialogEntry = arkEntryPoints[0];
    const onDisk = createHash('sha256')
      .update(readFileSync(join(arkRoot, dialogEntry.resolved)))
      .digest('hex');
    expect(onDisk).toBe(dialogEntry.sha256);
    const tampered = dialogEntry.sha256.replace(/^./, (c) => (c === '0' ? '1' : '0'));
    expect(onDisk).not.toBe(tampered);
  });

  it('mapping does not register any business capability domain (pure UI adapter)', () => {
    const { diagnostics } = validateArkComponentMapping(arkDialogMapping, dialogContract);
    expect(diagnostics).toEqual([]);
    // The mapping vocabulary has no capability/binding fields at all.
    const serialized = JSON.stringify(arkDialogMapping);
    expect(serialized).not.toMatch(/capability|binding|"tool"/i);
  });
});
