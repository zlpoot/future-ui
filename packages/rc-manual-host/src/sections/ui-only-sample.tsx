/**
 * Independent UI-only sample (R1-RC-001 #86).
 *
 * IMPORT GRAPH CONTRACT (guarded by tests/ui-only-import-graph.test.ts):
 * this module and its transitive relative imports must NEVER reference
 * ai-dev / capability-runtime / webmcp-adapter / jsdom / @testing-library /
 * node:* / Agent/MCP. It runs standalone in a real browser with zero business
 * tools: the adapters hold no capability/binding registry, so every control is
 * pure UI state.
 */
import { useState } from 'react';
import type { ReactElement } from 'react';
import { ArkButton, ArkDialog, ArkTextInput } from '@future-ui/ark-ui-adapter/browser';
import { ShadcnButton, ShadcnTextInput } from '@future-ui/shadcn-adapter/browser';

interface Entry {
  id: number;
  name: string;
  note: string;
}

export function UiOnlySample(): ReactElement {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [openDetail, setOpenDetail] = useState<Entry | null>(null);
  const nextId = entries.length + 1;

  const register = (): void => {
    const trimmed = name.trim();
    if (trimmed === '') return;
    setEntries((prev) => [...prev, { id: nextId, name: trimmed, note: note.trim() }]);
    setName('');
    setNote('');
  };

  return (
    <section className="section" data-testid="section-ui-only" data-ui-only-root="true">
      <h2>5 · UI-only 独立样本（无 Agent / 无 MCP / 无业务工具）</h2>
      <p className="section-note">
        该样本的 import 图不含 ai-dev / capability-runtime / jsdom / Agent/MCP（由依赖图负例测试守住边界）。
        当前实例 {entries.length} 条；0 Capability / 0 Binding → 业务工具数 = 0。
      </p>
      <div className="card">
        <div className="row">
          <label htmlFor="uio-name">名称：</label>
          <ShadcnTextInput
            id="uio-name"
            name="uio-name"
            value={name}
            onValueChange={(e) => setName(e.value)}
            description="shadcn 输入"
          />
          <label htmlFor="uio-note">备注：</label>
          <ArkTextInput id="uio-note" name="uio-note" value={note} onValueChange={(e) => setNote(e.value)} />
          <ArkButton type="button" onClick={register}>
            登记
          </ArkButton>
          <ShadcnButton
            type="button"
            variant="outline"
            disabled={entries.length === 0}
            onClick={() => setEntries([])}
          >
            清空
          </ShadcnButton>
        </div>
        {entries.length === 0 ? (
          <p className="kv">（尚无登记条目）</p>
        ) : (
          <ul>
            {entries.map((e) => (
              <li key={e.id}>
                <button type="button" className="host-button" onClick={() => setOpenDetail(e)}>
                  #{e.id} {e.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="row">
        <span className="badge green">UI-only 运行</span>
        <span className="badge green">0 business tools</span>
        <span className="badge">import 图：react + 两 adapter</span>
      </div>
      {openDetail ? (
        <ArkDialog
          open={openDetail !== null}
          label={`条目 #${openDetail.id}`}
          description={openDetail.note || '（无备注）'}
          closeLabel="关闭"
          onOpenChange={(e) => {
            if (!e.open) setOpenDetail(null);
          }}
        >
          <p className="kv">
            <b>名称：</b>
            {openDetail.name}
          </p>
        </ArkDialog>
      ) : null}
    </section>
  );
}
