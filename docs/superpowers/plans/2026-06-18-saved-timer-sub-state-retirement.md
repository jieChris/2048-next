# Saved Timer Sub-State Retirement Implementation Plan
> **For agentic workers:** Use Trellis/Trellies as the default project workflow. Before implementation, debugging, review, or code modification, check for and follow `.trellis/`, `.trellis/spec/`, Trellis task files, Trellis skills, and Trellis commands when available. Do not use legacy Superpower Skill instructions. If old Superpower instructions conflict with Trellis/Trellies, Trellis/Trellies wins. Steps use checkbox syntax for tracking.

**Goal:** Move saved timer secondary-row sub-state composition out of the legacy saved-state helper hotspot and into the tested TypeScript timer-state runtime.

**Architecture:** Extend `src/core/saved-manager-timer-state.ts` with `buildSavedTimerSubState`, which combines collected secondary rows, expanded parent ids, and legacy `timer_sub_*` compatibility fields. The legacy `collectSavedTimerSubState` keeps DOM collection ownership but delegates payload composition to `CoreSavedManagerTimerStateRuntime.buildSavedTimerSubState`, with a compact fallback for standalone legacy execution.

**Tech Stack:** TypeScript core runtime, legacy browser VM tests, Vitest, refactor closure audit.

---

### Task 1: Lock saved timer sub-state composition

**Files:**
- Modify: `src/core/saved-manager-timer-state.ts`
- Modify: `tests/unit/core-saved-manager-timer-state.spec.ts`
- Modify: `tests/unit/core-game-manager-saved-state-runtime.spec.ts`

- [x] **Step 1: Write TypeScript runtime tests**
  - Import `buildSavedTimerSubState` from `src/core/saved-manager-timer-state.ts`.
  - Verify compatible secondary rows and expanded parent ids are preserved in the saved timer sub-state.
  - Verify `timer_sub_8192`, `timer_sub_16384`, and `timer_sub_visible` are derived through the existing legacy secondary timer row helper.
  - Verify non-array inputs normalize to empty arrays and empty legacy fields.

- [x] **Step 2: Write legacy bridge tests**
  - Extend the VM runtime type in `tests/unit/core-game-manager-saved-state-runtime.spec.ts` with `collectSavedTimerSubState`.
  - Inject `CoreSavedManagerTimerStateRuntime.buildSavedTimerSubState` as a mock returning a sentinel object.
  - Inject `collectSecondaryTimerRowsState` and `collectSecondaryTimerExpandedParents` globals that return known arrays.
  - Verify `collectSavedTimerSubState(manager, documentLike)` returns the sentinel object and passes the collected arrays to the TypeScript runtime.

- [x] **Step 3: Verify tests fail before implementation**
  - Run `npx vitest run tests/unit/core-saved-manager-timer-state.spec.ts tests/unit/core-game-manager-saved-state-runtime.spec.ts`.
  - Expected: FAIL before implementation because the TypeScript runtime export and legacy bridge do not exist yet.
  - Evidence: failed with 3 failures: missing TypeScript export for `buildSavedTimerSubState` and legacy `collectSavedTimerSubState` returning local composition instead of the injected runtime sentinel.

### Task 2: Implement runtime bridge

**Files:**
- Modify: `src/core/saved-manager-timer-state.ts`
- Modify: `js/core_game_manager_saved_state_helpers_runtime.js`

- [x] **Step 1: Export `buildSavedTimerSubState` from TypeScript**
  - Add a typed return shape containing `timer_secondary_rows`, `timer_secondary_expanded_parents`, `timer_sub_8192`, `timer_sub_16384`, and `timer_sub_visible`.
  - Reuse `resolveLegacySecondaryTimerSubStateFromRows` instead of duplicating legacy field derivation.

- [x] **Step 2: Add the helper to `SavedManagerTimerStateRuntime` and runtime factory**
  - Update the runtime interface and `createSavedManagerTimerStateRuntime()` return shape.
  - Update install/runtime shape tests so existing runtimes are not replaced.

- [x] **Step 3: Delegate legacy `collectSavedTimerSubState` with fallback under hotspot threshold**
  - Rename the existing object-composition body to a compact fallback helper.
  - Keep DOM collection in legacy JS: collect secondary rows and expanded parents, then delegate composition.
  - Keep `collectSavedTimerSubState` below the refactor closure hotspot threshold.

### Task 3: Verify and publish

**Files:**
- Modify: this plan document with validation evidence.

- [x] **Step 1: Run validation**
  - `npx vitest run tests/unit/core-saved-manager-timer-state.spec.ts tests/unit/core-game-manager-saved-state-runtime.spec.ts`
  - `node scripts/refactor-closure-audit.mjs`
  - `npm run build`
  - `npm run verify:prepush`
  - Evidence:
    - `npx vitest run tests/unit/core-saved-manager-timer-state.spec.ts tests/unit/core-game-manager-saved-state-runtime.spec.ts`: 2 files passed, 50 tests passed.
    - `node scripts/refactor-closure-audit.mjs`: expected non-zero while long-term hotspots remain; hotspot count decreased to 25 and `collectSavedTimerSubState` is no longer listed.
    - `npm run build`: exit 0.
    - `npm run verify:prepush`: exit 0, all refactor gates passed.

- [ ] **Step 2: Commit, PR, CI, merge**
  - Commit as `refactor: retire saved timer sub-state runtime`.
  - Create a draft PR against `main`.
  - Merge only after GitHub CI is green.
