# Replay Flow Runtime Boundary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `js/core_replay_flow_runtime.js` 从 active runtime manifests 退场，并在 legacy replay scripts 加载前由 TypeScript bootstrap 安装 `CoreReplayFlowRuntime`。

**Architecture:** `src/core/replay-flow.ts` 继续作为 replay end/seek flow 纯 TypeScript owner。新增 bootstrap installer 暴露 legacy global runtime shape，并在缺失 input object 时保留 legacy 的宽容行为，再委托给 strict TypeScript owner。active play/replay/home/capped manifests 不再引用 legacy runtime 文件，但不删除 `js/core_replay_flow_runtime.js`。

**Tech Stack:** TypeScript, Vite `?url` script manifests, Vitest, existing entry manifest audit.

---

### Task 1: Guard Replay-Flow Runtime Manifest Retirement

**Files:**
- Modify: `scripts/entry-manifest-audit.mjs`
- Modify: `tests/unit/entry-manifest-audit-helpers.spec.ts`

- [x] **Step 1: Write RED**

Add a test requiring `{ scriptPath: "core_replay_flow_runtime.js", symbolName: "coreReplayFlowRuntimeUrl" }` in `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS`.

- [x] **Step 2: Run RED**

Run:

```bash
npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts
```

Expected: FAIL until the retired registry includes replay-flow.

- [x] **Step 3: Implement registry entry**

Add this object after replay-timer in `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS`:

```ts
{
  scriptPath: "core_replay_flow_runtime.js",
  symbolName: "coreReplayFlowRuntimeUrl"
}
```

### Task 2: Install Replay-Flow Runtime From TypeScript

**Files:**
- Create: `src/bootstrap/replay-flow-runtime.ts`
- Create: `tests/unit/bootstrap-replay-flow-runtime.spec.ts`
- Modify: `src/entries/home-family-bootstrap.ts`

- [x] **Step 1: Write RED**

Create `tests/unit/bootstrap-replay-flow-runtime.spec.ts` with tests that require:

```ts
import { describe, expect, it } from "vitest";

import {
  computeReplayEndState,
  planReplaySeekRestart,
  planReplaySeekRewind
} from "../../src/core/replay-flow";
import {
  createReplayFlowRuntime,
  installReplayFlowRuntime,
  type ReplayFlowRuntime
} from "../../src/bootstrap/replay-flow-runtime";

describe("bootstrap replay-flow runtime", () => {
  it("creates the legacy CoreReplayFlowRuntime shape from TypeScript functions", () => {
    const runtime = createReplayFlowRuntime();

    expect(runtime.computeReplayEndState()).toEqual(computeReplayEndState());
    expect(
      runtime.planReplaySeekRewind({
        targetIndex: 2,
        replayIndex: 7,
        hasReplayStartBoard: true
      })
    ).toEqual(
      planReplaySeekRewind({
        targetIndex: 2,
        replayIndex: 7,
        hasReplayStartBoard: true
      })
    );
    expect(
      runtime.planReplaySeekRestart({
        shouldRewind: true,
        strategy: "seed",
        replayIndexAfterRewind: 0
      })
    ).toEqual(
      planReplaySeekRestart({
        shouldRewind: true,
        strategy: "seed",
        replayIndexAfterRewind: 0
      })
    );
  });

  it("preserves legacy fallback behavior for missing inputs", () => {
    const runtime = createReplayFlowRuntime();

    expect(runtime.planReplaySeekRewind(undefined)).toEqual({
      shouldRewind: false,
      strategy: "none",
      replayIndexAfterRewind: undefined
    });
    expect(runtime.planReplaySeekRestart(undefined)).toEqual({
      shouldRestartWithBoard: false,
      shouldRestartWithSeed: false,
      shouldApplyReplayIndex: false,
      replayIndex: undefined
    });
  });

  it("installs the runtime on a supplied window-like object", () => {
    const windowLike: { CoreReplayFlowRuntime?: ReplayFlowRuntime } = {};

    const installed = installReplayFlowRuntime({ windowLike });

    expect(installed).toBe(windowLike.CoreReplayFlowRuntime);
    expect(installed?.computeReplayEndState).toBeTypeOf("function");
    expect(installed?.planReplaySeekRestart).toBeTypeOf("function");
  });

  it("does not overwrite an existing runtime", () => {
    const existing = createReplayFlowRuntime();
    const windowLike = { CoreReplayFlowRuntime: existing };

    const installed = installReplayFlowRuntime({ windowLike });

    expect(installed).toBe(existing);
    expect(windowLike.CoreReplayFlowRuntime).toBe(existing);
  });

  it("returns null when no window-like target is available", () => {
    expect(installReplayFlowRuntime({ windowLike: null })).toBeNull();
  });
});
```

- [x] **Step 2: Run RED**

Run:

```bash
npx vitest run tests/unit/bootstrap-replay-flow-runtime.spec.ts
```

