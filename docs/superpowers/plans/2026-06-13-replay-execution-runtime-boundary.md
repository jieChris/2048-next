# Replay Execution Runtime TS Boundary Implementation Plan
> **For agentic workers:** Use Trellis/Trellies as the default project workflow. Before implementation, debugging, review, or code modification, check for and follow `.trellis/`, `.trellis/spec/`, Trellis task files, Trellis skills, and Trellis commands when available. Do not use legacy Superpower Skill instructions. If old Superpower instructions conflict with Trellis/Trellies, Trellis/Trellies wins. Steps use checkbox syntax for tracking.

**Goal:** Move `CoreReplayExecutionRuntime` installation to a tested TypeScript bootstrap boundary and retire `js/core_replay_execution_runtime.js` from active entry manifests without deleting the legacy file.

**Architecture:** `src/core/replay-execution.ts` remains the pure TypeScript owner for replay execution, IPS, and step stats behavior. A new `src/bootstrap/replay-execution-runtime.ts` adapts legacy nullable inputs into the strict core APIs and installs the legacy `window.CoreReplayExecutionRuntime` shape before home-family legacy scripts load. `entry-manifest-audit` becomes the guardrail that blocks `core_replay_execution_runtime.js` and `coreReplayExecutionRuntimeUrl` from active play/replay/home/capped manifests.

**Tech Stack:** TypeScript, Vite URL manifests, Vitest, Playwright smoke checks, Node audit scripts.

---

### Task 1: Guard Active Manifests Against Replay Execution Runtime

**Files:**
- Modify: `tests/unit/entry-manifest-audit-helpers.spec.ts`
- Modify: `scripts/entry-manifest-audit.mjs`

- [x] **Step 1: Write the failing audit registry test**

Add this test after the replay-dispatch retired-runtime test in `tests/unit/entry-manifest-audit-helpers.spec.ts`:

```ts
  it("tracks replay-execution runtime as a retired active-manifest script", () => {
    expect(RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS).toContainEqual({
      scriptPath: "core_replay_execution_runtime.js",
      symbolName: "coreReplayExecutionRuntimeUrl"
    });
  });
```

- [x] **Step 2: Run the focused audit helper test to verify RED**

Run:

```bash
npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts
```

Expected: FAIL because `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS` does not yet include `core_replay_execution_runtime.js`.

- [x] **Step 3: Add the retired runtime registry entry**

Append this object after the replay-dispatch entry in `scripts/entry-manifest-audit.mjs`:

```js
  {
    scriptPath: "core_replay_execution_runtime.js",
    symbolName: "coreReplayExecutionRuntimeUrl"
  }
```

- [x] **Step 4: Run the focused audit helper test to verify GREEN**

Run:

```bash
npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts
```

Expected: PASS.

### Task 2: Install CoreReplayExecutionRuntime From TypeScript

**Files:**
- Create: `tests/unit/bootstrap-replay-execution-runtime.spec.ts`
- Create: `src/bootstrap/replay-execution-runtime.ts`
- Modify: `src/entries/home-family-bootstrap.ts`

- [x] **Step 1: Write the failing bootstrap runtime test**

Create `tests/unit/bootstrap-replay-execution-runtime.spec.ts` with:

```ts
import { describe, expect, it } from "vitest";

import {
  computeReplayStepStats,
  getReplayActionKind,
  resolveIpsDisplayText,
  resolveIpsInputCount,
  resolveNextIpsInputCount,
  resolveReplayExecution
} from "../../src/core/replay-execution";
import {
  createReplayExecutionRuntime,
  installReplayExecutionRuntime,
  type ReplayExecutionRuntime
} from "../../src/bootstrap/replay-execution-runtime";

describe("bootstrap replay-execution runtime", () => {
  it("creates the legacy CoreReplayExecutionRuntime shape from TypeScript functions", () => {
    const runtime = createReplayExecutionRuntime();
    const statsInput = { actions: [0, -1, ["p", 1, 2, 4], 3], limit: 4 };
    const ipsInput = {
      replayMode: false,
      ipsInputCount: 2,
      ipsInputTimes: [100, 500, 1500],
      nowMs: 1500
    };

    expect(runtime.getReplayActionKind(["p", 1, 2, 4])).toBe(getReplayActionKind(["p", 1, 2, 4]));
    expect(runtime.computeReplayStepStats(statsInput)).toEqual(computeReplayStepStats(statsInput));
    expect(runtime.resolveIpsInputCount(ipsInput)).toBe(resolveIpsInputCount(ipsInput));
    expect(runtime.resolveNextIpsInputCount(ipsInput)).toEqual(resolveNextIpsInputCount(ipsInput));
    expect(runtime.resolveIpsDisplayText({ ipsInputCount: 3, durationMs: 1000 })).toEqual(
      resolveIpsDisplayText({ ipsInputCount: 3, durationMs: 1000 })
    );
    expect(runtime.resolveReplayExecution(["p", 1, 2, 4])).toEqual(
      resolveReplayExecution(["p", 1, 2, 4])
    );
  });

  it("preserves legacy fallback behavior for missing object inputs", () => {
    const runtime = createReplayExecutionRuntime();

    expect(runtime.computeReplayStepStats(undefined)).toEqual({
      totalSteps: 0,
      moveSteps: 0,
      undoSteps: 0
    });
    expect(runtime.resolveIpsInputCount(undefined)).toBe(0);
    expect(runtime.resolveNextIpsInputCount(undefined)).toEqual({
      shouldRecord: true,
      nextIpsInputCount: 1,
      nextIpsInputTimes: []
    });
    expect(runtime.resolveIpsDisplayText(undefined)).toEqual({
      avgIpsText: "0",
      ipsText: "IPS: 0"
    });
  });

  it("preserves legacy unknown replay action throw behavior", () => {
    const runtime = createReplayExecutionRuntime();

    expect(() => runtime.resolveReplayExecution(undefined)).toThrow("Unknown replay action");
  });

  it("installs the runtime on a supplied window-like object", () => {
    const windowLike: { CoreReplayExecutionRuntime?: ReplayExecutionRuntime } = {};

    const installed = installReplayExecutionRuntime({ windowLike });

    expect(installed).toBe(windowLike.CoreReplayExecutionRuntime);
    expect(installed?.getReplayActionKind).toBeTypeOf("function");
    expect(installed?.computeReplayStepStats).toBeTypeOf("function");
    expect(installed?.resolveIpsInputCount).toBeTypeOf("function");
    expect(installed?.resolveNextIpsInputCount).toBeTypeOf("function");
    expect(installed?.resolveIpsDisplayText).toBeTypeOf("function");
    expect(installed?.resolveReplayExecution).toBeTypeOf("function");
  });

  it("does not overwrite an existing runtime", () => {
    const existing = createReplayExecutionRuntime();
    const windowLike = { CoreReplayExecutionRuntime: existing };

    const installed = installReplayExecutionRuntime({ windowLike });

    expect(installed).toBe(existing);
    expect(windowLike.CoreReplayExecutionRuntime).toBe(existing);
  });

  it("returns null when no window-like target is available", () => {
    expect(installReplayExecutionRuntime({ windowLike: null })).toBeNull();
  });
});
```

- [x] **Step 2: Run the bootstrap test to verify RED**

Run:

```bash
npx vitest run tests/unit/bootstrap-replay-execution-runtime.spec.ts
```

Expected: FAIL because `src/bootstrap/replay-execution-runtime.ts` does not exist.

- [x] **Step 3: Add the TypeScript bootstrap installer**

Create `src/bootstrap/replay-execution-runtime.ts` with:

```ts
import {
  computeReplayStepStats,
  getReplayActionKind,
  resolveIpsDisplayText,
  resolveIpsInputCount,
  resolveNextIpsInputCount,
  resolveReplayExecution,
  type IpsDisplayTextInput,
  type IpsDisplayTextResult,
  type IpsInputCountInput,
  type NextIpsInputCountResult,
  type ReplayActionKind,
  type ReplayExecution,
  type ReplayStepStatsInput,
  type ReplayStepStatsResult
} from "../core/replay-execution";

export type ReplayExecutionRuntimeObjectInput<T> = Partial<T> | null | undefined;

export interface ReplayExecutionRuntime {
  getReplayActionKind: (action: unknown) => ReplayActionKind;
  computeReplayStepStats: (
    input: ReplayExecutionRuntimeObjectInput<ReplayStepStatsInput>
  ) => ReplayStepStatsResult;
  resolveIpsInputCount: (
    input: ReplayExecutionRuntimeObjectInput<IpsInputCountInput>
  ) => number;
  resolveNextIpsInputCount: (
    input: ReplayExecutionRuntimeObjectInput<IpsInputCountInput>
  ) => NextIpsInputCountResult;
  resolveIpsDisplayText: (
    input: ReplayExecutionRuntimeObjectInput<IpsDisplayTextInput>
  ) => IpsDisplayTextResult;
  resolveReplayExecution: (action: unknown) => ReplayExecution;
}

export interface ReplayExecutionRuntimeWindowLike {
  CoreReplayExecutionRuntime?: ReplayExecutionRuntime;
}

export interface ReplayExecutionRuntimeInstallOptions {
  windowLike?: ReplayExecutionRuntimeWindowLike | null | undefined;
}

function normalizeReplayStepStatsInput(
  input: ReplayExecutionRuntimeObjectInput<ReplayStepStatsInput>
): ReplayStepStatsInput {
  const opts = input || {};
  return {
    actions: opts.actions,
    limit: opts.limit
  };
}

function normalizeIpsInputCountInput(
  input: ReplayExecutionRuntimeObjectInput<IpsInputCountInput>
): IpsInputCountInput {
  const opts = input || {};
  return {
    replayMode: opts.replayMode,
    replayIndex: opts.replayIndex,
    ipsInputCount: opts.ipsInputCount,
    ipsInputTimes: opts.ipsInputTimes,
    nowMs: opts.nowMs
  };
}

function normalizeIpsDisplayTextInput(
  input: ReplayExecutionRuntimeObjectInput<IpsDisplayTextInput>
): IpsDisplayTextInput {
  const opts = input || {};
  return {
    durationMs: opts.durationMs,
    ipsInputCount: opts.ipsInputCount
  };
}

export function createReplayExecutionRuntime(): ReplayExecutionRuntime {
  return {
    getReplayActionKind,
    computeReplayStepStats: (input) =>
      computeReplayStepStats(normalizeReplayStepStatsInput(input)),
    resolveIpsInputCount: (input) =>
      resolveIpsInputCount(normalizeIpsInputCountInput(input)),
    resolveNextIpsInputCount: (input) =>
      resolveNextIpsInputCount(normalizeIpsInputCountInput(input)),
    resolveIpsDisplayText: (input) =>
      resolveIpsDisplayText(normalizeIpsDisplayTextInput(input)),
    resolveReplayExecution
  };
}

export function installReplayExecutionRuntime(
  options: ReplayExecutionRuntimeInstallOptions = {}
): ReplayExecutionRuntime | null {
  const windowLike =
    options.windowLike ||
    (typeof window === "undefined"
      ? null
      : (window as unknown as ReplayExecutionRuntimeWindowLike));
  if (!windowLike) return null;
  if (!windowLike.CoreReplayExecutionRuntime) {
    windowLike.CoreReplayExecutionRuntime = createReplayExecutionRuntime();
  }
  return windowLike.CoreReplayExecutionRuntime || null;
}
```

- [x] **Step 4: Install the runtime before legacy scripts load**

Modify `src/entries/home-family-bootstrap.ts`:

```ts
import { installReplayExecutionRuntime } from "../bootstrap/replay-execution-runtime";
```

Call it in the replay runtime installer section:

```ts
  installReplayControlRuntime();
  installReplayDispatchRuntime();
  installReplayExecutionRuntime();
  installReplayFlowRuntime();
  installReplayLifecycleRuntime();
  installReplayLoopRuntime();
  installReplayTimerRuntime();
```

- [x] **Step 5: Run focused tests to verify GREEN**

Run:

```bash
npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts tests/unit/core-replay-execution.spec.ts tests/unit/bootstrap-replay-execution-runtime.spec.ts
```

Expected: PASS.

### Task 3: Remove Replay Execution Runtime From Active Manifests

**Files:**
- Modify: `src/entries/play-runtime-scripts.ts`
- Modify: `src/entries/replay-runtime-scripts.ts`
- Modify: `src/entries/home-family-shared.ts`

- [x] **Step 1: Run manifest audit to verify RED**

Run:

```bash
npm run audit:entry-manifest
```

Expected: FAIL because active manifests still reference `core_replay_execution_runtime.js` / `coreReplayExecutionRuntimeUrl`.

- [x] **Step 2: Remove active manifest imports and exports**

Remove the `coreReplayExecutionRuntimeUrl` import and every exported array entry from:

```ts
src/entries/play-runtime-scripts.ts
src/entries/replay-runtime-scripts.ts
src/entries/home-family-shared.ts
```

