import { IDBFactory, IDBKeyRange } from "fake-indexeddb";
import { describe, expect, it } from "vitest";

import {
  APP_DATABASE_SCHEMA_VERSION,
  AppDatabase,
  type AppOwnerKey,
  type StoredGameSave,
} from "../../mobile/src/data/app-database";
import {
  bootstrapGuestAppRuntime,
  createHttpRankedSessionGateway,
  type AuthenticatedModeRuntimeDatabase,
} from "../../mobile/src/app/app-runtime";
import {
  serializeAccountSessionEnvelope,
  type AccountSessionV1,
} from "../../mobile/src/auth/account-session";
import { ACCOUNT_SESSION_SECURE_KEY } from "../../mobile/src/data/owner-cleanup";
import { OwnerCleanupWorkGate } from "../../mobile/src/data/owner-cleanup";
import { GUEST_STANDARD_MODE_KEY } from "../../mobile/src/game/guest-session";
import {
  createMemorySecureStorage,
  SecureStorageError,
  type SecureStorage,
} from "../../mobile/src/platform/secure-storage";
import { createEngineSession } from "../../src/core/engine";

let databaseSequence = 0;

function createDatabase(label: string): AppDatabase {
  databaseSequence += 1;
  return new AppDatabase({
    name: `app-runtime-${label}-${databaseSequence}`,
    factory: new IDBFactory(),
    keyRange: IDBKeyRange,
  });
}

function createTime(wallAt = 1_000, performanceAt = 0) {
  let wall = wallAt;
  let monotonic = performanceAt;
  return {
    sources: {
      wallNow: () => wall,
      performanceNow: () => monotonic,
    },
    advance(ms: number) {
      wall += ms;
      monotonic += ms;
    },
  };
}

async function seedSave(
  database: AppDatabase,
  ownerKey: AppOwnerKey,
  options: {
    board?: number[][];
    clientRecordId?: string;
    modeKey?: "standard_4x4_pow2_no_undo" | "board_3x3_pow2_no_undo";
  } = {},
): Promise<StoredGameSave> {
  const modeKey = options.modeKey ?? GUEST_STANDARD_MODE_KEY;
  const engine = createEngineSession({ modeKey, seed: 99 });
  engine.init(options.board ? { board: options.board } : undefined);
  return database.startNewGame({
    schemaVersion: APP_DATABASE_SCHEMA_VERSION,
    ownerKey,
    modeKey,
    clientRecordId:
      options.clientRecordId ?? `${ownerKey.replace(":", "-")}-game`,
    lifecycle: "active",
    gameKind: "normal",
    revision: 0,
    lastClosedAt: 1_000,
    rankedSessionId: null,
    snapshot: engine.exportState(1_000),
  });
}

function runtimeDatabase(
  database: AppDatabase,
  overrides: Partial<AuthenticatedModeRuntimeDatabase> = {},
): AuthenticatedModeRuntimeDatabase {
  return {
    name: database.name,
    open: database.open.bind(database),
    listPendingOwnerClears: database.listPendingOwnerClears.bind(database),
    completeOwnerClear: database.completeOwnerClear.bind(database),
    getSave: database.getSave.bind(database),
    startNewGame: database.startNewGame.bind(database),
    putSave: database.putSave.bind(database),
    deleteSave: database.deleteSave.bind(database),
    finalizeTerminal: database.finalizeTerminal.bind(database),
    getRecord: database.getRecord.bind(database),
    listRecords: database.listRecords.bind(database),
    deleteGuestRecord: database.deleteGuestRecord.bind(database),
    addDiagnostic: database.addDiagnostic.bind(database),
    enqueueOutbox: database.enqueueOutbox.bind(database),
    freezeRankedStartIntent: database.freezeRankedStartIntent.bind(database),
    getOrCreateRankedStartIntent:
      database.getOrCreateRankedStartIntent.bind(database),
    listOutbox: database.listOutbox.bind(database),
    removeOutbox: database.removeOutbox.bind(database),
    ...overrides,
  };
}

function accountSession(userId = 7): AccountSessionV1 {
  return {
    version: 1,
    accessToken: `access-token-${userId}`,
    expiresAtEpochSeconds: 2_000_000_000,
    user: {
      id: userId,
      email: `player-${userId}@example.com`,
      nickname: `Player ${userId}`,
      role: "player",
    },
    persistentIdentity: { userId, establishedAtMs: 500 },
    challengeRefs: [],
  };
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
      return storage.set(key, value);
    },
    async delete(key) {
      events.push(`secure.delete:${key}`);
      return storage.delete(key);
    },
  };
}

