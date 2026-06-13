# Replay Loop Runtime Boundary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `js/core_replay_loop_runtime.js` 从 active runtime manifests 退场，并在 legacy replay scripts 加载前由 TypeScript bootstrap 安装 `CoreReplayLoopRuntime`。

**Architecture:** `src/core/replay-loop.ts` 继续作为 replay step execution 纯 TypeScript owner。新增 bootstrap installer 暴露 legacy global runtime shape，并在缺失 input object 时保留 legacy 宽容行为，再委托给 strict TypeScript owner。active play/replay/home/capped manifests 不再引用 legacy runtime 文件，但不删除 `js/core_replay_loop_runtime.js`。

**Tech Stack:** TypeScript, Vite `?url` script manifests, Vitest, existing entry manifest audit.

---

### Task 1: Guard Replay-Loop Runtime Manifest Retirement

**Files:**
- Modify: `scripts/entry-manifest-audit.mjs`
- Modify: `tests/unit/entry-manifest-audit-helpers.spec.ts`

- [x] **Step 1: Write RED**

Add a test requiring `{ scriptPath: "core_replay_loop_runtime.js", symbolName: "coreReplayLoopRuntimeUrl" }` in `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS`.

- [x] **Step 2: Run RED**

Run:

```bash
npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts
```

Expected: FAIL until the retired registry includes replay-loop.

- [x] **Step 3: Implement registry entry**

Add this object after replay-control in `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS`:

```ts
{
  scriptPath: "core_replay_loop_runtime.js",
  symbolName: "coreReplayLoopRuntimeUrl"
}
```

### Task 2: Install Replay-Loop Runtime From TypeScript

**Files:**
- Create: `src/bootstrap/replay-loop-runtime.ts`
- Create: `tests/unit/bootstrap-replay-loop-runtime.spec.ts`
- Modify: `src/entries/home-family-bootstrap.ts`

- [x] **Step 1: Write RED**

Create `tests/unit/bootstrap-replay-loop-runtime.spec.ts` with tests that require:

```ts
import { describe, expect, it } from "vitest";

import { planReplayStepExecution } from "../../src/core/replay-loop";
import {
  createReplayLoopRuntime,
  installReplayLoopRuntime,
  type ReplayLoopRuntime
} from "../../src/bootstrap/replay-loop-runtime";

describe("bootstrap replay-loop runtime", () => {
  it("creates the legacy CoreReplayLoopRuntime shape from TypeScript functions", () => {
    const runtime = createReplayLoopRuntime();
    const spawn = { x: 1, y: 2, value: 4 };

    expect(
      runtime.planReplayStepExecution({
        replayMoves: [2],
        replaySpawns: [spawn],
        replayIndex: 0
      })
    ).toEqual(
      planReplayStepExecution({
        replayMoves: [2],
        replaySpawns: [spawn],
        replayIndex: 0
      })
    );
  });

  it("preserves legacy fallback behavior for missing inputs", () => {
    const runtime = createReplayLoopRuntime();

    expect(runtime.planReplayStepExecution(undefined)).toEqual({
      action: undefined,
      shouldInjectForcedSpawn: false,
      forcedSpawn: undefined,
      nextReplayIndex: Number.NaN
    });
  });

  it("preserves legacy fallback behavior for non-array move and spawn streams", () => {
    const runtime = createReplayLoopRuntime();

    expect(
      runtime.planReplayStepExecution({
        replayMoves: "bad",
        replaySpawns: "bad",
        replayIndex: 3
      })
    ).toEqual({
      action: undefined,
      shouldInjectForcedSpawn: false,
      forcedSpawn: undefined,
      nextReplayIndex: 4
    });
  });

  it("installs the runtime on a supplied window-like object", () => {
    const windowLike: { CoreReplayLoopRuntime?: ReplayLoopRuntime } = {};

    const installed = installReplayLoopRuntime({ windowLike });

    expect(installed).toBe(windowLike.CoreReplayLoopRuntime);
    expect(installed?.planReplayStepExecution).toBeTypeOf("function");
  });

  it("does not overwrite an existing runtime", () => {
    const existing = createReplayLoopRuntime();
    const windowLike = { CoreReplayLoopRuntime: existing };

    const installed = installReplayLoopRuntime({ windowLike });

    expect(installed).toBe(existing);
    expect(windowLike.CoreReplayLoopRuntime).toBe(existing);
  });

  it("returns null when no window-like target is available", () => {
    expect(installReplayLoopRuntime({ windowLike: null })).toBeNull();
  });
});
```

