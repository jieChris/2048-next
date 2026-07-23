/**
 * Centralized data contracts for the 2048-next application.
 *
 * ALL payload structures used across replay, history, session, and online
 * submission flow through these definitions. Any structural change should
 * happen here — adapters and consumers import from this single source.
 */

import { randomBase36 } from "../utils/crypto-random";

// ---------------------------------------------------------------------------
// Schema version
// ---------------------------------------------------------------------------
export const CONTRACT_SCHEMA_VERSION = 1;

function isNonArrayObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function hasRequiredObjectKeys(
  value: unknown,
  requiredKeys: readonly string[]
): value is Record<string, unknown> {
  if (!isNonArrayObject(value)) return false;
  return requiredKeys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
}

// ---------------------------------------------------------------------------
// Replay contracts
// ---------------------------------------------------------------------------

export interface ReplayRecordV4c {
  version: number;
  kind: "v4c";
  modeKey: string;
  initialBoardEncoded: string;
  actionsEncoded: string;
  replayString: string;
}

export interface ReplayRecordRpl1 {
  version: typeof APP_GAME_CONTRACT_VERSION;
  kind: "rpl1";
  modeKey: AppModeKey;
  replayString: string;
}

export type ReplayRecord = ReplayRecordV4c | ReplayRecordRpl1;

export const REPLAY_RECORD_REQUIRED_KEYS = [
  "version",
  "kind",
  "modeKey",
  "initialBoardEncoded",
  "actionsEncoded",
  "replayString"
] as const;

export const REPLAY_RPL1_RECORD_REQUIRED_KEYS = [
  "version",
  "kind",
  "modeKey",
  "replayString"
] as const;

export function isReplayRecordLike(value: unknown): value is ReplayRecord {
  if (!isNonArrayObject(value)) return false;
  if (value.kind === "rpl1") {
    return (
      hasRequiredObjectKeys(value, REPLAY_RPL1_RECORD_REQUIRED_KEYS) &&
      value.version === APP_GAME_CONTRACT_VERSION &&
      isAppModeKey(value.modeKey) &&
      typeof value.replayString === "string" &&
      value.replayString.startsWith("REPLAY_v1RPL_B64_")
    );
  }
  return (
    value.kind === "v4c" &&
    hasRequiredObjectKeys(value, REPLAY_RECORD_REQUIRED_KEYS) &&
    Number.isInteger(value.version) &&
    typeof value.modeKey === "string" &&
    typeof value.initialBoardEncoded === "string" &&
    typeof value.actionsEncoded === "string" &&
    typeof value.replayString === "string"
  );
}

export function createEmptyReplayRecord(modeKey: string): ReplayRecordV4c {
  return {
    version: CONTRACT_SCHEMA_VERSION,
    kind: "v4c",
    modeKey,
    initialBoardEncoded: "",
    actionsEncoded: "",
    replayString: ""
  };
}

// ---------------------------------------------------------------------------
// App game-session contracts (versioned independently from legacy payloads)
// ---------------------------------------------------------------------------

export const APP_GAME_CONTRACT_VERSION = 1 as const;

export const APP_MODE_KEYS = [
  "standard_4x4_pow2_no_undo",
  "classic_4x4_pow2_undo",
  "board_3x3_pow2_no_undo"
] as const;

export type AppModeKey = (typeof APP_MODE_KEYS)[number];
export type GameDirection = 0 | 1 | 2 | 3;

export interface GameCell {
  x: number;
  y: number;
}

export interface GameInitialTile {
  cellIndex: number;
  value: number;
}

export interface GameMoveReplayRecord {
  kind: "move";
  direction: GameDirection;
  spawnIndex: number;
  spawnValue: number;
  deltaMs: number;
  rngStep: number;
}

export interface GameUndoReplayRecord {
  kind: "undo";
  deltaMs: number;
}

export type GameReplayRecord = GameMoveReplayRecord | GameUndoReplayRecord;

export interface GameUndoFrame {
  board: number[][];
  score: number;
  steps: number;
  gameOver: boolean;
  won: boolean;
  milestone2048Reached: boolean;
  comboStreak: number;
  undoUsed: number;
}

export interface GameState {
  version: typeof APP_GAME_CONTRACT_VERSION;
  modeKey: AppModeKey;
  width: number;
  height: number;
  ruleset: "pow2";
  undoEnabled: boolean;
  seed: number;
  challengeId: string | null;
  board: number[][];
  score: number;
  steps: number;
  gameOver: boolean;
  won: boolean;
  milestone2048Reached: boolean;
  undoUsed: number;
  comboStreak: number;
  startedAtMs: number | null;
  lastEventAtMs: number | null;
  durationMs: number;
  rngStep: number;
  initialTiles: GameInitialTile[];
  replayRecords: GameReplayRecord[];
  undoStack: GameUndoFrame[];
}

