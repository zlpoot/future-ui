import type { ComponentContract } from '@future-ui/contracts';
import { validateComponent } from '@future-ui/contracts';
import { PREVIEW_CONTRACTS, renderPreview, validatePreviewProps } from './preview.js';
import type { PreviewComponentId } from './preview.js';
import type { DevDiagnostic } from './errors.js';

/**
 * ui.test — deterministic contract interaction checks (M0-08 §2.2).
 *
 * Executes controlled structure/interaction checks against a fixture rendered
 * by the DOM provider in jsdom and returns STRUCTURED results (checkId,
 * category, nodePath, actual/expected exact baseline, diagnostics) for the
 * development AI. It does NOT call a real model, does no visual judgment and
 * does no browser autonomous agent.
 *
 * Three correctness categories are kept distinguishable (M0-08 §2.3):
 * - structure: DOM nodes/parts/attrs vs exact baseline;
 * - interaction: events/focus/controlled state triggered deterministically;
 * - business: ONLY via a caller-injected business-layer fixture
 *   (businessSource); a component render never claims business correctness.
 */

export interface StructureExpectation {
  tag?: string;
  part?: string;
  attrs?: Record<string, string>;
  text?: string;
}

export interface StructureCheck {
  type: 'structure';
  path: string;
  expect: StructureExpectation;
}

export interface InteractionAction {
  kind: 'click' | 'change' | 'key';
  /** Element path to act on; defaults to the root. */
  target?: string;
  /** value for 'change'. */
  value?: string;
  /** key for 'key' (e.g. 'Enter', ' '). */
  key?: string;
}

export interface InteractionExpectation {
  /** Expected last event kind: 'click' | 'valueChange'. */
  event?: string;
  /** Expected controlled state read from the element (e.g. { value: 'a' }, { disabled: true }). */
  state?: Record<string, unknown>;
  /** Expected document.activeElement path after the action. */
  focusPath?: string;
}

export interface InteractionCheck {
  type: 'interaction';
  action: InteractionAction;
  expect: InteractionExpectation;
}

/** Business-layer fixture injected by the caller — the only source of business correctness. */
export interface BusinessFixture {
  id: string;
  run: (assertion: Record<string, unknown>) => {
    ok: boolean;
    actual?: unknown;
    expected?: unknown;
    explanation?: string;
  };
}

export interface BusinessCheck {
  type: 'business';
  /** business fixture id; must match an injected BusinessFixture. */
  source: string;
  assertion: Record<string, unknown>;
  expect: { ok: boolean };
}

export type TestCheck = StructureCheck | InteractionCheck | BusinessCheck;

export type CheckCategory = 'structure' | 'interaction' | 'business';

export interface TestInput {
  componentId: PreviewComponentId;
  props?: Record<string, unknown>;
  checks: TestCheck[];
  /** exact baseline version (same spirit as #22 NodeStore expectedVersion). */
  baseline?: { version: string };
  /** business-layer fixtures; without them business checks fail with business_fixture_required. */
  businessFixtures?: BusinessFixture[];
}

export interface TestResult {
  checkId: string;
  ok: boolean;
  category: CheckCategory;
  nodePath?: string;
  actual?: unknown;
  expected?: unknown;
  diagnostics?: DevDiagnostic[];
  /** set only when the result was produced by a business-layer fixture. */
  businessSource?: string;
}

export interface TestOutput {
  results: TestResult[];
  summary: { total: number; passed: number; failed: number };
  componentId: string;
  baseline: { version: string };
}

function devDiag(
  code: DevDiagnostic['code'],
  path: string,
  expected: unknown,
  actual: unknown,
  explanation: string,
  repairHint?: string,
): DevDiagnostic {
  return { code, path, expected, actual, explanation, repairHint };
}

interface EventLogEntry {
  kind: 'click' | 'valueChange';
  appId: string;
  value?: string | null;
}

/** Collects path -> element for locatable node resolution. */
function collectElementMap(root: HTMLElement, rootPath: string): Map<string, Element> {
  const map = new Map<string, Element>();
  const walk = (node: Element, path: string): void => {
    map.set(path, node);
    for (let i = 0; i < node.children.length; i += 1) {
      walk(node.children[i], `${path}/${node.children[i].tagName.toLowerCase()}[${i}]`);
    }
  };
  walk(root, rootPath);
  return map;
}

/** Reads the controlled state surface of a rendered element (declared fields only). */
function readState(el: Element, key: string): unknown {
  switch (key) {
    case 'disabled':
      return (el as HTMLButtonElement | HTMLSelectElement).disabled;
    case 'value':
      return (el as HTMLSelectElement).value;
    case 'aria-busy':
      return el.getAttribute('aria-busy') ?? null;
    default:
      return undefined;
  }
}

