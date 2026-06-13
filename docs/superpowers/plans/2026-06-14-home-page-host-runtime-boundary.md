# Home Page Host Runtime Boundary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retire `js/core_home_page_host_runtime.js` from active play/home runtime manifests by installing `CoreHomePageHostRuntime` from the tested TypeScript bootstrap boundary.

**Architecture:** `src/bootstrap/home-page-host.ts` already owns home page default resolution, runtime resolution, bootstrap startup, and undo delegation. This phase adds the legacy global runtime shape, installs it during home-family bootstrap before legacy scripts load, and blocks the retired script from active manifests through `entry-manifest-audit`.

**Tech Stack:** TypeScript bootstrap modules, Vitest unit tests, Vite URL manifests, Playwright smoke tests, existing manifest audit scripts.

---

### Task 1: Add RED Tests for Installer and Retired Registry

**Files:**
- Modify: `tests/unit/bootstrap-home-page-host.spec.ts`
- Modify: `tests/unit/entry-manifest-audit-helpers.spec.ts`

- [x] **Step 1: Add failing installer assertions**

Update `tests/unit/bootstrap-home-page-host.spec.ts` imports:

```ts
import {
  applyHomePageBootstrap,
  applyHomePageUndo,
  createHomePageHostRuntime,
  installHomePageHostRuntime,
  resolveHomePageDefaults,
  resolveHomePageRuntimes,
  type HomePageHostRuntime
} from "../../src/bootstrap/home-page-host";
```

Add these tests at the start of `describe("bootstrap home page host", ...)`:

```ts
it("creates the legacy CoreHomePageHostRuntime shape from TypeScript functions", () => {
  const runtime = createHomePageHostRuntime();

  expect(runtime.resolveHomePageDefaults).toBe(resolveHomePageDefaults);
  expect(runtime.resolveHomePageRuntimes).toBe(resolveHomePageRuntimes);
  expect(runtime.applyHomePageBootstrap).toBe(applyHomePageBootstrap);
  expect(runtime.applyHomePageUndo).toBe(applyHomePageUndo);
});

it("installs the runtime on a supplied window-like object", () => {
  const windowLike: { CoreHomePageHostRuntime?: HomePageHostRuntime } = {};

  const installed = installHomePageHostRuntime({ windowLike });

  expect(installed).toBe(windowLike.CoreHomePageHostRuntime);
  expect(installed?.applyHomePageBootstrap).toBeTypeOf("function");
});

it("does not overwrite an existing home page host runtime", () => {
  const existing = createHomePageHostRuntime();
  const windowLike = { CoreHomePageHostRuntime: existing };

  const installed = installHomePageHostRuntime({ windowLike });

  expect(installed).toBe(existing);
  expect(windowLike.CoreHomePageHostRuntime).toBe(existing);
});

it("returns null when no window-like target is available", () => {
  expect(installHomePageHostRuntime({ windowLike: null })).toBeNull();
});
```

- [x] **Step 2: Add failing retired registry assertion**

Add this test after the home-startup-host retired registry assertion:

```ts
it("tracks home-page-host runtime as a retired active-manifest script", () => {
  expect(RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS).toContainEqual({
    scriptPath: "core_home_page_host_runtime.js",
    symbolName: "coreHomePageHostRuntimeUrl"
  });
});
```

- [x] **Step 3: Run RED tests**

Run:

```bash
npx vitest run tests/unit/bootstrap-home-page-host.spec.ts
npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts
```

Observed: first command failed because installer exports did not exist; second command failed because the retired registry entry was missing.

### Task 2: Install `CoreHomePageHostRuntime` from TypeScript

**Files:**
- Modify: `src/bootstrap/home-page-host.ts`
- Modify: `src/entries/home-family-bootstrap.ts`

- [x] **Step 1: Add runtime interfaces and installer**

Add to `src/bootstrap/home-page-host.ts`:

```ts
export interface HomePageHostRuntime {
  resolveHomePageDefaults: typeof resolveHomePageDefaults;
  resolveHomePageRuntimes: typeof resolveHomePageRuntimes;
  applyHomePageBootstrap: typeof applyHomePageBootstrap;
  applyHomePageUndo: typeof applyHomePageUndo;
}

export interface HomePageHostRuntimeWindowLike {
  CoreHomePageHostRuntime?: HomePageHostRuntime;
}

export interface HomePageHostRuntimeInstallOptions {
  windowLike?: HomePageHostRuntimeWindowLike | null | undefined;
}

export function createHomePageHostRuntime(): HomePageHostRuntime {
  return {
    resolveHomePageDefaults,
    resolveHomePageRuntimes,
    applyHomePageBootstrap,
    applyHomePageUndo
  };
}

export function installHomePageHostRuntime(
  options: HomePageHostRuntimeInstallOptions = {}
): HomePageHostRuntime | null {
  const windowLike =
    options.windowLike ||
    (typeof window === "undefined" ? null : (window as unknown as HomePageHostRuntimeWindowLike));
  if (!windowLike) return null;
  if (!windowLike.CoreHomePageHostRuntime) {
    windowLike.CoreHomePageHostRuntime = createHomePageHostRuntime();
  }
  return windowLike.CoreHomePageHostRuntime || null;
}
```

