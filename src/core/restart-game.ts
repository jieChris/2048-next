export interface RestartGameManagerLike {
  modeKey?: unknown;
  modeConfig?: unknown;
  practiceRestartBoardMatrix?: unknown;
  practiceRestartModeConfig?: unknown;
  isTestMode?: boolean;
  actuator?: {
    continue?: () => void;
  } | null;
  setRuntimeUndoStack?: (stack: unknown[]) => void;
  setRuntimeRedoStack?: (stack: unknown[]) => void;
  clearSavedGameState?: (modeKey: unknown) => void;
  setup?: (seed?: unknown, options?: unknown) => void;
}

export interface RestartGameOperations {
  confirmRestart?: (message: string) => boolean;
  resolveRestartConfirmMessage?: (manager: RestartGameManagerLike) => string;
  shouldClearPracticeBoardOnRestart?: (manager: RestartGameManagerLike) => boolean;
  createEmptyPracticeBoardMatrix?: (manager: RestartGameManagerLike) => unknown;
  restartWithBoard?: (
    manager: RestartGameManagerLike,
    board: unknown,
    modeConfig: unknown,
    options: Record<string, boolean>
  ) => void;
}

export interface RestartGameRuntime {
  restartGame: typeof restartGame;
  createFallbackFreshSetupSeed: typeof createFallbackFreshSetupSeed;
}

export interface RestartGameWindowLike {
  CoreRestartGameRuntime?: RestartGameRuntime;
}

export interface RestartGameRuntimeInstallOptions {
  windowLike?: RestartGameWindowLike | null;
}

function getPracticeModeConfig(manager: RestartGameManagerLike): unknown {
  return manager.practiceRestartModeConfig || manager.modeConfig;
}

export interface FallbackFreshSetupSeedInput {
  nowMs?: unknown;
  performanceNowMicros?: unknown;
  counter?: unknown;
}

function normalizeSeedMixInteger(value: unknown): number {
  const normalized = Math.floor(Number(value) || 0);
  return Number.isFinite(normalized) && normalized > 0 ? normalized : 0;
}

export function createFallbackFreshSetupSeed(input: FallbackFreshSetupSeedInput): number {
  const now = Math.max(0, normalizeSeedMixInteger(input.nowMs));
  const perfNow = Math.max(0, normalizeSeedMixInteger(input.performanceNowMicros));
  const counter = Math.max(0, normalizeSeedMixInteger(input.counter));
  const mixedHigh = Math.imul((now >>> 0) ^ (counter >>> 0), 2654435761) >>> 0;
  const mixedLow = Math.imul((perfNow >>> 0) ^ ((counter * 2246822519) >>> 0), 3266489917) >>> 0;
  const high =
    (mixedHigh ^ (Math.floor(now / 4294967296) & 2097151) ^ (perfNow & 2097151) ^ (counter & 2097151)) &
    2097151;
  const low =
    (mixedLow ^ (now >>> 0) ^ ((perfNow * 2654435761) >>> 0) ^ ((counter * 2246822519) >>> 0)) >>> 0;
  return high * 4294967296 + low;
}

function restartPracticeGame(manager: RestartGameManagerLike, operations: RestartGameOperations): boolean {
  if (!(manager.modeKey === "practice" && manager.practiceRestartBoardMatrix)) return false;
  if (operations.shouldClearPracticeBoardOnRestart?.(manager)) {
    operations.restartWithBoard?.(
      manager,
      operations.createEmptyPracticeBoardMatrix?.(manager),
      getPracticeModeConfig(manager),
      { setPracticeRestartBase: true }
    );
    manager.isTestMode = true;
    return true;
  }
  operations.restartWithBoard?.(
    manager,
    manager.practiceRestartBoardMatrix,
    getPracticeModeConfig(manager),
    { preservePracticeRestartBase: true }
  );
  manager.isTestMode = true;
  return true;
}

export function restartGame(
  manager: RestartGameManagerLike | null | undefined,
  operations: RestartGameOperations = {}
): void {
  if (!manager) return;
  const message = operations.resolveRestartConfirmMessage?.(manager) || "";
  if (operations.confirmRestart?.(message) !== true) return;
  manager.actuator?.continue?.();
  manager.setRuntimeUndoStack?.([]);
  manager.setRuntimeRedoStack?.([]);
  manager.clearSavedGameState?.(manager.modeKey);
  if (restartPracticeGame(manager, operations)) return;
  manager.setup?.(undefined, { disableStateRestore: true });
}

export function createRestartGameRuntime(): RestartGameRuntime {
  return {
    restartGame,
    createFallbackFreshSetupSeed
  };
}

export function installRestartGameRuntime(
  options: RestartGameRuntimeInstallOptions = {}
): RestartGameRuntime | null {
  const target =
    options.windowLike === undefined
      ? typeof window === "undefined"
        ? null
        : (window as unknown as RestartGameWindowLike)
      : options.windowLike;
  if (!target) return null;
  if (!target.CoreRestartGameRuntime) {
    target.CoreRestartGameRuntime = createRestartGameRuntime();
  }
  return target.CoreRestartGameRuntime;
}
