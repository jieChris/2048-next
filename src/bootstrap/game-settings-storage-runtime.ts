import {
  buildLiteSavedGameStatePayload,
  getSavedGameStateStoragesFromContext,
  normalizeHistoryDiagnosticsIndexEntriesFromContext,
  normalizeHistoryOwnerMetaFromContext,
  normalizeHistoryRecordFromContext,
  normalizeTimerModuleViewMode,
  readSavedPayloadByKeyFromStorages,
  readSavedPayloadFromWindowName,
  readStorageFlagFromContext,
  readStorageJsonMapFromContext,
  readTimerModuleViewForModeFromMap,
  readUndoEnabledForModeFromMap,
  removeKeysFromStorages,
  resolveSavedGameStateStorageKey,
  shouldUseSavedGameStateFromContext,
  writeSavedPayloadToStorages,
  writeSavedPayloadToWindowName,
  writeStorageFlagFromContext,
  writeStorageJsonMapFromContext,
  writeStorageJsonPayloadFromContext,
  writeTimerModuleViewForModeToMap,
  writeUndoEnabledForModeToMap
} from "../core/game-settings-storage";

export interface GameSettingsStorageRuntime {
  buildLiteSavedGameStatePayload: typeof buildLiteSavedGameStatePayload;
  getSavedGameStateStoragesFromContext: typeof getSavedGameStateStoragesFromContext;
  normalizeHistoryDiagnosticsIndexEntriesFromContext: typeof normalizeHistoryDiagnosticsIndexEntriesFromContext;
  normalizeHistoryOwnerMetaFromContext: typeof normalizeHistoryOwnerMetaFromContext;
  normalizeHistoryRecordFromContext: typeof normalizeHistoryRecordFromContext;
  normalizeTimerModuleViewMode: typeof normalizeTimerModuleViewMode;
  readSavedPayloadByKeyFromStorages: typeof readSavedPayloadByKeyFromStorages;
  readSavedPayloadFromWindowName: typeof readSavedPayloadFromWindowName;
  readStorageFlagFromContext: typeof readStorageFlagFromContext;
  readStorageJsonMapFromContext: typeof readStorageJsonMapFromContext;
  readTimerModuleViewForModeFromMap: typeof readTimerModuleViewForModeFromMap;
  readUndoEnabledForModeFromMap: typeof readUndoEnabledForModeFromMap;
  removeKeysFromStorages: typeof removeKeysFromStorages;
  resolveSavedGameStateStorageKey: typeof resolveSavedGameStateStorageKey;
  shouldUseSavedGameStateFromContext: typeof shouldUseSavedGameStateFromContext;
  writeSavedPayloadToStorages: typeof writeSavedPayloadToStorages;
  writeSavedPayloadToWindowName: typeof writeSavedPayloadToWindowName;
  writeStorageFlagFromContext: typeof writeStorageFlagFromContext;
  writeStorageJsonMapFromContext: typeof writeStorageJsonMapFromContext;
  writeStorageJsonPayloadFromContext: typeof writeStorageJsonPayloadFromContext;
  writeTimerModuleViewForModeToMap: typeof writeTimerModuleViewForModeToMap;
  writeUndoEnabledForModeToMap: typeof writeUndoEnabledForModeToMap;
}

export interface GameSettingsStorageRuntimeWindowLike {
  CoreGameSettingsStorageRuntime?: GameSettingsStorageRuntime;
}

export interface GameSettingsStorageRuntimeInstallOptions {
  windowLike?: GameSettingsStorageRuntimeWindowLike | null | undefined;
}

export function createGameSettingsStorageRuntime(): GameSettingsStorageRuntime {
  return {
    buildLiteSavedGameStatePayload,
    getSavedGameStateStoragesFromContext,
    normalizeHistoryDiagnosticsIndexEntriesFromContext,
    normalizeHistoryOwnerMetaFromContext,
    normalizeHistoryRecordFromContext,
    normalizeTimerModuleViewMode,
    readSavedPayloadByKeyFromStorages,
    readSavedPayloadFromWindowName,
    readStorageFlagFromContext,
    readStorageJsonMapFromContext,
    readTimerModuleViewForModeFromMap,
    readUndoEnabledForModeFromMap,
    removeKeysFromStorages,
    resolveSavedGameStateStorageKey,
    shouldUseSavedGameStateFromContext,
    writeSavedPayloadToStorages,
    writeSavedPayloadToWindowName,
    writeStorageFlagFromContext,
    writeStorageJsonMapFromContext,
    writeStorageJsonPayloadFromContext,
    writeTimerModuleViewForModeToMap,
    writeUndoEnabledForModeToMap
  };
}

export function installGameSettingsStorageRuntime(
  options: GameSettingsStorageRuntimeInstallOptions = {}
): GameSettingsStorageRuntime | null {
  const windowLike =
    options.windowLike ||
    (typeof window === "undefined" ? null : (window as unknown as GameSettingsStorageRuntimeWindowLike));
  if (!windowLike) return null;
  if (!windowLike.CoreGameSettingsStorageRuntime) {
    windowLike.CoreGameSettingsStorageRuntime = createGameSettingsStorageRuntime();
  }
  return windowLike.CoreGameSettingsStorageRuntime || null;
}
