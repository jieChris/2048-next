# Undo Action Runtime Boundary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retire `js/core_undo_action_runtime.js` from active home/play runtime manifests by installing `CoreUndoActionRuntime` from the tested TypeScript bootstrap boundary.

**Architecture:** `src/bootstrap/undo-action.ts` already owns undo capability checks and trigger behavior. This phase adds the legacy global runtime shape, installs it during `bootstrapHomeFamilyPage()` before home/play legacy scripts load, and blocks the retired script from active manifests through `entry-manifest-audit`.

**Tech Stack:** TypeScript bootstrap modules, Vitest unit tests, Vite URL manifests, Playwright smoke tests, existing manifest audit scripts.

---

### Task 1: Add RED Tests for Installer and Retired Registry

**Files:**
- Modify: `tests/unit/bootstrap-undo-action.spec.ts`
- Modify: `tests/unit/entry-manifest-audit-helpers.spec.ts`

- [x] **Step 1: Add failing installer assertions**

Update `tests/unit/bootstrap-undo-action.spec.ts` imports:

```ts
import {
  canTriggerUndo,
  createUndoActionRuntime,
  installUndoActionRuntime,
  isUndoCapableMode,
  isUndoInteractionEnabled,
  resolveUndoCapabilityFromContext,
  resolveUndoModeIdFromBody,
  resolveUndoModeId,
  tryTriggerUndo,
  tryTriggerUndoFromContext,
  type UndoActionRuntime
} from "../../src/bootstrap/undo-action";
```

Add these tests at the start of `describe("bootstrap undo action", ...)`:

```ts
it("creates the legacy CoreUndoActionRuntime shape from TypeScript functions", () => {
  const runtime = createUndoActionRuntime();

  expect(runtime.canTriggerUndo).toBe(canTriggerUndo);
  expect(runtime.resolveUndoModeIdFromBody).toBe(resolveUndoModeIdFromBody);
  expect(runtime.resolveUndoModeId).toBe(resolveUndoModeId);
  expect(runtime.isUndoCapableMode).toBe(isUndoCapableMode);
  expect(runtime.resolveUndoCapabilityFromContext).toBe(resolveUndoCapabilityFromContext);
  expect(runtime.isUndoInteractionEnabled).toBe(isUndoInteractionEnabled);
  expect(runtime.tryTriggerUndo).toBe(tryTriggerUndo);
  expect(runtime.tryTriggerUndoFromContext).toBe(tryTriggerUndoFromContext);
});

it("installs the runtime on a supplied window-like object", () => {
  const windowLike: { CoreUndoActionRuntime?: UndoActionRuntime } = {};

  const installed = installUndoActionRuntime({ windowLike });

  expect(installed).toBe(windowLike.CoreUndoActionRuntime);
  expect(installed?.tryTriggerUndo).toBeTypeOf("function");
});

it("does not overwrite an existing undo action runtime", () => {
  const existing = createUndoActionRuntime();
  const windowLike = { CoreUndoActionRuntime: existing };

  const installed = installUndoActionRuntime({ windowLike });

  expect(installed).toBe(existing);
  expect(windowLike.CoreUndoActionRuntime).toBe(existing);
});

it("returns null when no window-like target is available", () => {
  expect(installUndoActionRuntime({ windowLike: null })).toBeNull();
});
```

- [x] **Step 2: Add failing retired registry assertion**

Add this test after the practice-mode retired registry assertion:

```ts
it("tracks undo-action runtime as a retired active-manifest script", () => {
  expect(RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS).toContainEqual({
    scriptPath: "core_undo_action_runtime.js",
    symbolName: "coreUndoActionRuntimeUrl"
  });
});
```

- [x] **Step 3: Run RED tests**

Run:

```bash
npx vitest run tests/unit/bootstrap-undo-action.spec.ts
npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts
```

Expected: first command fails because installer exports do not exist; second command fails because the retired registry entry is missing.

### Task 2: Install `CoreUndoActionRuntime` from TypeScript

**Files:**
- Modify: `src/bootstrap/undo-action.ts`
- Modify: `src/entries/home-family-bootstrap.ts`

- [x] **Step 1: Add runtime interfaces and installer**

Add to `src/bootstrap/undo-action.ts`:

```ts
export interface UndoActionRuntime {
  canTriggerUndo: typeof canTriggerUndo;
  resolveUndoModeIdFromBody: typeof resolveUndoModeIdFromBody;
  resolveUndoModeId: typeof resolveUndoModeId;
  isUndoCapableMode: typeof isUndoCapableMode;
  resolveUndoCapabilityFromContext: typeof resolveUndoCapabilityFromContext;
  isUndoInteractionEnabled: typeof isUndoInteractionEnabled;
  tryTriggerUndo: typeof tryTriggerUndo;
  tryTriggerUndoFromContext: typeof tryTriggerUndoFromContext;
}

export interface UndoActionRuntimeWindowLike {
  CoreUndoActionRuntime?: UndoActionRuntime;
}

export interface UndoActionRuntimeInstallOptions {
  windowLike?: UndoActionRuntimeWindowLike | null | undefined;
}

export function createUndoActionRuntime(): UndoActionRuntime {
  return {
    canTriggerUndo,
    resolveUndoModeIdFromBody,
    resolveUndoModeId,
    isUndoCapableMode,
    resolveUndoCapabilityFromContext,
    isUndoInteractionEnabled,
    tryTriggerUndo,
    tryTriggerUndoFromContext
  };
}

export function installUndoActionRuntime(
  options: UndoActionRuntimeInstallOptions = {}
): UndoActionRuntime | null {
  const windowLike =
    options.windowLike ||
    (typeof window === "undefined" ? null : (window as unknown as UndoActionRuntimeWindowLike));
  if (!windowLike) return null;
  if (!windowLike.CoreUndoActionRuntime) {
    windowLike.CoreUndoActionRuntime = createUndoActionRuntime();
  }
  return windowLike.CoreUndoActionRuntime || null;
}
```