export interface GameMotionEffect {
  from: GameCell;
  to: GameCell;
  value: number;
}

export interface GameMergeEffect {
  from: [GameCell, GameCell];
  to: GameCell;
  value: number;
}

export interface GameSpawnEffect extends GameCell {
  spawnIndex: number;
  value: number;
  rngStep: number;
}

export interface GameTransition {
  state: GameState;
  moved: boolean;
  scoreDelta: number;
  motions: GameMotionEffect[];
  merges: GameMergeEffect[];
  spawn: GameSpawnEffect | null;
  milestone2048: boolean;
  gameOver: boolean;
}

export interface GameSnapshot {
  version: typeof APP_GAME_CONTRACT_VERSION;
  savedAtMs: number;
  state: GameState;
}

export const GAME_UNDO_FRAME_REQUIRED_KEYS = [
  "board",
  "score",
  "steps",
  "gameOver",
  "won",
  "milestone2048Reached",
  "comboStreak",
  "undoUsed"
] as const;

export const GAME_STATE_REQUIRED_KEYS = [
  "version",
  "modeKey",
  "width",
  "height",
  "ruleset",
  "undoEnabled",
  "seed",
  "challengeId",
  "board",
  "score",
  "steps",
  "gameOver",
  "won",
  "milestone2048Reached",
  "undoUsed",
  "comboStreak",
  "startedAtMs",
  "lastEventAtMs",
  "durationMs",
  "rngStep",
  "initialTiles",
  "replayRecords",
  "undoStack"
] as const;

export const GAME_TRANSITION_REQUIRED_KEYS = [
  "state",
  "moved",
  "scoreDelta",
  "motions",
  "merges",
  "spawn",
  "milestone2048",
  "gameOver"
] as const;

export const GAME_SNAPSHOT_REQUIRED_KEYS = ["version", "savedAtMs", "state"] as const;

function isNonNegativeSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

function isGameBoardLike(value: unknown, width?: number, height?: number): value is number[][] {
  if (!Array.isArray(value) || value.length === 0) return false;
  if (height !== undefined && value.length !== height) return false;
  const rowWidth = width ?? (Array.isArray(value[0]) ? value[0].length : 0);
  if (rowWidth <= 0) return false;
  return value.every(
    (row) =>
      Array.isArray(row) &&
      row.length === rowWidth &&
      row.every((cell) => isNonNegativeSafeInteger(cell))
  );
}

function isGameCellLike(value: unknown): value is GameCell {
  return (
    isNonArrayObject(value) &&
    isNonNegativeSafeInteger(value.x) &&
    isNonNegativeSafeInteger(value.y)
  );
}

function isGameInitialTileLike(value: unknown, cellCount: number): value is GameInitialTile {
  return (
    isNonArrayObject(value) &&
    isNonNegativeSafeInteger(value.cellIndex) &&
    Number(value.cellIndex) < cellCount &&
    isNonNegativeSafeInteger(value.value) &&
    Number(value.value) > 0
  );
}

function isGameReplayRecordLike(value: unknown, cellCount: number): value is GameReplayRecord {
  if (!isNonArrayObject(value) || !isNonNegativeSafeInteger(value.deltaMs)) return false;
  if (value.kind === "undo") return true;
  return (
    value.kind === "move" &&
    (value.direction === 0 || value.direction === 1 || value.direction === 2 || value.direction === 3) &&
    isNonNegativeSafeInteger(value.spawnIndex) &&
    Number(value.spawnIndex) < cellCount &&
    isNonNegativeSafeInteger(value.spawnValue) &&
    Number(value.spawnValue) > 0 &&
    isNonNegativeSafeInteger(value.rngStep)
  );
}

export function isAppModeKey(value: unknown): value is AppModeKey {
  return typeof value === "string" && APP_MODE_KEYS.includes(value as AppModeKey);
}

export function isGameUndoFrameLike(value: unknown): value is GameUndoFrame {
  if (!hasRequiredObjectKeys(value, GAME_UNDO_FRAME_REQUIRED_KEYS)) return false;
  return (
    isGameBoardLike(value.board) &&
    isNonNegativeSafeInteger(value.score) &&
    isNonNegativeSafeInteger(value.steps) &&
    typeof value.gameOver === "boolean" &&
    typeof value.won === "boolean" &&
    typeof value.milestone2048Reached === "boolean" &&
    isNonNegativeSafeInteger(value.comboStreak) &&
    isNonNegativeSafeInteger(value.undoUsed)
  );
}

