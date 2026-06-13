# Replay Dispatch Runtime Boundary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `js/core_replay_dispatch_runtime.js` 从 active runtime manifests 退场，并在 legacy replay scripts 加载前由 TypeScript bootstrap 安装 `CoreReplayDispatchRuntime`。

**Architecture:** `src/core/replay-dispatch.ts` 继续作为 replay action dispatch planning 的纯 TypeScript owner。新增 bootstrap installer 暴露 legacy global runtime shape，并在缺失 input object 时保留 legacy 的 `Unknown replay action` 抛错行为，再委托给 strict TypeScript owner。active play/replay/home/capped manifests 不再引用 legacy runtime 文件，但不删除 `js/core_replay_dispatch_runtime.js`。

**Tech Stack:** TypeScript, Vite `?url` script manifests, Vitest, existing entry manifest audit.

---

### Task 1: Guard Replay-Dispatch Runtime Manifest Retirement

**Files:**
- Modify: `scripts/entry-manifest-audit.mjs`
- Modify: `tests/unit/entry-manifest-audit-helpers.spec.ts`

- [x] **Step 1: Write RED**

Add a test requiring `{ scriptPath: "core_replay_dispatch_runtime.js", symbolName: "coreReplayDispatchRuntimeUrl" }` in `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS`.

- [x] **Step 2: Run RED**

Run:

```bash
npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts
```

Expected: FAIL until the retired registry includes replay-dispatch.

- [x] **Step 3: Implement registry entry**

Add this object after replay-lifecycle in `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS`:

```ts
{
  scriptPath: "core_replay_dispatch_runtime.js",
  symbolName: "coreReplayDispatchRuntimeUrl"
}
```

### Task 2: Install Replay-Dispatch Runtime From TypeScript

**Files:**
- Create: `src/bootstrap/replay-dispatch-runtime.ts`
- Create: `tests/unit/bootstrap-replay-dispatch-runtime.spec.ts`
- Modify: `src/entries/home-family-bootstrap.ts`

- [x] **Step 1: Write RED**

Create `tests/unit/bootstrap-replay-dispatch-runtime.spec.ts` with tests that require:

```ts
import { describe, expect, it } from "vitest";

import { planReplayDispatch } from "../../src/core/replay-dispatch";
import {
  createReplayDispatchRuntime,
  installReplayDispatchRuntime,
  type ReplayDispatchRuntime
} from "../../src/bootstrap/replay-dispatch-runtime";

describe("bootstrap replay-dispatch runtime", () => {
  it("creates the legacy CoreReplayDispatchRuntime shape from TypeScript functions", () => {
    const runtime = createReplayDispatchRuntime();

    expect(runtime.planReplayDispatch({ kind: "m", dir: 2 })).toEqual(
      planReplayDispatch({ kind: "m", dir: 2 })
    );
    expect(runtime.planReplayDispatch({ kind: "u" })).toEqual(planReplayDispatch({ kind: "u" }));
    expect(runtime.planReplayDispatch({ kind: "p", x: 1, y: 2, value: 16 })).toEqual(
      planReplayDispatch({ kind: "p", x: 1, y: 2, value: 16 })
    );
  });

  it("preserves legacy unknown action behavior for missing inputs", () => {
    const runtime = createReplayDispatchRuntime();

    expect(() => runtime.planReplayDispatch(undefined)).toThrow("Unknown replay action");
  });

  it("installs the runtime on a supplied window-like object", () => {
    const windowLike: { CoreReplayDispatchRuntime?: ReplayDispatchRuntime } = {};

    const installed = installReplayDispatchRuntime({ windowLike });

    expect(installed).toBe(windowLike.CoreReplayDispatchRuntime);
    expect(installed?.planReplayDispatch).toBeTypeOf("function");
  });

  it("does not overwrite an existing runtime", () => {
    const existing = createReplayDispatchRuntime();
    const windowLike = { CoreReplayDispatchRuntime: existing };

    const installed = installReplayDispatchRuntime({ windowLike });

    expect(installed).toBe(existing);
    expect(windowLike.CoreReplayDispatchRuntime).toBe(existing);
  });

  it("returns null when no window-like target is available", () => {
    expect(installReplayDispatchRuntime({ windowLike: null })).toBeNull();
  });
});
```

