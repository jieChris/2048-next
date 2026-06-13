# Direction Lock Runtime Boundary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retire `js/core_direction_lock_runtime.js` from active runtime manifests by installing `CoreDirectionLockRuntime` from tested TypeScript before legacy game-manager scripts load.

**Architecture:** Keep `src/core/direction-lock.ts` as the pure direction-lock owner. Add a bootstrap installer that preserves the legacy global API shape, including `getLockedDirectionState(input, randomFromSeed)`, by adapting the second legacy parameter into the TypeScript input object.

**Tech Stack:** TypeScript, Vite `?url` script manifests, Vitest, existing entry manifest audit.

---

### Task 1: Guard Direction-Lock Runtime Manifest Retirement

**Files:**
- Modify: `scripts/entry-manifest-audit.mjs`
- Modify: `tests/unit/entry-manifest-audit-helpers.spec.ts`

- [x] **Step 1: Write RED**

Add this Vitest case near the other retired runtime registry tests:

```ts
it("tracks direction-lock runtime as a retired active-manifest script", () => {
  expect(RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS).toContainEqual({
    scriptPath: "core_direction_lock_runtime.js",
    symbolName: "coreDirectionLockRuntimeUrl"
  });
});
```

- [x] **Step 2: Run RED**

Run: `npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts`

Expected: FAIL because `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS` does not yet include `core_direction_lock_runtime.js`.

- [x] **Step 3: Implement registry entry**

Add this entry to `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS`:

```js
{
  scriptPath: "core_direction_lock_runtime.js",
  symbolName: "coreDirectionLockRuntimeUrl"
}
```

### Task 2: Install Direction-Lock Runtime From TypeScript

**Files:**
- Create: `src/bootstrap/direction-lock-runtime.ts`
- Create: `tests/unit/bootstrap-direction-lock-runtime.spec.ts`
- Modify: `src/entries/home-family-bootstrap.ts`

- [x] **Step 1: Write RED**

Create `tests/unit/bootstrap-direction-lock-runtime.spec.ts` with tests for:
- `createDirectionLockRuntime()` exposes `getLockedDirectionState`.
- legacy two-argument calls pass the `randomFromSeed` function into the TypeScript owner.
- `installDirectionLockRuntime({ windowLike })` installs `CoreDirectionLockRuntime`.
- repeated install does not overwrite an existing runtime.
- `installDirectionLockRuntime({ windowLike: null })` returns `null`.

- [x] **Step 2: Run RED**

Run: `npx vitest run tests/unit/bootstrap-direction-lock-runtime.spec.ts`

Expected: FAIL because `src/bootstrap/direction-lock-runtime.ts` does not exist.

- [x] **Step 3: Implement installer**

Create `src/bootstrap/direction-lock-runtime.ts` with a legacy-compatible runtime:

```ts
import {
  getLockedDirectionState,
  type LockedDirectionState,
  type LockedDirectionStateInput
} from "../core/direction-lock";

export interface DirectionLockRuntime {
  getLockedDirectionState: (
    input: LockedDirectionStateInput,
    randomFromSeed?: LockedDirectionStateInput["randomFromSeed"]
  ) => LockedDirectionState;
}

export interface DirectionLockRuntimeWindowLike {
  CoreDirectionLockRuntime?: DirectionLockRuntime;
}

export interface DirectionLockRuntimeInstallOptions {
  windowLike?: DirectionLockRuntimeWindowLike | null | undefined;
}

export function createDirectionLockRuntime(): DirectionLockRuntime {
  return {
    getLockedDirectionState: (input, randomFromSeed) =>
      getLockedDirectionState({
        ...input,
        randomFromSeed: typeof randomFromSeed === "function" ? randomFromSeed : input.randomFromSeed
      })
  };
}

export function installDirectionLockRuntime(
  options: DirectionLockRuntimeInstallOptions = {}
): DirectionLockRuntime | null {
  const windowLike =
    options.windowLike ||
    (typeof window === "undefined" ? null : (window as unknown as DirectionLockRuntimeWindowLike));
  if (!windowLike) return null;
  if (!windowLike.CoreDirectionLockRuntime) {
    windowLike.CoreDirectionLockRuntime = createDirectionLockRuntime();
  }
  return windowLike.CoreDirectionLockRuntime || null;
}
```

- [x] **Step 4: Install before legacy scripts**

Import and call `installDirectionLockRuntime()` in `src/entries/home-family-bootstrap.ts` before legacy game-manager scripts load.

### Task 3: Remove Legacy Script From Active Manifests

**Files:**
- Modify: `src/entries/play-runtime-scripts.ts`
- Modify: `src/entries/replay-runtime-scripts.ts`
- Modify: `src/entries/home-family-shared.ts`

- [x] **Step 1: Remove import and array entries**

Delete `coreDirectionLockRuntimeUrl` imports and remove `coreDirectionLockRuntimeUrl` from play, replay, home, and capped runtime script arrays.

- [x] **Step 2: Run manifest audit**

Run: `npm run audit:entry-manifest`

Expected: PASS after every active manifest reference has been removed.

### Task 4: Verify and Document Stage 1J

**Files:**
- Modify: `docs/ARCHITECTURE_GUARDRAILS.md`
- Modify: `docs/ROADMAP_MILESTONES.md`

- [x] **Step 1: Run focused GREEN checks**

Run:

```bash
npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts tests/unit/core-direction-lock.spec.ts tests/unit/bootstrap-direction-lock-runtime.spec.ts
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

Prepend Stage 1J evidence to `docs/ARCHITECTURE_GUARDRAILS.md` and `docs/ROADMAP_MILESTONES.md`.
