# Client Record Id Suffix Retirement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move client record id random suffix generation ownership from the legacy runtime hotspot to the existing TypeScript client record id runtime.

**Architecture:** Export `buildClientRecordIdRandomSuffix` from `src/core/game-manager-client-record-id.ts` and include it in the bootstrap-installed runtime object. The legacy `buildClientRecordIdRandomSuffix` will delegate to `CoreGameManagerClientRecordIdRuntime.buildClientRecordIdRandomSuffix` when present, with the existing crypto/date fallback retained for compatibility.

**Tech Stack:** TypeScript core runtime, bootstrap runtime installer, legacy browser globals, Vitest VM tests, refactor closure audit.

---

### Task 1: Lock suffix runtime behavior

**Files:**
- Modify: `tests/unit/core-game-manager-client-record-id.spec.ts`
- Modify: `tests/unit/bootstrap-game-manager-client-record-id-runtime.spec.ts`
- Create: `tests/unit/core-game-manager-client-record-id-runtime.spec.ts`

- [x] **Step 1: Write TypeScript suffix tests**
  - Verify `buildClientRecordIdRandomSuffix` delegates to `randomHex(12)`.

- [x] **Step 2: Write installer tests**
  - Verify `createGameManagerClientRecordIdRuntime` includes `buildClientRecordIdRandomSuffix`.
  - Verify install exposes `CoreGameManagerClientRecordIdRuntime` and the missing global suffix function.

- [x] **Step 3: Write legacy bridge tests**
  - Verify legacy `buildClientRecordIdRandomSuffix` delegates to `CoreGameManagerClientRecordIdRuntime`.

- [x] **Step 4: Verify tests fail before implementation**
  - Run `npx vitest run tests/unit/core-game-manager-client-record-id.spec.ts tests/unit/bootstrap-game-manager-client-record-id-runtime.spec.ts tests/unit/core-game-manager-client-record-id-runtime.spec.ts`.
  - Result: FAIL before implementation because suffix export/runtime/bridge did not exist yet.

### Task 2: Implement suffix runtime bridge

**Files:**
- Modify: `src/core/game-manager-client-record-id.ts`
- Modify: `src/bootstrap/game-manager-client-record-id-runtime.ts`
- Modify: `js/core_game_manager_client_record_id_runtime.js`

- [x] **Step 1: Export TypeScript suffix helper**

- [x] **Step 2: Include suffix helper in bootstrap runtime object and window install**

- [x] **Step 3: Delegate legacy suffix helper and keep fallback under hotspot threshold**

### Task 3: Verify and publish

**Files:**
- Modify: this plan document with validation evidence.

- [x] **Step 1: Run validation**
  - `npx vitest run tests/unit/core-game-manager-client-record-id.spec.ts tests/unit/bootstrap-game-manager-client-record-id-runtime.spec.ts tests/unit/core-game-manager-client-record-id-runtime.spec.ts`
    - Result: 3 files, 11 tests passed.
  - `node scripts/refactor-closure-audit.mjs`
    - Result: progress metric moved to 29 hotspot functions; `buildClientRecordIdRandomSuffix` is no longer listed.
  - `npm run build`
    - Result: TypeScript and Vite production build passed.
  - `npm run verify:prepush`
    - Result: all refactor gates passed, including game-manager-audit, boundary audits, unit, smoke, and build.

- [ ] **Step 2: Commit, PR, CI, merge**
  - Commit as `refactor: retire client record id suffix runtime`.
  - Create a draft PR against `main`.
  - Merge only after GitHub CI is green.
