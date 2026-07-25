import { IDBFactory, IDBKeyRange } from "fake-indexeddb";
import { describe, expect, it, vi } from "vitest";

import {
  loadAccountSession,
  saveAccountSession,
  type AccountSessionV1,
} from "../../mobile/src/auth/account-session";
import {
  APP_DATABASE_SCHEMA_VERSION,
  AppDatabase,
  type AppOwnerKey,
  type StoredOutboxItem,
  type StoredGameSave,
} from "../../mobile/src/data/app-database";
import { OwnerCleanupWorkGate } from "../../mobile/src/data/owner-cleanup";
import {
  openLocalSession,
  type LocalSessionOptions,
} from "../../mobile/src/game/guest-session";
import {
  RankedSessionOrchestrationError,
  RankedSessionOrchestrator,
  type RankedSessionGateway,
} from "../../mobile/src/game/ranked-session-orchestrator";
import { createMemorySecureStorage } from "../../mobile/src/platform/secure-storage";
import type { AppModeKey } from "../../src/contracts";
import { createEngineSession } from "../../src/core/engine";

let sequence = 0;

function createDatabase(label: string) {
  sequence += 1;
  const factory = new IDBFactory();
  const name = `local-session-${label}-${sequence}`;
  return {
    database: new AppDatabase({ name, factory, keyRange: IDBKeyRange }),
    reopen: () => new AppDatabase({ name, factory, keyRange: IDBKeyRange }),
  };
}

function normalOptions(
  database: AppDatabase,
  ownerKey: AppOwnerKey,
  modeKey: AppModeKey,
  clientRecordId: string,
): LocalSessionOptions {
  return {
    database,
    ownerKey,
    modeKey,
    gameKind: "normal",
    rankedSessionId: null,
    challengeId: null,
    startedAtMs: null,
    serverNowMs: null,
    serverNowReceivedAtMonotonicMs: null,
    terminalPolicy:
      modeKey === "classic_4x4_pow2_undo" ? "pending_undo" : "immediate",
    createClientRecordId: () => clientRecordId,
    createSeed: () => 2_048,
  };
}

async function seedSave(
  database: AppDatabase,
  input: {
    ownerKey: AppOwnerKey;
    modeKey: AppModeKey;
    clientRecordId: string;
    board?: number[][];
    steps?: number;
  },
): Promise<StoredGameSave> {
  const engine = createEngineSession({ modeKey: input.modeKey, seed: 77 });
  engine.init({
    ...(input.board ? { board: input.board } : {}),
    ...(input.steps === undefined ? {} : { steps: input.steps }),
  });
  return database.startNewGame({
    schemaVersion: APP_DATABASE_SCHEMA_VERSION,
    ownerKey: input.ownerKey,
    modeKey: input.modeKey,
    clientRecordId: input.clientRecordId,
    lifecycle: "active",
    gameKind: "normal",
    revision: 0,
    lastClosedAt: 1_000,
    rankedSessionId: null,
    snapshot: engine.exportState(1_000),
  });
}

const rankedOwner = "user:71" as const;

function accountSession(
  challengeRefs: AccountSessionV1["challengeRefs"] = [],
): AccountSessionV1 {
  return {
    version: 1,
    accessToken: "account-token-71",
    expiresAtEpochSeconds: 2_000_000_000,
    user: {
      id: 71,
      email: "ranked@example.com",
      nickname: "RankedPlayer",
      role: "player",
    },
    persistentIdentity: { userId: 71, establishedAtMs: 1_000 },
    challengeRefs,
  };
}

function rankedStartBody(
  operationId: string,
  modeKey: AppModeKey,
  sequenceNumber: number,
) {
  const hex = sequenceNumber.toString(16).padStart(32, "0");
  const challengeId = `rch_${hex}`;
  const issuedAt = 100 + sequenceNumber;
  const startedAtMs = issuedAt * 1_000 + 250;
  const expiredAt = issuedAt + 600;
  return {
    success: true,
    data: {
      ranked_session_id: challengeId,
      internal_id: `internal-${sequenceNumber}`,
      operation_id: operationId,
      mode_key: modeKey,
      mode_bucket: modeKey,
      challenge_id: challengeId,
      seed: sequenceNumber,
      ranked_session_token: `ranked-token-${sequenceNumber}`,
      issued_at: issuedAt,
      started_at: Math.floor(startedAtMs / 1_000),
      started_at_ms: startedAtMs,
      server_now_ms: startedAtMs + 50,
      expired_at: expiredAt,
      expires_at: expiredAt,
      exp: expiredAt,
      status: "started",
    },
  };
}

function rankedStartIntent(
  operationId: string,
  modeKey: AppModeKey,
): StoredOutboxItem {
  return {
    schemaVersion: APP_DATABASE_SCHEMA_VERSION,
    operationId,
    ownerKey: rankedOwner,
    kind: "ranked.session_start",
    clientRecordId: null,
    payload: { modeKey },
    attemptCount: 0,
    nextAttemptAt: 2_000,
    lastErrorCode: null,
    createdAt: 2_000,
    updatedAt: 2_000,
  };
}

function rankedStartFingerprint(body: ReturnType<typeof rankedStartBody>) {
  return {
    rankedSessionId: body.data.ranked_session_id,
    challengeId: body.data.challenge_id,
    seed: body.data.seed,
    startedAtMs: body.data.started_at_ms,
    expiresAtEpochSeconds: body.data.expired_at,
  };
}

function rankedAbandonIntent(challengeId: string): StoredOutboxItem {
  return {
    schemaVersion: APP_DATABASE_SCHEMA_VERSION,
    operationId: `ranked.abandon:${challengeId}`,
    ownerKey: rankedOwner,
    kind: "ranked.abandon",
    clientRecordId: null,
    payload: { challengeId },
    attemptCount: 0,
    nextAttemptAt: 2_000,
    lastErrorCode: null,
    createdAt: 2_000,
    updatedAt: 2_000,
  };
}

