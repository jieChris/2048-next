# Base Helpers Mode Payload Boundary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the TypeScript base-helper boundary to cover `createCoreModeDefaultsPayload` and `createCoreModeContextPayload`, which are required before `core_game_manager_base_helpers_runtime.js` can safely leave active manifests.

**Architecture:** `src/core/game-manager-base-helpers.ts` continues to own low-level call/resolve helpers and now also owns the core mode payload helpers. `src/bootstrap/game-manager-base-helpers-runtime.ts` installs the added legacy global names before home/play/replay/capped scripts load. Active manifest, Vite bundle, and legacy nomodule references to `core_game_manager_base_helpers_runtime.js` remain intentionally in place because secondary timer helpers are still provided by the legacy runtime.

**Tech Stack:** TypeScript, Vitest, Vite bootstrap, existing refactor audits, Playwright smoke.

---

### Task 1: Core Mode Payload Helpers

**Files:**
- Modify: `src/core/game-manager-base-helpers.ts`
- Modify: `tests/unit/core-game-manager-base-helpers.spec.ts`

- [x] **Step 1: Write the failing core helper tests**

Add tests that:
- `createCoreModeDefaultsPayload` merges `{ defaultModeKey: GameManager.DEFAULT_MODE_KEY }` with payload values using legacy override order.
- `createCoreModeContextPayload` adds `currentModeKey` and `currentMode`, then delegates through `manager.createCoreModeDefaultsPayload`.
- nullish manager fallback returns the defaults payload.

Run:

```bash
npx vitest run tests/unit/core-game-manager-base-helpers.spec.ts tests/unit/bootstrap-game-manager-base-helpers-runtime.spec.ts
```

Expected: FAIL before the helpers are exported.

- [x] **Step 2: Implement the helpers**

Update `src/core/game-manager-base-helpers.ts` to export:
- `createCoreModeDefaultsPayload(payload: unknown)`
- `createCoreModeContextPayload(manager, payload)`

Preserve legacy merge semantics and `GameManager.DEFAULT_MODE_KEY` lookup through `globalThis.GameManager`.

- [x] **Step 3: Verify GREEN**

Run:

```bash
npx vitest run tests/unit/core-game-manager-base-helpers.spec.ts tests/unit/bootstrap-game-manager-base-helpers-runtime.spec.ts
```

Expected: PASS.

### Task 2: Bootstrap Legacy Global Installer

**Files:**
- Modify: `src/bootstrap/game-manager-base-helpers-runtime.ts`
- Modify: `tests/unit/bootstrap-game-manager-base-helpers-runtime.spec.ts`

- [x] **Step 1: Extend installer tests**

Update the expected runtime table to include:
- `createCoreModeDefaultsPayload`
- `createCoreModeContextPayload`

- [x] **Step 2: Install the added globals**

Update `src/bootstrap/game-manager-base-helpers-runtime.ts` to expose the two helpers in `GameManagerBaseHelpersRuntime` and `createGameManagerBaseHelpersRuntime()`.

- [x] **Step 3: Verify legacy runtime contract remains stable**

Run:

```bash
npx vitest run tests/unit/bootstrap-game-manager-base-helpers-runtime.spec.ts tests/unit/core-game-manager-base-helpers.spec.ts tests/unit/core-game-manager-base-helpers-runtime.spec.ts
```

Expected: PASS.

### Task 3: Documentation, Gates, PR

**Files:**
- Modify: `docs/ARCHITECTURE_GUARDRAILS.md`
- Modify: `docs/ROADMAP_MILESTONES.md`
- Create: `docs/superpowers/plans/2026-06-16-base-helpers-mode-payload-boundary.md`

- [x] **Step 1: Update docs with Stage-1DA evidence**

Add Stage-1DA entries stating:
- `src/core/game-manager-base-helpers.ts` now owns `createCoreModeDefaultsPayload` and `createCoreModeContextPayload`.
- `src/bootstrap/game-manager-base-helpers-runtime.ts` installs those legacy global names.
- active manifest and Vite bundle references to `js/core_game_manager_base_helpers_runtime.js` remain intentionally because secondary timer helpers still require a later TypeScript boundary stage.

- [x] **Step 2: Run focused verification**

Run:

```bash
npx vitest run tests/unit/bootstrap-game-manager-base-helpers-runtime.spec.ts tests/unit/core-game-manager-base-helpers.spec.ts tests/unit/core-game-manager-base-helpers-runtime.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts
npm run audit:entry-manifest
npm run audit:game-manager
npm run audit:service-boundary
npm run audit:page-legacy-runtime-boundary
npm run build
PW_WEB_PORT=4317 npm run test:smoke:index-ui
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
git add src/core/game-manager-base-helpers.ts src/bootstrap/game-manager-base-helpers-runtime.ts tests/unit/core-game-manager-base-helpers.spec.ts tests/unit/bootstrap-game-manager-base-helpers-runtime.spec.ts docs/ARCHITECTURE_GUARDRAILS.md docs/ROADMAP_MILESTONES.md docs/superpowers/plans/2026-06-16-base-helpers-mode-payload-boundary.md
git commit -m "refactor: add base helpers mode payload boundary"
git push -u origin frontend-runtime-active-manifest-stage1da-base-helpers
gh pr create --draft --base main --head frontend-runtime-active-manifest-stage1da-base-helpers --title "refactor: add base helpers mode payload boundary" --body "<summary and test plan>"
```

Expected: PR opens against `main`; GitHub checks pass before merge.
