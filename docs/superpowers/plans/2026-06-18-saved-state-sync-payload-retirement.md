# Saved State Sync Payload Retirement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 cross-tab saved-state sync 的轻量 trim payload 字段迁移到可测试 TypeScript runtime，并收缩 `buildSavedStateSyncStatePayload` hotspot。

**Architecture:** 新增 `src/core/saved-state-sync-payload.ts`，只负责构建 sync snapshot 中的 lightweight history/replay trim 字段。Legacy `core_game_manager_panel_timer_helpers_runtime.js` 继续组合现有 saved-state meta/core/timer payload，但通过 `CoreSavedStateSyncPayloadRuntime` 获取 trim 字段并保留 fallback。

**Tech Stack:** TypeScript, Vitest, Node VM legacy JS tests, legacy runtime bridge

---

### Task 1: Lock trim payload semantics

**Files:**
- Create: `tests/unit/core-saved-state-sync-payload.spec.ts`
- Create: `src/core/saved-state-sync-payload.ts`

- [x] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { buildSavedStateSyncTrimPayload } from "../../src/core/saved-state-sync-payload";

describe("core saved-state sync payload", () => {
  it("builds lightweight trim fields for cross-tab sync", () => {
    expect(buildSavedStateSyncTrimPayload({ ipsInputCount: 4 })).toEqual({
      move_history: [],
      undo_stack: [],
      redo_stack: [],
      replay_compact_log: "",
      session_replay_v3: null,
      replay_string: "",
      ips_input_count: 4
    });
    expect(buildSavedStateSyncTrimPayload({ ipsInputCount: -1 }).ips_input_count).toBe(0);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/core-saved-state-sync-payload.spec.ts -t "builds lightweight trim fields"`
Expected: FAIL because `src/core/saved-state-sync-payload` does not exist.

### Task 2: Bridge legacy JS to the runtime

**Files:**
- Modify: `js/core_game_manager_panel_timer_helpers_runtime.js:1114-1138`
- Modify: `src/entries/home-family-bootstrap.ts`
- Modify: `tests/unit/home-family-bootstrap-ranked-session.spec.ts`
- Modify: `tests/unit/core-game-manager-panel-timer-runtime.spec.ts`

- [x] **Step 1: Implement runtime install function**

```ts
export function installSavedStateSyncPayloadRuntime(options = {}) { ... }
```

- [x] **Step 2: Delegate JS trim payload helper**

```js
function buildSavedStateSyncTrimPayload(manager) {
  var runtime = resolveCoreSavedStateSyncPayloadRuntime();
  if (runtime && typeof runtime.buildSavedStateSyncTrimPayload === "function") {
    return runtime.buildSavedStateSyncTrimPayload(manager);
  }
  return buildSavedStateSyncTrimPayloadFallback(manager);
}
```

- [x] **Step 3: Verify with targeted tests**

Run: `npx vitest run tests/unit/core-saved-state-sync-payload.spec.ts tests/unit/core-game-manager-panel-timer-runtime.spec.ts tests/unit/home-family-bootstrap-ranked-session.spec.ts`
Expected: PASS.

### Task 3: Verify and publish

**Files:**
- None

- [x] **Step 1: Run validation**

Run: `npm run build`
Run: `node scripts/refactor-closure-audit.mjs`
Run: `npm run verify:prepush`

- [ ] **Step 2: Commit and open draft PR**

Run: `git commit -m "refactor: retire saved-state sync payload runtime"`
Run: `gh pr create --draft --title "refactor: retire saved-state sync payload runtime" --body "..."`

## Verification evidence

- `npx vitest run tests/unit/core-saved-state-sync-payload.spec.ts -t "builds lightweight trim fields"` failed before implementation because `src/core/saved-state-sync-payload` did not exist.
- `npx vitest run tests/unit/core-saved-state-sync-payload.spec.ts tests/unit/core-game-manager-panel-timer-runtime.spec.ts tests/unit/home-family-bootstrap-ranked-session.spec.ts` passed: 3 files, 8 tests.
- `node scripts/refactor-closure-audit.mjs` reported the expected remaining hotspot failure with 36 functions > 19 lines, down from 37, and `buildSavedStateSyncStatePayload` is no longer listed.
- `npm run build` passed.
- `npm run verify:prepush` passed all refactor gates: audits, unit, smoke, and build.
