# Home Startup Host Runtime Boundary Implementation Plan
> **For agentic workers:** Use Trellis/Trellies as the default project workflow. Before implementation, debugging, review, or code modification, check for and follow `.trellis/`, `.trellis/spec/`, Trellis task files, Trellis skills, and Trellis commands when available. Do not use legacy Superpower Skill instructions. If old Superpower instructions conflict with Trellis/Trellies, Trellis/Trellies wins. Steps use checkbox syntax for tracking.

**Goal:** Retire `js/core_home_startup_host_runtime.js` from active play/home runtime manifests by installing `CoreHomeStartupHostRuntime` from the tested TypeScript bootstrap boundary.

**Architecture:** `src/bootstrap/home-startup-host.ts` already owns the home startup payload resolver. This phase adds the legacy global runtime shape, installs it during home-family bootstrap before legacy scripts load, and blocks the retired script from active manifests through `entry-manifest-audit`.

**Tech Stack:** TypeScript bootstrap modules, Vitest unit tests, Vite URL manifests, Playwright smoke tests, existing manifest audit scripts.

---

### Task 1: Add RED Tests for Installer and Retired Registry

**Files:**
- Modify: `tests/unit/bootstrap-home-startup-host.spec.ts`
- Modify: `tests/unit/entry-manifest-audit-helpers.spec.ts`

- [x] **Step 1: Add failing installer assertions**

Update `tests/unit/bootstrap-home-startup-host.spec.ts` imports:

```ts
import {
  createHomeStartupHostRuntime,
  installHomeStartupHostRuntime,
  resolveHomeStartupFromContext,
  type HomeStartupHostRuntime
} from "../../src/bootstrap/home-startup-host";
```

Add these tests at the start of `describe("bootstrap home startup host", ...)`:

```ts
it("creates the legacy CoreHomeStartupHostRuntime shape from TypeScript functions", () => {
  const runtime = createHomeStartupHostRuntime();

  expect(runtime.resolveHomeStartupFromContext).toBe(resolveHomeStartupFromContext);
});

it("installs the runtime on a supplied window-like object", () => {
  const windowLike: { CoreHomeStartupHostRuntime?: HomeStartupHostRuntime } = {};

  const installed = installHomeStartupHostRuntime({ windowLike });

  expect(installed).toBe(windowLike.CoreHomeStartupHostRuntime);
  expect(installed?.resolveHomeStartupFromContext).toBeTypeOf("function");
});

it("does not overwrite an existing startup host runtime", () => {
  const existing = createHomeStartupHostRuntime();
  const windowLike = { CoreHomeStartupHostRuntime: existing };

  const installed = installHomeStartupHostRuntime({ windowLike });

  expect(installed).toBe(existing);
  expect(windowLike.CoreHomeStartupHostRuntime).toBe(existing);
});

it("returns null when no window-like target is available", () => {
  expect(installHomeStartupHostRuntime({ windowLike: null })).toBeNull();
});
```

- [x] **Step 2: Add failing retired registry assertion**

Add this test after the home-guide-step-view-host retired registry assertion:

```ts
it("tracks home-startup-host runtime as a retired active-manifest script", () => {
  expect(RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS).toContainEqual({
    scriptPath: "core_home_startup_host_runtime.js",
    symbolName: "coreHomeStartupHostRuntimeUrl"
  });
});
```

- [x] **Step 3: Run RED tests**

Run:

```bash
npx vitest run tests/unit/bootstrap-home-startup-host.spec.ts
npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts
```

Observed: first command failed because installer exports did not exist; second command failed because the retired registry entry was missing.

### Task 2: Install `CoreHomeStartupHostRuntime` from TypeScript

**Files:**
- Modify: `src/bootstrap/home-startup-host.ts`
- Modify: `src/entries/home-family-bootstrap.ts`

- [x] **Step 1: Add runtime interfaces and installer**

Add to `src/bootstrap/home-startup-host.ts`:

