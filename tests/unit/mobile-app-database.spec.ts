import { IDBFactory, IDBKeyRange } from "fake-indexeddb";
import { describe, expect, it } from "vitest";

import {
  APP_DATABASE_SCHEMA_VERSION,
  APP_DATABASE_VERSION,
  AppDatabase,
  type AppDatabaseFaultPoint,
  type AppOwnerKey,
  type CacheKind,
  type CloudHistoryCacheValue,
  type LeaderboardCacheValue,
  type StoredCacheEntry,
  type StoredDiagnostic,
  type StoredGameRecord,
  type StoredGameSave,
  type StoredOutboxItem,
} from "../../mobile/src/data/app-database";
import type { AppModeKey } from "../../src/contracts";
import { createEngineSession } from "../../src/core/engine";

let databaseSequence = 0;

function nextDatabaseName(label: string): string {
  databaseSequence += 1;
  return `app-db-${label}-${databaseSequence}`;
}

function jsonBytes(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}

function createDatabase(
  label: string,
  options: Omit<
    ConstructorParameters<typeof AppDatabase>[0],
    "name" | "factory" | "keyRange"
  > = {},
): { database: AppDatabase; factory: IDBFactory; name: string } {
  const factory = new IDBFactory();
  const name = nextDatabaseName(label);
  return {
    factory,
    name,
    database: new AppDatabase({
      factory,
      keyRange: IDBKeyRange,
      name,
      ...options,
    }),
  };
}

function activeSave(
  ownerKey: AppOwnerKey,
  modeKey: AppModeKey,
  revision: number,
  lastClosedAt: number,
  gameKind: "normal" | "ranked" = "normal",
  clientRecordId = `${ownerKey}:${modeKey}:game-1`,
  generation = 1,
): StoredGameSave {
  const ranked = gameKind === "ranked";
  const engine = createEngineSession({
    modeKey,
    seed: revision + 100,
    startedAtMs: ranked ? 100 : null,
    challengeId: ranked ? `challenge-${revision}` : null,
  });
  engine.init();
  return {
    schemaVersion: APP_DATABASE_SCHEMA_VERSION,
    ownerKey,
    modeKey,
    clientRecordId,
    generation,
    lifecycle: "active",
    gameKind,
    revision,
    lastClosedAt,
    rankedSessionId: ranked ? `session-${revision}` : null,
    snapshot: engine.exportState(lastClosedAt),
  };
}

