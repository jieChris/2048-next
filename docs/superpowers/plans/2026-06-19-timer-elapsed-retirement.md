# Timer Elapsed Retirement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move timer elapsed duration resolution from the legacy panel timer runtime hotspot into a tested TypeScript runtime boundary.

**Architecture:** Add `src/core/game-manager-timer-elapsed.ts` with `resolveTimerElapsedMs`, responsible for choosing server anchor, local anchor, legacy `startTime`, or offset fallback and clamping the result. The legacy `js/core_game_manager_panel_timer_helpers_runtime.js` helper delegates to `CoreGameManagerTimerElapsedRuntime` when installed and keeps a compact fallback for standalone legacy execution.

**Tech Stack:** TypeScript core runtime, legacy browser VM tests, home-family bootstrap install tests, Vitest, refactor closure audit.

---

### Task 1: Lock timer elapsed behavior

**Files:**
- Create: `src/core/game-manager-timer-elapsed.ts`
- Create: `tests/unit/core-game-manager-timer-elapsed.spec.ts`
- Modify: `tests/unit/core-game-manager-panel-timer-runtime.spec.ts`
- Modify: `tests/unit/home-family-bootstrap-ranked-session.spec.ts`
- Modify: `js/core_game_manager_panel_timer_helpers_runtime.js`
- Modify: `src/entries/home-family-bootstrap.ts`

- [x] **Step 1: Write TypeScript runtime tests**
  - Verify server anchor uses server now and offset.
  - Verify local anchor falls back when no server anchor is available.
  - Verify active `startTime` fallback and offset fallback.
  - Verify runtime factory and installer expose `resolveTimerElapsedMs` without replacing an existing runtime.
  - Evidence: failed with missing `../../src/core/game-manager-timer-elapsed` module.

- [x] **Step 2: Write legacy bridge and bootstrap tests**
  - Inject `CoreGameManagerTimerElapsedRuntime.resolveTimerElapsedMs` into the panel timer VM harness.
  - Verify legacy `getDurationMs(manager)` delegates through the TypeScript runtime with operations for server now and elapsed offset.
  - Extend bootstrap install coverage for `installGameManagerTimerElapsedRuntime`.
  - Evidence: legacy test returned old local calculation `8250` instead of runtime value, and bootstrap installer mock was called 0 times.

- [x] **Step 3: Implement runtime bridge**
  - Add `src/core/game-manager-timer-elapsed.ts`.
  - Add a legacy resolver, compact fallback, and public delegating wrapper in `js/core_game_manager_panel_timer_helpers_runtime.js`.
  - Import and install `installGameManagerTimerElapsedRuntime()` in `src/entries/home-family-bootstrap.ts`.

- [x] **Step 4: Verify and publish**
  - Run targeted Vitest tests.
  - Run `node scripts/refactor-closure-audit.mjs`.
  - Expected: still non-zero while long-term hotspots remain, but `resolveTimerElapsedMs` is no longer listed.
  - Run `npm run verify:prepush`.
  - Commit as `refactor: retire timer elapsed runtime`.
  - Create a draft PR, wait for GitHub CI, then squash merge when green.
  - Evidence:
    - `npx vitest run tests/unit/core-game-manager-timer-elapsed.spec.ts tests/unit/core-game-manager-panel-timer-runtime.spec.ts tests/unit/home-family-bootstrap-ranked-session.spec.ts`: 3 files passed, 11 tests passed.
    - `node scripts/refactor-closure-audit.mjs`: expected non-zero while long-term hotspots remain; hotspot count decreased to 19 and `resolveTimerElapsedMs` is no longer listed.
    - `npm run verify:prepush`: exit 0, all refactor gates passed.
