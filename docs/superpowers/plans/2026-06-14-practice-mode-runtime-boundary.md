# Practice Mode Runtime Boundary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retire `js/core_practice_mode_runtime.js` from active play/home runtime manifests by installing `CorePracticeModeRuntime` from the tested TypeScript bootstrap boundary.

**Architecture:** `src/bootstrap/practice-mode.ts` already owns practice query parsing and practice-mode config construction. This phase adds the legacy global runtime shape, installs it during home-family bootstrap before legacy scripts load, and blocks the retired script from active manifests through `entry-manifest-audit`.

**Tech Stack:** TypeScript bootstrap modules, Vitest unit tests, Vite URL manifests, Playwright smoke tests, existing manifest audit scripts.

---

### Task 1: Add RED Tests for Installer and Retired Registry

**Files:**
- Modify: `tests/unit/bootstrap-practice-mode.spec.ts`
- Modify: `tests/unit/entry-manifest-audit-helpers.spec.ts`

- [x] **Step 1: Add failing installer assertions**

Update `tests/unit/bootstrap-practice-mode.spec.ts` imports:

```ts
import {
  buildPracticeModeConfigFromSelection,
  buildPracticeModeConfig,
  createPracticeModeRuntime,
  installPracticeModeRuntime,
  parsePracticeModeKey,
  parsePracticeRuleset,
  type PracticeModeRuntime
} from "../../src/bootstrap/practice-mode";
```

Add these tests at the start of `describe("bootstrap practice mode", ...)`:

```ts
it("creates the legacy CorePracticeModeRuntime shape from TypeScript functions", () => {
  const runtime = createPracticeModeRuntime();

  expect(runtime.parsePracticeRuleset).toBe(parsePracticeRuleset);
  expect(runtime.parsePracticeModeKey).toBe(parsePracticeModeKey);
  expect(runtime.buildPracticeModeConfig).toBe(buildPracticeModeConfig);
  expect(runtime.buildPracticeModeConfigFromSelection).toBe(buildPracticeModeConfigFromSelection);
});

it("installs the runtime on a supplied window-like object", () => {
  const windowLike: { CorePracticeModeRuntime?: PracticeModeRuntime } = {};

  const installed = installPracticeModeRuntime({ windowLike });

  expect(installed).toBe(windowLike.CorePracticeModeRuntime);
  expect(installed?.buildPracticeModeConfig).toBeTypeOf("function");
});

it("does not overwrite an existing practice mode runtime", () => {
  const existing = createPracticeModeRuntime();
  const windowLike = { CorePracticeModeRuntime: existing };

  const installed = installPracticeModeRuntime({ windowLike });

  expect(installed).toBe(existing);
  expect(windowLike.CorePracticeModeRuntime).toBe(existing);
});

it("returns null when no window-like target is available", () => {
  expect(installPracticeModeRuntime({ windowLike: null })).toBeNull();
});
```

- [x] **Step 2: Add missing parser coverage for `parsePracticeModeKey`**

Add this behavior test because it is part of the legacy runtime shape:

```ts
it("parses practice mode key query and ignores the direct practice sentinel", () => {
  expect(parsePracticeModeKey("?practice_mode_key=capped_4x4_pow2_64_no_undo")).toBe(
    "capped_4x4_pow2_64_no_undo"
  );
  expect(parsePracticeModeKey("?practice_mode_key=practice")).toBe("");
  expect(parsePracticeModeKey("?practice_mode_key=%20%20")).toBe("");
  expect(parsePracticeModeKey("")).toBe("");
});
```

- [x] **Step 3: Add failing retired registry assertion**

Add this test after the home-mode retired registry assertion:

```ts
it("tracks practice-mode runtime as a retired active-manifest script", () => {
  expect(RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS).toContainEqual({
    scriptPath: "core_practice_mode_runtime.js",
    symbolName: "corePracticeModeRuntimeUrl"
  });
});
```

- [x] **Step 4: Run RED tests**

Run:

```bash
npx vitest run tests/unit/bootstrap-practice-mode.spec.ts
npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts
```

Expected: first command fails because installer exports do not exist; second command fails because the retired registry entry is missing.

### Task 2: Install `CorePracticeModeRuntime` from TypeScript

**Files:**
- Modify: `src/bootstrap/practice-mode.ts`
- Modify: `src/entries/home-family-bootstrap.ts`

- [x] **Step 1: Add runtime interfaces and installer**

Add to `src/bootstrap/practice-mode.ts`:

```ts
export interface PracticeModeRuntime {
  parsePracticeRuleset: typeof parsePracticeRuleset;
  parsePracticeModeKey: typeof parsePracticeModeKey;
  buildPracticeModeConfig: typeof buildPracticeModeConfig;
  buildPracticeModeConfigFromSelection: typeof buildPracticeModeConfigFromSelection;
}

export interface PracticeModeRuntimeWindowLike {
  CorePracticeModeRuntime?: PracticeModeRuntime;
}

export interface PracticeModeRuntimeInstallOptions {
  windowLike?: PracticeModeRuntimeWindowLike | null | undefined;
}

export function createPracticeModeRuntime(): PracticeModeRuntime {
  return {
    parsePracticeRuleset,
    parsePracticeModeKey,
    buildPracticeModeConfig,
    buildPracticeModeConfigFromSelection
  };
}

export function installPracticeModeRuntime(
  options: PracticeModeRuntimeInstallOptions = {}
): PracticeModeRuntime | null {
  const windowLike =
    options.windowLike ||
    (typeof window === "undefined" ? null : (window as unknown as PracticeModeRuntimeWindowLike));
  if (!windowLike) return null;
  if (!windowLike.CorePracticeModeRuntime) {
    windowLike.CorePracticeModeRuntime = createPracticeModeRuntime();
  }
  return windowLike.CorePracticeModeRuntime || null;
}
```

