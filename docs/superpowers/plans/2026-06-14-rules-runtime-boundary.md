# Rules Runtime Boundary Implementation Plan
> **For agentic workers:** Use Trellis/Trellies as the default project workflow. Before implementation, debugging, review, or code modification, check for and follow `.trellis/`, `.trellis/spec/`, Trellis task files, Trellis skills, and Trellis commands when available. Do not use legacy Superpower Skill instructions. If old Superpower instructions conflict with Trellis/Trellies, Trellis/Trellies wins. Steps use checkbox syntax for tracking.

**Goal:** Retire `js/core_rules_runtime.js` from active home/play/replay runtime manifests by installing `CoreRulesRuntime` from the tested TypeScript rules boundary.

**Architecture:** `src/core/rules.ts` already owns spawn, merge, fibonacci, and timer milestone rule behavior. This phase adds the legacy global runtime shape, installs it during `bootstrapHomeFamilyPage()` before legacy scripts load, and blocks the retired script from active manifests through `entry-manifest-audit`.

**Tech Stack:** TypeScript core modules, Vitest unit tests, Vite URL manifests, Playwright smoke tests, existing manifest audit scripts.

---

### Task 1: Add RED Tests for Installer and Retired Registry

**Files:**
- Modify: `tests/unit/core-rules.spec.ts`
- Modify: `tests/unit/entry-manifest-audit-helpers.spec.ts`

- [x] **Step 1: Add failing installer assertions**

Update `tests/unit/core-rules.spec.ts` imports:

```ts
import {
  applySpawnValueCount,
  createRulesRuntime,
  getActualSecondaryRateText,
  getMergedValue,
  getSpawnCount,
  getSpawnStatPair,
  getTheoreticalMaxTile,
  getTimerMilestoneSlotByValue,
  getTimerMilestoneValues,
  getTotalSpawnCount,
  installRulesRuntime,
  nextFibonacci,
  normalizeSpawnTable,
  pickSpawnValue,
  type RulesRuntime
} from "../../src/core/rules";
```

Add these tests at the start of `describe("core rules: normalizeSpawnTable", ...)` or before the first describe block:

```ts
describe("core rules runtime installer", () => {
  it("creates the legacy CoreRulesRuntime shape from TypeScript functions", () => {
    const runtime = createRulesRuntime();

    expect(runtime.normalizeSpawnTable).toBe(normalizeSpawnTable);
    expect(runtime.getTheoreticalMaxTile).toBe(getTheoreticalMaxTile);
    expect(runtime.pickSpawnValue).toBe(pickSpawnValue);
    expect(runtime.getSpawnStatPair).toBe(getSpawnStatPair);
    expect(runtime.getSpawnCount).toBe(getSpawnCount);
    expect(runtime.getTotalSpawnCount).toBe(getTotalSpawnCount);
    expect(runtime.getActualSecondaryRateText).toBe(getActualSecondaryRateText);
    expect(runtime.applySpawnValueCount).toBe(applySpawnValueCount);
    expect(runtime.nextFibonacci).toBe(nextFibonacci);
    expect(runtime.getMergedValue).toBe(getMergedValue);
    expect(runtime.getTimerMilestoneValues).toBe(getTimerMilestoneValues);
    expect(runtime.getTimerMilestoneSlotByValue).toBe(getTimerMilestoneSlotByValue);
  });

  it("installs the runtime on a supplied window-like object", () => {
    const windowLike: { CoreRulesRuntime?: RulesRuntime } = {};

    const installed = installRulesRuntime({ windowLike });

    expect(installed).toBe(windowLike.CoreRulesRuntime);
    expect(installed?.getMergedValue).toBeTypeOf("function");
  });

  it("does not overwrite an existing rules runtime", () => {
    const existing = createRulesRuntime();
    const windowLike = { CoreRulesRuntime: existing };

    const installed = installRulesRuntime({ windowLike });

    expect(installed).toBe(existing);
    expect(windowLike.CoreRulesRuntime).toBe(existing);
  });

  it("returns null when no window-like target is available", () => {
    expect(installRulesRuntime({ windowLike: null })).toBeNull();
  });
});
```

