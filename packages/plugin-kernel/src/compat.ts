/**
 * Manifest and runtime compatibility checks for the M0-03 Plugin Kernel.
 *
 * Structural validation reuses the frozen M0 contracts (#6): kind / id /
 * contractVersion / provides / requires / compatibility / scope / lifecycle,
 * plus the unknown-major hard error from D02. Runtime checks below are frozen
 * by D07(M0): missing dependency, duplicate provider, version and platform
 * mismatches must fail loudly with structured diagnostics, never degrade
 * silently.
 */
import { validatePlugin, type Diagnostic, type PluginContract } from '@future-ui/contracts';

/** Runtime facts a registry can check a manifest against. */
export interface CompatibilityContext {
  /** provider ids already provided by loaded plugins (parent scope included). */
  readonly provided: ReadonlySet<string>;
  /** current runtime platform, e.g. 'node' | 'browser'. */
  readonly platform: string;
  /** current runtime engine versions, e.g. { node: '24.21.0' }. */
  readonly engines?: Readonly<Record<string, string>>;
}

/** Structural manifest check (kind/version/provides/requires/compatibility/scope/lifecycle + unknown major). */
export function checkManifest(contract: unknown): Diagnostic[] {
  return validatePlugin(contract).diagnostics;
}

/**
 * Runtime compatibility: duplicate provider, missing dependency, platform and
 * engine mismatches. Returns an empty array when the manifest is compatible.
 */
export function checkCompatibility(contract: PluginContract, ctx: CompatibilityContext): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  for (const provided of contract.provides) {
    if (ctx.provided.has(provided)) {
      diagnostics.push({
        code: 'conflict',
        path: '/provides',
        expected: 'a provider id not already provided by a loaded plugin',
        actual: provided,
        explanation: 'duplicate provider: another plugin already provides this id in the same scope; refusing to load',
      });
    }
  }

  for (const required of contract.requires) {
    if (!ctx.provided.has(required)) {
      diagnostics.push({
        code: 'constraint_violation',
        path: '/requires',
        expected: `required provider present: ${required}`,
        actual: 'absent',
        explanation: 'missing dependency: no loaded plugin provides this required provider; failing loudly instead of degrading silently',
      });
    }
  }

  if (contract.compatibility.platform !== ctx.platform) {
    diagnostics.push({
      code: 'unsupported_feature',
      path: '/compatibility/platform',
      expected: ctx.platform,
      actual: contract.compatibility.platform,
      explanation: 'plugin declares a platform that does not match the current runtime; refusing to load',
    });
  }

  const engines = contract.compatibility.engines ?? {};
  for (const [name, range] of Object.entries(engines)) {
    const actual = ctx.engines?.[name];
    if (actual === undefined || !satisfies(actual, range)) {
      diagnostics.push({
        code: 'constraint_violation',
        path: `/compatibility/engines/${name}`,
        expected: range,
        actual: actual ?? 'absent',
        explanation: `engine constraint not satisfied for "${name}"`,
      });
    }
  }

  return diagnostics;
}

type SemVer = readonly [number, number, number];

function parseVersion(value: string): SemVer | undefined {
  const m = /^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/.exec(value.trim());
  if (!m) return undefined;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function compare(a: SemVer, b: SemVer): number {
  for (let i = 0; i < 3; i += 1) {
    if (a[i] !== b[i]) return a[i] > b[i] ? 1 : -1;
  }
  return 0;
}

/**
 * Minimal semver range support for engine constraints: exact "1.2.3",
 * caret "^1.2.3", tilde "~1.2.3", "*", and ">=1.2.3 [<2.0.0]".
 */
export function satisfies(actual: string, range: string): boolean {
  const r = range.trim();
  if (r === '*' || r === '') return true;
  const current = parseVersion(actual);
  if (!current) return false;

  if (r.startsWith('>=')) {
    const rest = r.slice(2);
    const lowerText = rest.includes('<') ? rest.slice(0, rest.indexOf('<')).trim() : rest.trim();
    const lower = parseVersion(lowerText);
    if (!lower) return false;
    if (compare(current, lower) < 0) return false;
    const upperPart = rest.includes('<') ? rest.slice(rest.indexOf('<') + 1).trim() : undefined;
    if (upperPart) {
      const upper = parseVersion(upperPart);
      if (!upper) return false;
      if (compare(current, upper) >= 0) return false;
    }
    return true;
  }

  if (r.startsWith('^')) {
    const target = parseVersion(r.slice(1));
    if (!target) return false;
    return current[0] === target[0] && compare(current, target) >= 0;
  }

  if (r.startsWith('~')) {
    const target = parseVersion(r.slice(1));
    if (!target) return false;
    return current[0] === target[0] && current[1] === target[1] && compare(current, target) >= 0;
  }

  const target = parseVersion(r);
  return target !== undefined && compare(current, target) === 0;
}
