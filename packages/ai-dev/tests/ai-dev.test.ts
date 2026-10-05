// @vitest-environment jsdom
/**
 * AI Preview/Test deterministic dev host acceptance (#25, M1-06A2).
 *
 * Maps all six acceptance criteria to deterministic tests:
 * 1. preview starts only a controlled dev fixture/render target (jsdom +
 *    conformance dom-provider), never a production runtime capability.
 * 2. test calls deterministic structure/interaction checks and returns
 *    structured results.
 * 3. structure / interaction / business correctness are distinguishable;
 *    component renders never claim business correctness.
 * 4. results carry nodePath / actual / expected / diagnostics / baseline.
 * 5. dev preview/test never enter the UI-only production dependency graph.
 * 6. no real model is called anywhere; no model SDK or network channel exists.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { preview, test } from '@future-ui/ai-dev';
import type { BusinessFixture, TestResult } from '@future-ui/ai-dev';

const ROOT = join(__dirname, '..', '..', '..');

const PRODUCTION_PACKAGES = [
  'packages/react-provider',
  'packages/theme',
  'packages/conformance',
  'packages/plugin-kernel',
  'packages/capability-runtime',
  'packages/cart-demo',
];

const MODEL_SDKS = ['openai', '@ai-sdk/react', 'ai', 'langchain', '@langchain/core'];

function collectSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...collectSourceFiles(p));
    else if (/\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

function collectImports(file: string): string[] {
  const src = readFileSync(file, 'utf8');
  const imports: string[] = [];
  const re = /(?:from\s+|import\s*\()\s*['"]([^'"]+)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) imports.push(m[1]);
  return imports;
}

/** Minimal in-memory business-layer fixture (CartService-style, #9 spirit). */
const cartFixture: BusinessFixture = {
  id: 'cart-service',
  run: (assertion) => {
    if (assertion['action'] === 'add-once') {
      return { ok: true, actual: { items: 1 }, expected: assertion['expected'] };
    }
    return { ok: false, explanation: `unknown assertion '${String(assertion['action'])}'` };
  },
};

describe('ui.preview (#25 acceptance 1)', () => {
  it('renders a button fixture with a locatable render target', () => {
    const out = preview({ componentId: 'button', props: { disabled: true } });
    expect(out.componentId).toBe('button');
    expect(out.host).toBe('dom');
    expect(out.renderTarget.rootPath).toBe('/button[0]');
    expect(out.renderTarget.nodes.length).toBeGreaterThan(0);
    const root = out.renderTarget.nodes[0];
    expect(root?.tag).toBe('button');
    expect(root?.attrs['disabled']).toBe('');
    expect(out.diagnostics).toEqual([]);
  });

  it('renders a select fixture incl. placeholder option nodes', () => {
    const out = preview({
      componentId: 'select',
      props: { options: [{ label: 'A', value: 'a' }], placeholder: 'Pick one' },
    });
    expect(out.renderTarget.rootPath).toBe('/select[0]');
    const optionNodes = out.renderTarget.nodes.filter((n) => n.tag === 'option');
    expect(optionNodes.map((n) => n.text)).toEqual(['Pick one', 'A']);
  });

  it('rejects a host outside the frozen whitelist (preview_unsupported_host)', () => {
    const out = preview({ componentId: 'button', host: 'react' as never });
    expect(out.renderTarget.nodes).toEqual([]);
    expect(out.diagnostics[0]?.code).toBe('preview_unsupported_host');
  });

  it('rejects an unsupported component (preview_unsupported_component)', () => {
    const out = preview({ componentId: 'dialog' as never });
    expect(out.diagnostics[0]?.code).toBe('preview_unsupported_component');
  });

  it('rejects props outside the contract-declared fields (preview_invalid_props)', () => {
    const out = preview({ componentId: 'button', props: { onClick: 'alert(1)' as never } });
    expect(out.renderTarget.nodes).toEqual([]);
    expect(out.diagnostics[0]?.code).toBe('preview_invalid_props');
    expect(out.diagnostics[0]?.path).toBe('/props/onClick');
  });

  it('rejects type-mismatched props (preview_invalid_props)', () => {
    const out = preview({ componentId: 'button', props: { disabled: 'yes' as never } });
    expect(out.diagnostics[0]?.code).toBe('preview_invalid_props');
    expect(out.diagnostics[0]?.expected).toBe("type 'boolean'");
  });
});