- [x] **Step 2: Install during home-family bootstrap**

Import and call the installer in `src/entries/home-family-bootstrap.ts`:

```ts
import { installHomePageHostRuntime } from "../bootstrap/home-page-host";
```

```ts
installHomePageHostRuntime();
```

- [x] **Step 3: Run GREEN installer tests**

Run:

```bash
npx vitest run tests/unit/bootstrap-home-page-host.spec.ts
```

Observed: PASS, 9 tests.

### Task 3: Retire the Legacy Script from Active Manifests

**Files:**
- Modify: `scripts/entry-manifest-audit.mjs`
- Modify: `src/entries/home-family-shared.ts`

- [x] **Step 1: Add retired registry entry**

Append to `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS`:

```js
{
  scriptPath: "core_home_page_host_runtime.js",
  symbolName: "coreHomePageHostRuntimeUrl"
}
```

- [x] **Step 2: Run retired registry GREEN**

Run:

```bash
npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts
```

Observed: PASS, 63 tests.

- [x] **Step 3: Run manifest audit RED**

Run:

```bash
npm run audit:entry-manifest
```

Observed: FAIL while `core_home_page_host_runtime.js` remained in `src/entries/home-family-shared.ts`.

- [x] **Step 4: Remove active manifest references**

Remove the `coreHomePageHostRuntimeUrl` import and array entry from:

```ts
src/entries/home-family-shared.ts
```

Do not delete `js/core_home_page_host_runtime.js`.

- [x] **Step 5: Run manifest audit GREEN**

Run:

```bash
npm run audit:entry-manifest
```

Observed: PASS.

### Task 4: Update Evidence and Run Full Gates

**Files:**
- Modify: `docs/ARCHITECTURE_GUARDRAILS.md`
- Modify: `docs/ROADMAP_MILESTONES.md`
- Modify: `docs/superpowers/plans/2026-06-14-home-page-host-runtime-boundary.md`

- [x] **Step 1: Update architecture guardrails**

Add a top entry recording:

```md
# Guardrail Delta (2026-06-14, Stage-1BD Home-Page-Host Runtime TS Boundary)

## Batch Impact
- `CoreHomePageHostRuntime` is now installed from `src/bootstrap/home-page-host.ts` before home-family legacy scripts load.
- The installer preserves the legacy runtime global shape: `resolveHomePageDefaults`, `resolveHomePageRuntimes`, `applyHomePageBootstrap`, and `applyHomePageUndo`.
- `js/core_home_page_host_runtime.js` was retired from active play/home runtime manifests without deleting the legacy file.
- `entry-manifest-audit` blocks `core_home_page_host_runtime.js` / `coreHomePageHostRuntimeUrl` through `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS`.
```

- [x] **Step 2: Update roadmap**

Prepend roadmap evidence for `WS-runtime-53` / Stage 1BD with the focused and full gate commands run in this phase.

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
git add src/bootstrap/home-page-host.ts src/entries/home-family-bootstrap.ts src/entries/home-family-shared.ts scripts/entry-manifest-audit.mjs tests/unit/bootstrap-home-page-host.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts docs/ARCHITECTURE_GUARDRAILS.md docs/ROADMAP_MILESTONES.md docs/superpowers/plans/2026-06-14-home-page-host-runtime-boundary.md
git commit -m "refactor: install home page host runtime from ts"
git push -u origin frontend-runtime-ts-boundary-stage1bd-home-page-host
```

Create a draft PR, mark ready after local gates pass, observe GitHub checks, and merge only after CI is green.

---

## Self-Review

- Spec coverage: This plan moves one active home page host legacy runtime out of manifests while preserving the global runtime contract through TS bootstrap installation.
- Placeholder scan: No TBD/TODO/implement-later placeholders remain.
- Type consistency: Runtime names consistently use `HomePageHost` / `coreHomePageHostRuntimeUrl` / `CoreHomePageHostRuntime`.
