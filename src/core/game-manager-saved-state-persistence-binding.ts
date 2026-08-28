export interface GameManagerSavedStatePersistenceWindowLike {
  addEventListener?: (eventName: string, handler: () => void) => void;
  document?: {
    visibilityState?: string;
    addEventListener?: (eventName: string, handler: () => void) => void;
  } | null;
  OnlineLeaderboardRuntime?: {
    persistRankedCheckpointOnPageHide?: (
      manager: GameManagerSavedStatePersistenceManagerLike,
    ) => void;
  } | null;
}

export interface GameManagerSavedStatePersistenceManagerLike {
  savedGameStateBound?: boolean;
  singleModePageLockRejected?: boolean;
  getWindowLike?: () =>
    | GameManagerSavedStatePersistenceWindowLike
    | null
    | undefined;
}

export interface GameManagerSavedStatePersistenceBindingOperations {
  saveGameState?: (
    manager: GameManagerSavedStatePersistenceManagerLike,
    options: { force: boolean },
  ) => void;
  bindSavedStateSyncStorageListener?: (
    manager: GameManagerSavedStatePersistenceManagerLike,
    windowLike: GameManagerSavedStatePersistenceWindowLike,
  ) => void;
}

export interface GameManagerSavedStatePersistenceBindingRuntime {
  bindGameManagerSavedStatePersistence: typeof bindGameManagerSavedStatePersistence;
}

export interface GameManagerSavedStatePersistenceBindingWindowLike {
  CoreGameManagerSavedStatePersistenceBindingRuntime?: GameManagerSavedStatePersistenceBindingRuntime;
}

export interface GameManagerSavedStatePersistenceBindingRuntimeInstallOptions {
  windowLike?: GameManagerSavedStatePersistenceBindingWindowLike | null;
}

function persistRankedCheckpointOnPageHide(
  manager: GameManagerSavedStatePersistenceManagerLike,
  windowLike: GameManagerSavedStatePersistenceWindowLike,
): void {
  try {
    const persistRankedCheckpoint =
      windowLike.OnlineLeaderboardRuntime?.persistRankedCheckpointOnPageHide;
    if (typeof persistRankedCheckpoint === "function") {
      persistRankedCheckpoint(manager);
    }
  } catch (_errCheckpoint) {
    // Page lifecycle handlers must not throw while the browser is unloading.
  }
}

export function bindGameManagerSavedStatePersistence(
  manager: GameManagerSavedStatePersistenceManagerLike | null | undefined,
  operations: GameManagerSavedStatePersistenceBindingOperations = {},
): void {
  if (!manager || manager.savedGameStateBound) return;
  const windowLike = manager.getWindowLike?.();
  if (!windowLike || typeof windowLike.addEventListener !== "function") return;

  const saveHandler = () => {
    if (manager.singleModePageLockRejected) return;
    operations.saveGameState?.(manager, { force: true });
    persistRankedCheckpointOnPageHide(manager, windowLike);
  };
  const handleVisibilityChange = () => {
    const visibilityState = windowLike.document?.visibilityState;
    if (!visibilityState || visibilityState === "hidden") saveHandler();
  };
  windowLike.addEventListener("beforeunload", saveHandler);
  windowLike.addEventListener("pagehide", saveHandler);
  windowLike.document?.addEventListener?.(
    "visibilitychange",
    handleVisibilityChange,
  );
  operations.bindSavedStateSyncStorageListener?.(manager, windowLike);
  manager.savedGameStateBound = true;
}

export function createGameManagerSavedStatePersistenceBindingRuntime(): GameManagerSavedStatePersistenceBindingRuntime {
  return {
    bindGameManagerSavedStatePersistence,
  };
}

export function installGameManagerSavedStatePersistenceBindingRuntime(
  options: GameManagerSavedStatePersistenceBindingRuntimeInstallOptions = {},
): GameManagerSavedStatePersistenceBindingRuntime | null {
  let target = options.windowLike;
  if (target === undefined) {
    if (typeof window === "undefined") return null;
    // SAFETY: this runtime is published on the browser Window namespace.
    target =
      window as unknown as GameManagerSavedStatePersistenceBindingWindowLike;
  }
  if (!target) return null;
  if (!target.CoreGameManagerSavedStatePersistenceBindingRuntime) {
    target.CoreGameManagerSavedStatePersistenceBindingRuntime =
      createGameManagerSavedStatePersistenceBindingRuntime();
  }
  return target.CoreGameManagerSavedStatePersistenceBindingRuntime;
}
