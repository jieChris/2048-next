# Base Helpers TypeScript Boundary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the low-level core game-manager base helper functions behind a tested TypeScript boundary while preserving the existing legacy runtime script references for a later manifest and bundle retirement stage.

**Architecture:** `src/core/game-manager-base-helpers.ts` owns the pure call-resolution, normalization, cloning, own-key, and option-reading helpers that are currently defined at the top of `js/core_game_manager_base_helpers_runtime.js`. `src/bootstrap/game-manager-base-helpers-runtime.ts` installs those helper names onto the legacy global object before home/play/replay/capped scripts load, so existing JavaScript game-manager helpers can keep calling the same globals while ownership moves into testable TypeScript. This stage intentionally leaves `core_game_manager_base_helpers_runtime.js` in active manifests and the Vite home startup bundle.

**Tech Stack:** TypeScript, Vitest, Vite bootstrap, existing refactor audits, Playwright smoke.

---

### Task 1: Core Base Helper Boundary

**Files:**
- Create: `src/core/game-manager-base-helpers.ts`
- Create: `tests/unit/core-game-manager-base-helpers.spec.ts`

- [x] **Step 1: Write the failing core helper tests**

Create `tests/unit/core-game-manager-base-helpers.spec.ts` with tests for:
- `isCoreCallAvailable` only accepts `{ available: true }`.
- `resolveCoreObjectCallOrFallback`, `resolveCoreBooleanCallOrFallback`, `resolveCoreNumericCallOrFallback`, and `resolveCoreStringCallOrFallback` preserve legacy fallback and coercion behavior.
- `resolveNormalizedCoreValueOrUndefined`, `resolveNormalizedCoreValueOrFallback`, and `resolveNormalizedCoreValueOrFallbackAllowNull` call normalizers/fallbacks with the manager as `this`.
- `resolveCoreRawCallValueOrUndefined` and `tryHandleCoreRawValue` preserve unavailable and handler behavior.
- `isNonArrayObject`, `createUnavailableCoreCallResult`, `clonePlain`, `safeClonePlain`, `hasOwnKey`, and `readOptionValue` match legacy edge cases.

Run:

```bash
npx vitest run tests/unit/core-game-manager-base-helpers.spec.ts
```

Expected: FAIL because `src/core/game-manager-base-helpers.ts` does not exist.

- [x] **Step 2: Implement the TypeScript helpers**

Create `src/core/game-manager-base-helpers.ts` exporting:
- `isCoreCallAvailable(coreCallResult: unknown): boolean`
- `resolveCoreObjectCallOrFallback(manager, coreCallResult, fallbackResolver)`
- `resolveCoreBooleanCallOrFallback(manager, coreCallResult, fallbackResolver)`
- `resolveCoreNumericCallOrFallback(manager, coreCallResult, fallbackResolver)`
- `resolveCoreStringCallOrFallback(manager, coreCallResult, fallbackResolver, allowEmpty?)`
- `resolveNormalizedCoreValueOrUndefined(manager, coreCallResult, normalizer)`
- `resolveNormalizedCoreValueOrFallback(manager, coreCallResult, normalizer, fallbackResolver)`
- `resolveNormalizedCoreValueOrFallbackAllowNull(manager, coreCallResult, normalizer, fallbackResolver)`
- `resolveCoreRawCallValueOrUndefined(manager, coreCallResult)`
- `tryHandleCoreRawValue(manager, coreCallResult, handler)`
- `isNonArrayObject(value: unknown): boolean`
- `createUnavailableCoreCallResult()`
- `clonePlain<T>(value: T): T`
- `safeClonePlain(manager, value, fallback)`
- `hasOwnKey(target, key)`
- `readOptionValue(manager, options, key, fallbackValue)`

Implementation rules:
- Preserve legacy return values for nullish managers.
- Preserve legacy `Number(value) || 0`, string empty handling, `JSON.parse(JSON.stringify(value))`, and fallback invocation semantics.
- Do not migrate secondary timer helpers in this stage.

- [x] **Step 3: Verify GREEN**

Run:

```bash
npx vitest run tests/unit/core-game-manager-base-helpers.spec.ts
```

Expected: PASS.

### Task 2: Bootstrap Legacy Global Installer

**Files:**
- Create: `src/bootstrap/game-manager-base-helpers-runtime.ts`
- Create: `tests/unit/bootstrap-game-manager-base-helpers-runtime.spec.ts`
- Modify: `src/entries/home-family-bootstrap.ts`