describe("mobile local multi-mode session", () => {
  it("rejects guest-only mode escapes and ranked sessions without a frozen seed", async () => {
    const { database } = createDatabase("invalid-entitlement");
    await expect(
      openLocalSession(
        normalOptions(
          database,
          "guest",
          "board_3x3_pow2_no_undo",
          "guest-three-by-three",
        ),
      ),
    ).rejects.toThrow("local_session_guest_mode_forbidden");
    await expect(
      openLocalSession({
        database,
        ownerKey: "user:9",
        modeKey: "standard_4x4_pow2_no_undo",
        gameKind: "ranked",
        rankedSessionId: "ranked-session-9",
        challengeId: "challenge-9",
        startedAtMs: 500,
        serverNowMs: 600,
        serverNowReceivedAtMonotonicMs: 0,
        terminalPolicy: "immediate",
        clockSources: { wallNow: () => 1_000, performanceNow: () => 0 },
      }),
    ).rejects.toThrow("local_session_invalid_refs");
  });

  it("persists and restores a normal 3x3 game independently", async () => {
    const { database } = createDatabase("three-by-three");
    const ownerKey = "user:31" as const;
    const options = normalOptions(
      database,
      ownerKey,
      "board_3x3_pow2_no_undo",
      "three-by-three-game",
    );
    const opened = await openLocalSession(options);
    expect(opened.status).toBe("ready");
    if (opened.status !== "ready") return;
    expect(opened.restored).toBe(false);
    expect(opened.session.state.board).toHaveLength(3);

    const directions = [0, 1, 2, 3] as const;
    let move: ReturnType<typeof opened.session.move> | undefined;
    for (const direction of directions) {
      const result = opened.session.move(direction);
      if (result.transition.moved) {
        move = result;
        break;
      }
    }
    expect(move?.transition.moved).toBe(true);
    await move?.save;
    const expected = opened.session.state;

    const restored = await openLocalSession({
      ...options,
      createClientRecordId: () => "must-not-be-used",
    });
    expect(restored.status).toBe("ready");
    if (restored.status !== "ready") return;
    expect(restored.restored).toBe(true);
    expect(restored.session.state).toEqual(expected);
  });

  it("restores classic pending terminal after process death, undoes, and finalizes once without touching sibling saves", async () => {
    const { database, reopen } = createDatabase("classic-pending");
    const ownerKey = "user:41" as const;
    await seedSave(database, {
      ownerKey,
      modeKey: "standard_4x4_pow2_no_undo",
      clientRecordId: "standard-sibling",
    });
    await seedSave(database, {
      ownerKey,
      modeKey: "board_3x3_pow2_no_undo",
      clientRecordId: "three-sibling",
    });
    await seedSave(database, {
      ownerKey,
      modeKey: "classic_4x4_pow2_undo",
      clientRecordId: "classic-terminal",
      steps: 7,
      board: [
        [2, 2, 8, 16],
        [32, 64, 128, 256],
        [64, 128, 256, 512],
        [128, 256, 512, 1024],
      ],
    });
    const standardBefore = await database.getSave(
      ownerKey,
      "standard_4x4_pow2_no_undo",
    );
    const threeBefore = await database.getSave(
      ownerKey,
      "board_3x3_pow2_no_undo",
    );
    const options = normalOptions(
      database,
      ownerKey,
      "classic_4x4_pow2_undo",
      "must-not-be-used",
    );
    const opened = await openLocalSession(options);
    expect(opened.status).toBe("ready");
    if (opened.status !== "ready") return;

    const terminal = opened.session.move(3);
    expect(terminal.transition.gameOver).toBe(true);
    expect(terminal.terminal).toBeNull();
    await terminal.save;
    expect(opened.session.pendingTerminal).toBe(true);
    expect(await database.listRecords(ownerKey)).toEqual([]);

    await database.close();
    const restoredDatabase = reopen();
    const restored = await openLocalSession({
      ...options,
      database: restoredDatabase,
    });
    expect(restored.status).toBe("ready");
    if (restored.status !== "ready") return;
    expect(restored.session.pendingTerminal).toBe(true);
    expect(restored.session.currentSave.lifecycle).toBe("pending_terminal");

    const undone = await restored.session.undoPendingTerminal();
    expect(undone.gameOver).toBe(false);
    expect(restored.session.currentSave.lifecycle).toBe("active");
    expect(await restoredDatabase.listRecords(ownerKey)).toEqual([]);

    const terminalAgain = restored.session.move(3);
    expect(terminalAgain.transition.gameOver).toBe(true);
    await terminalAgain.save;
    const [first, second] = await Promise.all([
      restored.session.confirmPendingTerminal(),
      restored.session.confirmPendingTerminal(),
    ]);
    expect(second).toEqual(first);
    expect(await restoredDatabase.listRecords(ownerKey)).toEqual([first]);
    expect(await restoredDatabase.listOutbox(ownerKey)).toHaveLength(1);
    expect(
      await restoredDatabase.getSave(ownerKey, "standard_4x4_pow2_no_undo"),
    ).toEqual(standardBefore);
    expect(
      await restoredDatabase.getSave(ownerKey, "board_3x3_pow2_no_undo"),
    ).toEqual(threeBefore);
  });

  it("finalizes classic immediately when no undo state exists", async () => {
    const { database } = createDatabase("classic-no-undo");
    const ownerKey = "user:42" as const;
    await seedSave(database, {
      ownerKey,
      modeKey: "classic_4x4_pow2_undo",
      clientRecordId: "classic-no-undo-terminal",
      steps: 7,
      board: [
        [2, 4, 2, 4],
        [4, 2, 4, 2],
        [2, 4, 2, 4],
        [4, 2, 4, 2],
      ],
    });
    const opened = await openLocalSession(
      normalOptions(
        database,
        ownerKey,
        "classic_4x4_pow2_undo",
        "must-not-be-used",
      ),
    );
    expect(opened.status).toBe("ready");
    if (opened.status !== "ready") return;

    const terminal = opened.session.move(0);
    expect(terminal.transition.gameOver).toBe(true);
    expect(terminal.save).toBeNull();
    expect(opened.session.pendingTerminal).toBe(false);
    const record = await terminal.terminal;

    expect(record?.clientRecordId).toBe("classic-no-undo-terminal");
    expect(await database.listRecords(ownerKey)).toEqual([record]);
    expect(await database.listOutbox(ownerKey)).toHaveLength(1);
    expect(await database.getSave(ownerKey, "classic_4x4_pow2_undo")).toEqual({
      status: "missing",
    });
  });

  it("persists ranked session references with the game instead of deriving them", async () => {
    const { database } = createDatabase("ranked-refs");
    const opened = await openLocalSession({
      database,
      ownerKey: "user:51",
      modeKey: "board_3x3_pow2_no_undo",
      gameKind: "ranked",
      rankedSessionId: "ranked-session-51",
      challengeId: "challenge-51",
      startedAtMs: 500,
      serverNowMs: 800,
      serverNowReceivedAtMonotonicMs: 0,
      terminalPolicy: "immediate",
      createClientRecordId: () => "ranked-game-51",
      createSeed: () => 51,
      clockSources: { wallNow: () => 1_000, performanceNow: () => 0 },
    });
    expect(opened.status).toBe("ready");
    if (opened.status !== "ready") return;
    expect(opened.session.currentSave).toMatchObject({
      ownerKey: "user:51",
      modeKey: "board_3x3_pow2_no_undo",
      gameKind: "ranked",
      rankedSessionId: "ranked-session-51",
      snapshot: {
        savedAtMs: 800,
        state: { challengeId: "challenge-51", startedAtMs: 500 },
      },
    });
    await expect(opened.session.restart()).rejects.toThrow(
      "local_session_ranked_restart_requires_new_session",
    );
  });

  it("anchors ranked elapsed time to server now instead of device wall time", async () => {
    const { database } = createDatabase("ranked-clock");
    const opened = await openLocalSession({
      database,
      ownerKey: "user:52",
      modeKey: "standard_4x4_pow2_no_undo",
      gameKind: "ranked",
      rankedSessionId: "ranked-session-52",
      challengeId: "challenge-52",
      startedAtMs: 500,
      serverNowMs: 1_000,
      serverNowReceivedAtMonotonicMs: 100,
      terminalPolicy: "immediate",
      createClientRecordId: () => "ranked-game-52",
      createSeed: () => 52,
      clockSources: {
        wallNow: () => 86_401_000,
        performanceNow: () => 200,
      },
    });
    expect(opened.status).toBe("ready");
    if (opened.status !== "ready") return;

    expect(opened.session.currentSave.snapshot.savedAtMs).toBe(1_100);
    expect(opened.session.elapsedMs()).toBe(600);
  });
});

