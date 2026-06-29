# Home Guide Dom Host Runtime Boundary Implementation Plan
> **For agentic workers:** Use Trellis/Trellies as the default project workflow. Before implementation, debugging, review, or code modification, check for and follow `.trellis/`, `.trellis/spec/`, Trellis task files, Trellis skills, and Trellis commands when available. Do not use legacy Superpower Skill instructions. If old Superpower instructions conflict with Trellis/Trellies, Trellis/Trellies wins. Steps use checkbox syntax for tracking.

**Goal:** Retire `js/core_home_guide_dom_host_runtime.js` from active play/home runtime manifests by installing `CoreHomeGuideDomHostRuntime` from the tested TypeScript bootstrap boundary.

**Architecture:** `src/bootstrap/home-guide-dom-host.ts` must preserve the active legacy DOM contract while `CoreHomeGuideStepViewHostRuntime` still loads from legacy JS: `applyHomeGuideDomEnsure` creates/reuses `#home-guide-panel` for `homeGuideState.panel` and `#home-guide-overlay` for `homeGuideState.overlay`. This phase first aligns the TypeScript DOM host with that legacy panel contract, then adds the legacy global runtime shape and blocks the retired script from active manifests through `entry-manifest-audit`.

**Tech Stack:** TypeScript bootstrap modules, Vitest unit tests, Vite URL manifests, Playwright smoke tests, existing manifest audit scripts.

---

### Task 1: Add RED Tests for Legacy Panel Contract, Installer, and Retired Registry

**Files:**
- Modify: `tests/unit/bootstrap-home-guide-dom-host.spec.ts`
- Modify: `tests/unit/entry-manifest-audit-helpers.spec.ts`

- [x] **Step 1: Add failing DOM contract and installer assertions**

Update `tests/unit/bootstrap-home-guide-dom-host.spec.ts` to import `createHomeGuideDomHostRuntime`, `installHomeGuideDomHostRuntime`, and `HomeGuideDomHostRuntime`. Add installer tests near the top of `describe("bootstrap home guide dom host", ...)`, and update the existing DOM tests so the created/reused panel id is `home-guide-panel`, not `home-guide-message-banner`:

```ts
it("creates the legacy CoreHomeGuideDomHostRuntime shape from TypeScript functions", () => {
  const runtime = createHomeGuideDomHostRuntime();

  expect(runtime.applyHomeGuideDomEnsure).toBe(applyHomeGuideDomEnsure);
});

it("installs the runtime on a supplied window-like object", () => {
  const windowLike: { CoreHomeGuideDomHostRuntime?: HomeGuideDomHostRuntime } = {};

  const installed = installHomeGuideDomHostRuntime({ windowLike });

  expect(installed).toBe(windowLike.CoreHomeGuideDomHostRuntime);
  expect(installed?.applyHomeGuideDomEnsure).toBeTypeOf("function");
});

it("does not overwrite an existing dom host runtime", () => {
  const existing = createHomeGuideDomHostRuntime();
  const windowLike = { CoreHomeGuideDomHostRuntime: existing };

  const installed = installHomeGuideDomHostRuntime({ windowLike });

  expect(installed).toBe(existing);
  expect(windowLike.CoreHomeGuideDomHostRuntime).toBe(existing);
});

it("returns null when no window-like target is available", () => {
  expect(installHomeGuideDomHostRuntime({ windowLike: null })).toBeNull();
});
```

Expected test edits:

```ts
expect((result.panel as Record<string, unknown>).id).toBe("home-guide-panel");
```

```ts
harness.nodesById["home-guide-panel"] = {
  id: "home-guide-panel",
  className: "home-guide-panel",
  style: { display: "none" },
  innerHTML: "existing"
};
```

- [x] **Step 2: Add failing retired registry assertion**

Add this test after the home-guide runtime retired registry assertion:

```ts
it("tracks home-guide-dom-host runtime as a retired active-manifest script", () => {
  expect(RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS).toContainEqual({
    scriptPath: "core_home_guide_dom_host_runtime.js",
    symbolName: "coreHomeGuideDomHostRuntimeUrl"
  });
});
```

- [x] **Step 3: Run RED tests**

Run:

```bash
npx vitest run tests/unit/bootstrap-home-guide-dom-host.spec.ts
npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts
```

Expected: first command fails because the installer exports do not exist and the TS DOM host still creates `home-guide-message-banner`; second command fails because the retired registry entry is missing.

### Task 2: Align and Install `CoreHomeGuideDomHostRuntime` from TypeScript

**Files:**
- Modify: `src/bootstrap/home-guide-dom-host.ts`
- Modify: `src/entries/home-family-bootstrap.ts`

- [x] **Step 1: Preserve the legacy panel contract**

