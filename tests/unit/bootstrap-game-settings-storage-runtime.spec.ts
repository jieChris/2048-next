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
