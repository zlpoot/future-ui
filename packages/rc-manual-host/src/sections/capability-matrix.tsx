/**
 * Capability matrix — REAL member-level mapping data from both adapters.
 *
 * Renders the frozen member conclusions (features/props/events/state/parts/
 * control/accessibility/lifecycle + visual token) exactly as recorded in the
 * adapter mapping tables. No hand-typed matrix: the rows come from
 * dialogMapping/buttonMapping/textInputMapping (shadcn) and
 * arkComponentMappings (Ark). Per-component status is derived from the data
 * (any unsupported member in a contract domain ⇒ partial).
 */
import type { ReactElement } from 'react';
import {
  dialogMapping,
  buttonMapping,
  textInputMapping,
} from '@future-ui/shadcn-adapter/browser';
import { arkComponentMappings } from '@future-ui/ark-ui-adapter/browser';

interface MatrixRow {
  componentType: string;
  library: string;
  member: string;
  domain: string;
  status: string;
  via: string;
  mapsTo: string;
  reason: string;
}

interface MappingLike {
  anchor: { componentType: string };
  domains: Record<string, Array<{ member: string; status: string; via?: string; mapsTo?: string; reason?: string }>>;
}

function collectRows(mappings: MappingLike[], library: string): MatrixRow[] {
  const rows: MatrixRow[] = [];
  for (const mapping of mappings) {
    for (const [domain, conclusions] of Object.entries(mapping.domains)) {
      for (const c of conclusions) {
        rows.push({
          componentType: mapping.anchor.componentType.replace('future-ui.', ''),
          library,
          member: c.member,
          domain,
          status: c.status,
          via: c.via ?? '',
          mapsTo: c.mapsTo ?? '',
          reason: c.reason ?? '',
        });
      }
    }
  }
  return rows;
}

function statusOf(rows: MatrixRow[]): string {
  return rows.some((r) => r.status === 'unsupported' || r.status === 'not-applicable') ? 'partial' : 'supported';
}

const SHADCN_ROWS = collectRows([dialogMapping, buttonMapping, textInputMapping], 'shadcn');
const ARK_ROWS = collectRows(arkComponentMappings as unknown as MappingLike[], 'ark');

const ROWS = [...SHADCN_ROWS, ...ARK_ROWS];

const STATUS_CLASS: Record<string, string> = {
  mapped: 'green',
  'inherited-equivalent': 'green',
  unsupported: 'red',
  'not-applicable': 'yellow',
};

export function CapabilityMatrix(): ReactElement {
  const shadcnStatus = statusOf(SHADCN_ROWS);
  const arkStatus = statusOf(ARK_ROWS);
  return (
    <section className="section" data-testid="section-matrix">
      <h2>4 · 同一 Contract 的能力矩阵（真实 mapping 数据渲染）</h2>
      <p className="section-note">
        冻结契约锚定：Dialog / Button / TextInput。shadcn 总评 {shadcnStatus}；Ark 总评 {arkStatus}
        （Ark 无 Button primitive、headless 视觉 token unsupported → partial）。不宣称跨库像素一致。
      </p>
      <div style={{ overflowX: 'auto' }}>
        <table className="matrix" data-testid="capability-matrix-table">
          <thead>
            <tr>
              <th>库</th>
              <th>组件</th>
              <th>域</th>
              <th>成员</th>
              <th>结论</th>
              <th>via</th>
              <th>映射 / 说明</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r, i) => (
              <tr key={`${r.library}-${r.componentType}-${r.domain}-${r.member}-${i}`}>
                <td>{r.library}</td>
                <td>{r.componentType}</td>
                <td>{r.domain}</td>
                <td>{r.member}</td>
                <td>
                  <span className={`badge ${STATUS_CLASS[r.status] ?? 'yellow'}`}>{r.status}</span>
                </td>
                <td>{r.via}</td>
                <td>{r.mapsTo || r.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
