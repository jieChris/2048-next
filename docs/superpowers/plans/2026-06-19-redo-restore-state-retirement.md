# Redo Restore State Retirement Implementation Plan
> **For agentic workers:** Use Trellis/Trellies as the default project workflow. Before implementation, debugging, review, or code modification, check for and follow `.trellis/`, `.trellis/spec/`, Trellis task files, Trellis skills, and Trellis commands when available. Do not use legacy Superpower Skill instructions. If old Superpower instructions conflict with Trellis/Trellies, Trellis/Trellies wins. Steps use checkbox syntax for tracking.

**Goal:** Move redo restore state normalization from the legacy undo stats runtime hotspot into a tested TypeScript runtime boundary.

**Architecture:** Add `src/core/game-manager-redo-restore-state.ts` with `buildRedoRestoreState`, responsible for normalizing redo entry counters against fallback undo state and deriving timer restart intent. The legacy undo stats runtime delegates to `CoreGameManagerRedoRestoreStateRuntime` when installed and keeps a compact fallback for standalone legacy execution.

**Tech Stack:** TypeScript core runtime, legacy browser VM tests, home-family bootstrap install tests, Vitest, refactor closure audit.

---

### Task 1: Lock redo restore state behavior

**Files:**
- Create: `src/core/game-manager-redo-restore-state.ts`
- Create: `tests/unit/core-game-manager-redo-restore-state.spec.ts`
- Modify: `tests/unit/core-game-manager-undo-stats-runtime.spec.ts`
- Modify: `tests/unit/home-family-bootstrap-ranked-session.spec.ts`
- Modify: `js/core_game_manager_undo_stats_helpers_runtime.js`
- Modify: `src/entries/home-family-bootstrap.ts`

- [x] **Step 1: Write TypeScript runtime tests**
  - Verify `buildRedoRestoreState(manager, entry)` normalizes valid redo entry values.
  - Verify invalid values fall back to `manager.getUndoStateFallbackValues()`.
  - Verify runtime factory and installer expose `buildRedoRestoreState` without replacing an existing runtime.
  - Evidence: failed with missing `../../src/core/game-manager-redo-restore-state` module.

- [x] **Step 2: Write legacy bridge and bootstrap tests**
  - Inject `CoreGameManagerRedoRestoreStateRuntime.buildRedoRestoreState` into the legacy VM harness.
  - Verify legacy `buildRedoRestoreState(manager, entry)` delegates to the TypeScript runtime.
  - Extend bootstrap install coverage for `installGameManagerRedoRestoreStateRuntime`.
  - Evidence: legacy test executed the old local function and bootstrap installer mock was called 0 times before implementation.

- [x] **Step 3: Implement runtime bridge**
  - Add `src/core/game-manager-redo-restore-state.ts`.
  - Add a legacy resolver, compact fallback, and public delegating wrapper in `js/core_game_manager_undo_stats_helpers_runtime.js`.
  - Import and install `installGameManagerRedoRestoreStateRuntime()` in `src/entries/home-family-bootstrap.ts`.

- [x] **Step 4: Verify and publish**
  - Run targeted Vitest tests.
  - Run `node scripts/refactor-closure-audit.mjs`.
  - Expected: still non-zero while long-term hotspots remain, but `buildRedoRestoreState` is no longer listed.
  - Run `npm run verify:prepush`.
  - Commit as `refactor: retire redo restore state runtime`.
  - Create a draft PR, wait for GitHub CI, then squash merge when green.
  - Evidence:
    - `npx vitest run tests/unit/core-game-manager-redo-restore-state.spec.ts tests/unit/core-game-manager-undo-stats-runtime.spec.ts tests/unit/home-family-bootstrap-ranked-session.spec.ts`: 3 files passed, 8 tests passed.
    - `node scripts/refactor-closure-audit.mjs`: expected non-zero while long-term hotspots remain; hotspot count decreased to 20 and `buildRedoRestoreState` is no longer listed.
    - `npm run verify:prepush`: exit 0, all refactor gates passed.
