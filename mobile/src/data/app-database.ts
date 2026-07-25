import {
  APP_GAME_CONTRACT_VERSION,
  APP_MODE_KEYS,
  isAppModeKey,
  isGameSnapshotLike,
  isReplayRecordLike,
  type AppModeKey,
  type GameSnapshot,
  type ReplayRecord,
} from "../../../src/contracts";

export const APP_DATABASE_NAME = "2048_next_app";
export const APP_DATABASE_VERSION = 2;
export const APP_DATABASE_SCHEMA_VERSION = 1 as const;

export const DEFAULT_APP_CACHE_MAX_ENTRIES = 128;
export const DEFAULT_APP_REPLAY_CACHE_MAX_BYTES = 16 * 1024 * 1024;
export const DEFAULT_APP_DIAGNOSTIC_MAX_ENTRIES = 200;
export const DEFAULT_APP_DIAGNOSTIC_MAX_PAYLOAD_BYTES = 16 * 1024;
const APP_OUTBOX_MAX_PAYLOAD_BYTES = 1024 * 1024;
const APP_CACHE_MAX_ENTRY_BYTES = 2 * 1024 * 1024;

const STORES = {
  saves: "saves",
  records: "records",
  outbox: "outbox",
  cache: "cache",
  diagnostics: "diagnostics",
} as const;

const SYSTEM_OWNER_KEY = "__system__";
const OWNER_CLEAR_PREFIX = "system:owner-clear:";
const SAVE_HEAD_PREFIX = "system:save-head:";
const SYSTEM_CACHE_PREFIX = "system:";

export type AppOwnerKey = "guest" | `user:${string}`;
export type CacheOwnerKey = AppOwnerKey | "public";
export type SaveLifecycle = "active" | "pending_terminal";
export type GameKind = "normal" | "ranked";
export type RecordSource = "guest" | "normal" | "ranked";
export type RecordUploadStatus = "local" | "pending" | "uploaded" | "failed";
export type OutboxKind =
  | "record.submit"
  | "ranked.session_start"
  | "ranked.attempt"
  | "ranked.abandon";
export type DiagnosticUploadPolicy = "never" | "allowed";
export type CacheKind =
  | "cloud_history"
  | "leaderboard"
  | "achievements"
  | "replay";

export interface StoredGameSave {
  schemaVersion: typeof APP_DATABASE_SCHEMA_VERSION;
  ownerKey: AppOwnerKey;
  modeKey: AppModeKey;
  clientRecordId: string;
  generation: number;
  lifecycle: SaveLifecycle;
  gameKind: GameKind;
  revision: number;
  /** Device wall-clock checkpoint used for recency and cross-process elapsed time. */
  lastClosedAt: number;
  rankedSessionId: string | null;
  /** `savedAtMs` inside the snapshot belongs to the session's logical clock. */
  snapshot: GameSnapshot;
}

export interface StoredGameRecord {
  schemaVersion: typeof APP_DATABASE_SCHEMA_VERSION;
  clientRecordId: string;
  ownerKey: AppOwnerKey;
  modeKey: AppModeKey;
  source: RecordSource;
  endedAt: number;
  score: number;
  bestTile: number;
  steps: number;
  durationMs: number;
  boardSum: number;
  replay: ReplayRecord;
  finalSnapshot: GameSnapshot;
  uploadStatus: RecordUploadStatus;
}

interface StoredOutboxBase {
  schemaVersion: typeof APP_DATABASE_SCHEMA_VERSION;
  operationId: string;
  ownerKey: AppOwnerKey;
  attemptCount: number;
  nextAttemptAt: number;
  lastErrorCode: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface RankedSessionStartFingerprint {
  rankedSessionId: string;
  challengeId: string;
  seed: number;
  startedAtMs: number;
  expiresAtEpochSeconds: number;
}

export type StoredOutboxItem =
  | (StoredOutboxBase & {
      kind: "record.submit";
      clientRecordId: string;
      payload: { clientRecordId: string };
    })
  | (StoredOutboxBase & {
      kind: "ranked.session_start";
      clientRecordId: null;
      payload: {
        modeKey: AppModeKey;
        frozen?: RankedSessionStartFingerprint;
      };
    })
  | (StoredOutboxBase & {
      kind: "ranked.attempt";
      clientRecordId: string;
      payload: { clientRecordId: string; challengeId: string };
    })
  | (StoredOutboxBase & {
      kind: "ranked.abandon";
      clientRecordId: null;
      payload: { challengeId: string };
    });

interface StoredCacheEntryBase {
  schemaVersion: typeof APP_DATABASE_SCHEMA_VERSION;
  cacheKey: string;
  ownerKey: CacheOwnerKey;
  kind: "data";
  fetchedAt: number;
  lastAccessedAt: number;
  sizeBytes: number;
}

export interface CachedHistoryRow {
  id: string;
  clientRecordId: string | null;
  modeKey: AppModeKey;
  source: "normal" | "ranked" | "migration" | "admin";
  score: number;
  boardSum: number;
  durationMs: number;
  steps: number;
  bestTile: number;
  endedAt: string;
  deletedAt: string | null;
  restoreUntil: string | null;
  replayAvailable: boolean;
}

export interface CloudHistoryCacheValue {
  rows: CachedHistoryRow[];
  page: number;
  totalPages: number;
  hasNext: boolean;
  status: "active" | "deleted" | "all";
}

export interface CachedLeaderboardRow {
  rank: number;
  userId: string;
  nickname: string;
  score: number | null;
  speedMs: number | null;
  achievedAt: string;
}

export interface LeaderboardCacheValue {
  rows: CachedLeaderboardRow[];
  page: number;
  hasNext: boolean;
}

export interface CachedAchievementRow {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  earnedAt: string | null;
  source: "record" | "event" | "manual" | "backfill" | null;
}

export interface AchievementsCacheValue {
  earned: CachedAchievementRow[];
  available: CachedAchievementRow[];
}

export type StoredCacheEntry =
  | (StoredCacheEntryBase & {
      cacheKind: "cloud_history";
      value: CloudHistoryCacheValue;
    })
  | (StoredCacheEntryBase & {
      cacheKind: "leaderboard";
      value: LeaderboardCacheValue;
    })
  | (StoredCacheEntryBase & {
      cacheKind: "achievements";
      value: AchievementsCacheValue;
    })
  | (StoredCacheEntryBase & {
      cacheKind: "replay";
      value: ReplayRecord;
    });

export interface StoredDiagnosticPayload {
  errorType: string;
  stack: string | null;
  appVersion: string;
  buildNumber: string;
  androidVersion: string | null;
  webViewVersion: string | null;
}

interface OwnerClearMarker {
  schemaVersion: typeof APP_DATABASE_SCHEMA_VERSION;
  cacheKey: string;
  ownerKey: typeof SYSTEM_OWNER_KEY;
  kind: "owner_clear";
  targetOwnerKey: AppOwnerKey;
  createdAt: number;
  lastAccessedAt: number;
  sizeBytes: 0;
}

interface SaveHeadMarker {
  schemaVersion: typeof APP_DATABASE_SCHEMA_VERSION;
  cacheKey: string;
  ownerKey: AppOwnerKey;
  kind: "save_head";
  modeKey: AppModeKey;
  clientRecordId: string;
  generation: number;
  state: "active" | "closed";
  updatedAt: number;
  lastAccessedAt: number;
  sizeBytes: 0;
}

type StoredCacheRow = StoredCacheEntry | OwnerClearMarker | SaveHeadMarker;

export interface StoredDiagnostic {
  schemaVersion: typeof APP_DATABASE_SCHEMA_VERSION;
  eventId: string;
  ownerKey: AppOwnerKey;
  category: string;
  occurredAt: number;
  uploadPolicy: DiagnosticUploadPolicy;
  uploadedAt: number | null;
  payload: StoredDiagnosticPayload;
}

export type SaveReadResult =
  | { status: "missing" }
  | { status: "ok"; save: StoredGameSave }
  | {
      status: "corrupt";
      ownerKey: AppOwnerKey;
      modeKey: AppModeKey;
      reason: string;
    }
  | {
      status: "future_schema";
      ownerKey: AppOwnerKey;
      modeKey: AppModeKey;
      schemaVersion: number;
    };

export interface FinalizeTerminalInput {
  ownerKey: AppOwnerKey;
  modeKey: AppModeKey;
  expectedSaveRevision: number;
  record: StoredGameRecord;
  outbox?: StoredOutboxItem;
}

export interface FinalizeTerminalResult {
  created: boolean;
  record: StoredGameRecord;
}

export interface DeleteSaveInput {
  ownerKey: AppOwnerKey;
  modeKey: AppModeKey;
  expectedClientRecordId: string;
  expectedGeneration: number;
  closedAt: number;
}

export type StartNewGameInput = Omit<StoredGameSave, "generation">;

export type AppDatabaseFaultPoint =
  | "finalize.after_record"
  | "finalize.after_outbox"
  | "finalize.after_save_delete"
  | "clear.after_saves"
  | "clear.after_records"
  | "clear.after_outbox"
  | "clear.after_cache"
  | "clear.after_diagnostics"
  | "clear.after_marker_delete";

export interface AppDatabaseOptions {
  name?: string;
  factory?: IDBFactory;
  keyRange?: typeof IDBKeyRange;
  faultInjector?: (point: AppDatabaseFaultPoint) => void;
  cacheMaxEntries?: number;
  replayCacheMaxBytes?: number;
  diagnosticMaxEntries?: number;
  diagnosticMaxPayloadBytes?: number;
}

export class AppDatabaseError extends Error {
  readonly code: string;

