# Replay Lifecycle Runtime Boundary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `js/core_replay_lifecycle_runtime.js` 从 active runtime manifests 退场，并在 legacy replay scripts 加载前由 TypeScript bootstrap 安装 `CoreReplayLifecycleRuntime`。

**Architecture:** `src/core/replay-lifecycle.ts` 继续作为 replay lifecycle 纯 TypeScript owner。新增 bootstrap installer 暴露 legacy global runtime shape，并在 wrapper 中保留 legacy 对 missing/non-numeric seek target 的 fallback、floor 和缺失 input object 宽容行为，再委托给 strict TypeScript owner。active play/replay/home/capped manifests 不再引用 legacy runtime 文件，但不删除 `js/core_replay_lifecycle_runtime.js`。

**Tech Stack:** TypeScript, Vite `?url` script manifests, Vitest, existing entry manifest audit.

---

### Task 1: Guard Replay-Lifecycle Runtime Manifest Retirement

**Files:**
- Modify: `scripts/entry-manifest-audit.mjs`
- Modify: `tests/unit/entry-manifest-audit-helpers.spec.ts`

- [x] **Step 1: Write RED**

Add a test requiring `{ scriptPath: "core_replay_lifecycle_runtime.js", symbolName: "coreReplayLifecycleRuntimeUrl" }` in `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS`.

- [x] **Step 2: Run RED**

Run:

```bash
npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts
```

Expected: FAIL until the retired registry includes replay-lifecycle.

- [x] **Step 3: Implement registry entry**

Add this object after replay-loop in `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS`:

```ts
{
  scriptPath: "core_replay_lifecycle_runtime.js",
  symbolName: "coreReplayLifecycleRuntimeUrl"
}
```

### Task 2: Install Replay-Lifecycle Runtime From TypeScript

**Files:**
- Create: `src/bootstrap/replay-lifecycle-runtime.ts`
- Create: `tests/unit/bootstrap-replay-lifecycle-runtime.spec.ts`
- Modify: `src/entries/home-family-bootstrap.ts`

- [x] **Step 1: Write RED**

Create `tests/unit/bootstrap-replay-lifecycle-runtime.spec.ts` with tests that require:

```ts
import { describe, expect, it } from "vitest";

import {
  normalizeReplaySeekTarget,
  planReplayStep
} from "../../src/core/replay-lifecycle";
import {
  createReplayLifecycleRuntime,
  installReplayLifecycleRuntime,
  type ReplayLifecycleRuntime
} from "../../src/bootstrap/replay-lifecycle-runtime";

describe("bootstrap replay-lifecycle runtime", () => {
  it("creates the legacy CoreReplayLifecycleRuntime shape from TypeScript functions", () => {
    const runtime = createReplayLifecycleRuntime();
    const spawn = { x: 1, y: 2, value: 4 };

    expect(
      runtime.normalizeReplaySeekTarget({
        targetIndex: 99,
        hasReplayMoves: true,
        replayMovesLength: 12
      })
    ).toBe(
      normalizeReplaySeekTarget({
        targetIndex: 99,
        hasReplayMoves: true,
        replayMovesLength: 12
      })
    );
    expect(
      runtime.planReplayStep({
        action: 3,
        hasReplaySpawns: true,
        spawnAtIndex: spawn
      })
    ).toEqual(
      planReplayStep({
        action: 3,
        hasReplaySpawns: true,
        spawnAtIndex: spawn
      })
    );
  });

  it("preserves legacy seek target fallback and floor behavior", () => {
    const runtime = createReplayLifecycleRuntime();

    expect(
      runtime.normalizeReplaySeekTarget({
        targetIndex: "bad",
        replayIndex: "4.9",
        hasReplayMoves: true,
        replayMovesLength: 10
      })
    ).toBe(4);
    expect(runtime.normalizeReplaySeekTarget(undefined)).toBe(0);
  });

  it("preserves legacy step fallback behavior for missing inputs", () => {
    const runtime = createReplayLifecycleRuntime();

    expect(runtime.planReplayStep(undefined)).toEqual({
      shouldInjectForcedSpawn: false,
      forcedSpawn: undefined
    });
  });

  it("installs the runtime on a supplied window-like object", () => {
    const windowLike: { CoreReplayLifecycleRuntime?: ReplayLifecycleRuntime } = {};

    const installed = installReplayLifecycleRuntime({ windowLike });

    expect(installed).toBe(windowLike.CoreReplayLifecycleRuntime);
    expect(installed?.normalizeReplaySeekTarget).toBeTypeOf("function");
    expect(installed?.planReplayStep).toBeTypeOf("function");
  });

  it("does not overwrite an existing runtime", () => {
    const existing = createReplayLifecycleRuntime();
    const windowLike = { CoreReplayLifecycleRuntime: existing };

    const installed = installReplayLifecycleRuntime({ windowLike });

    expect(installed).toBe(existing);
    expect(windowLike.CoreReplayLifecycleRuntime).toBe(existing);
  });

  it("returns null when no window-like target is available", () => {
    expect(installReplayLifecycleRuntime({ windowLike: null })).toBeNull();
  });
});
```

