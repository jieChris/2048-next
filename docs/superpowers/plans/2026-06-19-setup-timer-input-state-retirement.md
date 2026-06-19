# Setup Timer Input State Retirement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:test-driven-development for behavior changes and superpowers:verification-before-completion before publishing.

**Goal:** Move setup timer/input state reset ownership from the legacy restart/setup runtime hotspot into the tested TypeScript setup-state initialization runtime boundary.

**Architecture:** Extend `src/core/setup-state-initialization.ts` with `resetSetupTimerAndInputState`, responsible for clearing an existing timer interval and resetting setup-time timer anchors, elapsed counters, pending move input, and move timeout state. The legacy restart/setup runtime delegates to `CoreSetupStateInitializationRuntime` when available and keeps a compact fallback for standalone legacy execution.

**Tech Stack:** TypeScript core runtime, legacy VM bridge tests, Vitest, refactor closure audit.

---

### Task 1: Lock setup timer/input reset behavior

**Files:**
- Modify: `src/core/setup-state-initialization.ts`
- Modify: `js/core_game_manager_restart_setup_helpers_runtime.js`
- Modify: `tests/unit/core-setup-state-initialization.spec.ts`
- Modify: `tests/unit/core-game-manager-restart-seed.spec.ts`

- [x] **Step 1: Write TypeScript reset tests**
  - Verify existing timer ids are passed to injected `clearInterval`.
  - Verify timer status, elapsed fields, anchor fields, pending input, and move deadline state reset to setup defaults.
  - Verify runtime factory/installer exposes `resetSetupTimerAndInputState`.
  - Evidence: failed with `TypeError: resetSetupTimerAndInputState is not a function`.

- [x] **Step 2: Write legacy bridge test**
  - Inject `CoreSetupStateInitializationRuntime.resetSetupTimerAndInputState` into the restart/setup VM harness.
  - Verify legacy `resetSetupTimerAndInputState(manager)` delegates with a `clearInterval` operation.
  - Evidence: failed because the injected function was not called and legacy fallback mutated locally.

- [x] **Step 3: Implement runtime bridge**
  - Add `resetSetupTimerAndInputState` to `src/core/setup-state-initialization.ts`.
  - Add a compact legacy fallback and delegate to the TypeScript runtime when installed.

- [x] **Step 4: Verify**
  - `npx vitest run tests/unit/core-setup-state-initialization.spec.ts tests/unit/core-game-manager-restart-seed.spec.ts`: 2 files passed, 22 tests passed.
  - `node scripts/refactor-closure-audit.mjs`: expected non-zero while long-term hotspots remain; hotspot count decreased to 14 and `resetSetupTimerAndInputState` is no longer listed.
