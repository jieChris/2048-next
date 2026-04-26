import { randomBase36 } from "../utils/crypto-random";

interface StorageLike {
  getItem?(key: string): string | null;
  setItem?(key: string, value: string): unknown;
  removeItem?(key: string): unknown;
}

interface WindowLike {
  localStorage?: StorageLike | null;
  sessionStorage?: StorageLike | null;
  navigator?: {
    userAgent?: string;
  } | null;
  name?: string;
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

function isMobileSafariUserAgent(userAgent: unknown): boolean {
  const ua = String(userAgent || "");
  if (!ua) return false;
  if (!/iPhone|iPad|iPod/i.test(ua)) return false;
  if (!/Safari/i.test(ua)) return false;
  if (/CriOS|FxiOS|EdgiOS|OPiOS|YaBrowser/i.test(ua)) return false;
  return true;
}

function resolveModeKey(options: {
  modeKey?: unknown;
  currentModeKey?: unknown;
  currentMode?: unknown;
  defaultModeKey?: unknown;
}): string {
  const opts = options || {};
  if (typeof opts.modeKey === "string" && opts.modeKey) return opts.modeKey;
  if (typeof opts.currentModeKey === "string" && opts.currentModeKey) return opts.currentModeKey;
  if (typeof opts.currentMode === "string" && opts.currentMode) return opts.currentMode;
  if (typeof opts.defaultModeKey === "string" && opts.defaultModeKey) return opts.defaultModeKey;
  return "";
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

function normalizeHistoryBoardMatrix(value: unknown): number[][] {
  if (!Array.isArray(value)) return [];
  return value.map((row) =>
    Array.isArray(row) ? row.map((cell) => Math.floor(Number(cell) || 0)) : []
  );
}

function normalizeInteger(value: unknown, fallback: number): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.floor(numeric) : fallback;
}

function normalizeNonNegativeInteger(value: unknown, fallback: number): number {
  return Math.max(0, normalizeInteger(value, fallback));
}

function normalizePositiveInteger(value: unknown, fallback: number): number {
  const normalized = normalizeInteger(value, fallback);
  return normalized > 0 ? normalized : fallback;
}

function normalizeHistoryOwnerKeyPart(value: unknown, maxLength: number): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.:@-]+/g, "_")
    .slice(0, maxLength);
}

function normalizeHistoryDiagnosticPayloadArrayValue(value: unknown, maxStringLength: number): string | number | boolean | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "boolean") return value;
  if (typeof value === "string" && value) {
    return value.slice(0, maxStringLength);
  }
  return null;
}

function normalizeHistoryDiagnosticPayloadArray(
  value: unknown,
  options: { maxArrayItems: number; maxStringLength: number }
): Array<string | number | boolean> {
  const source = Array.isArray(value) ? value : [];
  const out: Array<string | number | boolean> = [];
  for (let i = 0; i < source.length; i += 1) {
    if (out.length >= options.maxArrayItems) break;
    const normalized = normalizeHistoryDiagnosticPayloadArrayValue(source[i], options.maxStringLength);
    if (normalized === null) continue;
    out.push(normalized);
  }
  return out;
}

function normalizeHistoryDiagnosticPayloadValue(
  value: unknown,
  options: { maxArrayItems: number; maxStringLength: number }
): string | number | boolean | Array<string | number | boolean> | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    return value.slice(0, options.maxStringLength);
  }
  if (Array.isArray(value)) {
    return normalizeHistoryDiagnosticPayloadArray(value, options);
  }
  return null;
}

function normalizeHistoryDiagnosticPayload(
  payload: unknown,
  options: {
    maxPayloadKeys: number;
    keyMaxLength: number;
    maxArrayItems: number;
    maxStringLength: number;
  }
): Record<string, unknown> | null {
  if (!isObjectRecord(payload)) return null;
  const out: Record<string, unknown> = {};
  const keys = Object.keys(payload);
  let accepted = 0;
  for (let i = 0; i < keys.length; i += 1) {
    if (accepted >= options.maxPayloadKeys) break;
    const key = keys[i].slice(0, options.keyMaxLength);
    if (!key) continue;
    const value = normalizeHistoryDiagnosticPayloadValue(payload[keys[i]], options);
    if (value === null) continue;
    out[key] = value;
    accepted += 1;
  }
  return out;
}

