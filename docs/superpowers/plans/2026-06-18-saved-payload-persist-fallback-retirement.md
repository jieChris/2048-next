# Saved Payload Persist Fallback Retirement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 saved-state payload 持久化 fallback 编排迁移到可测试 TypeScript runtime，并收缩 `persistSavedPayloadWithLiteFallback` hotspot。

**Architecture:** 新增 `src/core/saved-payload-persist-fallback.ts`，负责 full/lite 写入顺序、失败清理和 lite 重试策略。Legacy saved-state helper 通过 `CoreSavedPayloadPersistFallbackRuntime` 委托，保留 fallback；实际 storage 写入和 clear 操作仍由 legacy helper 作为 operations 提供。

---

### Task 1: Lock persist fallback semantics

- [x] **Step 1: Write failing tests**
  - `tests/unit/core-saved-payload-persist-fallback.spec.ts`
  - `tests/unit/core-game-manager-saved-state-runtime.spec.ts`
  - `tests/unit/home-family-bootstrap-ranked-session.spec.ts`

- [x] **Step 2: Verify tests fail before implementation**
  - Red run failed before implementation because the runtime module did not exist, the legacy helper did not delegate, and home bootstrap did not install the runtime.

### Task 2: Implement runtime and legacy bridge

- [x] **Step 1: Add TypeScript runtime**
  - `persistSavedPayloadWithLiteFallback`
  - `createSavedPayloadPersistFallbackRuntime`
  - `installSavedPayloadPersistFallbackRuntime`

- [x] **Step 2: Delegate legacy saved-state helper**

- [x] **Step 3: Install runtime in home bootstrap**

### Task 3: Verify and publish

- [x] **Step 1: Run validation**
  - targeted vitest
    - `npx vitest run tests/unit/core-saved-payload-persist-fallback.spec.ts tests/unit/core-game-manager-saved-state-runtime.spec.ts tests/unit/home-family-bootstrap-ranked-session.spec.ts`
    - Result: 3 files, 44 tests passed.
  - `node scripts/refactor-closure-audit.mjs`
    - Result: progress metric moved to 31 hotspot functions; `persistSavedPayloadWithLiteFallback` is no longer listed.
  - `npm run build`
    - Result: TypeScript and Vite production build passed.
  - `npm run verify:prepush`
    - Result: all refactor gates passed, including game-manager-audit, boundary audits, unit, smoke, and build.

- [ ] **Step 2: Commit, PR, CI, merge**
