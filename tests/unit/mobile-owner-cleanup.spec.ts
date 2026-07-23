import { IDBFactory, IDBKeyRange } from "fake-indexeddb";
import { describe, expect, it, vi } from "vitest";

import {
  APP_DATABASE_SCHEMA_VERSION,
  AppDatabase,
  type AppOwnerKey,
  type StoredCacheEntry,
  type StoredDiagnostic,
  type StoredGameRecord,
  type StoredGameSave,
  type StoredOutboxItem,
} from "../../mobile/src/data/app-database";
import {
  ACCOUNT_SESSION_SECURE_KEY,
  clearConfirmedOwner,
  OwnerCleanupWorkGate,
  restoreOwnerCleanupAtStartup,
} from "../../mobile/src/data/owner-cleanup";
import {
  createMemorySecureStorage,
  SecureStorageError,
  type SecureStorage,
} from "../../mobile/src/platform/secure-storage";
import type { AppModeKey } from "../../src/contracts";
import { createEngineSession } from "../../src/core/engine";

type CleanupDatabase = Pick<
  AppDatabase,
  "open" | "beginOwnerClear" | "listPendingOwnerClears" | "completeOwnerClear"
>;

function storedSave(
  ownerKey: AppOwnerKey,
  clientRecordId: string,
  modeKey: AppModeKey = "standard_4x4_pow2_no_undo",
): StoredGameSave {
  const engine = createEngineSession({
    modeKey,
    seed: clientRecordId.length,
  });
  engine.init();
  return {
    schemaVersion: APP_DATABASE_SCHEMA_VERSION,
    ownerKey,
    modeKey,
    clientRecordId,
    generation: 1,
    lifecycle: "active",
    gameKind: "normal",
    revision: 0,
    lastClosedAt: 10,
    rankedSessionId: null,
    snapshot: engine.exportState(10),
  };
}

