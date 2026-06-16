# Base Helpers Active Manifest Retirement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove `core_game_manager_base_helpers_runtime.js` from active home/capped/play/replay runtime manifests after the TypeScript boundary owns its required behavior.

**Architecture:** `src/bootstrap/game-manager-base-helpers-runtime.ts` remains the modern installer for legacy global helper names before active legacy scripts load. This stage only retires active manifest references and adds audit coverage; `vite.config.ts`, `public/js/legacy_index_nomodule_loader.js`, legacy VM tests, and the legacy file remain in place for separate stages.

**Tech Stack:** TypeScript entry manifests, Vitest, entry manifest audit.

---

### Task 1: RED Active Retirement Guardrail

**Files:**
- Modify: `tests/unit/entry-manifest-audit-helpers.spec.ts`

- [x] **Step 1: Add a failing retired-manifest registry test**

Add a test asserting `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS` contains:

```ts
{
  scriptPath: "core_game_manager_base_helpers_runtime.js",
  symbolName: "coreGameManagerBaseHelpersRuntimeUrl"
}
```

- [x] **Step 2: Run RED**

Run:

```bash
npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts
```

Expected: FAIL because the retired active-manifest registry does not yet include the base helpers runtime.

### Task 2: RED Manifest Audit

**Files:**
- Modify: `scripts/entry-manifest-audit.mjs`

- [x] **Step 1: Add the retired script to active manifest audit**

Add `core_game_manager_base_helpers_runtime.js` / `coreGameManagerBaseHelpersRuntimeUrl` to `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS`.

- [x] **Step 2: Run audit RED**

Run:

```bash
npm run audit:entry-manifest
```

Expected: FAIL while `src/entries/home-family-shared.ts`, `src/entries/play-runtime-scripts.ts`, and `src/entries/replay-runtime-scripts.ts` still import/export the retired runtime.

### Task 3: GREEN Remove Active Manifest References

**Files:**
- Modify: `src/entries/home-family-shared.ts`
- Modify: `src/entries/play-runtime-scripts.ts`
- Modify: `src/entries/replay-runtime-scripts.ts`

- [x] **Step 1: Remove import and array entries**

Remove the `coreGameManagerBaseHelpersRuntimeUrl` import and its entries from `homeCoreScripts`, `cappedCoreScripts`, `playLegacyScripts`, and `replayLegacyScripts`.

- [x] **Step 2: Run GREEN**

Run:

```bash
npm run audit:entry-manifest
npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts tests/unit/bootstrap-game-manager-base-helpers-runtime.spec.ts tests/unit/core-game-manager-base-helpers.spec.ts tests/unit/core-game-manager-base-helpers-runtime.spec.ts
```

Expected: PASS.

### Task 4: Documentation And Verification

**Files:**
- Modify: `docs/ARCHITECTURE_GUARDRAILS.md`
- Modify: `docs/ROADMAP_MILESTONES.md`
- Modify: `docs/superpowers/plans/2026-06-16-base-helpers-active-manifest-retirement.md`

- [x] **Step 1: Document Stage-1DC**

Document that active manifests no longer reference `core_game_manager_base_helpers_runtime.js`; Vite bundle and nomodule loader references remain intentionally in place.

- [x] **Step 2: Run full verification**

Run:

```bash
npm run audit:entry-manifest
npm run audit:game-manager
npm run audit:service-boundary
npm run audit:page-legacy-runtime-boundary
npm run build
PW_WEB_PORT=4319 npm run test:smoke:index-ui
npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts
npm run verify:prepush
```

Expected: all commands exit 0.

Completed evidence:
- `npm run audit:entry-manifest`
- `npm run audit:game-manager`
- `npm run audit:service-boundary`
- `npm run audit:page-legacy-runtime-boundary`
- `npm run build`
- `PW_WEB_PORT=4319 npm run test:smoke:index-ui`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`
- `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-contracts-saved-session.smoke.spec.ts`
- `npm run verify:prepush`

### Task 5: Commit And PR

**Files:**
- Commit all files modified in this plan.

- [x] **Step 1: Commit**

Run:

```bash
git status --short
git add scripts/entry-manifest-audit.mjs tests/unit/entry-manifest-audit-helpers.spec.ts src/bootstrap/game-manager-base-helpers-runtime.ts tests/unit/bootstrap-game-manager-base-helpers-runtime.spec.ts src/entries/home-family-shared.ts src/entries/play-runtime-scripts.ts src/entries/replay-runtime-scripts.ts docs/ARCHITECTURE_GUARDRAILS.md docs/ROADMAP_MILESTONES.md docs/superpowers/plans/2026-06-16-base-helpers-active-manifest-retirement.md
git commit -m "refactor: retire base helpers active manifest runtime"
```

Expected: commit succeeds on `frontend-runtime-active-manifest-stage1dc-base-helpers`.

### Task 6: CI Follow-Up Runtime Global Gap

**Files:**
- Modify: `src/core/game-manager-base-helpers.ts`
- Modify: `src/bootstrap/game-manager-base-helpers-runtime.ts`
- Modify: `tests/unit/bootstrap-game-manager-base-helpers-runtime.spec.ts`

- [x] **Step 1: Diagnose PR #126 Smoke (pages) failure**

Root cause: after retiring the active legacy runtime, `core_game_manager_replay_helpers_runtime.js` still called the bare legacy global `isSecondaryTimerParentReached` during practice-board timer invalidation. The TypeScript installer did not expose that helper, so `restartWithBoard` threw during practice-board code apply/setup.

- [x] **Step 2: Add RED installer coverage**

Run:

```bash
npx vitest run tests/unit/bootstrap-game-manager-base-helpers-runtime.spec.ts
```

Expected: FAIL before `isSecondaryTimerParentReached` is exported and installed.

- [x] **Step 3: Export and install the missing helper**

Export `isSecondaryTimerParentReached` from `src/core/game-manager-base-helpers.ts` and expose it through `src/bootstrap/game-manager-base-helpers-runtime.ts`.

- [x] **Step 4: Verify the CI failure path locally**

Run:

```bash
npx vitest run tests/unit/bootstrap-game-manager-base-helpers-runtime.spec.ts
npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-practice-board-code-input.smoke.spec.ts tests/smoke/pages-ui-regressions.smoke.spec.ts
npm run verify:prepush
```

Expected: all commands exit 0.