describe("mobile guest app runtime", () => {
  it("finishes pending owner cleanup before reading guest summaries or the auth envelope", async () => {
    const database = createDatabase("startup-order");
    await seedSave(database, "guest", { clientRecordId: "guest-kept" });
    await seedSave(database, "user:7", { clientRecordId: "old-cleared" });
    await database.beginOwnerClear("user:7", 900);
    const memoryStorage = createMemorySecureStorage();
    await memoryStorage.set(ACCOUNT_SESSION_SECURE_KEY, "opaque-account");
    const events: string[] = [];
    const storage = recordingStorage(memoryStorage, events);
    const port = runtimeDatabase(database, {
      async open() {
        events.push("db.open");
        await database.open();
      },
      async listPendingOwnerClears() {
        events.push("db.list-clears");
        return database.listPendingOwnerClears();
      },
      async completeOwnerClear(ownerKey) {
        events.push(`db.complete:${ownerKey}`);
        await database.completeOwnerClear(ownerKey);
      },
      async getSave(ownerKey, modeKey) {
        events.push(`db.get-save:${ownerKey}:${modeKey}`);
        return database.getSave(ownerKey, modeKey);
      },
      async listRecords(ownerKey) {
        events.push(`db.list-records:${ownerKey}`);
        return database.listRecords(ownerKey);
      },
    });

    const runtime = await bootstrapGuestAppRuntime({
      database: port,
      secureStorage: storage,
    });

    expect(runtime.startupMode).toBe("ready");
    expect(runtime.sessionEnvelope).toBeNull();
    expect(runtime.guestSave).toMatchObject({
      status: "ok",
      save: { clientRecordId: "guest-kept" },
    });
    expect(events).toEqual([
      "db.open",
      "db.list-clears",
      `secure.delete:${ACCOUNT_SESSION_SECURE_KEY}`,
      "db.complete:user:7",
      `secure.get:${ACCOUNT_SESSION_SECURE_KEY}`,
      `db.get-save:guest:${GUEST_STANDARD_MODE_KEY}`,
      "db.list-records:guest",
    ]);
    await expect(database.listPendingOwnerClears()).resolves.toEqual([]);
    await expect(
      database.getSave("user:7", GUEST_STANDARD_MODE_KEY),
    ).resolves.toEqual({ status: "missing" });
  });

  it("continues in guest-only mode when secure storage is unavailable but IndexedDB works", async () => {
    const database = createDatabase("offline-only");
    await seedSave(database, "guest", { clientRecordId: "guest-offline" });
    let secureGets = 0;
    const secureStorage: SecureStorage = {
      async get() {
        secureGets += 1;
        throw new SecureStorageError("secure_storage_unavailable");
      },
      async set() {
        throw new Error("not used");
      },
      async delete() {},
    };

    const runtime = await bootstrapGuestAppRuntime({
      database,
      secureStorage,
      createClientRecordId: () => "unused",
      createSeed: () => 1,
    });

    expect(runtime.startupMode).toBe("offline_only");
    expect(runtime.sessionEnvelope).toBeNull();
    expect(runtime.guestSave.status).toBe("ok");
    expect(secureGets).toBe(1);
    await expect(runtime.enterGuestStandard()).resolves.toMatchObject({
      status: "ready",
      restored: true,
    });
  });

  it("keeps the active session fenced when pause or back flush fails", async () => {
    const database = createDatabase("fail-closed");
    await seedSave(database, "guest", { clientRecordId: "guest-active" });
    let failWrites = 2;
    const port = runtimeDatabase(database, {
      async putSave(save) {
        if (failWrites > 0) {
          failWrites -= 1;
          throw new Error("idb_write_failed");
        }
        return database.putSave(save);
      },
    });
    const runtime = await bootstrapGuestAppRuntime({
      database: port,
      secureStorage: createMemorySecureStorage(),
    });
    const opened = await runtime.enterGuestStandard();
    expect(opened.status).toBe("ready");
    if (opened.status !== "ready") return;

    await expect(runtime.pauseActiveSession()).rejects.toThrow(
      "idb_write_failed",
    );
    expect(runtime.activeSession).toBe(opened.session);
    expect(opened.session.inputFences).toEqual(
      new Set(["background", "storage_error"]),
    );
    runtime.resumeActiveSession();
    expect(opened.session.inputFences).toEqual(new Set(["storage_error"]));

    await expect(runtime.leaveActiveSession()).rejects.toThrow(
      "idb_write_failed",
    );
    expect(runtime.activeSession).toBe(opened.session);
    expect(opened.session.inputFences).toContain("closing");
    await expect(runtime.leaveActiveSession()).resolves.toBeUndefined();
    expect(runtime.activeSession).toBeNull();
  });

  it("completes leave after the save flush even when the summary refresh fails", async () => {
    const database = createDatabase("leave-summary-failure");
    await seedSave(database, "guest", {
      clientRecordId: "guest-leave-summary",
    });
    let listRecordCalls = 0;
    const runtime = await bootstrapGuestAppRuntime({
      database: runtimeDatabase(database, {
        async listRecords(ownerKey) {
          listRecordCalls += 1;
          if (listRecordCalls === 2) {
            throw new Error("leave_summary_failed");
          }
          return database.listRecords(ownerKey);
        },
      }),
      secureStorage: createMemorySecureStorage(),
    });
    const opened = await runtime.enterGuestStandard();
    expect(opened.status).toBe("ready");

    await expect(runtime.leaveActiveSession()).resolves.toBeUndefined();

    expect(runtime.activeSession).toBeNull();
    expect(runtime.guestSave).toMatchObject({
      status: "ok",
      save: { clientRecordId: "guest-leave-summary" },
    });
    expect(runtime.lastSummaryError).toMatchObject({
      message: "leave_summary_failed",
    });
  });

  it("reconciles terminal retries and permanent deletion result-unknown", async () => {
    const database = createDatabase("history-delete");
    await seedSave(database, "guest", {
      clientRecordId: "guest-terminal",
      board: [
        [2, 2, 8, 16],
        [32, 64, 128, 256],
        [64, 128, 256, 512],
        [128, 256, 512, 1024],
      ],
    });
    const time = createTime();
    let failSummary = false;
    let deleteCalls = 0;
    const runtime = await bootstrapGuestAppRuntime({
      database: runtimeDatabase(database, {
        async listRecords(ownerKey) {
          if (failSummary) throw new Error("delete_summary_failed");
          return database.listRecords(ownerKey);
        },
        async deleteGuestRecord(clientRecordId) {
          deleteCalls += 1;
          if (deleteCalls === 1) throw new Error("delete_before_commit");
          const deleted = await database.deleteGuestRecord(clientRecordId);
          if (deleteCalls === 2) throw new Error("delete_result_unknown");
          return deleted;
        },
      }),
      secureStorage: createMemorySecureStorage(),
      clockSources: time.sources,
    });
    const opened = await runtime.enterGuestStandard();
    expect(opened.status).toBe("ready");
    if (opened.status !== "ready") return;

    time.advance(50);
    const move = runtime.moveActiveSession(3);
    const record = await move.terminal;
    expect(record?.clientRecordId).toBe("guest-terminal");
    expect(runtime.guestSave).toEqual({ status: "missing" });
    expect(runtime.guestRecords).toEqual([record]);
    await runtime.refreshGuestSummary();
    expect(runtime.guestRecords).toEqual([record]);
    await expect(runtime.getGuestRecord("guest-terminal")).resolves.toEqual(
      record,
    );

    await expect(runtime.deleteGuestRecord("guest-terminal")).rejects.toThrow(
      "delete_before_commit",
    );
    expect(runtime.guestRecords).toEqual([record]);
    await expect(runtime.getGuestRecord("guest-terminal")).resolves.toEqual(
      record,
    );

    failSummary = true;
    await expect(runtime.deleteGuestRecord("guest-terminal")).resolves.toBe(
      true,
    );
    expect(runtime.guestRecords).toEqual([]);
    expect(runtime.lastSummaryError).toMatchObject({
      message: "delete_summary_failed",
    });
    await expect(runtime.getGuestRecord("guest-terminal")).resolves.toBeNull();
  });

  it("closes a finalized active session without touching its closed save head", async () => {
    const database = createDatabase("terminal-leave");
    await seedSave(database, "guest", {
      clientRecordId: "guest-terminal-leave",
      board: [
        [2, 2, 8, 16],
        [32, 64, 128, 256],
        [64, 128, 256, 512],
        [128, 256, 512, 1024],
      ],
    });
    let deleteCalls = 0;
    const runtime = await bootstrapGuestAppRuntime({
      database: runtimeDatabase(database, {
        async deleteSave(input) {
          deleteCalls += 1;
          return database.deleteSave(input);
        },
      }),
      secureStorage: createMemorySecureStorage(),
    });
    const opened = await runtime.enterGuestStandard();
    expect(opened.status).toBe("ready");
    if (opened.status !== "ready") return;

    await runtime.moveActiveSession(3).terminal;
    await runtime.leaveActiveSession();

    expect(deleteCalls).toBe(0);
    expect(runtime.activeSession).toBeNull();
    expect(runtime.guestSave).toEqual({ status: "missing" });
    expect(runtime.guestRecords).toHaveLength(1);
  });

  it("keeps an unknown account envelope untouched, records a local diagnostic, and still starts guest play", async () => {
    const database = createDatabase("invalid-account-envelope");
    const storage = createMemorySecureStorage();
    const serialized = JSON.stringify({ version: 2, opaque: "keep-me" });
    await storage.set(ACCOUNT_SESSION_SECURE_KEY, serialized);

    const runtime = await bootstrapGuestAppRuntime({
      database,
      secureStorage: storage,
      createClientRecordId: () => "guest-after-invalid-envelope",
      createSeed: () => 7,
    });

    expect(runtime.startupMode).toBe("ready");
    expect(runtime.accountSession).toBeNull();
    expect(runtime.accountSessionError).toMatchObject({
      code: "invalid_account_session_envelope",
    });
    await expect(storage.get(ACCOUNT_SESSION_SECURE_KEY)).resolves.toBe(
      serialized,
    );
    await expect(database.listDiagnostics("guest")).resolves.toEqual([
      expect.objectContaining({
        category: "account_session",
        uploadPolicy: "never",
        payload: expect.objectContaining({
          errorType: "invalid_account_session_envelope",
        }),
      }),
    ]);
    await expect(runtime.enterGuestStandard()).resolves.toMatchObject({
      status: "ready",
      restored: false,
    });
  });

  it("restores an account-owned mode offline without exposing it as guest history", async () => {
    const database = createDatabase("account-offline-restore");
    const session = accountSession();
    const storage = createMemorySecureStorage();
    await storage.set(
      ACCOUNT_SESSION_SECURE_KEY,
      serializeAccountSessionEnvelope(session),
    );
    await seedSave(database, "user:7", {
      clientRecordId: "account-3x3-save",
      modeKey: "board_3x3_pow2_no_undo",
    });
    const runtime = await bootstrapGuestAppRuntime({
      database,
      secureStorage: storage,
    });

    const opened = await runtime.enterAuthenticatedMode(
      "board_3x3_pow2_no_undo",
      session,
      { online: false },
    );

    expect(opened).toMatchObject({
      status: "ready",
      restored: true,
      gameKind: "normal",
    });
    expect(runtime.activeSession?.currentSave).toMatchObject({
      ownerKey: "user:7",
      modeKey: "board_3x3_pow2_no_undo",
      clientRecordId: "account-3x3-save",
    });
    expect(runtime.guestSave).toEqual({ status: "missing" });
    expect(runtime.guestRecords).toEqual([]);
  });

  it("uses the real HTTP ranked gateway before exposing a new account board", async () => {
    const database = createDatabase("account-ranked-entry");
    const session = accountSession();
    const storage = createMemorySecureStorage();
    await storage.set(
      ACCOUNT_SESSION_SECURE_KEY,
      serializeAccountSessionEnvelope(session),
    );
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const challengeId = "rch_11111111111111111111111111111111";
    const gateway = createHttpRankedSessionGateway({
      apiBase: "https://api.example.test/api",
      fetchLike: async (url, init) => {
        requests.push({ url, init });
        if (url.endsWith("/ranked-session/abandon")) {
          return {
            status: 200,
            statusText: "OK",
            json: async () => ({
              success: true,
              data: { status: "abandoned" },
            }),
          };
        }
        const request = JSON.parse(String(init?.body)) as {
          operation_id: string;
          mode_key: string;
        };
        return {
          status: 200,
          statusText: "OK",
          json: async () => ({
            success: true,
            data: {
              ranked_session_id: challengeId,
              challenge_id: challengeId,
              operation_id: request.operation_id,
              mode_key: request.mode_key,
              seed: 123,
              ranked_session_token: "ranked-token-1",
              issued_at: 1_700_000_000,
              started_at: 1_700_000_000,
              started_at_ms: 1_700_000_000_000,
              server_now_ms: 1_700_000_000_100,
              expired_at: 2_000_000_000,
              expires_at: 2_000_000_000,
              exp: 2_000_000_000,
              status: "started",
            },
          }),
        };
      },
    });
    const time = createTime(1_700_000_000_100, 20);
    const runtime = await bootstrapGuestAppRuntime({
      database,
      secureStorage: storage,
      clockSources: time.sources,
      createClientRecordId: () => "account-ranked-game",
    });

    const opened = await runtime.enterAuthenticatedMode(
      GUEST_STANDARD_MODE_KEY,
      session,
      { online: true, gateway },
    );

    expect(opened).toMatchObject({
      status: "ready",
      restored: false,
      gameKind: "ranked",
    });
    expect(runtime.activeSession?.currentSave).toMatchObject({
      ownerKey: "user:7",
      gameKind: "ranked",
      rankedSessionId: challengeId,
    });
    await gateway.abandon({
      accessToken: session.accessToken,
      operationId: `ranked.abandon:${challengeId}`,
      challengeId,
      rankedSessionId: challengeId,
      rankedSessionToken: "ranked-token-1",
    });
    expect(requests).toHaveLength(2);
    expect(requests[0]?.url).toBe(
      "https://api.example.test/api/ranked-session/start",
    );
    expect(new Headers(requests[0]?.init?.headers).get("authorization")).toBe(
      `Bearer ${session.accessToken}`,
    );
    expect(
      JSON.parse(String(requests[0]?.init?.body)),
    ).toMatchObject({
      mode_key: GUEST_STANDARD_MODE_KEY,
      operation_id: expect.stringMatching(/^ranked\.start:/u),
    });
    expect(requests[1]?.url).toBe(
      "https://api.example.test/api/ranked-session/abandon",
    );
    expect(JSON.parse(String(requests[1]?.init?.body))).toEqual({
      operation_id: `ranked.abandon:${challengeId}`,
      challenge_id: challengeId,
      ranked_session_id: challengeId,
      ranked_session_token: "ranked-token-1",
    });
    await expect(database.listOutbox("user:7")).resolves.toEqual([]);
    const storedSession = JSON.parse(
      String(await storage.get(ACCOUNT_SESSION_SECURE_KEY)),
    ) as AccountSessionV1;
    expect(storedSession.challengeRefs).toEqual([
      expect.objectContaining({
        challengeId,
        rankedSessionId: challengeId,
        token: "ranked-token-1",
      }),
    ]);
  });

  it("falls back to a normal account game after a bounded ranked start failure", async () => {
    const database = createDatabase("account-ranked-fallback");
    const session = accountSession();
    const storage = createMemorySecureStorage();
    await storage.set(
      ACCOUNT_SESSION_SECURE_KEY,
      serializeAccountSessionEnvelope(session),
    );
    const runtime = await bootstrapGuestAppRuntime({
      database,
      secureStorage: storage,
      createClientRecordId: () => "account-normal-fallback",
      createSeed: () => 9,
    });

    const opened = await runtime.enterAuthenticatedMode(
      "classic_4x4_pow2_undo",
      session,
      {
        online: true,
        gateway: {
          start: async () => {
            throw new Error("offline");
          },
          abandon: async () => undefined,
        },
        requestTimeoutMs: 20,
      },
    );

    expect(opened).toMatchObject({
      status: "ready",
      restored: false,
      gameKind: "normal",
    });
    expect(runtime.activeSession?.currentSave).toMatchObject({
      ownerKey: "user:7",
      modeKey: "classic_4x4_pow2_undo",
      gameKind: "normal",
    });
    expect(
      (await database.listOutbox("user:7")).map((item) => item.kind),
    ).toEqual(["ranked.session_start"]);
  });

  it("routes account save work through the owner cleanup gate", async () => {
    const database = createDatabase("account-work-gate");
    const session = accountSession();
    const storage = createMemorySecureStorage();
    const workGate = new OwnerCleanupWorkGate();
    await storage.set(
      ACCOUNT_SESSION_SECURE_KEY,
      serializeAccountSessionEnvelope(session),
    );
    await seedSave(database, "user:7", {
      clientRecordId: "account-gated-save",
      board: [
        [2, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ],
    });
    const runtime = await bootstrapGuestAppRuntime({
      database,
      secureStorage: storage,
      workGate,
    });
    await runtime.enterAuthenticatedMode(GUEST_STANDARD_MODE_KEY, session, {
      online: false,
    });
    await workGate.stopAndDrain("user:7");

    const move = runtime.moveActiveSession(1);

    await expect(move.save).rejects.toMatchObject({
      code: "owner_work_stopped",
    });
  });
});