- [x] **Step 2: Run RED**

Run:

```bash
npx vitest run tests/unit/bootstrap-replay-lifecycle-runtime.spec.ts
```

Expected: FAIL because `src/bootstrap/replay-lifecycle-runtime.ts` does not exist.

- [x] **Step 3: Implement installer**

Create `src/bootstrap/replay-lifecycle-runtime.ts` with:

```ts
import {
  normalizeReplaySeekTarget,
  planReplayStep,
  type ReplaySeekTargetInput,
  type ReplayStepPlanInput,
  type ReplayStepPlanResult
} from "../core/replay-lifecycle";

export type ReplaySeekTargetRuntimeInput =
  | (Partial<ReplaySeekTargetInput> & { replayIndex?: unknown; targetIndex?: unknown })
  | null
  | undefined;
export type ReplayStepRuntimeInput = Partial<ReplayStepPlanInput> | null | undefined;

export interface ReplayLifecycleRuntime {
  normalizeReplaySeekTarget: (input: ReplaySeekTargetRuntimeInput) => number;
  planReplayStep: (input: ReplayStepRuntimeInput) => ReplayStepPlanResult;
}

export interface ReplayLifecycleRuntimeWindowLike {
  CoreReplayLifecycleRuntime?: ReplayLifecycleRuntime;
}

export interface ReplayLifecycleRuntimeInstallOptions {
  windowLike?: ReplayLifecycleRuntimeWindowLike | null | undefined;
}

function normalizeSeekTargetNumber(input: ReplaySeekTargetRuntimeInput): number {
  const opts = input || {};
  let targetIndex = Number(opts.targetIndex);
  if (!Number.isFinite(targetIndex)) {
    targetIndex = Number(opts.replayIndex);
  }
  if (!Number.isFinite(targetIndex)) {
    targetIndex = 0;
  }
  return Math.floor(targetIndex);
}

function normalizeReplaySeekTargetInput(
  input: ReplaySeekTargetRuntimeInput
): ReplaySeekTargetInput {
  const opts = input || {};
  return {
    targetIndex: normalizeSeekTargetNumber(input),
    hasReplayMoves: Boolean(opts.hasReplayMoves),
    replayMovesLength: opts.replayMovesLength as number
  };
}

function normalizeReplayStepInput(input: ReplayStepRuntimeInput): ReplayStepPlanInput {
  const opts = input || {};
  return {
    action: opts.action,
    hasReplaySpawns: Boolean(opts.hasReplaySpawns),
    spawnAtIndex: opts.spawnAtIndex
  };
}

export function createReplayLifecycleRuntime(): ReplayLifecycleRuntime {
  return {
    normalizeReplaySeekTarget: (input) =>
      normalizeReplaySeekTarget(normalizeReplaySeekTargetInput(input)),
    planReplayStep: (input) => planReplayStep(normalizeReplayStepInput(input))
  };
}

export function installReplayLifecycleRuntime(
  options: ReplayLifecycleRuntimeInstallOptions = {}
): ReplayLifecycleRuntime | null {
  const windowLike =
    options.windowLike ||
    (typeof window === "undefined"
      ? null
      : (window as unknown as ReplayLifecycleRuntimeWindowLike));
  if (!windowLike) return null;
  if (!windowLike.CoreReplayLifecycleRuntime) {
    windowLike.CoreReplayLifecycleRuntime = createReplayLifecycleRuntime();
  }
  return windowLike.CoreReplayLifecycleRuntime || null;
}
```

- [x] **Step 4: Install before legacy scripts**

Import and call `installReplayLifecycleRuntime()` in `src/entries/home-family-bootstrap.ts` near replay runtime installers, before `loadHomeFamilyRuntimeScripts()` can load legacy scripts.

### Task 3: Remove Legacy Script From Active Manifests

**Files:**
- Modify: `src/entries/play-runtime-scripts.ts`
- Modify: `src/entries/replay-runtime-scripts.ts`
- Modify: `src/entries/home-family-shared.ts`

- [x] **Step 1: Remove import and array entries**

Delete `coreReplayLifecycleRuntimeUrl` imports and remove `coreReplayLifecycleRuntimeUrl` from play, replay, home, and capped runtime script arrays.

- [x] **Step 2: Run manifest audit**

Run:

```bash
npm run audit:entry-manifest
```

Expected: PASS after every active manifest reference has been removed.

### Task 4: Verify and Document Stage 1Y

**Files:**
- Modify: `docs/ARCHITECTURE_GUARDRAILS.md`
- Modify: `docs/ROADMAP_MILESTONES.md`

- [x] **Step 1: Run focused GREEN checks**

Run:

```bash
npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts tests/unit/core-replay-lifecycle.spec.ts tests/unit/bootstrap-replay-lifecycle-runtime.spec.ts
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

Prepend Stage 1Y evidence to `docs/ARCHITECTURE_GUARDRAILS.md` and `docs/ROADMAP_MILESTONES.md`. Use byte-safe prepend for `docs/ROADMAP_MILESTONES.md` to avoid re-encoding the existing file.