describe('ui.test structure checks (#25 acceptance 2/4)', () => {
  it('passes structure checks against the exact baseline', () => {
    const out = test({
      componentId: 'select',
      props: { options: [{ label: 'A', value: 'a' }], placeholder: 'Pick one' },
      checks: [
        { type: 'structure', path: '/select[0]', expect: { tag: 'select' } },
        { type: 'structure', path: '/select[0]/option[0]', expect: { tag: 'option', text: 'Pick one' } },
        { type: 'structure', path: '/select[0]/option[1]', expect: { tag: 'option', text: 'A' } },
      ],
    });
    expect(out.results).toHaveLength(3);
    expect(out.results.every((r) => r.ok)).toBe(true);
    expect(out.summary).toEqual({ total: 3, passed: 3, failed: 0 });
    expect(out.baseline.version).toBe('1.0.0');
  });

  it('returns structured mismatch with nodePath/actual/expected/diagnostics', () => {
    const out = test({
      componentId: 'select',
      props: { options: [{ label: 'A', value: 'a' }], placeholder: 'Pick one' },
      checks: [{ type: 'structure', path: '/select[0]/option[1]', expect: { tag: 'option', text: 'B' } }],
    });
    const result = out.results[0] as TestResult;
    expect(result?.ok).toBe(false);
    expect(result?.category).toBe('structure');
    expect(result?.nodePath).toBe('/select[0]/option[1]');
    expect(result?.actual).toEqual({ text: 'A' });
    expect(result?.expected).toEqual({ tag: 'option', text: 'B' });
    expect(result?.diagnostics?.[0]?.code).toBe('test_structure_mismatch');
  });

  it('fails with a locatable diagnosis when a node path is absent', () => {
    const out = test({
      componentId: 'button',
      checks: [{ type: 'structure', path: '/button[0]/span[0]', expect: { tag: 'span' } }],
    });
    const result = out.results[0] as TestResult;
    expect(result?.ok).toBe(false);
    expect(result?.actual).toBeUndefined();
    expect(result?.diagnostics?.[0]?.code).toBe('test_structure_mismatch');
  });
});

describe('ui.test interaction checks (#25 acceptance 2/3)', () => {
  it('click dispatches the click event deterministically', () => {
    const out = test({
      componentId: 'button',
      checks: [{ type: 'interaction', action: { kind: 'click' }, expect: { event: 'click' } }],
    });
    expect(out.results[0]?.ok).toBe(true);
    expect(out.results[0]?.category).toBe('interaction');
  });

  it('keyboard Enter activation mirrors the button contract', () => {
    const out = test({
      componentId: 'button',
      checks: [
        { type: 'interaction', action: { kind: 'key', key: 'Enter' }, expect: { event: 'click' } },
        { type: 'interaction', action: { kind: 'key', key: ' ' }, expect: { event: 'click' } },
      ],
    });
    expect(out.results.every((r) => r.ok)).toBe(true);
  });

  it('change dispatches valueChange and updates controlled state', () => {
    const out = test({
      componentId: 'select',
      props: { options: [{ label: 'A', value: 'a' }], defaultValue: 'a' },
      checks: [
        {
          type: 'interaction',
          action: { kind: 'change', value: 'a' },
          expect: { event: 'valueChange', state: { value: 'a' } },
        },
      ],
    });
    const result = out.results[0] as TestResult;
    expect(result?.ok).toBe(true);
    expect(result?.nodePath).toBe('/select[0]');
  });

  it('disabled elements emit no event — mismatch is reported structurally', () => {
    const out = test({
      componentId: 'button',
      props: { disabled: true },
      checks: [{ type: 'interaction', action: { kind: 'click' }, expect: { event: 'click' } }],
    });
    const result = out.results[0] as TestResult;
    expect(result?.ok).toBe(false);
    expect(result?.actual).toEqual({ event: '(none)' });
    expect(result?.diagnostics?.[0]?.code).toBe('test_interaction_mismatch');
  });

  it('rejects an unknown interaction action (test_unknown_check)', () => {
    const out = test({
      componentId: 'button',
      checks: [{ type: 'interaction', action: { kind: 'hover' as never }, expect: {} }],
    });
    const result = out.results[0] as TestResult;
    expect(result?.ok).toBe(false);
    expect(result?.diagnostics?.[0]?.code).toBe('test_unknown_check');
  });

  it('asserts focusPath against the real active element (no fake focus)', () => {
    const out = test({
      componentId: 'button',
      checks: [{ type: 'interaction', action: { kind: 'click' }, expect: { focusPath: '/button[0]' } }],
    });
    // jsdom does not move focus on click; the checker reports the real state.
    const result = out.results[0] as TestResult;
    expect(result?.ok).toBe(false);
    expect(result?.actual).toHaveProperty('focusPath');
  });
});

