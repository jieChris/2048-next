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

export interface LegacySecondaryTimerSubState {
  timer_sub_8192: string;
  timer_sub_16384: string;
  timer_sub_visible: boolean;
}

export interface SavedTimerSubStateInput {
  secondaryRows?: unknown;
  expandedParents?: unknown;
}

export interface SavedTimerSubState extends LegacySecondaryTimerSubState {
  timer_secondary_rows: unknown[];
  timer_secondary_expanded_parents: unknown[];
}

export interface SavedManagerTimerStateRuntime {
  applySavedManagerTimerState: typeof applySavedManagerTimerState;
  buildSavedTimerSubState: typeof buildSavedTimerSubState;
  resolveLegacySecondaryTimerSubStateFromRows: typeof resolveLegacySecondaryTimerSubStateFromRows;
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

function isNonArrayObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function resolveLegacySecondaryTimerSubStateFromRows(
  rows: unknown
): LegacySecondaryTimerSubState {
  const state: LegacySecondaryTimerSubState = {
    timer_sub_8192: "",
    timer_sub_16384: "",
    timer_sub_visible: false
  };
  const list = Array.isArray(rows) ? rows : [];
  for (const row of list) {
    if (!isNonArrayObject(row) || Number(row.parent) !== 32768) continue;
    const child = Number(row.child);
    if (child === 8192) {
      state.timer_sub_8192 = typeof row.time === "string" ? row.time : "";
    } else if (child === 16384) {
      state.timer_sub_16384 = typeof row.time === "string" ? row.time : "";
    } else {
      continue;
    }
    if (row.display === "block") state.timer_sub_visible = true;
  }
  return state;
}

export function buildSavedTimerSubState(input: SavedTimerSubStateInput): SavedTimerSubState {
  const secondaryRows = Array.isArray(input.secondaryRows) ? input.secondaryRows : [];
  const expandedParents = Array.isArray(input.expandedParents) ? input.expandedParents : [];
  const legacyState = resolveLegacySecondaryTimerSubStateFromRows(secondaryRows);
  return {
    timer_secondary_rows: secondaryRows,
    timer_secondary_expanded_parents: expandedParents,
    timer_sub_8192: legacyState.timer_sub_8192,
    timer_sub_16384: legacyState.timer_sub_16384,
    timer_sub_visible: legacyState.timer_sub_visible
  };
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
    applySavedManagerTimerState,
    buildSavedTimerSubState,
    resolveLegacySecondaryTimerSubStateFromRows
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