In `src/bootstrap/home-guide-dom-host.ts`, make `applyHomeGuideDomEnsure` use `#home-guide-panel` and `home-guide-panel` as the panel id/class. Remove the message-banner migration path from this DOM host so it matches the active legacy runtime while step-view remains a legacy script.

- [x] **Step 2: Add runtime interfaces and installer**

Add:

```ts
export interface HomeGuideDomHostRuntime {
  applyHomeGuideDomEnsure: typeof applyHomeGuideDomEnsure;
}

export interface HomeGuideDomHostRuntimeWindowLike {
  CoreHomeGuideDomHostRuntime?: HomeGuideDomHostRuntime;
}

export interface HomeGuideDomHostRuntimeInstallOptions {
  windowLike?: HomeGuideDomHostRuntimeWindowLike | null | undefined;
}

export function createHomeGuideDomHostRuntime(): HomeGuideDomHostRuntime {
  return {
    applyHomeGuideDomEnsure
  };
}

export function installHomeGuideDomHostRuntime(
  options: HomeGuideDomHostRuntimeInstallOptions = {}
): HomeGuideDomHostRuntime | null {
  const windowLike =
    options.windowLike ||
    (typeof window === "undefined" ? null : (window as unknown as HomeGuideDomHostRuntimeWindowLike));
  if (!windowLike) return null;
  if (!windowLike.CoreHomeGuideDomHostRuntime) {
    windowLike.CoreHomeGuideDomHostRuntime = createHomeGuideDomHostRuntime();
  }
  return windowLike.CoreHomeGuideDomHostRuntime || null;
}
```

- [x] **Step 3: Install during home-family bootstrap**

Import and call the installer in `src/entries/home-family-bootstrap.ts`:

```ts
import { installHomeGuideDomHostRuntime } from "../bootstrap/home-guide-dom-host";
```

```ts
installHomeGuideDomHostRuntime();
```

- [x] **Step 4: Run GREEN installer tests**

Run:

```bash
npx vitest run tests/unit/bootstrap-home-guide-dom-host.spec.ts
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
  scriptPath: "core_home_guide_dom_host_runtime.js",
  symbolName: "coreHomeGuideDomHostRuntimeUrl"
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

Expected: FAIL while `core_home_guide_dom_host_runtime.js` remains in `src/entries/play-runtime-scripts.ts` and `src/entries/home-family-shared.ts`.

- [x] **Step 4: Remove active manifest references**

Remove `coreHomeGuideDomHostRuntimeUrl` imports and array entries from:

```ts
src/entries/play-runtime-scripts.ts
src/entries/home-family-shared.ts
```

Do not delete `js/core_home_guide_dom_host_runtime.js`.

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

Prepend a Stage-1BA section documenting:
- `CoreHomeGuideDomHostRuntime` is installed from `src/bootstrap/home-guide-dom-host.ts`.
- `src/bootstrap/home-guide-dom-host.ts` preserves the active legacy `home-guide-panel` contract while step-view remains legacy.
- Legacy runtime global shape is preserved.
- `js/core_home_guide_dom_host_runtime.js` is retired from active manifests without deletion.
- `entry-manifest-audit` blocks the retired script and symbol.

- [x] **Step 2: Prepend roadmap milestone**

Prepend a Stage-1BA section with `WS-runtime-50`, `status: done`, and evidence commands.

### Task 5: Full Verification, Commit, PR, and CI

**Files:**
- Verify all modified files.

- [x] **Step 1: Run focused GREEN tests**

```bash
npx vitest run tests/unit/bootstrap-home-guide-dom-host.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts
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
git add src/bootstrap/home-guide-dom-host.ts src/entries/home-family-bootstrap.ts src/entries/play-runtime-scripts.ts src/entries/home-family-shared.ts scripts/entry-manifest-audit.mjs tests/unit/bootstrap-home-guide-dom-host.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts docs/ARCHITECTURE_GUARDRAILS.md docs/ROADMAP_MILESTONES.md docs/superpowers/plans/2026-06-14-home-guide-dom-host-runtime-boundary.md
git commit -m "refactor: install home guide dom host runtime from ts"
```

- [ ] **Step 5: Push, open PR, wait for CI, merge**

Push branch `frontend-runtime-ts-boundary-stage1ba-home-guide-dom-host`, open a draft PR, mark ready after local gates are captured, wait for GitHub checks, then merge only after CI is green.

## Self-Review

- Spec coverage: This plan moves one active legacy runtime out of play/home manifests while preserving the DOM contract needed by the remaining legacy step-view runtime.
- Placeholder scan: No placeholder steps remain; each task has concrete files, commands, and expected outcomes.
- Type consistency: Runtime names use `HomeGuideDomHostRuntime`, `CoreHomeGuideDomHostRuntime`, and `installHomeGuideDomHostRuntime` consistently across tests, implementation, bootstrap, and docs.
