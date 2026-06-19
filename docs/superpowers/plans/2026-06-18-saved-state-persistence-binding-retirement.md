# Saved State Persistence Binding Retirement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move saved-state persistence event binding from the legacy session-init helper hotspot into a tested TypeScript runtime boundary.

**Architecture:** Add `src/core/game-manager-saved-state-persistence-binding.ts` with `bindGameManagerSavedStatePersistence`, responsible for resolving the window-like object, registering `beforeunload`/`pagehide` handlers, invoking forced save and ranked checkpoint persistence, binding storage sync, and marking the manager as bound. The legacy `js/core_game_manager_session_init_helpers_runtime.js` function delegates to `CoreGameManagerSavedStatePersistenceBindingRuntime` when available and keeps a compact fallback for standalone legacy execution.

**Tech Stack:** TypeScript core runtime, legacy browser VM tests, home-family bootstrap install tests, Vitest, refactor closure audit.

---

### Task 1: Lock saved-state persistence binding behavior

**Files:**
- Create: `src/core/game-manager-saved-state-persistence-binding.ts`
- Create: `tests/unit/core-game-manager-saved-state-persistence-binding.spec.ts`
- Modify: `tests/unit/core-game-manager-session-init-runtime.spec.ts`
- Modify: `tests/unit/home-family-bootstrap-ranked-session.spec.ts`

- [x] **Step 1: Write TypeScript runtime tests**
  - Verify `bindGameManagerSavedStatePersistence(manager, operations)` no-ops when the manager is null, has no window-like object, or is already bound.
  - Verify it registers the same save handler for `beforeunload` and `pagehide`.
  - Verify invoking the handler calls `saveGameState(manager, { force: true })`, attempts ranked checkpoint persistence, binds storage sync, and sets `manager.savedGameStateBound = true`.
  - Verify ranked checkpoint errors are swallowed so page-hide save still remains safe.
  - Verify runtime factory and installer expose `bindGameManagerSavedStatePersistence` without replacing an existing runtime.

- [x] **Step 2: Write legacy bridge tests**
  - Extend `SessionInitRuntime` in `tests/unit/core-game-manager-session-init-runtime.spec.ts` with `bindGameManagerSavedStatePersistence`.
  - Inject `CoreGameManagerSavedStatePersistenceBindingRuntime.bindGameManagerSavedStatePersistence` as a mock.
  - Verify the legacy function delegates with operations containing `saveGameState` and `bindSavedStateSyncStorageListener`.

- [x] **Step 3: Write bootstrap install test update**
  - Add `installGameManagerSavedStatePersistenceBindingRuntime` to the existing bootstrap mock and expectation in `tests/unit/home-family-bootstrap-ranked-session.spec.ts`.

- [x] **Step 4: Verify tests fail before implementation**
  - Run `npx vitest run tests/unit/core-game-manager-saved-state-persistence-binding.spec.ts tests/unit/core-game-manager-session-init-runtime.spec.ts tests/unit/home-family-bootstrap-ranked-session.spec.ts`.
  - Expected: FAIL before implementation because the new TypeScript runtime, legacy bridge, and bootstrap install are not wired yet.
  - Evidence: failed with missing `game-manager-saved-state-persistence-binding` module, legacy bridge mock not called, and bootstrap installer mock not called.

### Task 2: Implement runtime bridge

**Files:**
- Create: `src/core/game-manager-saved-state-persistence-binding.ts`
- Modify: `js/core_game_manager_session_init_helpers_runtime.js`
- Modify: `src/entries/home-family-bootstrap.ts`

- [x] **Step 1: Implement the TypeScript runtime**
  - Define manager/window-like/operations interfaces.
  - Implement save handler registration, forced save, ranked checkpoint try/catch, storage sync binding, and bound flag behavior.

- [x] **Step 2: Install runtime during bootstrap**
  - Import and call `installGameManagerSavedStatePersistenceBindingRuntime()` in `src/entries/home-family-bootstrap.ts` near other game-manager core runtime installs.

- [x] **Step 3: Delegate legacy helper with compact fallback**
  - Add a `resolveCoreGameManagerSavedStatePersistenceBindingRuntime` resolver.
  - Rename the existing body to a compact fallback.
  - Make `bindGameManagerSavedStatePersistence` call the TypeScript runtime with legacy operations and fall back when unavailable.

### Task 3: Verify and publish

**Files:**
- Modify: this plan document with validation evidence.

- [x] **Step 1: Run validation**
  - `npx vitest run tests/unit/core-game-manager-saved-state-persistence-binding.spec.ts tests/unit/core-game-manager-session-init-runtime.spec.ts tests/unit/home-family-bootstrap-ranked-session.spec.ts`
  - `node scripts/refactor-closure-audit.mjs`
  - `npm run build`
  - `npm run verify:prepush`
  - Evidence:
    - `npx vitest run tests/unit/core-game-manager-saved-state-persistence-binding.spec.ts tests/unit/core-game-manager-session-init-runtime.spec.ts tests/unit/home-family-bootstrap-ranked-session.spec.ts`: 3 files passed, 11 tests passed.
    - `node scripts/refactor-closure-audit.mjs`: expected non-zero while long-term hotspots remain; hotspot count decreased to 23 and `bindGameManagerSavedStatePersistence` is no longer listed.
    - `npm run build`: exit 0.
    - `npm run verify:prepush`: exit 0, all refactor gates passed.

- [ ] **Step 2: Commit, PR, CI, merge**
  - Commit as `refactor: retire saved state persistence binding runtime`.
  - Create a draft PR against `main`.
  - Merge only after GitHub CI is green.