  constructor(code: string, message = code) {
    super(message);
    this.name = "AppDatabaseError";
    this.code = code;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

function requireNonEmptyText(value: unknown, field: string): string {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized)
    throw new AppDatabaseError("invalid_input", `${field} is required`);
  return normalized;
}

function requirePositiveSafeInteger(value: unknown, field: string): number {
  if (!Number.isSafeInteger(value) || Number(value) <= 0) {
    throw new AppDatabaseError(
      "invalid_option",
      `${field} must be a positive safe integer`,
    );
  }
  return Number(value);
}

function serializedByteLength(value: unknown): number {
  try {
    const serialized = JSON.stringify(value);
    if (serialized === undefined)
      throw new Error("value is not JSON serializable");
    return new TextEncoder().encode(serialized).byteLength;
  } catch {
    throw new AppDatabaseError("invalid_serialized_value");
  }
}

function assertCredentialFreeJson(
  value: unknown,
  code: string,
  maxBytes: number,
): void {
  if (serializedByteLength(value) > maxBytes) throw new AppDatabaseError(code);
  const visit = (current: unknown): void => {
    if (typeof current === "string") {
      if (
        /^Bearer\s+/iu.test(current) ||
        /^[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}$/u.test(
          current,
        )
      ) {
        throw new AppDatabaseError(code);
      }
      return;
    }
    if (
      current === null ||
      typeof current === "boolean" ||
      (typeof current === "number" && Number.isFinite(current))
    ) {
      return;
    }
    if (Array.isArray(current)) {
      for (const item of current) visit(item);
      return;
    }
    if (
      !isRecord(current) ||
      Object.getPrototypeOf(current) !== Object.prototype
    ) {
      throw new AppDatabaseError(code);
    }
    for (const [key, nested] of Object.entries(current)) {
      const normalizedKey = key.replace(/[^a-z0-9]/giu, "").toLowerCase();
      if (
        normalizedKey.includes("password") ||
        normalizedKey === "auth" ||
        normalizedKey.includes("authorization") ||
        normalizedKey.includes("credential") ||
        normalizedKey.includes("cookie") ||
        normalizedKey.includes("session") ||
        normalizedKey.includes("secret") ||
        (normalizedKey.endsWith("token") && !normalizedKey.endsWith("tokenref"))
      ) {
        throw new AppDatabaseError(code);
      }
      visit(nested);
    }
  };
  visit(value);
}

export function userOwnerKey(userId: string | number): AppOwnerKey {
  const normalized = String(userId).trim();
  if (!/^[1-9]\d*$/u.test(normalized)) {
    throw new AppDatabaseError(
      "invalid_owner",
      "user id must be a positive integer",
    );
  }
  return `user:${normalized}`;
}

export function isAppOwnerKey(value: unknown): value is AppOwnerKey {
  return (
    value === "guest" ||
    (typeof value === "string" && /^user:[1-9]\d*$/u.test(value))
  );
}

function assertOwnerKey(value: unknown): asserts value is AppOwnerKey {
  if (!isAppOwnerKey(value)) throw new AppDatabaseError("invalid_owner");
}

function assertCacheOwnerKey(value: unknown): asserts value is CacheOwnerKey {
  if (value !== "public") assertOwnerKey(value);
}

function assertModeKey(value: unknown): asserts value is AppModeKey {
  if (!isAppModeKey(value)) throw new AppDatabaseError("invalid_mode");
}

function cloneValue<T>(value: T): T {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}

function markerKey(ownerKey: AppOwnerKey): string {
  return `${OWNER_CLEAR_PREFIX}${ownerKey}`;
}

function saveHeadKey(modeKey: AppModeKey): string {
  return `${SAVE_HEAD_PREFIX}${modeKey}`;
}

function isReservedCacheKey(cacheKey: string): boolean {
  return cacheKey.startsWith(SYSTEM_CACHE_PREFIX);
}

function inferLegacyCacheKind(cacheKey: unknown): CacheKind {
  const key = typeof cacheKey === "string" ? cacheKey.toLowerCase() : "";
  if (key.includes("replay")) return "replay";
  if (key.includes("leaderboard")) return "leaderboard";
  if (key.includes("achievement")) return "achievements";
  return "cloud_history";
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new AppDatabaseError("idb_request_failed"));
  });
}

function transactionCompletion(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () =>
      reject(
        transaction.error ?? new AppDatabaseError("idb_transaction_aborted"),
      );
    transaction.onerror = () =>
      reject(
        transaction.error ?? new AppDatabaseError("idb_transaction_failed"),
      );
  });
}

function abortTransaction(transaction: IDBTransaction): void {
  try {
    transaction.abort();
  } catch {
    // The original operation error remains the authoritative failure.
  }
}

function createSchema(database: IDBDatabase): void {
  const saves = database.createObjectStore(STORES.saves, {
    keyPath: ["ownerKey", "modeKey"],
  });
  saves.createIndex("by_owner", "ownerKey", { unique: false });
  saves.createIndex("by_owner_last_closed", ["ownerKey", "lastClosedAt"], {
    unique: false,
  });

  const records = database.createObjectStore(STORES.records, {
    keyPath: "clientRecordId",
  });
  records.createIndex("by_owner", "ownerKey", { unique: false });
  records.createIndex("by_owner_ended", ["ownerKey", "endedAt"], {
    unique: false,
  });
  records.createIndex(
    "by_owner_mode_ended",
    ["ownerKey", "modeKey", "endedAt"],
    {
      unique: false,
    },
  );
  records.createIndex("by_owner_upload", ["ownerKey", "uploadStatus"], {
    unique: false,
  });

  const outbox = database.createObjectStore(STORES.outbox, {
    keyPath: "operationId",
  });
  outbox.createIndex("by_owner", "ownerKey", { unique: false });
  outbox.createIndex("by_owner_next_attempt", ["ownerKey", "nextAttemptAt"], {
    unique: false,
  });

  const cache = database.createObjectStore(STORES.cache, {
    keyPath: ["ownerKey", "cacheKey"],
  });
  cache.createIndex("by_owner", "ownerKey", { unique: false });
  cache.createIndex("by_kind", "kind", { unique: false });
  cache.createIndex("by_kind_last_accessed", ["kind", "lastAccessedAt"], {
    unique: false,
  });
  cache.createIndex(
    "by_cache_kind_last_accessed",
    ["cacheKind", "lastAccessedAt"],
    {
      unique: false,
    },
  );

  const diagnostics = database.createObjectStore(STORES.diagnostics, {
    keyPath: "eventId",
  });
  diagnostics.createIndex("by_owner", "ownerKey", { unique: false });
  diagnostics.createIndex("by_owner_occurred", ["ownerKey", "occurredAt"], {
    unique: false,
  });
  diagnostics.createIndex("by_upload_policy", "uploadPolicy", {
    unique: false,
  });
  diagnostics.createIndex("by_occurred", "occurredAt", { unique: false });
}

function upgradeSchemaFromV1(
  database: IDBDatabase,
  transaction: IDBTransaction,
): void {
  const records = transaction.objectStore(STORES.records);
  if (!records.indexNames.contains("by_owner_mode_ended")) {
    records.createIndex(
      "by_owner_mode_ended",
      ["ownerKey", "modeKey", "endedAt"],
      {
        unique: false,
      },
    );
  }

  const cacheRows: Record<string, unknown>[] = [];
  const saveHeads: SaveHeadMarker[] = [];
  let cacheReady = false;
  let savesReady = false;
  let cacheRebuilt = false;
  const rebuildCache = () => {
    if (!cacheReady || !savesReady || cacheRebuilt) return;
    cacheRebuilt = true;
    database.deleteObjectStore(STORES.cache);
    const cache = database.createObjectStore(STORES.cache, {
      keyPath: ["ownerKey", "cacheKey"],
    });
    cache.createIndex("by_owner", "ownerKey", { unique: false });
    cache.createIndex("by_kind", "kind", { unique: false });
    cache.createIndex("by_kind_last_accessed", ["kind", "lastAccessedAt"], {
      unique: false,
    });
    cache.createIndex(
      "by_cache_kind_last_accessed",
      ["cacheKind", "lastAccessedAt"],
      { unique: false },
    );
    for (const row of cacheRows) cache.add(row);
    for (const head of saveHeads) cache.add(head);
  };

  const legacyCache = transaction.objectStore(STORES.cache);
  const cacheCursor = legacyCache.openCursor();
  cacheCursor.onsuccess = () => {
    const cursor = cacheCursor.result;
    if (!cursor) {
      cacheReady = true;
      rebuildCache();
      return;
    }
    const row = cursor.value as Record<string, unknown>;
    cacheRows.push(
      row.schemaVersion === APP_DATABASE_SCHEMA_VERSION &&
        row.kind === "data" &&
        typeof row.cacheKind !== "string"
        ? {
            ...row,
            cacheKind: inferLegacyCacheKind(row.cacheKey),
            sizeBytes: serializedByteLength(row.value),
          }
        : row,
    );
    cursor.continue();
  };

  const saves = transaction.objectStore(STORES.saves);
  const saveCursor = saves.openCursor();
  saveCursor.onsuccess = () => {
    const cursor = saveCursor.result;
    if (!cursor) {
      savesReady = true;
      rebuildCache();
      return;
    }
    const row = cursor.value as Record<string, unknown>;
    if (
      row.schemaVersion === APP_DATABASE_SCHEMA_VERSION &&
      isAppOwnerKey(row.ownerKey) &&
      isAppModeKey(row.modeKey)
    ) {
      const generation =
        isNonNegativeSafeInteger(row.generation) && row.generation >= 1
          ? row.generation
          : 1;
      const clientRecordId =
        typeof row.clientRecordId === "string" && row.clientRecordId.trim()
          ? row.clientRecordId.trim()
          : `legacy:${row.ownerKey}:${row.modeKey}:${String(row.revision)}:${String(row.lastClosedAt)}`;
      const updatedAt = isNonNegativeSafeInteger(row.lastClosedAt)
        ? row.lastClosedAt
        : 0;
      cursor.update({ ...row, generation, clientRecordId });
      saveHeads.push({
        schemaVersion: APP_DATABASE_SCHEMA_VERSION,
        cacheKey: saveHeadKey(row.modeKey),
        ownerKey: row.ownerKey,
        kind: "save_head",
        modeKey: row.modeKey,
        clientRecordId,
        generation,
        state: "active",
        updatedAt,
        lastAccessedAt: updatedAt,
        sizeBytes: 0,
      });
    }
    cursor.continue();
  };

  const diagnostics = transaction.objectStore(STORES.diagnostics);
  if (!diagnostics.indexNames.contains("by_occurred")) {
    diagnostics.createIndex("by_occurred", "occurredAt", { unique: false });
  }
}

function openDatabase(factory: IDBFactory, name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;
      reject(error);
    };
    const request = factory.open(name, APP_DATABASE_VERSION);
    request.onupgradeneeded = (event) => {
      const oldVersion = (event as IDBVersionChangeEvent).oldVersion;
      if (oldVersion === 0) {
        createSchema(request.result);
        return;
      }
      if (oldVersion === 1 && request.transaction) {
        upgradeSchemaFromV1(request.result, request.transaction);
        return;
      }
      if (oldVersion !== APP_DATABASE_VERSION) {
        request.transaction?.abort();
        fail(new AppDatabaseError("unsupported_schema_upgrade"));
      }
    };
    request.onsuccess = () => {
      if (settled) {
        request.result.close();
        return;
      }
      settled = true;
      resolve(request.result);
    };
    request.onerror = () => {
      if (request.error?.name === "VersionError") {
        fail(new AppDatabaseError("future_database_schema"));
        return;
      }
      fail(request.error ?? new AppDatabaseError("idb_open_failed"));
    };
    request.onblocked = () => fail(new AppDatabaseError("idb_open_blocked"));
  });
}