export function normalizeHistoryOwnerMetaFromContext(options: {
  record?: unknown;
  authUserId?: unknown;
  authNickname?: unknown;
  keyPartMaxLength?: unknown;
}): Record<string, unknown> {
  const opts = options || {};
  const source = isObjectRecord(opts.record) ? opts.record : {};
  const keyPartMaxLength = normalizePositiveInteger(opts.keyPartMaxLength, 64);

  const ownerTypeRaw = typeof source.owner_type === "string" ? source.owner_type.trim().toLowerCase() : "";
  let ownerUserId =
    source.owner_user_id == null ? "" : String(source.owner_user_id).trim();
  let ownerNickname =
    source.owner_nickname == null ? "" : String(source.owner_nickname).trim();
  let ownerKey = typeof source.owner_key === "string" ? source.owner_key.trim() : "";

  if (!ownerTypeRaw && !ownerUserId && !ownerNickname) {
    ownerUserId = opts.authUserId == null ? "" : String(opts.authUserId).trim();
    ownerNickname = opts.authNickname == null ? "" : String(opts.authNickname).trim();
  }

  let ownerType: "guest" | "user" = ownerTypeRaw === "guest" ? "guest" : "user";
  if (!ownerUserId && !ownerNickname) ownerType = "guest";
  if (ownerType === "guest") {
    ownerUserId = "";
    ownerNickname = "";
  }

  if (!ownerKey) {
    if (ownerType === "guest") {
      ownerKey = "guest";
    } else if (ownerUserId) {
      ownerKey = "user:" + normalizeHistoryOwnerKeyPart(ownerUserId, keyPartMaxLength);
    } else {
      const normalizedNickname = normalizeHistoryOwnerKeyPart(ownerNickname, keyPartMaxLength);
      ownerKey = normalizedNickname ? "nick:" + normalizedNickname : "guest";
    }
  }

  return {
    owner_type: ownerType,
    owner_user_id: ownerUserId || null,
    owner_nickname: ownerNickname,
    owner_key: ownerKey || "guest"
  };
}