export function isGameStateLike(value: unknown): value is GameState {
  if (!hasRequiredObjectKeys(value, GAME_STATE_REQUIRED_KEYS)) return false;
  const width = Number(value.width);
  const height = Number(value.height);
  const cellCount = width * height;
  const expectedSize = value.modeKey === "board_3x3_pow2_no_undo" ? 3 : 4;
  const expectedUndoEnabled = value.modeKey === "classic_4x4_pow2_undo";
  return (
    value.version === APP_GAME_CONTRACT_VERSION &&
    isAppModeKey(value.modeKey) &&
    isNonNegativeSafeInteger(width) &&
    width === expectedSize &&
    isNonNegativeSafeInteger(height) &&
    height === expectedSize &&
    value.ruleset === "pow2" &&
    value.undoEnabled === expectedUndoEnabled &&
    isNonNegativeSafeInteger(value.seed) &&
    (value.challengeId === null || typeof value.challengeId === "string") &&
    isGameBoardLike(value.board, width, height) &&
    isNonNegativeSafeInteger(value.score) &&
    isNonNegativeSafeInteger(value.steps) &&
    typeof value.gameOver === "boolean" &&
    typeof value.won === "boolean" &&
    typeof value.milestone2048Reached === "boolean" &&
    isNonNegativeSafeInteger(value.undoUsed) &&
    isNonNegativeSafeInteger(value.comboStreak) &&
    (value.startedAtMs === null || isNonNegativeSafeInteger(value.startedAtMs)) &&
    (value.lastEventAtMs === null || isNonNegativeSafeInteger(value.lastEventAtMs)) &&
    isNonNegativeSafeInteger(value.durationMs) &&
    isNonNegativeSafeInteger(value.rngStep) &&
    Array.isArray(value.initialTiles) &&
    value.initialTiles.every((tile) => isGameInitialTileLike(tile, cellCount)) &&
    Array.isArray(value.replayRecords) &&
    value.replayRecords.every((record) => isGameReplayRecordLike(record, cellCount)) &&
    Array.isArray(value.undoStack) &&
    value.undoStack.every(
      (frame) => isGameUndoFrameLike(frame) && isGameBoardLike(frame.board, width, height)
    )
  );
}

function isGameMotionEffectLike(value: unknown): value is GameMotionEffect {
  return (
    isNonArrayObject(value) &&
    isGameCellLike(value.from) &&
    isGameCellLike(value.to) &&
    isNonNegativeSafeInteger(value.value) &&
    Number(value.value) > 0
  );
}

function isGameMergeEffectLike(value: unknown): value is GameMergeEffect {
  return (
    isNonArrayObject(value) &&
    Array.isArray(value.from) &&
    value.from.length === 2 &&
    value.from.every(isGameCellLike) &&
    isGameCellLike(value.to) &&
    isNonNegativeSafeInteger(value.value) &&
    Number(value.value) > 0
  );
}

function isGameSpawnEffectLike(value: unknown): value is GameSpawnEffect {
  if (!isNonArrayObject(value) || !isGameCellLike(value)) return false;
  return (
    isNonNegativeSafeInteger(value.spawnIndex) &&
    isNonNegativeSafeInteger(value.value) &&
    Number(value.value) > 0 &&
    isNonNegativeSafeInteger(value.rngStep)
  );
}

export function isGameTransitionLike(value: unknown): value is GameTransition {
  if (!hasRequiredObjectKeys(value, GAME_TRANSITION_REQUIRED_KEYS)) return false;
  return (
    isGameStateLike(value.state) &&
    typeof value.moved === "boolean" &&
    Number.isSafeInteger(value.scoreDelta) &&
    Array.isArray(value.motions) &&
    value.motions.every(isGameMotionEffectLike) &&
    Array.isArray(value.merges) &&
    value.merges.every(isGameMergeEffectLike) &&
    (value.spawn === null || isGameSpawnEffectLike(value.spawn)) &&
    typeof value.milestone2048 === "boolean" &&
    typeof value.gameOver === "boolean" &&
    value.gameOver === value.state.gameOver
  );
}

export function isGameSnapshotLike(value: unknown): value is GameSnapshot {
  return (
    hasRequiredObjectKeys(value, GAME_SNAPSHOT_REQUIRED_KEYS) &&
    value.version === APP_GAME_CONTRACT_VERSION &&
    isNonNegativeSafeInteger(value.savedAtMs) &&
    isGameStateLike(value.state)
  );
}

// ---------------------------------------------------------------------------
// History record contract
// ---------------------------------------------------------------------------