function structureFailure(
  checkId: string,
  path: string,
  expectation: StructureExpectation,
  actual: unknown,
  explanation: string,
): TestResult {
  return {
    checkId,
    ok: false,
    category: 'structure',
    nodePath: path,
    actual,
    expected: expectation,
    diagnostics: [devDiag('test_structure_mismatch', path, expectation, actual, explanation, 'align the node with the exact baseline expectation')],
  };
}

function evaluateStructure(checkId: string, check: StructureCheck, map: Map<string, Element>): TestResult {
  const node = map.get(check.path);
  if (node === undefined) {
    return structureFailure(checkId, check.path, check.expect, undefined, `node path '${check.path}' not found in the render target`);
  }
  const actual: Record<string, unknown> = {};
  const mismatches: string[] = [];
  const tag = node.tagName.toLowerCase();
  const part = node.getAttribute('data-part') ?? undefined;
  const text = node.textContent ?? '';

  if (check.expect.tag !== undefined && check.expect.tag !== tag) {
    mismatches.push('tag');
    actual.tag = tag;
  }
  if (check.expect.part !== undefined && check.expect.part !== part) {
    mismatches.push('part');
    actual.part = part;
  }
  if (check.expect.attrs !== undefined) {
    for (const [name, value] of Object.entries(check.expect.attrs)) {
      const got = node.getAttribute(name) ?? null;
      if (got !== value) {
        mismatches.push(`attrs.${name}`);
        actual[`attrs.${name}`] = got;
      }
    }
  }
  if (check.expect.text !== undefined && check.expect.text !== text) {
    mismatches.push('text');
    actual.text = text;
  }

  if (mismatches.length > 0) {
    return structureFailure(
      checkId,
      check.path,
      check.expect,
      actual,
      `structure mismatch on ${mismatches.join(', ')}`,
    );
  }
  return { checkId, ok: true, category: 'structure', nodePath: check.path };
}

interface InteractionContext {
  map: Map<string, Element>;
  events: EventLogEntry[];
  rootPath: string;
}

function pathOfElement(map: Map<string, Element>, el: Element | null): string {
  if (el === null) return '(null)';
  for (const [path, node] of map.entries()) {
    if (node === el) return path;
  }
  return '(outside render target)';
}

function evaluateInteraction(
  checkId: string,
  check: InteractionCheck,
  ctx: InteractionContext,
  componentId: PreviewComponentId,
): TestResult {
  const { map, events, rootPath } = ctx;
  const targetPath = check.action.target ?? rootPath;
  const target = map.get(targetPath);

  if (target === undefined) {
    return {
      checkId,
      ok: false,
      category: 'interaction',
      nodePath: targetPath,
      actual: undefined,
      expected: check.expect,
      diagnostics: [devDiag('test_interaction_mismatch', targetPath, 'a rendered node path', targetPath, 'action target node path not found in the render target', 'use a path returned by ui.preview')],
    };
  }

  if (check.action.kind === 'click') {
    (target as HTMLElement).click();
  } else if (check.action.kind === 'change') {
    const value = check.action.value ?? '';
    (target as HTMLSelectElement).value = value;
    target.dispatchEvent(new Event('change', { bubbles: true }));
  } else if (check.action.kind === 'key') {
    const key = check.action.key ?? '';
    target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  } else {
    const unknownKind = (check.action as { kind: string }).kind;
    return {
      checkId,
      ok: false,
      category: 'interaction',
      nodePath: targetPath,
      actual: unknownKind,
      expected: "'click' | 'change' | 'key'",
      diagnostics: [devDiag('test_unknown_check', `/checks/${checkId}/action`, "'click' | 'change' | 'key'", unknownKind, 'unknown interaction action kind', 'use click, change or key')],
    };
  }

  const mismatches: string[] = [];
  const actual: Record<string, unknown> = {};
  if (check.expect.event !== undefined) {
    const last = events[events.length - 1];
    const got = last?.kind ?? '(none)';
    if (got !== check.expect.event) {
      mismatches.push('event');
      actual.event = got;
    }
  }
  if (check.expect.state !== undefined) {
    for (const [key, value] of Object.entries(check.expect.state)) {
      const got = readState(target, key);
      if (got !== value) {
        mismatches.push(`state.${key}`);
        actual[`state.${key}`] = got;
      }
    }
  }
  if (check.expect.focusPath !== undefined) {
    const activePath = pathOfElement(map, document.activeElement);
    if (activePath !== check.expect.focusPath) {
      mismatches.push('focusPath');
      actual.focusPath = activePath;
    }
  }

  if (mismatches.length > 0) {
    return {
      checkId,
      ok: false,
      category: 'interaction',
      nodePath: targetPath,
      actual,
      expected: check.expect,
      diagnostics: [
        devDiag(
          'test_interaction_mismatch',
          `/checks/${checkId}`,
          check.expect,
          actual,
          `interaction mismatch on ${mismatches.join(', ')} (component '${componentId}' in jsdom)`,
          'align the action/expectation with the frozen component contract semantics',
        ),
      ],
    };
  }
  return { checkId, ok: true, category: 'interaction', nodePath: targetPath };
}

