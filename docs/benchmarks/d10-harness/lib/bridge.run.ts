// @vitest-environment jsdom
/**
 * d10-harness · bridge.run.ts — 实验组 future-ui 工具桥（真实确定性工具链）。
 *
 * 工具（全部为真实实现，非 mock）：
 *   catalog            @future-ui/ai-contract-core buildCatalog/queryCatalog
 *   validate-spec      对 spec 各组件的 props 跑 @future-ui/ai-dev validatePreviewProps（真实契约校验）
 *   patch              @future-ui/ai-contract-core NodeStore（由 spec 播种，nodeId=component:<id>）+ apply（expectedVersion 乐观并发）
 *   preview            @future-ui/ai-dev preview（仅 button/select，DOM host）
 *   test               @future-ui/ai-dev test（structure/interaction/business，exact baseline）
 *
 * 环境变量：
 *   BRIDGE_QUERY_PATH   JSON 文件: { tool, args }
 *   BRIDGE_SPEC    workspace spec.json 路径
 *   BRIDGE_OUTPUT  结果 JSON 输出路径
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { buildCatalog, queryCatalog, NodeStore } from '@future-ui/ai-contract-core';
import { preview, test, validatePreviewProps } from '@future-ui/ai-dev';
import { buttonContract, selectContract } from '@future-ui/react-provider';

/** 读文本并剥离 UTF-8 BOM（Windows 工具链产物可能带 BOM）。 */
function readText(p: string): string {
  return readFileSync(p, 'utf8').replace(/^\uFEFF/, '');
}

interface Spec {
  components: { id: string; type: string; props?: Record<string, unknown> }[];
}

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`missing env ${name}`);
  return v;
}

const CONTRACTS: Record<string, { contract: typeof buttonContract }> = {
  button: { contract: buttonContract },
  select: { contract: selectContract },
};

describe('bridge', () => {
  it('executes one future-ui tool query', () => {
    const query = JSON.parse(readText(env('BRIDGE_QUERY_PATH')));
    const spec: Spec = JSON.parse(readFileSync(env('BRIDGE_SPEC'), 'utf8'));
    const outPath = env('BRIDGE_OUTPUT');
    const tool = String(query.tool);
    const args = (query.args ?? {}) as Record<string, unknown>;
    let result: unknown;

    if (tool === 'catalog') {
      const catalog = buildCatalog();
      const r = queryCatalog(catalog, { kind: args.kind as never, contractVersion: args.contractVersion as string | undefined });
      result = {
        contractMajor: catalog.contractMajor,
        entries: r.entries.map((e) => ({ kind: e.kind, $id: e.$id, title: e.title, requiredFields: e.requiredFields, constraints: e.constraints })),
        diagnostics: r.diagnostics,
      };
    } else if (tool === 'validate-spec') {
      const out: { componentId: string; diagnostics: unknown[] }[] = [];
      for (const comp of spec.components) {
        const contract = CONTRACTS[comp.type]?.contract;
        if (!contract) {
          out.push({ componentId: comp.id, diagnostics: [{ code: 'unsupported_component', actual: comp.type }] });
          continue;
        }
        const props = (comp.props ?? {}) as Record<string, unknown>;
        out.push({ componentId: comp.id, diagnostics: validatePreviewProps(contract, props) });
      }
      result = { components: out };
    } else if (tool === 'patch') {
      const store = new NodeStore(
        spec.components.map((comp, i) => ({
          nodeId: `component:${comp.id}`,
          version: 0,
          value: { type: comp.type, props: comp.props ?? {} },
        })),
      );
      const patch = {
        nodeId: String(args.nodeId),
        expectedVersion: Number(args.expectedVersion),
        changes: (args.changes ?? {}) as Record<string, unknown>,
      };
      const applied = store.apply(patch);
      result = { ok: applied.ok, diagnostics: applied.diagnostics, store: store.list() };
    } else if (tool === 'preview') {
      const componentId = String(args.componentId) as 'button' | 'select';
      const props = (args.props ?? {}) as Record<string, unknown>;
      result = preview({ componentId, props });
    } else if (tool === 'test') {
      const componentId = String(args.componentId) as 'button' | 'select';
      const props = (args.props ?? {}) as Record<string, unknown>;
      const checks = (args.checks ?? []) as never[];
      result = test({ componentId, props, checks });
    } else {
      result = { error: `unknown tool '${tool}'` };
    }

    const output = { tool, ok: tool !== 'test' || (result as { summary?: { passed: number; failed: number } }).summary?.failed === 0, result };
    writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf8');
    expect(output).toBeTruthy();
  });
});
