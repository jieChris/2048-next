# Setup Timer Row Normalize Retirement Implementation Plan
> **For agentic workers:** Use Trellis/Trellies as the default project workflow. Before implementation, debugging, review, or code modification, check for and follow `.trellis/`, `.trellis/spec/`, Trellis task files, Trellis skills, and Trellis commands when available. Do not use legacy Superpower Skill instructions. If old Superpower instructions conflict with Trellis/Trellies, Trellis/Trellies wins. Steps use checkbox syntax for tracking.

**Goal:** Move setup timer row normalization orchestration out of the legacy setup timer UI helper and into a tested TypeScript runtime.

**Architecture:** Add `src/core/setup-timer-row-normalize.ts` to own slot filtering, timerbox/document preconditions, existing-row class normalization, and missing-row creation dispatch. The legacy helper will delegate to `CoreSetupTimerRowNormalizeRuntime` with DOM operations supplied by the legacy file, and keep a fallback implementation for compatibility when the runtime is unavailable.

**Tech Stack:** TypeScript core runtime, legacy browser globals, Vitest unit tests, refactor closure audit.

---

### Task 1: Lock setup timer row normalization behavior

**Files:**
- Create: `tests/unit/core-setup-timer-row-normalize.spec.ts`
- Modify: `tests/unit/core-game-manager-setup-timer-ui-runtime.spec.ts`
- Modify: `tests/unit/home-family-bootstrap-ranked-session.spec.ts`

- [x] **Step 1: Write TypeScript runtime tests**
  - Cover existing row class normalization.
  - Cover valid missing row creation.
  - Cover invalid slot and missing DOM precondition skips.

- [x] **Step 2: Write legacy bridge and bootstrap tests**
  - Verify `normalizeLegacyTimerRowsForSetup` delegates to `CoreSetupTimerRowNormalizeRuntime`.
  - Verify `bootstrapHomeFamilyPage` installs `installSetupTimerRowNormalizeRuntime`.

- [x] **Step 3: Verify tests fail before implementation**
  - Run `npx vitest run tests/unit/core-setup-timer-row-normalize.spec.ts tests/unit/core-game-manager-setup-timer-ui-runtime.spec.ts tests/unit/home-family-bootstrap-ranked-session.spec.ts`.
  - Result: FAIL because the runtime module did not exist, the legacy helper did not delegate, and bootstrap did not install the runtime.

### Task 2: Implement runtime and legacy bridge

**Files:**
- Create: `src/core/setup-timer-row-normalize.ts`
- Modify: `js/core_game_manager_setup_timer_ui_helpers_runtime.js`
- Modify: `src/entries/home-family-bootstrap.ts`

- [x] **Step 1: Add TypeScript runtime**
  - Export `normalizeLegacyTimerRowsForSetup`.
  - Export `createSetupTimerRowNormalizeRuntime`.
  - Export `installSetupTimerRowNormalizeRuntime`.

- [x] **Step 2: Delegate legacy helper**
  - Add `normalizeLegacyTimerRowsForSetupByRuntime`.
  - Rename current body to `normalizeLegacyTimerRowsForSetupFallback`.
  - Keep the public `normalizeLegacyTimerRowsForSetup` wrapper.

- [x] **Step 3: Install runtime in home bootstrap**
  - Import and call `installSetupTimerRowNormalizeRuntime`.

### Task 3: Verify and publish

**Files:**
- Modify: this plan document with validation evidence.

- [x] **Step 1: Run validation**
  - `npx vitest run tests/unit/core-setup-timer-row-normalize.spec.ts tests/unit/core-game-manager-setup-timer-ui-runtime.spec.ts tests/unit/home-family-bootstrap-ranked-session.spec.ts`
    - Result: 3 files, 7 tests passed.
  - `node scripts/refactor-closure-audit.mjs`
    - Result: progress metric moved to 30 hotspot functions; `normalizeLegacyTimerRowsForSetup` is no longer listed.
  - `npm run build`
    - Result: TypeScript and Vite production build passed.
  - `npm run verify:prepush`
    - Result: all refactor gates passed, including game-manager-audit, boundary audits, unit, smoke, and build.

- [ ] **Step 2: Commit, PR, CI, merge**
  - Commit as `refactor: retire setup timer row normalize runtime`.
  - Create a draft PR against `main`.
  - Merge only after GitHub CI is green.
