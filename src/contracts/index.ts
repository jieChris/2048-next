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

export interface ReplayRecord {
  version: number;
  kind: "v4c";
  modeKey: string;
  initialBoardEncoded: string;
  actionsEncoded: string;
  replayString: string;
}

export const REPLAY_RECORD_REQUIRED_KEYS = [
  "version",
  "kind",
  "modeKey",
  "initialBoardEncoded",
  "actionsEncoded",
  "replayString"
] as const;

export function isReplayRecordLike(value: unknown): value is ReplayRecord {
  return hasRequiredObjectKeys(value, REPLAY_RECORD_REQUIRED_KEYS);
}

export function createEmptyReplayRecord(modeKey: string): ReplayRecord {
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
    best_tile: normalizeInteger(source.best_tile, 0),
    duration_ms: normalizeNonNegativeInteger(source.duration_ms, 0),
    final_board: normalizeHistoryBoardMatrix(source.final_board),
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
      "tests/smoke/history-records-view-models.smoke.spec.ts::renders record head and final board"
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
