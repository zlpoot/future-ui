/**
 * v0.1 manual acceptance host — page composition (dev-only).
 *
 * Sections:
 *  1. Dialog comparison (shadcn EditDialog vs Ark Dialog)
 *  2. Button comparison (type/disabled/loading/pending/submit/reset)
 *  3. TextInput comparison (controlled/uncontrolled/ARIA/type roles)
 *  4. Capability matrix (real mapping data, honest supported/partial/unsupported)
 *  5. UI-only sample (independent import graph, zero business tools)
 *  6. Project AI View / Validator (dev-only, read-only + live bounded validation)
 */
import type { ReactElement } from 'react';
import { DialogSection } from './sections/dialog-section.js';
import { ButtonSection } from './sections/button-section.js';
import { TextInputSection } from './sections/text-input-section.js';
import { CapabilityMatrix } from './sections/capability-matrix.js';
import { UiOnlySample } from './sections/ui-only-sample.js';
import { AiViewSection } from './sections/ai-view-section.js';

export function App(): ReactElement {
  return (
    <div className="demo-shell">
      <h1>future-ui v0.1 · 本地手动验收 host</h1>
      <p className="subtitle">
        只读复用两个真实 adapter（shadcn / Ark）与单一 Project Profile；页面为 dev-only 最薄 host，
        强制 127.0.0.1。真实浏览器证据分层：declared / rendered / interaction-verified / not-covered（未测一律 NOT-TESTED）。
      </p>

      <DialogSection />
      <ButtonSection />
      <TextInputSection />
      <CapabilityMatrix />
      <UiOnlySample />
      <AiViewSection />
    </div>
  );
}