function terminalRecord(
  ownerKey: AppOwnerKey,
  clientRecordId: string,
): StoredGameRecord {
  const engine = createEngineSession({
    modeKey: "standard_4x4_pow2_no_undo",
    seed: 9,
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
    modeKey: "standard_4x4_pow2_no_undo",
    source: ownerKey === "guest" ? "guest" : "normal",
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
  ownerKey: Exclude<AppOwnerKey, "guest">,
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

function historyCache(
  ownerKey: AppOwnerKey,
  cacheKey: string,
): StoredCacheEntry {
  const value = {
    rows: [],
    page: 1,
    totalPages: 1,
    hasNext: false,
    status: "active" as const,
  };
  return {
    schemaVersion: APP_DATABASE_SCHEMA_VERSION,
    cacheKey,
    ownerKey,
    kind: "data",
    cacheKind: "cloud_history",
    value,
    fetchedAt: 500,
    lastAccessedAt: 500,
    sizeBytes: new TextEncoder().encode(JSON.stringify(value)).byteLength,
  };
}

function diagnostic(ownerKey: AppOwnerKey, eventId: string): StoredDiagnostic {
  return {
    schemaVersion: APP_DATABASE_SCHEMA_VERSION,
    eventId,
    ownerKey,
    category: "fatal_error",
    occurredAt: 500,
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

async function seedOwnerAcrossStores(
  database: AppDatabase,
  ownerKey: AppOwnerKey,
  label: string,
): Promise<void> {
  const record = terminalRecord(ownerKey, `${label}-record`);
  await database.putSave(storedSave(ownerKey, record.clientRecordId));
  await database.finalizeTerminal({
    ownerKey,
    modeKey: record.modeKey,
    expectedSaveRevision: 0,
    record,
    ...(ownerKey === "guest" ? {} : { outbox: recordOutbox(ownerKey, record) }),
  });
  await database.putSave(
    storedSave(ownerKey, `${label}-active`, "board_3x3_pow2_no_undo"),
  );
  await database.putCache(historyCache(ownerKey, `${label}-history`));
  await database.addDiagnostic(diagnostic(ownerKey, `${label}-diagnostic`));
}

interface DatabaseHarness {
  database: CleanupDatabase;
  markers: Set<AppOwnerKey>;
  events: string[];
  failOpen?: Error;
  failList?: Error;
  failBegin?: Error;
  failBeginAfterMarker?: Error;
  failCompleteOwner?: AppOwnerKey;
}

function createDatabaseHarness(pending: AppOwnerKey[] = []): DatabaseHarness {
  const harness: DatabaseHarness = {
    markers: new Set(pending),
    events: [],
    database: null as unknown as CleanupDatabase,
  };
  harness.database = {
    async open() {
      harness.events.push("db.open");
      if (harness.failOpen) throw harness.failOpen;
    },
    async beginOwnerClear(ownerKey, createdAt) {
      harness.events.push(`db.begin:${ownerKey}:${String(createdAt)}`);
      if (harness.failBegin) throw harness.failBegin;
      harness.markers.add(ownerKey);
      if (harness.failBeginAfterMarker) throw harness.failBeginAfterMarker;
    },
    async listPendingOwnerClears() {
      harness.events.push("db.list");
      if (harness.failList) throw harness.failList;
      return [...harness.markers];
    },
    async completeOwnerClear(ownerKey) {
      harness.events.push(`db.complete:${ownerKey}`);
      if (harness.failCompleteOwner === ownerKey) {
        throw new Error(`complete_failed:${ownerKey}`);
      }
      harness.markers.delete(ownerKey);
    },
  };
  return harness;
}

function recordingStorage(
  storage: SecureStorage,
  events: string[],
): SecureStorage {
  return {
    async get(key) {
      events.push(`secure.get:${key}`);
      return storage.get(key);
    },
    async set(key, value) {
      events.push(`secure.set:${key}`);
      await storage.set(key, value);
    },
    async delete(key) {
      events.push(`secure.delete:${key}`);
      await storage.delete(key);
    },
  };
}

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void;
  const promise = new Promise<void>((settle) => {
    resolve = settle;
  });
  return { promise, resolve };
}

function confirmedCleanupInput(
  harness: DatabaseHarness,
  secureStorage: SecureStorage,
  ownerKey: AppOwnerKey = "user:1",
) {
  const workGate = new OwnerCleanupWorkGate();
  return {
    ownerKey,
    createdAt: 123,
    database: harness.database,
    secureStorage,
    workGate,
    clearMemoryAuth: vi.fn(async (owner: AppOwnerKey) => {
      harness.events.push(`auth.clear:${owner}`);
    }),
  };
}

describe("mobile owner cleanup", () => {
  it("runs confirmed cleanup in the irreversible marker order", async () => {
    const harness = createDatabaseHarness();
    const storage = recordingStorage(
      createMemorySecureStorage(),
      harness.events,
    );
    await storage.set(ACCOUNT_SESSION_SECURE_KEY, "secret-envelope");
    harness.events.length = 0;

    await clearConfirmedOwner(
      confirmedCleanupInput(harness, storage, "user:1"),
    );

    expect(harness.events).toEqual([
      "db.begin:user:1:123",
      "auth.clear:user:1",
      `secure.delete:${ACCOUNT_SESSION_SECURE_KEY}`,
      "db.complete:user:1",
    ]);
    expect(harness.markers.size).toBe(0);
    await expect(storage.get(ACCOUNT_SESSION_SECURE_KEY)).resolves.toBeNull();
  });

  it("resumes owner work when the marker was not committed", async () => {
    const harness = createDatabaseHarness();
    harness.failBegin = new Error("begin_failed");
    const storage = recordingStorage(
      createMemorySecureStorage(),
      harness.events,
    );
    const input = confirmedCleanupInput(harness, storage);

    await expect(clearConfirmedOwner(input)).rejects.toThrow("begin_failed");
    expect(harness.events).toEqual(["db.begin:user:1:123", "db.list"]);
    expect(input.clearMemoryAuth).not.toHaveBeenCalled();
    expect(harness.markers.size).toBe(0);
    expect(input.workGate.isStopped("user:1")).toBe(false);
  });

  it("stays stopped when begin reports failure after committing the marker", async () => {
    const harness = createDatabaseHarness();
    harness.failBeginAfterMarker = new Error("begin_result_unknown");
    const storage = recordingStorage(
      createMemorySecureStorage(),
      harness.events,
    );
    const input = confirmedCleanupInput(harness, storage);

    await expect(clearConfirmedOwner(input)).rejects.toThrow(
      "begin_result_unknown",
    );
    expect(harness.events).toEqual(["db.begin:user:1:123", "db.list"]);
    expect(harness.markers).toEqual(new Set(["user:1"]));
    expect(input.workGate.isStopped("user:1")).toBe(true);
    expect(input.clearMemoryAuth).not.toHaveBeenCalled();
  });

  it("stays stopped when a failed begin cannot be checked for a marker", async () => {
    const harness = createDatabaseHarness();
    harness.failBegin = new Error("begin_failed");
    harness.failList = new Error("list_failed");
    const storage = recordingStorage(
      createMemorySecureStorage(),
      harness.events,
    );
    const input = confirmedCleanupInput(harness, storage);

    await expect(clearConfirmedOwner(input)).rejects.toThrow(
      "owner_cleanup_marker_state_unknown",
    );
    expect(harness.events).toEqual(["db.begin:user:1:123", "db.list"]);
    expect(input.workGate.isStopped("user:1")).toBe(true);
    expect(input.clearMemoryAuth).not.toHaveBeenCalled();
  });

  it("gates new work and drains held work before writing the marker", async () => {
    const harness = createDatabaseHarness();
    const storage = recordingStorage(
      createMemorySecureStorage(),
      harness.events,
    );
    const input = confirmedCleanupInput(harness, storage);
    const hold = deferred();
    const oldWork = input.workGate.run("user:1", async () => {
      await hold.promise;
      harness.events.push("owner.work:done");
    });
    const cleanup = clearConfirmedOwner(input);

    await Promise.resolve();
    expect(input.workGate.isStopped("user:1")).toBe(true);
    expect(harness.events).toEqual([]);
    await expect(
      input.workGate.run("user:1", async () => undefined),
    ).rejects.toMatchObject({ code: "owner_work_stopped" });

    hold.resolve();
    await oldWork;
    await cleanup;
    expect(harness.events).toEqual([
      "owner.work:done",
      "db.begin:user:1:123",
      "auth.clear:user:1",
      `secure.delete:${ACCOUNT_SESSION_SECURE_KEY}`,
      "db.complete:user:1",
    ]);
  });

  it("keeps the marker and stays fail-closed after an in-memory failure", async () => {
    const harness = createDatabaseHarness();
    const storage = recordingStorage(
      createMemorySecureStorage(),
      harness.events,
    );
    const input = confirmedCleanupInput(harness, storage);
    input.clearMemoryAuth.mockImplementationOnce(async (owner) => {
      harness.events.push(`auth.clear:${owner}`);
      throw new Error("memory_clear_failed");
    });

    await expect(clearConfirmedOwner(input)).rejects.toThrow(
      "memory_clear_failed",
    );
    expect(harness.events).toEqual([
      "db.begin:user:1:123",
      "auth.clear:user:1",
    ]);
    expect(harness.markers).toEqual(new Set(["user:1"]));
    expect(input.workGate.isStopped("user:1")).toBe(true);
  });

  it("treats write_failed as unknown and never removes the marker", async () => {
    const harness = createDatabaseHarness();
    const baseStorage = createMemorySecureStorage();
    await baseStorage.set(ACCOUNT_SESSION_SECURE_KEY, "secret-envelope");
    const storage: SecureStorage = {
      get: (key) => baseStorage.get(key),
      set: (key, value) => baseStorage.set(key, value),
      async delete(key) {
        harness.events.push(`secure.delete:${key}`);
        await baseStorage.delete(key);
        throw new SecureStorageError("write_failed");
      },
    };
    const input = confirmedCleanupInput(harness, storage);

    await expect(clearConfirmedOwner(input)).rejects.toMatchObject({
      code: "write_failed",
    });
    expect(harness.events).toEqual([
      "db.begin:user:1:123",
      "auth.clear:user:1",
      `secure.delete:${ACCOUNT_SESSION_SECURE_KEY}`,
    ]);
    expect(harness.markers).toEqual(new Set(["user:1"]));
    await expect(
      baseStorage.get(ACCOUNT_SESSION_SECURE_KEY),
    ).resolves.toBeNull();
    expect(input.workGate.isStopped("user:1")).toBe(true);
  });

  it("keeps the marker after complete fails and can retry idempotently", async () => {
    const harness = createDatabaseHarness();
    harness.failCompleteOwner = "user:1";
    const storage = recordingStorage(
      createMemorySecureStorage(),
      harness.events,
    );
    const input = confirmedCleanupInput(harness, storage);

    await expect(clearConfirmedOwner(input)).rejects.toThrow(
      "complete_failed:user:1",
    );
    expect(harness.markers).toEqual(new Set(["user:1"]));
    expect(input.workGate.isStopped("user:1")).toBe(true);

    harness.failCompleteOwner = undefined;
    harness.events.length = 0;
    await expect(clearConfirmedOwner(input)).resolves.toBeUndefined();
    expect(harness.events).toEqual([
      "db.begin:user:1:123",
      "auth.clear:user:1",
      `secure.delete:${ACCOUNT_SESSION_SECURE_KEY}`,
      "db.complete:user:1",
    ]);
    expect(harness.markers.size).toBe(0);
  });

  it("rejects guest cleanup before stopping any owner work", async () => {
    const harness = createDatabaseHarness();
    const storage = recordingStorage(
      createMemorySecureStorage(),
      harness.events,
    );
    const input = confirmedCleanupInput(harness, storage, "guest");

    await expect(clearConfirmedOwner(input)).rejects.toMatchObject({
      code: "guest_clear_forbidden",
    });
    expect(harness.events).toEqual([]);
    expect(input.workGate.isStopped("user:1")).toBe(false);
  });

  it("boots in strict order and reads auth only after all pending owners clear", async () => {
    const harness = createDatabaseHarness(["user:1", "user:2"]);
    const storage = recordingStorage(
      createMemorySecureStorage(),
      harness.events,
    );
    await storage.set(ACCOUNT_SESSION_SECURE_KEY, "old-envelope");
    harness.events.length = 0;

    const result = await restoreOwnerCleanupAtStartup({
      database: harness.database,
      secureStorage: storage,
    });

    expect(result).toEqual({ mode: "ready", sessionEnvelope: null });
    expect(harness.events).toEqual([
      "db.open",
      "db.list",
      `secure.delete:${ACCOUNT_SESSION_SECURE_KEY}`,
      "db.complete:user:1",
      "db.complete:user:2",
      `secure.get:${ACCOUNT_SESSION_SECURE_KEY}`,
    ]);
    expect(harness.markers.size).toBe(0);
  });

  it("does not delete auth when startup has no pending marker", async () => {
    const harness = createDatabaseHarness();
    const storage = recordingStorage(
      createMemorySecureStorage(),
      harness.events,
    );
    await storage.set(ACCOUNT_SESSION_SECURE_KEY, "current-envelope");
    harness.events.length = 0;

    await expect(
      restoreOwnerCleanupAtStartup({
        database: harness.database,
        secureStorage: storage,
      }),
    ).resolves.toEqual({
      mode: "ready",
      sessionEnvelope: "current-envelope",
    });
    expect(harness.events).toEqual([
      "db.open",
      "db.list",
      `secure.get:${ACCOUNT_SESSION_SECURE_KEY}`,
    ]);
  });

  for (const failure of ["open", "list", "delete", "complete"] as const) {
    it(`returns offline_only and performs zero auth reads after ${failure} failure`, async () => {
      const harness = createDatabaseHarness(["user:1"]);
      if (failure === "open") harness.failOpen = new Error("open_failed");
      if (failure === "list") harness.failList = new Error("list_failed");
      if (failure === "complete") harness.failCompleteOwner = "user:1";
      const baseStorage = createMemorySecureStorage();
      await baseStorage.set(ACCOUNT_SESSION_SECURE_KEY, "old-envelope");
      const storage = recordingStorage(baseStorage, harness.events);
      if (failure === "delete") {
        storage.delete = async (key) => {
          harness.events.push(`secure.delete:${key}`);
          throw new SecureStorageError("write_failed");
        };
      }

      const result = await restoreOwnerCleanupAtStartup({
        database: harness.database,
        secureStorage: storage,
      });

      expect(result.mode).toBe("offline_only");
      expect(harness.events).not.toContain(
        `secure.get:${ACCOUNT_SESSION_SECURE_KEY}`,
      );
      if (failure === "delete") {
        expect(harness.events).not.toContain("db.complete:user:1");
      }
    });
  }

  it("resumes a partially completed multi-owner startup on the next call", async () => {
    const harness = createDatabaseHarness(["user:1", "user:2"]);
    harness.failCompleteOwner = "user:2";
    const storage = recordingStorage(
      createMemorySecureStorage(),
      harness.events,
    );

    await expect(
      restoreOwnerCleanupAtStartup({
        database: harness.database,
        secureStorage: storage,
      }),
    ).resolves.toMatchObject({ mode: "offline_only" });
    expect(harness.markers).toEqual(new Set(["user:2"]));

    harness.failCompleteOwner = undefined;
    harness.events.length = 0;
    await expect(
      restoreOwnerCleanupAtStartup({
        database: harness.database,
        secureStorage: storage,
      }),
    ).resolves.toEqual({ mode: "ready", sessionEnvelope: null });
    expect(harness.events).toEqual([
      "db.open",
      "db.list",
      `secure.delete:${ACCOUNT_SESSION_SECURE_KEY}`,
      "db.complete:user:2",
      `secure.get:${ACCOUNT_SESSION_SECURE_KEY}`,
    ]);
  });

  it("fails closed without deleting or reading auth for a guest marker", async () => {
    const harness = createDatabaseHarness(["guest"]);
    const storage = recordingStorage(
      createMemorySecureStorage(),
      harness.events,
    );

    await expect(
      restoreOwnerCleanupAtStartup({
        database: harness.database,
        secureStorage: storage,
      }),
    ).resolves.toMatchObject({ mode: "offline_only" });
    expect(harness.events).toEqual(["db.open", "db.list"]);
  });

  it("drains held persistence and outbox work before clearing all five stores", async () => {
    const factory = new IDBFactory();
    const ownerKey = "user:31" as const;
    const database = new AppDatabase({
      factory,
      keyRange: IDBKeyRange,
      name: "owner-cleanup-held-work",
    });
    await seedOwnerAcrossStores(database, ownerKey, "held");
    const active = await database.getSave(ownerKey, "board_3x3_pow2_no_undo");
    if (active.status !== "ok") throw new Error("held save missing");
    const lateSave = structuredClone(active.save);
    lateSave.revision += 1;
    lateSave.lastClosedAt = 600;
    lateSave.snapshot.savedAtMs = 600;
    const lateOutbox: StoredOutboxItem = {
      schemaVersion: APP_DATABASE_SCHEMA_VERSION,
      operationId: "late-abandon",
      ownerKey,
      kind: "ranked.abandon",
      clientRecordId: null,
      payload: { challengeId: "held-challenge" },
      attemptCount: 0,
      nextAttemptAt: 0,
      lastErrorCode: null,
      createdAt: 600,
      updatedAt: 600,
    };
    const persistenceHold = deferred();
    const outboxHold = deferred();
    const workGate = new OwnerCleanupWorkGate();
    const persistenceWork = workGate.run(ownerKey, async () => {
      await persistenceHold.promise;
      await database.putSave(lateSave);
    });
    const outboxWork = workGate.run(ownerKey, async () => {
      await outboxHold.promise;
      await database.enqueueOutbox(lateOutbox);
    });
    const secureStorage = createMemorySecureStorage();
    await secureStorage.set(ACCOUNT_SESSION_SECURE_KEY, "held-envelope");
    let cleanupSettled = false;
    const cleanup = clearConfirmedOwner({
      ownerKey,
      createdAt: 700,
      database,
      secureStorage,
      workGate,
      clearMemoryAuth: vi.fn(),
    });
    void cleanup.then(
      () => {
        cleanupSettled = true;
      },
      () => {
        cleanupSettled = true;
      },
    );

    await Promise.resolve();
    await Promise.resolve();
    expect(workGate.isStopped(ownerKey)).toBe(true);
    expect(cleanupSettled).toBe(false);
    expect(await database.listPendingOwnerClears()).toEqual([]);
    let lateWorkStarted = false;
    await expect(
      workGate.run(ownerKey, async () => {
        lateWorkStarted = true;
        await database.putSave(lateSave);
      }),
    ).rejects.toMatchObject({ code: "owner_work_stopped" });
    expect(lateWorkStarted).toBe(false);

    persistenceHold.resolve();
    outboxHold.resolve();
    await Promise.all([persistenceWork, outboxWork]);
    await cleanup;

    expect(cleanupSettled).toBe(true);
    expect(workGate.isStopped(ownerKey)).toBe(true);
    expect(await database.listPendingOwnerClears()).toEqual([]);
    expect(await database.listSaves(ownerKey)).toEqual([]);
    expect(await database.listRecords(ownerKey)).toEqual([]);
    expect(await database.listOutbox(ownerKey)).toEqual([]);
    expect(await database.getCache("held-history", ownerKey, 800)).toBeNull();
    expect(await database.listDiagnostics(ownerKey)).toEqual([]);
    await expect(
      workGate.run(ownerKey, () => database.enqueueOutbox(lateOutbox)),
    ).rejects.toMatchObject({ code: "owner_work_stopped" });
    expect(await database.listOutbox(ownerKey)).toEqual([]);
  });

  it("recovers a real five-store cleanup after Keystore deletion and an IDB fault", async () => {
    const factory = new IDBFactory();
    const name = "owner-cleanup-integration";
    const oldOwner = "user:41" as const;
    const otherOwner = "user:42" as const;
    let injectFault = true;
    const database = new AppDatabase({
      factory,
      keyRange: IDBKeyRange,
      name,
      faultInjector(point) {
        if (injectFault && point === "clear.after_records") {
          throw new Error("clear.after_records");
        }
      },
    });
    await seedOwnerAcrossStores(database, oldOwner, "old");
    await seedOwnerAcrossStores(database, otherOwner, "other");
    await seedOwnerAcrossStores(database, "guest", "guest");
    const secureStorage = createMemorySecureStorage();
    await secureStorage.set(ACCOUNT_SESSION_SECURE_KEY, "old-envelope");

    await expect(
      clearConfirmedOwner({
        ownerKey: oldOwner,
        createdAt: 20,
        database,
        secureStorage,
        workGate: new OwnerCleanupWorkGate(),
        clearMemoryAuth: vi.fn(),
      }),
    ).rejects.toThrow("clear.after_records");
    expect(await database.listPendingOwnerClears()).toEqual([oldOwner]);
    await expect(
      database.getSave(oldOwner, "standard_4x4_pow2_no_undo"),
    ).rejects.toMatchObject({ code: "owner_clearing" });
    await expect(
      secureStorage.get(ACCOUNT_SESSION_SECURE_KEY),
    ).resolves.toBeNull();

    injectFault = false;
    const recovery = new AppDatabase({
      factory,
      keyRange: IDBKeyRange,
      name,
    });
    await expect(
      restoreOwnerCleanupAtStartup({ database: recovery, secureStorage }),
    ).resolves.toEqual({ mode: "ready", sessionEnvelope: null });
    expect(await recovery.listPendingOwnerClears()).toEqual([]);
    expect(await recovery.listSaves(oldOwner)).toEqual([]);
    expect(await recovery.listRecords(oldOwner)).toEqual([]);
    expect(await recovery.listOutbox(oldOwner)).toEqual([]);
    expect(await recovery.getCache("old-history", oldOwner, 600)).toBeNull();
    expect(await recovery.listDiagnostics(oldOwner)).toEqual([]);

    expect(await recovery.listSaves(otherOwner)).toHaveLength(1);
    expect(await recovery.listRecords(otherOwner)).toHaveLength(1);
    expect(await recovery.listOutbox(otherOwner)).toHaveLength(1);
    expect(
      await recovery.getCache("other-history", otherOwner, 600),
    ).not.toBeNull();
    expect(await recovery.listDiagnostics(otherOwner)).toHaveLength(1);

    expect(await recovery.listSaves("guest")).toHaveLength(1);
    expect(await recovery.listRecords("guest")).toHaveLength(1);
    expect(await recovery.listOutbox("guest")).toEqual([]);
    expect(
      await recovery.getCache("guest-history", "guest", 600),
    ).not.toBeNull();
    expect(await recovery.listDiagnostics("guest")).toHaveLength(1);
  });
});
