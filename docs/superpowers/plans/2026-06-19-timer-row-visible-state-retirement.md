# Timer Row Visible State Retirement Implementation Plan
> **For agentic workers:** Use Trellis/Trellies as the default project workflow. Before implementation, debugging, review, or code modification, check for and follow `.trellis/`, `.trellis/spec/`, Trellis task files, Trellis skills, and Trellis commands when available. Do not use legacy Superpower Skill instructions. If old Superpower instructions conflict with Trellis/Trellies, Trellis/Trellies wins. Steps use checkbox syntax for tracking.

**Goal:** Move timer row visibility mutation from the legacy panel timer runtime hotspot into a tested TypeScript runtime boundary.

**Architecture:** Add `src/core/game-manager-timer-row-visible-state.ts` with `setTimerRowVisibleState`, responsible for resolving the row element, clearing the scroll-hidden marker, and applying visible/hidden/collapsed display state. The legacy panel timer runtime delegates to `CoreGameManagerTimerRowVisibleStateRuntime` when installed and keeps a compact fallback for standalone legacy execution.

**Tech Stack:** TypeScript core runtime, legacy browser VM tests, home-family bootstrap install tests, Vitest, refactor closure audit.

---

### Task 1: Lock timer row visibility behavior

**Files:**
- Create: `src/core/game-manager-timer-row-visible-state.ts`
- Create: `tests/unit/core-game-manager-timer-row-visible-state.spec.ts`
- Modify: `tests/unit/core-game-manager-panel-timer-runtime.spec.ts`
- Modify: `tests/unit/home-family-bootstrap-ranked-session.spec.ts`
- Modify: `js/core_game_manager_panel_timer_helpers_runtime.js`
- Modify: `src/entries/home-family-bootstrap.ts`

- [x] **Step 1: Write TypeScript runtime tests**
  - Verify visible rows get `display: block`, `visibility: visible`, and pointer events reset.
  - Verify hidden rows with `keepSpace` keep display space but disable pointer events.
  - Verify collapsed rows use `display: none` and reset visibility/pointer events.
  - Verify runtime factory and installer expose `setTimerRowVisibleState` without replacing an existing runtime.
  - Evidence: failed with missing `../../src/core/game-manager-timer-row-visible-state` module.

- [x] **Step 2: Write legacy bridge and bootstrap tests**
  - Inject `CoreGameManagerTimerRowVisibleStateRuntime.setTimerRowVisibleState` into the panel timer VM harness.
  - Verify legacy `setTimerRowVisibleState(manager, value, visible, keepSpace)` delegates to the TypeScript runtime.
  - Extend bootstrap install coverage for `installGameManagerTimerRowVisibleStateRuntime`.
  - Evidence: legacy test executed old local function and errored on missing `manager.getTimerRowEl`; bootstrap installer mock was called 0 times.

- [x] **Step 3: Implement runtime bridge**
  - Add `src/core/game-manager-timer-row-visible-state.ts`.
  - Add a legacy resolver, compact fallback, and public delegating wrapper in `js/core_game_manager_panel_timer_helpers_runtime.js`.
  - Import and install `installGameManagerTimerRowVisibleStateRuntime()` in `src/entries/home-family-bootstrap.ts`.

- [x] **Step 4: Verify and publish**
  - Run targeted Vitest tests.
  - Run `node scripts/refactor-closure-audit.mjs`.
  - Expected: still non-zero while long-term hotspots remain, but `setTimerRowVisibleState` is no longer listed.
  - Run `npm run verify:prepush`.
  - Commit as `refactor: retire timer row visible state runtime`.
  - Create a draft PR, wait for GitHub CI, then squash merge when green.
  - Evidence:
    - `npx vitest run tests/unit/core-game-manager-timer-row-visible-state.spec.ts tests/unit/core-game-manager-panel-timer-runtime.spec.ts tests/unit/home-family-bootstrap-ranked-session.spec.ts`: 3 files passed, 12 tests passed.
    - `node scripts/refactor-closure-audit.mjs`: expected non-zero while long-term hotspots remain; hotspot count decreased to 18 and `setTimerRowVisibleState` is no longer listed.
    - `npm run verify:prepush`: exit 0, all refactor gates passed.
