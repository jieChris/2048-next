export interface SavedManagerTimerStateManagerLike {
  accumulatedTime?: number;
  time?: number;
  startTime?: Date | null;
  timerStatus?: number;
  timerFrozen?: boolean;
  timerElapsedOffsetMs?: number | null;
  timerAnchorLocalMs?: number | null;
  timerAnchorServerMs?: number | null;
}

export interface SavedManagerTimerStateSavedLike {
  duration_ms?: unknown;
  timer_started_at_ms?: unknown;
  timer_elapsed_offset_ms?: unknown;
  timer_anchor_local_ms?: unknown;
  timer_anchor_server_ms?: unknown;
  over?: unknown;
  won?: unknown;
  keep_playing?: unknown;
  timer_status?: unknown;
  timer_frozen?: unknown;
}

export interface SavedManagerTimerStateRuntime {
  applySavedManagerTimerState: typeof applySavedManagerTimerState;
}

export interface SavedManagerTimerStateWindowLike {
  CoreSavedManagerTimerStateRuntime?: SavedManagerTimerStateRuntime;
}

export interface SavedManagerTimerStateRuntimeInstallOptions {
  windowLike?: SavedManagerTimerStateWindowLike | null;
}

function resolveActiveTimerDuration(saved: SavedManagerTimerStateSavedLike): number {
  let savedDurationMs =
    Number.isFinite(saved.duration_ms as number) && Number(saved.duration_ms) >= 0
      ? Math.floor(Number(saved.duration_ms))
      : 0;
  const savedStartedAtMs = Number(saved.timer_started_at_ms);
  const savedElapsedOffsetMs = Number(saved.timer_elapsed_offset_ms);
  const savedAnchorLocalMs = Number(saved.timer_anchor_local_ms);
  const isTerminatedTimerState = !!(saved.over || (saved.won && !saved.keep_playing));
  const isActiveTimer = saved.timer_status === 1 && !isTerminatedTimerState && !saved.timer_frozen;
  const hasAnchor = Number.isFinite(savedAnchorLocalMs) && savedAnchorLocalMs >= 0;
  const hasOffset = Number.isFinite(savedElapsedOffsetMs) && savedElapsedOffsetMs >= 0;

  if (isActiveTimer && hasAnchor) {
    const anchorDurationMs =
      (hasOffset ? Math.floor(savedElapsedOffsetMs) : 0) +
      Math.max(0, Date.now() - Math.floor(savedAnchorLocalMs));
    if (Number.isFinite(anchorDurationMs) && anchorDurationMs >= 0) {
      savedDurationMs = Math.max(savedDurationMs, Math.floor(anchorDurationMs));
    }
  }

  if (isActiveTimer && Number.isFinite(savedStartedAtMs) && savedStartedAtMs > 0) {
    savedDurationMs = Math.max(savedDurationMs, Date.now() - Math.floor(savedStartedAtMs));
  }

  return savedDurationMs;
}

export function applySavedManagerTimerState(
  manager: SavedManagerTimerStateManagerLike | null | undefined,
  saved: SavedManagerTimerStateSavedLike
): void {
  if (!manager) return;
  const isTerminatedTimerState = !!(saved.over || (saved.won && !saved.keep_playing));
  const isActiveTimer = saved.timer_status === 1 && !isTerminatedTimerState && !saved.timer_frozen;
  const savedDurationMs = resolveActiveTimerDuration(saved);
  const savedElapsedOffsetMs = Number(saved.timer_elapsed_offset_ms);
  const savedAnchorLocalMs = Number(saved.timer_anchor_local_ms);
  const savedAnchorServerMs = Number(saved.timer_anchor_server_ms);

  manager.accumulatedTime = savedDurationMs;
  manager.time = manager.accumulatedTime;
  manager.startTime = null;
  manager.timerStatus = 0;
  manager.timerFrozen = !!saved.timer_frozen;
  manager.timerElapsedOffsetMs =
    isActiveTimer && Number.isFinite(savedElapsedOffsetMs) && savedElapsedOffsetMs >= 0
      ? Math.floor(savedElapsedOffsetMs)
      : savedDurationMs;
  manager.timerAnchorLocalMs =
    isActiveTimer && Number.isFinite(savedAnchorLocalMs) && savedAnchorLocalMs >= 0
      ? Math.floor(savedAnchorLocalMs)
      : null;
  manager.timerAnchorServerMs =
    isActiveTimer && Number.isFinite(savedAnchorServerMs) && savedAnchorServerMs >= 0
      ? Math.floor(savedAnchorServerMs)
      : null;
}

export function createSavedManagerTimerStateRuntime(): SavedManagerTimerStateRuntime {
  return {
    applySavedManagerTimerState
  };
}

export function installSavedManagerTimerStateRuntime(
  options: SavedManagerTimerStateRuntimeInstallOptions = {}
): SavedManagerTimerStateRuntime | null {
  const target =
    options.windowLike === undefined
      ? typeof window === "undefined"
        ? null
        : (window as unknown as SavedManagerTimerStateWindowLike)
      : options.windowLike;
  if (!target) return null;
  if (!target.CoreSavedManagerTimerStateRuntime) {
    target.CoreSavedManagerTimerStateRuntime = createSavedManagerTimerStateRuntime();
  }
  return target.CoreSavedManagerTimerStateRuntime;
}
