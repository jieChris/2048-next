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