```ts
export interface HomeStartupHostRuntime {
  resolveHomeStartupFromContext: typeof resolveHomeStartupFromContext;
}

export interface HomeStartupHostRuntimeWindowLike {
  CoreHomeStartupHostRuntime?: HomeStartupHostRuntime;
}

export interface HomeStartupHostRuntimeInstallOptions {
  windowLike?: HomeStartupHostRuntimeWindowLike | null | undefined;
}

export function createHomeStartupHostRuntime(): HomeStartupHostRuntime {
  return {
    resolveHomeStartupFromContext
  };
}

export function installHomeStartupHostRuntime(
  options: HomeStartupHostRuntimeInstallOptions = {}
): HomeStartupHostRuntime | null {
  const windowLike =
    options.windowLike ||
    (typeof window === "undefined"
      ? null
      : (window as unknown as HomeStartupHostRuntimeWindowLike));
  if (!windowLike) return null;
  if (!windowLike.CoreHomeStartupHostRuntime) {
    windowLike.CoreHomeStartupHostRuntime = createHomeStartupHostRuntime();
  }
  return windowLike.CoreHomeStartupHostRuntime || null;
}
```

- [x] **Step 2: Install during home-family bootstrap**

Import and call the installer in `src/entries/home-family-bootstrap.ts`:

```ts
import { installHomeStartupHostRuntime } from "../bootstrap/home-startup-host";
```

```ts
installHomeStartupHostRuntime();
```

- [x] **Step 3: Run GREEN installer tests**

Run:

```bash
npx vitest run tests/unit/bootstrap-home-startup-host.spec.ts
```

Observed: PASS, 6 tests.

### Task 3: Retire the Legacy Script from Active Manifests

**Files:**
- Modify: `scripts/entry-manifest-audit.mjs`
- Modify: `src/entries/home-family-shared.ts`

- [x] **Step 1: Add retired registry entry**

Append to `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS`:

```js
{
  scriptPath: "core_home_startup_host_runtime.js",
  symbolName: "coreHomeStartupHostRuntimeUrl"
}
```

- [x] **Step 2: Run retired registry GREEN**

Run:

```bash
npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts
```

Observed: PASS, 62 tests.

- [x] **Step 3: Run manifest audit RED**

Run:

```bash
npm run audit:entry-manifest
```

Observed: FAIL while `core_home_startup_host_runtime.js` remained in `src/entries/home-family-shared.ts`.

- [x] **Step 4: Remove active manifest references**

Remove the `coreHomeStartupHostRuntimeUrl` import and array entry from:

```ts
src/entries/home-family-shared.ts
```

Do not delete `js/core_home_startup_host_runtime.js`.

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
- Modify: `docs/superpowers/plans/2026-06-14-home-startup-host-runtime-boundary.md`

- [x] **Step 1: Update architecture guardrails**

Add a top entry recording:

```md
# Guardrail Delta (2026-06-14, Stage-1BC Home-Startup-Host Runtime TS Boundary)

## Batch Impact
- `CoreHomeStartupHostRuntime` is now installed from `src/bootstrap/home-startup-host.ts` before home-family legacy scripts load.
- The installer preserves the legacy runtime global shape: `resolveHomeStartupFromContext`.
- `js/core_home_startup_host_runtime.js` was retired from active play/home runtime manifests without deleting the legacy file.
- `entry-manifest-audit` blocks `core_home_startup_host_runtime.js` / `coreHomeStartupHostRuntimeUrl` through `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS`.
```

- [x] **Step 2: Update roadmap**

Prepend roadmap evidence for `WS-runtime-52` / Stage 1BC with the focused and full gate commands run in this phase.

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
git add src/bootstrap/home-startup-host.ts src/entries/home-family-bootstrap.ts src/entries/home-family-shared.ts scripts/entry-manifest-audit.mjs tests/unit/bootstrap-home-startup-host.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts docs/ARCHITECTURE_GUARDRAILS.md docs/ROADMAP_MILESTONES.md docs/superpowers/plans/2026-06-14-home-startup-host-runtime-boundary.md
git commit -m "refactor: install home startup host runtime from ts"
git push -u origin frontend-runtime-ts-boundary-stage1bc-home-startup-host
```

Create a draft PR, mark ready after local gates pass, observe GitHub checks, and merge only after CI is green.

---

## Self-Review

- Spec coverage: This plan moves one active home startup legacy runtime out of manifests while preserving the global runtime contract through TS bootstrap installation.
- Placeholder scan: No TBD/TODO/implement-later placeholders remain.
- Type consistency: Runtime names consistently use `HomeStartupHost` / `coreHomeStartupHostRuntimeUrl` / `CoreHomeStartupHostRuntime`.
