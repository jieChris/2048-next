# Core Mode Runtime Boundary Implementation Plan
> **For agentic workers:** Use Trellis/Trellies as the default project workflow. Before implementation, debugging, review, or code modification, check for and follow `.trellis/`, `.trellis/spec/`, Trellis task files, Trellis skills, and Trellis commands when available. Do not use legacy Superpower Skill instructions. If old Superpower instructions conflict with Trellis/Trellies, Trellis/Trellies wins. Steps use checkbox syntax for tracking.

**Goal:** Retire `js/core_mode_runtime.js` from active runtime manifests by installing `CoreModeRuntime` from tested TypeScript before legacy game-manager scripts load.

**Architecture:** Keep `src/core/mode.ts` as the canonical owner for mode normalization, capped timer helpers, undo policy helpers, and mode detection. Add a legacy-compatible runtime factory/installer in the same TypeScript module, call it from `bootstrapHomeFamilyPage()` before legacy scripts load, then block `core_mode_runtime.js` from re-entering active manifests through `entry-manifest-audit`. The legacy JS file stays in `js/` for archive/nomodule compatibility.

**Tech Stack:** TypeScript, Vitest, Vite runtime manifests, Playwright smoke, existing `entry-manifest-audit`.

---

### Task 1: Runtime Installer Contract

**Files:**
- Modify: `src/core/mode.ts`
- Modify: `tests/unit/core-mode.spec.ts`

- [x] **Step 1: Write the failing runtime installer tests**

Add imports for `createCoreModeRuntime`, `installCoreModeRuntime`, and `type CoreModeRuntime` from `../../src/core/mode`.

Add tests that assert the TypeScript runtime exposes the same legacy `CoreModeRuntime` method names used by `js/core_mode_runtime.js`, installs onto a supplied window-like object, preserves an existing runtime object, and returns `null` when no window-like target is available.

- [x] **Step 2: Verify RED**

Run:

```bash
npx vitest run tests/unit/core-mode.spec.ts
```

Expected: FAIL because `src/core/mode.ts` does not yet export `createCoreModeRuntime`, `installCoreModeRuntime`, or `CoreModeRuntime`.

- [x] **Step 3: Add the minimal runtime factory and installer**

In `src/core/mode.ts`, add a `CoreModeRuntime` interface with the exact legacy methods and implement:

```ts
export function createCoreModeRuntime(): CoreModeRuntime {
  return {
    normalizeSpecialRules,
    normalizeModeConfig,
    resolveCappedModeState,
    isCappedModeState,
    getCappedTargetValue,
    isProgressiveCapped64Mode,
    resolveCappedTimerLegendFontSize,
    resolveCappedTimerLegendClass,
    formatCappedRepeatLabel,
    resolveCappedPlaceholderRowValues,
    resolveCappedPlaceholderSlotByRepeatCount,
    resolveCappedRowVisibilityPlan,
    createProgressiveCapped64UnlockedState,
    resolveProgressiveCapped64Unlock,
    isGameTerminatedState,
    getForcedUndoSetting,
    isUndoAllowedByMode,
    isUndoSettingFixedForMode,
    canToggleUndoSetting,
    resolveUndoPolicyState,
    isUndoInteractionEnabled,
    isTimerLeaderboardAvailableByMode,
    resolveLegacyModeFromModeKey,
    resolveModeCatalogAlias,
    resolveModeConfigModeKey,
    resolveModeCatalogConfig,
    resolveModeConfigFromCatalog,
    resolveDetectedMode
  };
}
```

Add `installCoreModeRuntime({ windowLike })` using the established non-overwrite installer pattern from `src/core/rules.ts`.

- [x] **Step 4: Verify GREEN**

Run:

```bash
npx vitest run tests/unit/core-mode.spec.ts
```

Expected: PASS.

### Task 2: Bootstrap Ownership And Manifest Guard

**Files:**
- Modify: `src/entries/home-family-bootstrap.ts`
- Modify: `scripts/entry-manifest-audit.mjs`
- Modify: `tests/unit/entry-manifest-audit-helpers.spec.ts`
- Modify: `src/entries/play-runtime-scripts.ts`
- Modify: `src/entries/replay-runtime-scripts.ts`
- Modify: `src/entries/home-family-shared.ts`

