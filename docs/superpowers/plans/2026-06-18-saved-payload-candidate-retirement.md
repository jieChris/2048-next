# Saved Payload Candidate Retirement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 saved-state restore 的 latest payload candidate selection 迁移到可测试 TypeScript runtime，并收缩 `resolveLatestSavedPayloadCandidate` hotspot。

**Architecture:** 新增 `src/core/saved-payload-candidate.ts`，复用 saved payload richness 评分语义，负责选择最佳 restore candidate。Legacy saved-state helper 通过 `CoreSavedPayloadCandidateRuntime` 委托，保留 fallback。

---

### Task 1: Lock candidate selection semantics

- [x] **Step 1: Write failing tests**
  - `tests/unit/core-saved-payload-candidate.spec.ts`
  - `tests/unit/core-game-manager-saved-state-runtime.spec.ts`
  - `tests/unit/home-family-bootstrap-ranked-session.spec.ts`

- [x] **Step 2: Verify tests fail before implementation**

### Task 2: Implement runtime and legacy bridge

- [x] **Step 1: Add TypeScript runtime**
  - `resolveLatestSavedPayloadCandidate`
  - `createSavedPayloadCandidateRuntime`
  - `installSavedPayloadCandidateRuntime`

- [x] **Step 2: Delegate legacy saved-state helper**

- [x] **Step 3: Install runtime in home bootstrap**

### Task 3: Verify and publish

- [x] **Step 1: Run validation**
  - targeted vitest
  - `node scripts/refactor-closure-audit.mjs`
  - `npm run build`
  - `npm run verify:prepush`

- [ ] **Step 2: Commit, PR, CI, merge**

## Verification evidence

- `npx vitest run tests/unit/core-saved-payload-candidate.spec.ts tests/unit/core-game-manager-saved-state-runtime.spec.ts tests/unit/home-family-bootstrap-ranked-session.spec.ts` failed before implementation because the module did not exist and legacy/bootstrap did not delegate/install.
- The same targeted vitest command passed after implementation: 3 files, 43 tests.
- `node scripts/refactor-closure-audit.mjs` reported the expected remaining hotspot failure with 32 functions > 19 lines, down from 33, and `resolveLatestSavedPayloadCandidate` is no longer listed.
- `npm run build` passed.
- `npm run verify:prepush` passed all refactor gates: audits, unit, smoke, and build.
