export interface GameManagerTimerTickElementLike {
  textContent?: string;
  style?: {
    display?: string;
  };
}

export interface GameManagerTimerTickManagerLike {
  startTime?: {
    getTime?: () => number;
  } | null;
  time?: number;
  pretty?: (time: number) => string;
  updateStatsPanel?: () => void;
  lastStatsPanelUpdateAt?: number;
}

export interface GameManagerTimerTickOperations {
  checkAndHandleMoveTimeout?: (manager: GameManagerTimerTickManagerLike, nowMs: number) => boolean;
  resolveTimerElapsedMs: (manager: GameManagerTimerTickManagerLike, nowMs: number) => number;
  resolveManagerElementById: (
    manager: GameManagerTimerTickManagerLike,
    elementId: string
  ) => GameManagerTimerTickElementLike | null | undefined;
  updateMoveTimeoutHud?: (manager: GameManagerTimerTickManagerLike, nowMs: number) => void;
  refreshIpsDisplay: (manager: GameManagerTimerTickManagerLike, time: number) => void;
  shouldUpdateStatsPanelAtTimerTick: (
    manager: GameManagerTimerTickManagerLike,
    overlay: GameManagerTimerTickElementLike | null | undefined,
    time: number
  ) => boolean;
}

export interface GameManagerTimerTickRuntime {
  executeTimerTick: typeof executeTimerTick;
}

export interface GameManagerTimerTickWindowLike {
  CoreGameManagerTimerTickRuntime?: GameManagerTimerTickRuntime;
}

export interface GameManagerTimerTickRuntimeInstallOptions {
  windowLike?: GameManagerTimerTickWindowLike | null;
}

export function executeTimerTick(
  manager: GameManagerTimerTickManagerLike | null | undefined,
  operations: GameManagerTimerTickOperations,
  nowMs = Date.now()
): void {
  if (!(manager?.startTime && typeof manager.startTime.getTime === "function")) return;
  if (operations.checkAndHandleMoveTimeout?.(manager, nowMs)) return;
  const time = operations.resolveTimerElapsedMs(manager, nowMs);
  manager.time = time;
  const timerEl = operations.resolveManagerElementById(manager, "timer");
  if (timerEl && typeof manager.pretty === "function") timerEl.textContent = manager.pretty(time);
  operations.updateMoveTimeoutHud?.(manager, nowMs);
  operations.refreshIpsDisplay(manager, time);
  const overlay = operations.resolveManagerElementById(manager, "stats-panel-overlay");
  if (!operations.shouldUpdateStatsPanelAtTimerTick(manager, overlay, time)) return;
  manager.updateStatsPanel?.();
  manager.lastStatsPanelUpdateAt = time;
}

export function createGameManagerTimerTickRuntime(): GameManagerTimerTickRuntime {
  return {
    executeTimerTick
  };
}

export function installGameManagerTimerTickRuntime(
  options: GameManagerTimerTickRuntimeInstallOptions = {}
): GameManagerTimerTickRuntime | null {
  const target =
    options.windowLike === undefined
      ? typeof window === "undefined"
        ? null
        : (window as unknown as GameManagerTimerTickWindowLike)
      : options.windowLike;
  if (!target) return null;
  if (!target.CoreGameManagerTimerTickRuntime) {
    target.CoreGameManagerTimerTickRuntime = createGameManagerTimerTickRuntime();
  }
  return target.CoreGameManagerTimerTickRuntime;
}
