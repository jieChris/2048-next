/**
 * Centralized data contracts for the 2048-next application.
 *
 * ALL payload structures used across replay, history, session, and online
 * submission flow through these definitions. Any structural change should
 * happen here — adapters and consumers import from this single source.
 */

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
  ended_at: string;
  end_reason: string;
  final_board: number[][];
  replay: Record<string, unknown> | null;
  replay_string: string;
  // Optional fields used by extended submit flows
  mode_bucket?: string;
  client_record_id?: string;
  client_version?: string;
}

export const SUBMIT_PAYLOAD_REQUIRED_KEYS = [
  "score",
  "best_tile",
  "duration_ms",
  "mode",
  "mode_key",
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
      "tests/unit/core-replay-*.spec.ts"
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
      "tests/unit/contracts.spec.ts::contracts matrix + isHistoryExportEnvelopeLike"
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
      "tests/unit/contracts.spec.ts::contracts matrix + isSubmitPayloadLike"
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
      "tests/unit/core-game-manager-saved-state-runtime.spec.ts"
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
      "tests/unit/bootstrap-play-startup-payload.spec.ts"
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
}