describe('ui.test baseline & business (#25 acceptance 3/4)', () => {
  it('rejects a stale baseline (test_baseline_missing) — no blind run', () => {
    const out = test({
      componentId: 'button',
      baseline: { version: '9.9.9' },
      checks: [{ type: 'structure', path: '/button[0]', expect: { tag: 'button' } }],
    });
    const result = out.results[0] as TestResult;
    expect(result?.ok).toBe(false);
    expect(result?.diagnostics?.[0]?.code).toBe('test_baseline_missing');
  });

  it('business results come only from an injected business fixture (businessSource)', () => {
    const out = test({
      componentId: 'button',
      businessFixtures: [cartFixture],
      checks: [
        { type: 'business', source: 'cart-service', assertion: { action: 'add-once' }, expect: { ok: true } },
      ],
    });
    const result = out.results[0] as TestResult;
    expect(result?.ok).toBe(true);
    expect(result?.category).toBe('business');
    expect(result?.businessSource).toBe('cart-service');
  });

  it('business check without an injected fixture fails (business_fixture_required)', () => {
    const out = test({
      componentId: 'button',
      checks: [{ type: 'business', source: 'cart-service', assertion: { action: 'add-once' }, expect: { ok: true } }],
    });
    const result = out.results[0] as TestResult;
    expect(result?.ok).toBe(false);
    expect(result?.category).toBe('business');
    expect(result?.businessSource).toBe('cart-service');
    expect(result?.diagnostics?.[0]?.code).toBe('business_fixture_required');
  });

  it('component render results are never labelled business (no silent business PASS)', () => {
    const out = test({
      componentId: 'button',
      checks: [{ type: 'interaction', action: { kind: 'click' }, expect: { event: 'click' } }],
    });
    expect(out.results.every((r) => r.category !== 'business')).toBe(true);
  });
});

describe('ui.test guard rails (#25 acceptance 1/6)', () => {
  it('rejects an unsupported component before rendering', () => {
    const out = test({ componentId: 'dialog' as never, checks: [] });
    expect(out.summary.total).toBe(0);
    expect(out.baseline.version).toBe('0.0.0');
  });

  it('rejects non-contract props before rendering (no arbitrary JS input)', () => {
    const out = test({
      componentId: 'button',
      props: { dangerouslySetInnerHTML: { __html: '<script>' } as never },
      checks: [{ type: 'structure', path: '/button[0]', expect: { tag: 'button' } }],
    });
    expect(out.results[0]?.ok).toBe(false);
    expect(out.results[0]?.diagnostics?.[0]?.code).toBe('preview_invalid_props');
  });
});

describe('production isolation & no-model boundary (#25 acceptance 5/6)', () => {
  it.each(PRODUCTION_PACKAGES)('%s declares no @future-ui/ai-dev dependency', (pkgDir) => {
    const manifest = JSON.parse(readFileSync(join(ROOT, pkgDir, 'package.json'), 'utf8'));
    const allDeps = {
      ...(manifest.dependencies ?? {}),
      ...(manifest.devDependencies ?? {}),
      ...(manifest.peerDependencies ?? {}),
    };
    expect(allDeps['@future-ui/ai-dev']).toBeUndefined();
  });

  it.each(PRODUCTION_PACKAGES)('%s source never imports @future-ui/ai-dev', (pkgDir) => {
    const srcDir = join(ROOT, pkgDir, 'src');
    const files = collectSourceFiles(srcDir);
    const violations: string[] = [];
    for (const file of files) {
      for (const specifier of collectImports(file)) {
        if (specifier === '@future-ui/ai-dev' || specifier.startsWith('@future-ui/ai-dev/')) {
          violations.push(`${file.replace(ROOT + '/', '')} -> ${specifier}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it('ai-dev declares no model SDK and imports no model SDK anywhere', () => {
    const manifest = JSON.parse(readFileSync(join(ROOT, 'packages/ai-dev/package.json'), 'utf8'));
    const allDeps = {
      ...(manifest.dependencies ?? {}),
      ...(manifest.devDependencies ?? {}),
      ...(manifest.peerDependencies ?? {}),
    };
    for (const sdk of MODEL_SDKS) {
      expect(allDeps[sdk]).toBeUndefined();
    }
    const files = collectSourceFiles(join(ROOT, 'packages/ai-dev/src'));
    for (const file of files) {
      for (const specifier of collectImports(file)) {
        expect(MODEL_SDKS.some((s) => specifier === s || specifier.startsWith(s + '/'))).toBe(false);
      }
    }
  });

  it('ai-dev source has no network channel (no fetch/WebSocket/XHR/http)', () => {
    const files = collectSourceFiles(join(ROOT, 'packages/ai-dev/src'));
    for (const file of files) {
      const src = readFileSync(file, 'utf8');
      expect(src).not.toMatch(/\bfetch\s*\(/);
      expect(src).not.toMatch(/new\s+WebSocket\s*\(/);
      expect(src).not.toMatch(/XMLHttpRequest/);
      expect(src).not.toMatch(/require\(['"]https?['"]\)/);
      expect(src).not.toMatch(/from\s+['"]https?:\/\//);
    }
  });
});
