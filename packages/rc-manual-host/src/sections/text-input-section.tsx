/**
 * TextInput comparison — real shadcn ShadcnTextInput vs real Ark Field.Input.
 *
 * Honest limitations rendered on the page:
 *  - Ark Field.Input renders ONE native input; the seven contracted types do
 *    not share one implicit ARIA role (number=spinbutton, search=searchbox,
 *    password has none) → accessibility.role = unsupported (partial).
 *  - The same frozen-contract tension is independently recorded by the shadcn
 *    column; the contract is not modified here.
 */
import { useState } from 'react';
import type { ReactElement } from 'react';
import { ShadcnTextInput } from '@future-ui/shadcn-adapter/browser';
import { ArkTextInput } from '@future-ui/ark-ui-adapter/browser';

export function TextInputSection(): ReactElement {
  const [shadcnValue, setShadcnValue] = useState('');
  const [arkValue, setArkValue] = useState('');

  return (
    <section className="section" data-testid="section-text-input">
      <h2>3 · TextInput 对照（受控 / 非受控 / ARIA / type 角色）</h2>
      <p className="section-note">
        左侧 shadcn（label/description → aria-labelledby/aria-describedby），右侧 Ark
        Field.Root/Input/HelperText（Field 自动 aria-describedby）。
      </p>
      <div className="columns">
        <div className="card">
          <h3>shadcn · ShadcnTextInput</h3>
          <div className="row">
            <label htmlFor="sc-controlled">受控：</label>
            <ShadcnTextInput
              id="sc-controlled"
              name="sc-controlled"
              value={shadcnValue}
              onValueChange={(e) => setShadcnValue(e.value)}
              description="值实时回显"
            />
            <span className="badge">{shadcnValue || '(空)'}</span>
          </div>
          <div className="row">
            <label htmlFor="sc-uncontrolled">非受控：</label>
            <ShadcnTextInput id="sc-uncontrolled" name="sc-uncontrolled" defaultValue="默认值" />
          </div>
          <div className="row">
            <label htmlFor="sc-error">error：</label>
            <ShadcnTextInput id="sc-error" name="sc-error" error description="aria-invalid=true" />
          </div>
          <div className="row">
            <label htmlFor="sc-disabled">disabled：</label>
            <ShadcnTextInput id="sc-disabled" name="sc-disabled" disabled defaultValue="只读不可编辑" />
          </div>
          <div className="row">
            <label htmlFor="sc-readonly">readOnly：</label>
            <ShadcnTextInput id="sc-readonly" name="sc-readonly" readOnly defaultValue="只读可聚焦" />
          </div>
          <p className="kv">
            <b>type 角色提示：</b>text/email/tel/url → role=textbox；number→spinbutton、search→searchbox、
            password 无隐式角色（契约 role=textbox 无法全满足，两库如实记录 partial）。
          </p>
        </div>

        <div className="card">
          <h3>Ark · ArkTextInput（Field.Input）</h3>
          <div className="row">
            <label htmlFor="ark-controlled">受控：</label>
            <ArkTextInput
              id="ark-controlled"
              name="ark-controlled"
              value={arkValue}
              onValueChange={(e) => setArkValue(e.value)}
              description="Field.HelperText 自动 aria-describedby"
            />
            <span className="badge">{arkValue || '(空)'}</span>
          </div>
          <div className="row">
            <label htmlFor="ark-uncontrolled">非受控：</label>
            <ArkTextInput id="ark-uncontrolled" name="ark-uncontrolled" defaultValue="默认值" />
          </div>
          <div className="row">
            <label htmlFor="ark-error">error：</label>
            <ArkTextInput id="ark-error" name="ark-error" error description="invalid → aria-invalid" />
          </div>
          <div className="row">
            <label htmlFor="ark-disabled">disabled：</label>
            <ArkTextInput id="ark-disabled" name="ark-disabled" disabled defaultValue="只读不可编辑" />
          </div>
          <div className="row">
            <label htmlFor="ark-readonly">readOnly：</label>
            <ArkTextInput id="ark-readonly" name="ark-readonly" readOnly defaultValue="只读可聚焦" />
          </div>
          <div className="row">
            <label htmlFor="ark-number">type=number：</label>
            <ArkTextInput id="ark-number" name="ark-number" type="number" defaultValue="3" />
            <label htmlFor="ark-search">type=search：</label>
            <ArkTextInput id="ark-search" name="ark-search" type="search" />
            <label htmlFor="ark-password">type=password：</label>
            <ArkTextInput id="ark-password" name="ark-password" type="password" />
          </div>
          <p className="kv">
            <b>诚实限制：</b>number/search/password 隐式角色 ≠ textbox（accessibility.role unsupported），
            不伪造 role 覆盖。
          </p>
        </div>
      </div>
      <div className="row">
        <span className="badge yellow">shadcn：partial（role 契约张力）</span>
        <span className="badge yellow">Ark：partial（role 契约张力 + headless token）</span>
      </div>
    </section>
  );
}
