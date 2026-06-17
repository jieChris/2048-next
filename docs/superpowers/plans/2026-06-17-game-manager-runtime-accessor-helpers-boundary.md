# Game Manager Runtime Accessor Helpers Boundary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the legacy game-manager runtime accessor registration globals from `js/core_game_manager_runtime_accessor_helpers_runtime.js` into a tested TypeScript boundary and install them before active legacy game-manager scripts load.

**Architecture:** Add `src/core/game-manager-runtime-accessor-helpers.ts` as the TypeScript owner for runtime object detection and `GameManager.prototype` getter/resolver/caller registration. The exported functions keep the legacy argument shape and accept optional injection for tests. Add `src/bootstrap/game-manager-runtime-accessor-helpers-runtime.ts` to install the same legacy global names; this stage intentionally keeps `core_game_manager_runtime_accessor_helpers_runtime.js` in active manifests, `HOME_STANDARD_STARTUP_FILES`, and `public/js/legacy_index_nomodule_loader.js` for later retirement.

**Tech Stack:** TypeScript, Vitest, Playwright smoke, existing game-manager helper installer pattern.

---

### Task 1: RED Core Runtime Accessor Helper Coverage

**Files:**
- Create: `tests/unit/core-game-manager-runtime-accessor-helpers.spec.ts`
- Create: `src/core/game-manager-runtime-accessor-helpers.ts`

- [x] **Step 1: Add failing core helper tests**

Create tests covering:
- `isRuntimeAccessorObject(value)` accepts objects and rejects null/functions/primitives.
- `registerCoreRuntimeGetter(methodName, runtimeName, options)` installs a prototype getter that returns `this.getWindowLike()[runtimeName]` only when window and runtime are objects.
- `registerCoreRuntimeMethodResolver(methodName, runtimeGetterName, options)` installs a resolver that returns a bound runtime method wrapper only for valid names, runtime getter functions, runtime objects, and runtime methods.
- `registerCoreRuntimeCaller(methodName, resolverMethodName, options)` installs a caller that returns `{ available: true, value }` for resolved runtime methods and uses the unavailable-result factory when the resolver or method is missing.
- `registerCoreRuntimeAccessors(accessorDefs, options)` ignores invalid definitions and registers getter/resolver/caller triples for valid four-item definitions.

- [x] **Step 2: Run RED**

Run:

```bash
npx vitest run tests/unit/core-game-manager-runtime-accessor-helpers.spec.ts
```

Expected: FAIL because `src/core/game-manager-runtime-accessor-helpers.ts` does not yet export the helpers.

Actual: FAIL because the imported helper names were not functions while `src/core/game-manager-runtime-accessor-helpers.ts` only exported an empty module.

### Task 2: GREEN Core Runtime Accessor Helper Boundary

**Files:**
- Modify: `src/core/game-manager-runtime-accessor-helpers.ts`

- [x] **Step 1: Implement TypeScript helpers**

Port the legacy behavior from `js/core_game_manager_runtime_accessor_helpers_runtime.js`:
- `registerCoreRuntimeMethodResolver`
- `isRuntimeAccessorObject`
- `registerCoreRuntimeGetter`
- `registerCoreRuntimeCaller`
- `registerCoreRuntimeAccessors`

Use an optional third argument object for registration helpers:
- `gameManagerPrototype?: Record<PropertyKey, unknown> | null`
- `createUnavailableCoreCallResult?: () => unknown`

When no prototype is injected, resolve `globalThis.GameManager.prototype`. When no unavailable-result factory is injected, resolve `globalThis.createUnavailableCoreCallResult`, then fall back to `{ available: false, value: null }`.

- [x] **Step 2: Run GREEN**

Run:

```bash
npx vitest run tests/unit/core-game-manager-runtime-accessor-helpers.spec.ts
```

Expected: PASS.

Actual: PASS, 5 tests after correcting the test manager to inherit the injected prototype like a real `GameManager` instance.

### Task 3: RED/GREEN Runtime Installer

**Files:**
- Create: `src/bootstrap/game-manager-runtime-accessor-helpers-runtime.ts`
- Create: `tests/unit/bootstrap-game-manager-runtime-accessor-helpers-runtime.spec.ts`
- Modify: `src/entries/home-family-bootstrap.ts`

- [x] **Step 1: Add failing installer tests**

Create installer tests asserting runtime shape, missing-function installation, existing-function preservation, and null target handling.

- [x] **Step 2: Run installer RED**

