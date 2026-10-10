/**
 * R2-A3 (#100) · 素材编辑权威内存 store（浏览器安全，零 node 依赖）。
 *
 * 唯一权威业务状态：`rows` + `version`。UI 与 dev-only Agent 都通过共享业务
 * handler 提交到本 store；store 只提供 commit 原语与幂等/版本/未知素材保护，
 * 不感知授权（授权在 material-bridge 的 handler 层）。失败一律 0 write，
 * version 只在成功 commit 时 +1。
 *
 * 订阅用于通知 React（UI 观察到 Agent 提交后的变化）；引用不可变，便于
 * useSyncExternalStore 的 getSnapshot 稳定比较。
 */
import type { MaterialRow } from './material-declaration.js';

export interface MaterialCommitInput {
  materialId: string;
  /** 仅包含本提交要覆盖的字段（完整合并由 commit 完成）。 */
  values: Record<string, string>;
  /** 并发前置条件：与当前权威版本不一致则拒绝（0 write）。 */
  expectedVersion?: number;
  /** 幂等键：同键已完成提交 → 重放原结果，不再写第二次。 */
  idempotencyKey?: string;
}

export type MaterialCommitResult =
  | {
      status: 'completed';
      version: number;
      materialId: string;
      result: { values: Record<string, string>; version: number };
      /** true 表示同幂等键的既有结果重放，未产生新写入。 */
      idempotentReplay?: boolean;
    }
  | { status: 'failed'; code: string; message: string; materialId: string; writeCount: 0 };

interface MaterialOpRecord {
  status: 'completed';
  /** 历史版本号：重放时返回此版本（而非当前版本）。 */
  version: number;
  /** 原请求素材：判定同一请求的身份。 */
  materialId: string;
  /** 原请求字段/值（冻结快照）：同键不同请求 → 冲突。 */
  values: Record<string, string>;
  /** 历史结果值：重放时原样返回。 */
  resultValues: Record<string, string>;
}

/** 请求参数完全一致判定（键集合 + 值均相等，顺序无关）。 */
function sameRequestValues(a: Record<string, string>, b: Record<string, string>): boolean {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (a[key] !== b[key]) return false;
  }
  return true;
}

export type MaterialStoreListener = () => void;

export class MaterialStoreService {
  private rows: MaterialRow[];
  private readonly opLog = new Map<string, MaterialOpRecord>();
  private readonly listeners = new Set<MaterialStoreListener>();
  /** 权威版本号：每次成功 commit +1。 */
  version = 0;

  constructor(seed: readonly MaterialRow[]) {
    // 深拷贝种子，避免外部引用绕过 store 直接改权威状态。
    this.rows = seed.map((r) => ({ id: r.id, values: { ...r.values } }));
  }

  /** useSyncExternalStore 快照：返回当前权威行数组（不可变引用）。 */
  getSnapshot(): readonly MaterialRow[] {
    return this.rows;
  }

  subscribe(listener: MaterialStoreListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getVersion(): number {
    return this.version;
  }

  find(materialId: string): MaterialRow | undefined {
    return this.rows.find((r) => r.id === materialId);
  }

  hasInFlight(materialId: string): boolean {
    return this.inFlight.has(materialId);
  }

  markInFlight(materialId: string): void {
    this.inFlight.add(materialId);
  }

  clearInFlight(materialId: string): void {
    this.inFlight.delete(materialId);
  }

  /**
   * 唯一写原语（由共享业务 handler 调用；失败 0 write）。
   * 检查顺序：幂等重放 → 未知素材 → 陈旧版本 → 写入。
   */
  commit(input: MaterialCommitInput): MaterialCommitResult {
    if (input.idempotencyKey !== undefined) {
      const existing = this.opLog.get(input.idempotencyKey);
      if (existing !== undefined) {
        // 同键必须对应同一请求（同一素材 + 相同字段/值）；否则视为键被错误重用 → 冲突，0 write。
        const sameRequest =
          existing.materialId === input.materialId && sameRequestValues(existing.values, input.values);
        if (!sameRequest) {
          return {
            status: 'failed',
            code: 'idempotency-conflict',
            message: `idempotency key already used for a different request (material ${existing.materialId})`,
            materialId: input.materialId,
            writeCount: 0,
          };
        }
        // 相同请求：重放历史结果与历史版本，不产生新写入。
        return {
          status: 'completed',
          version: existing.version,
          materialId: existing.materialId,
          result: { values: { ...existing.resultValues }, version: existing.version },
          idempotentReplay: true,
        };
      }
    }

    const row = this.rows.find((r) => r.id === input.materialId);
    if (row === undefined) {
      return {
        status: 'failed',
        code: 'unknown-material',
        message: `material ${input.materialId} not found`,
        materialId: input.materialId,
        writeCount: 0,
      };
    }

    if (input.expectedVersion !== undefined && input.expectedVersion !== this.version) {
      return {
        status: 'failed',
        code: 'stale-version',
        message: `expected version ${input.expectedVersion}, actual ${this.version}`,
        materialId: input.materialId,
        writeCount: 0,
      };
    }

    const nextValues = { ...row.values, ...input.values };
    this.rows = this.rows.map((r) => (r.id === input.materialId ? { id: input.materialId, values: nextValues } : r));
    this.version += 1;
    if (input.idempotencyKey !== undefined) {
      this.opLog.set(input.idempotencyKey, {
        status: 'completed',
        version: this.version,
        materialId: input.materialId,
        values: { ...input.values },
        resultValues: { ...nextValues },
      });
    }
    this.emit();
    return {
      status: 'completed',
      version: this.version,
      materialId: input.materialId,
      result: { values: nextValues, version: this.version },
    };
  }

  private readonly inFlight = new Set<string>();

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}
