# Undo Snapshot Runtime Boundary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retire `js/core_undo_snapshot_runtime.js` from active runtime manifests by installing `CoreUndoSnapshotRuntime` from tested TypeScript before legacy game-manager scripts load.

**Architecture:** Keep `src/core/undo-snapshot.ts` as the pure undo snapshot owner. Add a small bootstrap installer that exposes the legacy global shape and extend the retired-runtime manifest registry so active manifests cannot reintroduce the legacy script.

**Tech Stack:** TypeScript, Vite `?url` script manifests, Vitest, existing entry manifest audit.

---

### Task 1: Guard Undo-Snapshot Runtime Manifest Retirement

**Files:**
- Modify: `scripts/entry-manifest-audit.mjs`
- Modify: `tests/unit/entry-manifest-audit-helpers.spec.ts`

- [x] **Step 1: Write RED**

Add this Vitest case to `tests/unit/entry-manifest-audit-helpers.spec.ts` near the other retired runtime registry tests:

```ts
it("tracks undo-snapshot runtime as a retired active-manifest script", () => {
  expect(RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS).toContainEqual({
    scriptPath: "core_undo_snapshot_runtime.js",
    symbolName: "coreUndoSnapshotRuntimeUrl"
  });
});
```

- [x] **Step 2: Run RED**

Run: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts`

Expected: FAIL because `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS` does not yet include `core_undo_snapshot_runtime.js`.

- [x] **Step 3: Implement registry entry**

Add this entry to `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS` in `scripts/entry-manifest-audit.mjs`:

```js
{
  scriptPath: "core_undo_snapshot_runtime.js",
  symbolName: "coreUndoSnapshotRuntimeUrl"
}
```

### Task 2: Install Undo-Snapshot Runtime From TypeScript

**Files:**
- Create: `src/bootstrap/undo-snapshot-runtime.ts`
- Create: `tests/unit/bootstrap-undo-snapshot-runtime.spec.ts`
- Modify: `src/entries/home-family-bootstrap.ts`

- [x] **Step 1: Write RED**

Create `tests/unit/bootstrap-undo-snapshot-runtime.spec.ts` with tests for:
- `createUndoSnapshotRuntime()` exposes `createUndoSnapshot` from `src/core/undo-snapshot.ts`.
- `installUndoSnapshotRuntime({ windowLike })` installs `CoreUndoSnapshotRuntime`.
- repeated install does not overwrite an existing runtime.
- `installUndoSnapshotRuntime({ windowLike: null })` returns `null`.

- [x] **Step 2: Run RED**

Run: `npx vitest run tests/unit/bootstrap-undo-snapshot-runtime.spec.ts`

Expected: FAIL because `src/bootstrap/undo-snapshot-runtime.ts` does not exist.

- [x] **Step 3: Implement installer**

Create `src/bootstrap/undo-snapshot-runtime.ts`:

```ts
import { createUndoSnapshot } from "../core/undo-snapshot";

export interface UndoSnapshotRuntime {
  createUndoSnapshot: typeof createUndoSnapshot;
}

export interface UndoSnapshotRuntimeWindowLike {
  CoreUndoSnapshotRuntime?: UndoSnapshotRuntime;
}

export interface UndoSnapshotRuntimeInstallOptions {
  windowLike?: UndoSnapshotRuntimeWindowLike | null | undefined;
}

export function createUndoSnapshotRuntime(): UndoSnapshotRuntime {
  return {
    createUndoSnapshot
  };
}

export function installUndoSnapshotRuntime(
  options: UndoSnapshotRuntimeInstallOptions = {}
): UndoSnapshotRuntime | null {
  const windowLike =
    options.windowLike ||
    (typeof window === "undefined" ? null : (window as unknown as UndoSnapshotRuntimeWindowLike));
  if (!windowLike) return null;
  if (!windowLike.CoreUndoSnapshotRuntime) {
    windowLike.CoreUndoSnapshotRuntime = createUndoSnapshotRuntime();
  }
  return windowLike.CoreUndoSnapshotRuntime || null;
}
```

- [x] **Step 4: Install before legacy scripts**

Import and call `installUndoSnapshotRuntime()` in `src/entries/home-family-bootstrap.ts` before `loadLegacyScriptsSequentially(...)` can load game-manager scripts.

### Task 3: Remove Legacy Script From Active Manifests

**Files:**
- Modify: `src/entries/play-runtime-scripts.ts`
- Modify: `src/entries/replay-runtime-scripts.ts`
- Modify: `src/entries/home-family-shared.ts`

- [x] **Step 1: Remove import and array entries**

Delete `coreUndoSnapshotRuntimeUrl` imports and remove `coreUndoSnapshotRuntimeUrl` from play, replay, home, and capped runtime script arrays.

- [x] **Step 2: Run manifest audit**

Run: `npm run audit:entry-manifest`

Expected: PASS after every active manifest reference has been removed and the retired runtime registry contains the undo-snapshot entry.

### Task 4: Verify and Document Stage 1I

**Files:**
- Modify: `docs/ARCHITECTURE_GUARDRAILS.md`
- Modify: `docs/ROADMAP_MILESTONES.md`

- [x] **Step 1: Run focused GREEN checks**

Run:

```bash
npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts tests/unit/core-undo-snapshot.spec.ts tests/unit/bootstrap-undo-snapshot-runtime.spec.ts
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

Prepend Stage 1I evidence to `docs/ARCHITECTURE_GUARDRAILS.md` and `docs/ROADMAP_MILESTONES.md`, including RED/GREEN commands and manifest retirement details.
