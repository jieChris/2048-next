import type {
  MobileAuthService,
  MobileRecordSubmitInput,
} from "../auth/auth-service";
import {
  loadAccountSession,
  removeAccountChallengeRef,
  type AccountSessionV1,
} from "../auth/account-session";
import {
  type AppDatabase,
  type AppOwnerKey,
  type StoredGameRecord,
  type StoredOutboxItem,
} from "../data/app-database";
import type { SecureStorage } from "../platform/secure-storage";

const RETRY_BASE_MS = 2_000;
const RETRY_MAX_MS = 15_000;
const DEFAULT_MAX_ITEMS = 16;

type AccountOwnerKey = `user:${string}`;
type RecordSubmitOutbox = Extract<
  StoredOutboxItem,
  { kind: "record.submit" }
>;

export type RecordOutboxSyncDatabase = Pick<
  AppDatabase,
  | "getRecord"
  | "listRecords"
  | "listOutbox"
  | "updateOutboxAttempt"
  | "applyRecordSubmitOutcome"
>;

export interface RecordOutboxSyncOptions {
  ownerKey: AccountOwnerKey;
  database: RecordOutboxSyncDatabase;
  secureStorage: Pick<SecureStorage, "get" | "set">;
  authService: Pick<MobileAuthService, "submitRecord">;
  now?: () => number;
  maxItems?: number;
  forceOperationId?: string;
}

export interface RecordOutboxSyncResult {
  processed: number;
  uploaded: number;
  pending: number;
  failed: number;
  authRequired: boolean;
  remaining: number;
}

type SubmitFailure = {
  kind: "auth" | "permanent" | "transient";
  code: string;
};

class RecordSubmitPreparationError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "RecordSubmitPreparationError";
    this.code = code;
  }
}

function safeNow(now: () => number): number {
  const value = Math.floor(now());
  if (!Number.isSafeInteger(value) || value < 0) return 0;
  return value;
}

function nextUpdatedAt(item: RecordSubmitOutbox, now: () => number): number {
  return Math.max(safeNow(now), item.updatedAt + 1);
}

function nextRetryAt(updatedAt: number, attemptCount: number): number {
  const exponent = Math.min(Math.max(0, attemptCount - 1), 16);
  const delay = Math.min(RETRY_MAX_MS, RETRY_BASE_MS * 2 ** exponent);
  return Math.min(Number.MAX_SAFE_INTEGER, updatedAt + delay);
}

function errorCode(value: string | null | undefined, fallback: string): string {
  const normalized = value?.trim();
  return (normalized || fallback).slice(0, 128);
}

function classifySubmitFailure(error: unknown): SubmitFailure {
  if (
    error &&
    typeof error === "object" &&
    Reflect.get(error, "name") === "MobileAuthError"
  ) {
    const authCode = Reflect.get(error, "code");
    const statusValue = Reflect.get(error, "status");
    const status = typeof statusValue === "number" ? statusValue : null;
    const serverCode = Reflect.get(error, "serverCode");
    const code = errorCode(
      typeof serverCode === "string" ? serverCode : null,
      typeof authCode === "string" ? authCode : "auth_error",
    );
    if (authCode === "session_missing" || status === 401) {
      return { kind: "auth", code };
    }
    if (
      authCode === "network_error" ||
      status === 408 ||
      status === 429 ||
      (status !== null && status >= 500)
    ) {
      return { kind: "transient", code };
    }
    if (
      authCode === "invalid_input" ||
      authCode === "api_error" ||
      (status !== null && status >= 400 && status < 500)
    ) {
      return { kind: "permanent", code };
    }
    return { kind: "transient", code };
  }
  return {
    kind: "transient",
    code: errorCode(error instanceof Error ? error.message : null, "unknown"),
  };
}

function requireSessionOwner(
  session: AccountSessionV1 | null,
  ownerKey: AccountOwnerKey,
): AccountSessionV1 {
  if (!session || `user:${session.user.id}` !== ownerKey) {
    throw new RecordSubmitPreparationError("auth_required");
  }
  return session;
}

function createSubmitInput(
  record: StoredGameRecord,
  session: AccountSessionV1,
): MobileRecordSubmitInput {
  const endedAt = new Date(record.endedAt).toISOString();
  const base: MobileRecordSubmitInput = {
    clientRecordId: record.clientRecordId,
    modeKey: record.modeKey,
    score: record.score,
    durationMs: record.durationMs,
    bestTile: record.bestTile,
    endedAt,
    replayString: record.replay.replayString,
  };
  if (record.source !== "ranked") return base;

  const challengeId = record.finalSnapshot.state.challengeId;
  const ref = session.challengeRefs.find(
    (candidate) => candidate.challengeId === challengeId,
  );
  if (!challengeId || !ref) {
    throw new RecordSubmitPreparationError("ranked_challenge_missing");
  }
  return {
    ...base,
    rankedSessionToken: ref.token,
    challengeId,
  };
}

async function markMissingRecord(
  options: RecordOutboxSyncOptions,
  item: RecordSubmitOutbox,
): Promise<void> {
  const updatedAt = nextUpdatedAt(item, options.now ?? Date.now);
  await options.database.updateOutboxAttempt(
    options.ownerKey,
    item.operationId,
    {
      attemptCount: item.attemptCount + 1,
      nextAttemptAt: Number.MAX_SAFE_INTEGER,
      lastErrorCode: "record_missing",
      updatedAt,
    },
  );
}