Do not delete `js/core_replay_execution_runtime.js`.

- [x] **Step 3: Run manifest audit to verify GREEN**

Run:

```bash
npm run audit:entry-manifest
```

Expected: PASS.

### Task 4: Document Evidence And Run Full Gates

**Files:**
- Modify: `docs/ARCHITECTURE_GUARDRAILS.md`
- Modify: `docs/ROADMAP_MILESTONES.md`
- Modify: `docs/superpowers/plans/2026-06-13-replay-execution-runtime-boundary.md`

- [x] **Step 1: Prepend architecture guardrail evidence**

Prepend this section to `docs/ARCHITECTURE_GUARDRAILS.md`:

```md
# Guardrail Delta (2026-06-13, Stage-1AA Replay-Execution Runtime TS Boundary)

## Batch Impact
- `CoreReplayExecutionRuntime` is now installed from `src/bootstrap/replay-execution-runtime.ts` before home-family legacy scripts load.
- `src/core/replay-execution.ts` remains the tested TypeScript owner for replay action classification, step stats, IPS calculations, and replay action resolution.
- The installer preserves legacy tolerance for missing object inputs and the legacy `Unknown replay action` throw behavior for unresolved actions.
- `js/core_replay_execution_runtime.js` was retired from active play/replay/home/capped runtime manifests without deleting the legacy file.
- `entry-manifest-audit` blocks `core_replay_execution_runtime.js` / `coreReplayExecutionRuntimeUrl` through `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS`.

## Verification
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts`
- RED: `npx vitest run tests/unit/bootstrap-replay-execution-runtime.spec.ts`
- GREEN: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts tests/unit/core-replay-execution.spec.ts tests/unit/bootstrap-replay-execution-runtime.spec.ts`
- `npm run audit:entry-manifest`
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npm run verify:prepush`
```

- [x] **Step 2: Prepend roadmap evidence with byte-safe tooling**

Use byte-safe prepend for `docs/ROADMAP_MILESTONES.md`:

```bash
perl -0pi -e 'BEGIN{$p="# Stage-1AA Replay-Execution Runtime TS Boundary (2026-06-13)\n\n## Phase Decision\n- `WS-runtime-24`\n  - status: done\n  - progress: `CoreReplayExecutionRuntime` is installed from `src/bootstrap/replay-execution-runtime.ts`; `js/core_replay_execution_runtime.js` is no longer referenced by active play/replay/home/capped runtime manifests.\n\n## Evidence\n- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS` exposed the replay-execution retirement entry.\n- RED: `npx vitest run tests/unit/bootstrap-replay-execution-runtime.spec.ts` failed before `src/bootstrap/replay-execution-runtime.ts` existed.\n- GREEN: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts tests/unit/core-replay-execution.spec.ts tests/unit/bootstrap-replay-execution-runtime.spec.ts`\n- `npm run audit:entry-manifest` reports active manifests no longer reference `core_replay_execution_runtime.js`.\n- `npm run audit:game-manager`\n- `npm run audit:service-boundary`\n- `npm run audit:page-legacy-runtime-boundary`\n- `npm run build`\n- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`\n- `npm run verify:prepush`\n\n"} s/\\A/$p/' docs/ROADMAP_MILESTONES.md
```

- [x] **Step 3: Run full local verification**

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

- [x] **Step 4: Commit Stage 1AA**

Run:

```bash
git status --short --branch
git diff --check
git add docs/ARCHITECTURE_GUARDRAILS.md docs/ROADMAP_MILESTONES.md docs/superpowers/plans/2026-06-13-replay-execution-runtime-boundary.md scripts/entry-manifest-audit.mjs src/bootstrap/replay-execution-runtime.ts src/entries/home-family-bootstrap.ts src/entries/home-family-shared.ts src/entries/play-runtime-scripts.ts src/entries/replay-runtime-scripts.ts tests/unit/bootstrap-replay-execution-runtime.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts
git commit -m "refactor: install replay execution runtime from ts"
```

Expected: one focused commit containing only Stage 1AA files.

### Self-Review

- Spec coverage: the plan covers registry guardrail, TS bootstrap installer, manifest retirement, docs, verification, and commit.
- Placeholder scan: no TBD/TODO/fill-in placeholders are present.
- Type consistency: runtime names, file names, and symbol names consistently use `ReplayExecution` / `coreReplayExecutionRuntimeUrl` / `CoreReplayExecutionRuntime`.