function normalizeSave(value: unknown): SaveReadResult | null {
  if (!isRecord(value)) return null;
  const ownerKey = value.ownerKey;
  const modeKey = value.modeKey;
  if (!isAppOwnerKey(ownerKey) || !isAppModeKey(modeKey)) return null;
  const schemaVersion = Number(value.schemaVersion);
  if (schemaVersion > APP_DATABASE_SCHEMA_VERSION) {
    return { status: "future_schema", ownerKey, modeKey, schemaVersion };
  }
  if (
    schemaVersion !== APP_DATABASE_SCHEMA_VERSION ||
    (value.lifecycle !== "active" && value.lifecycle !== "pending_terminal") ||
    (value.gameKind !== "normal" && value.gameKind !== "ranked") ||
    typeof value.clientRecordId !== "string" ||
    value.clientRecordId.trim().length === 0 ||
    !isNonNegativeSafeInteger(value.generation) ||
    value.generation < 1 ||
    !isNonNegativeSafeInteger(value.revision) ||
    !isNonNegativeSafeInteger(value.lastClosedAt) ||
    (value.rankedSessionId !== null &&
      typeof value.rankedSessionId !== "string") ||
    !isGameSnapshotLike(value.snapshot) ||
    value.snapshot.state.modeKey !== modeKey ||
    value.snapshot.version !== APP_GAME_CONTRACT_VERSION ||
    (value.gameKind === "ranked" &&
      (typeof value.rankedSessionId !== "string" ||
        value.rankedSessionId.trim().length === 0)) ||
    (value.gameKind === "normal" && value.rankedSessionId !== null) ||
    (value.lifecycle === "active" && value.snapshot.state.gameOver) ||
    (value.lifecycle === "pending_terminal" &&
      (modeKey !== "classic_4x4_pow2_undo" ||
        !value.snapshot.state.gameOver ||
        value.snapshot.state.undoStack.length === 0))
  ) {
    return {
      status: "corrupt",
      ownerKey,
      modeKey,
      reason: "invalid_save_shape",
    };
  }
  return { status: "ok", save: cloneValue(value as unknown as StoredGameSave) };
}

function assertValidSave(save: StoredGameSave): void {
  const normalized = normalizeSave(save);
  if (!normalized || normalized.status !== "ok")
    throw new AppDatabaseError("invalid_save");
  if (save.gameKind === "ranked")
    requireNonEmptyText(save.rankedSessionId, "rankedSessionId");
  if (save.gameKind === "normal" && save.rankedSessionId !== null) {
    throw new AppDatabaseError("invalid_normal_save");
  }
  if (save.lifecycle === "active" && save.snapshot.state.gameOver) {
    throw new AppDatabaseError("invalid_active_save");
  }
  if (
    save.lifecycle === "pending_terminal" &&
    (save.modeKey !== "classic_4x4_pow2_undo" ||
      !save.snapshot.state.gameOver ||
      save.snapshot.state.undoStack.length === 0)
  ) {
    throw new AppDatabaseError("invalid_pending_terminal_save");
  }
}

function saveRevisionContent(save: StoredGameSave): string {
  const { lastClosedAt: _lastClosedAt, ...content } = save;
  return JSON.stringify({
    ...content,
    snapshot: { ...content.snapshot, savedAtMs: 0 },
  });
}

function assertValidRecord(record: StoredGameRecord): void {
  assertOwnerKey(record.ownerKey);
  assertModeKey(record.modeKey);
  requireNonEmptyText(record.clientRecordId, "clientRecordId");
  if (
    record.schemaVersion !== APP_DATABASE_SCHEMA_VERSION ||
    !["guest", "normal", "ranked"].includes(record.source) ||
    !["local", "pending", "uploaded", "failed"].includes(record.uploadStatus) ||
    !isNonNegativeSafeInteger(record.endedAt) ||
    !isNonNegativeSafeInteger(record.score) ||
    !isNonNegativeSafeInteger(record.bestTile) ||
    !isNonNegativeSafeInteger(record.steps) ||
    !isNonNegativeSafeInteger(record.durationMs) ||
    !isNonNegativeSafeInteger(record.boardSum) ||
    !isGameSnapshotLike(record.finalSnapshot) ||
    record.finalSnapshot.state.modeKey !== record.modeKey ||
    !record.finalSnapshot.state.gameOver ||
    !isReplayRecordLike(record.replay) ||
    record.replay.modeKey !== record.modeKey
  ) {
    throw new AppDatabaseError("invalid_record");
  }
  const boardValues = record.finalSnapshot.state.board.flat();
  if (
    record.score !== record.finalSnapshot.state.score ||
    record.steps !== record.finalSnapshot.state.steps ||
    record.durationMs !== record.finalSnapshot.state.durationMs ||
    record.bestTile !== Math.max(...boardValues) ||
    record.boardSum !== boardValues.reduce((sum, value) => sum + value, 0)
  ) {
    throw new AppDatabaseError("inconsistent_record");
  }
  if (
    record.ownerKey === "guest" &&
    (record.source !== "guest" || record.uploadStatus !== "local")
  ) {
    throw new AppDatabaseError("invalid_guest_record");
  }
  if (record.ownerKey !== "guest" && record.source === "guest") {
    throw new AppDatabaseError("invalid_account_record");
  }
  if (record.ownerKey !== "guest" && record.uploadStatus === "local") {
    throw new AppDatabaseError("invalid_account_upload_status");
  }
  if (record.source === "ranked" && !record.finalSnapshot.state.challengeId) {
    throw new AppDatabaseError("ranked_record_missing_challenge");
  }
}

function hasExactKeys(
  value: unknown,
  keys: readonly string[],
): value is Record<string, unknown> {
  return (
    isRecord(value) &&
    Object.keys(value).sort().join("\0") === [...keys].sort().join("\0")
  );
}

function isStableReference(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9:_-]{1,160}$/u.test(value);
}

function isRankedStartFingerprint(
  value: unknown,
): value is RankedSessionStartFingerprint {
  return (
    hasExactKeys(value, [
      "rankedSessionId",
      "challengeId",
      "seed",
      "startedAtMs",
      "expiresAtEpochSeconds",
    ]) &&
    isStableReference(value.rankedSessionId) &&
    isStableReference(value.challengeId) &&
    isNonNegativeSafeInteger(value.seed) &&
    value.seed <= 0xffffffff &&
    isNonNegativeSafeInteger(value.startedAtMs) &&
    isNonNegativeSafeInteger(value.expiresAtEpochSeconds)
  );
}

function sameRankedStartFingerprint(
  left: RankedSessionStartFingerprint,
  right: RankedSessionStartFingerprint,
): boolean {
  return (
    left.rankedSessionId === right.rankedSessionId &&
    left.challengeId === right.challengeId &&
    left.seed === right.seed &&
    left.startedAtMs === right.startedAtMs &&
    left.expiresAtEpochSeconds === right.expiresAtEpochSeconds
  );
}

function assertValidOutbox(item: StoredOutboxItem): void {
  assertOwnerKey(item.ownerKey);
  requireNonEmptyText(item.operationId, "operationId");
  if (
    item.schemaVersion !== APP_DATABASE_SCHEMA_VERSION ||
    ![
      "record.submit",
      "ranked.session_start",
      "ranked.attempt",
      "ranked.abandon",
    ].includes(item.kind) ||
    !isNonNegativeSafeInteger(item.attemptCount) ||
    !isNonNegativeSafeInteger(item.nextAttemptAt) ||
    !isNonNegativeSafeInteger(item.createdAt) ||
    !isNonNegativeSafeInteger(item.updatedAt) ||
    (item.lastErrorCode !== null && typeof item.lastErrorCode !== "string")
  ) {
    throw new AppDatabaseError("invalid_outbox");
  }
  if (serializedByteLength(item.payload) > APP_OUTBOX_MAX_PAYLOAD_BYTES) {
    throw new AppDatabaseError("invalid_outbox_payload");
  }
  switch (item.kind) {
    case "record.submit":
      if (
        !isStableReference(item.clientRecordId) ||
        !hasExactKeys(item.payload, ["clientRecordId"]) ||
        item.payload.clientRecordId !== item.clientRecordId
      ) {
        throw new AppDatabaseError("invalid_outbox_payload");
      }
      return;
    case "ranked.session_start":
      if (
        item.clientRecordId !== null ||
        (!hasExactKeys(item.payload, ["modeKey"]) &&
          !hasExactKeys(item.payload, ["modeKey", "frozen"])) ||
        !isAppModeKey(item.payload.modeKey) ||
        ("frozen" in item.payload &&
          !isRankedStartFingerprint(item.payload.frozen))
      ) {
        throw new AppDatabaseError("invalid_outbox_payload");
      }
      return;
    case "ranked.attempt":
      if (
        !isStableReference(item.clientRecordId) ||
        !hasExactKeys(item.payload, ["clientRecordId", "challengeId"]) ||
        item.payload.clientRecordId !== item.clientRecordId ||
        !isStableReference(item.payload.challengeId)
      ) {
        throw new AppDatabaseError("invalid_outbox_payload");
      }
      return;
    case "ranked.abandon":
      if (
        item.clientRecordId !== null ||
        !hasExactKeys(item.payload, ["challengeId"]) ||
        !isStableReference(item.payload.challengeId)
      ) {
        throw new AppDatabaseError("invalid_outbox_payload");
      }
      return;
  }
}

function isIsoTimestamp(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= 40 &&
    Number.isFinite(Date.parse(value))
  );
}

function isSafeDisplayText(value: unknown, maxLength: number): value is string {
  return (
    typeof value === "string" && value.length > 0 && value.length <= maxLength
  );
}

function isSafeIconUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0 || value.length > 512)
    return false;
  if (value.startsWith("/") && !value.startsWith("//"))
    return !/[?#]/u.test(value);
  try {
    const url = new URL(value);
    return (
      (url.protocol === "https:" || url.protocol === "http:") &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash
    );
  } catch {
    return false;
  }
}

function assertValidHistoryCache(value: CloudHistoryCacheValue): void {
  if (
    !hasExactKeys(value, ["rows", "page", "totalPages", "hasNext", "status"]) ||
    !Array.isArray(value.rows) ||
    !Number.isSafeInteger(value.page) ||
    value.page < 1 ||
    !isNonNegativeSafeInteger(value.totalPages) ||
    typeof value.hasNext !== "boolean" ||
    !["active", "deleted", "all"].includes(value.status)
  ) {
    throw new AppDatabaseError("invalid_cache_value");
  }
  for (const row of value.rows) {
    if (
      !hasExactKeys(row, [
        "id",
        "clientRecordId",
        "modeKey",
        "source",
        "score",
        "boardSum",
        "durationMs",
        "steps",
        "bestTile",
        "endedAt",
        "deletedAt",
        "restoreUntil",
        "replayAvailable",
      ]) ||
      !isStableReference(row.id) ||
      (row.clientRecordId !== null && !isStableReference(row.clientRecordId)) ||
      !isAppModeKey(row.modeKey) ||
      !["normal", "ranked", "migration", "admin"].includes(row.source) ||
      !isNonNegativeSafeInteger(row.score) ||
      !isNonNegativeSafeInteger(row.boardSum) ||
      !isNonNegativeSafeInteger(row.durationMs) ||
      !isNonNegativeSafeInteger(row.steps) ||
      !isNonNegativeSafeInteger(row.bestTile) ||
      !isIsoTimestamp(row.endedAt) ||
      (row.deletedAt !== null && !isIsoTimestamp(row.deletedAt)) ||
      (row.restoreUntil !== null && !isIsoTimestamp(row.restoreUntil)) ||
      typeof row.replayAvailable !== "boolean"
    ) {
      throw new AppDatabaseError("invalid_cache_value");
    }
  }
}