Expected: FAIL because `src/bootstrap/replay-flow-runtime.ts` does not exist.

- [x] **Step 3: Implement installer**

Create `src/bootstrap/replay-flow-runtime.ts` with:

```ts
import {
  computeReplayEndState,
  planReplaySeekRestart,
  planReplaySeekRewind,
  type ReplayEndState,
  type ReplaySeekRestartInput,
  type ReplaySeekRestartPlan,
  type ReplaySeekRewindInput,
  type ReplaySeekRewindPlan
} from "../core/replay-flow";

export type ReplaySeekRewindRuntimeInput = Partial<ReplaySeekRewindInput> | null | undefined;
export type ReplaySeekRestartRuntimeInput = Partial<ReplaySeekRestartInput> | null | undefined;

export interface ReplayFlowRuntime {
  computeReplayEndState: () => ReplayEndState;
  planReplaySeekRewind: (input: ReplaySeekRewindRuntimeInput) => ReplaySeekRewindPlan;
  planReplaySeekRestart: (input: ReplaySeekRestartRuntimeInput) => ReplaySeekRestartPlan;
}

export interface ReplayFlowRuntimeWindowLike {
  CoreReplayFlowRuntime?: ReplayFlowRuntime;
}

export interface ReplayFlowRuntimeInstallOptions {
  windowLike?: ReplayFlowRuntimeWindowLike | null | undefined;
}

function normalizeReplaySeekRewindInput(
  input: ReplaySeekRewindRuntimeInput
): ReplaySeekRewindInput {
  const opts = input || {};
  return {
    targetIndex: opts.targetIndex as number,
    replayIndex: opts.replayIndex as number,
    hasReplayStartBoard: Boolean(opts.hasReplayStartBoard)
  };
}

function normalizeReplaySeekRestartInput(
  input: ReplaySeekRestartRuntimeInput
): ReplaySeekRestartInput {
  const opts = input || {};
  return {
    shouldRewind: Boolean(opts.shouldRewind),
    strategy: opts.strategy as "none" | "board" | "seed",
    replayIndexAfterRewind: opts.replayIndexAfterRewind as number
  };
}

export function createReplayFlowRuntime(): ReplayFlowRuntime {
  return {
    computeReplayEndState,
    planReplaySeekRewind: (input) =>
      planReplaySeekRewind(normalizeReplaySeekRewindInput(input)),
    planReplaySeekRestart: (input) =>
      planReplaySeekRestart(normalizeReplaySeekRestartInput(input))
  };
}

export function installReplayFlowRuntime(
  options: ReplayFlowRuntimeInstallOptions = {}
): ReplayFlowRuntime | null {
  const windowLike =
    options.windowLike ||
    (typeof window === "undefined" ? null : (window as unknown as ReplayFlowRuntimeWindowLike));
  if (!windowLike) return null;
  if (!windowLike.CoreReplayFlowRuntime) {
    windowLike.CoreReplayFlowRuntime = createReplayFlowRuntime();
  }
  return windowLike.CoreReplayFlowRuntime || null;
}
```

- [x] **Step 4: Install before legacy scripts**

Import and call `installReplayFlowRuntime()` in `src/entries/home-family-bootstrap.ts` near the replay runtime installers, before `loadHomeFamilyRuntimeScripts()` can load legacy scripts.

### Task 3: Remove Legacy Script From Active Manifests

**Files:**
- Modify: `src/entries/play-runtime-scripts.ts`
- Modify: `src/entries/replay-runtime-scripts.ts`
- Modify: `src/entries/home-family-shared.ts`

- [x] **Step 1: Remove import and array entries**

Delete `coreReplayFlowRuntimeUrl` imports and remove `coreReplayFlowRuntimeUrl` from play, replay, home, and capped runtime script arrays.

- [x] **Step 2: Run manifest audit**

Run:

```bash
npm run audit:entry-manifest
```

Expected: PASS after every active manifest reference has been removed.

### Task 4: Verify and Document Stage 1V

**Files:**
- Modify: `docs/ARCHITECTURE_GUARDRAILS.md`
- Modify: `docs/ROADMAP_MILESTONES.md`

- [x] **Step 1: Run focused GREEN checks**

Run:

```bash
npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts tests/unit/core-replay-flow.spec.ts tests/unit/bootstrap-replay-flow-runtime.spec.ts
```

Expected: PASS.

- [x] **Step 2: Run audits, build, smoke, and prepush**

Run:

```bash
npm run audit:entry-manifest
npm run audit:game-manager
npm run audit:service-boundary
npm run audit:page-legacy-runtime-boundary
npm run build
npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts
npm run verify:prepush
```

Expected: all commands exit 0.

- [x] **Step 3: Document evidence**

Prepend Stage 1V evidence to `docs/ARCHITECTURE_GUARDRAILS.md` and `docs/ROADMAP_MILESTONES.md`. Use byte-safe prepend for `docs/ROADMAP_MILESTONES.md` to avoid re-encoding the existing file.
