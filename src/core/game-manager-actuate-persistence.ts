export interface GameManagerActuatePersistenceManagerLike {
  modeKey?: unknown;
  over?: unknown;
  clearSavedGameState?: (modeKey: unknown) => void;
  tryAutoSubmitOnGameOver?: () => unknown;
}

export interface GameManagerActuatePersistenceOperations {
  consumeSkipActuatePersistenceOnce?: (manager: GameManagerActuatePersistenceManagerLike) => boolean;
  publishSavedStateSyncSnapshot?: (manager: GameManagerActuatePersistenceManagerLike) => void;
  isTerminalSessionForPersistence?: (manager: GameManagerActuatePersistenceManagerLike) => boolean;
  saveGameState?: (manager: GameManagerActuatePersistenceManagerLike) => void;
}

export interface GameManagerActuatePersistenceRuntime {
  finalizeActuatePersistence: typeof finalizeActuatePersistence;
}

export interface GameManagerActuatePersistenceWindowLike {
  CoreGameManagerActuatePersistenceRuntime?: GameManagerActuatePersistenceRuntime;
}

export interface GameManagerActuatePersistenceRuntimeInstallOptions {
  windowLike?: GameManagerActuatePersistenceWindowLike | null;
}

function shouldFinalizeAsTerminated(
  manager: GameManagerActuatePersistenceManagerLike,
  operations: GameManagerActuatePersistenceOperations
): boolean {
  return (
    manager.modeKey !== "practice" &&
    (!!manager.over || !!operations.isTerminalSessionForPersistence?.(manager))
  );
}

export function finalizeActuatePersistence(
  manager: GameManagerActuatePersistenceManagerLike | null | undefined,
  operations: GameManagerActuatePersistenceOperations = {}
): void | boolean | Promise<boolean> {
  if (!manager) return;
  if (operations.consumeSkipActuatePersistenceOnce?.(manager)) return;
  operations.publishSavedStateSyncSnapshot?.(manager);
  if (shouldFinalizeAsTerminated(manager, operations)) {
    const persistenceResult = manager.tryAutoSubmitOnGameOver?.();
    if (persistenceResult && typeof (persistenceResult as PromiseLike<unknown>).then === "function") {
      return Promise.resolve(persistenceResult).then(
        () => {
          manager.clearSavedGameState?.(manager.modeKey);
          return true;
        },
        () => false
      );
    }
    return false;
  }
  operations.saveGameState?.(manager);
}

export function createGameManagerActuatePersistenceRuntime(): GameManagerActuatePersistenceRuntime {
  return {
    finalizeActuatePersistence
  };
}

export function installGameManagerActuatePersistenceRuntime(
  options: GameManagerActuatePersistenceRuntimeInstallOptions = {}
): GameManagerActuatePersistenceRuntime | null {
  const target =
    options.windowLike === undefined
      ? typeof window === "undefined"
        ? null
        : (window as unknown as GameManagerActuatePersistenceWindowLike)
      : options.windowLike;
  if (!target) return null;
  if (!target.CoreGameManagerActuatePersistenceRuntime) {
    target.CoreGameManagerActuatePersistenceRuntime = createGameManagerActuatePersistenceRuntime();
  }
  return target.CoreGameManagerActuatePersistenceRuntime;
}
