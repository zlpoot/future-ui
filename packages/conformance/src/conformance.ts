/**
 * Shared conformance cases C1–C8 (D-PORT-02). Every case is a public-semantics
 * assertion that BOTH hosts (React adapter and framework-agnostic DOM provider)
 * must satisfy with the same observable behavior. Categories (D-PORT-01.3):
 *
 * - pass: the assertion holds on the host.
 * - contract-gap: the contract lacks fields/events to express the semantics
 *   (this would trigger a #2 revision — expected count is 0).
 * - capability-diff: host capability difference (e.g. native popup/keyboard
 *   managed by the browser) — recorded, not papered over by a compatibility
 *   layer.
 * - adapter-diff: implementation difference with equivalent public semantics
 *   (e.g. React synthetic events vs DOM events) — recorded, not a gap.
 */
export type ConformanceCategory = 'pass' | 'contract-gap' | 'capability-diff' | 'adapter-diff';

export interface ConformanceCase {
  id: string;
  component: 'Button' | 'Select';
  assertion: string;
  expectedCategory: ConformanceCategory;
}

export const CONFORMANCE_CASES: ConformanceCase[] = [
  { id: 'C1', component: 'Button', assertion: 'renders a clickable element', expectedCategory: 'pass' },
  { id: 'C2', component: 'Button', assertion: 'click dispatches onClick({clickId, appId})', expectedCategory: 'pass' },
  { id: 'C3', component: 'Button', assertion: 'disabled does not dispatch onClick', expectedCategory: 'pass' },
  { id: 'C4', component: 'Button', assertion: 'keyboard Enter/Space activation semantics exist', expectedCategory: 'adapter-diff' },
  { id: 'C5', component: 'Select', assertion: 'option collection renders as selectable values', expectedCategory: 'pass' },
  { id: 'C6', component: 'Select', assertion: 'selection dispatches valueChange({value, appId}); empty -> null', expectedCategory: 'pass' },
  { id: 'C7', component: 'Select', assertion: 'disabled does not dispatch valueChange', expectedCategory: 'pass' },
  { id: 'C8', component: 'Select', assertion: 'defaultValue is initially selected', expectedCategory: 'pass' },
];

export interface ConformanceResult {
  case: string;
  host: 'react' | 'dom';
  category: ConformanceCategory;
  note: string;
}

/** Records one host result for a case and classifies it. */
export function recordResult(
  results: ConformanceResult[],
  caseId: string,
  host: 'react' | 'dom',
  passed: boolean,
  expectedCategory: ConformanceCategory,
  note = '',
): void {
  results.push({
    case: caseId,
    host,
    category: passed ? expectedCategory : 'contract-gap',
    note: passed ? note : `FAILED on ${host}: ${note || 'assertion did not hold'}`,
  });
}

/** True when the report shows no contract-gap anywhere. */
export function hasNoContractGap(results: ConformanceResult[]): boolean {
  return results.every((r) => r.category !== 'contract-gap');
}

/** True when capability-diff only appears on the declared browser-managed cases. */
export function capabilityDiffsOnlyOnDeclared(results: ConformanceResult[]): boolean {
  const declared = new Set(['C4', 'C5']);
  return results.filter((r) => r.category === 'capability-diff').every((r) => declared.has(r.case));
}
