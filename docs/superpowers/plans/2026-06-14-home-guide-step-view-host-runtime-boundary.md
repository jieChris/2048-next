# Home Guide Step View Host Runtime Boundary Implementation Plan
> **For agentic workers:** Use Trellis/Trellies as the default project workflow. Before implementation, debugging, review, or code modification, check for and follow `.trellis/`, `.trellis/spec/`, Trellis task files, Trellis skills, and Trellis commands when available. Do not use legacy Superpower Skill instructions. If old Superpower instructions conflict with Trellis/Trellies, Trellis/Trellies wins. Steps use checkbox syntax for tracking.

**Goal:** Retire `js/core_home_guide_step_view_host_runtime.js` from active play/home runtime manifests by installing `CoreHomeGuideStepViewHostRuntime` from the tested TypeScript bootstrap boundary.

**Architecture:** `src/bootstrap/home-guide-step-view-host.ts` must preserve the active legacy step-view contract now that `CoreHomeGuideDomHostRuntime` is installed from TypeScript: render structured guide controls into `#home-guide-panel`, render the compact text banner through `#home-guide-message-banner`, and schedule `positionHomeGuidePanel` through `requestAnimationFrame`. This phase aligns the TypeScript implementation with that contract, adds the legacy global runtime shape, and blocks the retired script from active manifests through `entry-manifest-audit`.

**Tech Stack:** TypeScript bootstrap modules, Vitest unit tests, Vite URL manifests, Playwright smoke tests, existing manifest audit scripts.

---

### Task 1: Add RED Tests for Legacy Step-View Contract, Installer, and Retired Registry

**Files:**
- Modify: `tests/unit/bootstrap-home-guide-step-view-host.spec.ts`
- Modify: `tests/unit/entry-manifest-audit-helpers.spec.ts`

- [x] **Step 1: Add failing installer and legacy scheduling assertions**

Add imports for `createHomeGuideStepViewHostRuntime`, `installHomeGuideStepViewHostRuntime`, and `HomeGuideStepViewHostRuntime`. Update the first test so it provides `positionHomeGuidePanel`, expects `requestAnimationFrame` to receive that callback, and asserts a `home-guide-message-banner` text banner is written. Add installer tests near the top of `describe("bootstrap home guide step view host", ...)`:

```ts
it("creates the legacy CoreHomeGuideStepViewHostRuntime shape from TypeScript functions", () => {
  const runtime = createHomeGuideStepViewHostRuntime();

  expect(runtime.applyHomeGuideStepView).toBe(applyHomeGuideStepView);
});

it("installs the runtime on a supplied window-like object", () => {
  const windowLike: { CoreHomeGuideStepViewHostRuntime?: HomeGuideStepViewHostRuntime } = {};

  const installed = installHomeGuideStepViewHostRuntime({ windowLike });

  expect(installed).toBe(windowLike.CoreHomeGuideStepViewHostRuntime);
  expect(installed?.applyHomeGuideStepView).toBeTypeOf("function");
});

it("does not overwrite an existing step view host runtime", () => {
  const existing = createHomeGuideStepViewHostRuntime();
  const windowLike = { CoreHomeGuideStepViewHostRuntime: existing };

  const installed = installHomeGuideStepViewHostRuntime({ windowLike });

  expect(installed).toBe(existing);
  expect(windowLike.CoreHomeGuideStepViewHostRuntime).toBe(existing);
});

it("returns null when no window-like target is available", () => {
  expect(installHomeGuideStepViewHostRuntime({ windowLike: null })).toBeNull();
});
```

In the render test, include:

```ts
const nodesById: Record<string, Record<string, unknown>> = {};
const appendedNodes: Array<Record<string, unknown>> = [];
const positionHomeGuidePanel = vi.fn();
const requestAnimationFrame = vi.fn((cb: () => void) => cb());
```

Expected assertions:

```ts
expect(requestAnimationFrame).toHaveBeenCalledWith(positionHomeGuidePanel);
expect(positionHomeGuidePanel).toHaveBeenCalledTimes(1);
expect(nodesById["home-guide-message-banner"].textContent).toBe(
  "Step 3 / 4 · Title： Description"
);
```

- [x] **Step 2: Add failing retired registry assertion**

Add this test after the home-guide-dom-host retired registry assertion:

```ts
it("tracks home-guide-step-view-host runtime as a retired active-manifest script", () => {
  expect(RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS).toContainEqual({
    scriptPath: "core_home_guide_step_view_host_runtime.js",
    symbolName: "coreHomeGuideStepViewHostRuntimeUrl"
  });
});
```

- [x] **Step 3: Run RED tests**

Run:

```bash
npx vitest run tests/unit/bootstrap-home-guide-step-view-host.spec.ts
npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts
```

Expected: first command fails because installer exports do not exist and the current TypeScript step-view schedules the banner reposition function instead of `positionHomeGuidePanel`; second command fails because the retired registry entry is missing.

### Task 2: Align and Install `CoreHomeGuideStepViewHostRuntime` from TypeScript

**Files:**
- Modify: `src/bootstrap/home-guide-step-view-host.ts`
- Modify: `src/entries/home-family-bootstrap.ts`

- [x] **Step 1: Preserve legacy panel/banner/scheduler behavior**

In `src/bootstrap/home-guide-step-view-host.ts`:
- Ensure structured step controls are loaded into `#home-guide-panel`, not `#home-guide-message-banner`.
- Keep `#home-guide-message-banner` as the compact text banner and set its `textContent` to `"step · title： desc"`.
- Schedule `positionHomeGuidePanel` through `requestAnimationFrame` when both are available.

- [x] **Step 2: Add runtime interfaces and installer**

Add:

```ts
export interface HomeGuideStepViewHostRuntime {
  applyHomeGuideStepView: typeof applyHomeGuideStepView;
}

export interface HomeGuideStepViewHostRuntimeWindowLike {
  CoreHomeGuideStepViewHostRuntime?: HomeGuideStepViewHostRuntime;
}

export interface HomeGuideStepViewHostRuntimeInstallOptions {
  windowLike?: HomeGuideStepViewHostRuntimeWindowLike | null | undefined;
}

export function createHomeGuideStepViewHostRuntime(): HomeGuideStepViewHostRuntime {
  return {
    applyHomeGuideStepView
  };
}

export function installHomeGuideStepViewHostRuntime(
  options: HomeGuideStepViewHostRuntimeInstallOptions = {}
): HomeGuideStepViewHostRuntime | null {
  const windowLike =
    options.windowLike ||
    (typeof window === "undefined"
      ? null
      : (window as unknown as HomeGuideStepViewHostRuntimeWindowLike));
  if (!windowLike) return null;
  if (!windowLike.CoreHomeGuideStepViewHostRuntime) {
    windowLike.CoreHomeGuideStepViewHostRuntime = createHomeGuideStepViewHostRuntime();
  }
  return windowLike.CoreHomeGuideStepViewHostRuntime || null;
}
```

- [x] **Step 3: Install during home-family bootstrap**

Import and call the installer in `src/entries/home-family-bootstrap.ts`:

```ts
import { installHomeGuideStepViewHostRuntime } from "../bootstrap/home-guide-step-view-host";
```

```ts
installHomeGuideStepViewHostRuntime();
```

- [x] **Step 4: Run GREEN installer tests**

Run:

```bash
npx vitest run tests/unit/bootstrap-home-guide-step-view-host.spec.ts
```

Expected: PASS.

### Task 3: Retire the Legacy Script from Active Manifests

**Files:**
- Modify: `scripts/entry-manifest-audit.mjs`
- Modify: `src/entries/play-runtime-scripts.ts`
- Modify: `src/entries/home-family-shared.ts`

- [x] **Step 1: Add retired registry entry**

Append to `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS`:

```js
{
  scriptPath: "core_home_guide_step_view_host_runtime.js",
  symbolName: "coreHomeGuideStepViewHostRuntimeUrl"
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

Expected: FAIL while `core_home_guide_step_view_host_runtime.js` remains in `src/entries/play-runtime-scripts.ts` and `src/entries/home-family-shared.ts`.

- [x] **Step 4: Remove active manifest references**

Remove `coreHomeGuideStepViewHostRuntimeUrl` imports and array entries from:

```ts
src/entries/play-runtime-scripts.ts
src/entries/home-family-shared.ts
```

Do not delete `js/core_home_guide_step_view_host_runtime.js`.

- [x] **Step 5: Run manifest audit GREEN**

Run:

```bash
npm run audit:entry-manifest
```

Expected: PASS.

### Task 4: Update Stage Evidence Docs

**Files:**
- Modify: `docs/ARCHITECTURE_GUARDRAILS.md`
- Modify: `docs/ROADMAP_MILESTONES.md`

- [x] **Step 1: Prepend guardrail delta**

Prepend a Stage-1BB section documenting:
- `CoreHomeGuideStepViewHostRuntime` is installed from `src/bootstrap/home-guide-step-view-host.ts`.
- `src/bootstrap/home-guide-step-view-host.ts` preserves the active legacy `home-guide-panel` and `home-guide-message-banner` rendering contract.
- Legacy runtime global shape is preserved.
- `js/core_home_guide_step_view_host_runtime.js` is retired from active manifests without deletion.
- `entry-manifest-audit` blocks the retired script and symbol.

- [x] **Step 2: Prepend roadmap milestone**

Prepend a Stage-1BB section with `WS-runtime-51`, `status: done`, and evidence commands.

### Task 5: Full Verification, Commit, PR, and CI

**Files:**
- Verify all modified files.

- [x] **Step 1: Run focused GREEN tests**

```bash
npx vitest run tests/unit/bootstrap-home-guide-step-view-host.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts
```

- [x] **Step 2: Run required audits and build**

```bash
npm run audit:entry-manifest
npm run audit:game-manager
npm run audit:service-boundary
npm run audit:page-legacy-runtime-boundary
npm run build
```

- [x] **Step 3: Run smoke and prepush gate**

```bash
npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts
npm run verify:prepush
```

- [x] **Step 4: Commit**

```bash
git add src/bootstrap/home-guide-step-view-host.ts src/entries/home-family-bootstrap.ts src/entries/play-runtime-scripts.ts src/entries/home-family-shared.ts scripts/entry-manifest-audit.mjs tests/unit/bootstrap-home-guide-step-view-host.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts docs/ARCHITECTURE_GUARDRAILS.md docs/ROADMAP_MILESTONES.md docs/superpowers/plans/2026-06-14-home-guide-step-view-host-runtime-boundary.md
git commit -m "refactor: install home guide step view host runtime from ts"
```

- [ ] **Step 5: Push, open PR, wait for CI, merge**

Push branch `frontend-runtime-ts-boundary-stage1bb-home-guide-step-view-host`, open a draft PR, mark ready after local gates are captured, wait for GitHub checks, then merge only after CI is green.

## Self-Review

- Spec coverage: This plan moves the last active home-guide legacy runtime out of play/home manifests while preserving the current panel/banner rendering contract.
- Placeholder scan: No placeholder steps remain; each task has concrete files, commands, and expected outcomes.
- Type consistency: Runtime names use `HomeGuideStepViewHostRuntime`, `CoreHomeGuideStepViewHostRuntime`, and `installHomeGuideStepViewHostRuntime` consistently across tests, implementation, bootstrap, and docs.
