import { IDBFactory, IDBKeyRange } from "fake-indexeddb";
import { describe, expect, it, vi } from "vitest";

import {
  flushRecordSubmitOutbox,
  prepareRecordSubmitRetry,
} from "../../mobile/src/app/record-outbox-sync";
import {
  loadAccountSession,
  saveAccountSession,
  type AccountSessionV1,
} from "../../mobile/src/auth/account-session";
import { MobileAuthError } from "../../mobile/src/auth/auth-service";
import {
  APP_DATABASE_SCHEMA_VERSION,
  AppDatabase,
  type StoredGameRecord,
  type StoredGameSave,
  type StoredOutboxItem,
} from "../../mobile/src/data/app-database";
import { createEngineSession } from "../../src/core/engine";

let databaseSequence = 0;

function createDatabase(): AppDatabase {
  databaseSequence += 1;
  return new AppDatabase({
    factory: new IDBFactory(),
    keyRange: IDBKeyRange,
    name: `record-outbox-sync-${databaseSequence}`,
  });
}

function secureStorage() {
  const values = new Map<string, string>();
  return {
    get: vi.fn(async (key: string) => values.get(key) ?? null),
    set: vi.fn(async (key: string, value: string) => {
      values.set(key, value);
    }),
  };
}

function session(
  challengeRefs: AccountSessionV1["challengeRefs"] = [],
): AccountSessionV1 {
  return {
    version: 1,
    accessToken: "account-token",
    expiresAtEpochSeconds: 2_000_000_000,
    user: {
      id: 42,
      email: "player@example.com",
      nickname: "Player",
      role: "player",
    },
    persistentIdentity: { userId: 42, establishedAtMs: 1_000 },
    challengeRefs,
  };
}

function terminalRecord(source: "normal" | "ranked"): StoredGameRecord {
  const ranked = source === "ranked";
  const engine = createEngineSession({
    modeKey: "standard_4x4_pow2_no_undo",
    seed: 9,
    startedAtMs: ranked ? 100 : null,
    challengeId: ranked ? "challenge-42" : null,
  });
  engine.init({
    board: [
      [2, 2, 8, 16],
      [32, 64, 128, 256],
      [64, 128, 256, 512],
      [128, 256, 512, 1024],
    ],
  });
  const transition = engine.move({ direction: 3, atMs: 400 });
  if (!transition.gameOver) throw new Error("terminal fixture did not end");
  const finalSnapshot = engine.exportState(401);
  const board = finalSnapshot.state.board.flat();
  return {
    schemaVersion: APP_DATABASE_SCHEMA_VERSION,
    clientRecordId: `record-${source}`,
    ownerKey: "user:42",
    modeKey: "standard_4x4_pow2_no_undo",
    source,
    endedAt: 401,
    score: finalSnapshot.state.score,
    bestTile: Math.max(...board),
    steps: finalSnapshot.state.steps,
    durationMs: finalSnapshot.state.durationMs,
    boardSum: board.reduce((sum, value) => sum + value, 0),
    replay: engine.exportReplay(),
    finalSnapshot,
    uploadStatus: "pending",
  };
}

async function seedRecord(
  database: AppDatabase,
  record: StoredGameRecord,
): Promise<StoredOutboxItem> {
  const saveEngine = createEngineSession({
    modeKey: record.modeKey,
    seed: 10,
    startedAtMs: record.source === "ranked" ? 100 : null,
    challengeId:
      record.source === "ranked" ? "challenge-42" : null,
  });
  saveEngine.init();
  const save: StoredGameSave = {
    schemaVersion: APP_DATABASE_SCHEMA_VERSION,
    ownerKey: record.ownerKey,
    modeKey: record.modeKey,
    clientRecordId: record.clientRecordId,
    generation: 1,
    lifecycle: "active",
    gameKind: record.source === "ranked" ? "ranked" : "normal",
    revision: 1,
    lastClosedAt: 400,
    rankedSessionId:
      record.source === "ranked" ? "ranked-session-42" : null,
    snapshot: saveEngine.exportState(400),
  };
  const outbox: StoredOutboxItem = {
    schemaVersion: APP_DATABASE_SCHEMA_VERSION,
    operationId: `record.submit:${record.clientRecordId}`,
    ownerKey: record.ownerKey,
    kind: "record.submit",
    clientRecordId: record.clientRecordId,
    payload: { clientRecordId: record.clientRecordId },
    attemptCount: 0,
    nextAttemptAt: 0,
    lastErrorCode: null,
    createdAt: 401,
    updatedAt: 401,
  };
  await database.putSave(save);
  await database.finalizeTerminal({
    ownerKey: record.ownerKey,
    modeKey: record.modeKey,
    expectedSaveRevision: save.revision,
    record,
    outbox,
  });
  return outbox;
}