- [x] **Step 2: Add failing retired registry assertion**

Add this test after the mode-catalog retired registry assertion:

```ts
it("tracks rules runtime as a retired active-manifest script", () => {
  expect(RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS).toContainEqual({
    scriptPath: "core_rules_runtime.js",
    symbolName: "coreRulesRuntimeUrl"
  });
});
```

- [x] **Step 3: Run RED tests**

Run:

```bash
npx vitest run tests/unit/core-rules.spec.ts
npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts
```

Expected: first command fails because installer exports do not exist; second command fails because the retired registry entry is missing.

### Task 2: Install `CoreRulesRuntime` from TypeScript

**Files:**
- Modify: `src/core/rules.ts`
- Modify: `src/entries/home-family-bootstrap.ts`

- [x] **Step 1: Add runtime interfaces and installer**

Add to `src/core/rules.ts`:

```ts
export interface RulesRuntime {
  normalizeSpawnTable: typeof normalizeSpawnTable;
  getTheoreticalMaxTile: typeof getTheoreticalMaxTile;
  pickSpawnValue: typeof pickSpawnValue;
  getSpawnStatPair: typeof getSpawnStatPair;
  getSpawnCount: typeof getSpawnCount;
  getTotalSpawnCount: typeof getTotalSpawnCount;
  getActualSecondaryRateText: typeof getActualSecondaryRateText;
  applySpawnValueCount: typeof applySpawnValueCount;
  nextFibonacci: typeof nextFibonacci;
  getMergedValue: typeof getMergedValue;
  getTimerMilestoneValues: typeof getTimerMilestoneValues;
  getTimerMilestoneSlotByValue: typeof getTimerMilestoneSlotByValue;
}

export interface RulesRuntimeWindowLike {
  CoreRulesRuntime?: RulesRuntime;
}

export interface RulesRuntimeInstallOptions {
  windowLike?: RulesRuntimeWindowLike | null | undefined;
}

export function createRulesRuntime(): RulesRuntime {
  return {
    normalizeSpawnTable,
    getTheoreticalMaxTile,
    pickSpawnValue,
    getSpawnStatPair,
    getSpawnCount,
    getTotalSpawnCount,
    getActualSecondaryRateText,
    applySpawnValueCount,
    nextFibonacci,
    getMergedValue,
    getTimerMilestoneValues,
    getTimerMilestoneSlotByValue
  };
}

export function installRulesRuntime(
  options: RulesRuntimeInstallOptions = {}
): RulesRuntime | null {
  const windowLike =
    options.windowLike ||
    (typeof window === "undefined" ? null : (window as unknown as RulesRuntimeWindowLike));
  if (!windowLike) return null;
  if (!windowLike.CoreRulesRuntime) {
    windowLike.CoreRulesRuntime = createRulesRuntime();
  }
  return windowLike.CoreRulesRuntime || null;
}
```

- [x] **Step 2: Install during home-family bootstrap**

Import and call the installer in `src/entries/home-family-bootstrap.ts` before `installHomeModeRuntime()`:

```ts
import { installRulesRuntime } from "../core/rules";
```

```ts
installRulesRuntime();
```

- [x] **Step 3: Run GREEN installer tests**

Run:

```bash
npx vitest run tests/unit/core-rules.spec.ts
```

Expected: PASS.

### Task 3: Retire the Legacy Script from Active Manifests

**Files:**
- Modify: `scripts/entry-manifest-audit.mjs`
- Modify: `src/entries/home-family-shared.ts`
- Modify: `src/entries/play-runtime-scripts.ts`
- Modify: `src/entries/replay-runtime-scripts.ts`

- [x] **Step 1: Add retired registry entry**

Append to `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS`:

```js
{
  scriptPath: "core_rules_runtime.js",
  symbolName: "coreRulesRuntimeUrl"
}
```

- [x] **Step 2: Run retired registry GREEN**

Run:

```bash
npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts
```

Expected: PASS.

- [x] **Step 3: Run manifest audit RED**

Run:

```bash
npm run audit:entry-manifest
```

Expected: FAIL while `core_rules_runtime.js` remains in active manifests.

- [x] **Step 4: Remove active manifest references**