describe("mobile ranked session orchestration", () => {
  it("persists and reuses one start intent before securely delivering a ranked board", async () => {
    const { database } = createDatabase("ranked-start-retry");
    const storage = createMemorySecureStorage();
    await saveAccountSession(storage, accountSession());
    const operationId = "ranked.start:000000000000000000000071";
    const startOperations: string[] = [];
    const gateway: RankedSessionGateway = {
      start: vi.fn(async (input) => {
        startOperations.push(input.operationId);
        expect(
          (await database.listOutbox(rankedOwner)).map((item) => item.kind),
        ).toContain("ranked.session_start");
        if (startOperations.length === 1) throw new Error("response_lost");
        return rankedStartBody(input.operationId, input.modeKey, 1);
      }),
      abandon: vi.fn(async () => undefined),
    };
    let clientRecordSequence = 0;
    const orchestrator = new RankedSessionOrchestrator({
      ownerKey: rankedOwner,
      identityEstablishedAtMs: 1_000,
      database,
      secureStorage: storage,
      gateway,
      workGate: new OwnerCleanupWorkGate(),
      clockSources: { wallNow: () => 9_000_000, performanceNow: () => 500 },
      createOperationId: () => operationId,
      createClientRecordId: () => `ranked-game-${++clientRecordSequence}`,
    });

    await expect(
      orchestrator.startNewRankedSession("standard_4x4_pow2_no_undo"),
    ).rejects.toMatchObject({
      name: "RankedSessionOrchestrationError",
      code: "ranked_start_request_failed",
    });
    expect(await database.listOutbox(rankedOwner)).toHaveLength(1);

    const originalStart = database.startNewGame.bind(database);
    let localStartAttempts = 0;
    const startSpy = vi
      .spyOn(database, "startNewGame")
      .mockImplementation(async (input) => {
        expect((await loadAccountSession(storage))?.challengeRefs).toHaveLength(
          1,
        );
        localStartAttempts += 1;
        if (localStartAttempts === 1) throw new Error("local_write_failed");
        return originalStart(input);
      });
    await expect(
      orchestrator.startNewRankedSession("standard_4x4_pow2_no_undo"),
    ).rejects.toMatchObject({
      code: "ranked_local_start_failed",
    });
    expect(await database.listOutbox(rankedOwner)).toHaveLength(1);
    expect((await loadAccountSession(storage))?.challengeRefs).toHaveLength(1);
    const game = await orchestrator.startNewRankedSession(
      "standard_4x4_pow2_no_undo",
    );

    expect(startOperations).toEqual([operationId, operationId, operationId]);
    expect(startSpy).toHaveBeenCalledTimes(2);
    expect(game.currentSave).toMatchObject({
      ownerKey: rankedOwner,
      gameKind: "ranked",
      rankedSessionId: "rch_00000000000000000000000000000001",
    });
    expect(await database.listOutbox(rankedOwner)).toEqual([]);
    expect((await loadAccountSession(storage))?.challengeRefs).toEqual([
      expect.objectContaining({
        challengeId: "rch_00000000000000000000000000000001",
      }),
    ]);

    await game.leave();
    expect(gateway.abandon).not.toHaveBeenCalled();
    expect((await loadAccountSession(storage))?.challengeRefs).toHaveLength(1);
    await orchestrator.abandonOwnerSessions();
    expect(gateway.abandon).toHaveBeenCalledTimes(1);
    expect((await loadAccountSession(storage))?.challengeRefs).toEqual([]);
    expect(await database.listOutbox(rankedOwner)).toEqual([]);
  });

  it("bounds a stalled ranked start request while retaining its durable intent", async () => {
    const { database } = createDatabase("ranked-start-timeout");
    const storage = createMemorySecureStorage();
    await saveAccountSession(storage, accountSession());
    const operationId = "ranked.start:000000000000000000000086";
    const gateway: RankedSessionGateway = {
      start: vi.fn(
        async () =>
          new Promise<unknown>(() => {
            // Deliberately never settles.
          }),
      ),
      abandon: vi.fn(async () => undefined),
    };
    const orchestrator = new RankedSessionOrchestrator({
      ownerKey: rankedOwner,
      identityEstablishedAtMs: 1_000,
      database,
      secureStorage: storage,
      gateway,
      workGate: new OwnerCleanupWorkGate(),
      requestTimeoutMs: 25,
      clockSources: { wallNow: () => 9_050_000, performanceNow: () => 505 },
      createOperationId: () => operationId,
    });

    await expect(
      orchestrator.startNewRankedSession("standard_4x4_pow2_no_undo"),
    ).rejects.toMatchObject({ code: "ranked_start_request_failed" });

    expect(gateway.start).toHaveBeenCalledTimes(1);
    expect(await database.listOutbox(rankedOwner)).toHaveLength(1);
    expect(
      await database.getSave(rankedOwner, "standard_4x4_pow2_no_undo"),
    ).toEqual({ status: "missing" });
  });

  it("rejects a changed frozen response after local ranked save creation fails", async () => {
    const { database } = createDatabase("ranked-frozen-response-conflict");
    const storage = createMemorySecureStorage();
    await saveAccountSession(storage, accountSession());
    const operationId = "ranked.start:000000000000000000000077";
    const modeKey = "standard_4x4_pow2_no_undo" as const;
    const firstResponse = rankedStartBody(operationId, modeKey, 7);
    const conflictingResponse = rankedStartBody(operationId, modeKey, 7);
    conflictingResponse.data.seed += 1;
    conflictingResponse.data.started_at_ms += 1_000;
    conflictingResponse.data.started_at = Math.floor(
      conflictingResponse.data.started_at_ms / 1_000,
    );
    conflictingResponse.data.server_now_ms += 1_000;
    const gateway: RankedSessionGateway = {
      start: vi
        .fn()
        .mockResolvedValueOnce(firstResponse)
        .mockResolvedValueOnce(conflictingResponse),
      abandon: vi.fn(async () => undefined),
    };
    const originalStart = database.startNewGame.bind(database);
    const startSpy = vi
      .spyOn(database, "startNewGame")
      .mockRejectedValueOnce(new Error("local_write_failed"))
      .mockImplementation(originalStart);
    const orchestrator = new RankedSessionOrchestrator({
      ownerKey: rankedOwner,
      identityEstablishedAtMs: 1_000,
      database,
      secureStorage: storage,
      gateway,
      workGate: new OwnerCleanupWorkGate(),
      clockSources: { wallNow: () => 9_100_000, performanceNow: () => 510 },
      createOperationId: () => operationId,
      createClientRecordId: () => "ranked-frozen-conflict-game",
    });

    await expect(
      orchestrator.startNewRankedSession(modeKey),
    ).rejects.toMatchObject({ code: "ranked_local_start_failed" });
    const [frozenIntent] = await database.listOutbox(rankedOwner);
    expect(frozenIntent).toMatchObject({
      operationId,
      payload: {
        modeKey,
        frozen: {
          seed: firstResponse.data.seed,
          startedAtMs: firstResponse.data.started_at_ms,
        },
      },
    });

    await expect(
      orchestrator.startNewRankedSession(modeKey),
    ).rejects.toMatchObject({ code: "ranked_start_invalid_response" });

    expect(gateway.start).toHaveBeenCalledTimes(2);
    expect(startSpy).toHaveBeenCalledTimes(1);
    expect(await database.getSave(rankedOwner, modeKey)).toEqual({
      status: "missing",
    });
    expect((await database.listOutbox(rankedOwner))[0]).toEqual(frozenIntent);
  });

  it("fails closed and retains recoverable start and abandon intents when secure persistence fails", async () => {
    const { database } = createDatabase("ranked-secure-failure");
    const backingStorage = createMemorySecureStorage();
    await saveAccountSession(backingStorage, accountSession());
    const storage = {
      get: backingStorage.get,
      set: vi.fn(async () => {
        throw new Error("secure_write_failed");
      }),
    };
    const gateway: RankedSessionGateway = {
      start: async (input) =>
        rankedStartBody(input.operationId, input.modeKey, 2),
      abandon: vi.fn(async () => {
        expect(
          (await database.listOutbox(rankedOwner)).map((item) => item.kind),
        ).toContain("ranked.abandon");
        throw new Error("abandon_unavailable");
      }),
    };
    const orchestrator = new RankedSessionOrchestrator({
      ownerKey: rankedOwner,
      identityEstablishedAtMs: 1_000,
      database,
      secureStorage: storage,
      gateway,
      workGate: new OwnerCleanupWorkGate(),
      clockSources: { wallNow: () => 3_000, performanceNow: () => 20 },
      createOperationId: () => "ranked.start:000000000000000000000072",
    });

    await expect(
      orchestrator.startNewRankedSession("board_3x3_pow2_no_undo"),
    ).rejects.toEqual(
      new RankedSessionOrchestrationError("ranked_challenge_write_failed"),
    );
    expect(
      (await database.listOutbox(rankedOwner)).map((item) => item.kind).sort(),
    ).toEqual(["ranked.abandon", "ranked.session_start"]);
    expect(
      await database.getSave(rankedOwner, "board_3x3_pow2_no_undo"),
    ).toEqual({ status: "missing" });
    expect((await loadAccountSession(backingStorage))?.challengeRefs).toEqual(
      [],
    );
  });

  it("rejects a start response that is not bound to the persisted operation", async () => {
    const { database } = createDatabase("ranked-response-mismatch");
    const storage = createMemorySecureStorage();
    await saveAccountSession(storage, accountSession());
    const orchestrator = new RankedSessionOrchestrator({
      ownerKey: rankedOwner,
      identityEstablishedAtMs: 1_000,
      database,
      secureStorage: storage,
      gateway: {
        start: async (input) =>
          rankedStartBody(
            "ranked.start:000000000000000000000099",
            input.modeKey,
            9,
          ),
        abandon: async () => undefined,
      },
      workGate: new OwnerCleanupWorkGate(),
      clockSources: { wallNow: () => 3_500, performanceNow: () => 25 },
      createOperationId: () => "ranked.start:000000000000000000000075",
    });

    await expect(
      orchestrator.startNewRankedSession("standard_4x4_pow2_no_undo"),
    ).rejects.toMatchObject({ code: "ranked_start_invalid_response" });
    expect(
      (await database.listOutbox(rankedOwner)).map((item) => item.kind),
    ).toEqual(["ranked.session_start"]);
    expect(
      await database.getSave(rankedOwner, "standard_4x4_pow2_no_undo"),
    ).toEqual({ status: "missing" });
    expect((await loadAccountSession(storage))?.challengeRefs).toEqual([]);
  });

  it("rejects a started response at the server expiry and retains its intent", async () => {
    const { database } = createDatabase("ranked-expired-started-response");
    const storage = createMemorySecureStorage();
    await saveAccountSession(storage, accountSession());
    const operationId = "ranked.start:000000000000000000000078";
    const response = rankedStartBody(
      operationId,
      "standard_4x4_pow2_no_undo",
      8,
    );
    response.data.server_now_ms = response.data.expired_at * 1_000;
    const orchestrator = new RankedSessionOrchestrator({
      ownerKey: rankedOwner,
      identityEstablishedAtMs: 1_000,
      database,
      secureStorage: storage,
      gateway: {
        start: vi.fn(async () => response),
        abandon: vi.fn(async () => undefined),
      },
      workGate: new OwnerCleanupWorkGate(),
      clockSources: { wallNow: () => 3_550, performanceNow: () => 25 },
      createOperationId: () => operationId,
    });

    await expect(
      orchestrator.startNewRankedSession("standard_4x4_pow2_no_undo"),
    ).rejects.toMatchObject({ code: "ranked_start_invalid_response" });
    expect(
      await database.getSave(rankedOwner, "standard_4x4_pow2_no_undo"),
    ).toEqual({ status: "missing" });
    expect(await database.listOutbox(rankedOwner)).toEqual([
      expect.objectContaining({
        operationId,
        kind: "ranked.session_start",
        payload: { modeKey: "standard_4x4_pow2_no_undo" },
      }),
    ]);
    expect((await loadAccountSession(storage))?.challengeRefs).toEqual([]);
  });

  it("never sends an intent under a different authenticated owner", async () => {
    const { database } = createDatabase("ranked-owner-mismatch");
    const storage = createMemorySecureStorage();
    await saveAccountSession(storage, accountSession());
    const start = vi.fn();
    const orchestrator = new RankedSessionOrchestrator({
      ownerKey: "user:72",
      identityEstablishedAtMs: 1_000,
      database,
      secureStorage: storage,
      gateway: { start, abandon: async () => undefined },
      workGate: new OwnerCleanupWorkGate(),
      clockSources: { wallNow: () => 3_600, performanceNow: () => 26 },
      createOperationId: () => "ranked.start:000000000000000000000076",
    });

    await expect(
      orchestrator.startNewRankedSession("standard_4x4_pow2_no_undo"),
    ).rejects.toMatchObject({ code: "owner_mismatch" });
    expect(start).not.toHaveBeenCalled();
    expect(await database.listOutbox("user:72")).toEqual([]);
    expect(await database.listOutbox(rankedOwner)).toEqual([]);
  });

  it("rejects an orchestrator from an older login generation before writing an intent", async () => {
    const { database } = createDatabase("ranked-login-generation-mismatch");
    const storage = createMemorySecureStorage();
    await saveAccountSession(storage, accountSession());
    const start = vi.fn();
    const orchestrator = new RankedSessionOrchestrator({
      ownerKey: rankedOwner,
      identityEstablishedAtMs: 999,
      database,
      secureStorage: storage,
      gateway: { start, abandon: async () => undefined },
      workGate: new OwnerCleanupWorkGate(),
      clockSources: { wallNow: () => 3_650, performanceNow: () => 26 },
      createOperationId: () => "ranked.start:000000000000000000000085",
    });

    await expect(
      orchestrator.startNewRankedSession("standard_4x4_pow2_no_undo"),
    ).rejects.toMatchObject({ code: "owner_mismatch" });
    expect(start).not.toHaveBeenCalled();
    expect(await database.listOutbox(rankedOwner)).toEqual([]);
  });

  it("does not let an older login generation join a current start flight", async () => {
    const { database, reopen } = createDatabase(
      "ranked-login-generation-flight-mismatch",
    );
    const storage = createMemorySecureStorage();
    await saveAccountSession(storage, accountSession());
    const operationId = "ranked.start:000000000000000000000087";
    let releaseResponse!: (value: unknown) => void;
    const response = new Promise<unknown>((resolve) => {
      releaseResponse = resolve;
    });
    const gateway: RankedSessionGateway = {
      start: vi.fn(async () => response),
      abandon: vi.fn(async () => undefined),
    };
    const options = {
      ownerKey: rankedOwner,
      secureStorage: storage,
      gateway,
      workGate: new OwnerCleanupWorkGate(),
      clockSources: { wallNow: () => 3_675, performanceNow: () => 26 },
      createOperationId: () => operationId,
      createClientRecordId: () => "ranked-generation-flight-game",
    };
    const current = new RankedSessionOrchestrator({
      ...options,
      identityEstablishedAtMs: 1_000,
      database,
    });
    const stale = new RankedSessionOrchestrator({
      ...options,
      identityEstablishedAtMs: 999,
      database: reopen(),
    });

    const currentStart = current.startNewRankedSession(
      "standard_4x4_pow2_no_undo",
    );
    await vi.waitFor(() => expect(gateway.start).toHaveBeenCalledTimes(1));
    const staleStart = stale.startNewRankedSession("standard_4x4_pow2_no_undo");
    const staleRejection = expect(staleStart).rejects.toMatchObject({
      code: "owner_mismatch",
    });
    releaseResponse(
      rankedStartBody(operationId, "standard_4x4_pow2_no_undo", 17),
    );

    await expect(currentStart).resolves.toMatchObject({
      currentSave: { clientRecordId: "ranked-generation-flight-game" },
    });
    await staleRejection;
    expect(gateway.start).toHaveBeenCalledTimes(1);
  });

  it("registers ranked work with owner cleanup and rejects work after the gate stops", async () => {
    const { database } = createDatabase("ranked-owner-cleanup-gate");
    const storage = createMemorySecureStorage();
    await saveAccountSession(storage, accountSession());
    const operationId = "ranked.start:000000000000000000000079";
    const workGate = new OwnerCleanupWorkGate();
    let releaseResponse!: (value: unknown) => void;
    const response = new Promise<unknown>((resolve) => {
      releaseResponse = resolve;
    });
    const gateway: RankedSessionGateway = {
      start: vi.fn(async () => response),
      abandon: vi.fn(async () => undefined),
    };
    const orchestrator = new RankedSessionOrchestrator({
      ownerKey: rankedOwner,
      identityEstablishedAtMs: 1_000,
      database,
      secureStorage: storage,
      gateway,
      workGate,
      clockSources: { wallNow: () => 3_700, performanceNow: () => 27 },
      createOperationId: () => operationId,
      createClientRecordId: () => "ranked-owner-cleanup-game",
    });

    const start = orchestrator.startNewRankedSession(
      "standard_4x4_pow2_no_undo",
    );
    await vi.waitFor(() => expect(gateway.start).toHaveBeenCalledTimes(1));
    let drained = false;
    const drain = workGate.stopAndDrain(rankedOwner).then(() => {
      drained = true;
    });
    await Promise.resolve();
    expect(drained).toBe(false);

    releaseResponse(
      rankedStartBody(operationId, "standard_4x4_pow2_no_undo", 9),
    );
    const game = await start;
    await drain;
    expect(workGate.isStopped(rankedOwner)).toBe(true);
    for (const operation of [
      () => orchestrator.startNewRankedSession("standard_4x4_pow2_no_undo"),
      () => orchestrator.listPendingStarts(),
      () =>
        orchestrator.confirmPendingStart(
          "ranked.start:000000000000000000000079",
        ),
      () =>
        orchestrator.abandonPendingStart(
          "ranked.start:000000000000000000000079",
        ),
      () => orchestrator.restartRankedSession(game),
      () => orchestrator.abandonOwnerSessions(),
      () => orchestrator.resumePendingAbandons(),
    ]) {
      await expect(operation()).rejects.toMatchObject({
        code: "owner_work_stopped",
      });
    }
    expect(gateway.start).toHaveBeenCalledTimes(1);
  });

  it("checks the caller cleanup gate before joining a shared start flight", async () => {
    const { database, reopen } = createDatabase(
      "ranked-shared-flight-cleanup-gate",
    );
    const storage = createMemorySecureStorage();
    await saveAccountSession(storage, accountSession());
    const operationId = "ranked.start:000000000000000000000088";
    let releaseResponse!: (value: unknown) => void;
    const response = new Promise<unknown>((resolve) => {
      releaseResponse = resolve;
    });
    const gateway: RankedSessionGateway = {
      start: vi.fn(async () => response),
      abandon: vi.fn(async () => undefined),
    };
    const activeGate = new OwnerCleanupWorkGate();
    const stoppedGate = new OwnerCleanupWorkGate();
    await stoppedGate.stopAndDrain(rankedOwner);
    const options = {
      ownerKey: rankedOwner,
      identityEstablishedAtMs: 1_000,
      secureStorage: storage,
      gateway,
      clockSources: { wallNow: () => 3_750, performanceNow: () => 27 },
      createOperationId: () => operationId,
      createClientRecordId: () => "ranked-cleanup-flight-game",
    };
    const current = new RankedSessionOrchestrator({
      ...options,
      database,
      workGate: activeGate,
    });
    const stopped = new RankedSessionOrchestrator({
      ...options,
      database: reopen(),
      workGate: stoppedGate,
    });

    const currentStart = current.startNewRankedSession(
      "standard_4x4_pow2_no_undo",
    );
    await vi.waitFor(() => expect(gateway.start).toHaveBeenCalledTimes(1));
    const stoppedStart = stopped.startNewRankedSession(
      "standard_4x4_pow2_no_undo",
    );
    const stoppedRejection = expect(stoppedStart).rejects.toMatchObject({
      code: "owner_work_stopped",
    });
    releaseResponse(
      rankedStartBody(operationId, "standard_4x4_pow2_no_undo", 18),
    );

    await expect(currentStart).resolves.toMatchObject({
      currentSave: { clientRecordId: "ranked-cleanup-flight-game" },
    });
    await stoppedRejection;
    expect(gateway.start).toHaveBeenCalledTimes(1);
  });

  it("single-flights ranked start across orchestrator instances for one owner and mode", async () => {
    const { database, reopen } = createDatabase(
      "ranked-cross-instance-single-flight",
    );
    const secondDatabase = reopen();
    const storage = createMemorySecureStorage();
    await saveAccountSession(storage, accountSession());
    const workGate = new OwnerCleanupWorkGate();
    const gateway: RankedSessionGateway = {
      start: vi.fn(async (input) =>
        rankedStartBody(
          input.operationId,
          input.modeKey,
          input.operationId.endsWith("82") ? 12 : 13,
        ),
      ),
      abandon: vi.fn(async () => undefined),
    };
    const createOrchestrator = (
      operationId: string,
      orchestrationDatabase: AppDatabase,
    ) =>
      new RankedSessionOrchestrator({
        ownerKey: rankedOwner,
        identityEstablishedAtMs: 1_000,
        database: orchestrationDatabase,
        secureStorage: storage,
        gateway,
        workGate,
        clockSources: { wallNow: () => 3_800, performanceNow: () => 28 },
        createOperationId: () => operationId,
        createClientRecordId: () => "ranked-cross-instance-game",
      });
    const firstOrchestrator = createOrchestrator(
      "ranked.start:000000000000000000000082",
      database,
    );
    const secondOrchestrator = createOrchestrator(
      "ranked.start:000000000000000000000083",
      secondDatabase,
    );

    const [first, second] = await Promise.all([
      firstOrchestrator.startNewRankedSession("standard_4x4_pow2_no_undo"),
      secondOrchestrator.startNewRankedSession("standard_4x4_pow2_no_undo"),
    ]);

    expect(gateway.start).toHaveBeenCalledTimes(1);
    expect(first).toBe(second);
    expect(await database.listOutbox(rankedOwner)).toEqual([]);
    expect((await loadAccountSession(storage))?.challengeRefs).toHaveLength(1);
  });

  it("reports an unseen startup intent without networking and abandons only after an explicit decision", async () => {
    const { database } = createDatabase("ranked-startup-abandon");
    const storage = createMemorySecureStorage();
    await saveAccountSession(storage, accountSession());
    const operationId = "ranked.start:000000000000000000000073";
    await database.enqueueOutbox(
      rankedStartIntent(operationId, "classic_4x4_pow2_undo"),
    );
    const gateway: RankedSessionGateway = {
      start: vi.fn(async (input) =>
        rankedStartBody(input.operationId, input.modeKey, 3),
      ),
      abandon: vi.fn(async () => undefined),
    };
    const removeSpy = vi.spyOn(database, "removeOutbox");
    const orchestrator = new RankedSessionOrchestrator({
      ownerKey: rankedOwner,
      identityEstablishedAtMs: 1_000,
      database,
      secureStorage: storage,
      gateway,
      workGate: new OwnerCleanupWorkGate(),
      clockSources: { wallNow: () => 4_000, performanceNow: () => 30 },
    });

    await expect(orchestrator.listPendingStarts()).resolves.toEqual([
      {
        operationId,
        modeKey: "classic_4x4_pow2_undo",
        resolution: "abandon_required",
      },
    ]);
    expect(gateway.start).not.toHaveBeenCalled();
    await orchestrator.abandonPendingStart(operationId);
    expect(gateway.start).toHaveBeenCalledTimes(1);
    expect(gateway.abandon).toHaveBeenCalledTimes(1);
    expect(removeSpy.mock.calls.map(([, operationId]) => operationId)).toEqual([
      "ranked.abandon:rch_00000000000000000000000000000003",
      operationId,
    ]);
    expect(await database.listOutbox(rankedOwner)).toEqual([]);
    expect(
      await database.getSave(rankedOwner, "classic_4x4_pow2_undo"),
    ).toEqual({ status: "missing" });
  });

  it("cleans a standalone abandon tombstone after its save and secure ref are gone", async () => {
    const { database } = createDatabase("ranked-standalone-abandon-tombstone");
    const storage = createMemorySecureStorage();
    await saveAccountSession(storage, accountSession());
    const challengeId = "rch_00000000000000000000000000000020";
    await database.enqueueOutbox(rankedAbandonIntent(challengeId));
    const gateway: RankedSessionGateway = {
      start: vi.fn(async () => {
        throw new Error("must_not_start");
      }),
      abandon: vi.fn(async () => {
        throw new Error("must_not_abandon_without_token");
      }),
    };
    const orchestrator = new RankedSessionOrchestrator({
      ownerKey: rankedOwner,
      identityEstablishedAtMs: 1_000,
      database,
      secureStorage: storage,
      gateway,
      workGate: new OwnerCleanupWorkGate(),
      clockSources: { wallNow: () => 8_150, performanceNow: () => 81 },
    });

    await expect(orchestrator.resumePendingAbandons()).resolves.toBeUndefined();

    expect(gateway.start).not.toHaveBeenCalled();
    expect(gateway.abandon).not.toHaveBeenCalled();
    expect(await database.listOutbox(rankedOwner)).toEqual([]);
  });

  it("settles a pending ranked start without deleting a normal fallback save", async () => {
    const { database } = createDatabase("ranked-abandon-preserves-normal");
    const storage = createMemorySecureStorage();
    await saveAccountSession(storage, accountSession());
    const operationId = "ranked.start:000000000000000000000080";
    const modeKey = "board_3x3_pow2_no_undo" as const;
    await database.enqueueOutbox(rankedStartIntent(operationId, modeKey));
    const normal = await openLocalSession({
      database,
      ownerKey: rankedOwner,
      modeKey,
      gameKind: "normal",
      rankedSessionId: null,
      challengeId: null,
      startedAtMs: null,
      serverNowMs: null,
      serverNowReceivedAtMonotonicMs: null,
      terminalPolicy: "immediate",
      createSeed: () => 80,
      createClientRecordId: () => "normal-fallback-game",
      clockSources: { wallNow: () => 8_000, performanceNow: () => 80 },
    });
    expect(normal.status).toBe("ready");
    const gateway: RankedSessionGateway = {
      start: vi.fn(async (input) =>
        rankedStartBody(input.operationId, input.modeKey, 10),
      ),
      abandon: vi.fn(async () => undefined),
    };
    const orchestrator = new RankedSessionOrchestrator({
      ownerKey: rankedOwner,
      identityEstablishedAtMs: 1_000,
      database,
      secureStorage: storage,
      gateway,
      workGate: new OwnerCleanupWorkGate(),
      clockSources: { wallNow: () => 8_100, performanceNow: () => 81 },
    });

    await orchestrator.abandonPendingStart(operationId);

    expect(gateway.abandon).toHaveBeenCalledTimes(1);
    expect(await database.getSave(rankedOwner, modeKey)).toMatchObject({
      status: "ok",
      save: {
        clientRecordId: "normal-fallback-game",
        gameKind: "normal",
      },
    });
    expect(await database.listOutbox(rankedOwner)).toEqual([]);
    expect((await loadAccountSession(storage))?.challengeRefs).toEqual([]);
  });

  it("cleans a consumed pending start without trying to abandon it", async () => {
    const { database } = createDatabase("ranked-consumed-start-cleanup");
    const storage = createMemorySecureStorage();
    await saveAccountSession(storage, accountSession());
    const operationId = "ranked.start:000000000000000000000081";
    const modeKey = "classic_4x4_pow2_undo" as const;
    await database.enqueueOutbox(rankedStartIntent(operationId, modeKey));
    const normal = await openLocalSession({
      database,
      ownerKey: rankedOwner,
      modeKey,
      gameKind: "normal",
      rankedSessionId: null,
      challengeId: null,
      startedAtMs: null,
      serverNowMs: null,
      serverNowReceivedAtMonotonicMs: null,
      terminalPolicy: "pending_undo",
      createSeed: () => 81,
      createClientRecordId: () => "normal-consumed-fallback-game",
      clockSources: { wallNow: () => 8_150, performanceNow: () => 81 },
    });
    expect(normal.status).toBe("ready");
    const response = rankedStartBody(operationId, modeKey, 11);
    response.data.status = "consumed";
    const gateway: RankedSessionGateway = {
      start: vi.fn(async () => response),
      abandon: vi.fn(async () => undefined),
    };
    const orchestrator = new RankedSessionOrchestrator({
      ownerKey: rankedOwner,
      identityEstablishedAtMs: 1_000,
      database,
      secureStorage: storage,
      gateway,
      workGate: new OwnerCleanupWorkGate(),
      clockSources: { wallNow: () => 8_200, performanceNow: () => 82 },
    });

    await expect(
      orchestrator.abandonPendingStart(operationId),
    ).resolves.toBeUndefined();

    expect(gateway.abandon).not.toHaveBeenCalled();
    expect(await database.listOutbox(rankedOwner)).toEqual([]);
    expect(await database.getSave(rankedOwner, modeKey)).toMatchObject({
      status: "ok",
      save: {
        clientRecordId: "normal-consumed-fallback-game",
        gameKind: "normal",
      },
    });
  });

  it("requires explicit confirmation to resume a start committed before intent cleanup", async () => {
    const { database } = createDatabase("ranked-startup-confirm");
    const storage = createMemorySecureStorage();
    const operationId = "ranked.start:000000000000000000000074";
    const body = rankedStartBody(operationId, "standard_4x4_pow2_no_undo", 4);
    await saveAccountSession(
      storage,
      accountSession([
        {
          challengeId: body.data.challenge_id,
          rankedSessionId: body.data.ranked_session_id,
          token: body.data.ranked_session_token,
          expiresAtEpochSeconds: body.data.expired_at,
        },
      ]),
    );
    await database.enqueueOutbox(
      rankedStartIntent(operationId, "standard_4x4_pow2_no_undo"),
    );
    await database.freezeRankedStartIntent(
      rankedOwner,
      operationId,
      rankedStartFingerprint(body),
    );
    const opened = await openLocalSession({
      database,
      ownerKey: rankedOwner,
      modeKey: "standard_4x4_pow2_no_undo",
      gameKind: "ranked",
      rankedSessionId: body.data.ranked_session_id,
      challengeId: body.data.challenge_id,
      startedAtMs: body.data.started_at_ms,
      serverNowMs: body.data.server_now_ms,
      serverNowReceivedAtMonotonicMs: 40,
      terminalPolicy: "immediate",
      createSeed: () => body.data.seed,
      createClientRecordId: () => "ranked-confirm-game",
      clockSources: { wallNow: () => 5_000, performanceNow: () => 40 },
    });
    expect(opened.status).toBe("ready");
    const gateway: RankedSessionGateway = {
      start: vi.fn(async () => {
        throw new Error("must_not_start");
      }),
      abandon: vi.fn(async () => {
        throw new Error("must_not_abandon");
      }),
    };
    const orchestrator = new RankedSessionOrchestrator({
      ownerKey: rankedOwner,
      identityEstablishedAtMs: 1_000,
      database,
      secureStorage: storage,
      gateway,
      workGate: new OwnerCleanupWorkGate(),
      clockSources: { wallNow: () => 5_100, performanceNow: () => 50 },
    });

    await expect(orchestrator.listPendingStarts()).resolves.toEqual([
      {
        operationId,
        modeKey: "standard_4x4_pow2_no_undo",
        resolution: "confirmation_required",
      },
    ]);
    expect(gateway.start).not.toHaveBeenCalled();
    const confirmed = await orchestrator.confirmPendingStart(operationId);
    expect(confirmed.currentSave.clientRecordId).toBe("ranked-confirm-game");
    expect(gateway.start).not.toHaveBeenCalled();
    expect(await database.listOutbox(rankedOwner)).toEqual([]);
  });

  it("refuses to confirm a start intent against a different ranked save", async () => {
    const { database } = createDatabase("ranked-startup-confirm-mismatch");
    const storage = createMemorySecureStorage();
    const operationId = "ranked.start:000000000000000000000084";
    const modeKey = "standard_4x4_pow2_no_undo" as const;
    const savedBody = rankedStartBody(operationId, modeKey, 14);
    const intentBody = rankedStartBody(operationId, modeKey, 15);
    await saveAccountSession(
      storage,
      accountSession([
        {
          challengeId: savedBody.data.challenge_id,
          rankedSessionId: savedBody.data.ranked_session_id,
          token: savedBody.data.ranked_session_token,
          expiresAtEpochSeconds: savedBody.data.expired_at,
        },
      ]),
    );
    await database.enqueueOutbox(rankedStartIntent(operationId, modeKey));
    await database.freezeRankedStartIntent(
      rankedOwner,
      operationId,
      rankedStartFingerprint(intentBody),
    );
    const opened = await openLocalSession({
      database,
      ownerKey: rankedOwner,
      modeKey,
      gameKind: "ranked",
      rankedSessionId: savedBody.data.ranked_session_id,
      challengeId: savedBody.data.challenge_id,
      startedAtMs: savedBody.data.started_at_ms,
      serverNowMs: savedBody.data.server_now_ms,
      serverNowReceivedAtMonotonicMs: 90,
      terminalPolicy: "immediate",
      createSeed: () => savedBody.data.seed,
      createClientRecordId: () => "ranked-mismatched-confirm-game",
      clockSources: { wallNow: () => 9_000, performanceNow: () => 90 },
    });
    expect(opened.status).toBe("ready");
    const orchestrator = new RankedSessionOrchestrator({
      ownerKey: rankedOwner,
      identityEstablishedAtMs: 1_000,
      database,
      secureStorage: storage,
      gateway: {
        start: vi.fn(async () => {
          throw new Error("must_not_start");
        }),
        abandon: vi.fn(async () => {
          throw new Error("must_not_abandon");
        }),
      },
      workGate: new OwnerCleanupWorkGate(),
      clockSources: { wallNow: () => 9_100, performanceNow: () => 91 },
    });

    await expect(
      orchestrator.confirmPendingStart(operationId),
    ).rejects.toMatchObject({ code: "ranked_start_invalid_response" });
    expect(await database.listOutbox(rankedOwner)).toHaveLength(1);
    expect(await database.getSave(rankedOwner, modeKey)).toMatchObject({
      status: "ok",
      save: { clientRecordId: "ranked-mismatched-confirm-game" },
    });
  });

  it("abandons the old challenge before a ranked restart delivers a new session", async () => {
    const { database } = createDatabase("ranked-restart");
    const storage = createMemorySecureStorage();
    await saveAccountSession(storage, accountSession());
    let operationSequence = 0;
    let startSequence = 0;
    let clientSequence = 0;
    const operationIds: string[] = [];
    const gateway: RankedSessionGateway = {
      start: vi.fn(async (input) => {
        operationIds.push(input.operationId);
        startSequence += 1;
        return rankedStartBody(input.operationId, input.modeKey, startSequence);
      }),
      abandon: vi.fn(async (input) => {
        expect(input.challengeId).toBe("rch_00000000000000000000000000000001");
        expect(
          (await database.listOutbox(rankedOwner)).map((item) => item.kind),
        ).toContain("ranked.abandon");
        expect(
          await database.getSave(rankedOwner, "standard_4x4_pow2_no_undo"),
        ).toEqual({ status: "missing" });
      }),
    };
    const orchestrator = new RankedSessionOrchestrator({
      ownerKey: rankedOwner,
      identityEstablishedAtMs: 1_000,
      database,
      secureStorage: storage,
      gateway,
      workGate: new OwnerCleanupWorkGate(),
      clockSources: { wallNow: () => 6_000, performanceNow: () => 60 },
      createOperationId: () =>
        `ranked.start:${(++operationSequence).toString().padStart(24, "0")}`,
      createClientRecordId: () => `ranked-restart-${++clientSequence}`,
    });
    const first = await orchestrator.startNewRankedSession(
      "standard_4x4_pow2_no_undo",
    );

    const second = await orchestrator.restartRankedSession(first);

    expect(gateway.abandon).toHaveBeenCalledTimes(1);
    expect(operationIds).toHaveLength(2);
    expect(new Set(operationIds).size).toBe(2);
    expect(second.currentSave).toMatchObject({
      clientRecordId: "ranked-restart-2",
      rankedSessionId: "rch_00000000000000000000000000000002",
    });
    expect((await loadAccountSession(storage))?.challengeRefs).toEqual([
      expect.objectContaining({
        challengeId: "rch_00000000000000000000000000000002",
      }),
    ]);
    expect(await database.listOutbox(rankedOwner)).toEqual([]);
  });

  it("keeps a failed ranked restart non-restorable and resumes its durable abandon before a new start", async () => {
    const { database } = createDatabase("ranked-restart-abandon-recovery");
    const storage = createMemorySecureStorage();
    await saveAccountSession(storage, accountSession());
    let operationSequence = 85;
    let startSequence = 15;
    let clientSequence = 0;
    const gateway: RankedSessionGateway = {
      start: vi.fn(async (input) => {
        startSequence += 1;
        return rankedStartBody(input.operationId, input.modeKey, startSequence);
      }),
      abandon: vi
        .fn()
        .mockRejectedValueOnce(new Error("abandon_offline"))
        .mockResolvedValueOnce(undefined),
    };
    const orchestrator = new RankedSessionOrchestrator({
      ownerKey: rankedOwner,
      identityEstablishedAtMs: 1_000,
      database,
      secureStorage: storage,
      gateway,
      workGate: new OwnerCleanupWorkGate(),
      clockSources: { wallNow: () => 10_000, performanceNow: () => 100 },
      createOperationId: () =>
        `ranked.start:${(++operationSequence).toString().padStart(24, "0")}`,
      createClientRecordId: () => `ranked-recovery-${++clientSequence}`,
    });
    const first = await orchestrator.startNewRankedSession(
      "standard_4x4_pow2_no_undo",
    );

    await expect(
      orchestrator.restartRankedSession(first),
    ).rejects.toMatchObject({ code: "ranked_abandon_failed" });

    expect(
      await database.getSave(rankedOwner, "standard_4x4_pow2_no_undo"),
    ).toEqual({ status: "missing" });
    expect(
      (await database.listOutbox(rankedOwner)).map((item) => item.kind),
    ).toEqual(["ranked.abandon"]);
    expect((await loadAccountSession(storage))?.challengeRefs).toHaveLength(1);

    await orchestrator.resumePendingAbandons();
    expect(await database.listOutbox(rankedOwner)).toEqual([]);
    expect((await loadAccountSession(storage))?.challengeRefs).toEqual([]);

    const second = await orchestrator.startNewRankedSession(
      "standard_4x4_pow2_no_undo",
    );
    expect(second.currentSave.clientRecordId).toBe("ranked-recovery-2");
    expect(gateway.abandon).toHaveBeenCalledTimes(2);
    expect(gateway.start).toHaveBeenCalledTimes(2);
  });

  it("keeps the old save closed when cleanup is interrupted after remote abandon", async () => {
    const { database } = createDatabase(
      "ranked-restart-post-abandon-interruption",
    );
    const storage = createMemorySecureStorage();
    await saveAccountSession(storage, accountSession());
    let operationSequence = 90;
    let startSequence = 20;
    const gateway: RankedSessionGateway = {
      start: vi.fn(async (input) => {
        startSequence += 1;
        return rankedStartBody(input.operationId, input.modeKey, startSequence);
      }),
      abandon: vi.fn(async () => undefined),
    };
    const orchestrator = new RankedSessionOrchestrator({
      ownerKey: rankedOwner,
      identityEstablishedAtMs: 1_000,
      database,
      secureStorage: storage,
      gateway,
      workGate: new OwnerCleanupWorkGate(),
      clockSources: { wallNow: () => 11_000, performanceNow: () => 110 },
      createOperationId: () =>
        `ranked.start:${(++operationSequence).toString().padStart(24, "0")}`,
      createClientRecordId: () => "ranked-interrupted-restart-game",
    });
    const first = await orchestrator.startNewRankedSession(
      "standard_4x4_pow2_no_undo",
    );
    const staleSave = first.currentSave;
    const secureWrite = vi
      .spyOn(storage, "set")
      .mockRejectedValueOnce(new Error("strong_kill_after_remote_abandon"));

    await expect(orchestrator.restartRankedSession(first)).rejects.toThrow(
      "strong_kill_after_remote_abandon",
    );
    secureWrite.mockRestore();

    expect(gateway.abandon).toHaveBeenCalledTimes(1);
    expect(
      await database.getSave(rankedOwner, "standard_4x4_pow2_no_undo"),
    ).toEqual({ status: "missing" });
    await expect(database.putSave(staleSave)).rejects.toMatchObject({
      code: "save_game_closed",
    });
    expect(
      (await database.listOutbox(rankedOwner)).map((item) => item.kind),
    ).toEqual(["ranked.abandon"]);

    await orchestrator.resumePendingAbandons();

    expect(gateway.abandon).toHaveBeenCalledTimes(2);
    expect(await database.listOutbox(rankedOwner)).toEqual([]);
    expect((await loadAccountSession(storage))?.challengeRefs).toEqual([]);
  });
});