describe("mobile record outbox sync", () => {
  it("uploads a normal record with its stable ID and no ranked token", async () => {
    const database = createDatabase();
    const storage = secureStorage();
    await saveAccountSession(storage, session());
    const record = terminalRecord("normal");
    await seedRecord(database, record);
    const submitRecord = vi.fn(async () => ({ success: true }));

    await expect(
      flushRecordSubmitOutbox({
        ownerKey: "user:42",
        database,
        secureStorage: storage,
        authService: { submitRecord },
        now: () => 1_000,
      }),
    ).resolves.toMatchObject({ uploaded: 1, remaining: 0 });

    expect(submitRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        clientRecordId: record.clientRecordId,
        modeKey: record.modeKey,
        replayString: record.replay.replayString,
      }),
    );
    expect(submitRecord.mock.calls[0]?.[0]).not.toHaveProperty(
      "rankedSessionToken",
    );
    expect(await database.getRecord("user:42", record.clientRecordId)).toMatchObject(
      { uploadStatus: "uploaded", source: "normal" },
    );
  });

  it("submits a ranked challenge token and removes it only after success", async () => {
    const database = createDatabase();
    const storage = secureStorage();
    await saveAccountSession(
      storage,
      session([
        {
          challengeId: "challenge-42",
          rankedSessionId: "ranked-session-42",
          token: "ranked-token-42",
          expiresAtEpochSeconds: 2_000_000_000,
        },
      ]),
    );
    const record = terminalRecord("ranked");
    await seedRecord(database, record);
    const submitRecord = vi.fn(async () => ({ success: true }));

    await flushRecordSubmitOutbox({
      ownerKey: "user:42",
      database,
      secureStorage: storage,
      authService: { submitRecord },
      now: () => 1_000,
    });

    expect(submitRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        challengeId: "challenge-42",
        rankedSessionToken: "ranked-token-42",
      }),
    );
    expect((await loadAccountSession(storage))?.challengeRefs).toEqual([]);
  });

  it("keeps transient failures pending with bounded exponential backoff", async () => {
    const database = createDatabase();
    const storage = secureStorage();
    await saveAccountSession(storage, session());
    const record = terminalRecord("normal");
    const outbox = await seedRecord(database, record);

    const result = await flushRecordSubmitOutbox({
      ownerKey: "user:42",
      database,
      secureStorage: storage,
      authService: {
        submitRecord: vi.fn(async () => {
          throw new MobileAuthError("network_error", {
            networkError: "offline",
          });
        }),
      },
      now: () => 1_000,
    });

    expect(result).toMatchObject({ pending: 1, remaining: 1 });
    expect(await database.listOutbox("user:42")).toEqual([
      expect.objectContaining({
        operationId: outbox.operationId,
        attemptCount: 1,
        nextAttemptAt: 3_000,
        lastErrorCode: "network_error",
      }),
    ]);
    expect(await database.getRecord("user:42", record.clientRecordId)).toMatchObject(
      { uploadStatus: "pending" },
    );
  });

  it("retains an unauthorized record and requests login after one auth attempt", async () => {
    const database = createDatabase();
    const storage = secureStorage();
    await saveAccountSession(storage, session());
    const record = terminalRecord("normal");
    const outbox = await seedRecord(database, record);

    const result = await flushRecordSubmitOutbox({
      ownerKey: "user:42",
      database,
      secureStorage: storage,
      authService: {
        submitRecord: vi.fn(async () => {
          throw new MobileAuthError("http_error", {
            status: 401,
            serverCode: "TOKEN_REVOKED",
          });
        }),
      },
      now: () => 1_000,
    });

    expect(result).toMatchObject({
      failed: 1,
      authRequired: true,
      remaining: 1,
    });
    expect(await database.listOutbox("user:42")).toEqual([
      expect.objectContaining({
        operationId: outbox.operationId,
        attemptCount: 1,
        nextAttemptAt: 0,
        lastErrorCode: "TOKEN_REVOKED",
      }),
    ]);
    expect(await database.getRecord("user:42", record.clientRecordId)).toMatchObject(
      { uploadStatus: "failed" },
    );
  });

  it("keeps permanent failures for explicit retry without changing the record ID", async () => {
    const database = createDatabase();
    const storage = secureStorage();
    await saveAccountSession(storage, session());
    const record = terminalRecord("normal");
    const outbox = await seedRecord(database, record);
    const submitRecord = vi
      .fn()
      .mockRejectedValueOnce(
        new MobileAuthError("http_error", {
          status: 400,
          serverCode: "REPLAY_INVALID",
        }),
      )
      .mockResolvedValueOnce({ success: true });

    await flushRecordSubmitOutbox({
      ownerKey: "user:42",
      database,
      secureStorage: storage,
      authService: { submitRecord },
      now: () => 1_000,
    });
    expect(await database.getRecord("user:42", record.clientRecordId)).toMatchObject(
      { uploadStatus: "failed" },
    );
    expect(await database.listOutbox("user:42")).toEqual([
      expect.objectContaining({
        operationId: outbox.operationId,
        nextAttemptAt: Number.MAX_SAFE_INTEGER,
        lastErrorCode: "REPLAY_INVALID",
      }),
    ]);

    await prepareRecordSubmitRetry(
      { ownerKey: "user:42", database, now: () => 2_000 },
      outbox.operationId,
    );
    await flushRecordSubmitOutbox({
      ownerKey: "user:42",
      database,
      secureStorage: storage,
      authService: { submitRecord },
      now: () => 2_000,
      forceOperationId: outbox.operationId,
    });

    expect(submitRecord.mock.calls.map(([input]) => input.clientRecordId)).toEqual([
      record.clientRecordId,
      record.clientRecordId,
    ]);
    expect(await database.listOutbox("user:42")).toEqual([]);
  });
});
