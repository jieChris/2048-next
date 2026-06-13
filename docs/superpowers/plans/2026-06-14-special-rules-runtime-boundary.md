# Special Rules Runtime Boundary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Install the legacy `CoreSpecialRulesRuntime` global from tested TypeScript and retire `js/core_special_rules_runtime.js` from active home/play/replay/capped runtime manifests without deleting the legacy file.

**Architecture:** Extend `src/core/special-rules.ts` with a non-overwriting runtime installer that exposes the current legacy global shape. `src/entries/home-family-bootstrap.ts` installs it before legacy scripts load, after the shared low-level runtimes and before game-manager mode-rule helpers can call `callCoreSpecialRulesRuntime`.

**Tech Stack:** TypeScript, Vitest, Vite URL runtime manifests, Playwright smoke, existing `entry-manifest-audit`.

---

### Task 1: TypeScript Runtime Shape

**Files:**
- Modify: `src/core/special-rules.ts`
- Modify: `tests/unit/core-special-rules.spec.ts`

- [x] **Step 1: Write the failing runtime installer test**

Add tests that import `createSpecialRulesRuntime`, `installSpecialRulesRuntime`, and `type SpecialRulesRuntime`:

```ts
import {
  computeSpecialRulesState,
  createSpecialRulesRuntime,
  installSpecialRulesRuntime,
  type SpecialRulesRuntime
} from "../../src/core/special-rules";

describe("core special rules runtime installer", () => {
  it("creates the legacy CoreSpecialRulesRuntime shape from TypeScript functions", () => {
    const runtime = createSpecialRulesRuntime();

    expect(runtime.computeSpecialRulesState).toBe(computeSpecialRulesState);
  });

  it("installs the runtime on a supplied window-like object", () => {
    const windowLike: { CoreSpecialRulesRuntime?: SpecialRulesRuntime } = {};

    const installed = installSpecialRulesRuntime({ windowLike });

    expect(installed).toBe(windowLike.CoreSpecialRulesRuntime);
    expect(installed?.computeSpecialRulesState).toBeTypeOf("function");
  });

  it("does not overwrite an existing special rules runtime", () => {
    const existing = createSpecialRulesRuntime();
    const windowLike = { CoreSpecialRulesRuntime: existing };

    const installed = installSpecialRulesRuntime({ windowLike });

    expect(installed).toBe(existing);
    expect(windowLike.CoreSpecialRulesRuntime).toBe(existing);
  });

  it("returns null when no window-like target is available", () => {
    expect(installSpecialRulesRuntime({ windowLike: null })).toBeNull();
  });
});
```

- [x] **Step 2: Verify RED**

Run:

```bash
npx vitest run tests/unit/core-special-rules.spec.ts
```

Expected: FAIL because `createSpecialRulesRuntime` and `installSpecialRulesRuntime` are not exported yet.

- [x] **Step 3: Implement the runtime shape**

Add `SpecialRulesRuntime`, `SpecialRulesRuntimeWindowLike`, `SpecialRulesRuntimeInstallOptions`, `createSpecialRulesRuntime`, and `installSpecialRulesRuntime` to `src/core/special-rules.ts`. The runtime object should expose only `computeSpecialRulesState`, matching `js/core_special_rules_runtime.js`.

- [x] **Step 4: Verify GREEN**

Run:

```bash
npx vitest run tests/unit/core-special-rules.spec.ts
```

Expected: PASS.

### Task 2: Manifest Retirement

**Files:**
- Modify: `src/entries/home-family-bootstrap.ts`
- Modify: `src/entries/home-family-shared.ts`
- Modify: `src/entries/play-runtime-scripts.ts`
- Modify: `src/entries/replay-runtime-scripts.ts`
- Modify: `scripts/entry-manifest-audit.mjs`
- Modify: `tests/unit/entry-manifest-audit-helpers.spec.ts`

- [x] **Step 1: Write the failing manifest audit test**

Add an assertion requiring:

```ts
expect(RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS).toContainEqual({
  scriptPath: "core_special_rules_runtime.js",
  symbolName: "coreSpecialRulesRuntimeUrl"
});
```

- [x] **Step 2: Verify RED**

Run:

```bash
npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts
```

Expected: FAIL because the retired runtime registry does not include `core_special_rules_runtime.js`.

- [x] **Step 3: Install and retire**

Import and call `installSpecialRulesRuntime()` in `src/entries/home-family-bootstrap.ts` before legacy runtime scripts are loaded. Remove `coreSpecialRulesRuntimeUrl` imports and array entries from `home-family-shared.ts`, `play-runtime-scripts.ts`, and `replay-runtime-scripts.ts`. Add the retired registry entry in `scripts/entry-manifest-audit.mjs`.

- [x] **Step 4: Verify GREEN**

Run:

```bash
npx vitest run tests/unit/core-special-rules.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts
npm run audit:entry-manifest
```

Expected: both Vitest files pass and the manifest audit reports no active `core_special_rules_runtime.js` references.

### Task 3: Documentation And Gates

**Files:**
- Modify: `docs/ARCHITECTURE_GUARDRAILS.md`
- Modify: `docs/ROADMAP_MILESTONES.md`
- Modify: `docs/superpowers/plans/2026-06-14-special-rules-runtime-boundary.md`

- [x] **Step 1: Update docs with Stage-1BL evidence**

Add Stage-1BL entries that state `CoreSpecialRulesRuntime` is installed from `src/core/special-rules.ts`, active manifests no longer reference `js/core_special_rules_runtime.js`, and the legacy file remains in place.

- [x] **Step 2: Run focused verification**

Run:

```bash
npx vitest run tests/unit/core-special-rules.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts
npm run audit:entry-manifest
npm run audit:game-manager
npm run audit:service-boundary
npm run audit:page-legacy-runtime-boundary
npm run build
npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts
```

Expected: all commands pass.

- [x] **Step 3: Run full prepush gate**

Run:

```bash
npm run verify:prepush
```

Expected: all refactor gates, smoke, and build pass.

- [ ] **Step 4: Commit, push, PR**

Run:

```bash
git add src/core/special-rules.ts src/entries/home-family-bootstrap.ts src/entries/home-family-shared.ts src/entries/play-runtime-scripts.ts src/entries/replay-runtime-scripts.ts scripts/entry-manifest-audit.mjs tests/unit/core-special-rules.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts docs/ARCHITECTURE_GUARDRAILS.md docs/ROADMAP_MILESTONES.md docs/superpowers/plans/2026-06-14-special-rules-runtime-boundary.md
git commit -m "refactor: install special rules runtime from ts"
git push -u origin frontend-runtime-ts-boundary-stage1bl-special-rules
gh pr create --title "refactor: install special rules runtime from ts" --body "<summary and test plan>"
```

Expected: PR opens against `main`; GitHub checks pass before merge.
