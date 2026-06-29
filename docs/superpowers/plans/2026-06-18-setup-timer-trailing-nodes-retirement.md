# Setup Timer Trailing Nodes Retirement Implementation Plan
> **For agentic workers:** Use Trellis/Trellies as the default project workflow. Before implementation, debugging, review, or code modification, check for and follow `.trellis/`, `.trellis/spec/`, Trellis task files, Trellis skills, and Trellis commands when available. Do not use legacy Superpower Skill instructions. If old Superpower instructions conflict with Trellis/Trellies, Trellis/Trellies wins. Steps use checkbox syntax for tracking.

**Goal:** Move setup timer trailing whitespace and `<br>` node relocation from the legacy setup timer UI helper hotspot into the tested TypeScript setup timer row normalization runtime.

**Architecture:** Extend `src/core/setup-timer-row-normalize.ts` with `appendSetupTimerTrailingNodes`, which accepts DOM-like row and sibling nodes, moves whitespace text nodes and up to two trailing break nodes, and returns the number of moved break nodes. The legacy `js/core_game_manager_setup_timer_ui_helpers_runtime.js` function delegates to `CoreSetupTimerRowNormalizeRuntime.appendSetupTimerTrailingNodes` when present and keeps a compact fallback for standalone legacy execution.

**Tech Stack:** TypeScript core runtime, legacy browser VM tests, Vitest, refactor closure audit.

---

### Task 1: Lock setup timer trailing node behavior

**Files:**
- Modify: `src/core/setup-timer-row-normalize.ts`
- Modify: `tests/unit/core-setup-timer-row-normalize.spec.ts`
- Modify: `tests/unit/core-game-manager-setup-timer-ui-runtime.spec.ts`

- [x] **Step 1: Write TypeScript runtime tests**
  - Import `appendSetupTimerTrailingNodes` from `src/core/setup-timer-row-normalize.ts`.
  - Add a minimal linked-node test fixture where nodes expose `nodeType`, `nodeValue`, `tagName`, `nextSibling`, and a row exposes `appendChild`.
  - Verify the helper appends leading whitespace text nodes and two `<br>` nodes in order.
  - Verify it stops at the second moved break and returns `2`.
  - Verify non-whitespace text and non-break element nodes stop movement and return the break count moved so far.

- [x] **Step 2: Write legacy bridge tests**
  - Extend `SetupTimerUiRuntime` in `tests/unit/core-game-manager-setup-timer-ui-runtime.spec.ts` with `appendSetupTimerTrailingNodes`.
  - Inject `CoreSetupTimerRowNormalizeRuntime.appendSetupTimerTrailingNodes` as a mock returning `7`.
  - Verify the legacy global `appendSetupTimerTrailingNodes(row, nextAfterTimer)` returns `7` and passes through both arguments.

- [x] **Step 3: Verify tests fail before implementation**
  - Run `npx vitest run tests/unit/core-setup-timer-row-normalize.spec.ts tests/unit/core-game-manager-setup-timer-ui-runtime.spec.ts`.
  - Expected: FAIL before implementation because the TypeScript runtime export and legacy bridge do not exist yet.
  - Evidence: failed with 3 failures: missing TypeScript export for `appendSetupTimerTrailingNodes` and legacy bridge still executing the local helper.

### Task 2: Implement runtime bridge

**Files:**
- Modify: `src/core/setup-timer-row-normalize.ts`
- Modify: `js/core_game_manager_setup_timer_ui_helpers_runtime.js`

- [x] **Step 1: Export `appendSetupTimerTrailingNodes` from TypeScript**
  - Add small DOM-like interfaces for row append and sibling traversal.
  - Preserve current legacy semantics exactly: move whitespace text nodes, move `<br>` element nodes, stop at the first unsupported node, and stop after two break nodes.

- [x] **Step 2: Add the helper to `SetupTimerRowNormalizeRuntime` and runtime factory**
  - Update the runtime interface and `createSetupTimerRowNormalizeRuntime()` return shape.
  - Update install/runtime shape tests so existing runtimes are not replaced.

- [x] **Step 3: Delegate the legacy helper with fallback under hotspot threshold**
  - Rename the existing legacy function body to a compact fallback.
  - Add a public `appendSetupTimerTrailingNodes` wrapper that calls `CoreSetupTimerRowNormalizeRuntime.appendSetupTimerTrailingNodes` when available.
  - Keep `js/core_game_manager_setup_timer_ui_helpers_runtime.js` below the game-manager audit line/function thresholds.

### Task 3: Verify and publish

**Files:**
- Modify: this plan document with validation evidence.

- [x] **Step 1: Run validation**
  - `npx vitest run tests/unit/core-setup-timer-row-normalize.spec.ts tests/unit/core-game-manager-setup-timer-ui-runtime.spec.ts`
  - `node scripts/refactor-closure-audit.mjs`
  - `npm run build`
  - `npm run verify:prepush`
  - Evidence:
    - `npx vitest run tests/unit/core-setup-timer-row-normalize.spec.ts tests/unit/core-game-manager-setup-timer-ui-runtime.spec.ts`: 2 files passed, 8 tests passed.
    - `node scripts/refactor-closure-audit.mjs`: expected non-zero while long-term hotspots remain; hotspot count decreased to 26 and `appendSetupTimerTrailingNodes` is no longer listed.
    - `npm run build`: exit 0.
    - `npm run verify:prepush`: exit 0, all refactor gates passed.

- [ ] **Step 2: Commit, PR, CI, merge**
  - Commit as `refactor: retire setup timer trailing nodes runtime`.
  - Create a draft PR against `main`.
  - Merge only after GitHub CI is green.