- [x] **Step 2: Install during home-family bootstrap**

Import and call the installer in `src/entries/home-family-bootstrap.ts` before `installHomeModeRuntime()`:

```ts
import { installPracticeModeRuntime } from "../bootstrap/practice-mode";
```

```ts
installPracticeModeRuntime();
```

- [x] **Step 3: Run GREEN installer tests**

Run:

```bash
npx vitest run tests/unit/bootstrap-practice-mode.spec.ts
```

Expected: PASS.

### Task 3: Retire the Legacy Script from Active Manifests

**Files:**
- Modify: `scripts/entry-manifest-audit.mjs`
- Modify: `src/entries/home-family-shared.ts`

- [x] **Step 1: Add retired registry entry**

Append to `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS`:

```js
{
  scriptPath: "core_practice_mode_runtime.js",
  symbolName: "corePracticeModeRuntimeUrl"
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

Expected: FAIL while `core_practice_mode_runtime.js` remains in `src/entries/home-family-shared.ts`.

- [x] **Step 4: Remove active manifest references**

Remove the `corePracticeModeRuntimeUrl` import and array entry from:

```ts
src/entries/home-family-shared.ts
```

Do not delete `js/core_practice_mode_runtime.js`.

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
- Modify: `docs/superpowers/plans/2026-06-14-practice-mode-runtime-boundary.md`

- [x] **Step 1: Update architecture guardrails**

Add a top entry recording:

```md
# Guardrail Delta (2026-06-14, Stage-1BG Practice-Mode Runtime TS Boundary)

## Batch Impact
- `CorePracticeModeRuntime` is now installed from `src/bootstrap/practice-mode.ts` before home-family legacy scripts load.
- The installer preserves the legacy runtime global shape: `parsePracticeRuleset`, `parsePracticeModeKey`, `buildPracticeModeConfig`, and `buildPracticeModeConfigFromSelection`.
- `js/core_practice_mode_runtime.js` was retired from active play/home runtime manifests without deleting the legacy file.
- `entry-manifest-audit` blocks `core_practice_mode_runtime.js` / `corePracticeModeRuntimeUrl` through `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS`.
```

- [x] **Step 2: Update roadmap**

Prepend roadmap evidence for `WS-runtime-56` / Stage 1BG with the focused and full gate commands run in this phase.

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
git add src/bootstrap/practice-mode.ts src/entries/home-family-bootstrap.ts src/entries/home-family-shared.ts scripts/entry-manifest-audit.mjs tests/unit/bootstrap-practice-mode.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts docs/ARCHITECTURE_GUARDRAILS.md docs/ROADMAP_MILESTONES.md docs/superpowers/plans/2026-06-14-practice-mode-runtime-boundary.md
git commit -m "refactor: install practice mode runtime from ts"
git push -u origin frontend-runtime-ts-boundary-stage1bg-practice-mode
```

Create a draft PR, mark ready after local gates pass, observe GitHub checks, and merge only after CI is green.

---

## Self-Review

- Spec coverage: This plan moves one active practice mode legacy runtime out of manifests while preserving the global runtime contract through TS bootstrap installation.
- Placeholder scan: No TBD/TODO/implement-later placeholders remain.
- Type consistency: Runtime names consistently use `PracticeMode` / `corePracticeModeRuntimeUrl` / `CorePracticeModeRuntime`.

## Observed Evidence

- RED: `npx vitest run tests/unit/bootstrap-practice-mode.spec.ts` failed before `createPracticeModeRuntime` / `installPracticeModeRuntime` existed.
- RED: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts` failed before `core_practice_mode_runtime.js` was listed in `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS`.
- GREEN: `npx vitest run tests/unit/bootstrap-practice-mode.spec.ts`
- GREEN: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts`
- RED: `npm run audit:entry-manifest` failed while `src/entries/home-family-shared.ts` still referenced `core_practice_mode_runtime.js` / `corePracticeModeRuntimeUrl`.
- GREEN: `npm run audit:entry-manifest`
- GREEN: `npx vitest run tests/unit/bootstrap-practice-mode.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts`
- Search guard: `rg -n "corePracticeModeRuntimeUrl|core_practice_mode_runtime\\.js" src/entries/play-runtime-scripts.ts src/entries/home-family-shared.ts src/entries/replay-runtime-scripts.ts scripts/entry-manifest-audit.mjs` now reports only `scripts/entry-manifest-audit.mjs`.
- Full gates: `npm run audit:entry-manifest`, `npm run audit:game-manager`, `npm run audit:service-boundary`, `npm run audit:page-legacy-runtime-boundary`, `npm run build`, `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`, and `npm run verify:prepush` all exited 0.
