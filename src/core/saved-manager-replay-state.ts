export interface SavedManagerReplayStateManagerLike {
  moveHistory?: unknown[];
  ipsInputTimes?: unknown[];
  ipsInputCount?: number;
  undoStack?: unknown[];
  redoStack?: unknown[];
  replayCompactLog?: string;
  rescueReplayString?: string;
  sessionReplayV1?: unknown;
  sessionReplayV3?: unknown;
  spawnValueCounts?: Record<string, unknown>;
  spawnTwos?: unknown;
  spawnFours?: unknown;
  clonePlain?: (value: unknown) => unknown;
  safeClonePlain?: (value: unknown, fallbackValue?: unknown) => unknown;
  setRuntimeUndoStack?: (value: unknown[]) => void;
  setRuntimeRedoStack?: (value: unknown[]) => void;
}

export interface SavedManagerReplayStateSavedLike {
  move_history?: unknown;
  ips_input_count?: unknown;
  undo_stack?: unknown;
  redo_stack?: unknown;
  replay_compact_log?: unknown;
  replay_string?: unknown;
  session_replay_v1?: unknown;
  session_replay_v3?: unknown;
  spawn_value_counts?: unknown;
}

export interface SavedManagerReplayStateOperations {
  shouldRestoreSavedStateUndoHistory?: (manager: SavedManagerReplayStateManagerLike) => boolean;
  normalizeSavedReplayV1Session?: (
    manager: SavedManagerReplayStateManagerLike,
    session: unknown
  ) => unknown;
}

export interface SavedManagerReplayStateRuntime {
  applySavedManagerReplayState: typeof applySavedManagerReplayState;
}

export interface SavedManagerReplayStateWindowLike {
  CoreSavedManagerReplayStateRuntime?: SavedManagerReplayStateRuntime;
}

export interface SavedManagerReplayStateRuntimeInstallOptions {
  windowLike?: SavedManagerReplayStateWindowLike | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function clonePlain(manager: SavedManagerReplayStateManagerLike, value: unknown): unknown {
  if (typeof manager.clonePlain === "function") {
    return manager.clonePlain(value);
  }
  if (typeof manager.safeClonePlain === "function") {
    return manager.safeClonePlain(value, value);
  }
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (_err) {
    return value;
  }
}

function cloneReplayV1SessionFallback(
  manager: SavedManagerReplayStateManagerLike,
  session: unknown
): unknown {
  if (!isRecord(session)) return null;
  const cloned = clonePlain(manager, session);
  if (!isRecord(cloned)) return null;
  if (!Array.isArray(cloned.init_tiles) || !Array.isArray(cloned.records)) return null;
  if (!Number.isInteger(cloned.board_width) || !Number.isInteger(cloned.board_height)) return null;
  const lastEventAtMs = Number(cloned.last_event_at_ms);
  cloned.last_event_at_ms =
    Number.isFinite(lastEventAtMs) && lastEventAtMs >= 0 ? Math.floor(lastEventAtMs) : Date.now();
  cloned.supported = cloned.supported !== false;
  return cloned;
}

function setUndoStack(manager: SavedManagerReplayStateManagerLike, value: unknown[]): void {
  if (typeof manager.setRuntimeUndoStack === "function") {
    manager.setRuntimeUndoStack(value);
    return;
  }
  manager.undoStack = value;
}

function setRedoStack(manager: SavedManagerReplayStateManagerLike, value: unknown[]): void {
  if (typeof manager.setRuntimeRedoStack === "function") {
    manager.setRuntimeRedoStack(value);
    return;
  }
  manager.redoStack = value;
}

export function applySavedManagerReplayState(
  manager: SavedManagerReplayStateManagerLike | null | undefined,
  saved: SavedManagerReplayStateSavedLike,
  operations: SavedManagerReplayStateOperations = {}
): void {
  if (!manager) return;
  manager.moveHistory = Array.isArray(saved.move_history) ? saved.move_history.slice() : [];
  manager.ipsInputTimes = [];
  manager.ipsInputCount =
    Number.isInteger(saved.ips_input_count) && Number(saved.ips_input_count) >= 0
      ? Number(saved.ips_input_count)
      : manager.moveHistory.length;

  if (operations.shouldRestoreSavedStateUndoHistory?.(manager)) {
    setUndoStack(manager, Array.isArray(saved.undo_stack) ? saved.undo_stack.slice() : []);
    setRedoStack(manager, Array.isArray(saved.redo_stack) ? saved.redo_stack.slice() : []);
  } else {
    setUndoStack(manager, []);
    setRedoStack(manager, []);
  }

  manager.replayCompactLog =
    typeof saved.replay_compact_log === "string" ? saved.replay_compact_log : "";
  const savedReplayString = typeof saved.replay_string === "string" ? saved.replay_string.trim() : "";
  if (savedReplayString) manager.rescueReplayString = savedReplayString;
  else if (typeof manager.rescueReplayString !== "string") manager.rescueReplayString = "";

  const savedSessionReplayV1 = (
    operations.normalizeSavedReplayV1Session || cloneReplayV1SessionFallback
  )(manager, saved.session_replay_v1);
  if (savedSessionReplayV1) {
    manager.sessionReplayV1 = savedSessionReplayV1;
  } else if (
    !manager.sessionReplayV1 &&
    Object.prototype.hasOwnProperty.call(saved, "session_replay_v1")
  ) {
    manager.sessionReplayV1 = null;
  }

  manager.sessionReplayV3 = isRecord(saved.session_replay_v3)
    ? clonePlain(manager, saved.session_replay_v3)
    : manager.sessionReplayV3;
  manager.spawnValueCounts = isRecord(saved.spawn_value_counts)
    ? (clonePlain(manager, saved.spawn_value_counts) as Record<string, unknown>)
    : {};
  manager.spawnTwos = manager.spawnValueCounts["2"] || 0;
  manager.spawnFours = manager.spawnValueCounts["4"] || 0;
}

export function createSavedManagerReplayStateRuntime(): SavedManagerReplayStateRuntime {
  return {
    applySavedManagerReplayState
  };
}

export function installSavedManagerReplayStateRuntime(
  options: SavedManagerReplayStateRuntimeInstallOptions = {}
): SavedManagerReplayStateRuntime | null {
  const target =
    options.windowLike === undefined
      ? typeof window === "undefined"
        ? null
        : (window as unknown as SavedManagerReplayStateWindowLike)
      : options.windowLike;
  if (!target) return null;
  if (!target.CoreSavedManagerReplayStateRuntime) {
    target.CoreSavedManagerReplayStateRuntime = createSavedManagerReplayStateRuntime();
  }
  return target.CoreSavedManagerReplayStateRuntime;
}