- [x] **Step 2: Run RED**

Run:

```bash
npx vitest run tests/unit/bootstrap-replay-dispatch-runtime.spec.ts
```

Expected: FAIL because `src/bootstrap/replay-dispatch-runtime.ts` does not exist.

- [x] **Step 3: Implement installer**

Create `src/bootstrap/replay-dispatch-runtime.ts` with:

```ts
import {
  planReplayDispatch,
  type ReplayDispatchInput,
  type ReplayDispatchPlan
} from "../core/replay-dispatch";

export type ReplayDispatchRuntimeInput = Partial<ReplayDispatchInput> | null | undefined;

export interface ReplayDispatchRuntime {
  planReplayDispatch: (input: ReplayDispatchRuntimeInput) => ReplayDispatchPlan;
}

export interface ReplayDispatchRuntimeWindowLike {
  CoreReplayDispatchRuntime?: ReplayDispatchRuntime;
}

export interface ReplayDispatchRuntimeInstallOptions {
  windowLike?: ReplayDispatchRuntimeWindowLike | null | undefined;
}

function normalizeReplayDispatchInput(input: ReplayDispatchRuntimeInput): ReplayDispatchInput {
  const opts = input || {};
  return {
    kind: opts.kind as string,
    dir: opts.dir,
    x: opts.x,
    y: opts.y,
    value: opts.value
  };
}

export function createReplayDispatchRuntime(): ReplayDispatchRuntime {
  return {
    planReplayDispatch: (input) => planReplayDispatch(normalizeReplayDispatchInput(input))
  };
}

export function installReplayDispatchRuntime(
  options: ReplayDispatchRuntimeInstallOptions = {}
): ReplayDispatchRuntime | null {
  const windowLike =
    options.windowLike ||
    (typeof window === "undefined"
      ? null
      : (window as unknown as ReplayDispatchRuntimeWindowLike));
  if (!windowLike) return null;
  if (!windowLike.CoreReplayDispatchRuntime) {
    windowLike.CoreReplayDispatchRuntime = createReplayDispatchRuntime();
  }
  return windowLike.CoreReplayDispatchRuntime || null;
}
```

- [x] **Step 4: Install before legacy scripts**

Import and call `installReplayDispatchRuntime()` in `src/entries/home-family-bootstrap.ts` near replay runtime installers, before `loadHomeFamilyRuntimeScripts()` can load legacy scripts.

### Task 3: Remove Legacy Script From Active Manifests

**Files:**
- Modify: `src/entries/play-runtime-scripts.ts`
- Modify: `src/entries/replay-runtime-scripts.ts`
- Modify: `src/entries/home-family-shared.ts`

- [x] **Step 1: Remove import and array entries**

Delete `coreReplayDispatchRuntimeUrl` imports and remove `coreReplayDispatchRuntimeUrl` from play, replay, home, and capped runtime script arrays.

- [x] **Step 2: Run manifest audit**

Run:

```bash
npm run audit:entry-manifest
```

Expected: PASS after every active manifest reference has been removed.

### Task 4: Verify and Document Stage 1Z

**Files:**
- Modify: `docs/ARCHITECTURE_GUARDRAILS.md`
- Modify: `docs/ROADMAP_MILESTONES.md`

- [x] **Step 1: Run focused GREEN checks**

Run:

```bash
npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts tests/unit/core-replay-dispatch.spec.ts tests/unit/bootstrap-replay-dispatch-runtime.spec.ts
```

Expected: PASS.

- [ ] **Step 2: Run audits, build, smoke, and prepush**

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

Prepend Stage 1Z evidence to `docs/ARCHITECTURE_GUARDRAILS.md` and `docs/ROADMAP_MILESTONES.md`. Use byte-safe prepend for `docs/ROADMAP_MILESTONES.md` to avoid re-encoding the existing file.
