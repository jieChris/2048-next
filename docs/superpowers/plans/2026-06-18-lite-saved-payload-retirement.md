# Lite Saved Payload Retirement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 收缩 `core_game_manager_saved_state_helpers_runtime.js` 中 lite saved payload 构建重复逻辑，让 legacy JS 只负责向 `CoreGameSettingsStorageRuntime.buildLiteSavedGameStatePayload` 组装上下文并保留必要恢复字段。

**Architecture:** 继续复用已存在的 TypeScript storage runtime，不新增并行业务实现。JS 层保留兼容 fallback，但把 3 个超长 helper 拆小，把 `buildLiteSavedGameStatePayload` 的主路径委托给可测试的 TS core storage boundary。

**Tech Stack:** TypeScript, Vitest, Node VM legacy JS tests, legacy runtime bridge

---

### Task 1: Lock JS-to-core lite payload delegation

**Files:**
- Modify: `tests/unit/core-game-manager-saved-state-runtime.spec.ts`

- [ ] **Step 1: Write the failing test**

```ts
it("delegates lite saved payload construction to the core storage runtime with manager context", () => {
  const buildLiteSavedGameStatePayload = vi.fn(() => ({ v: 1, board: [[2]], session_replay_v1: null }));
  const runtime = loadSavedStateRuntime([32768], {
    callCoreStorageRuntime(manager: Record<string, unknown>, method: string, payload: Record<string, unknown>) {
      if (method === "buildLiteSavedGameStatePayload") {
        return buildLiteSavedGameStatePayload(payload);
      }
      return undefined;
    }
  });
  const manager = {
    modeKey: "standard_4x4_pow2_no_undo",
    width: 4,
    height: 4,
    ruleset: "pow2",
    score: 128,
    initialSeed: 11,
    seed: 22,
    getDurationMs: () => 3000,
    getFinalBoardMatrix: () => [[2, 0, 0, 0]],
    clonePlain: (value: unknown) => JSON.parse(JSON.stringify(value)),
    safeClonePlain: (value: unknown) => JSON.parse(JSON.stringify(value)),
    resolveNormalizedCoreValueOrFallback(value: unknown) {
      return value;
    }
  };

  runtime.buildLiteSavedGameStatePayload(manager, { saved_at: 1, board: [[4]] });

  expect(buildLiteSavedGameStatePayload).toHaveBeenCalledWith(
    expect.objectContaining({
      savedStateVersion: 1,
      modeKey: "standard_4x4_pow2_no_undo",
      width: 4,
      height: 4,
      score: 128,
      finalBoardMatrix: [[2, 0, 0, 0]]
    })
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/core-game-manager-saved-state-runtime.spec.ts -t "delegates lite saved payload construction"`
Expected: FAIL until the VM type exposes `buildLiteSavedGameStatePayload` or the core payload shape is corrected.

### Task 2: Shrink the JS lite payload helper surface

**Files:**
- Modify: `js/core_game_manager_saved_state_helpers_runtime.js:1284-1400`
- Modify: `tests/unit/core-game-manager-saved-state-runtime.spec.ts`

- [ ] **Step 1: Expose `buildLiteSavedGameStatePayload` in the VM test type**

```ts
buildLiteSavedGameStatePayload: (
  manager: Record<string, unknown>,
  payload: Record<string, unknown>
) => Record<string, unknown> | null;
```

- [ ] **Step 2: Split long JS helper bodies**

```js
function normalizeLiteSavedScore(source, manager) { ... }
function normalizeLiteSavedIpsInputCount(source) { ... }
function buildLiteSavedGameStateTimerPayload(payload) { ... }
```

- [ ] **Step 3: Keep core runtime delegation intact**

```js
var litePayloadCoreCallResult = callCoreStorageRuntime(
  manager,
  "buildLiteSavedGameStatePayload",
  buildLiteSavedGameStateCoreCallPayload(manager, payloadSource),
  false
);
```

- [ ] **Step 4: Run targeted tests**

Run: `npx vitest run tests/unit/core-game-manager-saved-state-runtime.spec.ts tests/unit/core-game-settings-storage.spec.ts`
Expected: PASS.

### Task 3: Verify and publish

**Files:**
- None

- [ ] **Step 1: Run validation**

Run: `npm run build`
Run: `node scripts/refactor-closure-audit.mjs`
Run: `npm run verify:prepush`

- [ ] **Step 2: Commit and open draft PR**

Run: `git commit -m "refactor: retire lite saved payload runtime"`
Run: `gh pr create --draft --title "refactor: retire lite saved payload runtime" --body "..."`

