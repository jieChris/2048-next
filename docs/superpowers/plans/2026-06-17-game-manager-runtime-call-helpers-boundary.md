# Game Manager Runtime Call Helpers Boundary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the legacy game-manager runtime call and runtime state mutation globals from `js/core_game_manager_runtime_call_helpers_runtime.js` into a tested TypeScript boundary and install them before active legacy game-manager scripts load.

**Architecture:** Add `src/core/game-manager-runtime-call-helpers.ts` as the TypeScript owner for runtime method dispatch, core payload/args resolution, storage runtime calls, score/replay/undo/grid state mutations, and grid cell writes. Add `src/bootstrap/game-manager-runtime-call-helpers-runtime.ts` to install the same legacy global names that active JavaScript helpers call. This stage intentionally keeps `core_game_manager_runtime_call_helpers_runtime.js` in active manifests, `HOME_STANDARD_STARTUP_FILES`, and `public/js/legacy_index_nomodule_loader.js`; retirement is later.

**Tech Stack:** TypeScript, Vitest, Playwright smoke, existing home-family bootstrap installer pattern.

---

### Task 1: RED Core Runtime Call Helper Coverage

**Files:**
- Create: `tests/unit/core-game-manager-runtime-call-helpers.spec.ts`
- Create: `src/core/game-manager-runtime-call-helpers.ts`

- [x] **Step 1: Add failing core helper tests**

Create `tests/unit/core-game-manager-runtime-call-helpers.spec.ts` with tests covering:
- `resolveRuntimeCallResult(manager, runtimeMethodName, methodName, runtimeArgs)` rejects missing manager, invalid runtime method names, missing runtime methods, and calls the runtime method with `manager` as receiver and array-normalized args.
- `resolveCorePayloadCallWith(manager, runtimeMethodName, methodName, payload, emptyValue, resolver)` uses `{}` for undefined payload, returns `emptyValue` for missing manager, and passes the runtime call result into `resolver(manager, coreCallResult)`.
- `resolveCoreArgsCallWith(manager, runtimeMethodName, methodName, runtimeArgs, emptyValue, resolver)` returns `emptyValue` for missing manager and forwards `runtimeArgs`.
- `callCoreStorageRuntime(manager, methodName, payload, includeWindowContext)` optionally adds `{ windowLike: manager.getWindowLike() }`, uses `{}` for undefined payload, and dispatches through `callCoreStorageRuntime`.
- score setters coerce invalid values to `0`, add finite non-zero score deltas, and ignore invalid deltas.
- replay and flag setters write `replayIndex`, `replayMoves`, `replaySpawns`, `replayMovesV2`, `undoEnabled`, `disableSessionSync`, and `replayDelay` with the same fallback behavior as legacy.
- undo/grid setters normalize `grid`, `undoStack`, and `redoStack`, push undo entries, clear redo stack, write valid grid cells, reject invalid coordinates/cell shapes, and clear grid cells through the writer.

- [x] **Step 2: Run RED**

Run:

```bash
npx vitest run tests/unit/core-game-manager-runtime-call-helpers.spec.ts
```

Expected: FAIL because `src/core/game-manager-runtime-call-helpers.ts` does not yet export the helpers.

Actual: FAIL because the imported helper names were not functions while `src/core/game-manager-runtime-call-helpers.ts` only exported an empty module.

### Task 2: GREEN Core Runtime Call Helper Boundary

**Files:**
- Modify: `src/core/game-manager-runtime-call-helpers.ts`

- [x] **Step 1: Implement TypeScript helpers**

Port the legacy behavior from `js/core_game_manager_runtime_call_helpers_runtime.js`:
- `resolveRuntimeCallResult`
- `resolveCorePayloadCallWith`
- `resolveCoreArgsCallWith`
- `callCoreStorageRuntime`
- `setRuntimeScore`
- `addRuntimeScoreDelta`
- `setRuntimeReplayIndex`
- `setRuntimeReplayMoves`
- `setRuntimeReplaySpawns`
- `setRuntimeReplayMovesV2`
- `setRuntimeUndoEnabled`
- `setRuntimeDisableSessionSync`
- `setRuntimeReplayDelay`
- `setRuntimeGrid`
- `setRuntimeUndoStack`
- `setRuntimeRedoStack`
- `pushRuntimeUndoStackEntry`
- `clearRuntimeRedoStack`
- `writeRuntimeGridCell`
- `clearRuntimeGridCell`

- [x] **Step 2: Run GREEN**

Run:

```bash
npx vitest run tests/unit/core-game-manager-runtime-call-helpers.spec.ts
```

Expected: PASS.

Actual: PASS, 6 tests.

### Task 3: RED/GREEN Runtime Installer