Remove `coreRulesRuntimeUrl` imports and array entries from:

```ts
src/entries/home-family-shared.ts
src/entries/play-runtime-scripts.ts
src/entries/replay-runtime-scripts.ts
```

Do not delete `js/core_rules_runtime.js`.

- [x] **Step 5: Run manifest audit GREEN**

Run:

```bash
npm run audit:entry-manifest
```

Expected: PASS.

### Task 4: Update Evidence and Run Full Gates

**Files:**
- Modify: `docs/ARCHITECTURE_GUARDRAILS.md`
- Modify: `docs/ROADMAP_MILESTONES.md`
- Modify: `docs/superpowers/plans/2026-06-14-rules-runtime-boundary.md`

- [x] **Step 1: Update architecture guardrails**

Add a top entry recording:

```md
# Guardrail Delta (2026-06-14, Stage-1BJ Rules Runtime TS Boundary)

## Batch Impact
- `CoreRulesRuntime` is now installed from `src/core/rules.ts` before home/play/replay legacy scripts load.
- The installer preserves the legacy runtime global shape for spawn normalization, theoretical max tile calculation, spawn stats, fibonacci merging, and timer milestone helpers.
- `js/core_rules_runtime.js` was retired from active play/replay/home runtime manifests without deleting the legacy file.
- `entry-manifest-audit` blocks `core_rules_runtime.js` / `coreRulesRuntimeUrl` through `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS`.
```

- [x] **Step 2: Update roadmap**

Prepend roadmap evidence for `WS-runtime-59` / Stage 1BJ with the focused and full gate commands run in this phase.

- [x] **Step 3: Run full verification gates**

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

Expected: all commands exit 0. Known `/api/leaderboard` `ECONNREFUSED` warnings in Playwright output are acceptable only if the command exits 0.

- [ ] **Step 4: Commit and open PR**

Run:

```bash
git status --short
git add src/core/rules.ts src/entries/home-family-bootstrap.ts src/entries/home-family-shared.ts src/entries/play-runtime-scripts.ts src/entries/replay-runtime-scripts.ts scripts/entry-manifest-audit.mjs tests/unit/core-rules.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts docs/ARCHITECTURE_GUARDRAILS.md docs/ROADMAP_MILESTONES.md docs/superpowers/plans/2026-06-14-rules-runtime-boundary.md
git commit -m "refactor: install rules runtime from ts"
git push -u origin frontend-runtime-ts-boundary-stage1bj-rules
```

Create a draft PR, mark ready after local gates pass, observe GitHub checks, and merge only after CI is green.

---

## Self-Review

- Spec coverage: This plan moves one active rules legacy runtime out of home, play, and replay manifests while preserving the global runtime contract through TS installation.
- Placeholder scan: No TBD/TODO/implement-later placeholders remain.
- Type consistency: Runtime names consistently use `Rules` / `coreRulesRuntimeUrl` / `CoreRulesRuntime`.

## Observed Evidence

- RED: `npx vitest run tests/unit/core-rules.spec.ts` failed before `createRulesRuntime` / `installRulesRuntime` existed.
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `core_rules_runtime.js` was listed in `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS`.
- GREEN: `npx vitest run tests/unit/core-rules.spec.ts`
- GREEN: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts`
- RED: `npm run audit:entry-manifest` failed while `src/entries/play-runtime-scripts.ts` still referenced `core_rules_runtime.js` / `coreRulesRuntimeUrl`.
- GREEN: `npm run audit:entry-manifest`
- GREEN: `npx vitest run tests/unit/core-rules.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts`
- Search guard: `rg -n "coreRulesRuntimeUrl|core_rules_runtime\\.js" src/entries/play-runtime-scripts.ts src/entries/home-family-shared.ts src/entries/replay-runtime-scripts.ts src/entries/capped.ts scripts/entry-manifest-audit.mjs` now reports only `scripts/entry-manifest-audit.mjs`.
- Full gates: `npm run audit:entry-manifest`, `npm run audit:game-manager`, `npm run audit:service-boundary`, `npm run audit:page-legacy-runtime-boundary`, `npm run build`, `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`, and `npm run verify:prepush` all exited 0.
