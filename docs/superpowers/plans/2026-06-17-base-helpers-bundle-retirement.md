# Base Helpers Bundle Retirement Implementation Plan
> **For agentic workers:** Use Trellis/Trellies as the default project workflow. Before implementation, debugging, review, or code modification, check for and follow `.trellis/`, `.trellis/spec/`, Trellis task files, Trellis skills, and Trellis commands when available. Do not use legacy Superpower Skill instructions. If old Superpower instructions conflict with Trellis/Trellies, Trellis/Trellies wins. Steps use checkbox syntax for tracking.

**Goal:** Retire `js/core_game_manager_base_helpers_runtime.js` from the active Vite-generated home startup bundle after the TypeScript base-helper boundary owns the required globals.

**Architecture:** `src/bootstrap/game-manager-base-helpers-runtime.ts` installs the migrated base-helper legacy global names before active home/play/replay/capped scripts load. This stage extends the Vite bundled-runtime guard and removes the legacy runtime from `HOME_STANDARD_STARTUP_FILES`; `public/js/legacy_index_nomodule_loader.js`, the legacy JS file, and legacy VM coverage remain for separate compatibility policy work.

**Tech Stack:** TypeScript, Vitest, Vite config, Playwright smoke, existing `entry-manifest-audit`.

---

### Task 1: RED Bundle Retirement Guard

**Files:**
- Modify: `tests/unit/entry-manifest-audit-helpers.spec.ts`

- [x] **Step 1: Add failing bundled-retired registry coverage**

Add this assertion near the other retired Vite bundled runtime script tests:

```ts
it("tracks base-helpers runtime as a retired Vite bundled runtime script", () => {
  expect(BUNDLED_RETIRED_RUNTIME_SCRIPT_REFS).toContainEqual({
    scriptPath: "core_game_manager_base_helpers_runtime.js"
  });
});
```

- [x] **Step 2: Run RED**

Run:

```bash
npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts
```

Expected: FAIL because `BUNDLED_RETIRED_RUNTIME_SCRIPT_REFS` does not yet include `core_game_manager_base_helpers_runtime.js`.

### Task 2: RED Bundle Audit

**Files:**
- Modify: `scripts/entry-manifest-audit.mjs`

- [x] **Step 1: Add bundled retired registry entry**

Add this object to `BUNDLED_RETIRED_RUNTIME_SCRIPT_REFS`:

```js
{
  scriptPath: "core_game_manager_base_helpers_runtime.js"
}
```

- [x] **Step 2: Run audit RED**

Run:

```bash
npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts
npm run audit:entry-manifest
```

Expected: Vitest passes; `npm run audit:entry-manifest` FAILS while `vite.config.ts` still includes `core_game_manager_base_helpers_runtime.js` in `HOME_STANDARD_STARTUP_FILES`.

### Task 3: GREEN Remove Active Bundle Reference

**Files:**
- Modify: `vite.config.ts`

- [x] **Step 1: Remove legacy runtime from startup bundle**

Delete this entry from `HOME_STANDARD_STARTUP_FILES`:

```ts
"core_game_manager_base_helpers_runtime.js",
```

Do not delete `js/core_game_manager_base_helpers_runtime.js`. Do not change `public/js/legacy_index_nomodule_loader.js`.

- [x] **Step 2: Run GREEN**

Run:

```bash
npx vitest run tests/unit/bootstrap-game-manager-base-helpers-runtime.spec.ts tests/unit/core-game-manager-base-helpers.spec.ts tests/unit/core-game-manager-base-helpers-runtime.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts
npm run audit:entry-manifest
```

Expected: all commands exit 0.

### Task 4: Documentation And Verification

**Files:**
- Modify: `docs/ARCHITECTURE_GUARDRAILS.md`
- Modify: `docs/ROADMAP_MILESTONES.md`
- Modify: `docs/superpowers/plans/2026-06-17-base-helpers-bundle-retirement.md`

- [x] **Step 1: Document Stage-1DD**

Document that `core_game_manager_base_helpers_runtime.js` is no longer included in `HOME_STANDARD_STARTUP_FILES`, while the TypeScript installer remains the active owner and the nomodule loader reference remains intentionally in place.

- [x] **Step 2: Run full verification**

Run:

```bash
npm run audit:entry-manifest
npm run audit:game-manager
npm run audit:service-boundary
npm run audit:page-legacy-runtime-boundary
npm run build
PW_WEB_PORT=4321 npm run test:smoke:index-ui
npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts
npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-contracts-saved-session.smoke.spec.ts
npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-practice-board-code-input.smoke.spec.ts tests/smoke/pages-ui-regressions.smoke.spec.ts
npm run verify:prepush
```

Expected: all commands exit 0.

Completed evidence:
- `npm run audit:entry-manifest`
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `PW_WEB_PORT=4321 npm run test:smoke:index-ui`
- `PW_WEB_PORT=4322 npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `PW_WEB_PORT=4323 npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-contracts-saved-session.smoke.spec.ts`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-practice-board-code-input.smoke.spec.ts tests/smoke/pages-ui-regressions.smoke.spec.ts`
- `npm run verify:prepush`

### Task 5: Commit And PR

**Files:**
- Commit all files modified in this plan.

- [x] **Step 1: Commit**

Run:

```bash
git status --short
git add scripts/entry-manifest-audit.mjs tests/unit/entry-manifest-audit-helpers.spec.ts vite.config.ts docs/ARCHITECTURE_GUARDRAILS.md docs/ROADMAP_MILESTONES.md docs/superpowers/plans/2026-06-17-base-helpers-bundle-retirement.md
git commit -m "refactor: retire base helpers bundle runtime"
```

Expected: commit succeeds on `frontend-runtime-bundle-stage1dd-base-helpers`.