function evaluateBusiness(checkId: string, check: BusinessCheck, fixtures: BusinessFixture[]): TestResult {
  const fixture = fixtures.find((f) => f.id === check.source);
  if (fixture === undefined) {
    return {
      checkId,
      ok: false,
      category: 'business',
      businessSource: check.source,
      actual: undefined,
      expected: check.expect,
      diagnostics: [
        devDiag(
          'business_fixture_required',
          `/checks/${checkId}/source`,
          `an injected business fixture with id '${check.source}'`,
          '(no fixture injected)',
          'business correctness must come from a business-layer fixture; a component render never claims business correctness',
          `inject a BusinessFixture with id '${check.source}'`,
        ),
      ],
    };
  }
  const outcome = fixture.run(check.assertion);
  const ok = outcome.ok === check.expect.ok;
  return {
    checkId,
    ok,
    category: 'business',
    businessSource: check.source,
    actual: outcome.ok ? outcome.actual : outcome.explanation ?? outcome.actual,
    expected: check.expect,
    ...(ok ? {} : { diagnostics: [devDiag('business_fixture_required', `/checks/${checkId}/assertion`, check.expect, outcome, outcome.explanation ?? 'business assertion did not hold in the injected fixture', 'inspect the business fixture result')] }),
  };
}

/** ui.test — deterministic structure/interaction checks with exact baselines (M0-08 §2.2). */
export function test(input: TestInput): TestOutput {
  const componentId = input.componentId;
  const contract: ComponentContract | undefined = PREVIEW_CONTRACTS[componentId];
  const baselineVersion = input.baseline?.version ?? contract?.contractVersion ?? '0.0.0';
  const fixtures = input.businessFixtures ?? [];
  const checks = input.checks;

  const results: TestResult[] = [];
  const pushFail = (diagnostic: DevDiagnostic, category: CheckCategory, nodePath?: string): void => {
    for (let i = 0; i < checks.length; i += 1) {
      const check = checks[i];
      if (check === undefined) continue;
      results.push({
        checkId: `${componentId}.${check.type}.${i}`,
        ok: false,
        category,
        nodePath,
        diagnostics: [diagnostic],
      });
    }
  };

  if (contract === undefined) {
    pushFail(
      devDiag('preview_unsupported_component', '/componentId', "'button' | 'select'", componentId, 'componentId is not in the frozen test component set'),
      'structure',
    );
    return summarize(input, results, baselineVersion);
  }

  if (input.baseline !== undefined && input.baseline.version !== contract.contractVersion) {
    pushFail(
      devDiag(
        'test_baseline_missing',
        '/baseline/version',
        contract.contractVersion,
        input.baseline.version,
        'baseline version does not match the frozen contract version; no blind test run against a stale baseline',
        `retry with baseline.version=${contract.contractVersion}`,
      ),
      'structure',
    );
    return summarize(input, results, baselineVersion);
  }

  const props = input.props ?? {};
  const propDiagnostics = validatePreviewProps(contract, props);
  const contractDiagnostics = validateComponent(contract).diagnostics as DevDiagnostic[];
  const renderInvalid = propDiagnostics.length > 0 || contractDiagnostics.length > 0;

  if (renderInvalid) {
    for (const diagnostic of [...contractDiagnostics, ...propDiagnostics]) {
      pushFail(diagnostic, 'structure');
    }
    return summarize(input, results, baselineVersion);
  }

  const events: EventLogEntry[] = [];
  const element = renderPreview(componentId, props, {
    click: (event) => {
      events.push({ kind: 'click', appId: event.appId });
    },
    valueChange: (event) => {
      events.push({ kind: 'valueChange', appId: event.appId, value: event.value });
    },
  });
  document.body.appendChild(element);
  const rootPath = `/${componentId}[0]`;
  const map = collectElementMap(element, rootPath);
  const ctx: InteractionContext = { map, events, rootPath };

  try {
    for (let i = 0; i < checks.length; i += 1) {
      const check = checks[i];
      if (check === undefined) continue;
      const checkId = `${componentId}.${check.type}.${i}`;
      if (check.type === 'structure') {
        results.push(evaluateStructure(checkId, check, map));
      } else if (check.type === 'interaction') {
        results.push(evaluateInteraction(checkId, check, ctx, componentId));
      } else {
        results.push(evaluateBusiness(checkId, check, fixtures));
      }
    }
  } finally {
    element.remove();
  }

  return summarize(input, results, baselineVersion);
}

function summarize(input: TestInput, results: TestResult[], baselineVersion: string): TestOutput {
  const passed = results.filter((r) => r.ok).length;
  return {
    results,
    summary: { total: results.length, passed, failed: results.length - passed },
    componentId: input.componentId,
    baseline: { version: baselineVersion },
  };
}
