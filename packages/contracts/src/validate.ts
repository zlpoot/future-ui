import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Ajv2020 } from 'ajv/dist/2020.js';
import type { ErrorObject } from 'ajv';

import type { Diagnostic, ErrorCode } from './diagnostics.js';
import type { BindingContract, CapabilityContract, ComponentContract, PluginContract } from './types.js';

const schemasDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'schemas');

function loadSchema(name: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(schemasDir, name), 'utf8')) as Record<string, unknown>;
}

const schemaNames = ['diagnostics', 'version', 'component', 'capability', 'binding', 'plugin'] as const;

const ajv = new Ajv2020({ allErrors: true, strict: false });

for (const name of schemaNames) {
  ajv.addSchema(loadSchema(`${name}.schema.json`));
}

export const schemas: Record<string, Record<string, unknown>> = Object.fromEntries(
  schemaNames.map((name) => [name, loadSchema(`${name}.schema.json`)]),
) as Record<string, Record<string, unknown>>;

export interface ValidationResult {
  valid: boolean;
  diagnostics: Diagnostic[];
}

/** Optional registry context for cross-contract checks (e.g. binding -> capability mapping). */
export interface ValidationContext {
  knownCapabilities?: ReadonlySet<string>;
}

function majorOf(version: unknown): number | undefined {
  if (typeof version !== 'string') return undefined;
  const m = /^(\d+)/.exec(version);
  return m ? Number(m[1]) : undefined;
}

/** Expected M0 contract major version for all future-ui contracts. */
export const CONTRACT_MAJOR = 1;

function versionDiagnostics(version: unknown, basePath: string, major: number): Diagnostic[] {
  if (majorOf(version) === undefined) {
    return [{
      code: 'constraint_violation',
      path: `${basePath}/contractVersion`,
      expected: 'semver string, e.g. "1.0.0"',
      actual: version ?? 'absent',
      explanation: 'contractVersion must be a valid semver string',
      repairHint: 'provide contractVersion as a semver string',
    }];
  }
  if (majorOf(version) !== major) {
    return [{
      code: 'unknown_major_version',
      path: `${basePath}/contractVersion`,
      expected: `${major}.x.x`,
      actual: version,
      explanation: 'unknown major version: validators must reject unknown majors instead of guessing or downgrading',
      repairHint: `use contract version ${major}.x.x or register a new major explicitly`,
    }];
  }
  return [];
}

function ajvErrorToDiagnostic(err: ErrorObject): Diagnostic {
  const path = err.instancePath === '' ? '/' : err.instancePath;
  const keyword = err.keyword;
  let code: ErrorCode;
  let expected: unknown = '';
  let actual: unknown = '';
  switch (keyword) {
    case 'additionalProperties':
      code = 'unknown_field';
      expected = 'no additional properties (strict reject per D02)';
      actual = String((err.params as { additionalProperty?: unknown }).additionalProperty ?? '');
      break;
    case 'required':
      code = 'missing_required';
      expected = `required field: ${String((err.params as { missingProperty?: unknown }).missingProperty ?? '')}`;
      actual = 'absent';
      break;
    case 'type':
      code = 'type_mismatch';
      expected = `type: ${String((err.params as { type?: unknown }).type ?? '')}`;
      actual = `type: ${typeof (err.params as { type?: unknown }).type}`;
      break;
    case 'enum':
    case 'const':
    case 'pattern':
    case 'minLength':
    case 'minimum':
    case 'maximum':
      code = 'constraint_violation';
      expected = JSON.stringify(err.params);
      actual = 'current value';
      break;
    case 'oneOf':
    case 'anyOf':
    case 'allOf':
      code = 'invalid_combination';
      expected = 'one valid combination';
      actual = JSON.stringify(err.params);
      break;
    default:
      code = 'constraint_violation';
      expected = JSON.stringify(err.params);
      actual = 'current value';
  }
  return { code, path, expected, actual, explanation: err.message ?? `validation failed at ${keyword}` };
}