export interface HistoryRecord {
  id: string;
  mode: string;
  mode_key: string;
  board_width: number;
  board_height: number;
  ruleset: string;
  undo_enabled: boolean;
  ranked_bucket: string;
  mode_family: string;
  rank_policy: string;
  special_rules_snapshot: Record<string, unknown>;
  challenge_id: string | null;
  score: number;
  board_sum: number;
  best_tile: number;
  duration_ms: number;
  final_board: number[][];
  ended_at: string;
  saved_at: string;
  end_reason: string;
  client_version: string;
  replay: Record<string, unknown> | null;
  replay_string: string;
  owner_type: "guest" | "user";
  owner_user_id: string | null;
  owner_nickname: string;
  owner_key: string;
  diagnostics_index_entries: HistoryDiagnosticsIndexEntry[];
}

export interface HistoryOwnerMeta {
  owner_type: "guest" | "user";
  owner_user_id: string | null;
  owner_nickname: string;
  owner_key: string;
}

export type HistoryDiagnosticPayloadValue =
  | string
  | number
  | boolean
  | Array<string | number | boolean>;

export interface HistoryDiagnosticsIndexEntry {
  key: string;
  schemaVersion: number;
  payload: Record<string, HistoryDiagnosticPayloadValue>;
}

export const HISTORY_RECORD_REQUIRED_KEYS = [
  "id",
  "mode",
  "mode_key",
  "board_width",
  "board_height",
  "ruleset",
  "undo_enabled",
  "ranked_bucket",
  "mode_family",
  "rank_policy",
  "special_rules_snapshot",
  "challenge_id",
  "score",
  "board_sum",
  "best_tile",
  "duration_ms",
  "final_board",
  "ended_at",
  "saved_at",
  "end_reason",
  "client_version",
  "replay",
  "replay_string",
  "owner_type",
  "owner_user_id",
  "owner_nickname",
  "owner_key",
  "diagnostics_index_entries"
] as const;

export const HISTORY_OWNER_META_REQUIRED_KEYS = [
  "owner_type",
  "owner_user_id",
  "owner_nickname",
  "owner_key"
] as const;

export const HISTORY_DIAGNOSTICS_INDEX_ENTRY_REQUIRED_KEYS = [
  "key",
  "schemaVersion",
  "payload"
] as const;

function createHistoryRecordId(): string {
  return "hist_" + randomBase36(8) + "_" + Date.now().toString(36);
}

function resolveHistoryRecordIso(nowIso?: () => string): string {
  if (typeof nowIso === "function") return String(nowIso() || "");
  return new Date().toISOString();
}

function normalizeHistoryBoardMatrix(value: unknown): number[][] {
  if (!Array.isArray(value)) return [];
  return value.map((row) => (Array.isArray(row) ? row.map((cell) => Math.floor(Number(cell) || 0)) : []));
}

export function calculateHistoryBoardSum(value: unknown): number {
  if (!Array.isArray(value)) return 0;
  let total = 0;
  for (const row of value) {
    if (!Array.isArray(row)) continue;
    for (const cell of row) {
      const numeric = Math.floor(Number(cell));
      if (!Number.isFinite(numeric) || numeric <= 0) continue;
      total = Math.min(Number.MAX_SAFE_INTEGER, total + numeric);
    }
  }
  return total;
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

function normalizeHistoryReplayString(
  replayStringValue: unknown,
  replayValue: unknown
): string {
  if (typeof replayStringValue === "string") return replayStringValue;
  if (isNonArrayObject(replayValue)) {
    try {
      return JSON.stringify(replayValue);
    } catch (_err) {
      return "";
    }
  }
  return "";
}

function normalizeHistoryDiagnosticPayloadArrayValue(
  value: unknown,
  maxStringLength: number
): string | number | boolean | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "boolean") return value;
  if (typeof value === "string" && value) return value.slice(0, maxStringLength);
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
    const normalized = normalizeHistoryDiagnosticPayloadArrayValue(
      source[i],
      options.maxStringLength
    );
    if (normalized === null) continue;
    out.push(normalized);
  }
  return out;
}

function normalizeHistoryDiagnosticPayloadValue(
  value: unknown,
  options: { maxArrayItems: number; maxStringLength: number }
): HistoryDiagnosticPayloadValue | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.slice(0, options.maxStringLength);
  if (Array.isArray(value)) return normalizeHistoryDiagnosticPayloadArray(value, options);
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
): Record<string, HistoryDiagnosticPayloadValue> | null {
  if (!isNonArrayObject(payload)) return null;
  const out: Record<string, HistoryDiagnosticPayloadValue> = {};
  const keys = Object.keys(payload);
  let accepted = 0;
  for (let i = 0; i < keys.length; i += 1) {
    if (accepted >= options.maxPayloadKeys) break;
    const key = keys[i].slice(0, options.keyMaxLength);
    if (!key) continue;
    const normalized = normalizeHistoryDiagnosticPayloadValue(payload[keys[i]], options);
    if (normalized === null) continue;
    out[key] = normalized;
    accepted += 1;
  }
  return out;
}

