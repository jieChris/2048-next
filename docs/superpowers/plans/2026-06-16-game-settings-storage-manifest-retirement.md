# Game Settings Storage Manifest Retirement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retire `js/core_game_settings_storage_runtime.js` from active play/replay/home/capped runtime manifests while keeping `CoreGameSettingsStorageRuntime` installed from tested TypeScript bootstrap code.

**Architecture:** `src/core/game-settings-storage.ts` already owns the storage, saved-state, timer-view, undo-enabled, owner, diagnostics, and history-record normalization helpers. This stage adds `src/bootstrap/game-settings-storage-runtime.ts` as the global legacy runtime adapter, installs it from `src/entries/home-family-bootstrap.ts` before legacy scripts load, and extends `entry-manifest-audit` so the legacy URL cannot re-enter active manifests. The legacy JS file, Vite home startup bundle reference, and `public/js/legacy_index_nomodule_loader.js` reference remain for separate bundle and legacy-browser policy stages.

**Tech Stack:** TypeScript, Vitest, Vite entry manifests, Playwright smoke, existing `entry-manifest-audit`.

---

### Task 1: TypeScript Runtime Bootstrap

**Files:**
- Create: `src/bootstrap/game-settings-storage-runtime.ts`
- Create: `tests/unit/bootstrap-game-settings-storage-runtime.spec.ts`

- [x] **Step 1: Write the failing bootstrap test**

Create `tests/unit/bootstrap-game-settings-storage-runtime.spec.ts`:

```ts
import { describe, expect, it, vi } from "vitest";

import {
  normalizeHistoryRecordFromContext,
  readStorageFlagFromContext,
  resolveSavedGameStateStorageKey,
  writeStorageFlagFromContext
} from "../../src/core/game-settings-storage";
import {
  createGameSettingsStorageRuntime,
  installGameSettingsStorageRuntime,
  type GameSettingsStorageRuntime
} from "../../src/bootstrap/game-settings-storage-runtime";

describe("bootstrap game-settings-storage runtime", () => {
  it("creates the legacy CoreGameSettingsStorageRuntime shape from TypeScript functions", () => {
    const runtime = createGameSettingsStorageRuntime();

    expect(runtime.readStorageFlagFromContext).toBe(readStorageFlagFromContext);
    expect(runtime.writeStorageFlagFromContext).toBe(writeStorageFlagFromContext);
    expect(runtime.resolveSavedGameStateStorageKey).toBe(resolveSavedGameStateStorageKey);
    expect(runtime.normalizeHistoryRecordFromContext).toBe(normalizeHistoryRecordFromContext);
    expect(Object.keys(runtime).sort()).toEqual([
      "buildLiteSavedGameStatePayload",
      "getSavedGameStateStoragesFromContext",
      "normalizeHistoryDiagnosticsIndexEntriesFromContext",
      "normalizeHistoryOwnerMetaFromContext",
      "normalizeHistoryRecordFromContext",
      "normalizeTimerModuleViewMode",
      "readSavedPayloadByKeyFromStorages",
      "readSavedPayloadFromWindowName",
      "readStorageFlagFromContext",
      "readStorageJsonMapFromContext",
      "readTimerModuleViewForModeFromMap",
      "readUndoEnabledForModeFromMap",
      "removeKeysFromStorages",
      "resolveSavedGameStateStorageKey",
      "shouldUseSavedGameStateFromContext",
      "writeSavedPayloadToStorages",
      "writeSavedPayloadToWindowName",
      "writeStorageFlagFromContext",
      "writeStorageJsonMapFromContext",
      "writeStorageJsonPayloadFromContext",
      "writeTimerModuleViewForModeToMap",
      "writeUndoEnabledForModeToMap"
    ]);
  });

  it("installs the runtime on a window-like object", () => {
    const windowLike: { CoreGameSettingsStorageRuntime?: GameSettingsStorageRuntime } = {};

    const installed = installGameSettingsStorageRuntime({ windowLike });

    expect(installed).toBe(windowLike.CoreGameSettingsStorageRuntime);
    expect(installed?.readStorageFlagFromContext).toBe(readStorageFlagFromContext);
  });

  it("preserves an existing runtime object", () => {
    const existing = {
      ...createGameSettingsStorageRuntime(),
      readStorageFlagFromContext: vi.fn()
    };
    const windowLike = { CoreGameSettingsStorageRuntime: existing };

    const installed = installGameSettingsStorageRuntime({ windowLike });

    expect(installed).toBe(existing);
    expect(windowLike.CoreGameSettingsStorageRuntime).toBe(existing);
  });

  it("returns null without a window-like object", () => {
    expect(installGameSettingsStorageRuntime({ windowLike: null })).toBeNull();
  });
});
```

- [x] **Step 2: Verify RED**

Run:

```bash
npx vitest run tests/unit/bootstrap-game-settings-storage-runtime.spec.ts
```

Expected: FAIL because `src/bootstrap/game-settings-storage-runtime.ts` does not exist.

- [x] **Step 3: Implement the TypeScript bootstrap runtime**

Create `src/bootstrap/game-settings-storage-runtime.ts` exporting `createGameSettingsStorageRuntime()` and `installGameSettingsStorageRuntime()`. The runtime object must expose every function listed in the test and preserve an existing `windowLike.CoreGameSettingsStorageRuntime`.

- [x] **Step 4: Verify GREEN**

