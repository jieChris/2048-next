# Single Mode Tab Id Retirement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `resolveSingleModePageTabId` 的 tab id 解析/缓存/生成逻辑迁移到现有 TypeScript `single-mode-page-lock` runtime，并收缩当前 restart setup hotspot。

**Architecture:** 复用 `src/core/single-mode-page-lock.ts`，导出 `resolveSingleModePageTabId` 并加入 `CoreSingleModePageLockRuntime`。Legacy restart setup helper 通过 runtime 委托，保留当前 fallback。

---

### Task 1: Lock tab id semantics

- [x] **Step 1: Write failing tests**
  - `tests/unit/core-single-mode-page-lock.spec.ts`
  - `tests/unit/core-game-manager-restart-seed.spec.ts`

- [x] **Step 2: Verify tests fail before implementation**

### Task 2: Implement runtime bridge

- [x] **Step 1: Export TypeScript tab id resolver through runtime**

- [x] **Step 2: Delegate legacy `resolveSingleModePageTabId` to runtime**

### Task 3: Verify and publish

- [x] **Step 1: Run validation**
  - targeted vitest
  - `node scripts/refactor-closure-audit.mjs`
  - `npm run build`
  - `npm run verify:prepush`

- [ ] **Step 2: Commit, PR, CI, merge**

## Verification evidence

- `npx vitest run tests/unit/core-single-mode-page-lock.spec.ts tests/unit/core-game-manager-restart-seed.spec.ts` failed before implementation because `resolveSingleModePageTabId` was not exported and legacy did not delegate.
- The same targeted vitest command passed after implementation: 2 files, 18 tests.
- `node scripts/refactor-closure-audit.mjs` reported the expected remaining hotspot failure with 33 functions > 19 lines, down from 34, and `resolveSingleModePageTabId` is no longer listed.
- `npm run build` passed.
- `npm run verify:prepush` passed all refactor gates: audits, unit, smoke, and build.
