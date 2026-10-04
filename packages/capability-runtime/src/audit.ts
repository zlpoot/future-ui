/**
 * AuditLog + redaction (M1-02).
 *
 * Agent-visible state is minimized: discovery views only expose
 * visibility.agentAllowlist fields, and audit entries never carry secrets.
 * Redaction applies the contract's visibility.redaction list plus built-in
 * sensitive keys (cookie/password/token/secret/credential/...), so keys and
 * credentials cannot leak through logs even when a handler returns them.
 */
export interface AuditEntry {
  at: string;
  capabilityId: string;
  invocationId: string;
  principal?: string;
  status: string;
  input: Record<string, unknown>;
  result?: Record<string, unknown>;
  note?: string;
}

export class AuditLog {
  private readonly log: AuditEntry[] = [];

  record(entry: AuditEntry): void {
    this.log.push(entry);
  }

  entries(): readonly AuditEntry[] {
    return this.log;
  }

  size(): number {
    return this.log.length;
  }
}

/** Built-in sensitive keys that are always redacted, regardless of the contract list. */
const BUILTIN_SENSITIVE = new Set(['cookie', 'cookies', 'password', 'passwd', 'token', 'tokens', 'secret', 'secrets', 'credential', 'credentials', 'authorization', 'api-key', 'apikey', 'access_token']);

const KEY_RULES: Array<{ match: RegExp }> = [
  { match: /(cookie|password|passwd|token|secret|credential|authorization)/i },
  { match: /(api[_-]?key|access[_-]?token|auth[_-]?token|refresh[_-]?token|session[_-]?token)/i },
];

function isSensitiveKey(key: string): boolean {
  const k = key.toLowerCase();
  if (BUILTIN_SENSITIVE.has(k)) return true;
  return KEY_RULES.some((r) => r.match.test(k));
}

/**
 * Recursively redact `value`. A sensitive key is replaced entirely by
 * "[REDACTED]"; nested objects/arrays are walked so secrets inside results are
 * removed before they reach the audit log.
 */
export function redactValue(value: unknown, key = ''): unknown {
  if (key !== '' && isSensitiveKey(key)) return '[REDACTED]';
  if (Array.isArray(value)) {
    return value.map((item, index) => redactValue(item, `${key}[${index}]`));
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = redactValue(v, k);
    }
    return out;
  }
  return value;
}
