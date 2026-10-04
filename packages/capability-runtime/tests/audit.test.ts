import { describe, expect, it } from 'vitest';

import { AuditLog, redactValue } from '../src/index.js';
import { makeRuntime } from './helpers.js';

describe('audit redaction (M1-02)', () => {
  it('sensitive keys are replaced recursively, including inside nested results', () => {
    const input = redactValue({ qty: 1, cookie: 'a=b', nested: { token: 'x', list: [{ password: 'p' }] } });
    expect(input).toEqual({
      qty: 1,
      cookie: '[REDACTED]',
      nested: { token: '[REDACTED]', list: [{ password: '[REDACTED]' }] },
    });
  });

  it('redaction covers api-key / access_token style keys, not just exact matches', () => {
    const input = redactValue({ 'api-key': 'k1', access_token: 't1', refreshToken: 'r1', ok: 'keep' });
    expect(input).toEqual({ 'api-key': '[REDACTED]', access_token: '[REDACTED]', refreshToken: '[REDACTED]', ok: 'keep' });
  });

  it('audit entries keep redacted input/result and never leak credentials', () => {
    const log = new AuditLog();
    log.record({
      at: '2026-10-04T00:00:00.000Z',
      capabilityId: 'cart.add',
      invocationId: 'i1',
      status: 'completed',
      input: redactValue({ productId: 'p1', credential: 'secret-cred' }) as Record<string, unknown>,
      result: redactValue({ ok: true, sessionToken: 'tok-secret' }) as Record<string, unknown>,
    });
    const entries = log.entries();
    expect(entries).toHaveLength(1);
    const json = JSON.stringify(entries);
    expect(json).toContain('[REDACTED]');
    expect(json).not.toContain('secret-cred');
    expect(json).not.toContain('tok-secret');
  });

  it('agent-visible discovery state stays minimal (allowlist only)', async () => {
    const { registry } = makeRuntime({ hooks: { authorize: () => ({ allowed: true }) } });
    const view = registry.discover('cart.add');
    expect(Object.keys(view!.agentVisible).sort()).toEqual(['concurrency', 'description', 'effects', 'idempotency']);
  });
});
