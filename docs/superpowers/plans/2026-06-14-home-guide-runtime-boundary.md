# Home Guide Runtime Boundary Implementation Plan
> **For agentic workers:** Use Trellis/Trellies as the default project workflow. Before implementation, debugging, review, or code modification, check for and follow `.trellis/`, `.trellis/spec/`, Trellis task files, Trellis skills, and Trellis commands when available. Do not use legacy Superpower Skill instructions. If old Superpower instructions conflict with Trellis/Trellies, Trellis/Trellies wins. Steps use checkbox syntax for tracking.

**Goal:** Retire `js/core_home_guide_runtime.js` from active play/home runtime manifests by installing `CoreHomeGuideRuntime` from the tested TypeScript bootstrap boundary.

**Architecture:** `src/bootstrap/home-guide.ts` already owns the home-guide pure runtime functions used by page, lifecycle, settings, step, layout, visibility, and completion host runtimes. This phase adds the legacy global runtime shape and installs it during home-family bootstrap before legacy scripts load, then blocks the retired script from active manifests through `entry-manifest-audit`.

**Tech Stack:** TypeScript bootstrap modules, Vitest unit tests, Vite URL manifests, Playwright smoke tests, existing manifest audit scripts.

---

### Task 1: Add RED Tests for the TS Runtime Installer and Retired Manifest Registry

**Files:**
- Modify: `tests/unit/bootstrap-home-guide.spec.ts`
- Modify: `tests/unit/entry-manifest-audit-helpers.spec.ts`

- [x] **Step 1: Add failing installer assertions**

Add imports for `createHomeGuideRuntime`, `installHomeGuideRuntime`, and `HomeGuideRuntime`, then add these tests near the top of `describe("bootstrap home guide", ...)`:

```ts
it("creates the legacy CoreHomeGuideRuntime shape from TypeScript functions", () => {
  const runtime = createHomeGuideRuntime();

  expect(runtime.resolveHomeGuidePathname).toBe(resolveHomeGuidePathname);
  expect(runtime.isHomePagePath).toBe(isHomePagePath);
  expect(runtime.buildHomeGuideSteps).toBe(buildHomeGuideSteps);
  expect(runtime.buildHomeGuidePanelInnerHtml).toBe(buildHomeGuidePanelInnerHtml);
  expect(runtime.buildHomeGuideSettingsRowInnerHtml).toBe(buildHomeGuideSettingsRowInnerHtml);
  expect(runtime.readHomeGuideSeenValue).toBe(readHomeGuideSeenValue);
  expect(runtime.markHomeGuideSeen).toBe(markHomeGuideSeen);
  expect(runtime.shouldAutoStartHomeGuide).toBe(shouldAutoStartHomeGuide);
  expect(runtime.resolveHomeGuideAutoStart).toBe(resolveHomeGuideAutoStart);
  expect(runtime.resolveHomeGuideSettingsState).toBe(resolveHomeGuideSettingsState);
  expect(runtime.resolveHomeGuideStepUiState).toBe(resolveHomeGuideStepUiState);
  expect(runtime.resolveHomeGuideStepRenderState).toBe(resolveHomeGuideStepRenderState);
  expect(runtime.resolveHomeGuideStepIndexState).toBe(resolveHomeGuideStepIndexState);
  expect(runtime.resolveHomeGuideStepTargetState).toBe(resolveHomeGuideStepTargetState);
  expect(runtime.resolveHomeGuideElevationPlan).toBe(resolveHomeGuideElevationPlan);
  expect(runtime.resolveHomeGuideBindingState).toBe(resolveHomeGuideBindingState);
  expect(runtime.resolveHomeGuideControlAction).toBe(resolveHomeGuideControlAction);
  expect(runtime.resolveHomeGuideToggleAction).toBe(resolveHomeGuideToggleAction);
  expect(runtime.resolveHomeGuideLifecycleState).toBe(resolveHomeGuideLifecycleState);
  expect(runtime.resolveHomeGuideSessionState).toBe(resolveHomeGuideSessionState);
  expect(runtime.resolveHomeGuideLayerDisplayState).toBe(resolveHomeGuideLayerDisplayState);
  expect(runtime.resolveHomeGuideFinishState).toBe(resolveHomeGuideFinishState);
  expect(runtime.resolveHomeGuideTargetScrollState).toBe(resolveHomeGuideTargetScrollState);
  expect(runtime.resolveHomeGuideDoneNotice).toBe(resolveHomeGuideDoneNotice);
  expect(runtime.resolveHomeGuideDoneNoticeStyle).toBe(resolveHomeGuideDoneNoticeStyle);
  expect(runtime.resolveHomeGuidePanelLayout).toBe(resolveHomeGuidePanelLayout);
  expect(runtime.isHomeGuideTargetVisible).toBe(isHomeGuideTargetVisible);
});

it("installs the runtime on a supplied window-like object", () => {
  const windowLike: { CoreHomeGuideRuntime?: HomeGuideRuntime } = {};

  const installed = installHomeGuideRuntime({ windowLike });

  expect(installed).toBe(windowLike.CoreHomeGuideRuntime);
  expect(installed?.buildHomeGuideSteps).toBeTypeOf("function");
  expect(installed?.resolveHomeGuidePanelLayout).toBeTypeOf("function");
  expect(installed?.isHomeGuideTargetVisible).toBeTypeOf("function");
});

it("does not overwrite an existing home guide runtime", () => {
  const existing = createHomeGuideRuntime();
  const windowLike = { CoreHomeGuideRuntime: existing };

  const installed = installHomeGuideRuntime({ windowLike });

  expect(installed).toBe(existing);
  expect(windowLike.CoreHomeGuideRuntime).toBe(existing);
});

it("returns null when no window-like target is available", () => {
  expect(installHomeGuideRuntime({ windowLike: null })).toBeNull();
});
```

