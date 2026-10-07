# R1-04 #70 — Phase B: Storyboard / Keyframe Review

- Issue: #70
- Branch: `feat/r1-04-phase-b-storyboard-keyframe`
- Base: `823bcaf587069d9d740af99b1f2c09fd80200c36` (Phase B activation; parent
  `451826b91ca1619baeffc90698faf8d4d288ab45` = Phase A accepted head)
- Fixture: `E:/projects/MV-Auto-Editor` @ `d77fc2b77e75cd593733daa8a7e3c31dc2df8a16`, branch `phase-a`, worktree clean (read-only, no product code change)
- Scope: wire the REAL MV Storyboard (P4) and Keyframe (P5) review pages into
  the Phase A Project Profile without forking the Profile or faking modal
  semantics.

## 1. Goal and hard boundaries

Reuse the exact Phase A Project Profile (`mv-auto-editor` / `1.0.0`). No second
Profile, no copied Dialog/Button/TextInput rules, no scenario-specific spec.
The P4/P5 pages are **full-page, non-modal applications**, so they are mapped
only as `future-ui.button` / `future-ui.text-input` — never as
`future-ui.dialog`, never `blocking`, and R1-DLG-02/04/05 are never applied to
them. `capabilityBindings` stays empty: every review control generates **zero
business tools**. No model/API call; MV is a local validation fixture only and
its product code and real project data are untouched.

## 2. Contract amendment (minimal, backward-compatible)

The pilot exposed a real **multi-source provenance gap**: the same review
control semantics are implemented by inline, non-module scripts spread across
several real documents, while `ComponentDefinition` allowed only one
`inline-source` locator and the component-type registry keys one definition per
componentType. Authorized amendment (does not change `$id`,
`CONTRACT_MAJOR`, or any core error code):

1. **`ComponentSource` gains `inline-source-set`**
   (`packages/ai-contract-core/src/project/types.ts`):
   `{ kind: 'inline-source-set', sources: [{ locator, owner, symbols, example }] }`.
   - every member carries a REAL non-empty locator/owner/symbols/example;
   - member locators are unique; `sources` is non-empty;
   - the set and every member forbid `module`/`exports`;
   - `importableModule()` returns `null` for the set — never importable;
   - the existing `module-import` and single `inline-source` are unchanged and
     remain fully valid.
2. **`identity.upstream.artifacts?: { locator, contentHash }[]`**: optional
   multi-artifact provenance. An `inline-source-set` MUST pin exactly its member
   locators (unpinned member or orphan pin both fail validation).
3. **`upstreamIdentityFingerprint()`** folds in the artifact set sorted by
   locator (order-independent). Drift of canvas / shots / keyframes blob each
   changes the fingerprint. When `artifacts` is absent the fingerprint is
   byte-identical to the pre-amendment value (legacy definitions are
   unaffected — asserted by test).

Validator behavior is fail-closed in `project-view.ts`
(`validateComponentSource`, `validateUpstreamArtifacts`).

## 3. MV mapping (single Profile, multi-source only where real)

`buildMvProjectView()` still produces exactly three definitions against the
same Profile:

| componentType | source kind | locators |
|---|---|---|
| `future-ui.dialog` | `inline-source` (unchanged) | `web/canvas.html` |
| `future-ui.button` | `inline-source-set` | `web/canvas.html`, `web/keyframes.html`, `web/shots.html` |
| `future-ui.text-input` | `inline-source-set` | `web/canvas.html`, `web/shots.html` (no keyframes member: that page's only input is a non-text file picker) |

Only components genuinely spanning pages use the set; the dialog is left as a
single inline-source. Multi-source is not forced onto unrelated components.

### Pinned artifacts (git `hash-object`, MV HEAD d77fc2b…)

- `web/canvas.html` → `52aa42c8ad7dc5217bafb7653dcc0e47ee175131`
- `web/keyframes.html` → `c8522aaca047e9fd8c2b08c3584d35a61ced9bc9`
- `web/shots.html` → `64f8cd2864d3f7addc17531b24788a352b9d7823`

## 4. Explicit instances, scopes, relations

Two new scopes; **24** explicit review instances in total (registration is
explicit, no scanning):

- `p5/keyframe-review` — **12** instances: candidate approve / reject /
  conditional select / upload; selection lock / unlock; the file picker
  (text-input); job retry / cancel / fail; footer batch-jobs / batch-lock.
- `p4/storyboard-review` — **12** instances: save / reset / play / prev / next;
  the six draft fields (intent, notes, composition, generationPrompt,
  start seconds, anchor seconds); and the text-only prompt rewriter.

Relations use only real page/data-flow evidence: `field-of` (draft fields and
the file picker feed save/upload) and `trigger-of` (upload→candidate list,
lock/unlock→candidate panel, retry→upload, batch actions→lock/upload,
rewrite→generationPrompt field). Relation targets are registered first and the
registry verifies them; `clearScope` leaves no dangling reference (asserted).

### visible-state allowlist (safe state only)

Allowed: shot/field identifiers and safe lifecycle status (candidate/job/plan
status, locked/selected candidate id, boundary flags, and the **checked shot
count** only). Withheld by default: `generationPrompt`, `candidate.prompt`,
`notes`, the file-input value, all draft field **values**, and the **checked
shot id set** (only its count is safe).

## 5. Evidence layering — honest disposition

| layer | what is claimed in Phase B |
|---|---|
| declared | R1-PRJ-IDENTITY / R1-PRJ-CAPABILITY / R1-PRJ-DRAFT-HIDDEN per review instance |
| rendered | real page facts (see below) mirrored in jsdom AND captured read-only from the running pages |
| interaction-verified | **none** for P4/P5 — there is no button/text-input frozen rule; fixture/backend facts are not disguised as future-ui interaction PASS |
| not-covered | candidate select/approve/retry, lock/unlock, pending-disabled, action-role (no frozen rule); model generation; P4 AI candidates; live job lifecycle |

Real read-only capture: `packages/ai-dev/scripts/phase-b-real-evidence.mjs`
drives headless Chrome over CDP, selects a shot via a purely client-side click
(no POST), never clicks a mutating action, and aborts before collection if any
of the three pinned blobs or the MV HEAD drifts. Output
(`docs/r1-04/evidence/mv-real-phase-b-evidence.json` + two PNGs) confirms the
**current real project state**: P5 has no role=dialog / no close entry, one
approve + one reject button, **zero select/retry/cancel/fail buttons and zero
job rows**; P4 renders save/reset/rewrite/prev/next and the six draft fields,
also non-modal. The jsdom default fixture matches this observation exactly.

The real current state is admitted as-is and not impersonated by fixtures:
**P4 `shot-candidates.json` = []**, **P5 `jobs` = []**, **all 28 `selections`
are null**. Terminal-state job rows (retry for failed/canceled) exist only as
explicitly-labeled fixture facts.

## 6. Frozen rule policy

`BOUNDED_RULES` is **not** extended. The review action/pending/action-role
semantics have no applicable frozen rule and are recorded as rendered facts +
NOT-COVERED, exactly as decided. P4/P5 are never registered as dialog, so the
DLG rules cannot be mis-applied.

## 7. Negative cases (all asserted)

- inline-source-set: missing fields / duplicate locator / empty sources → fail;
- module/exports on the set or on a member → fail;
- set without `upstream.artifacts`, or member/pin locator mismatch → fail;
- drift of ANY pinned page blob (canvas/keyframes/shots) → gate blocks;
- stale evidence (stored record clean, current blob moved) → blocks;
- identityRef carrying the old canvas-only fingerprint → registration fails;
- non-modal review page declared as dialog or `blocking` → rejected;
- no Capability/Binding → zero business tools;
- scope cleanup → no residual instance or dangling relation;
- null/unresolvable git fact → fail closed.

## 8. Data debt recorded, NOT migrated

The current project is stale-but-valid: the four asset cards (and their version
snapshots) point to approved `script-5e51a1ec-4` beats `beat-01..11`, while the
approval pointer and all 28 shots / 15 candidates use `script-1aadbb78-1`
beats `beat-v3-01..07`. The old version is still marked approved and P4
validation accepts it, so the data is legal; the two beat axes do not map
mechanically and `candidate.inputSnapshot` is a historical snapshot. No
`scriptVersionId` / `sourceBeatIds` / card / snapshot / shot-plan /
keyframe-review data is modified; migration is left for an Owner decision.

## 9. Development quality record (first delivery, not rewritten)

Worker self-fixes driven by the targeted tests/typecheck (no human correction
during implementation):

1. `validateUpstreamArtifacts` dereferenced `source.kind` on a malformed
   non-object source → added an `isRecord` guard (surfaced by the existing
   malformed-source test).
2. New `MvCurrentUpstream` fields were first typed required, breaking the
   Phase A call shape → made `keyframesBlob`/`shotsBlob` optional and keyed the
   Phase B path off their presence, preserving Phase A behavior byte-for-byte.
3. Review scope coverage was first expected `full`; with no applicable pending
   rule the honest status is `covered` → corrected the expectation.
4. The Phase A P2 test assumed every component was `inline-source`; updated to
   dialog=`inline-source`, review controls=`inline-source-set`, keeping the
   core assertion `import === null`.
5. jsdom does not give `import.meta.url` a file scheme → evidence path resolved
   from `process.cwd()`.
6. Collector route was first guessed `/keyframe-review`; the real route is
   `/keyframes`, and shot selection is a client-side click on
   `button.shot[data-shot]` (verified read-only, no write request).

## 10. Validation

- `ai-contract-core` targeted + full: 56 passed.
- `ai-dev` full: project/tooling tests pass (153 passed + 4 gated skips across
  ai-dev/ai-contract-core); Phase B adds 25 review tests.
- typecheck (root + shadcn-adapter + ai-dev): clean. ESLint on changed files: clean.
- MV deterministic only: `node --test tests/p5-keyframes.test.mjs
  tests/p4-shots.test.mjs tests/ui-shell.test.mjs` → 8/8 pass; MV worktree and
  real project data verified clean afterward.
- Repo-wide `vitest run`: only `tests/toolchain.test.ts` fails because the
  sandbox runs Node v22.23.2 while the frozen baseline requires Node v24; this
  is an environment mismatch unrelated to the Phase B change (413 other tests
  pass).
- No deploy/publish, no merge, no #71.
