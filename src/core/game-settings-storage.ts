interface StorageLike {
  getItem?(key: string): string | null;
  setItem?(key: string, value: string): unknown;
}

interface WindowLike {
  localStorage?: StorageLike | null;
}

type TimerModuleViewMode = "timer" | "hidden";

interface BuildLiteSavedGameStatePayloadInput {
  payload?: unknown;
  savedStateVersion?: unknown;
  modeKey?: unknown;
  width?: unknown;
  height?: unknown;
  ruleset?: unknown;
  score?: unknown;
  initialSeed?: unknown;
  seed?: unknown;
  durationMs?: unknown;
  finalBoardMatrix?: unknown;
  initialBoardMatrix?: unknown;
  replayStartBoardMatrix?: unknown;
  practiceRestartBoardMatrix?: unknown;
  practiceRestartModeConfig?: unknown;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function resolveLocalStorage(windowLike: unknown): StorageLike | null {
  const win = windowLike as WindowLike | null | undefined;
  if (!win) return null;
  const storage = win.localStorage;
  if (!storage) return null;
  return storage;
}

function cloneBoardMatrix(value: unknown): number[][] | null {
  if (!Array.isArray(value)) return null;
  const out: number[][] = [];
  for (let y = 0; y < value.length; y++) {
    const row = value[y];
    if (!Array.isArray(row)) return null;
    out.push(row.slice() as number[]);
  }
  return out;
}

function safeClonePlain<T>(value: T, fallback: T): T {
  try {
    return JSON.parse(JSON.stringify(value)) as T;
  } catch (_err) {
    return fallback;
  }
}

export function resolveSavedGameStateStorageKey(options: {
  modeKey?: unknown;
  currentModeKey?: unknown;
  currentMode?: unknown;
  defaultModeKey?: unknown;
  keyPrefix?: unknown;
}): string {
  const opts = options || {};
  const modeKey =
    typeof opts.modeKey === "string" && opts.modeKey
      ? opts.modeKey
      : typeof opts.currentModeKey === "string" && opts.currentModeKey
        ? opts.currentModeKey
        : typeof opts.currentMode === "string" && opts.currentMode
          ? opts.currentMode
          : typeof opts.defaultModeKey === "string" && opts.defaultModeKey
            ? opts.defaultModeKey
            : "";
  const keyPrefix = typeof opts.keyPrefix === "string" ? opts.keyPrefix : "";
  return keyPrefix + modeKey;
}

export function shouldUseSavedGameStateFromContext(options: {
  hasWindow?: unknown;
  replayMode?: unknown;
  pathname?: unknown;
}): boolean {
  const opts = options || {};
  if (opts.hasWindow === false) return false;
  if (opts.replayMode) return false;
  const path = typeof opts.pathname === "string" ? opts.pathname : "";
  if (path.indexOf("replay.html") !== -1) return false;
  return true;
}

export function buildLiteSavedGameStatePayload(
  input: BuildLiteSavedGameStatePayloadInput
): Record<string, unknown> | null {
  const opts = input || {};
  const payload = isObjectRecord(opts.payload) ? opts.payload : null;
  if (!payload) return null;

  const savedStateVersion = Number(opts.savedStateVersion);
  if (!Number.isInteger(savedStateVersion)) return null;

  const fallbackModeKey = opts.modeKey;
  const fallbackWidth = Number(opts.width);
  const fallbackHeight = Number(opts.height);
  const fallbackRuleset = opts.ruleset;
  const fallbackScore = opts.score;
  const fallbackInitialSeed = opts.initialSeed;
  const fallbackSeed = opts.seed;
  const fallbackDurationMs = Number(opts.durationMs);

  const fallbackFinalBoard = cloneBoardMatrix(opts.finalBoardMatrix) || [];
  const board = cloneBoardMatrix(payload.board) || fallbackFinalBoard;
  const initialBoardMatrix =
    cloneBoardMatrix(payload.initial_board_matrix) ||
    cloneBoardMatrix(opts.initialBoardMatrix) ||
    fallbackFinalBoard;
  const replayStartBoardMatrix =
    cloneBoardMatrix(payload.replay_start_board_matrix) ||
    cloneBoardMatrix(opts.replayStartBoardMatrix) ||
    null;
  const practiceRestartBoardMatrix =
    cloneBoardMatrix(payload.practice_restart_board_matrix) ||
    cloneBoardMatrix(opts.practiceRestartBoardMatrix) ||
    null;

  const hasPayloadPracticeModeConfig =
    payload.practice_restart_mode_config !== undefined &&
    payload.practice_restart_mode_config !== null;
  const hasFallbackPracticeModeConfig =
    opts.practiceRestartModeConfig !== undefined && opts.practiceRestartModeConfig !== null;
  const practiceRestartModeConfig = hasPayloadPracticeModeConfig
    ? safeClonePlain(payload.practice_restart_mode_config, null)
    : hasFallbackPracticeModeConfig
      ? safeClonePlain(opts.practiceRestartModeConfig, null)
      : null;

  return {
    v: savedStateVersion,
    saved_at: Number(payload.saved_at) || Date.now(),
    terminated: false,
    mode_key: payload.mode_key || fallbackModeKey,
    board_width: Number(payload.board_width) || fallbackWidth,
    board_height: Number(payload.board_height) || fallbackHeight,
    ruleset: payload.ruleset || fallbackRuleset,
    board,
    score: Number.isInteger(payload.score) ? payload.score : fallbackScore,
    over: !!payload.over,
    won: !!payload.won,
    keep_playing: !!payload.keep_playing,
    initial_seed: Number.isFinite(Number(payload.initial_seed))
      ? Number(payload.initial_seed)
      : fallbackInitialSeed,
    seed: Number.isFinite(Number(payload.seed)) ? Number(payload.seed) : fallbackSeed,
    ips_input_count:
      Number.isInteger(payload.ips_input_count) && Number(payload.ips_input_count) >= 0
        ? Number(payload.ips_input_count)
        : 0,
    timer_status: payload.timer_status === 1 ? 1 : 0,
    duration_ms: Number.isFinite(Number(payload.duration_ms))
      ? Math.floor(Number(payload.duration_ms))
      : Number.isFinite(fallbackDurationMs)
        ? Math.floor(fallbackDurationMs)
        : 0,
    has_game_started: !!payload.has_game_started,
    initial_board_matrix: initialBoardMatrix,
    replay_start_board_matrix: replayStartBoardMatrix,
    practice_restart_board_matrix: practiceRestartBoardMatrix,
    practice_restart_mode_config: practiceRestartModeConfig,
    move_history: [],
    undo_stack: [],
    replay_compact_log: "",
    session_replay_v3: null,
    spawn_value_counts: {},
    reached_32k: !!payload.reached_32k,
    capped_milestone_count: Number.isInteger(payload.capped_milestone_count)
      ? Number(payload.capped_milestone_count)
      : 0,
    capped64_unlocked: null,
    combo_streak: Number.isInteger(payload.combo_streak) ? Number(payload.combo_streak) : 0,
    successful_move_count: Number.isInteger(payload.successful_move_count)
      ? Number(payload.successful_move_count)
      : 0,
    undo_used: Number.isInteger(payload.undo_used) ? Number(payload.undo_used) : 0,
    lock_consumed_at_move_count: Number.isInteger(payload.lock_consumed_at_move_count)
      ? Number(payload.lock_consumed_at_move_count)
      : -1,
    locked_direction_turn: Number.isInteger(payload.locked_direction_turn)
      ? Number(payload.locked_direction_turn)
      : null,
    locked_direction: Number.isInteger(payload.locked_direction)
      ? Number(payload.locked_direction)
      : null,
    challenge_id: payload.challenge_id || null
  };
}

export function readStorageFlagFromContext(options: {
  windowLike?: unknown;
  key?: unknown;
  trueValue?: unknown;
}): boolean {
  const opts = options || {};
  const key = typeof opts.key === "string" ? opts.key : "";
  const trueValue = typeof opts.trueValue === "string" ? opts.trueValue : "1";
  if (!key) return false;
  const storage = resolveLocalStorage(opts.windowLike);
  if (!storage || typeof storage.getItem !== "function") return false;
  try {
    return storage.getItem(key) === trueValue;
  } catch (_err) {
    return false;
  }
}

export function writeStorageFlagFromContext(options: {
  windowLike?: unknown;
  key?: unknown;
  enabled?: unknown;
  trueValue?: unknown;
  falseValue?: unknown;
}): boolean {
  const opts = options || {};
  const key = typeof opts.key === "string" ? opts.key : "";
  const trueValue = typeof opts.trueValue === "string" ? opts.trueValue : "1";
  const falseValue = typeof opts.falseValue === "string" ? opts.falseValue : "0";
  if (!key) return false;
  const storage = resolveLocalStorage(opts.windowLike);
  if (!storage || typeof storage.setItem !== "function") return false;
  const value = opts.enabled ? trueValue : falseValue;
  try {
    storage.setItem(key, value);
    return true;
  } catch (_err) {
    return false;
  }
}

export function readStorageJsonMapFromContext(options: {
  windowLike?: unknown;
  key?: unknown;
}): Record<string, unknown> {
  const opts = options || {};
  const key = typeof opts.key === "string" ? opts.key : "";
  if (!key) return {};
  const storage = resolveLocalStorage(opts.windowLike);
  if (!storage || typeof storage.getItem !== "function") return {};
  try {
    const raw = storage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return isObjectRecord(parsed) ? parsed : {};
  } catch (_err) {
    return {};
  }
}

export function writeStorageJsonMapFromContext(options: {
  windowLike?: unknown;
  key?: unknown;
  map?: unknown;
}): boolean {
  const opts = options || {};
  const key = typeof opts.key === "string" ? opts.key : "";
  if (!key) return false;
  const storage = resolveLocalStorage(opts.windowLike);
  if (!storage || typeof storage.setItem !== "function") return false;
  const map = isObjectRecord(opts.map) ? opts.map : {};
  try {
    storage.setItem(key, JSON.stringify(map));
    return true;
  } catch (_err) {
    return false;
  }
}

export function writeStorageJsonPayloadFromContext(options: {
  windowLike?: unknown;
  key?: unknown;
  payload?: unknown;
}): boolean {
  const opts = options || {};
  const key = typeof opts.key === "string" ? opts.key : "";
  if (!key) return false;
  const storage = resolveLocalStorage(opts.windowLike);
  if (!storage || typeof storage.setItem !== "function") return false;
  try {
    const serialized = JSON.stringify(opts.payload);
    if (typeof serialized !== "string") return false;
    storage.setItem(key, serialized);
    return true;
  } catch (_err) {
    return false;
  }
}

function normalizeTimerModuleViewModeFromUnknown(value: unknown): TimerModuleViewMode {
  return value === "hidden" ? "hidden" : "timer";
}

export function normalizeTimerModuleViewMode(value: unknown): TimerModuleViewMode {
  return normalizeTimerModuleViewModeFromUnknown(value);
}

export function readTimerModuleViewForModeFromMap(options: {
  map?: unknown;
  mode?: unknown;
}): TimerModuleViewMode {
  const opts = options || {};
  const map = isObjectRecord(opts.map) ? opts.map : {};
  const mode = typeof opts.mode === "string" ? opts.mode : "";
  if (!mode) return "timer";
  return normalizeTimerModuleViewModeFromUnknown(map[mode]);
}

export function writeTimerModuleViewForModeToMap(options: {
  map?: unknown;
  mode?: unknown;
  view?: unknown;
}): Record<string, unknown> {
  const opts = options || {};
  const map = isObjectRecord(opts.map) ? { ...opts.map } : {};
  const mode = typeof opts.mode === "string" ? opts.mode : "";
  if (!mode) return map;
  map[mode] = normalizeTimerModuleViewModeFromUnknown(opts.view);
  return map;
}

export function readUndoEnabledForModeFromMap(options: {
  map?: unknown;
  mode?: unknown;
  fallbackEnabled?: unknown;
}): boolean {
  const opts = options || {};
  const map = isObjectRecord(opts.map) ? opts.map : {};
  const mode = typeof opts.mode === "string" ? opts.mode : "";
  const fallbackEnabled = opts.fallbackEnabled !== false;
  if (!mode) return fallbackEnabled;
  if (!Object.prototype.hasOwnProperty.call(map, mode)) return fallbackEnabled;
  return !!map[mode];
}

export function writeUndoEnabledForModeToMap(options: {
  map?: unknown;
  mode?: unknown;
  enabled?: unknown;
}): Record<string, unknown> {
  const opts = options || {};
  const map = isObjectRecord(opts.map) ? { ...opts.map } : {};
  const mode = typeof opts.mode === "string" ? opts.mode : "";
  if (!mode) return map;
  map[mode] = !!opts.enabled;
  return map;
}