- [x] **Step 2: Add failing retired registry assertion**

Add this test after the home-guide-page-host retired registry assertion:

```ts
it("tracks home-guide runtime as a retired active-manifest script", () => {
  expect(RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS).toContainEqual({
    scriptPath: "core_home_guide_runtime.js",
    symbolName: "coreHomeGuideRuntimeUrl"
  });
});
```

- [x] **Step 3: Run RED tests**

Run:

```bash
npx vitest run tests/unit/bootstrap-home-guide.spec.ts
npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts
```

Expected: first command fails because the installer exports do not exist; second command fails because the retired registry entry is missing.

### Task 2: Install `CoreHomeGuideRuntime` from TypeScript

**Files:**
- Modify: `src/bootstrap/home-guide.ts`
- Modify: `src/entries/home-family-bootstrap.ts`

- [x] **Step 1: Add runtime interfaces and installer**

Add the legacy runtime shape to `src/bootstrap/home-guide.ts`:

```ts
export interface HomeGuideRuntime {
  resolveHomeGuidePathname: typeof resolveHomeGuidePathname;
  isHomePagePath: typeof isHomePagePath;
  buildHomeGuideSteps: typeof buildHomeGuideSteps;
  buildHomeGuidePanelInnerHtml: typeof buildHomeGuidePanelInnerHtml;
  buildHomeGuideSettingsRowInnerHtml: typeof buildHomeGuideSettingsRowInnerHtml;
  readHomeGuideSeenValue: typeof readHomeGuideSeenValue;
  markHomeGuideSeen: typeof markHomeGuideSeen;
  shouldAutoStartHomeGuide: typeof shouldAutoStartHomeGuide;
  resolveHomeGuideAutoStart: typeof resolveHomeGuideAutoStart;
  resolveHomeGuideSettingsState: typeof resolveHomeGuideSettingsState;
  resolveHomeGuideStepUiState: typeof resolveHomeGuideStepUiState;
  resolveHomeGuideStepRenderState: typeof resolveHomeGuideStepRenderState;
  resolveHomeGuideStepIndexState: typeof resolveHomeGuideStepIndexState;
  resolveHomeGuideStepTargetState: typeof resolveHomeGuideStepTargetState;
  resolveHomeGuideElevationPlan: typeof resolveHomeGuideElevationPlan;
  resolveHomeGuideBindingState: typeof resolveHomeGuideBindingState;
  resolveHomeGuideControlAction: typeof resolveHomeGuideControlAction;
  resolveHomeGuideToggleAction: typeof resolveHomeGuideToggleAction;
  resolveHomeGuideLifecycleState: typeof resolveHomeGuideLifecycleState;
  resolveHomeGuideSessionState: typeof resolveHomeGuideSessionState;
  resolveHomeGuideLayerDisplayState: typeof resolveHomeGuideLayerDisplayState;
  resolveHomeGuideFinishState: typeof resolveHomeGuideFinishState;
  resolveHomeGuideTargetScrollState: typeof resolveHomeGuideTargetScrollState;
  resolveHomeGuideDoneNotice: typeof resolveHomeGuideDoneNotice;
  resolveHomeGuideDoneNoticeStyle: typeof resolveHomeGuideDoneNoticeStyle;
  resolveHomeGuidePanelLayout: typeof resolveHomeGuidePanelLayout;
  isHomeGuideTargetVisible: typeof isHomeGuideTargetVisible;
}

export interface HomeGuideRuntimeWindowLike {
  CoreHomeGuideRuntime?: HomeGuideRuntime;
}

export interface HomeGuideRuntimeInstallOptions {
  windowLike?: HomeGuideRuntimeWindowLike | null | undefined;
}
```

Add the installer near the bottom of `src/bootstrap/home-guide.ts` before the legacy-only settings row export:

```ts
export function createHomeGuideRuntime(): HomeGuideRuntime {
  return {
    resolveHomeGuidePathname,
    isHomePagePath,
    buildHomeGuideSteps,
    buildHomeGuidePanelInnerHtml,
    buildHomeGuideSettingsRowInnerHtml,
    readHomeGuideSeenValue,
    markHomeGuideSeen,
    shouldAutoStartHomeGuide,
    resolveHomeGuideAutoStart,
    resolveHomeGuideSettingsState,
    resolveHomeGuideStepUiState,
    resolveHomeGuideStepRenderState,
    resolveHomeGuideStepIndexState,
    resolveHomeGuideStepTargetState,
    resolveHomeGuideElevationPlan,
    resolveHomeGuideBindingState,
    resolveHomeGuideControlAction,
    resolveHomeGuideToggleAction,
    resolveHomeGuideLifecycleState,
    resolveHomeGuideSessionState,
    resolveHomeGuideLayerDisplayState,
    resolveHomeGuideFinishState,
    resolveHomeGuideTargetScrollState,
    resolveHomeGuideDoneNotice,
    resolveHomeGuideDoneNoticeStyle,
    resolveHomeGuidePanelLayout,
    isHomeGuideTargetVisible
  };
}

export function installHomeGuideRuntime(
  options: HomeGuideRuntimeInstallOptions = {}
): HomeGuideRuntime | null {
  const windowLike =
    options.windowLike ||
    (typeof window === "undefined" ? null : (window as unknown as HomeGuideRuntimeWindowLike));
  if (!windowLike) return null;
  if (!windowLike.CoreHomeGuideRuntime) {
    windowLike.CoreHomeGuideRuntime = createHomeGuideRuntime();
  }
  return windowLike.CoreHomeGuideRuntime || null;
}
```

- [x] **Step 2: Install during home-family bootstrap**

Import and call the installer in `src/entries/home-family-bootstrap.ts`:

```ts
import { installHomeGuideRuntime } from "../bootstrap/home-guide";
```

```ts
installHomeGuideRuntime();
```

- [x] **Step 3: Run GREEN installer tests**

Run:

```bash
npx vitest run tests/unit/bootstrap-home-guide.spec.ts
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
  scriptPath: "core_home_guide_runtime.js",
  symbolName: "coreHomeGuideRuntimeUrl"
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

Expected: FAIL while `core_home_guide_runtime.js` remains in `src/entries/play-runtime-scripts.ts` and `src/entries/home-family-shared.ts`.

- [x] **Step 4: Remove active manifest references**

Remove `coreHomeGuideRuntimeUrl` imports and array entries from:

```ts
src/entries/play-runtime-scripts.ts
src/entries/home-family-shared.ts
```

Do not delete `js/core_home_guide_runtime.js`.

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

Prepend a Stage-1AZ section documenting:
- `CoreHomeGuideRuntime` is installed from `src/bootstrap/home-guide.ts`.
- `src/bootstrap/home-guide.ts` owns home-guide pure runtime functions for path resolution, steps, settings state, lifecycle state, panels, visibility, and completion notices.
- Legacy runtime global shape is preserved.
- `js/core_home_guide_runtime.js` is retired from active manifests without deletion.
- `entry-manifest-audit` blocks the retired script and symbol.

- [x] **Step 2: Prepend roadmap milestone**

Prepend a Stage-1AZ section with `WS-runtime-49`, `status: done`, and evidence commands.

### Task 5: Full Verification, Commit, PR, and CI

**Files:**
- Verify all modified files.

- [x] **Step 1: Run focused GREEN tests**

```bash
npx vitest run tests/unit/bootstrap-home-guide.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts
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
git add src/bootstrap/home-guide.ts src/entries/home-family-bootstrap.ts src/entries/play-runtime-scripts.ts src/entries/home-family-shared.ts scripts/entry-manifest-audit.mjs tests/unit/bootstrap-home-guide.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts docs/ARCHITECTURE_GUARDRAILS.md docs/ROADMAP_MILESTONES.md docs/superpowers/plans/2026-06-14-home-guide-runtime-boundary.md
git commit -m "refactor: install home guide runtime from ts"
```

- [ ] **Step 5: Push, open PR, wait for CI, merge**

Push branch `frontend-runtime-ts-boundary-stage1az-home-guide-runtime`, open a draft PR, mark ready after local gates are captured, wait for GitHub checks, then merge only after CI is green.

## Self-Review

- Spec coverage: This plan moves one active legacy runtime out of play/home manifests while preserving the global runtime contract through TS bootstrap installation.
- Placeholder scan: No placeholder steps remain; each task has concrete files, commands, and expected outcomes.
- Type consistency: Runtime names use `HomeGuideRuntime`, `CoreHomeGuideRuntime`, and `installHomeGuideRuntime` consistently across tests, implementation, bootstrap, and docs.
