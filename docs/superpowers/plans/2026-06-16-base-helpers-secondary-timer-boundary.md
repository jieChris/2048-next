# Base Helpers Secondary Timer Boundary Implementation Plan
> **For agentic workers:** Use Trellis/Trellies as the default project workflow. Before implementation, debugging, review, or code modification, check for and follow `.trellis/`, `.trellis/spec/`, Trellis task files, Trellis skills, and Trellis commands when available. Do not use legacy Superpower Skill instructions. If old Superpower instructions conflict with Trellis/Trellies, Trellis/Trellies wins. Steps use checkbox syntax for tracking.

**Goal:** Move the secondary timer helper behavior currently owned by `js/core_game_manager_base_helpers_runtime.js` into the tested TypeScript base-helper boundary.

**Architecture:** `src/core/game-manager-base-helpers.ts` becomes the TypeScript owner for secondary timer value normalization, hierarchy, expanded-state, row descriptor, placement diagnostics, stamping, invalidation, and row-state restore behavior. `src/bootstrap/game-manager-base-helpers-runtime.ts` installs those helpers under the existing legacy global names without removing active manifest, Vite bundle, or nomodule references in this stage.

**Tech Stack:** TypeScript, Vitest, legacy DOM-like runtime shims, Vite entry manifests.

---

### Task 1: RED Core Secondary Timer Tests

**Files:**
- Modify: `tests/unit/core-game-manager-base-helpers.spec.ts`

- [x] **Step 1: Write failing tests for pure secondary timer behavior**

Add imports and tests covering:
- `normalizeSecondaryTimerValue`
- `isSecondaryTimerPowerOfTwo`
- `getSecondaryTimerParentValues`
- `getSecondaryTimerChildValues`
- `resolveSecondaryTimerRowId`
- `resolveSecondaryTimerValueId`
- `parseSecondaryTimerRowIdentity`
- `resolveSecondaryTimerIndentLevel`
- `resolveSecondaryTimerLegendFontSize`
- `resolveSecondaryTimerWidthByLevel`
- `createSecondaryTimerPlacementDebugSnapshot`
- `resolveSecondaryTimerPlacementDebugSummaryFromSnapshot`
- `resolveSecondaryTimerPlacementDiagnosticsPayload`
- `resolveSecondaryTimerPlacementDiagnosticsIndexEntry`
- `collectSecondaryTimerRowsState`
- `applySecondaryTimerRowsState`

- [x] **Step 2: Run RED**

Run:

```bash
npx vitest run tests/unit/core-game-manager-base-helpers.spec.ts
```

Expected: FAIL because the new secondary timer helpers are not exported yet.

### Task 2: RED Bootstrap Runtime Installer Tests

**Files:**
- Modify: `tests/unit/bootstrap-game-manager-base-helpers-runtime.spec.ts`

- [x] **Step 1: Extend expected runtime shape**

Add every migrated secondary timer helper to `expectedRuntime` so the installer contract fails until `createGameManagerBaseHelpersRuntime()` exposes them.

- [x] **Step 2: Run RED**

Run:

```bash
npx vitest run tests/unit/bootstrap-game-manager-base-helpers-runtime.spec.ts
```

Expected: FAIL because the runtime installer does not yet expose the secondary timer helper names.

### Task 3: GREEN TypeScript Secondary Timer Boundary

**Files:**
- Modify: `src/core/game-manager-base-helpers.ts`
- Modify: `src/bootstrap/game-manager-base-helpers-runtime.ts`

- [x] **Step 1: Implement TypeScript helpers**

Port the legacy behavior from `js/core_game_manager_base_helpers_runtime.js` into `src/core/game-manager-base-helpers.ts` using the existing file's conservative record-like style. Preserve legacy coercion, object mutation, DOM-like method checks, diagnostics defaults, and return values.

- [x] **Step 2: Wire bootstrap installer**

Import and expose the migrated helper functions in `src/bootstrap/game-manager-base-helpers-runtime.ts`. Keep the installer's "do not overwrite existing function properties" behavior.

- [x] **Step 3: Run focused GREEN**

Run:

```bash
npx vitest run tests/unit/bootstrap-game-manager-base-helpers-runtime.spec.ts tests/unit/core-game-manager-base-helpers.spec.ts tests/unit/core-game-manager-base-helpers-runtime.spec.ts
```

Expected: PASS.

### Task 4: Documentation And Guardrails

**Files:**
- Modify: `docs/ARCHITECTURE_GUARDRAILS.md`
- Modify: `docs/ROADMAP_MILESTONES.md`
- Modify: `docs/superpowers/plans/2026-06-16-base-helpers-secondary-timer-boundary.md`

- [x] **Step 1: Document Stage-1DB**

Insert a new top entry stating that TypeScript now owns the secondary timer helpers, while active manifest, Vite bundle, and `public/js/legacy_index_nomodule_loader.js` references remain in place for later retirement stages.

- [x] **Step 2: Update this plan checklist**

Mark completed steps as `[x]` after their verification commands pass.

### Task 5: Full Stage Verification

**Files:**
- No direct source edits unless verification finds a regression.

- [x] **Step 1: Run stage verifications**

Run:

```bash
npx vitest run tests/unit/bootstrap-game-manager-base-helpers-runtime.spec.ts tests/unit/core-game-manager-base-helpers.spec.ts tests/unit/core-game-manager-base-helpers-runtime.spec.ts
npm run audit:entry-manifest
npm run audit:game-manager
npm run audit:service-boundary
npm run audit:page-legacy-runtime-boundary
npm run build
PW_WEB_PORT=4318 npm run test:smoke:index-ui
npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts
npm run verify:prepush
```

Expected: all commands exit 0.

- [x] **Step 2: Commit and prepare PR**

Run:

```bash
git status --short
git add src/core/game-manager-base-helpers.ts src/bootstrap/game-manager-base-helpers-runtime.ts tests/unit/core-game-manager-base-helpers.spec.ts tests/unit/bootstrap-game-manager-base-helpers-runtime.spec.ts docs/ARCHITECTURE_GUARDRAILS.md docs/ROADMAP_MILESTONES.md docs/superpowers/plans/2026-06-16-base-helpers-secondary-timer-boundary.md
git commit -m "refactor: add secondary timer base helpers boundary"
```

Expected: commit succeeds on `frontend-runtime-ts-boundary-stage1db-secondary-timers`.