- [x] **Step 2: Run RED**

Run:

```bash
npx vitest run tests/unit/bootstrap-replay-loop-runtime.spec.ts
```

Expected: FAIL because `src/bootstrap/replay-loop-runtime.ts` does not exist.

- [x] **Step 3: Implement installer**

Create `src/bootstrap/replay-loop-runtime.ts` with:

```ts
import {
  planReplayStepExecution,
  type ReplayStepExecutionInput,
  type ReplayStepExecutionPlan
} from "../core/replay-loop";

export type ReplayStepExecutionRuntimeInput =
  | Partial<ReplayStepExecutionInput>
  | null
  | undefined;

export interface ReplayLoopRuntime {
  planReplayStepExecution: (input: ReplayStepExecutionRuntimeInput) => ReplayStepExecutionPlan;
}

export interface ReplayLoopRuntimeWindowLike {
  CoreReplayLoopRuntime?: ReplayLoopRuntime;
}

export interface ReplayLoopRuntimeInstallOptions {
  windowLike?: ReplayLoopRuntimeWindowLike | null | undefined;
}

function normalizeReplayStepExecutionInput(
  input: ReplayStepExecutionRuntimeInput
): ReplayStepExecutionInput {
  const opts = input || {};
  return {
    replayMoves: opts.replayMoves,
    replaySpawns: opts.replaySpawns,
    replayIndex: opts.replayIndex as number
  };
}

export function createReplayLoopRuntime(): ReplayLoopRuntime {
  return {
    planReplayStepExecution: (input) =>
      planReplayStepExecution(normalizeReplayStepExecutionInput(input))
  };
}

export function installReplayLoopRuntime(
  options: ReplayLoopRuntimeInstallOptions = {}
): ReplayLoopRuntime | null {
  const windowLike =
    options.windowLike ||
    (typeof window === "undefined" ? null : (window as unknown as ReplayLoopRuntimeWindowLike));
  if (!windowLike) return null;
  if (!windowLike.CoreReplayLoopRuntime) {
    windowLike.CoreReplayLoopRuntime = createReplayLoopRuntime();
  }
  return windowLike.CoreReplayLoopRuntime || null;
}
```

- [x] **Step 4: Install before legacy scripts**

Import and call `installReplayLoopRuntime()` in `src/entries/home-family-bootstrap.ts` near replay runtime installers, before `loadHomeFamilyRuntimeScripts()` can load legacy scripts.

### Task 3: Remove Legacy Script From Active Manifests

**Files:**
- Modify: `src/entries/play-runtime-scripts.ts`
- Modify: `src/entries/replay-runtime-scripts.ts`
- Modify: `src/entries/home-family-shared.ts`

- [x] **Step 1: Remove import and array entries**

Delete `coreReplayLoopRuntimeUrl` imports and remove `coreReplayLoopRuntimeUrl` from play, replay, home, and capped runtime script arrays.

- [x] **Step 2: Run manifest audit**

Run:

```bash
npm run audit:entry-manifest
```

Expected: PASS after every active manifest reference has been removed.

### Task 4: Verify and Document Stage 1X

**Files:**
- Modify: `docs/ARCHITECTURE_GUARDRAILS.md`
- Modify: `docs/ROADMAP_MILESTONES.md`

- [x] **Step 1: Run focused GREEN checks**

Run:

```bash
npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts tests/unit/core-replay-loop.spec.ts tests/unit/bootstrap-replay-loop-runtime.spec.ts
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

Prepend Stage 1X evidence to `docs/ARCHITECTURE_GUARDRAILS.md` and `docs/ROADMAP_MILESTONES.md`. Use byte-safe prepend for `docs/ROADMAP_MILESTONES.md` to avoid re-encoding the existing file.