export function normalizeHistoryDiagnosticsIndexEntriesFromContext(options: {
  entries?: unknown;
  maxEntries?: unknown;
  maxPayloadKeys?: unknown;
  maxStringLength?: unknown;
  maxArrayItems?: unknown;
  keyMaxLength?: unknown;
}): Array<Record<string, unknown>> {
  const opts = options || {};
  const maxEntries = normalizePositiveInteger(opts.maxEntries, 6);
  const maxPayloadKeys = normalizePositiveInteger(opts.maxPayloadKeys, 24);
  const maxStringLength = normalizePositiveInteger(opts.maxStringLength, 160);
  const maxArrayItems = normalizePositiveInteger(opts.maxArrayItems, 8);
  const keyMaxLength = normalizePositiveInteger(opts.keyMaxLength, 64);
  const source = Array.isArray(opts.entries) ? opts.entries : [];
  const out: Array<Record<string, unknown>> = [];
  for (let i = 0; i < source.length; i += 1) {
    if (out.length >= maxEntries) break;
    const entry = source[i];
    if (!isObjectRecord(entry)) continue;
    const key = typeof entry.key === "string" ? entry.key.slice(0, keyMaxLength) : "";
    if (!key) continue;
    const schemaVersion = Number(entry.schemaVersion);
    if (!Number.isInteger(schemaVersion) || schemaVersion < 1) continue;
    const payload = normalizeHistoryDiagnosticPayload(entry.payload, {
      maxPayloadKeys,
      keyMaxLength,
      maxArrayItems,
      maxStringLength
    });
    if (!payload) continue;
    out.push({
      key,
      schemaVersion,
      payload
    });
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
  const modeKey = resolveModeKey(opts);
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
    timer_frozen: !!payload.timer_frozen,
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

export function writeSavedPayloadToStorages(options: {
  storages?: unknown;
  key?: unknown;
  payload?: unknown;
}): boolean {
  const opts = options || {};
  const key = typeof opts.key === "string" ? opts.key : "";
  if (!key) return false;
  const storages = Array.isArray(opts.storages) ? opts.storages : [];
  if (!storages.length) return false;

  let serialized: string;
  try {
    serialized = JSON.stringify(opts.payload);
  } catch (_err) {
    return false;
  }
  if (typeof serialized !== "string") return false;

  for (let i = 0; i < storages.length; i++) {
    const storage = storages[i] as StorageLike | null;
    if (!storage || typeof storage.setItem !== "function") continue;
    try {
      storage.setItem(key, serialized);
      return true;
    } catch (_err) {
      // Try the next available storage.
    }
  }
  return false;
}

export function getSavedGameStateStoragesFromContext(options: {
  windowLike?: unknown;
}): StorageLike[] {
  const opts = options || {};
  const win = opts.windowLike as WindowLike | null | undefined;
  if (!win) return [];

  const storages: StorageLike[] = [];
  const localStorage = win.localStorage || null;
  const sessionStorage = win.sessionStorage || null;
  const userAgent = win.navigator?.userAgent || "";
  const shouldSkipSessionStorage = isMobileSafariUserAgent(userAgent);
  if (localStorage) storages.push(localStorage);
  if (!shouldSkipSessionStorage && sessionStorage && sessionStorage !== localStorage) {
    storages.push(sessionStorage);
  }
  return storages;
}

export function removeKeysFromStorages(options: {
  storages?: unknown;
  keys?: unknown;
}): boolean {
  const opts = options || {};
  const storages = Array.isArray(opts.storages) ? opts.storages : [];
  const keys = Array.isArray(opts.keys)
    ? opts.keys.filter((key): key is string => typeof key === "string" && key.length > 0)
    : [];
  if (!storages.length || !keys.length) return false;

  let removed = false;
  for (let i = 0; i < storages.length; i++) {
    const storage = storages[i] as StorageLike | null;
    if (!storage || typeof storage.removeItem !== "function") continue;
    for (let k = 0; k < keys.length; k++) {
      try {
        storage.removeItem(keys[k]);
        removed = true;
      } catch (_err) {}
    }
  }
  return removed;
}

export function readSavedPayloadByKeyFromStorages(options: {
  storages?: unknown;
  key?: unknown;
}): Record<string, unknown> | null {
  const opts = options || {};
  const key = typeof opts.key === "string" ? opts.key : "";
  if (!key) return null;
  const storages = Array.isArray(opts.storages) ? opts.storages : [];
  if (!storages.length) return null;

  let best: Record<string, unknown> | null = null;
  let bestSavedAt = -1;
  for (let i = 0; i < storages.length; i++) {
    const storage = storages[i] as StorageLike | null;
    if (!storage || typeof storage.getItem !== "function") continue;
    let raw: string | null = null;
    try {
      raw = storage.getItem(key);
    } catch (_errRead) {
      raw = null;
    }
    if (!raw) continue;

    let parsed: unknown = null;
    try {
      parsed = JSON.parse(raw);
    } catch (_errParse) {
      if (typeof storage.removeItem === "function") {
        try {
          storage.removeItem(key);
        } catch (_errRemove) {}
      }
      continue;
    }
    if (!isObjectRecord(parsed)) continue;

    const savedAt = Number(parsed.saved_at) || 0;
    if (savedAt >= bestSavedAt) {
      bestSavedAt = savedAt;
      best = parsed;
    }
  }
  return best;
}

export function readSavedPayloadFromWindowName(options: {
  windowLike?: unknown;
  windowNameKey?: unknown;
  modeKey?: unknown;
  currentModeKey?: unknown;
  currentMode?: unknown;
  defaultModeKey?: unknown;
}): Record<string, unknown> | null {
  const opts = options || {};
  const win = opts.windowLike as WindowLike | null | undefined;
  if (!win) return null;

  let raw = "";
  try {
    raw = typeof win.name === "string" ? win.name : "";
  } catch (_errName) {
    return null;
  }
  if (!raw) return null;

  const windowNameKey = typeof opts.windowNameKey === "string" ? opts.windowNameKey : "";
  if (!windowNameKey) return null;
  const marker = windowNameKey + "=";

  const parts = raw.split("&");
  let encoded = "";
  for (let i = 0; i < parts.length; i++) {
    if (parts[i].indexOf(marker) === 0) {
      encoded = parts[i].substring(marker.length);
      break;
    }
  }
  if (!encoded) return null;

  let map: unknown = null;
  try {
    map = JSON.parse(decodeURIComponent(encoded));
  } catch (_errParse) {
    return null;
  }
  if (!isObjectRecord(map)) return null;

  const modeKey = resolveModeKey(opts);
  if (!modeKey) return null;
  const payload = map[modeKey];
  if (!isObjectRecord(payload)) return null;
  return payload;
}

export function writeSavedPayloadToWindowName(options: {
  windowLike?: unknown;
  windowNameKey?: unknown;
  modeKey?: unknown;
  currentModeKey?: unknown;
  currentMode?: unknown;
  defaultModeKey?: unknown;
  payload?: unknown;
}): boolean {
  const opts = options || {};
  const win = opts.windowLike as WindowLike | null | undefined;
  if (!win) return false;

  const modeKey = resolveModeKey(opts);
  if (!modeKey) return false;

  const windowNameKey = typeof opts.windowNameKey === "string" ? opts.windowNameKey : "";
  if (!windowNameKey) return false;
  const marker = windowNameKey + "=";

  let raw = "";
  try {
    raw = typeof win.name === "string" ? win.name : "";
  } catch (_errNameRead) {
    raw = "";
  }

  const parts = raw ? raw.split("&") : [];
  const kept: string[] = [];
  let map: Record<string, unknown> = {};
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part) continue;
    if (part.indexOf(marker) === 0) {
      const encoded = part.substring(marker.length);
      try {
        const parsed = JSON.parse(decodeURIComponent(encoded));
        if (isObjectRecord(parsed)) map = parsed;
      } catch (_errParse) {}
      continue;
    }
    kept.push(part);
  }

  if (!isObjectRecord(opts.payload)) {
    delete map[modeKey];
  } else {
    map[modeKey] = opts.payload;
  }

  let encodedMap = "";
  try {
    encodedMap = encodeURIComponent(JSON.stringify(map));
  } catch (_errEncode) {
    return false;
  }

  kept.push(marker + encodedMap);
  try {
    win.name = kept.join("&");
    return true;
  } catch (_errWrite) {
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

export function normalizeHistoryRecordFromContext(options: {
  record?: unknown;
  nowIso?: unknown;
  idFactory?: unknown;
  defaultClientVersion?: unknown;
  authUserId?: unknown;
  authNickname?: unknown;
  ownerKeyPartMaxLength?: unknown;
  maxDiagnosticEntries?: unknown;
  maxDiagnosticPayloadKeys?: unknown;
  maxDiagnosticStringLength?: unknown;
  maxDiagnosticArrayItems?: unknown;
  maxDiagnosticKeyLength?: unknown;
}): Record<string, unknown> | null {
  const opts = options || {};
  const source = isObjectRecord(opts.record) ? opts.record : null;
  if (!source) return null;

  const nowIsoProvider = typeof opts.nowIso === "function" ? opts.nowIso : () => new Date().toISOString();
  const idFactory =
    typeof opts.idFactory === "function"
      ? (opts.idFactory as () => string)
      : () => "hist_" + randomBase36(8) + "_" + Date.now().toString(36);
  const now = String(nowIsoProvider() || "");
  const id = typeof source.id === "string" && source.id.trim() ? source.id.trim() : idFactory();
  const replay = isObjectRecord(source.replay) ? source.replay : null;

  let replayString = "";
  if (typeof source.replay_string === "string") {
    replayString = source.replay_string;
  } else if (replay) {
    try {
      replayString = JSON.stringify(replay);
    } catch (_err) {
      replayString = "";
    }
  }

  const ownerMeta = normalizeHistoryOwnerMetaFromContext({
    record: source,
    authUserId: opts.authUserId,
    authNickname: opts.authNickname,
    keyPartMaxLength: opts.ownerKeyPartMaxLength
  });

  const diagnosticsIndexEntries = normalizeHistoryDiagnosticsIndexEntriesFromContext({
    entries: source.diagnostics_index_entries,
    maxEntries: opts.maxDiagnosticEntries,
    maxPayloadKeys: opts.maxDiagnosticPayloadKeys,
    maxStringLength: opts.maxDiagnosticStringLength,
    maxArrayItems: opts.maxDiagnosticArrayItems,
    keyMaxLength: opts.maxDiagnosticKeyLength
  });

  return {
    id,
    mode: typeof source.mode === "string" && source.mode ? source.mode : "local",
    mode_key: typeof source.mode_key === "string" && source.mode_key ? source.mode_key : "unknown",
    board_width: normalizeInteger(source.board_width, 4),
    board_height: normalizeInteger(source.board_height, 4),
    ruleset: typeof source.ruleset === "string" && source.ruleset ? source.ruleset : "pow2",
    undo_enabled: !!source.undo_enabled,
    ranked_bucket:
      typeof source.ranked_bucket === "string" && source.ranked_bucket ? source.ranked_bucket : "none",
    mode_family: typeof source.mode_family === "string" && source.mode_family ? source.mode_family : "pow2",
    rank_policy:
      typeof source.rank_policy === "string" && source.rank_policy ? source.rank_policy : "unranked",
    special_rules_snapshot: isObjectRecord(source.special_rules_snapshot) ? source.special_rules_snapshot : {},
    challenge_id:
      typeof source.challenge_id === "string" && source.challenge_id ? source.challenge_id : null,
    score: normalizeInteger(source.score, 0),
    best_tile: normalizeInteger(source.best_tile, 0),
    duration_ms: normalizeNonNegativeInteger(source.duration_ms, 0),
    final_board: normalizeHistoryBoardMatrix(source.final_board),
    ended_at: typeof source.ended_at === "string" && source.ended_at ? source.ended_at : now,
    saved_at: typeof source.saved_at === "string" && source.saved_at ? source.saved_at : now,
    end_reason: typeof source.end_reason === "string" && source.end_reason ? source.end_reason : "game_over",
    client_version:
      typeof source.client_version === "string" && source.client_version
        ? source.client_version
        : typeof opts.defaultClientVersion === "string" && opts.defaultClientVersion
          ? opts.defaultClientVersion
          : "1.8",
    replay,
    replay_string: replayString,
    owner_type: ownerMeta.owner_type,
    owner_user_id: ownerMeta.owner_user_id,
    owner_nickname: ownerMeta.owner_nickname,
    owner_key: ownerMeta.owner_key,
    diagnostics_index_entries: diagnosticsIndexEntries
  };
}