**Files:**
- Create: `src/bootstrap/game-manager-runtime-call-helpers-runtime.ts`
- Create: `tests/unit/bootstrap-game-manager-runtime-call-helpers-runtime.spec.ts`
- Modify: `src/entries/home-family-bootstrap.ts`

- [x] **Step 1: Add failing installer tests**

Create `tests/unit/bootstrap-game-manager-runtime-call-helpers-runtime.spec.ts` asserting:
- `createGameManagerRuntimeCallHelpersRuntime()` returns every legacy helper function from `src/core/game-manager-runtime-call-helpers.ts`.
- `installGameManagerRuntimeCallHelpersRuntime({ windowLike })` installs missing functions.
- existing functions are preserved.
- `installGameManagerRuntimeCallHelpersRuntime({ windowLike: null })` returns `null`.

- [x] **Step 2: Run installer RED**

Run:

```bash
npx vitest run tests/unit/bootstrap-game-manager-runtime-call-helpers-runtime.spec.ts
```

Expected: FAIL because the installer does not exist yet.

Actual: FAIL because `../../src/bootstrap/game-manager-runtime-call-helpers-runtime` could not be resolved.

- [x] **Step 3: Implement installer and bootstrap wiring**

Add `src/bootstrap/game-manager-runtime-call-helpers-runtime.ts` following the `game-manager-env-helpers-runtime.ts` pattern. Import and call `installGameManagerRuntimeCallHelpersRuntime()` in `src/entries/home-family-bootstrap.ts` immediately after `installGameManagerEnvHelpersRuntime()`.

- [x] **Step 4: Run installer GREEN**

Run:

```bash
npx vitest run tests/unit/bootstrap-game-manager-runtime-call-helpers-runtime.spec.ts tests/unit/core-game-manager-runtime-call-helpers.spec.ts
```

Expected: PASS.

Actual: PASS, 10 tests across the core and installer specs.

### Task 4: Documentation And Verification

**Files:**
- Modify: `docs/ARCHITECTURE_GUARDRAILS.md`
- Modify: `docs/ROADMAP_MILESTONES.md`
- Modify: `docs/superpowers/plans/2026-06-17-game-manager-runtime-call-helpers-boundary.md`

- [x] **Step 1: Document Stage-1DF**

Document that TypeScript now owns game-manager runtime call helpers and installs their legacy global names before active game-manager scripts load. Note that active manifest, Vite bundle, legacy JS file, and nomodule references remain intentionally in place for later retirement stages.

- [x] **Step 2: Run full verification**

Run:

```bash
npx vitest run tests/unit/bootstrap-game-manager-runtime-call-helpers-runtime.spec.ts tests/unit/core-game-manager-runtime-call-helpers.spec.ts
npm run audit:entry-manifest
npm run audit:game-manager
npm run audit:service-boundary
npm run audit:page-legacy-runtime-boundary
npm run build
PW_WEB_PORT=4325 npm run test:smoke:index-ui
npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts
npm run verify:prepush
```

Expected: all commands exit 0.

Actual: all commands exited 0 after a TypeScript build failure exposed that `undoStack` and grid cell coordinates needed explicit strict-mode narrowing in `src/core/game-manager-runtime-call-helpers.ts`.

Verification evidence:
- `npx vitest run tests/unit/bootstrap-game-manager-runtime-call-helpers-runtime.spec.ts tests/unit/core-game-manager-runtime-call-helpers.spec.ts`: PASS, 10 tests.
- `npm run audit:entry-manifest`: PASS.
- `npm run audit:game-manager`: PASS.
- `npm run audit:service-boundary`: PASS, `violations=0`.
- `npm run audit:page-legacy-runtime-boundary`: PASS, `legacyImports=0`.
- `npm run build`: PASS after strict type narrowing.
- `PW_WEB_PORT=4325 npm run test:smoke:index-ui`: PASS, 9 tests.
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`: PASS, 8 tests.
- `npm run verify:prepush`: PASS, all refactor gates passed.

### Task 5: Commit And PR

**Files:**
- Commit all files modified in this plan.

- [x] **Step 1: Commit**

Run:

```bash
git status --short
git add src/core/game-manager-runtime-call-helpers.ts src/bootstrap/game-manager-runtime-call-helpers-runtime.ts src/entries/home-family-bootstrap.ts tests/unit/core-game-manager-runtime-call-helpers.spec.ts tests/unit/bootstrap-game-manager-runtime-call-helpers-runtime.spec.ts docs/ARCHITECTURE_GUARDRAILS.md docs/ROADMAP_MILESTONES.md docs/superpowers/plans/2026-06-17-game-manager-runtime-call-helpers-boundary.md
git commit -m "refactor: add game manager runtime call helpers boundary"
```

Expected: commit succeeds on `frontend-runtime-boundary-stage1df-runtime-call-helpers`.

Actual: commit `6f123f4` created with message `refactor: add game manager runtime call helpers boundary`.
