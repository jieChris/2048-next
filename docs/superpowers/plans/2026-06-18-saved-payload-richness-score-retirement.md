# Saved Payload Richness Score Retirement Implementation Plan
> **For agentic workers:** Use Trellis/Trellies as the default project workflow. Before implementation, debugging, review, or code modification, check for and follow `.trellis/`, `.trellis/spec/`, Trellis task files, Trellis skills, and Trellis commands when available. Do not use legacy Superpower Skill instructions. If old Superpower instructions conflict with Trellis/Trellies, Trellis/Trellies wins. Steps use checkbox syntax for tracking.

**Goal:** 把 saved payload richness score 选择逻辑迁移到可测试的 TypeScript runtime 边界，并让旧 JS 兼容层只做委托。

**Architecture:** 提取一个只负责 `resolveSavedPayloadRichnessScore` 的小型 TS runtime，保持现有评分语义不变。旧的 `js/core_game_manager_saved_state_helpers_runtime.js` 只保留 JS 兼容包装，优先委托到 `CoreSavedPayloadRichnessRuntime`，再保留 fallback 以便 legacy 加载顺序不变时也能运行。

**Tech Stack:** TypeScript, Vitest, legacy JS runtime bridge, home-family bootstrap

---

### Task 1: Lock score semantics with a focused unit test

**Files:**
- Create: `tests/unit/core-saved-payload-richness.spec.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { resolveSavedPayloadRichnessScore } from "../../src/core/saved-payload-richness";

describe("core saved payload richness", () => {
  it("counts only non-empty richness fields and rejects invalid payloads", () => {
    expect(resolveSavedPayloadRichnessScore(null)).toBe(-1);
    expect(
      resolveSavedPayloadRichnessScore({
        move_history: [],
        replay_compact_log: "  ",
        session_replay_v1: { records: [] },
        session_replay_v3: [],
        spawn_value_counts: { "2": 1 },
        replay_string: "REPLAY_v1RPL_B64_demo",
        timer_fixed_rows: {},
        timer_dynamic_rows_capped: [1],
        timer_dynamic_rows_overflow: undefined,
        timer_secondary_rows: null,
        timer_secondary_expanded_parents: 0,
        timer_sub_8192: false,
        timer_sub_16384: "",
        timer_sub_visible: "yes"
      })
    ).toBe(6);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/core-saved-payload-richness.spec.ts -t "counts only non-empty richness fields and rejects invalid payloads"`
Expected: FAIL because `src/core/saved-payload-richness` does not exist yet.

### Task 2: Add the TypeScript runtime and JS bridge

**Files:**
- Create: `src/core/saved-payload-richness.ts`
- Modify: `js/core_game_manager_saved_state_helpers_runtime.js:135-215`
- Modify: `src/entries/home-family-bootstrap.ts:70-285`
- Modify: `tests/unit/core-game-manager-saved-state-runtime.spec.ts:1-120`

- [ ] **Step 1: Implement the minimal TypeScript runtime**

```ts
export function resolveSavedPayloadRichnessScore(payload: unknown): number {
  // ...
}
```

- [ ] **Step 2: Add the JS compatibility delegate**

```js
function resolveSavedPayloadRichnessScore(payload) {
  var runtime = resolveCoreSavedPayloadRichnessRuntime();
  if (runtime && typeof runtime.resolveSavedPayloadRichnessScore === "function") {
    return runtime.resolveSavedPayloadRichnessScore(payload);
  }
  // legacy fallback
}
```

- [ ] **Step 3: Install the runtime in home-family bootstrap**

```ts
installSavedPayloadRichnessRuntime();
```

- [ ] **Step 4: Add a JS VM delegate test**

```ts
const resolveSavedPayloadRichnessScore = vi.fn(() => 7);
```

- [ ] **Step 5: Run the focused tests and confirm both pass**

Run: `npx vitest run tests/unit/core-saved-payload-richness.spec.ts tests/unit/core-game-manager-saved-state-runtime.spec.ts`
Expected: PASS.

### Task 3: Verify the broader branch health

**Files:**
- None

- [ ] **Step 1: Run targeted regression checks**

Run: `npm run build`
Run: `node scripts/refactor-closure-audit.mjs`
Run: `npm run verify:prepush`

- [ ] **Step 2: Push branch and open PR**

Run: `gh pr create --draft --title "refactor: retire saved payload richness score runtime" --body "..."`

