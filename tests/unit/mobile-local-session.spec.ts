import { IDBFactory, IDBKeyRange } from "fake-indexeddb";
import { describe, expect, it } from "vitest";

import {
  APP_DATABASE_SCHEMA_VERSION,
  AppDatabase,
  type AppOwnerKey,
  type StoredGameSave,
} from "../../mobile/src/data/app-database";
import {
  openLocalSession,
  type LocalSessionOptions,
} from "../../mobile/src/game/guest-session";
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
    expect(
      await database.getSave(ownerKey, "classic_4x4_pow2_undo"),
    ).toEqual({ status: "missing" });
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