export function normalizeHistoryOwnerMetaLike(
  value: unknown,
  options?: {
    authUserId?: unknown;
    authNickname?: unknown;
    keyPartMaxLength?: unknown;
  }
): HistoryOwnerMeta {
  const source = isNonArrayObject(value) ? value : {};
  const keyPartMaxLength = normalizePositiveInteger(options?.keyPartMaxLength, 64);
  const ownerTypeRaw =
    typeof source.owner_type === "string" ? source.owner_type.trim().toLowerCase() : "";
  let ownerUserId = source.owner_user_id == null ? "" : String(source.owner_user_id).trim();
  let ownerNickname =
    source.owner_nickname == null ? "" : String(source.owner_nickname).trim();
  let ownerKey = typeof source.owner_key === "string" ? source.owner_key.trim() : "";

  if (!ownerTypeRaw && !ownerUserId && !ownerNickname) {
    ownerUserId = options?.authUserId == null ? "" : String(options.authUserId).trim();
    ownerNickname =
      options?.authNickname == null ? "" : String(options.authNickname).trim();
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

export function isHistoryOwnerMetaLike(value: unknown): value is HistoryOwnerMeta {
  if (!hasRequiredObjectKeys(value, HISTORY_OWNER_META_REQUIRED_KEYS)) return false;
  if (value.owner_type !== "guest" && value.owner_type !== "user") return false;
  if (value.owner_user_id !== null && typeof value.owner_user_id !== "string") return false;
  if (typeof value.owner_nickname !== "string") return false;
  if (typeof value.owner_key !== "string" || !value.owner_key) return false;
  return true;
}

export function normalizeHistoryDiagnosticsIndexEntriesLike(
  value: unknown,
  options?: {
    maxEntries?: unknown;
    maxPayloadKeys?: unknown;
    maxStringLength?: unknown;
    maxArrayItems?: unknown;
    keyMaxLength?: unknown;
  }
): HistoryDiagnosticsIndexEntry[] {
  const source = Array.isArray(value) ? value : [];
  const maxEntries = normalizePositiveInteger(options?.maxEntries, 6);
  const maxPayloadKeys = normalizePositiveInteger(options?.maxPayloadKeys, 24);
  const maxStringLength = normalizePositiveInteger(options?.maxStringLength, 160);
  const maxArrayItems = normalizePositiveInteger(options?.maxArrayItems, 8);
  const keyMaxLength = normalizePositiveInteger(options?.keyMaxLength, 64);
  const out: HistoryDiagnosticsIndexEntry[] = [];
  for (let i = 0; i < source.length; i += 1) {
    if (out.length >= maxEntries) break;
    const entry = source[i];
    if (!isNonArrayObject(entry)) continue;
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

export function isHistoryDiagnosticsIndexEntryLike(
  value: unknown
): value is HistoryDiagnosticsIndexEntry {
  if (!hasRequiredObjectKeys(value, HISTORY_DIAGNOSTICS_INDEX_ENTRY_REQUIRED_KEYS)) return false;
  if (typeof value.key !== "string" || !value.key) return false;
  const schemaVersion = Number(value.schemaVersion);
  if (!Number.isInteger(schemaVersion) || schemaVersion < 1) return false;
  if (!isNonArrayObject(value.payload)) return false;
  return true;
}

export function normalizeHistoryRecordLike(
  value: unknown,
  options?: {
    nowIso?: () => string;
    idFactory?: () => string;
    defaultClientVersion?: string;
  }
): HistoryRecord | null {
  if (!isNonArrayObject(value)) return null;
  const source = value as Record<string, unknown>;
  const now = resolveHistoryRecordIso(options?.nowIso);
  const idFactory = typeof options?.idFactory === "function" ? options.idFactory : createHistoryRecordId;
  const id = typeof source.id === "string" && source.id.trim() ? source.id.trim() : idFactory();
  const replay = isNonArrayObject(source.replay) ? source.replay : null;
  const ownerMeta = normalizeHistoryOwnerMetaLike(source);
  const diagnosticsEntries = normalizeHistoryDiagnosticsIndexEntriesLike(
    source.diagnostics_index_entries
  );
  const finalBoard = normalizeHistoryBoardMatrix(source.final_board);
  const hasBoardCells = finalBoard.some((row) => row.length > 0);
  return {
    id,
    mode: typeof source.mode === "string" && source.mode ? source.mode : "local",
    mode_key: typeof source.mode_key === "string" && source.mode_key ? source.mode_key : "unknown",
    board_width: normalizeInteger(source.board_width, 4),
    board_height: normalizeInteger(source.board_height, 4),
    ruleset: typeof source.ruleset === "string" && source.ruleset ? source.ruleset : "pow2",
    undo_enabled: !!source.undo_enabled,
    ranked_bucket: typeof source.ranked_bucket === "string" && source.ranked_bucket ? source.ranked_bucket : "none",
    mode_family: typeof source.mode_family === "string" && source.mode_family ? source.mode_family : "pow2",
    rank_policy: typeof source.rank_policy === "string" && source.rank_policy ? source.rank_policy : "unranked",
    special_rules_snapshot: isNonArrayObject(source.special_rules_snapshot) ? source.special_rules_snapshot : {},
    challenge_id: typeof source.challenge_id === "string" && source.challenge_id ? source.challenge_id : null,
    score: normalizeInteger(source.score, 0),
    board_sum: hasBoardCells
      ? calculateHistoryBoardSum(finalBoard)
      : normalizeNonNegativeInteger(source.board_sum, 0),
    best_tile: normalizeInteger(source.best_tile, 0),
    duration_ms: normalizeNonNegativeInteger(source.duration_ms, 0),
    final_board: finalBoard,
    ended_at: typeof source.ended_at === "string" && source.ended_at ? source.ended_at : now,
    saved_at: typeof source.saved_at === "string" && source.saved_at ? source.saved_at : now,
    end_reason: typeof source.end_reason === "string" && source.end_reason ? source.end_reason : "game_over",
    client_version:
      typeof source.client_version === "string" && source.client_version
        ? source.client_version
        : String(options?.defaultClientVersion || "1.8"),
    replay,
    replay_string: normalizeHistoryReplayString(source.replay_string, replay),
    owner_type: ownerMeta.owner_type,
    owner_user_id: ownerMeta.owner_user_id,
    owner_nickname: ownerMeta.owner_nickname,
    owner_key: ownerMeta.owner_key,
    diagnostics_index_entries: diagnosticsEntries
  };
}

export function isHistoryRecordLike(value: unknown): value is HistoryRecord {
  if (!hasRequiredObjectKeys(value, HISTORY_RECORD_REQUIRED_KEYS)) return false;
  if (typeof value.id !== "string" || !value.id) return false;
  if (!Array.isArray(value.final_board)) return false;
  if (!isHistoryOwnerMetaLike(value)) return false;
  if (!Array.isArray(value.diagnostics_index_entries)) return false;
  if (!value.diagnostics_index_entries.every((entry) => isHistoryDiagnosticsIndexEntryLike(entry)))
    return false;
  return true;
}

export interface HistoryExportEnvelope {
  v: number;
  exported_at: string;
  count: number;
  records: HistoryRecord[];
}

export const HISTORY_EXPORT_ENVELOPE_REQUIRED_KEYS = [
  "v",
  "exported_at",
  "count",
  "records"
] as const;

export function isHistoryExportEnvelopeLike(
  value: unknown
): value is HistoryExportEnvelope {
  if (!hasRequiredObjectKeys(value, HISTORY_EXPORT_ENVELOPE_REQUIRED_KEYS)) return false;
  return Array.isArray(value.records);
}

export interface HistoryListResult {
  total: number;
  page: number;
  page_size: number;
  items: HistoryRecord[];
}

export interface HistoryImportResult {
  imported: number;
  replaced: number;
  total: number;
}

// ---------------------------------------------------------------------------
// Session snapshot contract
// ---------------------------------------------------------------------------

export interface SessionSnapshot {
  version: number;
  modeKey: string;
  score: number;
  board: number[][];
  over: boolean;
  won: boolean;
  keepPlaying: boolean;
  undoUsed: number;
  comboStreak: number;
  successfulMoveCount: number;
  timestamp: string;
}

export interface SessionInitPayload {
  modeKey: unknown;
  modeConfig: unknown;
  inputManagerCtor: unknown;
  defaultBoardWidth: number;
}

export const SESSION_INIT_PAYLOAD_REQUIRED_KEYS = [
  "modeKey",
  "modeConfig",
  "inputManagerCtor",
  "defaultBoardWidth"
] as const;

export function isSessionInitPayloadLike(value: unknown): value is SessionInitPayload {
  if (!hasRequiredObjectKeys(value, SESSION_INIT_PAYLOAD_REQUIRED_KEYS)) return false;
  return Number.isFinite(value.defaultBoardWidth);
}

export interface SavedGameStatePayload {
  v: number;
  saved_at: number;
  mode_key: string;
  board_width: number;
  board_height: number;
  ruleset: string;
  board: number[][];
  score: number;
  over: boolean;
  won: boolean;
  keep_playing: boolean;
  duration_ms: number;
  ranked_session_token?: string | null;
}

export const SAVED_GAME_STATE_PAYLOAD_REQUIRED_KEYS = [
  "v",
  "saved_at",
  "mode_key",
  "board_width",
  "board_height",
  "ruleset",
  "board",
  "score",
  "over",
  "won",
  "keep_playing",
  "duration_ms"
] as const;

export function isSavedGameStatePayloadLike(value: unknown): value is SavedGameStatePayload {
  if (!hasRequiredObjectKeys(value, SAVED_GAME_STATE_PAYLOAD_REQUIRED_KEYS)) return false;
  return Array.isArray(value.board);
}

export function createSessionSnapshot(partial: Partial<SessionSnapshot>): SessionSnapshot {
  return {
    version: partial.version ?? CONTRACT_SCHEMA_VERSION,
    modeKey: partial.modeKey ?? "unknown",
    score: partial.score ?? 0,
    board: partial.board ?? [],
    over: partial.over ?? false,
    won: partial.won ?? false,
    keepPlaying: partial.keepPlaying ?? false,
    undoUsed: partial.undoUsed ?? 0,
    comboStreak: partial.comboStreak ?? 0,
    successfulMoveCount: partial.successfulMoveCount ?? 0,
    timestamp: partial.timestamp ?? new Date().toISOString()
  };
}

// ---------------------------------------------------------------------------
// Online submit payload contract
// ---------------------------------------------------------------------------

export interface SubmitPayload {
  score: number;
  best_tile: number;
  duration_ms: number;
  mode: string;
  mode_key: string;
  ranked_session_token: string | null;
  challenge_id: string | null;
  initial_seed: number | null;
  seed: number | null;
  ranked_verification: RankedVerificationPayload | null;
  ended_at: string;
  end_reason: string;
  final_board: number[][];
  replay: Record<string, unknown> | null;
  replay_string: string;
  // Optional fields used by extended submit flows
  mode_bucket?: string;
  client_record_id?: string;
  client_version?: string;
  min_steps_2048?: number | null;
  min_steps_4096?: number | null;
  min_steps_8192?: number | null;
}

export interface RankedVerificationPayload {
  random_source: "server_seed";
  replay_format: "v1";
  challenge_id: string | null;
  seed: number | null;
  mode_key: string;
  ranked_session_token: string | null;
}

export const SUBMIT_PAYLOAD_REQUIRED_KEYS = [
  "score",
  "best_tile",
  "duration_ms",
  "mode",
  "mode_key",
  "ranked_session_token",
  "challenge_id",
  "initial_seed",
  "seed",
  "ranked_verification",
  "ended_at",
  "end_reason",
  "final_board",
  "replay",
  "replay_string"
] as const;

export function isSubmitPayloadLike(value: unknown): value is SubmitPayload {
  if (!hasRequiredObjectKeys(value, SUBMIT_PAYLOAD_REQUIRED_KEYS)) return false;
  return Array.isArray(value.final_board);
}

export interface ContractCoverageMatrixEntry {
  contract:
    | "HistoryRecord"
    | "ReplayRecord"
    | "HistoryExportEnvelope"
    | "SubmitPayload"
    | "SavedGameStatePayload"
    | "SessionInitPayload";
  requiredKeys: readonly string[];
  producers: readonly string[];
  consumers: readonly string[];
  assertions: readonly string[];
}

export const CORE_CONTRACT_COVERAGE_MATRIX: readonly ContractCoverageMatrixEntry[] = [
  {
    contract: "HistoryRecord",
    requiredKeys: HISTORY_RECORD_REQUIRED_KEYS,
    producers: [
      "js/local_history_store.js::normalizeRecord",
      "src/storage/history-idb.ts::saveRecord/importRecords/migrateFromLocalStorage"
    ],
    consumers: [
      "js/history_page.js::normalizeHistoryRecordForView",
      "src/storage/history-idb.ts::listRecords/getById/exportRecords"
    ],
    assertions: [
      "tests/unit/contracts.spec.ts::contracts history owner diagnostics helpers",
      "tests/smoke/history-records-owner-filter.smoke.spec.ts::separates guest/account records and filters by owner",
      "tests/smoke/history-records-view-list-export.smoke.spec.ts::supports export-all and single-record export"
    ]
  },
  {
    contract: "ReplayRecord",
    requiredKeys: REPLAY_RECORD_REQUIRED_KEYS,
    producers: [
      "js/core_game_manager_replay_helpers_runtime.js::serializeReplay*"
    ],
    consumers: [
      "js/core_game_manager_replay_helpers_runtime.js::importReplay/importV9RplBuffer",
      "src/bootstrap/replay/*"
    ],
    assertions: [
      "tests/unit/contracts.spec.ts::contracts matrix + isReplayRecordLike",
      "tests/unit/core-replay-*.spec.ts",
      "tests/smoke/pages-replay-runtime.smoke.spec.ts::replay import treats REPLAY_v4C payload as v4 instead of v9 verse"
    ]
  },
  {
    contract: "HistoryExportEnvelope",
    requiredKeys: HISTORY_EXPORT_ENVELOPE_REQUIRED_KEYS,
    producers: [
      "src/bootstrap/history/*::exportRecords"
    ],
    consumers: [
      "src/bootstrap/history/*::importRecords",
      "tests/smoke/history-records-*.smoke.spec.ts"
    ],
    assertions: [
      "tests/unit/contracts.spec.ts::contracts matrix + isHistoryExportEnvelopeLike",
      "tests/smoke/history-records-view-list-export.smoke.spec.ts::history records page exports selected records and all records through runtime helper"
    ]
  },
  {
    contract: "SubmitPayload",
    requiredKeys: SUBMIT_PAYLOAD_REQUIRED_KEYS,
    producers: [
      "src/bootstrap/play/*::buildSubmitPayload"
    ],
    consumers: [
      "API /submit endpoint",
      "src/services/api/*"
    ],
    assertions: [
      "tests/unit/contracts.spec.ts::contracts matrix + isSubmitPayloadLike",
      "tests/smoke/pages-online-record-submit-restart-flush.smoke.spec.ts::online record submit payload preserves SubmitPayload contract keys"
    ]
  },
  {
    contract: "SavedGameStatePayload",
    requiredKeys: SAVED_GAME_STATE_PAYLOAD_REQUIRED_KEYS,
    producers: [
      "js/core_game_manager_saved_state_helpers_runtime.js::buildSavedGameStatePayload"
    ],
    consumers: [
      "js/core_game_manager_saved_state_helpers_runtime.js::resolveSavedStateRestoreDecision/applySavedStateRestore"
    ],
    assertions: [
      "tests/unit/contracts.spec.ts::contracts matrix + isSavedGameStatePayloadLike",
      "tests/unit/core-game-manager-saved-state-runtime.spec.ts",
      "tests/smoke/pages-contracts-saved-session.smoke.spec.ts::saved-state payload contract",
      "tests/smoke/pages-contracts-saved-session.smoke.spec.ts::saved-state restore rejects version-mismatch payload"
    ]
  },
  {
    contract: "SessionInitPayload",
    requiredKeys: SESSION_INIT_PAYLOAD_REQUIRED_KEYS,
    producers: [
      "src/bootstrap/play-startup-payload.ts::resolvePlayStartupPayload"
    ],
    consumers: [
      "src/bootstrap/play-startup-host.ts::resolvePlayStartupFromContext",
      "src/entries/play.ts"
    ],
    assertions: [
      "tests/unit/contracts.spec.ts::contracts matrix + isSessionInitPayloadLike",
      "tests/unit/bootstrap-play-startup-payload.spec.ts",
      "tests/smoke/pages-contracts-saved-session.smoke.spec.ts::session-init payload contract"
    ]
  }
];

export const REPLAY_IMPORT_EXPORT_CONTRACT_MATRIX = CORE_CONTRACT_COVERAGE_MATRIX;

// ---------------------------------------------------------------------------
// Versioned schema migration
// ---------------------------------------------------------------------------

export type SchemaMigrator<T> = (data: unknown) => T;

const historyMigrators: Map<number, SchemaMigrator<HistoryRecord[]>> = new Map();

export function registerHistoryMigrator(fromVersion: number, migrator: SchemaMigrator<HistoryRecord[]>): void {
  historyMigrators.set(fromVersion, migrator);
}

export function migrateHistoryRecords(data: unknown, fromVersion: number): HistoryRecord[] {
  const migrator = historyMigrators.get(fromVersion);
  if (migrator) return migrator(data);
  return Array.isArray(data) ? (data as HistoryRecord[]) : [];
}

// ---------------------------------------------------------------------------
// API response contracts
// ---------------------------------------------------------------------------

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data?: T;
}

export interface ApiErrorResponse {
  error: string;
  code?: string;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface LeaderboardEntry {
  user_id: number;
  nickname: string;
  score: number;
  game_date: string;
  mode_bucket?: string;
  min_steps_2048?: number | null;
  min_steps_4096?: number | null;
  min_steps_8192?: number | null;
}

export interface UserInfoResponse {
  id: number;
  nickname: string;
  email?: string;
  created_at: string;
}

export interface LoginResponse {
  token: string;
  userId: number;
  nickname: string;
}

export interface RecordSubmitResponse {
  id: string;
  modeBucket: string;
  endedAt: string;
  duplicate?: boolean;
}

export interface UserRecordEntry {
  id: string;
  user_id: number;
  mode_bucket: string;
  mode_key: string;
  score: number;
  best_tile: number;
  duration_ms: number;
  ended_at: string;
  end_reason: string;
  deleted_at: string | null;
  created_at: string;
  min_steps_2048?: number | null;
  min_steps_4096?: number | null;
  min_steps_8192?: number | null;
}
