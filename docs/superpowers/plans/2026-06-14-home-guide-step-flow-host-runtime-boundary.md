# Home Guide Step Flow Host Runtime Boundary Implementation Plan
> **For agentic workers:** Use Trellis/Trellies as the default project workflow. Before implementation, debugging, review, or code modification, check for and follow `.trellis/`, `.trellis/spec/`, Trellis task files, Trellis skills, and Trellis commands when available. Do not use legacy Superpower Skill instructions. If old Superpower instructions conflict with Trellis/Trellies, Trellis/Trellies wins. Steps use checkbox syntax for tracking.

**Goal:** Retire `js/core_home_guide_step_flow_host_runtime.js` from active play/home runtime manifests by installing `CoreHomeGuideStepFlowHostRuntime` from the tested TypeScript bootstrap boundary.

**Architecture:** `src/bootstrap/home-guide-step-flow-host.ts` already owns the legacy-equivalent step index resolution, target visibility, scroll, highlight, and completion behavior. This phase adds the legacy global runtime shape and installs it during home-family bootstrap before legacy scripts load, then blocks the retired script from active manifests through `entry-manifest-audit`.

**Tech Stack:** TypeScript bootstrap modules, Vitest unit tests, Vite URL manifests, Playwright smoke tests, existing manifest audit scripts.

---

### Task 1: Add RED Tests for the TS Runtime Installer and Retired Manifest Registry

**Files:**
- Modify: `tests/unit/bootstrap-home-guide-step-flow-host.spec.ts`
- Modify: `tests/unit/entry-manifest-audit-helpers.spec.ts`

- [ ] **Step 1: Add failing installer assertions**

Add imports for `createHomeGuideStepFlowHostRuntime`, `installHomeGuideStepFlowHostRuntime`, and `HomeGuideStepFlowHostRuntime`, then add these tests near the top of `describe("bootstrap home guide step flow host", ...)`:

```ts
it("creates the legacy CoreHomeGuideStepFlowHostRuntime shape from TypeScript functions", () => {
  const runtime = createHomeGuideStepFlowHostRuntime();

  expect(runtime.applyHomeGuideStepFlow).toBe(applyHomeGuideStepFlow);
});

it("installs the runtime on a supplied window-like object", () => {
  const windowLike: { CoreHomeGuideStepFlowHostRuntime?: HomeGuideStepFlowHostRuntime } = {};

  const installed = installHomeGuideStepFlowHostRuntime({ windowLike });

  expect(installed).toBe(windowLike.CoreHomeGuideStepFlowHostRuntime);
  expect(installed?.applyHomeGuideStepFlow).toBeTypeOf("function");
});

it("does not overwrite an existing step-flow host runtime", () => {
  const existing = createHomeGuideStepFlowHostRuntime();
  const windowLike = { CoreHomeGuideStepFlowHostRuntime: existing };

  const installed = installHomeGuideStepFlowHostRuntime({ windowLike });

  expect(installed).toBe(existing);
  expect(windowLike.CoreHomeGuideStepFlowHostRuntime).toBe(existing);
});

it("returns null when no window-like target is available", () => {
  expect(installHomeGuideStepFlowHostRuntime({ windowLike: null })).toBeNull();
});
```

- [ ] **Step 2: Add failing retired registry assertion**

Add this test after the home-guide-controls-host retired registry assertion:

```ts
it("tracks home-guide-step-flow-host runtime as a retired active-manifest script", () => {
  expect(RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS).toContainEqual({
    scriptPath: "core_home_guide_step_flow_host_runtime.js",
    symbolName: "coreHomeGuideStepFlowHostRuntimeUrl"
  });
});
```

- [ ] **Step 3: Run RED tests**

Run:

```bash
npx vitest run tests/unit/bootstrap-home-guide-step-flow-host.spec.ts
npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts
```

Expected: first command fails because the installer exports do not exist; second command fails because the retired registry entry is missing.

### Task 2: Install `CoreHomeGuideStepFlowHostRuntime` from TypeScript

**Files:**
- Modify: `src/bootstrap/home-guide-step-flow-host.ts`
- Modify: `src/entries/home-family-bootstrap.ts`

- [ ] **Step 1: Add runtime interfaces and installer**

Add the legacy runtime shape to `src/bootstrap/home-guide-step-flow-host.ts`:

```ts
export interface HomeGuideStepFlowHostRuntime {
  applyHomeGuideStepFlow: typeof applyHomeGuideStepFlow;
}

export interface HomeGuideStepFlowHostRuntimeWindowLike {
  CoreHomeGuideStepFlowHostRuntime?: HomeGuideStepFlowHostRuntime;
}

export interface HomeGuideStepFlowHostRuntimeInstallOptions {
  windowLike?: HomeGuideStepFlowHostRuntimeWindowLike | null | undefined;
}
```

Add the installer after `applyHomeGuideStepFlow`:

```ts
export function createHomeGuideStepFlowHostRuntime(): HomeGuideStepFlowHostRuntime {
  return {
    applyHomeGuideStepFlow
  };
}

export function installHomeGuideStepFlowHostRuntime(
  options: HomeGuideStepFlowHostRuntimeInstallOptions = {}
): HomeGuideStepFlowHostRuntime | null {
  const windowLike =
    options.windowLike ||
    (typeof window === "undefined"
      ? null
      : (window as unknown as HomeGuideStepFlowHostRuntimeWindowLike));
  if (!windowLike) return null;
  if (!windowLike.CoreHomeGuideStepFlowHostRuntime) {
    windowLike.CoreHomeGuideStepFlowHostRuntime = createHomeGuideStepFlowHostRuntime();
  }
  return windowLike.CoreHomeGuideStepFlowHostRuntime || null;
}
```

- [ ] **Step 2: Install during home-family bootstrap**

Import and call the installer in `src/entries/home-family-bootstrap.ts`:

```ts
import { installHomeGuideStepFlowHostRuntime } from "../bootstrap/home-guide-step-flow-host";
```

```ts
installHomeGuideStepFlowHostRuntime();
```

- [ ] **Step 3: Run GREEN installer tests**

Run:

```bash
npx vitest run tests/unit/bootstrap-home-guide-step-flow-host.spec.ts
```

Expected: PASS.

### Task 3: Retire the Legacy Script from Active Manifests

**Files:**
- Modify: `scripts/entry-manifest-audit.mjs`
- Modify: `src/entries/play-runtime-scripts.ts`
- Modify: `src/entries/home-family-shared.ts`

- [ ] **Step 1: Add retired registry entry**

Append to `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS`:

```js
{
  scriptPath: "core_home_guide_step_flow_host_runtime.js",
  symbolName: "coreHomeGuideStepFlowHostRuntimeUrl"
}
```

- [ ] **Step 2: Run retired registry GREEN**

Run:

```bash
npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts
```

Expected: PASS.

- [ ] **Step 3: Run manifest audit RED**

Run:

```bash
npm run audit:entry-manifest
```

Expected: FAIL while `core_home_guide_step_flow_host_runtime.js` remains in `src/entries/play-runtime-scripts.ts` and `src/entries/home-family-shared.ts`.

- [ ] **Step 4: Remove active manifest references**

Remove `coreHomeGuideStepFlowHostRuntimeUrl` imports and array entries from:

```ts
src/entries/play-runtime-scripts.ts
src/entries/home-family-shared.ts
```

Do not delete `js/core_home_guide_step_flow_host_runtime.js`.

- [ ] **Step 5: Run manifest audit GREEN**

Run:

```bash
npm run audit:entry-manifest
```

Expected: PASS.

### Task 4: Update Stage Evidence Docs

**Files:**
- Modify: `docs/ARCHITECTURE_GUARDRAILS.md`
- Modify: `docs/ROADMAP_MILESTONES.md`

- [ ] **Step 1: Prepend guardrail delta**

Prepend a Stage-1AU section documenting:
- `CoreHomeGuideStepFlowHostRuntime` is installed from `src/bootstrap/home-guide-step-flow-host.ts`.
- `src/bootstrap/home-guide-step-flow-host.ts` owns step resolution, target visibility, scroll, highlight, and completion orchestration.
- Legacy runtime global shape is preserved.
- `js/core_home_guide_step_flow_host_runtime.js` is retired from active manifests without deletion.
- `entry-manifest-audit` blocks the retired script and symbol.

- [ ] **Step 2: Prepend roadmap milestone**

Prepend a Stage-1AU section with `WS-runtime-44`, `status: done`, and evidence commands.

### Task 5: Full Verification, Commit, PR, and CI

**Files:**
- Verify all modified files.

- [ ] **Step 1: Run focused GREEN tests**

```bash
npx vitest run tests/unit/bootstrap-home-guide-step-flow-host.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts
```

- [ ] **Step 2: Run required audits and build**

```bash
npm run audit:entry-manifest
npm run audit:game-manager
npm run audit:service-boundary
npm run audit:page-legacy-runtime-boundary
npm run build
```

- [ ] **Step 3: Run smoke and prepush gate**

```bash
npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts
npm run verify:prepush
```

- [ ] **Step 4: Commit**

```bash
git add src/bootstrap/home-guide-step-flow-host.ts src/entries/home-family-bootstrap.ts src/entries/play-runtime-scripts.ts src/entries/home-family-shared.ts scripts/entry-manifest-audit.mjs tests/unit/bootstrap-home-guide-step-flow-host.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts docs/ARCHITECTURE_GUARDRAILS.md docs/ROADMAP_MILESTONES.md docs/superpowers/plans/2026-06-14-home-guide-step-flow-host-runtime-boundary.md
git commit -m "refactor: install home guide step flow host runtime from ts"
```

- [ ] **Step 5: Push, open PR, wait for CI, merge**

Push branch `frontend-runtime-ts-boundary-stage1au-home-guide-step-flow-host`, open a draft PR, mark ready after local gates are captured, wait for GitHub checks, then merge only after CI is green.

## Self-Review

- Spec coverage: This plan moves one active legacy runtime out of play/home manifests while preserving the global runtime contract through TS bootstrap installation.
- Placeholder scan: No placeholder steps remain; each task has concrete files, commands, and expected outcomes.
- Type consistency: Runtime names use `HomeGuideStepFlowHostRuntime`, `CoreHomeGuideStepFlowHostRuntime`, and `installHomeGuideStepFlowHostRuntime` consistently across tests, implementation, bootstrap, and docs.
