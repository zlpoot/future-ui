# R1-04 #70 — Phase C: Ark UI Contrast

- Issue: #70 (Kickoff comment `6051779952`)
- Branch: `feat/r1-04-phase-c-ark-ui-contrast`
- Base: `d6f2cf188d483e6d35e8abccf90d6b28c9e12a5c` (`origin/main`, Phase A/B transport squash)
- New package: `packages/ark-ui-adapter` (`@future-ui/ark-ui-adapter`, private)
- Pinned library: `@ark-ui/react@5.39.3` (MIT) over `@zag-js/*@1.45.0`
- Toolchain: Node `v24.21.0`, pnpm `11.28.4` (corepack, repo-frozen), frozen lockfile
- MV fixture: untouched (external read-only validation asset; no product change, no data write, no model/API)

## 1. Goal and hard boundaries

Provide an **independent library adapter contrast column** for the three frozen
components under the SAME frozen Component Contract, conformance rules and
BOUNDED_RULES, and the SAME single `mv-auto-editor / 1.0.0` Project Profile.

- No second Project Profile; no copied Dialog/Button/TextInput rules; no
  business-scenario-specific spec.
- No change to public Schema `$id`, `CONTRACT_MAJOR`, or core error codes.
- BOUNDED_RULES is **not extended** — there is still no button/text-input
  frozen rule, so those columns render facts only and never claim a
  frozen-rule PASS.
- The shadcn adapter is a comparison implementation, not a semantic authority;
  this package does not import shadcn adapter code and derives its conclusions
  independently from the pinned Ark artifact.
- No model/API/external-account calls; no deploy/publish; #71 not started;
  PR is a Draft and is not self-merged; #70 is not closed.

## 2. Pinned artifact provenance (verified from the tarball, not docs)

- `@ark-ui/react@5.39.3`, MIT, dist integrity
  `sha512-8fx0mj1Ht51ElT9rGDSnX+oaBr++9zo//4E0xhXzB299XwHi0vXHXtTYzhpH/m6qb+R3fHz5flsMv1X0+fZvtQ==`,
  tarball 472,236 B (sha1 `3dfb59f8fca896bf52af2be1bcc78cd6392c082d`),
  unpacked 3.34 MB / 3,874 files, peer `react >= 18`.
- Subpath exports `@ark-ui/react/dialog`, `@ark-ui/react/field`
  (`./* → dist/components/<name>/index.js`).
- Per-entry sha256 of the two files this package actually imports, re-hashed
  from the installed package at test time (swap → fail-closed):
  - `dist/components/dialog/index.js` → `85783ded5741c23f3014ccf82217861f7c390714952e11d59bc3e6cf3ac5d17e`
  - `dist/components/field/index.js` → `d43cce2f705221e15194e207a5b97d93f7884f0ef6dce109ba1b8b87b65989cd`
- Verified surface facts:
  - Dialog namespace `Root/Positioner/Backdrop/Content/Title/Description/CloseTrigger/Trigger`.
  - Field namespace `Root/Input/Label/HelperText/ErrorText/Textarea/Select`;
    `FieldInput` renders `ark.input` (a native input) merged with
    `field.getInputProps()` (`field-input.js`).
  - **There is NO Button component** (no `dist/components/button`, no
    `@zag-js/button` dependency). The polymorphic `ark.button` factory only
    renders a native `<button>` and is not treated as an Ark Button primitive.
- `@zag-js/dialog@1.45.0` props verified in `dist/dialog.types.d.ts`:
  controlled `open`, `onOpenChange({open})`, `modal`/`trapFocus`/`restoreFocus`
  default true, `closeOnEscape` default true, `initialFocusEl`/`finalFocusEl`,
  `role` default `dialog`.

## 3. Difference matrix (independent conclusion)

