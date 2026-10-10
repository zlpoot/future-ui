/**
 * R2-A3 (#100) · 仅示例级、明确隔离的最小 browser-safe app bridge。
 *
 * Preflight 结论（#100 交接要求）：`@future-ui/capability-runtime` 无法直接
 * 进入浏览器模块图 —— registry.ts 运行时导入 `@future-ui/contracts` 的
 * validateCapability，contracts 入口运行时导出 validate.js（顶层 `node:fs`），
 * Vite 浏览器目标 externalized 后崩溃（与 #98 同类失败证据一致）。
 *
 * 因此本示例不自建公共 runtime、不修改任何公共契约，而是提供明确隔离的
 * 示例级 bridge：
 *   - 显式注册**唯一业务 handler**（`material/edit#save` = MATERIAL_SAVE_ACTION.ref）；
 *   - UI 与 dev-only Agent 共用同一 handler 与同一权威 store；
 *   - 显式 caller 授权 + 非敏感字段 allowlist（secretNote 对 Agent 不可读/写）；
 *   - 结构化结果区分 未注册 / 未授权 / 参数越权 / 业务失败 / 成功；拒绝 0 write。
 * 不把浏览器 DOM/按钮当可执行能力；不新增 UI “Agent 按钮”。
 */
import { MATERIAL_FIELDS, MATERIAL_SAVE_ACTION } from './material-declaration.js';
import type { MaterialStoreService } from './material-store.js';
import type { MaterialCommitResult } from './material-store.js';

/** 本薄片的受控调用者：人类 UI 与 dev-only 程序化 Agent。 */
export type MaterialCaller = 'ui' | 'dev-agent';

const AUTHORIZED_CALLERS: ReadonlySet<string> = new Set<MaterialCaller>(['ui', 'dev-agent']);

/** Agent 允许读写的非敏感字段（从唯一声明派生；secretNote 被过滤）。 */
export function agentEditableFields(fields: readonly typeof MATERIAL_FIELDS[number][] = MATERIAL_FIELDS): string[] {
  return fields.filter((f) => f.sensitive !== true).map((f) => f.name);
}

/** UI 可编辑的全部声明字段（含 secretNote，业务数据）。 */
export function uiEditableFields(fields: readonly typeof MATERIAL_FIELDS[number][] = MATERIAL_FIELDS): string[] {
  return fields.map((f) => f.name);
}

export interface MaterialInvokeInput {
  caller: MaterialCaller;
  actionRef: string;
  materialId: string;
  values: Record<string, string>;
  expectedVersion?: number;
  idempotencyKey?: string;
}

export type MaterialInvokeResult =
  | { status: 'completed'; version: number; materialId: string; idempotentReplay?: boolean; writeCount: 0 | 1 }
  | { status: 'rejected'; code: string; reason: string; writeCount: 0 }
  | { status: 'failed'; code: string; message: string; writeCount: 0 };

export type MaterialReadResult =
  | { status: 'completed'; materialId: string; version: number; values: Record<string, string> }
  | { status: 'rejected'; code: string; reason: string };

export interface MaterialSaveHandlerContext {
  caller: MaterialCaller;
}

export interface MaterialSaveHandlerInput {
  materialId: string;
  values: Record<string, string>;
  expectedVersion?: number;
  idempotencyKey?: string;
}

export type MaterialSaveHandler = (
  input: MaterialSaveHandlerInput,
  ctx: MaterialSaveHandlerContext,
) => Promise<MaterialCommitResult | { status: 'rejected'; code: string; reason: string }>;

export interface MaterialHandlerRegistration {
  ok: boolean;
  code?: string;
  reason?: string;
}

const SIMULATED_SAVE_DELAY_MS = 1200;

/**
 * 唯一业务 handler：授权（caller + 字段 allowlist）→ 值校验 → 模拟服务端
 * 异步 → 权威 store commit。UI 与 Agent 共用同一实例；拒绝 0 write。
 */
export function createSaveMaterialHandler(
  store: MaterialStoreService,
  options?: { agentFields?: string[]; uiFields?: string[]; saveDelayMs?: number },
): MaterialSaveHandler {
  const agentFields = options?.agentFields ?? agentEditableFields();
  const uiFields = options?.uiFields ?? uiEditableFields();
  const saveDelayMs = options?.saveDelayMs ?? SIMULATED_SAVE_DELAY_MS;
  return async (input, ctx) => {
    const allowed = ctx.caller === 'ui' ? uiFields : agentFields;
    const unexpected = Object.keys(input.values).filter((k) => !allowed.includes(k));
    if (unexpected.length > 0) {
      return {
        status: 'rejected',
        code: 'field-not-allowed',
        // 不 echo 字段值（尤其 secretNote 值），只给字段名，避免间接泄露。
        reason: `caller ${ctx.caller} cannot write fields: ${unexpected.join(', ')}`,
      };
    }
    for (const [key, value] of Object.entries(input.values)) {
      if (typeof value !== 'string') {
        return {
          status: 'rejected',
          code: 'invalid-input',
          reason: `field ${key} must be a string`,
        };
      }
    }
    // 最小并发策略：同素材进行中的保存视为 pending 冲突，拒绝盲覆盖。
    if (store.hasInFlight(input.materialId)) {
      return {
        status: 'rejected',
        code: 'pending-conflict',
        reason: `material ${input.materialId} has an in-flight save`,
      };
    }
    store.markInFlight(input.materialId);
    try {
      await new Promise((resolve) => setTimeout(resolve, saveDelayMs));
      // 幂等键按 caller 作用域隔离：不同调用者的同键互不干扰（显式区分有效作用域）。
      const scopedKey = input.idempotencyKey !== undefined ? `${ctx.caller}|${input.idempotencyKey}` : undefined;
      return store.commit({
        materialId: input.materialId,
        values: input.values,
        expectedVersion: input.expectedVersion,
        idempotencyKey: scopedKey,
      });
    } finally {
      store.clearInFlight(input.materialId);
    }
  };
}

