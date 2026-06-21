export interface GameManagerTimerStartManagerLike {
  timerStatus?: number;
  hasGameStarted?: boolean;
  timerFrozen?: boolean;
  accumulatedTime?: number;
  time?: number;
  startTime?: Date;
  lastStatsPanelUpdateAt?: number;
  notifyUndoSettingsStateChanged?: () => void;
}

export interface GameManagerTimerStartOperations {
  ensureTimerAnchors: (manager: GameManagerTimerStartManagerLike, nowMs: number) => void;
  resolveTimerElapsedMs: (manager: GameManagerTimerStartManagerLike, nowMs: number) => number;
  bindTimerVisibilityChangeListener: (manager: GameManagerTimerStartManagerLike) => void;
  restartTimerIntervalWithCurrentSettings: (manager: GameManagerTimerStartManagerLike) => void;
  updateMoveTimeoutHud?: (manager: GameManagerTimerStartManagerLike, nowMs: number) => void;
}

export interface GameManagerTimerStartRuntime {
  startTimer: typeof startTimer;
}

export interface GameManagerTimerStartWindowLike {
  CoreGameManagerTimerStartRuntime?: GameManagerTimerStartRuntime;
}

export interface GameManagerTimerStartRuntimeInstallOptions {
  windowLike?: GameManagerTimerStartWindowLike | null;
}

export function startTimer(
  manager: GameManagerTimerStartManagerLike | null | undefined,
  operations: GameManagerTimerStartOperations,
  nowMs = Date.now()
): void {
  if (!manager || manager.timerStatus !== 0) return;
  operations.ensureTimerAnchors(manager, nowMs);
  const durationMs = operations.resolveTimerElapsedMs(manager, nowMs);
  manager.timerStatus = 1;
  manager.hasGameStarted = true;
  manager.timerFrozen = false;
  manager.accumulatedTime = durationMs;
  manager.time = durationMs;
  manager.startTime = new Date(nowMs - durationMs);
  manager.notifyUndoSettingsStateChanged?.();
  manager.lastStatsPanelUpdateAt = 0;
  operations.bindTimerVisibilityChangeListener(manager);
  operations.restartTimerIntervalWithCurrentSettings(manager);
  operations.updateMoveTimeoutHud?.(manager, nowMs);
}

export function createGameManagerTimerStartRuntime(): GameManagerTimerStartRuntime {
  return {
    startTimer
  };
}

export function installGameManagerTimerStartRuntime(
  options: GameManagerTimerStartRuntimeInstallOptions = {}
): GameManagerTimerStartRuntime | null {
  const target =
    options.windowLike === undefined
      ? typeof window === "undefined"
        ? null
        : (window as unknown as GameManagerTimerStartWindowLike)
      : options.windowLike;
  if (!target) return null;
  if (!target.CoreGameManagerTimerStartRuntime) {
    target.CoreGameManagerTimerStartRuntime = createGameManagerTimerStartRuntime();
  }
  return target.CoreGameManagerTimerStartRuntime;
}
