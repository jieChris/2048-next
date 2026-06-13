# Move Path Runtime Boundary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retire `js/core_move_path_runtime.js` from active runtime manifests by installing `CoreMovePathRuntime` from tested TypeScript before legacy game-manager scripts load.

**Architecture:** Keep `src/core/move-path.ts` as the pure move-path owner. Add a bootstrap installer that exposes the legacy global shape and preserves legacy defaults for missing vector and callback arguments.

**Tech Stack:** TypeScript, Vite `?url` script manifests, Vitest, existing entry manifest audit.

---

### Task 1: Guard Move-Path Runtime Manifest Retirement

**Files:**
- Modify: `scripts/entry-manifest-audit.mjs`
- Modify: `tests/unit/entry-manifest-audit-helpers.spec.ts`

- [x] **Step 1: Write RED**

Add a test requiring `{ scriptPath: "core_move_path_runtime.js", symbolName: "coreMovePathRuntimeUrl" }` in `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS`.

- [x] **Step 2: Run RED**

Run: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts`

Expected: FAIL until the retired registry includes move-path.

- [x] **Step 3: Implement registry entry**

Add `core_move_path_runtime.js` / `coreMovePathRuntimeUrl` to `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS`.

### Task 2: Install Move-Path Runtime From TypeScript

**Files:**
- Create: `src/bootstrap/move-path-runtime.ts`
- Create: `tests/unit/bootstrap-move-path-runtime.spec.ts`
- Modify: `src/entries/home-family-bootstrap.ts`

- [x] **Step 1: Write RED**

Create tests that require `createMovePathRuntime()` to expose `getVector`, `positionsEqual`, `buildTraversals`, and `findFarthestPosition`; preserve legacy fallback behavior for missing vector/callbacks; install on `CoreMovePathRuntime`; avoid overwriting an existing runtime; and return `null` for a null target.

- [x] **Step 2: Run RED**

Run: `npx vitest run tests/unit/bootstrap-move-path-runtime.spec.ts`

Expected: FAIL because `src/bootstrap/move-path-runtime.ts` does not exist.

- [x] **Step 3: Implement installer**

Create `src/bootstrap/move-path-runtime.ts` with wrapper functions that delegate to `src/core/move-path.ts`, using `{ x: 0, y: 0 }` for missing vector, `() => false` for missing `isBlockedCell`, and `() => false` for missing `isCellAvailable`.

- [x] **Step 4: Install before legacy scripts**

Import and call `installMovePathRuntime()` in `src/entries/home-family-bootstrap.ts` before legacy game-manager scripts load.

### Task 3: Remove Legacy Script From Active Manifests

**Files:**
- Modify: `src/entries/play-runtime-scripts.ts`
- Modify: `src/entries/replay-runtime-scripts.ts`
- Modify: `src/entries/home-family-shared.ts`

- [x] **Step 1: Remove import and array entries**

Delete `coreMovePathRuntimeUrl` imports and remove `coreMovePathRuntimeUrl` from play, replay, home, and capped runtime script arrays.

- [x] **Step 2: Run manifest audit**

Run: `npm run audit:entry-manifest`

Expected: PASS after every active manifest reference has been removed.

### Task 4: Verify and Document Stage 1M

**Files:**
- Modify: `docs/ARCHITECTURE_GUARDRAILS.md`
- Modify: `docs/ROADMAP_MILESTONES.md`

- [x] **Step 1: Run focused GREEN checks**

Run:

```bash
npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts tests/unit/core-move-path.spec.ts tests/unit/bootstrap-move-path-runtime.spec.ts
```

Expected: PASS.

- [x] **Step 2: Run audits, build, smoke, and prepush**

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

Expected: all commands exit 0.

- [x] **Step 3: Document evidence**

Prepend Stage 1M evidence to `docs/ARCHITECTURE_GUARDRAILS.md` and `docs/ROADMAP_MILESTONES.md`.
