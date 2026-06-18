# Saved Manager Base State Retirement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move saved manager base-state restore ownership from the legacy saved-state helper hotspot to a tested TypeScript runtime.

**Architecture:** Add `src/core/saved-manager-base-state.ts` to apply score, game flags, seed values, capped unlock state, client record id, challenge/ranked metadata, and submit reset state. The legacy helper will delegate `applySavedManagerBaseState` to `CoreSavedManagerBaseStateRuntime` with operations for `setRuntimeScore`, `clonePlain`, and `assignClientRecordId`, retaining the legacy fallback for compatibility.

**Tech Stack:** TypeScript core runtime, legacy browser VM tests, home-family bootstrap runtime installer, Vitest, refactor closure audit.

---

### Task 1: Lock saved manager base-state behavior

**Files:**
- Create: `src/core/saved-manager-base-state.ts`
- Create: `tests/unit/core-saved-manager-base-state.spec.ts`
- Modify: `tests/unit/core-game-manager-saved-state-runtime.spec.ts`
- Modify: `tests/unit/home-family-bootstrap-ranked-session.spec.ts`

- [x] **Step 1: Write TypeScript runtime tests**
  - Verify saved score/flags/seeds/capped state/client id/challenge/ranked metadata are applied.
  - Verify invalid score/seed/capped values use the same legacy fallbacks.
  - Verify null managers are ignored.

- [x] **Step 2: Write legacy bridge and bootstrap tests**
  - Verify legacy `applySavedManagerBaseState` delegates to `CoreSavedManagerBaseStateRuntime`.
  - Verify `bootstrapHomeFamilyPage` installs `installSavedManagerBaseStateRuntime`.

- [x] **Step 3: Verify tests fail before implementation**
  - Run `npx vitest run tests/unit/core-saved-manager-base-state.spec.ts tests/unit/core-game-manager-saved-state-runtime.spec.ts tests/unit/home-family-bootstrap-ranked-session.spec.ts`.
  - Result: FAIL before implementation because the TypeScript module, legacy bridge, and bootstrap install did not exist yet.

### Task 2: Implement runtime and legacy bridge

**Files:**
- Modify: `src/core/saved-manager-base-state.ts`
- Modify: `js/core_game_manager_saved_state_helpers_runtime.js`
- Modify: `src/entries/home-family-bootstrap.ts`

- [x] **Step 1: Add TypeScript runtime**
  - Export `applySavedManagerBaseState`.
  - Export `createSavedManagerBaseStateRuntime`.
  - Export `installSavedManagerBaseStateRuntime`.

- [x] **Step 2: Delegate legacy helper**
  - Add `applySavedManagerBaseStateByRuntime`.
  - Rename current body to `applySavedManagerBaseStateFallback`.
  - Keep the public `applySavedManagerBaseState` wrapper.

- [x] **Step 3: Install runtime in home bootstrap**
  - Import and call `installSavedManagerBaseStateRuntime`.

### Task 3: Verify and publish

**Files:**
- Modify: this plan document with validation evidence.

- [x] **Step 1: Run validation**
  - `npx vitest run tests/unit/core-saved-manager-base-state.spec.ts tests/unit/core-game-manager-saved-state-runtime.spec.ts tests/unit/home-family-bootstrap-ranked-session.spec.ts`
    - Result: 3 files, 46 tests passed.
  - `node scripts/refactor-closure-audit.mjs`
    - Result: progress metric moved to 28 hotspot functions; `applySavedManagerBaseState` is no longer listed.
  - `npm run build`
    - Result: TypeScript and Vite production build passed.
  - `npm run verify:prepush`
    - Result: all refactor gates passed, including game-manager-audit, boundary audits, unit, smoke, and build.

- [ ] **Step 2: Commit, PR, CI, merge**
  - Commit as `refactor: retire saved manager base state runtime`.
  - Create a draft PR against `main`.
  - Merge only after GitHub CI is green.