function assertValidLeaderboardCache(value: LeaderboardCacheValue): void {
  if (
    !hasExactKeys(value, ["rows", "page", "hasNext"]) ||
    !Array.isArray(value.rows) ||
    !Number.isSafeInteger(value.page) ||
    value.page < 1 ||
    typeof value.hasNext !== "boolean"
  ) {
    throw new AppDatabaseError("invalid_cache_value");
  }
  for (const row of value.rows) {
    if (
      !hasExactKeys(row, [
        "rank",
        "userId",
        "nickname",
        "score",
        "speedMs",
        "achievedAt",
      ]) ||
      !Number.isSafeInteger(row.rank) ||
      row.rank < 1 ||
      !isStableReference(row.userId) ||
      !isSafeDisplayText(row.nickname, 80) ||
      (row.score !== null && !isNonNegativeSafeInteger(row.score)) ||
      (row.speedMs !== null && !isNonNegativeSafeInteger(row.speedMs)) ||
      !isIsoTimestamp(row.achievedAt)
    ) {
      throw new AppDatabaseError("invalid_cache_value");
    }
  }
}

function assertValidAchievementsCache(value: AchievementsCacheValue): void {
  if (
    !hasExactKeys(value, ["earned", "available"]) ||
    !Array.isArray(value.earned) ||
    !Array.isArray(value.available)
  ) {
    throw new AppDatabaseError("invalid_cache_value");
  }
  for (const row of [...value.earned, ...value.available]) {
    if (
      !hasExactKeys(row, [
        "id",
        "name",
        "description",
        "iconUrl",
        "earnedAt",
        "source",
      ]) ||
      !isStableReference(row.id) ||
      !isSafeDisplayText(row.name, 160) ||
      !isSafeDisplayText(row.description, 1000) ||
      !isSafeIconUrl(row.iconUrl) ||
      (row.earnedAt !== null && !isIsoTimestamp(row.earnedAt)) ||
      (row.source !== null &&
        !["record", "event", "manual", "backfill"].includes(row.source))
    ) {
      throw new AppDatabaseError("invalid_cache_value");
    }
  }
}

function assertExactReplayRecord(value: ReplayRecord): void {
  if (
    !isReplayRecordLike(value) ||
    !hasExactKeys(
      value,
      value.kind === "rpl1"
        ? ["version", "kind", "modeKey", "replayString"]
        : [
            "version",
            "kind",
            "modeKey",
            "initialBoardEncoded",
            "actionsEncoded",
            "replayString",
          ],
    )
  ) {
    throw new AppDatabaseError("invalid_cache_value");
  }
}

function assertValidCache(entry: StoredCacheEntry): void {
  assertCacheOwnerKey(entry.ownerKey);
  const cacheKey = requireNonEmptyText(entry.cacheKey, "cacheKey");
  if (
    entry.schemaVersion !== APP_DATABASE_SCHEMA_VERSION ||
    entry.kind !== "data" ||
    !["cloud_history", "leaderboard", "achievements", "replay"].includes(
      entry.cacheKind,
    ) ||
    isReservedCacheKey(cacheKey) ||
    !isNonNegativeSafeInteger(entry.fetchedAt) ||
    !isNonNegativeSafeInteger(entry.lastAccessedAt) ||
    !isNonNegativeSafeInteger(entry.sizeBytes) ||
    entry.sizeBytes !== serializedByteLength(entry.value)
  ) {
    throw new AppDatabaseError("invalid_cache");
  }
  assertCredentialFreeJson(
    entry.value,
    "invalid_cache_value",
    APP_CACHE_MAX_ENTRY_BYTES,
  );
  switch (entry.cacheKind) {
    case "cloud_history":
      assertValidHistoryCache(entry.value);
      return;
    case "leaderboard":
      assertValidLeaderboardCache(entry.value);
      return;
    case "achievements":
      assertValidAchievementsCache(entry.value);
      return;
    case "replay":
      assertExactReplayRecord(entry.value);
      return;
  }
}

const DIAGNOSTIC_PAYLOAD_KEYS = [
  "errorType",
  "stack",
  "appVersion",
  "buildNumber",
  "androidVersion",
  "webViewVersion",
] as const;

function isBoundedText(value: unknown, maxLength: number): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= maxLength
  );
}

function isNullableBoundedText(
  value: unknown,
  maxLength: number,
): value is string | null {
  return value === null || isBoundedText(value, maxLength);
}

function assertValidDiagnostic(
  diagnostic: StoredDiagnostic,
  maxPayloadBytes: number,
): void {
  assertOwnerKey(diagnostic.ownerKey);
  requireNonEmptyText(diagnostic.eventId, "eventId");
  requireNonEmptyText(diagnostic.category, "category");
  const payload = diagnostic.payload;
  const payloadKeys = isRecord(payload) ? Object.keys(payload).sort() : [];
  const expectedKeys = [...DIAGNOSTIC_PAYLOAD_KEYS].sort();
  if (
    diagnostic.schemaVersion !== APP_DATABASE_SCHEMA_VERSION ||
    !isNonNegativeSafeInteger(diagnostic.occurredAt) ||
    (diagnostic.uploadPolicy !== "never" &&
      diagnostic.uploadPolicy !== "allowed") ||
    (diagnostic.uploadedAt !== null &&
      !isNonNegativeSafeInteger(diagnostic.uploadedAt)) ||
    !isRecord(payload) ||
    JSON.stringify(payloadKeys) !== JSON.stringify(expectedKeys) ||
    !isBoundedText(payload.errorType, 128) ||
    !isNullableBoundedText(payload.stack, 8192) ||
    !isBoundedText(payload.appVersion, 64) ||
    !isBoundedText(payload.buildNumber, 64) ||
    !isNullableBoundedText(payload.androidVersion, 128) ||
    !isNullableBoundedText(payload.webViewVersion, 128) ||
    serializedByteLength(payload) > maxPayloadBytes
  ) {
    throw new AppDatabaseError("invalid_diagnostic");
  }
}

function assertCurrentSchemaRow(
  value: unknown,
  corruptCode: string,
): asserts value is Record<string, unknown> {
  if (!isRecord(value) || !Number.isSafeInteger(value.schemaVersion)) {
    throw new AppDatabaseError(corruptCode);
  }
  if (Number(value.schemaVersion) > APP_DATABASE_SCHEMA_VERSION) {
    throw new AppDatabaseError("future_schema");
  }
  if (value.schemaVersion !== APP_DATABASE_SCHEMA_VERSION) {
    throw new AppDatabaseError(corruptCode);
  }
}

function assertValidOwnerClearMarker(
  value: unknown,
  expectedOwnerKey?: AppOwnerKey,
): asserts value is OwnerClearMarker {
  assertCurrentSchemaRow(value, "owner_clear_marker_corrupt");
  if (
    value.kind !== "owner_clear" ||
    value.ownerKey !== SYSTEM_OWNER_KEY ||
    !isAppOwnerKey(value.targetOwnerKey) ||
    (expectedOwnerKey !== undefined &&
      value.targetOwnerKey !== expectedOwnerKey) ||
    value.cacheKey !== markerKey(value.targetOwnerKey) ||
    !isNonNegativeSafeInteger(value.createdAt) ||
    !isNonNegativeSafeInteger(value.lastAccessedAt) ||
    value.sizeBytes !== 0
  ) {
    throw new AppDatabaseError("owner_clear_marker_corrupt");
  }
}

function assertValidSaveHead(
  value: unknown,
  expectedOwnerKey?: AppOwnerKey,
  expectedModeKey?: AppModeKey,
): asserts value is SaveHeadMarker {
  assertCurrentSchemaRow(value, "save_head_corrupt");
  if (
    value.kind !== "save_head" ||
    !isAppOwnerKey(value.ownerKey) ||
    !isAppModeKey(value.modeKey) ||
    (expectedOwnerKey !== undefined && value.ownerKey !== expectedOwnerKey) ||
    (expectedModeKey !== undefined && value.modeKey !== expectedModeKey) ||
    value.cacheKey !== saveHeadKey(value.modeKey) ||
    typeof value.clientRecordId !== "string" ||
    value.clientRecordId.trim().length === 0 ||
    !isNonNegativeSafeInteger(value.generation) ||
    value.generation < 1 ||
    (value.state !== "active" && value.state !== "closed") ||
    !isNonNegativeSafeInteger(value.updatedAt) ||
    !isNonNegativeSafeInteger(value.lastAccessedAt) ||
    value.sizeBytes !== 0
  ) {
    throw new AppDatabaseError("save_head_corrupt");
  }
}

function createSaveHead(
  save: StoredGameSave,
  state: SaveHeadMarker["state"],
): SaveHeadMarker {
  return {
    schemaVersion: APP_DATABASE_SCHEMA_VERSION,
    cacheKey: saveHeadKey(save.modeKey),
    ownerKey: save.ownerKey,
    kind: "save_head",
    modeKey: save.modeKey,
    clientRecordId: save.clientRecordId,
    generation: save.generation,
    state,
    updatedAt: save.lastClosedAt,
    lastAccessedAt: save.lastClosedAt,
    sizeBytes: 0,
  };
}

function normalizeSaveWithHead(
  value: unknown,
  head: unknown,
): SaveReadResult | null {
  const normalized = normalizeSave(value);
  if (!normalized || normalized.status !== "ok") return normalized;
  const { ownerKey, modeKey } = normalized.save;
  if (
    isRecord(head) &&
    Number.isSafeInteger(head.schemaVersion) &&
    Number(head.schemaVersion) > APP_DATABASE_SCHEMA_VERSION
  ) {
    return {
      status: "future_schema",
      ownerKey,
      modeKey,
      schemaVersion: Number(head.schemaVersion),
    };
  }
  try {
    assertValidSaveHead(head, ownerKey, modeKey);
  } catch {
    return {
      status: "corrupt",
      ownerKey,
      modeKey,
      reason: "invalid_save_head",
    };
  }
  if (
    head.state !== "active" ||
    head.generation !== normalized.save.generation ||
    head.clientRecordId !== normalized.save.clientRecordId
  ) {
    return {
      status: "corrupt",
      ownerKey,
      modeKey,
      reason: "save_head_mismatch",
    };
  }
  return normalized;
}

async function assertOwnerVisible(
  transaction: IDBTransaction,
  ownerKey: AppOwnerKey,
): Promise<void> {
  const marker = await requestResult(
    transaction
      .objectStore(STORES.cache)
      .get([SYSTEM_OWNER_KEY, markerKey(ownerKey)]),
  );
  if (marker) throw new AppDatabaseError("owner_clearing");
}

