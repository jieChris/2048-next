# Replay Control Runtime Boundary Implementation Plan
> **For agentic workers:** Use Trellis/Trellies as the default project workflow. Before implementation, debugging, review, or code modification, check for and follow `.trellis/`, `.trellis/spec/`, Trellis task files, Trellis skills, and Trellis commands when available. Do not use legacy Superpower Skill instructions. If old Superpower instructions conflict with Trellis/Trellies, Trellis/Trellies wins. Steps use checkbox syntax for tracking.

**Goal:** 将 `js/core_replay_control_runtime.js` 从 active runtime manifests 退场，并在 legacy replay scripts 加载前由 TypeScript bootstrap 安装 `CoreReplayControlRuntime`。

**Architecture:** `src/core/replay-control.ts` 继续作为 replay tick boundary 纯 TypeScript owner。新增 bootstrap installer 暴露 legacy global runtime shape，并在缺失 input object 时保留 legacy 宽容行为，再委托给 strict TypeScript owner。active play/replay/home/capped manifests 不再引用 legacy runtime 文件，但不删除 `js/core_replay_control_runtime.js`。

**Tech Stack:** TypeScript, Vite `?url` script manifests, Vitest, existing entry manifest audit.

---

### Task 1: Guard Replay-Control Runtime Manifest Retirement

**Files:**
- Modify: `scripts/entry-manifest-audit.mjs`
- Modify: `tests/unit/entry-manifest-audit-helpers.spec.ts`

- [x] **Step 1: Write RED**

Add a test requiring `{ scriptPath: "core_replay_control_runtime.js", symbolName: "coreReplayControlRuntimeUrl" }` in `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS`.

- [x] **Step 2: Run RED**

Run:

```bash
npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts
```

Expected: FAIL until the retired registry includes replay-control.

- [x] **Step 3: Implement registry entry**

Add this object after replay-flow in `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS`:

```ts
{
  scriptPath: "core_replay_control_runtime.js",
  symbolName: "coreReplayControlRuntimeUrl"
}
```

### Task 2: Install Replay-Control Runtime From TypeScript

**Files:**
- Create: `src/bootstrap/replay-control-runtime.ts`
- Create: `tests/unit/bootstrap-replay-control-runtime.spec.ts`
- Modify: `src/entries/home-family-bootstrap.ts`

- [x] **Step 1: Write RED**

Create `tests/unit/bootstrap-replay-control-runtime.spec.ts` with tests that require:

```ts
import { describe, expect, it } from "vitest";

import { planReplayTickBoundary } from "../../src/core/replay-control";
import {
  createReplayControlRuntime,
  installReplayControlRuntime,
  type ReplayControlRuntime
} from "../../src/bootstrap/replay-control-runtime";

describe("bootstrap replay-control runtime", () => {
  it("creates the legacy CoreReplayControlRuntime shape from TypeScript functions", () => {
    const runtime = createReplayControlRuntime();

    expect(
      runtime.planReplayTickBoundary({
        shouldStopAtTick: true,
        replayEndState: {
          shouldPause: false,
          replayMode: true
        }
      })
    ).toEqual(
      planReplayTickBoundary({
        shouldStopAtTick: true,
        replayEndState: {
          shouldPause: false,
          replayMode: true
        }
      })
    );
  });

  it("preserves legacy fallback behavior for missing inputs", () => {
    const runtime = createReplayControlRuntime();

    expect(runtime.planReplayTickBoundary(undefined)).toEqual({
      shouldStop: false,
      shouldPause: false,
      shouldApplyReplayMode: false,
      replayMode: true
    });
  });

  it("preserves legacy fallback behavior for a missing replayEndState", () => {
    const runtime = createReplayControlRuntime();

    expect(runtime.planReplayTickBoundary({ shouldStopAtTick: true })).toEqual({
      shouldStop: true,
      shouldPause: true,
      shouldApplyReplayMode: true,
      replayMode: false
    });
  });

  it("installs the runtime on a supplied window-like object", () => {
    const windowLike: { CoreReplayControlRuntime?: ReplayControlRuntime } = {};

    const installed = installReplayControlRuntime({ windowLike });

    expect(installed).toBe(windowLike.CoreReplayControlRuntime);
    expect(installed?.planReplayTickBoundary).toBeTypeOf("function");
  });

  it("does not overwrite an existing runtime", () => {
    const existing = createReplayControlRuntime();
    const windowLike = { CoreReplayControlRuntime: existing };

    const installed = installReplayControlRuntime({ windowLike });

    expect(installed).toBe(existing);
    expect(windowLike.CoreReplayControlRuntime).toBe(existing);
  });

  it("returns null when no window-like target is available", () => {
    expect(installReplayControlRuntime({ windowLike: null })).toBeNull();
  });
});
```