function terminalRecord(
  ownerKey: AppOwnerKey,
  clientRecordId: string,
  source: "guest" | "normal" | "ranked" = ownerKey === "guest"
    ? "guest"
    : "normal",
  modeKey: AppModeKey = "standard_4x4_pow2_no_undo",
): StoredGameRecord {
  const ranked = source === "ranked";
  const engine = createEngineSession({
    modeKey,
    seed: 9,
    startedAtMs: ranked ? 100 : null,
    challengeId: ranked ? "challenge-ranked" : null,
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
  if (!transition.gameOver)
    throw new Error("terminal fixture did not end the game");
  const finalSnapshot = engine.exportState(401);
  const boardValues = finalSnapshot.state.board.flat();
  return {
    schemaVersion: APP_DATABASE_SCHEMA_VERSION,
    clientRecordId,
    ownerKey,
    modeKey,
    source,
    endedAt: 401,
    score: finalSnapshot.state.score,
    bestTile: Math.max(...boardValues),
    steps: finalSnapshot.state.steps,
    durationMs: finalSnapshot.state.durationMs,
    boardSum: boardValues.reduce((sum, value) => sum + value, 0),
    replay: engine.exportReplay(),
    finalSnapshot,
    uploadStatus: ownerKey === "guest" ? "local" : "pending",
  };
}

function recordOutbox(
  ownerKey: AppOwnerKey,
  record: StoredGameRecord,
): StoredOutboxItem {
  return {
    schemaVersion: APP_DATABASE_SCHEMA_VERSION,
    operationId: `submit:${record.clientRecordId}`,
    ownerKey,
    kind: "record.submit",
    clientRecordId: record.clientRecordId,
    payload: { clientRecordId: record.clientRecordId },
    attemptCount: 0,
    nextAttemptAt: 0,
    lastErrorCode: null,
    createdAt: 401,
    updatedAt: 401,
  };
}

function sessionStartOutbox(
  ownerKey: AppOwnerKey,
  operationId = "ranked-start:1",
): StoredOutboxItem {
  return {
    schemaVersion: APP_DATABASE_SCHEMA_VERSION,
    operationId,
    ownerKey,
    kind: "ranked.session_start",
    clientRecordId: null,
    payload: { modeKey: "standard_4x4_pow2_no_undo" },
    attemptCount: 0,
    nextAttemptAt: 10,
    lastErrorCode: null,
    createdAt: 10,
    updatedAt: 10,
  };
}

function cacheEntry(
  ownerKey: StoredCacheEntry["ownerKey"],
  cacheKey: string,
  cacheKind: CacheKind,
  value: StoredCacheEntry["value"],
  lastAccessedAt: number,
): StoredCacheEntry {
  return {
    schemaVersion: APP_DATABASE_SCHEMA_VERSION,
    cacheKey,
    ownerKey,
    kind: "data",
    cacheKind,
    value,
    fetchedAt: lastAccessedAt,
    lastAccessedAt,
    sizeBytes: jsonBytes(value),
  } as StoredCacheEntry;
}

function historyValue(id: string, score = 1): CloudHistoryCacheValue {
  return {
    rows: [
      {
        id,
        clientRecordId: null,
        modeKey: "standard_4x4_pow2_no_undo",
        source: "normal",
        score,
        boardSum: score + 4,
        durationMs: 100,
        steps: 1,
        bestTile: 4,
        endedAt: "2026-07-23T00:00:00.000Z",
        deletedAt: null,
        restoreUntil: null,
        replayAvailable: false,
      },
    ],
    page: 1,
    totalPages: 1,
    hasNext: false,
    status: "active",
  };
}

function leaderboardValue(id: string, score = 1): LeaderboardCacheValue {
  return {
    rows: [
      {
        rank: 1,
        userId: id,
        nickname: `player-${id}`,
        score,
        speedMs: null,
        achievedAt: "2026-07-23T00:00:00.000Z",
      },
    ],
    page: 1,
    hasNext: false,
  };
}

function diagnostic(
  ownerKey: AppOwnerKey,
  eventId: string,
  occurredAt: number,
): StoredDiagnostic {
  return {
    schemaVersion: APP_DATABASE_SCHEMA_VERSION,
    eventId,
    ownerKey,
    category: "fatal_error",
    occurredAt,
    uploadPolicy: "allowed",
    uploadedAt: null,
    payload: {
      errorType: "TypeError",
      stack: "at mobile/main.ts:1:1",
      appVersion: "1.0.0",
      buildNumber: "1",
      androidVersion: "10",
      webViewVersion: "91",
    },
  };
}

async function rawPut(
  factory: IDBFactory,
  name: string,
  storeName: string,
  value: unknown,
  version = APP_DATABASE_VERSION,
): Promise<void> {
  const database = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = factory.open(name, version);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(storeName, "readwrite");
    transaction.objectStore(storeName).put(value);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
  database.close();
}

async function rawGetAll(
  factory: IDBFactory,
  name: string,
  storeName: string,
): Promise<unknown[]> {
  const database = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = factory.open(name, APP_DATABASE_VERSION);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  const rows = await new Promise<unknown[]>((resolve, reject) => {
    const transaction = database.transaction(storeName, "readonly");
    const request = transaction.objectStore(storeName).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  database.close();
  return rows;
}

async function createLegacyV1Database(
  factory: IDBFactory,
  name: string,
  save: Omit<StoredGameSave, "clientRecordId" | "generation">,
  legacyCaches: Omit<StoredCacheEntry, "cacheKind">[],
  extraSaves: unknown[] = [],
): Promise<void> {
  const database = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = factory.open(name, 1);
    request.onupgradeneeded = () => {
      const saves = request.result.createObjectStore("saves", {
        keyPath: ["ownerKey", "modeKey"],
      });
      saves.createIndex("by_owner", "ownerKey");
      saves.createIndex("by_owner_last_closed", ["ownerKey", "lastClosedAt"]);
      const records = request.result.createObjectStore("records", {
        keyPath: "clientRecordId",
      });
      records.createIndex("by_owner", "ownerKey");
      records.createIndex("by_owner_ended", ["ownerKey", "endedAt"]);
      records.createIndex("by_owner_upload", ["ownerKey", "uploadStatus"]);
      const outbox = request.result.createObjectStore("outbox", {
        keyPath: "operationId",
      });
      outbox.createIndex("by_owner", "ownerKey");
      outbox.createIndex("by_owner_next_attempt", [
        "ownerKey",
        "nextAttemptAt",
      ]);
      const cache = request.result.createObjectStore("cache", {
        keyPath: "cacheKey",
      });
      cache.createIndex("by_owner", "ownerKey");
      cache.createIndex("by_kind", "kind");
      cache.createIndex("by_kind_last_accessed", ["kind", "lastAccessedAt"]);
      const diagnostics = request.result.createObjectStore("diagnostics", {
        keyPath: "eventId",
      });
      diagnostics.createIndex("by_owner", "ownerKey");
      diagnostics.createIndex("by_owner_occurred", ["ownerKey", "occurredAt"]);
      diagnostics.createIndex("by_upload_policy", "uploadPolicy");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(["saves", "cache"], "readwrite");
    transaction.objectStore("saves").put(save);
    for (const extraSave of extraSaves)
      transaction.objectStore("saves").put(extraSave);
    for (const legacyCache of legacyCaches) {
      transaction.objectStore("cache").put(legacyCache);
    }
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
  database.close();
}

describe("mobile AppDatabase", () => {
  it("distinguishes an idempotent save from a genuinely older save", async () => {
    const { database } = createDatabase("save-write-result");
    const owner = "user:99" as const;
    const modeKey = "standard_4x4_pow2_no_undo" as const;
    const save = activeSave(owner, modeKey, 1, 100);

    await expect(database.putSave(save)).resolves.toBe("written");
    await expect(database.putSave(structuredClone(save))).resolves.toBe(
      "unchanged",
    );

    const laterLogicalCheckpoint = structuredClone(save);
    laterLogicalCheckpoint.snapshot.savedAtMs = 120;
    await expect(database.putSave(laterLogicalCheckpoint)).resolves.toBe(
      "written",
    );
    await expect(database.putSave(structuredClone(save))).resolves.toBe(
      "stale",
    );
  });

  it("keeps one revisioned save per mode and selects the most recently closed mode", async () => {
    const { database } = createDatabase("multi-save");
    const owner = "user:1" as const;
    await Promise.all([
      database.putSave(activeSave(owner, "standard_4x4_pow2_no_undo", 2, 200)),
      database.putSave(activeSave(owner, "standard_4x4_pow2_no_undo", 1, 100)),
    ]);
    await database.putSave(activeSave(owner, "classic_4x4_pow2_undo", 1, 500));
    await database.putSave(activeSave(owner, "board_3x3_pow2_no_undo", 1, 300));
    await expect(
      database.putSave(activeSave(owner, "standard_4x4_pow2_no_undo", 2, 600)),
    ).resolves.toBe("written");
    const { generation: _generation, ...unexpectedNewGame } = activeSave(
      owner,
      "classic_4x4_pow2_undo",
      1,
      700,
      "normal",
      "unexpected-new-game",
    );
    await expect(
      database.startNewGame(unexpectedNewGame),
    ).rejects.toMatchObject({
      code: "active_game_exists",
    });

    const standard = await database.getSave(owner, "standard_4x4_pow2_no_undo");
    expect(standard.status).toBe("ok");
    if (standard.status === "ok") expect(standard.save.revision).toBe(2);
    expect(
      (await database.listSaves(owner)).filter((row) => row.status === "ok"),
    ).toHaveLength(3);
    expect((await database.getMostRecentlyClosedSave(owner))?.modeKey).toBe(
      "standard_4x4_pow2_no_undo",
    );
  });

  it("restarts only through a lineage-checked close and allocates the next generation", async () => {
    const { database } = createDatabase("restart-generation");
    const owner = "user:23" as const;
    const modeKey = "standard_4x4_pow2_no_undo" as const;
    await database.putSave(
      activeSave(owner, modeKey, 1, 100, "normal", "old-game"),
    );
    await expect(
      database.deleteSave({
        ownerKey: owner,
        modeKey,
        expectedClientRecordId: "old-game",
        expectedGeneration: 1,
        closedAt: 200,
      }),
    ).resolves.toBe("deleted");
    const { generation: _generation, ...input } = activeSave(
      owner,
      modeKey,
      0,
      201,
      "normal",
      "new-game",
    );
    await expect(database.startNewGame(input)).resolves.toMatchObject({
      clientRecordId: "new-game",
      generation: 2,
    });
    expect(await database.listRecords(owner)).toEqual([]);
    expect(await database.listOutbox(owner)).toEqual([]);
  });

  it("atomically finalizes guest/account records and enforces outbox ownership", async () => {
    const { database } = createDatabase("terminal-owners");
    const guestRecord = terminalRecord("guest", "guest-record");
    await database.putSave(
      activeSave(
        "guest",
        guestRecord.modeKey,
        1,
        100,
        "normal",
        guestRecord.clientRecordId,
      ),
    );
    await expect(
      database.finalizeTerminal({
        ownerKey: "guest",
        modeKey: guestRecord.modeKey,
        expectedSaveRevision: 1,
        record: guestRecord,
        outbox: recordOutbox("guest", guestRecord),
      }),
    ).rejects.toMatchObject({ code: "guest_outbox_forbidden" });
    await expect(
      database.finalizeTerminal({
        ownerKey: "guest",
        modeKey: guestRecord.modeKey,
        expectedSaveRevision: 1,
        record: guestRecord,
      }),
    ).resolves.toMatchObject({ created: true });
    expect(await database.listOutbox("guest")).toEqual([]);

    const owner = "user:2" as const;
    const accountRecord = terminalRecord(owner, "account-record", "normal");
    await database.putSave(
      activeSave(
        owner,
        accountRecord.modeKey,
        1,
        100,
        "normal",
        accountRecord.clientRecordId,
      ),
    );
    await expect(
      database.finalizeTerminal({
        ownerKey: owner,
        modeKey: accountRecord.modeKey,
        expectedSaveRevision: 1,
        record: accountRecord,
      }),
    ).rejects.toMatchObject({ code: "account_outbox_required" });
    await database.finalizeTerminal({
      ownerKey: owner,
      modeKey: accountRecord.modeKey,
      expectedSaveRevision: 1,
      record: accountRecord,
      outbox: recordOutbox(owner, accountRecord),
    });
    expect(await database.listRecords(owner)).toHaveLength(1);
    expect(await database.listOutbox(owner)).toHaveLength(1);
  });

  it("requires the classic undo mode to enter pending_terminal before finalization", async () => {
    const { database } = createDatabase("classic-pending-terminal");
    const owner = "user:22" as const;
    const record = terminalRecord(
      owner,
      "classic-terminal-record",
      "normal",
      "classic_4x4_pow2_undo",
    );
    const active = activeSave(
      owner,
      record.modeKey,
      1,
      100,
      "normal",
      record.clientRecordId,
    );
    await database.putSave(active);
    await expect(
      database.finalizeTerminal({
        ownerKey: owner,
        modeKey: record.modeKey,
        expectedSaveRevision: 1,
        record,
        outbox: recordOutbox(owner, record),
      }),
    ).rejects.toMatchObject({ code: "pending_terminal_required" });

    await database.putSave({
      ...active,
      lifecycle: "pending_terminal",
      revision: 2,
      lastClosedAt: 401,
      snapshot: record.finalSnapshot,
    });
    await expect(
      database.finalizeTerminal({
        ownerKey: owner,
        modeKey: record.modeKey,
        expectedSaveRevision: 2,
        record,
        outbox: recordOutbox(owner, record),
      }),
    ).resolves.toMatchObject({ created: true });
  });

  it("treats an old terminal retry as a pure read and preserves a later new game", async () => {
    const { database, factory, name } = createDatabase("late-terminal-retry");
    const owner = "user:3" as const;
    const record = terminalRecord(owner, "record-once", "normal");
    const outbox = recordOutbox(owner, record);
    await database.putSave(
      activeSave(
        owner,
        record.modeKey,
        1,
        100,
        "normal",
        record.clientRecordId,
      ),
    );
    await database.finalizeTerminal({
      ownerKey: owner,
      modeKey: record.modeKey,
      expectedSaveRevision: 1,
      record,
      outbox,
    });
    await database.removeOutbox(owner, outbox.operationId);
    await database.close();
    const reopened = new AppDatabase({ factory, keyRange: IDBKeyRange, name });
    const { generation: _ignoredGeneration, ...newGameInput } = activeSave(
      owner,
      record.modeKey,
      1,
      900,
      "normal",
      "new-game",
      99,
    );
    await expect(reopened.startNewGame(newGameInput)).resolves.toMatchObject({
      clientRecordId: "new-game",
      generation: 2,
    });
    await expect(
      reopened.putSave(
        activeSave(
          owner,
          record.modeKey,
          2,
          950,
          "normal",
          record.clientRecordId,
          1,
        ),
      ),
    ).resolves.toBe("stale");
    await expect(
      reopened.deleteSave({
        ownerKey: owner,
        modeKey: record.modeKey,
        expectedClientRecordId: record.clientRecordId,
        expectedGeneration: 1,
        closedAt: 960,
      }),
    ).resolves.toBe("stale");

    await expect(
      reopened.finalizeTerminal({
        ownerKey: owner,
        modeKey: record.modeKey,
        expectedSaveRevision: 1,
        record,
        outbox,
      }),
    ).resolves.toMatchObject({ created: false });
    expect((await reopened.getSave(owner, record.modeKey)).status).toBe("ok");
    expect(await reopened.listOutbox(owner)).toEqual([]);
  });

  for (const faultPoint of [
    "finalize.after_record",
    "finalize.after_outbox",
    "finalize.after_save_delete",
  ] as const) {
    it(`rolls the full terminal transaction back at ${faultPoint}`, async () => {
      const { database, factory, name } = createDatabase(
        `terminal-fault-${faultPoint}`,
        {
          faultInjector(point) {
            if (point === faultPoint) throw new Error(point);
          },
        },
      );
      const record = terminalRecord(
        "guest",
        `record-${faultPoint.replaceAll(".", "-")}`,
      );
      await database.putSave(
        activeSave(
          "guest",
          record.modeKey,
          1,
          100,
          "normal",
          record.clientRecordId,
        ),
      );
      await expect(
        database.finalizeTerminal({
          ownerKey: "guest",
          modeKey: record.modeKey,
          expectedSaveRevision: 1,
          record,
        }),
      ).rejects.toThrow(faultPoint);
      expect((await database.getSave("guest", record.modeKey)).status).toBe(
        "ok",
      );
      expect(await database.listRecords("guest")).toEqual([]);

      const recovery = new AppDatabase({
        factory,
        keyRange: IDBKeyRange,
        name,
      });
      await recovery.finalizeTerminal({
        ownerKey: "guest",
        modeKey: record.modeKey,
        expectedSaveRevision: 1,
        record,
      });
      expect(await recovery.listRecords("guest")).toHaveLength(1);
    });
  }

  it("supports ranked start outbox create, monotonic retry update, and acknowledgement", async () => {
    const { database } = createDatabase("outbox-lifecycle");
    const owner = "user:4" as const;
    const item = sessionStartOutbox(owner);
    await expect(
      database.enqueueOutbox(sessionStartOutbox("guest", "guest-start")),
    ).rejects.toMatchObject({ code: "guest_outbox_forbidden" });
    await expect(
      database.enqueueOutbox({
        ...sessionStartOutbox(owner, "unsafe-start"),
        payload: { token: "secret" },
      } as unknown as StoredOutboxItem),
    ).rejects.toMatchObject({ code: "invalid_outbox_payload" });
    await expect(database.enqueueOutbox(item)).resolves.toBe("created");
    await expect(database.enqueueOutbox(item)).resolves.toBe("existing");
    await expect(
      database.updateOutboxAttempt(owner, item.operationId, {
        attemptCount: 1,
        nextAttemptAt: 50,
        lastErrorCode: "network",
        updatedAt: 20,
      }),
    ).resolves.toMatchObject({ attemptCount: 1, lastErrorCode: "network" });
    await expect(
      database.updateOutboxAttempt(owner, item.operationId, {
        attemptCount: 1,
        nextAttemptAt: 51,
        lastErrorCode: "network",
        updatedAt: 20,
      }),
    ).rejects.toMatchObject({ code: "outbox_update_conflict" });
    await expect(
      database.updateOutboxAttempt(owner, item.operationId, {
        attemptCount: 0,
        nextAttemptAt: 0,
        lastErrorCode: null,
        updatedAt: 19,
      }),
    ).rejects.toMatchObject({ code: "stale_outbox_update" });
    await expect(database.removeOutbox(owner, item.operationId)).resolves.toBe(
      true,
    );
    expect(await database.listOutbox(owner)).toEqual([]);
  });

  it("atomically preserves or acknowledges a record submit with its upload status", async () => {
    const { database } = createDatabase("record-submit-outcome");
    const owner = "user:41" as const;
    const record = terminalRecord(owner, "record-submit-1");
    const outbox = recordOutbox(owner, record);
    await database.putSave(
      activeSave(
        owner,
        record.modeKey,
        1,
        100,
        "normal",
        record.clientRecordId,
      ),
    );
    await database.finalizeTerminal({
      ownerKey: owner,
      modeKey: record.modeKey,
      expectedSaveRevision: 1,
      record,
      outbox,
    });

    await expect(
      database.applyRecordSubmitOutcome(owner, outbox.operationId, {
        status: "failed",
        attemptCount: 1,
        nextAttemptAt: 5_000,
        lastErrorCode: "REPLAY_INVALID",
        updatedAt: 1_000,
      }),
    ).resolves.toMatchObject({ uploadStatus: "failed" });
    expect(await database.listOutbox(owner)).toEqual([
      expect.objectContaining({
        attemptCount: 1,
        nextAttemptAt: 5_000,
        lastErrorCode: "REPLAY_INVALID",
      }),
    ]);

    await expect(
      database.applyRecordSubmitOutcome(owner, outbox.operationId, {
        status: "pending",
        attemptCount: 1,
        nextAttemptAt: 1_001,
        lastErrorCode: null,
        updatedAt: 1_001,
      }),
    ).resolves.toMatchObject({ uploadStatus: "pending" });
    await expect(
      database.applyRecordSubmitOutcome(owner, outbox.operationId, {
        status: "uploaded",
        updatedAt: 1_002,
      }),
    ).resolves.toMatchObject({ uploadStatus: "uploaded" });
    expect(await database.listOutbox(owner)).toEqual([]);
    expect(await database.getRecord(owner, record.clientRecordId)).toMatchObject(
      { uploadStatus: "uploaded" },
    );
  });

  it("atomically reuses one ranked start intent per owner and mode across database instances", async () => {
    const { database, factory, name } = createDatabase(
      "ranked-start-intent-single-flight",
    );
    const secondDatabase = new AppDatabase({
      factory,
      keyRange: IDBKeyRange,
      name,
    });
    const owner = "user:44" as const;
    const firstCandidate = sessionStartOutbox(
      owner,
      "ranked-start:atomic-candidate-1",
    );
    const secondCandidate = {
      ...sessionStartOutbox(owner, "ranked-start:atomic-candidate-2"),
      createdAt: 11,
      updatedAt: 11,
      nextAttemptAt: 11,
    };

    const [first, second] = await Promise.all([
      database.getOrCreateRankedStartIntent(firstCandidate),
      secondDatabase.getOrCreateRankedStartIntent(secondCandidate),
    ]);

    expect(first.operationId).toBe(second.operationId);
    expect([firstCandidate.operationId, secondCandidate.operationId]).toContain(
      first.operationId,
    );
    expect(await database.listOutbox(owner)).toEqual([first]);
  });

  for (const faultPoint of [
    "clear.after_saves",
    "clear.after_records",
    "clear.after_outbox",
    "clear.after_cache",
    "clear.after_diagnostics",
    "clear.after_marker_delete",
  ] as AppDatabaseFaultPoint[]) {
    it(`keeps an owner invisible and resumes clearing after ${faultPoint}`, async () => {
      const { database, factory, name } = createDatabase(
        `clear-fault-${faultPoint}`,
        {
          faultInjector(point) {
            if (point === faultPoint) throw new Error(point);
          },
        },
      );
      const oldOwner = "user:5" as const;
      const nextOwner = "user:6" as const;
      await database.putSave(
        activeSave(oldOwner, "classic_4x4_pow2_undo", 1, 100),
      );
      await database.putSave(
        activeSave(nextOwner, "classic_4x4_pow2_undo", 1, 200),
      );
      await database.putSave(
        activeSave("guest", "standard_4x4_pow2_no_undo", 1, 300),
      );
      await database.enqueueOutbox(sessionStartOutbox(oldOwner));
      await database.putCache(
        cacheEntry(
          oldOwner,
          "history",
          "cloud_history",
          historyValue("old-owner"),
          1,
        ),
      );
      await database.addDiagnostic(diagnostic(oldOwner, "old-owner-event", 1));
      await database.beginOwnerClear(oldOwner, 500);

      await expect(
        database.getSave(oldOwner, "classic_4x4_pow2_undo"),
      ).rejects.toMatchObject({
        code: "owner_clearing",
      });
      await expect(database.completeOwnerClear(oldOwner)).rejects.toThrow(
        faultPoint,
      );
      expect(await database.listPendingOwnerClears()).toEqual([oldOwner]);

      const recovery = new AppDatabase({
        factory,
        keyRange: IDBKeyRange,
        name,
      });
      await recovery.completeOwnerClear(oldOwner);
      expect(await recovery.listPendingOwnerClears()).toEqual([]);
      expect(await recovery.listSaves(oldOwner)).toEqual([]);
      expect(
        (await recovery.getSave(nextOwner, "classic_4x4_pow2_undo")).status,
      ).toBe("ok");
      expect(
        (await recovery.getSave("guest", "standard_4x4_pow2_no_undo")).status,
      ).toBe("ok");
    });
  }

  it("reserves owner-clear keys and keeps identical logical cache keys isolated by owner", async () => {
    const { database } = createDatabase("cache-owner-isolation");
    const firstOwner = "user:7" as const;
    const secondOwner = "user:8" as const;
    await expect(
      database.putCache(
        cacheEntry(
          firstOwner,
          "system:owner-clear:user:7",
          "cloud_history",
          historyValue("reserved"),
          1,
        ),
      ),
    ).rejects.toMatchObject({ code: "invalid_cache" });
    await expect(
      database.putCache(
        cacheEntry(
          firstOwner,
          "unsafe",
          "cloud_history",
          { authorization: "Bearer secret" } as never,
          1,
        ),
      ),
    ).rejects.toMatchObject({ code: "invalid_cache_value" });
    await expect(
      database.putCache(
        cacheEntry(
          firstOwner,
          "unsafe-jwt",
          "cloud_history",
          {
            data: "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature123",
          } as never,
          1,
        ),
      ),
    ).rejects.toMatchObject({ code: "invalid_cache_value" });

    await database.putCache(
      cacheEntry(
        firstOwner,
        "history",
        "cloud_history",
        historyValue("owner-7", 7),
        1,
      ),
    );
    await database.putCache(
      cacheEntry(
        secondOwner,
        "history",
        "cloud_history",
        historyValue("owner-8", 8),
        1,
      ),
    );
    expect((await database.getCache("history", firstOwner, 2))?.value).toEqual(
      historyValue("owner-7", 7),
    );
    expect((await database.getCache("history", secondOwner, 2))?.value).toEqual(
      historyValue("owner-8", 8),
    );
    await database.beginOwnerClear(firstOwner, 3);
    expect(await database.listPendingOwnerClears()).toEqual([firstOwner]);
  });

  it("enforces count LRU, replay byte LRU, and access-time refresh", async () => {
    const countDb = createDatabase("cache-count-lru", {
      cacheMaxEntries: 2,
    }).database;
    await countDb.putCache(
      cacheEntry("public", "a", "leaderboard", leaderboardValue("a"), 1),
    );
    await countDb.putCache(
      cacheEntry("public", "b", "leaderboard", leaderboardValue("b"), 2),
    );
    await countDb.getCache("a", "public", 100);
    await countDb.putCache(
      cacheEntry("public", "c", "leaderboard", leaderboardValue("c"), 3),
    );
    expect(await countDb.getCache("a", "public", 101)).not.toBeNull();
    expect(await countDb.getCache("b", "public", 101)).toBeNull();
    expect(await countDb.getCache("c", "public", 101)).not.toBeNull();
    await countDb.putCache(
      cacheEntry(
        "public",
        "fresh",
        "leaderboard",
        leaderboardValue("fresh", 200),
        200,
      ),
    );
    await countDb.putCache(
      cacheEntry(
        "public",
        "fresh",
        "leaderboard",
        leaderboardValue("fresh", 100),
        100,
      ),
    );
    expect((await countDb.getCache("fresh", "public", 201))?.value).toEqual({
      ...leaderboardValue("fresh", 200),
    });

    const replayEngine = createEngineSession({
      modeKey: "standard_4x4_pow2_no_undo",
      seed: 1,
    });
    replayEngine.init();
    const replay = replayEngine.exportReplay();
    const replayDb = createDatabase("cache-replay-lru", {
      cacheMaxEntries: 10,
      replayCacheMaxBytes: jsonBytes(replay) * 2 - 1,
    }).database;
    await replayDb.putCache(cacheEntry("user:9", "r1", "replay", replay, 1));
    await replayDb.putCache(cacheEntry("user:9", "r2", "replay", replay, 2));
    expect(await replayDb.getCache("r1", "user:9", 3)).toBeNull();
    expect(await replayDb.getCache("r2", "user:9", 3)).not.toBeNull();
  });

  it("keeps diagnostics as a bounded, strict technical-data ring", async () => {
    const { database } = createDatabase("diagnostic-ring", {
      diagnosticMaxEntries: 2,
      diagnosticMaxPayloadBytes: 512,
    });
    await database.addDiagnostic(diagnostic("guest", "e1", 1));
    await database.addDiagnostic(diagnostic("guest", "e2", 2));
    await database.addDiagnostic(diagnostic("guest", "e3", 3));
    expect(
      (await database.listDiagnostics("guest")).map((row) => row.eventId),
    ).toEqual(["e2", "e3"]);
    await expect(
      database.addDiagnostic(diagnostic("user:99", "e3", 4)),
    ).rejects.toMatchObject({ code: "diagnostic_event_id_conflict" });

    const unsafe = diagnostic("guest", "unsafe", 4) as StoredDiagnostic & {
      payload: StoredDiagnostic["payload"] & { token: string };
    };
    unsafe.payload.token = "secret";
    await expect(database.addDiagnostic(unsafe)).rejects.toMatchObject({
      code: "invalid_diagnostic",
    });
    const oversized = diagnostic("guest", "oversized", 5);
    oversized.payload.stack = "x".repeat(600);
    await expect(database.addDiagnostic(oversized)).rejects.toMatchObject({
      code: "invalid_diagnostic",
    });
  });

  it("never evicts a future diagnostic while enforcing the current-version ring", async () => {
    const { database, factory, name } = createDatabase(
      "future-diagnostic-ring",
      {
        diagnosticMaxEntries: 1,
      },
    );
    await database.addDiagnostic(diagnostic("guest", "current-1", 1));
    await database.close();
    await rawPut(factory, name, "diagnostics", {
      ...diagnostic("guest", "future-event", 2),
      schemaVersion: 99,
    });
    const reopened = new AppDatabase({
      factory,
      keyRange: IDBKeyRange,
      name,
      diagnosticMaxEntries: 1,
    });
    await reopened.addDiagnostic(diagnostic("guest", "current-2", 3));
    await expect(reopened.listDiagnostics("guest")).rejects.toMatchObject({
      code: "future_schema",
    });
    await reopened.close();
    const ids = (await rawGetAll(factory, name, "diagnostics"))
      .map((row) => (row as { eventId?: string }).eventId)
      .sort();
    expect(ids).toEqual(["current-2", "future-event"]);
  });

  it("isolates corrupt/future rows and never returns a future outbox", async () => {
    const { database, factory, name } = createDatabase("future-rows");
    const owner = "user:10" as const;
    await database.putSave(activeSave(owner, "classic_4x4_pow2_undo", 1, 100));
    await database.close();

    const corruptSave = activeSave(
      owner,
      "board_3x3_pow2_no_undo",
      1,
      200,
    ) as unknown as Record<string, unknown>;
    corruptSave.snapshot = activeSave(
      owner,
      "classic_4x4_pow2_undo",
      1,
      200,
    ).snapshot;
    await rawPut(factory, name, "saves", corruptSave);
    await rawPut(factory, name, "outbox", {
      ...sessionStartOutbox(owner, "future-operation"),
      schemaVersion: 99,
    });
    await rawPut(factory, name, "cache", {
      ...cacheEntry(
        owner,
        "future-cache",
        "cloud_history",
        historyValue("future"),
        1,
      ),
      schemaVersion: 99,
    });

    const reopened = new AppDatabase({ factory, keyRange: IDBKeyRange, name });
    expect(
      (await reopened.getSave(owner, "board_3x3_pow2_no_undo")).status,
    ).toBe("corrupt");
    expect(
      (await reopened.getSave(owner, "classic_4x4_pow2_undo")).status,
    ).toBe("ok");
    await expect(reopened.listOutbox(owner)).rejects.toMatchObject({
      code: "future_schema",
    });
    await expect(
      reopened.getCache("future-cache", owner, 2),
    ).rejects.toMatchObject({
      code: "future_schema",
    });
  });

  it("migrates the legacy v1 cache key shape without losing rows", async () => {
    const factory = new IDBFactory();
    const name = nextDatabaseName("migration-v1-v2");
    const owner = "user:11" as const;
    const currentSave = activeSave(owner, "standard_4x4_pow2_no_undo", 1, 10);
    const {
      clientRecordId: _clientRecordId,
      generation: _generation,
      ...save
    } = currentSave;
    const currentCache = cacheEntry(
      owner,
      "history-page-1",
      "cloud_history",
      historyValue("history-1"),
      10,
    );
    const secondCache = cacheEntry(
      "public",
      "leaderboard-all",
      "leaderboard",
      leaderboardValue("leader-1", 10),
      11,
    );
    const { cacheKind: _cacheKind, ...legacyCache } = currentCache;
    const { cacheKind: _secondKind, ...secondLegacyCache } = secondCache;
    const {
      clientRecordId: _futureId,
      generation: _futureGeneration,
      ...futureSaveBase
    } = activeSave(owner, "classic_4x4_pow2_undo", 1, 12);
    const futureSave = { ...futureSaveBase, schemaVersion: 99 };
    const { cacheKind: _futureKind, ...futureCacheBase } = cacheEntry(
      owner,
      "future-cache",
      "cloud_history",
      historyValue("future-migration"),
      12,
    );
    const futureCache = { ...futureCacheBase, schemaVersion: 99 };
    await createLegacyV1Database(
      factory,
      name,
      save,
      [
        legacyCache,
        secondLegacyCache,
        futureCache as unknown as Omit<StoredCacheEntry, "cacheKind">,
      ],
      [futureSave],
    );

    const database = new AppDatabase({ factory, keyRange: IDBKeyRange, name });
    await database.open();
    const migrated = await database.getSave(owner, save.modeKey);
    expect(migrated.status).toBe("ok");
    if (migrated.status === "ok") {
      expect(migrated.save.generation).toBe(1);
      expect(migrated.save.clientRecordId).toMatch(/^legacy:/u);
    }
    expect(
      (await database.getCache("history-page-1", owner, 20))?.value,
    ).toEqual(historyValue("history-1"));
    expect(
      await database.getCache("leaderboard-all", "public", 20),
    ).toMatchObject({
      cacheKind: "leaderboard",
      value: leaderboardValue("leader-1", 10),
    });
    expect(
      (await database.getSave(owner, "classic_4x4_pow2_undo")).status,
    ).toBe("future_schema");
    await expect(
      database.getCache("future-cache", owner, 20),
    ).rejects.toMatchObject({
      code: "future_schema",
    });
    await database.close();
    const rawFutureSave = (await rawGetAll(factory, name, "saves")).find(
      (row) =>
        (row as { modeKey?: string }).modeKey === "classic_4x4_pow2_undo",
    ) as Record<string, unknown>;
    const rawFutureCache = (await rawGetAll(factory, name, "cache")).find(
      (row) => (row as { cacheKey?: string }).cacheKey === "future-cache",
    ) as Record<string, unknown>;
    expect(rawFutureSave).not.toHaveProperty("generation");
    expect(rawFutureSave).not.toHaveProperty("clientRecordId");
    expect(rawFutureCache).not.toHaveProperty("cacheKind");
  });

  it("preserves a future physical database instead of opening or clearing it", async () => {
    const factory = new IDBFactory();
    const name = nextDatabaseName("future-physical-schema");
    const future = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = factory.open(name, APP_DATABASE_VERSION + 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    future.close();
    const database = new AppDatabase({ factory, keyRange: IDBKeyRange, name });
    await expect(database.open()).rejects.toMatchObject({
      code: "future_database_schema",
    });
  });
});
