# Reset Round Stats State Retirement Implementation Plan
> **For agentic workers:** Use Trellis/Trellies as the default project workflow. Before implementation, debugging, review, or code modification, check for and follow `.trellis/`, `.trellis/spec/`, Trellis task files, Trellis skills, and Trellis commands when available. Do not use legacy Superpower Skill instructions. If old Superpower instructions conflict with Trellis/Trellies, Trellis/Trellies wins. Steps use checkbox syntax for tracking.

**Goal:** Move round statistics reset ownership from the legacy session-init helper hotspot into the tested TypeScript game-manager runtime-state boundary.

**Architecture:** Extend `src/core/game-manager-runtime-state.ts` with `resetRoundStatsState`, which resets per-round counters, item state, spawn overrides, undo availability, and HUD refresh side effects through injected operations. The legacy `js/core_game_manager_session_init_helpers_runtime.js` function delegates to `CoreGameManagerRuntimeStateRuntime.resetRoundStatsState` when available and keeps a compact fallback for standalone legacy execution.

**Tech Stack:** TypeScript core runtime, legacy browser VM tests, Vitest, refactor closure audit.

---

### Task 1: Lock reset round stats behavior

**Files:**
- Modify: `src/core/game-manager-runtime-state.ts`
- Modify: `tests/unit/core-game-manager-runtime-state.spec.ts`
- Modify: `tests/unit/core-game-manager-session-init-runtime.spec.ts`

- [x] **Step 1: Write TypeScript runtime tests**
  - Import `resetRoundStatsState` from `src/core/game-manager-runtime-state.ts`.
  - Verify it resets `comboStreak`, `successfulMoveCount`, `ipsInputCount`, `ipsInputTimes`, `undoUsed`, lock fields, spawn counts, item progress/inventory, spawn suppression, and spawn override.
  - Verify it sets `undoEnabled` from `loadUndoSettingForMode(manager.mode)`.
  - Verify it calls injected `createEmptyItemInventory`, `updateItemModeHud`, and `updateMoveTimeoutHud` with the supplied `nowMs`.

- [x] **Step 2: Write legacy bridge tests**
  - Extend the VM runtime type in `tests/unit/core-game-manager-session-init-runtime.spec.ts` with `resetRoundStatsState`.
  - Inject `CoreGameManagerRuntimeStateRuntime.resetRoundStatsState` as a mock.
  - Verify legacy `resetRoundStatsState(manager)` delegates to the TypeScript runtime with operations containing `createEmptyItemInventory`, `updateItemModeHud`, `updateMoveTimeoutHud`, and `nowMs`.

- [x] **Step 3: Verify tests fail before implementation**
  - Run `npx vitest run tests/unit/core-game-manager-runtime-state.spec.ts tests/unit/core-game-manager-session-init-runtime.spec.ts`.
  - Expected: FAIL before implementation because the TypeScript runtime export and legacy bridge do not exist yet.
  - Evidence: failed with 2 failures: `resetRoundStatsState` was not exported from TypeScript and the legacy function did not delegate to the injected runtime mock.

### Task 2: Implement runtime bridge

**Files:**
- Modify: `src/core/game-manager-runtime-state.ts`
- Modify: `js/core_game_manager_session_init_helpers_runtime.js`

- [x] **Step 1: Export `resetRoundStatsState` from TypeScript**
  - Add manager-like fields required by the reset.
  - Add operation hooks for `createEmptyItemInventory`, `updateItemModeHud`, `updateMoveTimeoutHud`, and `nowMs`.
  - Preserve legacy semantics exactly, including no-op behavior for null managers.

- [x] **Step 2: Add the helper to `GameManagerRuntimeStateRuntime` and runtime factory**
  - Update the runtime interface and `createGameManagerRuntimeStateRuntime()` return shape.
  - Update install/runtime shape tests so existing runtimes are not replaced.

- [x] **Step 3: Delegate legacy `resetRoundStatsState` with fallback under hotspot threshold**
  - Rename the current body to a compact fallback helper.
  - Add a public wrapper that calls `CoreGameManagerRuntimeStateRuntime.resetRoundStatsState` with legacy operations.
  - Keep the public legacy function below the refactor closure hotspot threshold.

### Task 3: Verify and publish

**Files:**
- Modify: this plan document with validation evidence.

- [x] **Step 1: Run validation**
  - `npx vitest run tests/unit/core-game-manager-runtime-state.spec.ts tests/unit/core-game-manager-session-init-runtime.spec.ts`
  - `node scripts/refactor-closure-audit.mjs`
  - `npm run build`
  - `npm run verify:prepush`
  - Evidence:
    - `npx vitest run tests/unit/core-game-manager-runtime-state.spec.ts tests/unit/core-game-manager-session-init-runtime.spec.ts`: 2 files passed, 7 tests passed.
    - `node scripts/refactor-closure-audit.mjs`: expected non-zero while long-term hotspots remain; hotspot count decreased to 24 and `resetRoundStatsState` is no longer listed.
    - `npm run build`: exit 0.
    - `npm run verify:prepush`: exit 0, all refactor gates passed.

- [ ] **Step 2: Commit, PR, CI, merge**
  - Commit as `refactor: retire reset round stats runtime`.
  - Create a draft PR against `main`.
  - Merge only after GitHub CI is green.