- [x] **Step 2: Run RED**

Run:

```bash
npx vitest run tests/unit/bootstrap-replay-control-runtime.spec.ts
```

Expected: FAIL because `src/bootstrap/replay-control-runtime.ts` does not exist.

- [x] **Step 3: Implement installer**

Create `src/bootstrap/replay-control-runtime.ts` with:

```ts
import {
  planReplayTickBoundary,
  type ReplayTickBoundaryInput,
  type ReplayTickBoundaryPlan
} from "../core/replay-control";

export type ReplayTickBoundaryRuntimeInput =
  | Partial<ReplayTickBoundaryInput>
  | null
  | undefined;

export interface ReplayControlRuntime {
  planReplayTickBoundary: (input: ReplayTickBoundaryRuntimeInput) => ReplayTickBoundaryPlan;
}

export interface ReplayControlRuntimeWindowLike {
  CoreReplayControlRuntime?: ReplayControlRuntime;
}

export interface ReplayControlRuntimeInstallOptions {
  windowLike?: ReplayControlRuntimeWindowLike | null | undefined;
}

function normalizeReplayTickBoundaryInput(
  input: ReplayTickBoundaryRuntimeInput
): ReplayTickBoundaryInput {
  const opts = input || {};
  return {
    shouldStopAtTick: Boolean(opts.shouldStopAtTick),
    replayEndState: opts.replayEndState || {}
  };
}

export function createReplayControlRuntime(): ReplayControlRuntime {
  return {
    planReplayTickBoundary: (input) =>
      planReplayTickBoundary(normalizeReplayTickBoundaryInput(input))
  };
}

export function installReplayControlRuntime(
  options: ReplayControlRuntimeInstallOptions = {}
): ReplayControlRuntime | null {
  const windowLike =
    options.windowLike ||
    (typeof window === "undefined" ? null : (window as unknown as ReplayControlRuntimeWindowLike));
  if (!windowLike) return null;
  if (!windowLike.CoreReplayControlRuntime) {
    windowLike.CoreReplayControlRuntime = createReplayControlRuntime();
  }
  return windowLike.CoreReplayControlRuntime || null;
}
```

- [x] **Step 4: Install before legacy scripts**

Import and call `installReplayControlRuntime()` in `src/entries/home-family-bootstrap.ts` near replay runtime installers, before `loadHomeFamilyRuntimeScripts()` can load legacy scripts.

### Task 3: Remove Legacy Script From Active Manifests

**Files:**
- Modify: `src/entries/play-runtime-scripts.ts`
- Modify: `src/entries/replay-runtime-scripts.ts`
- Modify: `src/entries/home-family-shared.ts`

- [x] **Step 1: Remove import and array entries**

Delete `coreReplayControlRuntimeUrl` imports and remove `coreReplayControlRuntimeUrl` from play, replay, home, and capped runtime script arrays.

- [x] **Step 2: Run manifest audit**

Run:

```bash
npm run audit:entry-manifest
```

Expected: PASS after every active manifest reference has been removed.

### Task 4: Verify and Document Stage 1W

**Files:**
- Modify: `docs/ARCHITECTURE_GUARDRAILS.md`
- Modify: `docs/ROADMAP_MILESTONES.md`

- [x] **Step 1: Run focused GREEN checks**

Run:

```bash
npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts tests/unit/core-replay-control.spec.ts tests/unit/bootstrap-replay-control-runtime.spec.ts
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

Prepend Stage 1W evidence to `docs/ARCHITECTURE_GUARDRAILS.md` and `docs/ROADMAP_MILESTONES.md`. Use byte-safe prepend for `docs/ROADMAP_MILESTONES.md` to avoid re-encoding the existing file.
