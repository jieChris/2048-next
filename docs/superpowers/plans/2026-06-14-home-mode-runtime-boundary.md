# Home Mode Runtime Boundary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retire `js/core_home_mode_runtime.js` from active play/home runtime manifests by installing `CoreHomeModeRuntime` from the tested TypeScript bootstrap boundary.

**Architecture:** `src/bootstrap/home-mode.ts` already owns home mode key resolution and practice-mode selection. This phase adds the legacy global runtime shape, installs it during home-family bootstrap before legacy scripts load, and blocks the retired script from active manifests through `entry-manifest-audit`.

**Tech Stack:** TypeScript bootstrap modules, Vitest unit tests, Vite URL manifests, Playwright smoke tests, existing manifest audit scripts.

---

### Task 1: Add RED Tests for Installer and Retired Registry

**Files:**
- Modify: `tests/unit/bootstrap-home-mode.spec.ts`
- Modify: `tests/unit/entry-manifest-audit-helpers.spec.ts`

- [x] **Step 1: Add failing installer assertions**

Update `tests/unit/bootstrap-home-mode.spec.ts` imports:

```ts
import {
  DEFAULT_HOME_MODE_KEY,
  createHomeModeRuntime,
  installHomeModeRuntime,
  resolveHomeModeKey,
  resolveHomeModeSelection,
  resolveHomeModeSelectionFromContext,
  type HomeModeRuntime
} from "../../src/bootstrap/home-mode";
```

Add these tests at the start of `describe("bootstrap home mode", ...)`:

```ts
it("creates the legacy CoreHomeModeRuntime shape from TypeScript functions", () => {
  const runtime = createHomeModeRuntime();

  expect(runtime.DEFAULT_HOME_MODE_KEY).toBe(DEFAULT_HOME_MODE_KEY);
  expect(runtime.resolveHomeModeKey).toBe(resolveHomeModeKey);
  expect(runtime.resolveHomeModeSelection).toBe(resolveHomeModeSelection);
  expect(runtime.resolveHomeModeSelectionFromContext).toBe(resolveHomeModeSelectionFromContext);
});

it("installs the runtime on a supplied window-like object", () => {
  const windowLike: { CoreHomeModeRuntime?: HomeModeRuntime } = {};

  const installed = installHomeModeRuntime({ windowLike });

  expect(installed).toBe(windowLike.CoreHomeModeRuntime);
  expect(installed?.resolveHomeModeSelection).toBeTypeOf("function");
});

it("does not overwrite an existing home mode runtime", () => {
  const existing = createHomeModeRuntime();
  const windowLike = { CoreHomeModeRuntime: existing };

  const installed = installHomeModeRuntime({ windowLike });

  expect(installed).toBe(existing);
  expect(windowLike.CoreHomeModeRuntime).toBe(existing);
});

it("returns null when no window-like target is available", () => {
  expect(installHomeModeRuntime({ windowLike: null })).toBeNull();
});
```

- [x] **Step 2: Add failing retired registry assertion**

Add this test after the home-runtime-contract retired registry assertion:

```ts
it("tracks home-mode runtime as a retired active-manifest script", () => {
  expect(RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS).toContainEqual({
    scriptPath: "core_home_mode_runtime.js",
    symbolName: "coreHomeModeRuntimeUrl"
  });
});
```

- [x] **Step 3: Run RED tests**

Run:

```bash
npx vitest run tests/unit/bootstrap-home-mode.spec.ts
npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts
```

Observed: first command failed because installer exports did not exist; second command failed because the retired registry entry was missing.

### Task 2: Install `CoreHomeModeRuntime` from TypeScript

**Files:**
- Modify: `src/bootstrap/home-mode.ts`
- Modify: `src/entries/home-family-bootstrap.ts`

- [x] **Step 1: Add runtime interfaces and installer**

Add to `src/bootstrap/home-mode.ts`:

```ts
export interface HomeModeRuntime {
  DEFAULT_HOME_MODE_KEY: typeof DEFAULT_HOME_MODE_KEY;
  resolveHomeModeKey: typeof resolveHomeModeKey;
  resolveHomeModeSelection: typeof resolveHomeModeSelection;
  resolveHomeModeSelectionFromContext: typeof resolveHomeModeSelectionFromContext;
}

export interface HomeModeRuntimeWindowLike {
  CoreHomeModeRuntime?: HomeModeRuntime;
}

export interface HomeModeRuntimeInstallOptions {
  windowLike?: HomeModeRuntimeWindowLike | null | undefined;
}

export function createHomeModeRuntime(): HomeModeRuntime {
  return {
    DEFAULT_HOME_MODE_KEY,
    resolveHomeModeKey,
    resolveHomeModeSelection,
    resolveHomeModeSelectionFromContext
  };
}

export function installHomeModeRuntime(
  options: HomeModeRuntimeInstallOptions = {}
): HomeModeRuntime | null {
  const windowLike =
    options.windowLike ||
    (typeof window === "undefined" ? null : (window as unknown as HomeModeRuntimeWindowLike));
  if (!windowLike) return null;
  if (!windowLike.CoreHomeModeRuntime) {
    windowLike.CoreHomeModeRuntime = createHomeModeRuntime();
  }
  return windowLike.CoreHomeModeRuntime || null;
}
```

- [x] **Step 2: Install during home-family bootstrap**

Import and call the installer in `src/entries/home-family-bootstrap.ts` before `installHomeRuntimeContractRuntime()`:

```ts
import { installHomeModeRuntime } from "../bootstrap/home-mode";
```

```ts
installHomeModeRuntime();
```

- [x] **Step 3: Run GREEN installer tests**

Run:

```bash
npx vitest run tests/unit/bootstrap-home-mode.spec.ts
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
  scriptPath: "core_home_mode_runtime.js",
  symbolName: "coreHomeModeRuntimeUrl"
}
```

- [x] **Step 2: Run retired registry GREEN**

Run:

```bash
npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts
```

Observed: PASS, 65 tests.

- [x] **Step 3: Run manifest audit RED**

Run:

```bash
npm run audit:entry-manifest
```

Observed: FAIL while `core_home_mode_runtime.js` remained in `src/entries/home-family-shared.ts`.

- [x] **Step 4: Remove active manifest references**

Remove the `coreHomeModeRuntimeUrl` import and array entry from:

```ts
src/entries/home-family-shared.ts
```

Do not delete `js/core_home_mode_runtime.js`.

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
- Modify: `docs/superpowers/plans/2026-06-14-home-mode-runtime-boundary.md`

- [x] **Step 1: Update architecture guardrails**

Add a top entry recording:

```md
# Guardrail Delta (2026-06-14, Stage-1BF Home-Mode Runtime TS Boundary)

## Batch Impact
- `CoreHomeModeRuntime` is now installed from `src/bootstrap/home-mode.ts` before home-family legacy scripts load.
- The installer preserves the legacy runtime global shape: `DEFAULT_HOME_MODE_KEY`, `resolveHomeModeKey`, `resolveHomeModeSelection`, and `resolveHomeModeSelectionFromContext`.
- `js/core_home_mode_runtime.js` was retired from active play/home runtime manifests without deleting the legacy file.
- `entry-manifest-audit` blocks `core_home_mode_runtime.js` / `coreHomeModeRuntimeUrl` through `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS`.
```

- [x] **Step 2: Update roadmap**

Prepend roadmap evidence for `WS-runtime-55` / Stage 1BF with the focused and full gate commands run in this phase.

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
git add src/bootstrap/home-mode.ts src/entries/home-family-bootstrap.ts src/entries/home-family-shared.ts scripts/entry-manifest-audit.mjs tests/unit/bootstrap-home-mode.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts docs/ARCHITECTURE_GUARDRAILS.md docs/ROADMAP_MILESTONES.md docs/superpowers/plans/2026-06-14-home-mode-runtime-boundary.md
git commit -m "refactor: install home mode runtime from ts"
git push -u origin frontend-runtime-ts-boundary-stage1bf-home-mode
```

Create a draft PR, mark ready after local gates pass, observe GitHub checks, and merge only after CI is green.

---

## Self-Review

- Spec coverage: This plan moves one active home mode legacy runtime out of manifests while preserving the global runtime contract through TS bootstrap installation.
- Placeholder scan: No TBD/TODO/implement-later placeholders remain.
- Type consistency: Runtime names consistently use `HomeMode` / `coreHomeModeRuntimeUrl` / `CoreHomeModeRuntime`.