- [x] **Step 1: Write failing retired-manifest registry test**

Add this assertion near the retired active-manifest script tests:

```ts
it("tracks core-mode runtime as a retired active-manifest script", () => {
  expect(RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS).toContainEqual({
    scriptPath: "core_mode_runtime.js",
    symbolName: "coreModeRuntimeUrl"
  });
});
```

- [x] **Step 2: Verify RED**

Run:

```bash
npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts
```

Expected: FAIL because `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS` does not yet include `core_mode_runtime.js`.

- [x] **Step 3: Install runtime before legacy game-manager scripts**

In `src/entries/home-family-bootstrap.ts`, import `installCoreModeRuntime` from `../core/mode` and call it after `installRulesRuntime()` / `installSpecialRulesRuntime()` are available and before `loadHomeFamilyRuntimeScripts(...)`.

- [x] **Step 4: Add retired registry entry and verify audit RED**

In `scripts/entry-manifest-audit.mjs`, add:

```js
{
  scriptPath: "core_mode_runtime.js",
  symbolName: "coreModeRuntimeUrl"
}
```

Run:

```bash
npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts
npm run audit:entry-manifest
```

Expected: Vitest passes, and `npm run audit:entry-manifest` FAILS while active manifests still reference `core_mode_runtime.js`.

- [x] **Step 5: Remove active manifest references**

Delete the `coreModeRuntimeUrl` imports and array entries from:

```text
src/entries/play-runtime-scripts.ts
src/entries/replay-runtime-scripts.ts
src/entries/home-family-shared.ts
```

Do not delete `js/core_mode_runtime.js`. Do not remove the Vite startup bundle entry in this stage; bundle retirement should stay a separate PR after active manifest retirement is verified.

- [x] **Step 6: Verify GREEN**

Run:

```bash
npx vitest run tests/unit/core-mode.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts
npm run audit:entry-manifest
```

Expected: PASS.

### Task 3: Documentation, Gates, PR

**Files:**
- Modify: `docs/ARCHITECTURE_GUARDRAILS.md`
- Modify: `docs/ROADMAP_MILESTONES.md`
- Modify: `docs/superpowers/plans/2026-06-14-core-mode-runtime-boundary.md`

- [x] **Step 1: Update docs with Stage-1BR evidence**

Add Stage-1BR entries stating `CoreModeRuntime` is installed from `src/core/mode.ts`, active play/replay/home/capped manifests no longer reference `js/core_mode_runtime.js`, the legacy JS file remains, and Vite startup bundle retirement is intentionally deferred.

- [x] **Step 2: Run focused verification**

Run:

```bash
npx vitest run tests/unit/core-mode.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts
npm run audit:entry-manifest
npm run audit:game-manager
npm run audit:service-boundary
npm run audit:page-legacy-runtime-boundary
npm run build
PW_WEB_PORT=4280 npm run test:smoke:index-ui
npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts
```

Expected: all commands pass.

- [x] **Step 3: Run full prepush gate**

Run:

```bash
npm run verify:prepush
```

Expected: all gates pass.

- [ ] **Step 4: Commit, push, PR**

Run:

```bash
git add src/core/mode.ts tests/unit/core-mode.spec.ts src/entries/home-family-bootstrap.ts scripts/entry-manifest-audit.mjs tests/unit/entry-manifest-audit-helpers.spec.ts src/entries/play-runtime-scripts.ts src/entries/replay-runtime-scripts.ts src/entries/home-family-shared.ts docs/ARCHITECTURE_GUARDRAILS.md docs/ROADMAP_MILESTONES.md docs/superpowers/plans/2026-06-14-core-mode-runtime-boundary.md
git commit -m "refactor: install core mode runtime from ts"
git push -u origin frontend-runtime-ts-boundary-stage1br-core-mode-runtime
gh pr create --draft --title "refactor: install core mode runtime from ts" --body "<summary and test plan>"
```

Expected: PR opens against `main`; GitHub checks pass before merge.