- [x] **Step 1: Write the failing bootstrap installer tests**

Create `tests/unit/bootstrap-game-manager-base-helpers-runtime.spec.ts` with tests that:
- `createGameManagerBaseHelpersRuntime()` exposes every migrated core helper function.
- `installGameManagerBaseHelpersRuntime({ windowLike })` installs all missing legacy global function names.
- installer does not overwrite existing function properties.
- installer returns null when no window-like target is available.

Run:

```bash
npx vitest run tests/unit/bootstrap-game-manager-base-helpers-runtime.spec.ts
```

Expected: FAIL because the bootstrap installer does not exist.

- [x] **Step 2: Implement the bootstrap installer**

Create `src/bootstrap/game-manager-base-helpers-runtime.ts` exporting:
- `GameManagerBaseHelpersRuntime`
- `GameManagerBaseHelpersRuntimeWindowLike`
- `createGameManagerBaseHelpersRuntime()`
- `installGameManagerBaseHelpersRuntime(options?: GameManagerBaseHelpersRuntimeInstallOptions): GameManagerBaseHelpersRuntime | null`

Installer rule: fill missing legacy global function properties individually, preserve existing function properties, and return the effective function table.

- [x] **Step 3: Install before legacy scripts load**

Modify `src/entries/home-family-bootstrap.ts`:
- import `installGameManagerBaseHelpersRuntime`
- call it after `installGameManagerClientRecordIdRuntime()` and before legacy runtime scripts are loaded.

Do not remove `core_game_manager_base_helpers_runtime.js` from `vite.config.ts`, `src/entries/home-family-shared.ts`, `src/entries/play-runtime-scripts.ts`, or `src/entries/replay-runtime-scripts.ts` in this stage.

- [x] **Step 4: Verify GREEN**

Run:

```bash
npx vitest run tests/unit/core-game-manager-base-helpers.spec.ts tests/unit/bootstrap-game-manager-base-helpers-runtime.spec.ts tests/unit/core-game-manager-base-helpers-runtime.spec.ts
npm run audit:entry-manifest
```

Expected: PASS.

### Task 3: Documentation, Gates, PR

**Files:**
- Modify: `docs/ARCHITECTURE_GUARDRAILS.md`
- Modify: `docs/ROADMAP_MILESTONES.md`
- Modify: `docs/superpowers/plans/2026-06-16-base-helpers-ts-boundary.md`

- [x] **Step 1: Update docs with Stage-1CZ evidence**

Add Stage-1CZ entries stating:
- `src/core/game-manager-base-helpers.ts` owns the migrated low-level core base helper functions.
- `src/bootstrap/game-manager-base-helpers-runtime.ts` installs legacy global function names before home/play/replay/capped legacy scripts load.
- active manifest and Vite bundle references to `js/core_game_manager_base_helpers_runtime.js` remain intentionally for later retirement stages.

- [x] **Step 2: Run focused verification**

Run:

```bash
npx vitest run tests/unit/core-game-manager-base-helpers.spec.ts tests/unit/bootstrap-game-manager-base-helpers-runtime.spec.ts tests/unit/core-game-manager-base-helpers-runtime.spec.ts
npm run audit:entry-manifest
npm run audit:game-manager
npm run audit:service-boundary
npm run audit:page-legacy-runtime-boundary
npm run build
PW_WEB_PORT=4316 npm run test:smoke:index-ui
npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts
```

Expected: all commands pass.

- [x] **Step 3: Run full prepush gate**

Run:

```bash
npm run verify:prepush
```

Expected: all gates pass.

- [x] **Step 4: Commit, push, PR**

Run:

```bash
git add src/core/game-manager-base-helpers.ts src/bootstrap/game-manager-base-helpers-runtime.ts src/entries/home-family-bootstrap.ts tests/unit/core-game-manager-base-helpers.spec.ts tests/unit/bootstrap-game-manager-base-helpers-runtime.spec.ts docs/ARCHITECTURE_GUARDRAILS.md docs/ROADMAP_MILESTONES.md docs/superpowers/plans/2026-06-16-base-helpers-ts-boundary.md
git commit -m "refactor: add game manager base helpers ts boundary"
git push -u origin frontend-runtime-ts-boundary-stage1cz-base-helpers
gh pr create --draft --base main --head frontend-runtime-ts-boundary-stage1cz-base-helpers --title "refactor: add game manager base helpers ts boundary" --body "<summary and test plan>"
```

Expected: PR opens against `main`; GitHub checks pass before merge.
