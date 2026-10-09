/**
 * Button comparison — real shadcn ShadcnButton vs Ark native composition.
 *
 * Honest facts rendered on the page:
 *  - Ark ships NO Button primitive (@ark-ui/react@5.39.3) → ArkButton is a
 *    platform-native <button> composition (via: native), never claimed as an
 *    Ark export.
 *  - loading is UNSUPPORTED as an Ark upstream feature; the host projection is
 *    native disabled + aria-busy (frozen contract: loading implies disabled).
 *
 * The form shows type=submit/reset native side effects and disabled/loading
 * blocking — all observable in a real browser.
 */
import { useState } from 'react';
import type { ReactElement } from 'react';
import { ShadcnButton } from '@future-ui/shadcn-adapter/browser';
import { ArkButton } from '@future-ui/ark-ui-adapter/browser';

const PENDING_MS = 1200;

function useFormDemo(): {
  formState: { submits: number; resets: number; clicks: number; pending: boolean };
  setPending: (v: boolean) => void;
  bump: (key: 'submits' | 'resets' | 'clicks') => void;
} {
  const [formState, setFormState] = useState({ submits: 0, resets: 0, clicks: 0, pending: false });
  return {
    formState,
    setPending: (v) => setFormState((s) => ({ ...s, pending: v })),
    bump: (key) => setFormState((s) => ({ ...s, [key]: s[key] + 1 })),
  };
}

function FormCard({
  title,
  note,
  buttons,
  bump,
  state,
}: {
  title: string;
  note: string;
  buttons: (bump: (key: 'submits' | 'resets' | 'clicks') => void) => ReactElement;
  bump: (key: 'submits' | 'resets' | 'clicks') => void;
  state: { submits: number; resets: number; clicks: number; pending: boolean };
}): ReactElement {
  return (
    <div className="card">
      <h3>{title}</h3>
      <p className="card-note">{note}</p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          bump('submits');
        }}
        onReset={() => bump('resets')}
        data-testid={`${title.includes('shadcn') ? 'shadcn' : 'ark'}-form`}
      >
        <input className="host-input" name="q" defaultValue="" aria-label="查询词" />
        <div className="row">{buttons(bump)}</div>
      </form>
      <p className="kv">
        <b>submit 次数：</b>
        {state.submits} · <b>reset 次数：</b>
        {state.resets} · <b>普通 click：</b>
        {state.clicks} · <b>pending：</b>
        {state.pending ? '是' : '否'}
      </p>
    </div>
  );
}

export function ButtonSection(): ReactElement {
  const shadcn = useFormDemo();
  const ark = useFormDemo();

  const runPending = async (setPending: (v: boolean) => void): Promise<void> => {
    setPending(true);
    await new Promise((resolve) => setTimeout(resolve, PENDING_MS));
    setPending(false);
  };

  return (
    <section className="section" data-testid="section-button">
      <h2>2 · Button 对照（type / disabled / loading / pending / submit / reset）</h2>
      <p className="section-note">
        同一表单内验证原生副作用：loading 期间原生 disabled=true（submit/reset 均不触发）且 aria-busy=true。
      </p>
      <div className="columns">
        <FormCard
          title="shadcn · ShadcnButton"
          note="薄组合层：loading → disabled + aria-busy；默认 type=button。"
          bump={shadcn.bump}
          state={shadcn.formState}
          buttons={(bump) => (
            <>
              <ShadcnButton
                type="button"
                data-testid="shadcn-btn-click"
                onClick={() => bump('clicks')}
              >
                type=button（click）
              </ShadcnButton>
              <ShadcnButton type="submit" data-testid="shadcn-btn-submit">
                type=submit
              </ShadcnButton>
              <ShadcnButton type="reset" variant="outline" data-testid="shadcn-btn-reset">
                type=reset
              </ShadcnButton>
              <ShadcnButton
                type="button"
                variant="outline"
                loading={shadcn.formState.pending}
                data-testid="shadcn-btn-loading"
                onClick={() => void runPending(shadcn.setPending)}
              >
                {shadcn.formState.pending ? '保存中…' : 'loading 1.2s'}
              </ShadcnButton>
            </>
          )}
        />
        <FormCard
          title="Ark · ArkButton（native composition）"
          note="诚实标注：非 Ark primitive；loading 上游 unsupported → 投影 disabled+aria-busy。"
          bump={ark.bump}
          state={ark.formState}
          buttons={(bump) => (
            <>
              <ArkButton type="button" onClick={() => bump('clicks')}>
                type=button（click）
              </ArkButton>
              <ArkButton type="submit">type=submit</ArkButton>
              <ArkButton type="reset">type=reset</ArkButton>
              <ArkButton type="button" loading={ark.formState.pending} onClick={() => void runPending(ark.setPending)}>
                {ark.formState.pending ? '保存中…' : 'loading 1.2s'}
              </ArkButton>
            </>
          )}
        />
      </div>
      <div className="row">
        <span className="badge yellow">shadcn：partial（loading 为组合实现）</span>
        <span className="badge yellow">Ark：partial（无 Button primitive → native composition）</span>
      </div>
    </section>
  );
}
