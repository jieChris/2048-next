# Save Persist Timestamps Retirement Implementation Plan
> **For agentic workers:** Use Trellis/Trellies as the default project workflow. Before implementation, debugging, review, or code modification, check for and follow `.trellis/`, `.trellis/spec/`, Trellis task files, Trellis skills, and Trellis commands when available. Do not use legacy Superpower Skill instructions. If old Superpower instructions conflict with Trellis/Trellies, Trellis/Trellies wins. Steps use checkbox syntax for tracking.

**Goal:** 把 `saveGameState` 持久化成功后的 timestamp mutation 迁移到可测试 TypeScript runtime，并收缩当前最高 closure hotspot。

**Architecture:** 新增 `src/core/saved-state-persist-timestamps.ts`，负责根据 `now`、是否存在 full payload、是否成功持久化 full payload 更新 manager 的 saved-state timestamp 字段。Legacy `core_game_manager_saved_state_helpers_runtime.js` 通过 `CoreSavedStatePersistTimestampsRuntime` 委托，保留 fallback。

---

### Task 1: Lock timestamp mutation semantics

- [x] **Step 1: Write failing tests**
  - `tests/unit/core-saved-state-persist-timestamps.spec.ts`
  - `tests/unit/core-game-manager-saved-state-runtime.spec.ts`
  - `tests/unit/home-family-bootstrap-ranked-session.spec.ts`

- [x] **Step 2: Verify tests fail before implementation**
  - Run targeted vitest command.

### Task 2: Implement runtime and legacy bridge

- [x] **Step 1: Add TypeScript runtime**
  - `applySavedStatePersistTimestamps`
  - `createSavedStatePersistTimestampsRuntime`
  - `installSavedStatePersistTimestampsRuntime`

- [x] **Step 2: Delegate legacy saved-state helper**
  - Add `resolveCoreSavedStatePersistTimestampsRuntime`
  - Add fallback helper
  - Replace inline timestamp update block in `saveGameState`

- [x] **Step 3: Install runtime in home bootstrap**

### Task 3: Verify and publish

- [x] **Step 1: Run validation**
  - targeted vitest
  - `node scripts/refactor-closure-audit.mjs`
  - `npm run build`
  - `npm run verify:prepush`

- [ ] **Step 2: Commit, PR, CI, merge**

## Verification evidence

- `npx vitest run tests/unit/core-saved-state-persist-timestamps.spec.ts tests/unit/core-game-manager-saved-state-runtime.spec.ts tests/unit/home-family-bootstrap-ranked-session.spec.ts` failed before implementation because the module/helper/bootstrap install did not exist.
- The same targeted vitest command passed after implementation: 3 files, 41 tests.
- `node scripts/refactor-closure-audit.mjs` reported the expected remaining hotspot failure with 35 functions > 19 lines, down from 36, and `saveGameState` is no longer listed.
- `npm run build` passed.
- `npm run verify:prepush` passed all refactor gates: audits, unit, smoke, and build.
