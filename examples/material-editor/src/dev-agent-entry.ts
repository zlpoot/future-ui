/**
 * R2-A3 (#100) · dev-only 程序化 Agent 入口（浏览器安全，零 node 依赖）。
 *
 * 不是 UI 按钮、不是脚本点击 DOM：调用方直接调用本模块导出的受控 API，
 * 内部走**显式注册**的 `material/edit#save` handler 与同一权威 store（同一
 * 业务 handler，与人类 UI 保存完全同路）。只允许读写非敏感字段
 * （displayName / description）；secretNote 对 Agent 不可读/不可写。
 *
 * 仅在 dev 构建由 main.tsx 挂载到 `window.__futureUiR2A3DevAgent`
 * （明确 dev-only 命名空间，生产构建不暴露）。
 */
import type { MaterialActionBridge, MaterialInvokeResult, MaterialReadResult } from './material-bridge.js';
import { MATERIAL_SAVE_ACTION } from './material-declaration.js';

export interface DevAgentApi {
  /** 程序化保存：与 UI 保存共用同一 handler；结构化结果，拒绝不抛异常。 */
  invokeSave(input: {
    materialId: string;
    values: Record<string, string>;
    expectedVersion?: number;
    idempotencyKey?: string;
  }): Promise<MaterialInvokeResult>;
  /** 获准的 committed-state 回读：仅 displayName / description。 */
  committedRead(input: { materialId: string }): MaterialReadResult;
}

export function createDevAgent(bridge: MaterialActionBridge): DevAgentApi {
  return {
    invokeSave: (input) =>
      bridge.invoke({
        caller: 'dev-agent',
        actionRef: MATERIAL_SAVE_ACTION.ref,
        materialId: input.materialId,
        values: input.values,
        expectedVersion: input.expectedVersion,
        idempotencyKey: input.idempotencyKey,
      }),
    committedRead: ({ materialId }) => bridge.committedRead({ caller: 'dev-agent', materialId }),
  };
}