Run:

```bash
npx vitest run tests/unit/bootstrap-game-manager-runtime-accessor-helpers-runtime.spec.ts
```

Expected: FAIL because the installer does not exist yet.

Actual: FAIL because `../../src/bootstrap/game-manager-runtime-accessor-helpers-runtime` could not be resolved.

- [x] **Step 3: Implement installer and bootstrap wiring**

Add `src/bootstrap/game-manager-runtime-accessor-helpers-runtime.ts` following the runtime-call helper installer pattern. Import and call `installGameManagerRuntimeAccessorHelpersRuntime()` in `src/entries/home-family-bootstrap.ts` immediately after `installGameManagerRuntimeCallHelpersRuntime()`.

- [x] **Step 4: Run installer GREEN**

Run:

```bash
npx vitest run tests/unit/bootstrap-game-manager-runtime-accessor-helpers-runtime.spec.ts tests/unit/core-game-manager-runtime-accessor-helpers.spec.ts
```

Expected: PASS.

Actual: PASS, 9 tests across the core and installer specs.

### Task 4: Documentation And Verification

**Files:**
- Modify: `docs/ARCHITECTURE_GUARDRAILS.md`
- Modify: `docs/ROADMAP_MILESTONES.md`
- Modify: `docs/superpowers/plans/2026-06-17-game-manager-runtime-accessor-helpers-boundary.md`

- [x] **Step 1: Document Stage-1DG**

Document that TypeScript now owns game-manager runtime accessor helpers and installs their legacy global names before active game-manager scripts load. Note that active manifest, Vite bundle, legacy JS file, and nomodule references remain intentionally in place for later retirement stages.

- [x] **Step 2: Run full verification**

Run:

```bash
npx vitest run tests/unit/bootstrap-game-manager-runtime-accessor-helpers-runtime.spec.ts tests/unit/core-game-manager-runtime-accessor-helpers.spec.ts
npm run audit:entry-manifest
npm run audit:game-manager
npm run audit:service-boundary
npm run audit:page-legacy-runtime-boundary
npm run build
PW_WEB_PORT=4326 npm run test:smoke:index-ui
npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts
npm run verify:prepush
```

Expected: all commands exit 0.

Actual: all commands exited 0. During verification, the default-port `verify:prepush` run first hit a Playwright/Vite state issue in `pages-online-submit-timeout-retry.smoke.spec.ts`; the same smoke passed on a fresh port, and `PW_WEB_PORT=4332 npm run verify:prepush` passed all refactor gates.

Verification evidence:
- `npx vitest run tests/unit/bootstrap-game-manager-runtime-accessor-helpers-runtime.spec.ts tests/unit/core-game-manager-runtime-accessor-helpers.spec.ts`: PASS, 9 tests.
- `npm run audit:entry-manifest`: PASS.
- `npm run audit:game-manager`: PASS.
- `npm run audit:service-boundary`: PASS, `violations=0`.
- `npm run audit:page-legacy-runtime-boundary`: PASS, `legacyImports=0`.
- `npm run build`: PASS.
- `PW_WEB_PORT=4326 npm run test:smoke:index-ui`: PASS, 9 tests.
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`: PASS, 8 tests.
- `PW_WEB_PORT=4331 npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-online-submit-timeout-retry.smoke.spec.ts`: PASS, 1 test.
- `PW_WEB_PORT=4332 npm run verify:prepush`: PASS, all refactor gates passed.

### Task 5: Commit And PR

**Files:**
- Commit all files modified in this plan.

- [x] **Step 1: Commit**

Run:

```bash
git status --short
git add src/core/game-manager-runtime-accessor-helpers.ts src/bootstrap/game-manager-runtime-accessor-helpers-runtime.ts src/entries/home-family-bootstrap.ts tests/unit/core-game-manager-runtime-accessor-helpers.spec.ts tests/unit/bootstrap-game-manager-runtime-accessor-helpers-runtime.spec.ts docs/ARCHITECTURE_GUARDRAILS.md docs/ROADMAP_MILESTONES.md docs/superpowers/plans/2026-06-17-game-manager-runtime-accessor-helpers-boundary.md
git commit -m "refactor: add game manager runtime accessor helpers boundary"
```

Expected: commit succeeds on `frontend-runtime-boundary-stage1dg-runtime-accessor-helpers`.

Actual: commit `a713445` created with message `refactor: add game manager runtime accessor helpers boundary`.
