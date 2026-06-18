# Stats Panel Copy Retirement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 stats panel 的语言解析和中英文 copy 选择迁移到可测试 TypeScript runtime，并让 legacy JS helper 只保留兼容委托与短 fallback。

**Architecture:** 新增 `src/core/stats-panel-copy.ts`，暴露 `resolveStatsPanelLanguage`、`resolveStatsPanelCopy` 和安装函数。`core_game_manager_stats_ui_helpers_runtime.js` 优先委托 `CoreStatsPanelCopyRuntime`，缺失时继续使用等价 fallback，保持老页面加载顺序安全。

**Tech Stack:** TypeScript, Vitest, Node VM legacy JS tests, legacy runtime bridge

---

### Task 1: Lock TypeScript language and copy behavior

**Files:**
- Create: `tests/unit/core-stats-panel-copy.spec.ts`
- Create: `src/core/stats-panel-copy.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { resolveStatsPanelCopy, resolveStatsPanelLanguage } from "../../src/core/stats-panel-copy";

describe("core stats panel copy", () => {
  it("normalizes language sources and returns matching labels", () => {
    expect(resolveStatsPanelLanguage({ i18nLanguage: "en-US" })).toBe("en");
    expect(resolveStatsPanelLanguage({ storageLanguage: "zh-CN" })).toBe("zh");
    expect(resolveStatsPanelLanguage({ documentLanguage: "fr" })).toBe("zh");
    expect(resolveStatsPanelCopy("en").title).toBe("Stats Summary");
    expect(resolveStatsPanelCopy("zh").button).toBe("统计");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/core-stats-panel-copy.spec.ts -t "normalizes language sources"`
Expected: FAIL because `src/core/stats-panel-copy` does not exist.

### Task 2: Add JS bridge and bootstrap installation

**Files:**
- Modify: `js/core_game_manager_stats_ui_helpers_runtime.js:18-90`
- Modify: `src/entries/home-family-bootstrap.ts`
- Modify: `tests/unit/home-family-bootstrap-ranked-session.spec.ts`
- Create or modify: `tests/unit/core-game-manager-stats-ui-runtime.spec.ts`

- [ ] **Step 1: Implement TS runtime and install function**

```ts
export function installStatsPanelCopyRuntime(options = {}) { ... }
```

- [ ] **Step 2: Delegate JS helpers to the TS runtime**

```js
function resolveStatsPanelCopy(lang) {
  var runtime = resolveCoreStatsPanelCopyRuntime();
  if (runtime && typeof runtime.resolveStatsPanelCopy === "function") {
    return runtime.resolveStatsPanelCopy(lang);
  }
  return resolveStatsPanelCopyFallback(lang);
}
```

- [ ] **Step 3: Add VM and bootstrap tests**

Run: `npx vitest run tests/unit/core-stats-panel-copy.spec.ts tests/unit/core-game-manager-stats-ui-runtime.spec.ts tests/unit/home-family-bootstrap-ranked-session.spec.ts`
Expected: PASS.

### Task 3: Verify and publish

**Files:**
- None

- [ ] **Step 1: Run validation**

Run: `npm run build`
Run: `node scripts/refactor-closure-audit.mjs`
Run: `npm run verify:prepush`

- [ ] **Step 2: Commit and open draft PR**

Run: `git commit -m "refactor: retire stats panel copy runtime"`
Run: `gh pr create --draft --title "refactor: retire stats panel copy runtime" --body "..."`