| Frozen component | Status | Realization | Unsupported members |
|---|---|---|---|
| `future-ui.dialog` | **supported** | real Ark `Dialog` primitive (`DialogRoot/Positioner/Content/Title/Description`) over the zag machine; adapter pins `aria-modal="true"` and renders label/description as `Title`/`Description` | none across the 8 contract domains |
| `future-ui.button` | **partial** | **honest native `<button>` composition** — Ark ships no Button primitive, so this is labelled `via: native`/`data-composition="native"` and never claimed as an Ark export | `features.loading`, `props.loading`, `state.loading` (upstream has no busy concept; host projects `aria-busy`/disabled) |
| `future-ui.text-input` | **partial** | real Ark `Field.Root/Field.Input/Field.HelperText`; error→`invalid`/aria-invalid, description→auto aria-describedby, hybrid value | `accessibility.role` — one native input cannot be role=textbox for all 7 contracted types |

### The role=textbox tension (recorded, not papered over)

The frozen TextInput declares `accessibility.role = "textbox"` while allowing
`text|email|password|number|search|tel|url`. The single native input
`Field.Input` renders carries the browser's **type-dependent implicit role**:
`number → spinbutton`, `search → searchbox`, `password` has no corresponding
ARIA role. Only `text/email/tel/url` are textboxes. The adapter therefore
marks `accessibility.role = unsupported` and proves the real roles in tests
instead of overriding the implicit role to fake conformance. This is the same
frozen-contract shape the shadcn column independently records — a contract
observation, not an Ark defect; a per-type role policy would require a future
contract version and is out of scope.

### Visual token layer

