# Actuator Payload State Retirement Implementation Plan
> **For agentic workers:** Use Trellis/Trellies as the default project workflow. Before implementation, debugging, review, or code modification, check for and follow `.trellis/`, `.trellis/spec/`, Trellis task files, Trellis skills, and Trellis commands when available. Do not use legacy Superpower Skill instructions. If old Superpower instructions conflict with Trellis/Trellies, Trellis/Trellies wins. Steps use checkbox syntax for tracking.

**Goal:** Move actuator payload state construction from the legacy stats display runtime hotspot into a tested TypeScript runtime boundary.

**Architecture:** Add `src/core/game-manager-actuator-payload-state.ts` with `createActuatorPayloadState`, responsible for collecting score state, best score, termination state, blocked cells, and enabled stone values. The legacy `js/core_game_manager_stats_display_helpers_runtime.js` function delegates to `CoreGameManagerActuatorPayloadStateRuntime` when installed and keeps a compact fallback for standalone legacy execution.

**Tech Stack:** TypeScript core runtime, legacy browser VM tests, home-family bootstrap install tests, Vitest, refactor closure audit.

---

### Task 1: Lock actuator payload behavior

**Files:**
- Create: `src/core/game-manager-actuator-payload-state.ts`
- Create: `tests/unit/core-game-manager-actuator-payload-state.spec.ts`
- Modify: `tests/unit/core-game-manager-stats-display-runtime.spec.ts`
- Modify: `tests/unit/home-family-bootstrap-ranked-session.spec.ts`
- Modify: `js/core_game_manager_stats_display_helpers_runtime.js`
- Modify: `src/entries/home-family-bootstrap.ts`

- [x] **Step 1: Write TypeScript runtime tests**
  - Verify `createActuatorPayloadState(manager, operations)` returns score, over, won, bestScore, terminated, blockedCells, and stoneValues.
  - Verify stone values include only own keys set to `true` whose keys are integers.
  - Verify runtime factory and installer expose `createActuatorPayloadState` without replacing an existing runtime.
  - Run `npx vitest run tests/unit/core-game-manager-actuator-payload-state.spec.ts`.
  - Expected: FAIL before implementation because the TypeScript module does not exist.
  - Evidence: failed with missing `../../src/core/game-manager-actuator-payload-state` module.

- [x] **Step 2: Write legacy bridge and bootstrap tests**
  - Extend `tests/unit/core-game-manager-stats-display-runtime.spec.ts` to inject `CoreGameManagerActuatorPayloadStateRuntime.createActuatorPayloadState`.
  - Verify legacy `createActuatorPayloadState(manager)` delegates with an `isGameTerminated` operation.
  - Extend `tests/unit/home-family-bootstrap-ranked-session.spec.ts` to expect `installGameManagerActuatorPayloadStateRuntime`.
  - Run the three touched test files.
  - Expected: FAIL before implementation because the legacy bridge and bootstrap install are not wired yet.
  - Evidence: legacy test returned the local payload instead of `{ fromRuntime: true }`, and bootstrap installer mock was called 0 times.

- [x] **Step 3: Implement runtime bridge**
  - Add `src/core/game-manager-actuator-payload-state.ts`.
  - Add a legacy resolver, compact fallback, and public delegating wrapper in `js/core_game_manager_stats_display_helpers_runtime.js`.
  - Import and install `installGameManagerActuatorPayloadStateRuntime()` in `src/entries/home-family-bootstrap.ts`.

- [x] **Step 4: Verify and publish**
  - Run targeted Vitest tests.
  - Run `node scripts/refactor-closure-audit.mjs`.
  - Expected: still non-zero while long-term hotspots remain, but `createActuatorPayloadState` is no longer listed.
  - Run `npm run verify:prepush`.
  - Commit as `refactor: retire actuator payload state runtime`.
  - Create a draft PR, wait for GitHub CI, then squash merge when green.
  - Evidence:
    - `npx vitest run tests/unit/core-game-manager-actuator-payload-state.spec.ts tests/unit/core-game-manager-stats-display-runtime.spec.ts tests/unit/home-family-bootstrap-ranked-session.spec.ts`: 3 files passed, 6 tests passed.
    - `node scripts/refactor-closure-audit.mjs`: expected non-zero while long-term hotspots remain; hotspot count decreased to 21 and `createActuatorPayloadState` is no longer listed.
    - `npm run verify:prepush`: exit 0, all refactor gates passed.
