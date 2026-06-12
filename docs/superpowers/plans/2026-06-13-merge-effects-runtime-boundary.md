# Merge Effects Runtime Boundary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Retire `js/core_merge_effects_runtime.js` from active runtime manifests by installing `CoreMergeEffectsRuntime` from tested TypeScript before legacy game-manager scripts load.

**Architecture:** Keep `src/core/merge-effects.ts` as the pure merge-effect owner, add a bootstrap installer for the legacy global shape, and extend the retired-runtime manifest registry to block merge-effects runtime reintroduction.

**Tech Stack:** TypeScript, Vite `?url` script manifests, Vitest, existing entry manifest audit.

---

### Task 1: Guard Merge-Effects Runtime Manifest Retirement

**Files:**
- Modify: `scripts/entry-manifest-audit.mjs`
- Modify: `tests/unit/entry-manifest-audit-helpers.spec.ts`

- [x] **Step 1: Write RED**

Add a test requiring `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS` to include `{ scriptPath: "core_merge_effects_runtime.js", symbolName: "coreMergeEffectsRuntimeUrl" }`.

- [x] **Step 2: Implement registry entry**

Add merge-effects to the retired runtime registry and verify `npm run audit:entry-manifest` fails before manifest removal.

### Task 2: Install Merge-Effects Runtime From TypeScript

**Files:**
- Create: `src/bootstrap/merge-effects-runtime.ts`
- Create: `tests/unit/bootstrap-merge-effects-runtime.spec.ts`
- Modify: `src/entries/home-family-bootstrap.ts`

- [x] **Step 1: Write RED**

Add tests for `createMergeEffectsRuntime()` and `installMergeEffectsRuntime()`, covering global shape, install, idempotence, and null target handling.

- [x] **Step 2: Implement installer**

Create `src/bootstrap/merge-effects-runtime.ts`, import `computeMergeEffects`, expose it under the `CoreMergeEffectsRuntime` shape, and install it before legacy scripts load.

### Task 3: Remove Legacy Script From Active Manifests

**Files:**
- Modify: `src/entries/play-runtime-scripts.ts`
- Modify: `src/entries/replay-runtime-scripts.ts`
- Modify: `src/entries/home-family-shared.ts`

- [x] **Step 1: Remove import and array entries**

Delete `coreMergeEffectsRuntimeUrl` imports and remove it from play, replay, home, and capped runtime script arrays.

### Task 4: Verify Stage 1G

**Files:**
- Modify: `docs/ARCHITECTURE_GUARDRAILS.md`
- Modify: `docs/ROADMAP_MILESTONES.md`

- [x] **Step 1: Run focused tests**

Run `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts tests/unit/core-merge-effects.spec.ts tests/unit/bootstrap-merge-effects-runtime.spec.ts`.

- [x] **Step 2: Run audits, build, smoke, and prepush**

Run `npm run audit:entry-manifest`, `npm run audit:game-manager`, `npm run audit:service-boundary`, `npm run audit:page-legacy-runtime-boundary`, `npm run build`, `npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts`, and `npm run verify:prepush`.
