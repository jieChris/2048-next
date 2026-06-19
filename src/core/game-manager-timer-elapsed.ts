export interface GameManagerTimerElapsedManager {
  timerAnchorServerMs?: unknown;
  timerAnchorLocalMs?: unknown;
  timerElapsedOffsetMs?: unknown;
  accumulatedTime?: unknown;
  timerStatus?: unknown;
  startTime?: {
    getTime?: () => unknown;
  } | null;
}

export interface GameManagerTimerElapsedOperations {
  resolveTimerElapsedOffsetMs: (manager: GameManagerTimerElapsedManager) => number;
  resolveTimerServerNowMs: (
    manager: GameManagerTimerElapsedManager,
    nowMs: number
  ) => number | null;
}

export interface GameManagerTimerElapsedRuntime {
  resolveTimerElapsedMs: typeof resolveTimerElapsedMs;
}

export interface GameManagerTimerElapsedWindowLike {
  CoreGameManagerTimerElapsedRuntime?: GameManagerTimerElapsedRuntime;
}

export interface GameManagerTimerElapsedRuntimeInstallOptions {
  windowLike?: GameManagerTimerElapsedWindowLike | null;
}

function normalizeTimerAnchorMs(value: unknown): number | null {
  const ms = Number(value);
  if (!Number.isFinite(ms) || ms < 0) return null;
  return Math.floor(ms);
}

function clampElapsedMs(value: number): number {
  return Math.max(0, Math.floor(value));
}

export function resolveTimerElapsedMs(
  manager: GameManagerTimerElapsedManager | null | undefined,
  nowMs: number,
  operations: GameManagerTimerElapsedOperations
): number {
  if (!manager) return 0;
  const anchorServerMs = normalizeTimerAnchorMs(manager.timerAnchorServerMs);
  if (anchorServerMs !== null) {
    const serverNowMs = operations.resolveTimerServerNowMs(manager, nowMs);
    if (serverNowMs !== null) {
      const offsetMs = operations.resolveTimerElapsedOffsetMs(manager);
      return clampElapsedMs(offsetMs + Math.max(0, serverNowMs - anchorServerMs));
    }
  }
  const anchorLocalMs = normalizeTimerAnchorMs(manager.timerAnchorLocalMs);
  if (anchorLocalMs !== null) {
    const offsetMs = operations.resolveTimerElapsedOffsetMs(manager);
    return clampElapsedMs(offsetMs + Math.max(0, nowMs - anchorLocalMs));
  }
  if (
    manager.timerStatus === 1 &&
    manager.startTime &&
    typeof manager.startTime.getTime === "function"
  ) {
    return clampElapsedMs(nowMs - Number(manager.startTime.getTime()));
  }
  return operations.resolveTimerElapsedOffsetMs(manager);
}

export function createGameManagerTimerElapsedRuntime(): GameManagerTimerElapsedRuntime {
  return {
    resolveTimerElapsedMs
  };
}

export function installGameManagerTimerElapsedRuntime(
  options: GameManagerTimerElapsedRuntimeInstallOptions = {}
): GameManagerTimerElapsedRuntime | null {
  const target =
    options.windowLike === undefined
      ? typeof window === "undefined"
        ? null
        : (window as unknown as GameManagerTimerElapsedWindowLike)
      : options.windowLike;
  if (!target) return null;
  if (!target.CoreGameManagerTimerElapsedRuntime) {
    target.CoreGameManagerTimerElapsedRuntime = createGameManagerTimerElapsedRuntime();
  }
  return target.CoreGameManagerTimerElapsedRuntime;
}