function structuralDiagnostics(data: unknown, schemaRef: string, basePath: string, major: number): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const validate = ajv.getSchema<unknown>(schemaRef);
  if (!validate) {
    throw new Error(`schema not registered: ${schemaRef}`);
  }
  if (!validate(data)) {
    for (const err of validate.errors ?? []) {
      diagnostics.push(ajvErrorToDiagnostic(err as ErrorObject));
    }
  }
  const record = data as Record<string, unknown> | undefined;
  if (record && typeof record === 'object') {
    diagnostics.push(...versionDiagnostics(record.contractVersion, basePath, major));
  }
  return diagnostics;
}

/** Validate a Component contract. */
export function validateComponent(data: unknown): ValidationResult {
  const diagnostics = structuralDiagnostics(data, 'https://future-ui.dev/contracts/component.schema.json', '', CONTRACT_MAJOR);
  return { valid: diagnostics.length === 0, diagnostics };
}

/** Validate a Capability contract, including D06(M0) semantic invariants. */
export function validateCapability(data: unknown): ValidationResult {
  const diagnostics = structuralDiagnostics(data, 'https://future-ui.dev/contracts/capability.schema.json', '', CONTRACT_MAJOR);
  const record = data as Partial<CapabilityContract> | undefined;
  if (record && typeof record === 'object') {
    const exec = record.execution;
    if (exec && exec.cancelImpliesRollback === true) {
      diagnostics.push({
        code: 'constraint_violation',
        path: '/execution/cancelImpliesRollback',
        expected: 'false',
        actual: 'true',
        explanation: 'D06(M0) invariant: cancellation does not imply rollback; runtime must not pretend a cancelled call rolled back',
        repairHint: 'set execution.cancelImpliesRollback to false and describe recovery via failureModes',
      });
    }
    const idem = record.idempotency;
    const inv = record.invocation;
    if (idem && inv && idem.scope !== 'none' && inv.idempotencyKeyDistinct === false) {
      diagnostics.push({
        code: 'constraint_violation',
        path: '/invocation/idempotencyKeyDistinct',
        expected: 'true when idempotency.scope != "none"',
        actual: 'false',
        explanation: 'D06(M0) invariant: invocation identity is distinct from idempotency key; same key + different params must not count as same success',
        repairHint: 'set invocation.idempotencyKeyDistinct to true or scope idempotency to "none"',
      });
    }
  }
  return { valid: diagnostics.length === 0, diagnostics };
}

/** Validate a Binding contract; with context, checks capability mapping conflicts. */
export function validateBinding(data: unknown, context?: ValidationContext): ValidationResult {
  const diagnostics = structuralDiagnostics(data, 'https://future-ui.dev/contracts/binding.schema.json', '', CONTRACT_MAJOR);
  const record = data as Partial<BindingContract> | undefined;
  if (record && typeof record === 'object') {
    const proj = record.projection;
    if (proj && proj.direction === 'read' && proj.mutability === 'mutable') {
      diagnostics.push({
        code: 'invalid_combination',
        path: '/projection',
        expected: 'mutability "readonly" when direction is "read"',
        actual: `direction=${proj.direction}, mutability=${proj.mutability}`,
        explanation: 'a read-only projection cannot be mutable: consumer would be able to write a value it only reads',
        repairHint: 'set projection.mutability to "readonly" or change direction to "read-write"',
      });
    }
    const known = context?.knownCapabilities;
    if (known && record.capabilityId !== undefined && !known.has(record.capabilityId)) {
      diagnostics.push({
        code: 'capability_conflict',
        path: '/capabilityId',
        expected: 'one of the known capability ids in the registry',
        actual: record.capabilityId,
        explanation: 'binding references a capability that is not provided by the registry; capability mapping conflict',
        repairHint: 'reference an existing capabilityId or register the missing capability first',
      });
    }
  }
  return { valid: diagnostics.length === 0, diagnostics };
}

/** Validate a Plugin contract (M0 minimal Plugin Kernel semantics). */
export function validatePlugin(data: unknown): ValidationResult {
  const diagnostics = structuralDiagnostics(data, 'https://future-ui.dev/contracts/plugin.schema.json', '', CONTRACT_MAJOR);
  return { valid: diagnostics.length === 0, diagnostics };
}

export type { BindingContract, CapabilityContract, ComponentContract, PluginContract };