export class AppDatabase {
  readonly name: string;
  readonly #factory: IDBFactory;
  readonly #keyRange: typeof IDBKeyRange;
  readonly #faultInjector?: (point: AppDatabaseFaultPoint) => void;
  readonly #cacheMaxEntries: number;
  readonly #replayCacheMaxBytes: number;
  readonly #diagnosticMaxEntries: number;
  readonly #diagnosticMaxPayloadBytes: number;
  #databasePromise: Promise<IDBDatabase> | null = null;

  constructor(options: AppDatabaseOptions = {}) {
    const factory = options.factory ?? globalThis.indexedDB;
    const keyRange = options.keyRange ?? globalThis.IDBKeyRange;
    if (!factory || !keyRange)
      throw new AppDatabaseError("indexeddb_unavailable");
    this.name = options.name ?? APP_DATABASE_NAME;
    this.#factory = factory;
    this.#keyRange = keyRange;
    this.#faultInjector = options.faultInjector;
    this.#cacheMaxEntries = requirePositiveSafeInteger(
      options.cacheMaxEntries ?? DEFAULT_APP_CACHE_MAX_ENTRIES,
      "cacheMaxEntries",
    );
    this.#replayCacheMaxBytes = requirePositiveSafeInteger(
      options.replayCacheMaxBytes ?? DEFAULT_APP_REPLAY_CACHE_MAX_BYTES,
      "replayCacheMaxBytes",
    );
    this.#diagnosticMaxEntries = requirePositiveSafeInteger(
      options.diagnosticMaxEntries ?? DEFAULT_APP_DIAGNOSTIC_MAX_ENTRIES,
      "diagnosticMaxEntries",
    );
    this.#diagnosticMaxPayloadBytes = requirePositiveSafeInteger(
      options.diagnosticMaxPayloadBytes ??
        DEFAULT_APP_DIAGNOSTIC_MAX_PAYLOAD_BYTES,
      "diagnosticMaxPayloadBytes",
    );
  }

  async open(): Promise<void> {
    await this.#database();
  }

  async close(): Promise<void> {
    const pending = this.#databasePromise;
    this.#databasePromise = null;
    if (pending) (await pending).close();
  }

  async putSave(
    save: StoredGameSave,
  ): Promise<"written" | "unchanged" | "stale"> {
    assertValidSave(save);
    const database = await this.#database();
    const transaction = database.transaction(
      [STORES.cache, STORES.saves],
      "readwrite",
    );
    const completion = transactionCompletion(transaction);
    try {
      await assertOwnerVisible(transaction, save.ownerKey);
      const cache = transaction.objectStore(STORES.cache);
      const store = transaction.objectStore(STORES.saves);
      const headKey = saveHeadKey(save.modeKey);
      const head = await requestResult<SaveHeadMarker | undefined>(
        cache.get([save.ownerKey, headKey]),
      );
      if (head) {
        assertValidSaveHead(head, save.ownerKey, save.modeKey);
        if (save.generation < head.generation) {
          await completion;
          return "stale";
        }
        if (
          save.generation !== head.generation ||
          save.clientRecordId !== head.clientRecordId
        ) {
          throw new AppDatabaseError("save_game_conflict");
        }
        if (head.state === "closed") {
          throw new AppDatabaseError("save_game_closed");
        }
      } else if (save.generation !== 1) {
        throw new AppDatabaseError("invalid_initial_generation");
      }
      const existing = await requestResult<StoredGameSave | undefined>(
        store.get([save.ownerKey, save.modeKey]),
      );
      if (existing) {
        if (!head) throw new AppDatabaseError("save_head_missing");
        const normalizedExisting = normalizeSave(existing);
        if (
          !normalizedExisting ||
          normalizedExisting.status === "corrupt" ||
          normalizedExisting.status === "missing"
        ) {
          throw new AppDatabaseError("corrupt_save");
        }
        if (normalizedExisting.status === "future_schema") {
          throw new AppDatabaseError("future_schema");
        }
        if (normalizedExisting.save.revision > save.revision) {
          await completion;
          return "stale";
        }
        if (normalizedExisting.save.revision === save.revision) {
          if (
            saveRevisionContent(normalizedExisting.save) !==
            saveRevisionContent(save)
          ) {
            throw new AppDatabaseError("save_revision_conflict");
          }
          const sameWallCheckpoint =
            normalizedExisting.save.lastClosedAt === save.lastClosedAt;
          const sameLogicalCheckpoint =
            normalizedExisting.save.snapshot.savedAtMs ===
            save.snapshot.savedAtMs;
          if (sameWallCheckpoint && sameLogicalCheckpoint) {
            await completion;
            return "unchanged";
          }
          if (
            normalizedExisting.save.lastClosedAt > save.lastClosedAt ||
            normalizedExisting.save.snapshot.savedAtMs > save.snapshot.savedAtMs
          ) {
            await completion;
            return "stale";
          }
        }
      }
      store.put(cloneValue(save));
      cache.put(
        head
          ? {
              ...head,
              updatedAt: Math.max(head.updatedAt, save.lastClosedAt),
              lastAccessedAt: Math.max(head.lastAccessedAt, save.lastClosedAt),
            }
          : createSaveHead(save, "active"),
      );
      await completion;
      return "written";
    } catch (error) {
      abortTransaction(transaction);
      await completion.catch(() => undefined);
      throw error;
    }
  }

  async startNewGame(input: StartNewGameInput): Promise<StoredGameSave> {
    assertOwnerKey(input.ownerKey);
    assertModeKey(input.modeKey);
    requireNonEmptyText(input.clientRecordId, "clientRecordId");
    if (input.lifecycle !== "active") {
      throw new AppDatabaseError("new_game_must_be_active");
    }
    const database = await this.#database();
    const transaction = database.transaction(
      [STORES.cache, STORES.saves],
      "readwrite",
    );
    const completion = transactionCompletion(transaction);
    try {
      await assertOwnerVisible(transaction, input.ownerKey);
      const cache = transaction.objectStore(STORES.cache);
      const saves = transaction.objectStore(STORES.saves);
      const headKey = saveHeadKey(input.modeKey);
      const head = await requestResult<SaveHeadMarker | undefined>(
        cache.get([input.ownerKey, headKey]),
      );
      if (head) {
        assertValidSaveHead(head, input.ownerKey, input.modeKey);
        if (head.state === "active") {
          throw new AppDatabaseError("active_game_exists");
        }
        if (input.clientRecordId === head.clientRecordId) {
          throw new AppDatabaseError("client_record_id_reused");
        }
      }
      const existing = await requestResult<StoredGameSave | undefined>(
        saves.get([input.ownerKey, input.modeKey]),
      );
      if (existing) {
        throw new AppDatabaseError("closed_game_save_present");
      }
      const save: StoredGameSave = {
        ...cloneValue(input),
        generation: head ? head.generation + 1 : 1,
      };
      assertValidSave(save);
      saves.put(save);
      cache.put(createSaveHead(save, "active"));
      await completion;
      return cloneValue(save);
    } catch (error) {
      abortTransaction(transaction);
      await completion.catch(() => undefined);
      throw error;
    }
  }

  async getSave(
    ownerKey: AppOwnerKey,
    modeKey: AppModeKey,
  ): Promise<SaveReadResult> {
    assertOwnerKey(ownerKey);
    assertModeKey(modeKey);
    const database = await this.#database();
    const transaction = database.transaction(
      [STORES.cache, STORES.saves],
      "readonly",
    );
    const completion = transactionCompletion(transaction);
    await assertOwnerVisible(transaction, ownerKey);
    const [value, head] = await Promise.all([
      requestResult(
        transaction.objectStore(STORES.saves).get([ownerKey, modeKey]),
      ),
      requestResult(
        transaction
          .objectStore(STORES.cache)
          .get([ownerKey, saveHeadKey(modeKey)]),
      ),
    ]);
    await completion;
    if (value === undefined) {
      if (head === undefined) return { status: "missing" };
      if (
        isRecord(head) &&
        Number.isSafeInteger(head.schemaVersion) &&
        Number(head.schemaVersion) > APP_DATABASE_SCHEMA_VERSION
      ) {
        return {
          status: "future_schema",
          ownerKey,
          modeKey,
          schemaVersion: Number(head.schemaVersion),
        };
      }
      try {
        assertValidSaveHead(head, ownerKey, modeKey);
      } catch {
        return {
          status: "corrupt",
          ownerKey,
          modeKey,
          reason: "invalid_save_head",
        };
      }
      return head.state === "active"
        ? {
            status: "corrupt",
            ownerKey,
            modeKey,
            reason: "active_save_missing",
          }
        : { status: "missing" };
    }
    return normalizeSaveWithHead(value, head) ?? { status: "missing" };
  }

  async listSaves(ownerKey: AppOwnerKey): Promise<SaveReadResult[]> {
    assertOwnerKey(ownerKey);
    const results = await Promise.all(
      APP_MODE_KEYS.map((modeKey) => this.getSave(ownerKey, modeKey)),
    );
    return results.filter((result) => result.status !== "missing");
  }

  async getMostRecentlyClosedSave(
    ownerKey: AppOwnerKey,
  ): Promise<StoredGameSave | null> {
    const saves = await this.listSaves(ownerKey);
    const valid = saves
      .filter(
        (result): result is Extract<SaveReadResult, { status: "ok" }> =>
          result.status === "ok",
      )
      .map((result) => result.save)
      .sort(
        (left, right) =>
          right.lastClosedAt - left.lastClosedAt ||
          left.modeKey.localeCompare(right.modeKey),
      );
    return valid[0] ? cloneValue(valid[0]) : null;
  }

  async deleteSave(
    input: DeleteSaveInput,
  ): Promise<"deleted" | "missing" | "stale"> {
    assertOwnerKey(input.ownerKey);
    assertModeKey(input.modeKey);
    requireNonEmptyText(input.expectedClientRecordId, "expectedClientRecordId");
    if (
      !isNonNegativeSafeInteger(input.expectedGeneration) ||
      input.expectedGeneration < 1
    ) {
      throw new AppDatabaseError("invalid_generation");
    }
    if (!isNonNegativeSafeInteger(input.closedAt)) {
      throw new AppDatabaseError("invalid_timestamp");
    }
    const database = await this.#database();
    const transaction = database.transaction(
      [STORES.cache, STORES.saves],
      "readwrite",
    );
    const completion = transactionCompletion(transaction);
    try {
      await assertOwnerVisible(transaction, input.ownerKey);
      const cache = transaction.objectStore(STORES.cache);
      const saves = transaction.objectStore(STORES.saves);
      const head = await requestResult<SaveHeadMarker | undefined>(
        cache.get([input.ownerKey, saveHeadKey(input.modeKey)]),
      );
      const save = await requestResult<StoredGameSave | undefined>(
        saves.get([input.ownerKey, input.modeKey]),
      );
      if (!head && save) throw new AppDatabaseError("save_head_missing");
      if (!head) {
        await completion;
        return "missing";
      }
      assertValidSaveHead(head, input.ownerKey, input.modeKey);
      if (
        head.generation !== input.expectedGeneration ||
        head.clientRecordId !== input.expectedClientRecordId
      ) {
        await completion;
        return "stale";
      }
      if (head) {
        if (save) {
          const normalized = normalizeSave(save);
          if (
            !normalized ||
            normalized.status === "missing" ||
            normalized.status === "corrupt"
          ) {
            throw new AppDatabaseError("corrupt_save");
          }
          if (normalized.status === "future_schema") {
            throw new AppDatabaseError("future_schema");
          }
          if (
            normalized.save.generation !== head.generation ||
            normalized.save.clientRecordId !== head.clientRecordId
          ) {
            throw new AppDatabaseError("save_head_mismatch");
          }
        }
        cache.put({
          ...head,
          state: "closed",
          updatedAt: Math.max(head.updatedAt, input.closedAt),
          lastAccessedAt: Math.max(head.lastAccessedAt, input.closedAt),
        });
      }
      saves.delete([input.ownerKey, input.modeKey]);
      await completion;
      return save ? "deleted" : "missing";
    } catch (error) {
      abortTransaction(transaction);
      await completion.catch(() => undefined);
      throw error;
    }
  }

  async finalizeTerminal(
    input: FinalizeTerminalInput,
  ): Promise<FinalizeTerminalResult> {
    assertOwnerKey(input.ownerKey);
    assertModeKey(input.modeKey);
    if (!isNonNegativeSafeInteger(input.expectedSaveRevision)) {
      throw new AppDatabaseError("invalid_revision");
    }
    assertValidRecord(input.record);
    if (
      input.record.ownerKey !== input.ownerKey ||
      input.record.modeKey !== input.modeKey
    ) {
      throw new AppDatabaseError("record_owner_mode_mismatch");
    }
    if (input.ownerKey === "guest") {
      if (input.outbox) throw new AppDatabaseError("guest_outbox_forbidden");
    } else {
      if (!input.outbox) throw new AppDatabaseError("account_outbox_required");
      if (input.record.uploadStatus !== "pending") {
        throw new AppDatabaseError("account_record_must_be_pending");
      }
      assertValidOutbox(input.outbox);
      if (
        input.outbox.ownerKey !== input.ownerKey ||
        input.outbox.kind !== "record.submit" ||
        input.outbox.clientRecordId !== input.record.clientRecordId ||
        !isRecord(input.outbox.payload) ||
        input.outbox.payload.clientRecordId !== input.record.clientRecordId
      ) {
        throw new AppDatabaseError("record_outbox_mismatch");
      }
    }

    const database = await this.#database();
    const transaction = database.transaction(
      [STORES.cache, STORES.saves, STORES.records, STORES.outbox],
      "readwrite",
    );
    const completion = transactionCompletion(transaction);
    try {
      await assertOwnerVisible(transaction, input.ownerKey);
      const cache = transaction.objectStore(STORES.cache);
      const saves = transaction.objectStore(STORES.saves);
      const records = transaction.objectStore(STORES.records);
      const outbox = transaction.objectStore(STORES.outbox);
      const existingRecord = await requestResult<StoredGameRecord | undefined>(
        records.get(input.record.clientRecordId),
      );
      const existingSave = await requestResult<StoredGameSave | undefined>(
        saves.get([input.ownerKey, input.modeKey]),
      );

      if (existingRecord) {
        assertCurrentSchemaRow(existingRecord, "corrupt_record");
        assertValidRecord(existingRecord);
        if (JSON.stringify(existingRecord) !== JSON.stringify(input.record)) {
          throw new AppDatabaseError("client_record_id_conflict");
        }
        await completion;
        return { created: false, record: cloneValue(existingRecord) };
      }

      if (!existingSave) throw new AppDatabaseError("save_missing");
      const normalizedSave = normalizeSave(existingSave);
      if (
        !normalizedSave ||
        normalizedSave.status === "corrupt" ||
        normalizedSave.status === "missing"
      ) {
        throw new AppDatabaseError("corrupt_save");
      }
      if (normalizedSave.status === "future_schema")
        throw new AppDatabaseError("future_schema");
      if (normalizedSave.save.revision !== input.expectedSaveRevision) {
        throw new AppDatabaseError("save_revision_conflict");
      }
      if (normalizedSave.save.clientRecordId !== input.record.clientRecordId) {
        throw new AppDatabaseError("save_record_id_mismatch");
      }
      const head = await requestResult<SaveHeadMarker | undefined>(
        cache.get([input.ownerKey, saveHeadKey(input.modeKey)]),
      );
      if (!head) throw new AppDatabaseError("save_head_missing");
      assertValidSaveHead(head, input.ownerKey, input.modeKey);
      if (
        head.state !== "active" ||
        head.generation !== normalizedSave.save.generation ||
        head.clientRecordId !== normalizedSave.save.clientRecordId
      ) {
        throw new AppDatabaseError("save_head_mismatch");
      }
      if (
        input.modeKey === "classic_4x4_pow2_undo" &&
        normalizedSave.save.lifecycle !== "pending_terminal" &&
        input.record.finalSnapshot.state.undoStack.length > 0
      ) {
        throw new AppDatabaseError("pending_terminal_required");
      }
      const expectedSource =
        normalizedSave.save.gameKind === "ranked"
          ? "ranked"
          : input.ownerKey === "guest"
            ? "guest"
            : "normal";
      if (input.record.source !== expectedSource) {
        throw new AppDatabaseError("save_record_kind_mismatch");
      }
      records.add(cloneValue(input.record));
      this.#fault("finalize.after_record");

      if (input.outbox) {
        const existingOutbox = await requestResult<
          StoredOutboxItem | undefined
        >(outbox.get(input.outbox.operationId));
        if (existingOutbox) {
          assertCurrentSchemaRow(existingOutbox, "corrupt_outbox");
          assertValidOutbox(existingOutbox);
          if (JSON.stringify(existingOutbox) !== JSON.stringify(input.outbox)) {
            throw new AppDatabaseError("operation_id_conflict");
          }
        }
        if (!existingOutbox) outbox.add(cloneValue(input.outbox));
      }
      this.#fault("finalize.after_outbox");
      cache.put({
        ...head,
        state: "closed",
        updatedAt: Math.max(head.updatedAt, input.record.endedAt),
        lastAccessedAt: Math.max(head.lastAccessedAt, input.record.endedAt),
      });
      saves.delete([input.ownerKey, input.modeKey]);
      this.#fault("finalize.after_save_delete");
      await completion;
      return { created: true, record: cloneValue(input.record) };
    } catch (error) {
      abortTransaction(transaction);
      await completion.catch(() => undefined);
      throw error;
    }
  }

  async getRecord(
    ownerKey: AppOwnerKey,
    clientRecordId: string,
  ): Promise<StoredGameRecord | null> {
    assertOwnerKey(ownerKey);
    requireNonEmptyText(clientRecordId, "clientRecordId");
    const database = await this.#database();
    const transaction = database.transaction(
      [STORES.cache, STORES.records],
      "readonly",
    );
    const completion = transactionCompletion(transaction);
    await assertOwnerVisible(transaction, ownerKey);
    const record = await requestResult<StoredGameRecord | undefined>(
      transaction.objectStore(STORES.records).get(clientRecordId),
    );
    await completion;
    if (!record || record.ownerKey !== ownerKey) return null;
    assertCurrentSchemaRow(record, "corrupt_record");
    assertValidRecord(record);
    return cloneValue(record);
  }

  async listRecords(ownerKey: AppOwnerKey): Promise<StoredGameRecord[]> {
    assertOwnerKey(ownerKey);
    const database = await this.#database();
    const transaction = database.transaction(
      [STORES.cache, STORES.records],
      "readonly",
    );
    const completion = transactionCompletion(transaction);
    await assertOwnerVisible(transaction, ownerKey);
    const rows = await requestResult<StoredGameRecord[]>(
      transaction
        .objectStore(STORES.records)
        .index("by_owner")
        .getAll(this.#keyRange.only(ownerKey)),
    );
    await completion;
    for (const row of rows) {
      assertCurrentSchemaRow(row, "corrupt_record");
      assertValidRecord(row);
    }
    return rows
      .slice()
      .sort(
        (left, right) =>
          right.endedAt - left.endedAt ||
          left.clientRecordId.localeCompare(right.clientRecordId),
      )
      .map(cloneValue);
  }

  async deleteGuestRecord(clientRecordId: string): Promise<boolean> {
    requireNonEmptyText(clientRecordId, "clientRecordId");
    const database = await this.#database();
    const transaction = database.transaction(
      [STORES.cache, STORES.records],
      "readwrite",
    );
    const completion = transactionCompletion(transaction);
    try {
      await assertOwnerVisible(transaction, "guest");
      const store = transaction.objectStore(STORES.records);
      const record = await requestResult<StoredGameRecord | undefined>(
        store.get(clientRecordId),
      );
      if (!record || record.ownerKey !== "guest") {
        await completion;
        return false;
      }
      assertCurrentSchemaRow(record, "corrupt_record");
      assertValidRecord(record);
      store.delete(clientRecordId);
      await completion;
      return true;
    } catch (error) {
      abortTransaction(transaction);
      await completion.catch(() => undefined);
      throw error;
    }
  }

  async getOrCreateRankedStartIntent(
    candidate: Extract<StoredOutboxItem, { kind: "ranked.session_start" }>,
  ): Promise<Extract<StoredOutboxItem, { kind: "ranked.session_start" }>> {
    assertValidOutbox(candidate);
    if (candidate.kind !== "ranked.session_start") {
      throw new AppDatabaseError("invalid_outbox_payload");
    }
    if (candidate.ownerKey === "guest") {
      throw new AppDatabaseError("guest_outbox_forbidden");
    }
    const database = await this.#database();
    const transaction = database.transaction(
      [STORES.cache, STORES.outbox],
      "readwrite",
    );
    const completion = transactionCompletion(transaction);
    try {
      await assertOwnerVisible(transaction, candidate.ownerKey);
      const store = transaction.objectStore(STORES.outbox);
      const rows = await requestResult<StoredOutboxItem[]>(
        store.index("by_owner").getAll(this.#keyRange.only(candidate.ownerKey)),
      );
      for (const row of rows) {
        assertCurrentSchemaRow(row, "corrupt_outbox");
        assertValidOutbox(row);
      }
      const matching = rows.filter(
        (
          row,
        ): row is Extract<StoredOutboxItem, { kind: "ranked.session_start" }> =>
          row.kind === "ranked.session_start" &&
          row.payload.modeKey === candidate.payload.modeKey,
      );
      if (matching.length > 1) {
        throw new AppDatabaseError("ranked_start_intent_conflict");
      }
      if (matching[0]) {
        await completion;
        return cloneValue(matching[0]);
      }
      const operationCollision = await requestResult<
        StoredOutboxItem | undefined
      >(store.get(candidate.operationId));
      if (operationCollision) {
        assertCurrentSchemaRow(operationCollision, "corrupt_outbox");
        assertValidOutbox(operationCollision);
        throw new AppDatabaseError("operation_id_conflict");
      }
      store.add(cloneValue(candidate));
      await completion;
      return cloneValue(candidate);
    } catch (error) {
      abortTransaction(transaction);
      await completion.catch(() => undefined);
      throw error;
    }
  }

  async enqueueOutbox(item: StoredOutboxItem): Promise<"created" | "existing"> {
    assertValidOutbox(item);
    if (item.ownerKey === "guest") {
      throw new AppDatabaseError("guest_outbox_forbidden");
    }
    const database = await this.#database();
    const transaction = database.transaction(
      [STORES.cache, STORES.outbox],
      "readwrite",
    );
    const completion = transactionCompletion(transaction);
    try {
      await assertOwnerVisible(transaction, item.ownerKey);
      const store = transaction.objectStore(STORES.outbox);
      const existing = await requestResult<StoredOutboxItem | undefined>(
        store.get(item.operationId),
      );
      if (existing) {
        assertCurrentSchemaRow(existing, "corrupt_outbox");
        assertValidOutbox(existing);
        if (JSON.stringify(existing) !== JSON.stringify(item)) {
          throw new AppDatabaseError("operation_id_conflict");
        }
        await completion;
        return "existing";
      }
      store.add(cloneValue(item));
      await completion;
      return "created";
    } catch (error) {
      abortTransaction(transaction);
      await completion.catch(() => undefined);
      throw error;
    }
  }

  async freezeRankedStartIntent(
    ownerKey: AppOwnerKey,
    operationId: string,
    frozen: RankedSessionStartFingerprint,
  ): Promise<Extract<StoredOutboxItem, { kind: "ranked.session_start" }>> {
    assertOwnerKey(ownerKey);
    requireNonEmptyText(operationId, "operationId");
    if (!isRankedStartFingerprint(frozen)) {
      throw new AppDatabaseError("invalid_ranked_start_fingerprint");
    }
    const database = await this.#database();
    const transaction = database.transaction(
      [STORES.cache, STORES.outbox],
      "readwrite",
    );
    const completion = transactionCompletion(transaction);
    try {
      await assertOwnerVisible(transaction, ownerKey);
      const store = transaction.objectStore(STORES.outbox);
      const existing = await requestResult<StoredOutboxItem | undefined>(
        store.get(operationId),
      );
      if (
        !existing ||
        existing.ownerKey !== ownerKey ||
        existing.kind !== "ranked.session_start"
      ) {
        throw new AppDatabaseError("ranked_start_intent_missing");
      }
      assertCurrentSchemaRow(existing, "corrupt_outbox");
      assertValidOutbox(existing);
      if (existing.payload.frozen) {
        if (!sameRankedStartFingerprint(existing.payload.frozen, frozen)) {
          throw new AppDatabaseError("ranked_start_response_conflict");
        }
        await completion;
        return cloneValue(existing);
      }
      const next = {
        ...existing,
        payload: { ...existing.payload, frozen: cloneValue(frozen) },
      };
      assertValidOutbox(next);
      store.put(next);
      await completion;
      return cloneValue(next);
    } catch (error) {
      abortTransaction(transaction);
      await completion.catch(() => undefined);
      throw error;
    }
  }

  async updateOutboxAttempt(
    ownerKey: AppOwnerKey,
    operationId: string,
    update: Pick<
      StoredOutboxItem,
      "attemptCount" | "nextAttemptAt" | "lastErrorCode" | "updatedAt"
    >,
  ): Promise<StoredOutboxItem> {
    assertOwnerKey(ownerKey);
    requireNonEmptyText(operationId, "operationId");
    if (
      !isNonNegativeSafeInteger(update.attemptCount) ||
      !isNonNegativeSafeInteger(update.nextAttemptAt) ||
      !isNonNegativeSafeInteger(update.updatedAt) ||
      (update.lastErrorCode !== null &&
        typeof update.lastErrorCode !== "string")
    ) {
      throw new AppDatabaseError("invalid_outbox_update");
    }
    const database = await this.#database();
    const transaction = database.transaction(
      [STORES.cache, STORES.outbox],
      "readwrite",
    );
    const completion = transactionCompletion(transaction);
    try {
      await assertOwnerVisible(transaction, ownerKey);
      const store = transaction.objectStore(STORES.outbox);
      const existing = await requestResult<StoredOutboxItem | undefined>(
        store.get(operationId),
      );
      if (!existing || existing.ownerKey !== ownerKey)
        throw new AppDatabaseError("outbox_missing");
      assertCurrentSchemaRow(existing, "corrupt_outbox");
      assertValidOutbox(existing);
      if (
        update.attemptCount < existing.attemptCount ||
        update.updatedAt < existing.updatedAt
      ) {
        throw new AppDatabaseError("stale_outbox_update");
      }
      if (
        update.attemptCount === existing.attemptCount &&
        update.updatedAt === existing.updatedAt
      ) {
        if (
          update.nextAttemptAt !== existing.nextAttemptAt ||
          update.lastErrorCode !== existing.lastErrorCode
        ) {
          throw new AppDatabaseError("outbox_update_conflict");
        }
        await completion;
        return cloneValue(existing);
      }
      const next = { ...existing, ...update };
      assertValidOutbox(next);
      store.put(next);
      await completion;
      return cloneValue(next);
    } catch (error) {
      abortTransaction(transaction);
      await completion.catch(() => undefined);
      throw error;
    }
  }

  async removeOutbox(
    ownerKey: AppOwnerKey,
    operationId: string,
  ): Promise<boolean> {
    assertOwnerKey(ownerKey);
    requireNonEmptyText(operationId, "operationId");
    const database = await this.#database();
    const transaction = database.transaction(
      [STORES.cache, STORES.outbox],
      "readwrite",
    );
    const completion = transactionCompletion(transaction);
    try {
      await assertOwnerVisible(transaction, ownerKey);
      const store = transaction.objectStore(STORES.outbox);
      const existing = await requestResult<StoredOutboxItem | undefined>(
        store.get(operationId),
      );
      if (!existing || existing.ownerKey !== ownerKey) {
        await completion;
        return false;
      }
      assertCurrentSchemaRow(existing, "corrupt_outbox");
      assertValidOutbox(existing);
      store.delete(operationId);
      await completion;
      return true;
    } catch (error) {
      abortTransaction(transaction);
      await completion.catch(() => undefined);
      throw error;
    }
  }

  async listOutbox(ownerKey: AppOwnerKey): Promise<StoredOutboxItem[]> {
    assertOwnerKey(ownerKey);
    const database = await this.#database();
    const transaction = database.transaction(
      [STORES.cache, STORES.outbox],
      "readonly",
    );
    const completion = transactionCompletion(transaction);
    await assertOwnerVisible(transaction, ownerKey);
    const rows = await requestResult<StoredOutboxItem[]>(
      transaction
        .objectStore(STORES.outbox)
        .index("by_owner")
        .getAll(this.#keyRange.only(ownerKey)),
    );
    await completion;
    for (const row of rows) {
      assertCurrentSchemaRow(row, "corrupt_outbox");
      assertValidOutbox(row);
    }
    return rows
      .slice()
      .sort(
        (left, right) =>
          left.nextAttemptAt - right.nextAttemptAt ||
          left.operationId.localeCompare(right.operationId),
      )
      .map(cloneValue);
  }

  async putCache(entry: StoredCacheEntry): Promise<void> {
    assertValidCache(entry);
    const database = await this.#database();
    const transaction = database.transaction([STORES.cache], "readwrite");
    const completion = transactionCompletion(transaction);
    try {
      if (entry.ownerKey !== "public")
        await assertOwnerVisible(transaction, entry.ownerKey);
      const store = transaction.objectStore(STORES.cache);
      const existing = await requestResult<StoredCacheRow | undefined>(
        store.get([entry.ownerKey, entry.cacheKey]),
      );
      if (existing) {
        assertCurrentSchemaRow(existing, "corrupt_cache");
        if (existing.kind !== "data")
          throw new AppDatabaseError("cache_key_conflict");
        assertValidCache(existing);
        if (existing.fetchedAt > entry.fetchedAt) {
          if (entry.lastAccessedAt > existing.lastAccessedAt) {
            store.put({ ...existing, lastAccessedAt: entry.lastAccessedAt });
          }
          await completion;
          return;
        }
        if (existing.fetchedAt === entry.fetchedAt) {
          if (
            existing.cacheKind !== entry.cacheKind ||
            existing.sizeBytes !== entry.sizeBytes ||
            JSON.stringify(existing.value) !== JSON.stringify(entry.value)
          ) {
            throw new AppDatabaseError("cache_version_conflict");
          }
          if (entry.lastAccessedAt > existing.lastAccessedAt) {
            store.put({ ...existing, lastAccessedAt: entry.lastAccessedAt });
          }
          await completion;
          return;
        }
      }
      store.put(
        cloneValue({
          ...entry,
          lastAccessedAt: Math.max(
            entry.lastAccessedAt,
            existing?.kind === "data" ? existing.lastAccessedAt : 0,
          ),
        }),
      );
      await this.#enforceCacheLimits(store);
      await completion;
    } catch (error) {
      abortTransaction(transaction);
      await completion.catch(() => undefined);
      throw error;
    }
  }

  async getCache(
    cacheKey: string,
    ownerKey: CacheOwnerKey,
    accessedAt: number,
  ): Promise<StoredCacheEntry | null> {
    requireNonEmptyText(cacheKey, "cacheKey");
    assertCacheOwnerKey(ownerKey);
    if (!isNonNegativeSafeInteger(accessedAt))
      throw new AppDatabaseError("invalid_timestamp");
    const database = await this.#database();
    const transaction = database.transaction([STORES.cache], "readwrite");
    const completion = transactionCompletion(transaction);
    if (ownerKey !== "public") await assertOwnerVisible(transaction, ownerKey);
    const store = transaction.objectStore(STORES.cache);
    const row = await requestResult<StoredCacheRow | undefined>(
      store.get([ownerKey, cacheKey]),
    );
    if (!row) {
      await completion;
      return null;
    }
    assertCurrentSchemaRow(row, "corrupt_cache");
    if (row.kind !== "data" || row.ownerKey !== ownerKey) {
      throw new AppDatabaseError("corrupt_cache");
    }
    assertValidCache(row);
    const next = {
      ...row,
      lastAccessedAt: Math.max(row.lastAccessedAt, accessedAt),
    };
    if (next.lastAccessedAt !== row.lastAccessedAt) store.put(next);
    await completion;
    return cloneValue(next);
  }

  async deleteCache(
    cacheKey: string,
    ownerKey: CacheOwnerKey,
  ): Promise<boolean> {
    requireNonEmptyText(cacheKey, "cacheKey");
    assertCacheOwnerKey(ownerKey);
    const database = await this.#database();
    const transaction = database.transaction([STORES.cache], "readwrite");
    const completion = transactionCompletion(transaction);
    try {
      if (ownerKey !== "public")
        await assertOwnerVisible(transaction, ownerKey);
      const store = transaction.objectStore(STORES.cache);
      const row = await requestResult<StoredCacheRow | undefined>(
        store.get([ownerKey, cacheKey]),
      );
      if (!row) {
        await completion;
        return false;
      }
      assertCurrentSchemaRow(row, "corrupt_cache");
      if (row.kind !== "data" || row.ownerKey !== ownerKey) {
        throw new AppDatabaseError("corrupt_cache");
      }
      assertValidCache(row);
      store.delete([ownerKey, cacheKey]);
      await completion;
      return true;
    } catch (error) {
      abortTransaction(transaction);
      await completion.catch(() => undefined);
      throw error;
    }
  }

  async addDiagnostic(diagnostic: StoredDiagnostic): Promise<void> {
    assertValidDiagnostic(diagnostic, this.#diagnosticMaxPayloadBytes);
    const database = await this.#database();
    const transaction = database.transaction(
      [STORES.cache, STORES.diagnostics],
      "readwrite",
    );
    const completion = transactionCompletion(transaction);
    try {
      await assertOwnerVisible(transaction, diagnostic.ownerKey);
      const store = transaction.objectStore(STORES.diagnostics);
      const existing = await requestResult<StoredDiagnostic | undefined>(
        store.get(diagnostic.eventId),
      );
      if (existing) {
        assertCurrentSchemaRow(existing, "corrupt_diagnostic");
        assertValidDiagnostic(existing, this.#diagnosticMaxPayloadBytes);
        if (JSON.stringify(existing) !== JSON.stringify(diagnostic)) {
          throw new AppDatabaseError("diagnostic_event_id_conflict");
        }
        await completion;
        return;
      }
      store.put(cloneValue(diagnostic));
      await this.#enforceDiagnosticLimit(store);
      await completion;
    } catch (error) {
      abortTransaction(transaction);
      await completion.catch(() => undefined);
      throw error;
    }
  }

  async listDiagnostics(ownerKey: AppOwnerKey): Promise<StoredDiagnostic[]> {
    assertOwnerKey(ownerKey);
    const database = await this.#database();
    const transaction = database.transaction(
      [STORES.cache, STORES.diagnostics],
      "readonly",
    );
    const completion = transactionCompletion(transaction);
    await assertOwnerVisible(transaction, ownerKey);
    const rows = await requestResult<StoredDiagnostic[]>(
      transaction
        .objectStore(STORES.diagnostics)
        .index("by_owner_occurred")
        .getAll(
          this.#keyRange.bound(
            [ownerKey, 0],
            [ownerKey, Number.MAX_SAFE_INTEGER],
          ),
        ),
    );
    await completion;
    for (const row of rows) {
      assertCurrentSchemaRow(row, "corrupt_diagnostic");
      assertValidDiagnostic(row, this.#diagnosticMaxPayloadBytes);
    }
    return rows.map(cloneValue);
  }

  async beginOwnerClear(
    ownerKey: AppOwnerKey,
    createdAt: number,
  ): Promise<void> {
    assertOwnerKey(ownerKey);
    if (ownerKey === "guest")
      throw new AppDatabaseError("guest_clear_forbidden");
    if (!isNonNegativeSafeInteger(createdAt))
      throw new AppDatabaseError("invalid_timestamp");
    const database = await this.#database();
    const transaction = database.transaction(STORES.cache, "readwrite");
    const completion = transactionCompletion(transaction);
    const store = transaction.objectStore(STORES.cache);
    const key = markerKey(ownerKey);
    const existing = await requestResult<OwnerClearMarker | undefined>(
      store.get([SYSTEM_OWNER_KEY, key]),
    );
    if (!existing) {
      const marker: OwnerClearMarker = {
        schemaVersion: APP_DATABASE_SCHEMA_VERSION,
        cacheKey: key,
        ownerKey: SYSTEM_OWNER_KEY,
        kind: "owner_clear",
        targetOwnerKey: ownerKey,
        createdAt,
        lastAccessedAt: createdAt,
        sizeBytes: 0,
      };
      store.add(marker);
    } else {
      assertValidOwnerClearMarker(existing, ownerKey);
    }
    await completion;
  }

  async listPendingOwnerClears(): Promise<AppOwnerKey[]> {
    const database = await this.#database();
    const transaction = database.transaction(STORES.cache, "readonly");
    const completion = transactionCompletion(transaction);
    const rows = await requestResult<StoredCacheRow[]>(
      transaction
        .objectStore(STORES.cache)
        .index("by_kind")
        .getAll(this.#keyRange.only("owner_clear")),
    );
    await completion;
    for (const row of rows) assertValidOwnerClearMarker(row);
    return rows.map((row) => (row as OwnerClearMarker).targetOwnerKey).sort();
  }

  async completeOwnerClear(ownerKey: AppOwnerKey): Promise<void> {
    assertOwnerKey(ownerKey);
    if (ownerKey === "guest")
      throw new AppDatabaseError("guest_clear_forbidden");
    const database = await this.#database();
    const transaction = database.transaction(
      Object.values(STORES),
      "readwrite",
    );
    const completion = transactionCompletion(transaction);
    try {
      const cache = transaction.objectStore(STORES.cache);
      const key = markerKey(ownerKey);
      const marker = await requestResult<OwnerClearMarker | undefined>(
        cache.get([SYSTEM_OWNER_KEY, key]),
      );
      if (!marker) throw new AppDatabaseError("owner_clear_not_started");
      assertValidOwnerClearMarker(marker, ownerKey);
      await this.#deleteOwnerRows(
        transaction.objectStore(STORES.saves),
        ownerKey,
      );
      this.#fault("clear.after_saves");
      await this.#deleteOwnerRows(
        transaction.objectStore(STORES.records),
        ownerKey,
      );
      this.#fault("clear.after_records");
      await this.#deleteOwnerRows(
        transaction.objectStore(STORES.outbox),
        ownerKey,
      );
      this.#fault("clear.after_outbox");
      await this.#deleteOwnerRows(cache, ownerKey);
      this.#fault("clear.after_cache");
      await this.#deleteOwnerRows(
        transaction.objectStore(STORES.diagnostics),
        ownerKey,
      );
      this.#fault("clear.after_diagnostics");
      cache.delete([SYSTEM_OWNER_KEY, key]);
      this.#fault("clear.after_marker_delete");
      await completion;
    } catch (error) {
      abortTransaction(transaction);
      await completion.catch(() => undefined);
      throw error;
    }
  }

  async #enforceCacheLimits(store: IDBObjectStore): Promise<void> {
    const rows = await requestResult<StoredCacheRow[]>(
      store.index("by_kind").getAll(this.#keyRange.only("data")),
    );
    const dataRows: StoredCacheEntry[] = [];
    for (const row of rows) {
      if (
        !isRecord(row) ||
        row.schemaVersion !== APP_DATABASE_SCHEMA_VERSION ||
        row.kind !== "data"
      ) {
        continue;
      }
      try {
        assertValidCache(row as unknown as StoredCacheEntry);
        dataRows.push(row as unknown as StoredCacheEntry);
      } catch {
        // Unknown or corrupt rows are preserved for diagnostics and never evicted by this version.
      }
    }
    dataRows.sort(
      (left, right) =>
        left.lastAccessedAt - right.lastAccessedAt ||
        left.fetchedAt - right.fetchedAt ||
        left.ownerKey.localeCompare(right.ownerKey) ||
        left.cacheKey.localeCompare(right.cacheKey),
    );

    const excessCount = Math.max(0, dataRows.length - this.#cacheMaxEntries);
    for (const row of dataRows.slice(0, excessCount)) {
      store.delete([row.ownerKey, row.cacheKey]);
    }

    const replayRows = dataRows
      .slice(excessCount)
      .filter((row) => row.cacheKind === "replay");
    let replayBytes = replayRows.reduce((sum, row) => sum + row.sizeBytes, 0);
    for (const row of replayRows) {
      if (replayBytes <= this.#replayCacheMaxBytes) break;
      store.delete([row.ownerKey, row.cacheKey]);
      replayBytes -= row.sizeBytes;
    }
  }

  async #enforceDiagnosticLimit(store: IDBObjectStore): Promise<void> {
    const rows = await requestResult<unknown[]>(store.getAll());
    const currentRows: StoredDiagnostic[] = [];
    for (const row of rows) {
      if (!isRecord(row) || row.schemaVersion !== APP_DATABASE_SCHEMA_VERSION) {
        continue;
      }
      try {
        assertValidDiagnostic(
          row as unknown as StoredDiagnostic,
          this.#diagnosticMaxPayloadBytes,
        );
        currentRows.push(row as unknown as StoredDiagnostic);
      } catch {
        // Preserve invalid rows for explicit diagnostics instead of deleting them implicitly.
      }
    }
    currentRows.sort(
      (left, right) =>
        left.occurredAt - right.occurredAt ||
        left.eventId.localeCompare(right.eventId),
    );
    const excess = Math.max(0, currentRows.length - this.#diagnosticMaxEntries);
    for (const row of currentRows.slice(0, excess)) store.delete(row.eventId);
  }

  async #database(): Promise<IDBDatabase> {
    this.#databasePromise ??= openDatabase(this.#factory, this.name);
    return this.#databasePromise;
  }

  async #deleteOwnerRows(
    store: IDBObjectStore,
    ownerKey: AppOwnerKey,
  ): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const request = store
        .index("by_owner")
        .openKeyCursor(this.#keyRange.only(ownerKey));
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) {
          resolve();
          return;
        }
        store.delete(cursor.primaryKey);
        cursor.continue();
      };
      request.onerror = () =>
        reject(request.error ?? new AppDatabaseError("idb_cursor_failed"));
    });
  }

  #fault(point: AppDatabaseFaultPoint): void {
    this.#faultInjector?.(point);
  }
}

export async function deleteAppDatabase(
  options: Pick<AppDatabaseOptions, "name" | "factory"> = {},
): Promise<void> {
  const factory = options.factory ?? globalThis.indexedDB;
  if (!factory) throw new AppDatabaseError("indexeddb_unavailable");
  const name = options.name ?? APP_DATABASE_NAME;
  await new Promise<void>((resolve, reject) => {
    const request = factory.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () =>
      reject(request.error ?? new AppDatabaseError("idb_delete_failed"));
    request.onblocked = () =>
      reject(new AppDatabaseError("idb_delete_blocked"));
  });
}
