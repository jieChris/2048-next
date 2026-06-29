# Frontend Legacy Retirement Stage 1B History Theme Implementation Plan
> **For agentic workers:** Use Trellis/Trellies as the default project workflow. Before implementation, debugging, review, or code modification, check for and follow `.trellis/`, `.trellis/spec/`, Trellis task files, Trellis skills, and Trellis commands when available. Do not use legacy Superpower Skill instructions. If old Superpower instructions conflict with Trellis/Trellies, Trellis/Trellies wins. Steps use checkbox syntax for tracking.

**Goal:** Remove the `history-page.ts` dependency on `../../js/theme_manager.js` while preserving history page bootstrap, language, and night-background behavior.

**Architecture:** Keep the existing Vite MPA and direct-page bootstrap. `src/pages/history-page.ts` already owns static language and night-background attribute sync, so this batch removes only the legacy side-effect theme import and updates the page legacy allowlist. The remaining `mode_catalog`, `core_game_settings_storage_runtime`, and `local_history_store` dependencies stay explicit for later history batches.

**Tech Stack:** Vite 7, TypeScript 5.9, Vitest, Playwright, existing page legacy audit scripts.

---

## Scope

This plan implements the next low-risk slice after Stage 1: shrink `PAGE_LEGACY_IMPORT_ALLOWLIST` by one history page import.

In scope:

- Remove `../../js/theme_manager.js` from `src/pages/history-page.ts`.
- Remove the same import from `scripts/page-legacy-runtime-boundary-audit.mjs`.
- Add a unit assertion that history no longer depends on `theme_manager.js`.
- Run targeted history smoke and architecture gates.
- Record evidence in roadmap and guardrail docs after verification.

Out of scope for this batch:

- Replacing `mode_catalog.js`.
- Replacing `core_game_settings_storage_runtime.js`.
- Replacing `local_history_store.js`.
- Changing `history-page-runtime.ts` behavior.
- Changing play/replay runtime script loading.

## File Structure

Modify:

- `src/pages/history-page.ts`
  - Delete the `../../js/theme_manager.js` side-effect import.
- `scripts/page-legacy-runtime-boundary-audit.mjs`
  - Delete `../../js/theme_manager.js` from the `history-page.ts` allowlist.
- `tests/unit/page-legacy-runtime-boundary-audit-helpers.spec.ts`
  - Add a static assertion that the history allowlist no longer includes `theme_manager.js`.
- `docs/ROADMAP_MILESTONES.md`
  - Add Stage 1B evidence after verification.
- `docs/ARCHITECTURE_GUARDRAILS.md`
  - Add guardrail delta after verification.

No new runtime owner is created in this slice because `history-page.ts` already has the minimal night background attribute sync used by the page contract. If smoke shows visual behavior depends on legacy dynamic CSS, add a narrow history-page CSS contract instead of restoring `theme_manager.js`.

## Task 1: Lock The History Theme Import Baseline

**Files:**
- Modify: `tests/unit/page-legacy-runtime-boundary-audit-helpers.spec.ts`

- [ ] **Step 1: Write the failing allowlist assertion**

Add this test at the end of `tests/unit/page-legacy-runtime-boundary-audit-helpers.spec.ts`:

```ts
  it("keeps history page off the legacy theme manager allowlist", () => {
    expect(PAGE_LEGACY_IMPORT_ALLOWLIST["history-page.ts"]?.has("../../js/theme_manager.js")).toBe(
      false
    );
  });
```

- [ ] **Step 2: Run the targeted unit test and verify it fails**

Run:

```bash
npx vitest run tests/unit/page-legacy-runtime-boundary-audit-helpers.spec.ts
```

Expected: FAIL because `history-page.ts` is still allowlisted for `../../js/theme_manager.js`.

## Task 2: Remove History Theme Manager Import

**Files:**
- Modify: `src/pages/history-page.ts`
- Modify: `scripts/page-legacy-runtime-boundary-audit.mjs`

- [ ] **Step 1: Delete the legacy import from the page**

Remove this line from `src/pages/history-page.ts`:

```ts
import "../../js/theme_manager.js";
```

Leave these imports in place for later batches:

```ts
import "../../js/mode_catalog.js";
import "../../js/core_game_settings_storage_runtime.js";
import "../../js/local_history_store.js";
```

- [ ] **Step 2: Delete the allowlist entry**

In `scripts/page-legacy-runtime-boundary-audit.mjs`, change the history allowlist from:

```js
  "history-page.ts": new Set([
    "../../js/theme_manager.js",
    "../../js/mode_catalog.js",
    "../../js/core_game_settings_storage_runtime.js",
    "../../js/local_history_store.js"
  ]),
```

to:

```js
  "history-page.ts": new Set([
    "../../js/mode_catalog.js",
    "../../js/core_game_settings_storage_runtime.js",
    "../../js/local_history_store.js"
  ]),
```

- [ ] **Step 3: Run the targeted unit test and audit**

Run:

```bash
npx vitest run tests/unit/page-legacy-runtime-boundary-audit-helpers.spec.ts
node scripts/page-legacy-runtime-boundary-audit.mjs
```

Expected: PASS. The page legacy audit should report `legacyImports=18`.

## Task 3: Verify History Page Behavior

**Files:**
- Test only

- [ ] **Step 1: Run direct-page history contract smoke**

Run:

```bash
npx playwright test --config=playwright.refactor-contract.config.ts tests/refactor-contract/pages-history-page-system.smoke.spec.ts
```

Expected: PASS. The history page still reports:

```ts
{
  htmlPageId: "history",
  htmlArchitecture: "manifest-bootstrap",
  htmlSystem: "unified-page-system",
  bodyManifest: "history",
  bodyFamily: "history"
}
```

- [ ] **Step 2: Run history record smoke coverage**

Run:

```bash
npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/history-records-view-list-export.smoke.spec.ts tests/smoke/history-records-import-core.smoke.spec.ts tests/smoke/history-records-import-mode-filter.smoke.spec.ts tests/smoke/history-records-owner-filter.smoke.spec.ts
```

Expected: PASS. Local history list, export, import, mode filter, and owner filter behavior remain unchanged.

- [ ] **Step 3: Run shared page night/background smoke**

Run:

```bash
npx playwright test --config=playwright.config.ts tests/smoke/pages-shared-settings-toggles.smoke.spec.ts -g "night preference reaches utility and direct pages with darkened key surfaces"
```

Expected: PASS. History remains covered as one of the utility/direct pages that follows the saved night background preference.

## Task 4: Update Evidence And Commit

**Files:**
- Modify: `docs/ROADMAP_MILESTONES.md`
- Modify: `docs/ARCHITECTURE_GUARDRAILS.md`

- [ ] **Step 1: Record roadmap delta**

Add a new top entry to `docs/ROADMAP_MILESTONES.md`:

```md
# Stage-1B History Theme Delta (2026-06-13)

## Phase Decision
- `WS4-03-next`
  - status: in_progress
  - progress: `history-page.ts` removed the legacy `theme_manager.js` page import; remaining history imports are `mode_catalog`, `core_game_settings_storage_runtime`, and `local_history_store`.

## Evidence
- `node scripts/page-legacy-runtime-boundary-audit.mjs` reports `legacyImports=18`
- `npx vitest run tests/unit/page-legacy-runtime-boundary-audit-helpers.spec.ts`
- `npx playwright test --config=playwright.refactor-contract.config.ts tests/refactor-contract/pages-history-page-system.smoke.spec.ts`
- history record smoke coverage
- shared night/background page smoke coverage
```

- [ ] **Step 2: Record guardrail delta**

Add a new top entry to `docs/ARCHITECTURE_GUARDRAILS.md`:

```md
# Guardrail Delta (2026-06-13, Stage-1B History Theme)

## Batch Impact
- `history-page.ts` no longer imports `../../js/theme_manager.js`.
- `PAGE_LEGACY_IMPORT_ALLOWLIST` shrank from `legacyImports=19` to `legacyImports=18`.
- Remaining history page legacy imports are deliberately deferred to follow-up batches with behavior-specific owners.

## Verification
- `npx vitest run tests/unit/page-legacy-runtime-boundary-audit-helpers.spec.ts`
- `node scripts/page-legacy-runtime-boundary-audit.mjs`
- `npx playwright test --config=playwright.refactor-contract.config.ts tests/refactor-contract/pages-history-page-system.smoke.spec.ts`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/history-records-view-list-export.smoke.spec.ts tests/smoke/history-records-import-core.smoke.spec.ts tests/smoke/history-records-import-mode-filter.smoke.spec.ts tests/smoke/history-records-owner-filter.smoke.spec.ts`
- `npx playwright test --config=playwright.config.ts tests/smoke/pages-shared-settings-toggles.smoke.spec.ts -g "night preference reaches utility and direct pages with darkened key surfaces"`
```

- [ ] **Step 3: Commit the batch**

Run:

```bash
git add src/pages/history-page.ts scripts/page-legacy-runtime-boundary-audit.mjs tests/unit/page-legacy-runtime-boundary-audit-helpers.spec.ts docs/ROADMAP_MILESTONES.md docs/ARCHITECTURE_GUARDRAILS.md
git commit -m "refactor: remove history legacy theme import"
```

## Task 5: Final Stage 1B Slice Gate

**Files:**
- Test only

- [ ] **Step 1: Run architecture and regression gate**

Run:

```bash
npm run audit:entry-manifest
npm run audit:page-legacy-runtime-boundary
npm run audit:service-boundary
npm run test:unit
npm run build
```

Expected: all PASS.

- [ ] **Step 2: Decide next history dependency**

After this batch lands, inspect `src/pages/history-page.ts` again. The next Stage 1B batch should choose exactly one of:

```text
../../js/mode_catalog.js
../../js/core_game_settings_storage_runtime.js
../../js/local_history_store.js
```

Pick `mode_catalog.js` first unless evidence shows `local_history_store.js` is lower risk at that point.