Run:

```bash
npx vitest run tests/unit/bootstrap-game-settings-storage-runtime.spec.ts tests/unit/core-game-settings-storage.spec.ts
```

Expected: PASS.

### Task 2: Retire Active Manifest References

**Files:**
- Modify: `scripts/entry-manifest-audit.mjs`
- Modify: `tests/unit/entry-manifest-audit-helpers.spec.ts`
- Modify: `src/entries/home-family-bootstrap.ts`
- Modify: `src/entries/home-family-shared.ts`
- Modify: `src/entries/play-runtime-scripts.ts`
- Modify: `src/entries/replay-runtime-scripts.ts`

- [x] **Step 1: Write the failing active-manifest guard test**

Add this assertion near the retired active-manifest script tests:

```ts
it("tracks game-settings-storage runtime as a retired active-manifest script", () => {
  expect(RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS).toContainEqual({
    scriptPath: "core_game_settings_storage_runtime.js",
    symbolName: "coreGameSettingsStorageRuntimeUrl"
  });
});
```

- [x] **Step 2: Verify RED**

Run:

```bash
npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts
```

Expected: FAIL because `RETIRED_RUNTIME_SCRIPT_MANIFEST_REFS` does not yet include `core_game_settings_storage_runtime.js`.

- [x] **Step 3: Add the active-manifest retired registry entry**

In `scripts/entry-manifest-audit.mjs`, add:

```js
{
  scriptPath: "core_game_settings_storage_runtime.js",
  symbolName: "coreGameSettingsStorageRuntimeUrl"
}
```

Run:

```bash
npx vitest run tests/unit/entry-manifest-audit-helpers.spec.ts
npm run audit:entry-manifest
```

Expected: Vitest passes, and `npm run audit:entry-manifest` FAILS while active manifest modules still import/use `coreGameSettingsStorageRuntimeUrl`.

- [x] **Step 4: Install the TypeScript runtime before legacy scripts**

In `src/entries/home-family-bootstrap.ts`, import `installGameSettingsStorageRuntime` from `../bootstrap/game-settings-storage-runtime` and call it in the runtime install block before legacy scripts load.

- [x] **Step 5: Remove active manifest URL references**

Remove `coreGameSettingsStorageRuntimeUrl` imports and array entries from:

```text
src/entries/home-family-shared.ts
src/entries/play-runtime-scripts.ts
src/entries/replay-runtime-scripts.ts
```

Do not delete `js/core_game_settings_storage_runtime.js`. Do not remove the Vite bundle reference in `vite.config.ts`. Do not remove the nomodule loader reference in `public/js/legacy_index_nomodule_loader.js`.

- [x] **Step 6: Verify active-manifest GREEN**

Run:

```bash
npx vitest run tests/unit/bootstrap-game-settings-storage-runtime.spec.ts tests/unit/core-game-settings-storage.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts
npm run audit:entry-manifest
```

Expected: PASS.

### Task 3: Documentation, Gates, PR

**Files:**
- Modify: `docs/ARCHITECTURE_GUARDRAILS.md`
- Modify: `docs/ROADMAP_MILESTONES.md`
- Modify: `docs/superpowers/plans/2026-06-16-game-settings-storage-manifest-retirement.md`

- [x] **Step 1: Update docs with Stage-1CU evidence**

Add Stage-1CU entries stating `CoreGameSettingsStorageRuntime` is installed from `src/bootstrap/game-settings-storage-runtime.ts`, `js/core_game_settings_storage_runtime.js` is no longer referenced by active play/replay/home/capped manifests, and Vite bundle plus nomodule references remain for later policy stages.

- [x] **Step 2: Run focused verification**

Run:

```bash
npx vitest run tests/unit/bootstrap-game-settings-storage-runtime.spec.ts tests/unit/core-game-settings-storage.spec.ts tests/unit/entry-manifest-audit-helpers.spec.ts
npm run audit:entry-manifest
npm run audit:game-manager
npm run audit:service-boundary
npm run audit:page-legacy-runtime-boundary
npm run build
PW_WEB_PORT=4311 npm run test:smoke:index-ui
npx playwright test --config=playwright.config.ts --workers=1 tests/smoke/pages-runtime-contract.smoke.spec.ts
```

Expected: all commands pass.

- [x] **Step 3: Run full prepush gate**

Run:

```bash
npm run verify:prepush
```

Expected: all gates pass.

- [ ] **Step 4: Commit, push, PR**

Run:

```bash
git add src/bootstrap/game-settings-storage-runtime.ts tests/unit/bootstrap-game-settings-storage-runtime.spec.ts scripts/entry-manifest-audit.mjs tests/unit/entry-manifest-audit-helpers.spec.ts src/entries/home-family-bootstrap.ts src/entries/home-family-shared.ts src/entries/play-runtime-scripts.ts src/entries/replay-runtime-scripts.ts docs/ARCHITECTURE_GUARDRAILS.md docs/ROADMAP_MILESTONES.md docs/superpowers/plans/2026-06-16-game-settings-storage-manifest-retirement.md
git commit -m "refactor: retire game settings storage from active manifests"
git push -u origin frontend-runtime-ts-boundary-stage1cu-game-settings-storage-manifest
gh pr create --draft --title "refactor: retire game settings storage from active manifests" --body "<summary and test plan>"
```

Expected: PR opens against `main`; GitHub checks pass before merge.