async function applyFailure(
  options: RecordOutboxSyncOptions,
  item: RecordSubmitOutbox,
  failure: SubmitFailure,
): Promise<void> {
  const updatedAt = nextUpdatedAt(item, options.now ?? Date.now);
  const attemptCount = item.attemptCount + 1;
  await options.database.applyRecordSubmitOutcome(
    options.ownerKey,
    item.operationId,
    {
      status: failure.kind === "transient" ? "pending" : "failed",
      attemptCount,
      nextAttemptAt:
        failure.kind === "permanent"
          ? Number.MAX_SAFE_INTEGER
          : failure.kind === "auth"
            ? 0
            : nextRetryAt(updatedAt, attemptCount),
      lastErrorCode: failure.code,
      updatedAt,
    },
  );
}

async function cleanupUploadedChallengeRefs(
  options: RecordOutboxSyncOptions,
  session: AccountSessionV1,
): Promise<void> {
  const uploadedChallenges = new Set(
    (await options.database.listRecords(options.ownerKey))
      .filter(
        (record) =>
          record.source === "ranked" && record.uploadStatus === "uploaded",
      )
      .map((record) => record.finalSnapshot.state.challengeId)
      .filter((value): value is string => typeof value === "string"),
  );
  for (const ref of session.challengeRefs) {
    if (!uploadedChallenges.has(ref.challengeId)) continue;
    await removeAccountChallengeRef(
      options.secureStorage,
      session.persistentIdentity,
      ref.challengeId,
    );
  }
}

export async function flushRecordSubmitOutbox(
  options: RecordOutboxSyncOptions,
): Promise<RecordOutboxSyncResult> {
  const now = options.now ?? Date.now;
  const at = safeNow(now);
  const maxItems = options.maxItems ?? DEFAULT_MAX_ITEMS;
  if (!Number.isSafeInteger(maxItems) || maxItems <= 0) {
    throw new Error("invalid_record_outbox_limit");
  }

  let session: AccountSessionV1 | null = null;
  try {
    session = requireSessionOwner(
      await loadAccountSession(options.secureStorage),
      options.ownerKey,
    );
  } catch {
    session = null;
  }
  if (session) {
    await cleanupUploadedChallengeRefs(options, session).catch(() => undefined);
  }

  const queue = (await options.database.listOutbox(options.ownerKey))
    .filter(
      (item): item is RecordSubmitOutbox =>
        item.kind === "record.submit" &&
        (item.nextAttemptAt <= at ||
          item.operationId === options.forceOperationId),
    )
    .slice(0, maxItems);
  const result: RecordOutboxSyncResult = {
    processed: 0,
    uploaded: 0,
    pending: 0,
    failed: 0,
    authRequired: false,
    remaining: 0,
  };

  for (const item of queue) {
    const record = await options.database.getRecord(
      options.ownerKey,
      item.clientRecordId,
    );
    if (!record) {
      await markMissingRecord(options, item);
      result.processed += 1;
      result.failed += 1;
      continue;
    }
    if (record.uploadStatus === "uploaded") {
      await options.database.applyRecordSubmitOutcome(
        options.ownerKey,
        item.operationId,
        { status: "uploaded", updatedAt: nextUpdatedAt(item, now) },
      );
      result.processed += 1;
      result.uploaded += 1;
      continue;
    }

    let input: MobileRecordSubmitInput;
    try {
      input = createSubmitInput(
        record,
        requireSessionOwner(session, options.ownerKey),
      );
    } catch (error) {
      const failure: SubmitFailure = {
        kind:
          error instanceof RecordSubmitPreparationError &&
          error.code === "auth_required"
            ? "auth"
            : "permanent",
        code:
          error instanceof RecordSubmitPreparationError
            ? error.code
            : "record_payload_invalid",
      };
      await applyFailure(options, item, failure);
      result.processed += 1;
      result.failed += 1;
      result.authRequired = failure.kind === "auth";
      if (failure.kind === "auth") break;
      continue;
    }

    try {
      await options.authService.submitRecord(input);
      await options.database.applyRecordSubmitOutcome(
        options.ownerKey,
        item.operationId,
        { status: "uploaded", updatedAt: nextUpdatedAt(item, now) },
      );
      result.processed += 1;
      result.uploaded += 1;
      if (input.challengeId) {
        await removeAccountChallengeRef(
          options.secureStorage,
          session!.persistentIdentity,
          input.challengeId,
        ).catch(() => undefined);
      }
    } catch (error) {
      const failure = classifySubmitFailure(error);
      await applyFailure(options, item, failure);
      result.processed += 1;
      if (failure.kind === "transient") result.pending += 1;
      else result.failed += 1;
      result.authRequired ||= failure.kind === "auth";
      if (failure.kind !== "permanent") break;
    }
  }

  result.remaining = (
    await options.database.listOutbox(options.ownerKey)
  ).filter((item) => item.kind === "record.submit").length;
  return result;
}

export async function prepareRecordSubmitRetry(
  options: Pick<
    RecordOutboxSyncOptions,
    "ownerKey" | "database" | "now"
  >,
  operationId: string,
): Promise<void> {
  const item = (await options.database.listOutbox(options.ownerKey)).find(
    (candidate): candidate is RecordSubmitOutbox =>
      candidate.kind === "record.submit" &&
      candidate.operationId === operationId,
  );
  if (!item) throw new Error("record_submit_outbox_missing");
  const updatedAt = nextUpdatedAt(item, options.now ?? Date.now);
  await options.database.applyRecordSubmitOutcome(
    options.ownerKey,
    operationId,
    {
      status: "pending",
      attemptCount: item.attemptCount,
      nextAttemptAt: safeNow(options.now ?? Date.now),
      lastErrorCode: null,
      updatedAt,
    },
  );
}

export function isAccountOwnerKey(value: AppOwnerKey): value is AccountOwnerKey {
  return value !== "guest";
}