Ark is headless (zero CSS/tokens). The D16 visual token domain is honestly
`unsupported` for all three (visuals are the host application's job); the
fail-closed validator still requires that domain to be present and confessed
rather than silently empty.

## 4. Member-level mapping + fail-closed validation

- Independent vocabulary in `src/adapter/types.ts`:
  `mapped | inherited-equivalent | unsupported | not-applicable`, with
  realization `via: ark-primitive | native | composition`. It does not import
  the shadcn adapter's types.
- For the 8 literal domains the expected member set is **derived from the
  frozen contract object** and must equal the concluded set exactly. Errors
  use a package-independent namespace `r1_ark_adapter_*` (frozen core codes
  and shadcn `r1_adapter_*` codes are neither reused nor extended):
  anchor mismatch, domain/member missing, unknown/duplicate member,
  mapped without `via`/`mapsTo`, inherited-equivalent without evidence,
  unsupported without reason+impact, forbidden member-level not-applicable,
  empty/non-confessed token domain.

## 5. Isolated React consumers

- `src/components/ark-dialog.tsx` — real Ark `Dialog*` named exports; controlled
  open, `onOpenChange` forwarded only for user dismiss, `aria-modal` pinned,
  label/description parts; an OPTIONAL `closeLabel` renders the real
  `Dialog.CloseTrigger` (no close affordance is invented when omitted).
- `src/components/ark-text-input.tsx` — real `Field.Root/Field.Input/Field.HelperText`;
  hybrid ownership; valueChange only from user edits and suppressed while
  disabled/readOnly; never forces role=textbox.
- `src/components/ark-button.tsx` — honest native `<button>`; defaults
  `type="button"`; click suppressed while disabled/loading; `loading` projects
  BOTH the native `disabled` attribute (so a submit/reset form action cannot
  fire) and host `aria-busy`.

The package is added to `conformance` `UI_PACKAGES`, so package.json and src
imports are asserted to never reference capability-runtime/ai-contract-core/
plugin-kernel/openai/ai-sdk, and `@future-ui/*` deps are limited to
`contracts` + `react-provider`.

## 6. Evidence tiers

- **declared** — provenance constants and the three member-level mapping tables
  (`src/ark-provenance.ts`, `src/adapter/mappings.ts`).
- **rendered** — jsdom structural assertions: dialog role/aria-modal/
  aria-labelledby/aria-describedby and zag `data-scope`/generated ids/
  positioner part; closed-by-default; explicit close entry rendered only on
  request (real `data-part="close-trigger"` zag button, `type="button"`; absent
  when `closeLabel` omitted); Field label/describedby/aria-invalid/
  disabled/readOnly/7 types; native button tag/type/aria-busy; real implicit
  roles `spinbutton`/`searchbox`/password-input; absence of
  data-capability/agent/binding/model/mcp.
- **interaction-verified** — focus moves to the FIRST focusable part on open;
  Escape fires `onOpenChange({open:false})` only from a user gesture; the real
  Ark `Dialog.CloseTrigger` click also fires `onOpenChange({open:false})`
  (rendered only when `closeLabel` is supplied); programmatic open transitions
  fire nothing; button click fires and is suppressed while disabled/loading;
  a loading/disabled `type=submit|reset` button does NOT trigger its native
  form submit/reset (native disabled blocks the form action), while an enabled
  submit/reset still does; TextInput valueChange payload, controlled reflection
  with no event on programmatic set, defaultValue seeding, and no event while
  disabled/readOnly.
- **not-covered** (explicit, never reported as PASS):
  - real-browser pixel/layout/visual appearance and visual tokens (Ark is
    headless; jsdom has no layout engine);
  - real screen-reader/AT announcement output;
  - real focus-trap **Tab cycling** and scroll-lock/aria-hidden visual effects
    (only structure + Escape/initial-focus are exercised under jsdom);
  - focus restoration to a concrete trigger — the wrapper renders no
    `Dialog.Trigger` (host owns open), so there is no adapter-owned trigger to
    restore to; zag's `restoreFocus`/`finalFocusEl` mechanism is declared, not
    interaction-verified here;
  - any model/API/business call — none exist by construction (zero Capability/
    Binding), so there is nothing of that kind to verify.

### jsdom harness note (test-only, not a product behavior)

jsdom has no layout engine, so `offsetWidth/Height` are 0 and
`getClientRects()` is empty. zag gates focusability and the dismissable layer
on `isElementVisible()`, which consults exactly those values. The package
`tests/setup.ts` therefore shims connected elements as laid out (and flushes
the deferred micro/animation frames before dismissing) so the **real zag
machine paths** run under jsdom; it does not alter ARIA, key handling or zag
internals. A real browser needs no shim. This is why the interactions above
are interaction-verified in jsdom while browser-only effects stay
not-covered.

## 7. First-implementation quality record (preserved, not rewritten)

1. JSDoc comment in `ark-provenance.ts` contained `components/*/index…`, whose
   `*/` early-closed the block comment → oxc `PARSE_ERROR`. Worker self-fixed
   the wording.
2. An edit left a duplicate `);` in `ark-text-input.tsx` → parse error. Worker
   self-fixed.
3. The fail-closed validator itself caught 8 `inherited-equivalent` conclusions
   shipped without locatable `evidence` (button a11y/lifecycle, text-input
   keyboard/focus/lifecycle). Worker added real evidence; this is the validator
   working as intended on first data, not a test-only fix.
4. A test wrongly assumed 5.39.3 renders the dialog through a body portal
   (asserted surface outside the render container). The real pinned build
   renders `Positioner` **inline**; the assertion was corrected to the real
   behavior (`data-scope=dialog`, generated ids, positioner part present).
5. jsdom no-layout caused focus to land on the content container (zag's correct
   browser fallback) and the deferred dismissable layer was not yet top-most on
   a synchronous Escape. Fixed only in the test harness (documented visibility
   shim + frame flush + `act` + async expectation); no product workaround.
6. `tsc` (TS 6): removed deprecated `baseUrl`; resolved an import/local name
   collision (`Dialog as ArkDialog` vs the `ArkDialog` component) by using the
   package's named exports.

### Independent Review 1 — REQUEST_CHANGES (preserved; first CI fail kept)

Independent engineering conclusion on exact HEAD `360eb56e` was
**REQUEST_CHANGES (P1×2, P2×1)**. GitHub CI run
[37758971069](https://github.com/zlpoot/future-ui/actions/runs/37758971069)
**failed on Linux** (frozen-install/lint/typecheck passed; test 472 passed /
8 skipped / 1 failed). The first failure and the worker's repair iterations
are kept here; the eventual green run does not overwrite them.

7. **P1-A · cross-platform provenance path.** `provenance.test.ts` built the
   on-disk entry path with `entry.resolved.replace(/\//g, '\\')`, forcing
   backslashes — an invalid path on Linux, so the `@ark-ui/react/dialog` entry
   was reported missing only on CI (Windows local passed). Fixed to
   `join(arkRoot, ...entry.resolved.split('/'))`; the SHA256 re-hash assertion
   is unchanged. (First cross-platform miss by the worker; caught by Linux CI
   and the independent reviewer.)
8. **P1-B · Button loading must imply native disabled.** The native button
   rendered `disabled={disabled || undefined}`, omitting `loading`; an
   onClick guard cannot stop a `type=submit/reset` form action. Fixed to
   `disabled={disabled || loading}` and added real-form negative tests:
   loading/disabled submit never submits and loading reset never resets, while
   enabled submit/reset still activate. Button stays **partial** and Ark
   upstream loading stays **unsupported** (host projection only).
9. **P2 · headless token fail-closed + no false positive.** The token-domain
   check only required non-emptiness, so a fabricated `status:'mapped'` visual
   token could pass. Added `r1_ark_adapter_token_false_claim`: for the headless
   library every token conclusion must be `unsupported` with reason+impact
   (`mapped`/`inherited-equivalent` visual tokens are rejected). Added both
   directions — false `mapped` and false `inherited-equivalent` are rejected,
   while an honest headless `unsupported` token is accepted (no false
   positive). Token conclusions are deliberately excluded from the
   semantic-domain rollup, so Dialog stays **supported** across the 8
   Component Contract domains while its visual-token layer is independently
   confessed unsupported (that scope is asserted explicitly).
10. **P2 · explicit close entry.** Added an opt-in real `Dialog.CloseTrigger`
    to the consumer and tests for its zag surface (`data-part=
    "close-trigger"`, `data-scope=dialog`, `type=button"`, ordered after the
    primary control), its absence when not requested, and its
    `onOpenChange({open:false})` interaction. Real-browser focus restoration /
    Tab trap remain **not-covered** and are not promoted by this test.
    During this the worker iterated several times on a jsdom-only React
    `act()` timing notice (the focus-trap deactivation chains a raf that, under
    parallel worker load, could land between acts); the deterministic fix keeps
    the whole gesture → deferred flush → assertion → in-act unmount inside one
    `act` via a bounded `drainDeferred` helper — test-only, no product or ARIA
    change; verified clean across repeated full-package runs.

## 8. Verification (Node 24, frozen lockfile)

- Targeted: `vitest run packages/ark-ui-adapter` — 6 files / 65 tests pass
  (Review 1 increment added 12 tests; deterministic, no React `act()` notice
  across repeated full-package runs).
- Full gate (Node v24.21.0, pnpm 11.28.4): `pnpm install --frozen-lockfile`,
  `pnpm lint` (0 error / 0 warning), `pnpm typecheck` (4 tsc projects incl. the
  new package) all pass; `pnpm test` = **48 files, 489 passed / 4 skipped**
  (the 4 skipped are the pre-existing `ai-dev/mv-real-evidence` ones).
- Dependency graph: the new package is covered by the existing conformance
  UI-only test; no new/heavy CI is added. Linux CI parity is covered by the
  cross-platform provenance path fix (Review 1 P1-A).

## 9. Files

- New: `packages/ark-ui-adapter/{package.json,tsconfig.json}`,
  `src/{index.ts,ark-provenance.ts,errors.ts}`,
  `src/adapter/{types.ts,mappings.ts,mapping-store.ts}`,
  `src/components/{ark-dialog.tsx,ark-button.tsx,ark-text-input.tsx}`,
  `tests/{setup.ts,mapping.test.ts,provenance.test.ts,ark-dialog.test.tsx,
  ark-button.test.tsx,ark-text-input.test.tsx,ui-only-negatives.test.tsx}`.
- Modified: root `package.json` (typecheck adds the package tsc project),
  root `tsconfig.json` (exclude the standalone project),
  `pnpm-lock.yaml` (freeze @ark-ui/react 5.39.3 + @zag-js 1.45.0),
  `packages/conformance/tests/ui-only-dependency-graph.test.ts`
  (add the package to `UI_PACKAGES`).
