export interface SavedStateSyncPublishManagerLike {
  replayMode?: boolean;
  lastSavedStateSyncPublishedAt?: number;
  getWebStorageByName?: (storageName: string) => unknown;
}

export interface SavedStateSyncPublishEventPayloadLike {
  saved_at?: unknown;
}

export interface SavedStateSyncPublishOperations {
  shouldUseSavedGameState: (manager: SavedStateSyncPublishManagerLike) => boolean;
  shouldSkipSavedStateSyncPublishByThrottle: (
    manager: SavedStateSyncPublishManagerLike,
    nowMs: number
  ) => boolean;
  canWriteToStorage: (storage: unknown) => boolean;
  resolveSavedGameStateSyncStorageKey: (manager: SavedStateSyncPublishManagerLike) => string;
  buildSavedStateSyncEventPayload: (
    manager: SavedStateSyncPublishManagerLike,
    nowMs: number
  ) => SavedStateSyncPublishEventPayloadLike | null | undefined;
  writeStorageJsonPayload: (
    storage: unknown,
    key: string,
    payload: SavedStateSyncPublishEventPayloadLike
  ) => boolean;
  rememberSavedStateKnownSavedAt: (
    manager: SavedStateSyncPublishManagerLike,
    savedAt: unknown
  ) => void;
}

export interface SavedStateSyncPublishRuntime {
  publishSavedStateSyncSnapshot: typeof publishSavedStateSyncSnapshot;
}

export interface SavedStateSyncPublishWindowLike {
  CoreSavedStateSyncPublishRuntime?: SavedStateSyncPublishRuntime;
}

export interface SavedStateSyncPublishRuntimeInstallOptions {
  windowLike?: SavedStateSyncPublishWindowLike | null;
}

export function publishSavedStateSyncSnapshot(
  manager: SavedStateSyncPublishManagerLike | null | undefined,
  operations: SavedStateSyncPublishOperations,
  nowMs = Date.now()
): boolean {
  if (!manager) return false;
  if (!operations.shouldUseSavedGameState(manager)) return false;
  if (manager.replayMode) return false;
  if (operations.shouldSkipSavedStateSyncPublishByThrottle(manager, nowMs)) return false;
  const storage = manager.getWebStorageByName?.("localStorage");
  if (!operations.canWriteToStorage(storage)) return false;
  const key = operations.resolveSavedGameStateSyncStorageKey(manager);
  if (!(typeof key === "string" && key)) return false;
  const eventPayload = operations.buildSavedStateSyncEventPayload(manager, nowMs);
  if (!eventPayload) return false;
  const written = operations.writeStorageJsonPayload(storage, key, eventPayload);
  if (!written) return false;
  manager.lastSavedStateSyncPublishedAt = nowMs;
  operations.rememberSavedStateKnownSavedAt(manager, eventPayload.saved_at);
  return true;
}

export function createSavedStateSyncPublishRuntime(): SavedStateSyncPublishRuntime {
  return {
    publishSavedStateSyncSnapshot
  };
}

export function installSavedStateSyncPublishRuntime(
  options: SavedStateSyncPublishRuntimeInstallOptions = {}
): SavedStateSyncPublishRuntime | null {
  const target =
    options.windowLike === undefined
      ? typeof window === "undefined"
        ? null
        : (window as unknown as SavedStateSyncPublishWindowLike)
      : options.windowLike;
  if (!target) return null;
  if (!target.CoreSavedStateSyncPublishRuntime) {
    target.CoreSavedStateSyncPublishRuntime = createSavedStateSyncPublishRuntime();
  }
  return target.CoreSavedStateSyncPublishRuntime;
}
