/**
 * Project AI View / Validator panel (dev-only) — BROWSER-SAFE STATIC view.
 *
 * v0.1 first-failure record (#86): importing @future-ui/ai-dev in the browser
 * crashes at module evaluation — ai-dev's validator transitively pulls
 * @future-ui/contracts, whose validate.ts reads AJV schema JSON with
 * node:fs at module load (`readFileSync`), which vite externalizes for
 * browser compatibility. The live validator is therefore Node-only by
 * construction, exactly like the MV upstream drift gate.
 *
 * Consequences (honest layering, no fake "PASS" in browser):
 *  - This section renders ONLY static, browser-safe identity/provenance data
 *    exported by the two adapters (zero node: imports in their graphs).
 *  - Live bounded validation (R1-DLG-02 positive PASS / negative FAIL) and the
 *    MV Project AI View (mv-auto-editor, upstream artifacts canvas/keyframes/
 *    shots) are NOT-RUNNABLE in the browser; their deterministic behavior is
 *    covered by vitest (packages/rc-manual-host/tests/validator-demo.test.tsx)
 *    and the ai-dev test suite (Node side).
 */
import type { ReactElement } from 'react';
import {
  adapterIdentity as shadcnIdentity,
  editDialogProfile,
  upstreamFiles,
} from '@future-ui/shadcn-adapter/browser';
import { adapterIdentity as arkIdentity, arkPackage, engineIdentity } from '@future-ui/ark-ui-adapter/browser';

function NotFoundBadge({ label }: { label: string }): ReactElement {
  return (
    <span className="badge yellow" data-testid={`not-runnable-${label}`}>
      NOT-RUNNABLE（Node-only）
    </span>
  );
}

export function AiViewSection(): ReactElement {
  const shadcn = shadcnIdentity.libraryIdentity;
  const ark = arkIdentity.libraryIdentity;

  return (
    <section className="section" data-testid="section-ai-view">
      <h2>6 · Project AI View / Validator（dev-only，浏览器安全静态视图）</h2>
      <p className="section-note">
        现场有界校验与 MV Project AI View 均为 Node-only（@future-ui/contracts 的 validate.ts 在模块加载期用
        node:fs 读取 schema JSON，浏览器无法运行）。本页只展示两 adapter 的冻结身份与来源数据；校验行为由
        vitest 确定性覆盖（validator-demo：正例 PASS / 负例 FAIL / 身份断言）。
      </p>

      <div className="columns">
        <div className="card" data-testid="card-shadcn-identity">
          <h3>shadcn 项目（冻结身份）</h3>
          <p className="kv">
            <b>adapter：</b>{shadcnIdentity.adapterId} · <b>目标库：</b>{shadcnIdentity.targetLibrary} ·{' '}
            <b>profile：</b>{editDialogProfile.identity.profileId}@{editDialogProfile.identity.profileVersion}
          </p>
          <p className="kv">
            <b>upstream：</b>
            {shadcn.source.repository}@{shadcn.source.commit.slice(0, 7)} · vendored files {shadcn.files.length}
          </p>
          <ul className="compact">
            {upstreamFiles.map((f) => (
              <li key={f.name}>
                {f.name} · {f.vendoredPath} · blob {f.gitBlobSha1.slice(0, 10)}
              </li>
            ))}
          </ul>
        </div>

        <div className="card" data-testid="card-ark-identity">
          <h3>Ark 项目（冻结身份）</h3>
          <p className="kv">
            <b>adapter：</b>{arkIdentity.adapterId} · <b>目标库：</b>{arkIdentity.targetLibrary}
          </p>
          <p className="kv">
            <b>package：</b>{arkPackage.name}@{arkPackage.version} · <b>engine：</b>
            {engineIdentity.engine}@{engineIdentity.version}
          </p>
          <p className="kv">
            <b>入口：</b>
            {ark.entryPoints.map((e) => `${e.subpath}（${e.resolved}）`).join('、')}
          </p>
        </div>
      </div>

      <div className="card">
        <h3>现场有界校验（正例/负例）</h3>
        <p className="kv">
          <b>状态：</b>
          <NotFoundBadge label="live-validator" /> — ai-dev validator 依赖 node:fs（contracts/validate.ts 模块加载期
          读取 schema），浏览器无法挂载执行。
        </p>
        <p className="kv">
          <b>确定性行为（Node 侧，vitest 已覆盖）：</b>正例（真实 EditDialog → R1-DLG-02 PASS · tier=rendered ·
          业务工具数 0）；负例（无关闭入口 fixture → R1-DLG-02 FAIL · reason/repairHint）。见
          tests/validator-demo.test.tsx。
        </p>
      </div>

      <div className="card">
        <h3>MV Project AI View（mv-auto-editor）</h3>
        <p className="kv">
          <b>状态：</b>
          <NotFoundBadge label="mv-view" /> — MV 项目视图与 upstream drift 门禁（assertEvidenceNotDrifted）同为
          Node-only（git 读取 / contracts 校验），浏览器侧标注 NOT-RUNNABLE（与 ai-dev 测试套件的既有处理一致）。
        </p>
        <p className="kv">
          <b>已 pin 的 upstream artifacts（Node 侧核验）：</b>canvas / keyframes / shots（3 个 blob，PINNED_MV_HEAD
          d77fc2b，drift 门禁由 ai-dev 测试确定性覆盖）。
        </p>
      </div>

      <div className="row">
        <span className="badge green">浏览器安全：不 import ai-dev / contracts / capability-runtime</span>
        <span className="badge yellow">UI 边界由 ui-only-import-graph 守卫测试强制（本页初始图 0 个 Node 模块）</span>
      </div>
    </section>
  );
}
