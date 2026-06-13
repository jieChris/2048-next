# Mode Catalog Runtime Boundary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retire `js/core_mode_catalog_runtime.js` from active home/play/replay runtime manifests and the capped entry direct import by installing `CoreModeCatalogRuntime` from the tested TypeScript bootstrap boundary.

**Architecture:** `src/bootstrap/mode-catalog.ts` already owns `resolveCatalogModeWithDefault`. This phase adds the legacy global runtime shape, installs it during `bootstrapHomeFamilyPage()` before legacy scripts load, and extends `entry-manifest-audit` so retired runtime checks also cover `src/entries/capped.ts`.

**Tech Stack:** TypeScript bootstrap modules, Vitest unit tests, Vite URL manifests, Playwright smoke tests, existing manifest audit scripts.

---

### Task 1: Add RED Tests for Installer, Capped Retired Guard, and Retired Registry

**Files:**
- Modify: `tests/unit/bootstrap-mode-catalog.spec.ts`
- Modify: `tests/unit/entry-manifest-audit-helpers.spec.ts`

- [x] **Step 1: Add failing installer assertions**

Update `tests/unit/bootstrap-mode-catalog.spec.ts` imports:

```ts
import {
  createModeCatalogRuntime,
  installModeCatalogRuntime,
  resolveCatalogModeWithDefault,
  type ModeCatalogRuntime
} from "../../src/bootstrap/mode-catalog";
```

Add these tests at the start of `describe("bootstrap mode catalog", ...)`:

```ts
it("creates the legacy CoreModeCatalogRuntime shape from TypeScript functions", () => {
  const runtime = createModeCatalogRuntime();

  expect(runtime.resolveCatalogModeWithDefault).toBe(resolveCatalogModeWithDefault);
});

it("installs the runtime on a supplied window-like object", () => {
  const windowLike: { CoreModeCatalogRuntime?: ModeCatalogRuntime } = {};

  const installed = installModeCatalogRuntime({ windowLike });

  expect(installed).toBe(windowLike.CoreModeCatalogRuntime);
  expect(installed?.resolveCatalogModeWithDefault).toBeTypeOf("function");
});

it("does not overwrite an existing mode catalog runtime", () => {
  const existing = createModeCatalogRuntime();
  const windowLike = { CoreModeCatalogRuntime: existing };

  const installed = installModeCatalogRuntime({ windowLike });

  expect(installed).toBe(existing);
  expect(windowLike.CoreModeCatalogRuntime).toBe(existing);
});

it("returns null when no window-like target is available", () => {
  expect(installModeCatalogRuntime({ windowLike: null })).toBeNull();
});
```

- [x] **Step 2: Add failing retired registry assertion**

Add this test after the undo-action retired registry assertion:

```ts
it("tracks mode-catalog runtime as a retired active-manifest script", () => {
  expect(RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS).toContainEqual({
    scriptPath: "core_mode_catalog_runtime.js",
    symbolName: "coreModeCatalogRuntimeUrl"
  });
});
```

- [x] **Step 3: Add capped-entry retired scan helper coverage**

Add this assertion to the helper test area that exercises retired runtime absence:

```ts
it("detects retired runtime references in capped entry content", () => {
  expect(() =>
    ensureRetiredRuntimeScriptAbsent(
      'import "../../js/core_mode_catalog_runtime.js";',
      "src/entries/capped.ts",
      {
        scriptPath: "core_mode_catalog_runtime.js",
        symbolName: "coreModeCatalogRuntimeUrl"
      }
    )
  ).toThrow(/src\/entries\/capped\.ts: retired runtime script still referenced/);
});
```

- [x] **Step 4: Run RED tests**

Run:

```bash
npx vitest run tests/unit/bootstrap-mode-catalog.spec.ts
npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts
```

Expected: first command fails because installer exports do not exist; second command fails because the retired registry entry is missing.

### Task 2: Install `CoreModeCatalogRuntime` from TypeScript

**Files:**
- Modify: `src/bootstrap/mode-catalog.ts`
- Modify: `src/entries/home-family-bootstrap.ts`

- [x] **Step 1: Add runtime interfaces and installer**

Add to `src/bootstrap/mode-catalog.ts`:

```ts
export interface ModeCatalogRuntime {
  resolveCatalogModeWithDefault: typeof resolveCatalogModeWithDefault;
}

export interface ModeCatalogRuntimeWindowLike {
  CoreModeCatalogRuntime?: ModeCatalogRuntime;
}

export interface ModeCatalogRuntimeInstallOptions {
  windowLike?: ModeCatalogRuntimeWindowLike | null | undefined;
}

export function createModeCatalogRuntime(): ModeCatalogRuntime {
  return {
    resolveCatalogModeWithDefault
  };
}

export function installModeCatalogRuntime(
  options: ModeCatalogRuntimeInstallOptions = {}
): ModeCatalogRuntime | null {
  const windowLike =
    options.windowLike ||
    (typeof window === "undefined" ? null : (window as unknown as ModeCatalogRuntimeWindowLike));
  if (!windowLike) return null;
  if (!windowLike.CoreModeCatalogRuntime) {
    windowLike.CoreModeCatalogRuntime = createModeCatalogRuntime();
  }
  return windowLike.CoreModeCatalogRuntime || null;
}
```

- [x] **Step 2: Install during home-family bootstrap**

Import and call the installer in `src/entries/home-family-bootstrap.ts` before `installPracticeModeRuntime()` and `installHomeModeRuntime()`:

```ts
import { installModeCatalogRuntime } from "../bootstrap/mode-catalog";
```

```ts
installModeCatalogRuntime();
```

- [x] **Step 3: Run GREEN installer tests**

Run:

```bash
npx vitest run tests/unit/bootstrap-mode-catalog.spec.ts
```

Expected: PASS.

### Task 3: Retire the Legacy Script from Active Manifests and Capped Direct Import

**Files:**
- Modify: `scripts/entry-manifest-audit.mjs`
- Modify: `src/entries/home-family-shared.ts`
- Modify: `src/entries/play-runtime-scripts.ts`
- Modify: `src/entries/replay-runtime-scripts.ts`
- Modify: `src/entries/capped.ts`

- [x] **Step 1: Add retired registry entry and capped-entry scan**

Append to `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS`:

```js
{
  scriptPath: "core_mode_catalog_runtime.js",
  symbolName: "coreModeCatalogRuntimeUrl"
}
```

Read `src/entries/capped.ts` in `runEntryManifestAudit()` and include it in the retired runtime absence loop:

```js
const cappedEntry = await readUtf8("src/entries/capped.ts");
```

```js
ensureRetiredRuntimeScriptAbsent(cappedEntry, "src/entries/capped.ts", retiredRuntimeScript);
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

Expected: FAIL while `core_mode_catalog_runtime.js` remains in active manifests or `src/entries/capped.ts`.

- [x] **Step 4: Remove active/direct references**

Remove `coreModeCatalogRuntimeUrl` imports and array entries from:

```ts
src/entries/home-family-shared.ts
src/entries/play-runtime-scripts.ts
src/entries/replay-runtime-scripts.ts
```

Remove the direct side-effect import from:

```ts
src/entries/capped.ts
```

Do not delete `js/core_mode_catalog_runtime.js`.

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
- Modify: `docs/superpowers/plans/2026-06-14-mode-catalog-runtime-boundary.md`

- [x] **Step 1: Update architecture guardrails**

Add a top entry recording:

```md
# Guardrail Delta (2026-06-14, Stage-1BI Mode-Catalog Runtime TS Boundary)

## Batch Impact
- `CoreModeCatalogRuntime` is now installed from `src/bootstrap/mode-catalog.ts` before home/play/replay/capped legacy scripts load.
- The installer preserves the legacy runtime global shape: `resolveCatalogModeWithDefault`.
- `js/core_mode_catalog_runtime.js` was retired from active play/replay/home runtime manifests and from `src/entries/capped.ts` without deleting the legacy file.
- `entry-manifest-audit` blocks `core_mode_catalog_runtime.js` / `coreModeCatalogRuntimeUrl` through `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS`, including capped entry direct imports.
```

- [x] **Step 2: Update roadmap**

Prepend roadmap evidence for `WS-runtime-58` / Stage 1BI with the focused and full gate commands run in this phase.

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
git add src/bootstrap/mode-catalog.ts src/entries/home-family-bootstrap.ts src/entries/home-family-shared.ts src/entries/play-runtime-scripts.ts src/entries/replay-runtime-scripts.ts src/entries/capped.ts scripts/entry-manifest-audit.mjs tests/unit/bootstrap-mode-catalog.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts docs/ARCHITECTURE_GUARDRAILS.md docs/ROADMAP_MILESTONES.md docs/superpowers/plans/2026-06-14-mode-catalog-runtime-boundary.md
git commit -m "refactor: install mode catalog runtime from ts"
git push -u origin frontend-runtime-ts-boundary-stage1bi-mode-catalog
```

Create a draft PR, mark ready after local gates pass, observe GitHub checks, and merge only after CI is green.

---

## Self-Review

- Spec coverage: This plan moves one active mode catalog legacy runtime out of home, play, replay, and capped entry loading while preserving the global runtime contract through TS bootstrap installation.
- Placeholder scan: No TBD/TODO/implement-later placeholders remain.
- Type consistency: Runtime names consistently use `ModeCatalog` / `coreModeCatalogRuntimeUrl` / `CoreModeCatalogRuntime`.

## Observed Evidence

- RED: `npx vitest run tests/unit/bootstrap-mode-catalog.spec.ts` failed before `createModeCatalogRuntime` / `installModeCatalogRuntime` existed.
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `core_mode_catalog_runtime.js` was listed in `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS`.
- GREEN: `npx vitest run tests/unit/bootstrap-mode-catalog.spec.ts`
- GREEN: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts`
- RED: `npm run audit:entry-manifest` failed while `src/entries/play-runtime-scripts.ts` still referenced `core_mode_catalog_runtime.js` / `coreModeCatalogRuntimeUrl`.
- GREEN: `npm run audit:entry-manifest`
- GREEN: `npx vitest run tests/unit/bootstrap-mode-catalog.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts`
- Search guard: `rg -n "coreModeCatalogRuntimeUrl|core_mode_catalog_runtime\\.js" src/entries/play-runtime-scripts.ts src/entries/home-family-shared.ts src/entries/replay-runtime-scripts.ts src/entries/capped.ts scripts/entry-manifest-audit.mjs` now reports only `scripts/entry-manifest-audit.mjs`.
- Full gates: `npm run audit:entry-manifest`, `npm run audit:game-manager`, `npm run audit:service-boundary`, `npm run audit:page-legacy-runtime-boundary`, `npm run build`, `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`, and `npm run verify:prepush` all exited 0.