/**
 * 示例级 app bridge：显式注册唯一 handler，统一受控 invoke 与 committed 回读。
 * 不依赖公共 runtime/契约校验；权限判定与结果状态在应用侧落实。
 */
export class MaterialActionBridge {
  private readonly handlers = new Map<string, MaterialSaveHandler>();
  private readonly agentReadableFields: readonly string[];

  constructor(
    private readonly store: MaterialStoreService,
    options?: { agentReadableFields?: string[] },
  ) {
    this.agentReadableFields = options?.agentReadableFields ?? agentEditableFields();
  }

  /** 显式注册业务 handler；重复注册同一 actionRef 拒绝覆盖。 */
  registerHandler(actionRef: string, handler: MaterialSaveHandler): MaterialHandlerRegistration {
    if (this.handlers.has(actionRef)) {
      return { ok: false, code: 'already-registered', reason: `handler for ${actionRef} already registered` };
    }
    this.handlers.set(actionRef, handler);
    return { ok: true };
  }

  hasHandler(actionRef: string): boolean {
    return this.handlers.has(actionRef);
  }

  /** 统一调用路径：未注册 / 未授权 / 参数越权 / 业务失败 / 成功。 */
  async invoke(input: MaterialInvokeInput): Promise<MaterialInvokeResult> {
    const handler = this.handlers.get(input.actionRef);
    if (handler === undefined) {
      return {
        status: 'rejected',
        code: 'unregistered',
        reason: `no handler registered for ${input.actionRef}`,
        writeCount: 0,
      };
    }
    if (!AUTHORIZED_CALLERS.has(input.caller)) {
      return {
        status: 'rejected',
        code: 'unauthorized-caller',
        reason: `caller ${String(input.caller)} is not authorized`,
        writeCount: 0,
      };
    }
    if (typeof input.materialId !== 'string' || input.materialId.length === 0) {
      return { status: 'rejected', code: 'invalid-input', reason: 'materialId must be a non-empty string', writeCount: 0 };
    }
    if (input.values === null || typeof input.values !== 'object' || Array.isArray(input.values)) {
      return { status: 'rejected', code: 'invalid-input', reason: 'values must be an object', writeCount: 0 };
    }
    if (Object.keys(input.values).length === 0) {
      return { status: 'rejected', code: 'invalid-input', reason: 'values must not be empty', writeCount: 0 };
    }

    const outcome = await handler(
      {
        materialId: input.materialId,
        values: input.values,
        expectedVersion: input.expectedVersion,
        idempotencyKey: input.idempotencyKey,
      },
      { caller: input.caller },
    );

    if (outcome.status === 'completed') {
      // 幂等重放不产生新写入：writeCount=0；version 为重放的历史版本。
      return {
        status: 'completed',
        version: outcome.version,
        materialId: outcome.materialId,
        ...(outcome.idempotentReplay === true ? { idempotentReplay: true } : {}),
        writeCount: outcome.idempotentReplay === true ? 0 : 1,
      };
    }
    if (outcome.status === 'rejected') {
      return { status: 'rejected', code: outcome.code, reason: outcome.reason, writeCount: 0 };
    }
    return { status: 'failed', code: outcome.code, message: outcome.message, writeCount: 0 };
  }

  /**
   * 应用显式提供的 committed-state 只读 API（获准的 Agent 回读）。
   * 只返回非敏感 allowlist 字段；secretNote 绝不出现在结果中。
   */
  committedRead(input: { caller: MaterialCaller; materialId: string }): MaterialReadResult {
    if (!AUTHORIZED_CALLERS.has(input.caller)) {
      return { status: 'rejected', code: 'unauthorized-caller', reason: `caller ${String(input.caller)} is not authorized` };
    }
    const row = this.store.find(input.materialId);
    if (row === undefined) {
      return { status: 'rejected', code: 'unknown-material', reason: `material ${input.materialId} not found` };
    }
    const values: Record<string, string> = {};
    for (const key of this.agentReadableFields) {
      const value = row.values[key];
      if (value !== undefined) values[key] = value;
    }
    return { status: 'completed', materialId: row.id, version: this.store.getVersion(), values };
  }
}

export { MATERIAL_SAVE_ACTION };