- [x] **Step 2: Install during home-family bootstrap**

Import and call the installer in `src/entries/home-family-bootstrap.ts` before `installHomeRuntimeContractRuntime()`:

```ts
import { installUndoActionRuntime } from "../bootstrap/undo-action";
```

```ts
installUndoActionRuntime();
```

- [x] **Step 3: Run GREEN installer tests**

Run:

```bash
npx vitest run tests/unit/bootstrap-undo-action.spec.ts
```

Expected: PASS.

### Task 3: Retire the Legacy Script from Active Manifests

**Files:**
- Modify: `scripts/entry-manifest-audit.mjs`
- Modify: `src/entries/home-family-shared.ts`
- Modify: `src/entries/play-runtime-scripts.ts`

- [x] **Step 1: Add retired registry entry**

Append to `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS`:

```js
{
  scriptPath: "core_undo_action_runtime.js",
  symbolName: "coreUndoActionRuntimeUrl"
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

Expected: FAIL while `core_undo_action_runtime.js` remains in `src/entries/home-family-shared.ts` and `src/entries/play-runtime-scripts.ts`.

- [x] **Step 4: Remove active manifest references**

Remove the `coreUndoActionRuntimeUrl` import and array entry from:

```ts
src/entries/home-family-shared.ts
src/entries/play-runtime-scripts.ts
```

Do not delete `js/core_undo_action_runtime.js`.

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
- Modify: `docs/superpowers/plans/2026-06-14-undo-action-runtime-boundary.md`

- [x] **Step 1: Update architecture guardrails**

Add a top entry recording:

```md
# Guardrail Delta (2026-06-14, Stage-1BH Undo-Action Runtime TS Boundary)

## Batch Impact
- `CoreUndoActionRuntime` is now installed from `src/bootstrap/undo-action.ts` before home/play legacy scripts load.
- The installer preserves the legacy runtime global shape: `canTriggerUndo`, `resolveUndoModeIdFromBody`, `resolveUndoModeId`, `isUndoCapableMode`, `resolveUndoCapabilityFromContext`, `isUndoInteractionEnabled`, `tryTriggerUndo`, and `tryTriggerUndoFromContext`.
- `js/core_undo_action_runtime.js` was retired from active play/home runtime manifests without deleting the legacy file.
- `entry-manifest-audit` blocks `core_undo_action_runtime.js` / `coreUndoActionRuntimeUrl` through `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS`.
```

- [x] **Step 2: Update roadmap**

Prepend roadmap evidence for `WS-runtime-57` / Stage 1BH with the focused and full gate commands run in this phase.

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
git add src/bootstrap/undo-action.ts src/entries/home-family-bootstrap.ts src/entries/home-family-shared.ts src/entries/play-runtime-scripts.ts scripts/entry-manifest-audit.mjs tests/unit/bootstrap-undo-action.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts docs/ARCHITECTURE_GUARDRAILS.md docs/ROADMAP_MILESTONES.md docs/superpowers/plans/2026-06-14-undo-action-runtime-boundary.md
git commit -m "refactor: install undo action runtime from ts"
git push -u origin frontend-runtime-ts-boundary-stage1bh-undo-action
```

Create a draft PR, mark ready after local gates pass, observe GitHub checks, and merge only after CI is green.

---

## Self-Review

- Spec coverage: This plan moves one active undo action legacy runtime out of home and play manifests while preserving the global runtime contract through TS bootstrap installation.
- Placeholder scan: No TBD/TODO/implement-later placeholders remain.
- Type consistency: Runtime names consistently use `UndoAction` / `coreUndoActionRuntimeUrl` / `CoreUndoActionRuntime`.

## Observed Evidence

- RED: `npx vitest run tests/unit/bootstrap-undo-action.spec.ts` failed before `createUndoActionRuntime` / `installUndoActionRuntime` existed.
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `core_undo_action_runtime.js` was listed in `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS`.
- GREEN: `npx vitest run tests/unit/bootstrap-undo-action.spec.ts`
- GREEN: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts`
- RED: `npm run audit:entry-manifest` failed while `src/entries/play-runtime-scripts.ts` still referenced `core_undo_action_runtime.js` / `coreUndoActionRuntimeUrl`.
- GREEN: `npm run audit:entry-manifest`
- GREEN: `npx vitest run tests/unit/bootstrap-undo-action.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts`
- Search guard: `rg -n "coreUndoActionRuntimeUrl|core_undo_action_runtime\\.js" src/entries/play-runtime-scripts.ts src/entries/home-family-shared.ts src/entries/replay-runtime-scripts.ts scripts/entry-manifest-audit.mjs` now reports only `scripts/entry-manifest-audit.mjs`.
- Full gates: `npm run audit:entry-manifest`, `npm run audit:game-manager`, `npm run audit:service-boundary`, `npm run audit:page-legacy-runtime-boundary`, `npm run build`, `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`, and `npm run verify:prepush` all exited 0.
