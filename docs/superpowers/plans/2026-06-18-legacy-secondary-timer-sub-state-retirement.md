# Legacy Secondary Timer Sub-State Retirement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move legacy secondary timer sub-state compatibility derivation from the legacy saved-state helper hotspot to the existing tested TypeScript timer-state runtime.

**Architecture:** Extend `src/core/saved-manager-timer-state.ts` with `resolveLegacySecondaryTimerSubStateFromRows`, returning the legacy `timer_sub_8192`, `timer_sub_16384`, and `timer_sub_visible` fields derived from `timer_secondary_rows`. The legacy saved-state helper delegates to `CoreSavedManagerTimerStateRuntime.resolveLegacySecondaryTimerSubStateFromRows` with a fallback implementation kept for compatibility.

**Tech Stack:** TypeScript core runtime, legacy browser VM tests, Vitest, refactor closure audit.

---

### Task 1: Lock legacy secondary timer sub-state behavior

**Files:**
- Modify: `src/core/saved-manager-timer-state.ts`
- Modify: `tests/unit/core-saved-manager-timer-state.spec.ts`
- Modify: `tests/unit/core-game-manager-saved-state-runtime.spec.ts`

- [x] **Step 1: Write TypeScript runtime tests**
  - Verify 8192 and 16384 child rows under parent 32768 populate legacy fields.
  - Verify visible legacy state becomes true when either compatible child row has `display: "block"`.
  - Verify invalid rows, wrong parents, and non-string times are ignored or normalized to empty strings.

- [x] **Step 2: Write legacy bridge tests**
  - Verify legacy `resolveLegacySecondaryTimerSubStateFromRows` delegates to `CoreSavedManagerTimerStateRuntime`.

- [x] **Step 3: Verify tests fail before implementation**
  - Run `npx vitest run tests/unit/core-saved-manager-timer-state.spec.ts tests/unit/core-game-manager-saved-state-runtime.spec.ts`.
  - Expected: FAIL before implementation because the TypeScript runtime export and legacy bridge do not exist yet.
  - Evidence: failed with 3 failures: missing TypeScript export for `resolveLegacySecondaryTimerSubStateFromRows` and legacy bridge returning fallback output instead of injected runtime output.

### Task 2: Implement runtime bridge

**Files:**
- Modify: `src/core/saved-manager-timer-state.ts`
- Modify: `js/core_game_manager_saved_state_helpers_runtime.js`

- [x] **Step 1: Export `resolveLegacySecondaryTimerSubStateFromRows` from TypeScript**

- [x] **Step 2: Add the helper to `SavedManagerTimerStateRuntime` and runtime factory**

- [x] **Step 3: Delegate the legacy helper with fallback under hotspot threshold**
  - Evidence: `wc -l js/core_game_manager_saved_state_helpers_runtime.js` reports 1488 lines after the bridge change.

### Task 3: Verify and publish

**Files:**
- Modify: this plan document with validation evidence.

- [x] **Step 1: Run validation**
  - `npx vitest run tests/unit/core-saved-manager-timer-state.spec.ts tests/unit/core-game-manager-saved-state-runtime.spec.ts`
  - `node scripts/refactor-closure-audit.mjs`
  - `npm run build`
  - `npm run verify:prepush`
  - Evidence:
    - `npx vitest run tests/unit/core-saved-manager-timer-state.spec.ts tests/unit/core-game-manager-saved-state-runtime.spec.ts`: 2 files passed, 47 tests passed.
    - `node scripts/refactor-closure-audit.mjs`: expected non-zero while long-term hotspots remain; hotspot count decreased to 27 and `resolveLegacySecondaryTimerSubStateFromRows` is no longer listed.
    - `npm run build`: exit 0.
    - `npm run verify:prepush`: exit 0, all refactor gates passed.

- [ ] **Step 2: Commit, PR, CI, merge**
  - Commit as `refactor: retire legacy secondary timer sub-state runtime`.
  - Create a draft PR against `main`.
  - Merge only after GitHub CI is green.
