import { IDBFactory, IDBKeyRange } from "fake-indexeddb";
import { describe, expect, it } from "vitest";

import {
  APP_DATABASE_SCHEMA_VERSION,
  AppDatabase,
  type AppDatabaseOptions,
  type StoredGameSave,
} from "../../mobile/src/data/app-database";
import {
  GUEST_STANDARD_MODE_KEY,
  openGuestStandardSession,
  type GuestSessionDatabase,
} from "../../mobile/src/game/guest-session";
import { createEngineSession } from "../../src/core/engine";

let databaseSequence = 0;

function createDatabase(
  label: string,
  options: Omit<AppDatabaseOptions, "name" | "factory" | "keyRange"> = {},
): { database: AppDatabase; factory: IDBFactory; name: string } {
  databaseSequence += 1;
  const factory = new IDBFactory();
  const name = `guest-session-${label}-${databaseSequence}`;
  return {
    database: new AppDatabase({
      ...options,
      name,
      factory,
      keyRange: IDBKeyRange,
    }),
    factory,
    name,
  };
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

function deterministicIdentity(ids: string[] = ["guest-game-next"]) {
  let index = 0;
  return {
    createClientRecordId: () => ids[index++] ?? `guest-game-${index}`,
    createSeed: () => 2_048 + index,
  };
}

async function seedSave(
  database: AppDatabase,
  options: {
    board?: number[][];
    clientRecordId?: string;
    revision?: number;
    savedAt?: number;
    steps?: number;
  } = {},
): Promise<StoredGameSave> {
  const savedAt = options.savedAt ?? 1_000;
  const engine = createEngineSession({
    modeKey: GUEST_STANDARD_MODE_KEY,
    seed: 77,
  });
  engine.init({
    ...(options.board ? { board: options.board } : {}),
    ...(options.steps === undefined ? {} : { steps: options.steps }),
  });
  return database.startNewGame({
    schemaVersion: APP_DATABASE_SCHEMA_VERSION,
    ownerKey: "guest",
    modeKey: GUEST_STANDARD_MODE_KEY,
    clientRecordId: options.clientRecordId ?? "guest-game-existing",
    lifecycle: "active",
    gameKind: "normal",
    revision: options.revision ?? 0,
    lastClosedAt: savedAt,
    rankedSessionId: null,
    snapshot: engine.exportState(savedAt),
  });
}

function portWithOverrides(
  database: AppDatabase,
  overrides: Partial<GuestSessionDatabase>,
): GuestSessionDatabase {
  return {
    getSave: database.getSave.bind(database),
    startNewGame: database.startNewGame.bind(database),
    putSave: database.putSave.bind(database),
    deleteSave: database.deleteSave.bind(database),
    finalizeTerminal: database.finalizeTerminal.bind(database),
    ...overrides,
  };
}

async function rewriteSave(
  factory: IDBFactory,
  name: string,
  mutate: (row: Record<string, unknown>) => Record<string, unknown>,
): Promise<void> {
  const open = factory.open(name);
  const rawDatabase = await new Promise<IDBDatabase>((resolve, reject) => {
    open.onsuccess = () => resolve(open.result);
    open.onerror = () => reject(open.error);
  });
  const transaction = rawDatabase.transaction("saves", "readwrite");
  const store = transaction.objectStore("saves");
  const get = store.get(["guest", GUEST_STANDARD_MODE_KEY]);
  const row = await new Promise<Record<string, unknown>>((resolve, reject) => {
    get.onsuccess = () => resolve(get.result as Record<string, unknown>);
    get.onerror = () => reject(get.error);
  });
  store.put(mutate(row));
  await new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
  rawDatabase.close();
}

describe("mobile guest standard session", () => {
  it("creates generation one and restores the last committed move and clock", async () => {
    const { database } = createDatabase("create-restore");
    const time = createTime();
    const identity = deterministicIdentity(["guest-game-created"]);

    const created = await openGuestStandardSession({
      database,
      clockSources: time.sources,
      ...identity,
    });
    expect(created.status).toBe("ready");
    if (created.status !== "ready") return;
    expect(created.restored).toBe(false);
    expect(created.session.currentSave).toMatchObject({
      clientRecordId: "guest-game-created",
      generation: 1,
      revision: 0,
    });

    const board = created.session.state.board;
    const occupied = board.flat().filter(Boolean).length;
    expect(occupied).toBe(2);
    time.advance(25);
    const direction = board.some((row) => row[0] > 0) ? 1 : 3;
    let moved = created.session.move(direction);
    if (!moved.transition.moved) {
      moved = created.session.move(direction === 1 ? 2 : 0);
    }
    expect(moved.transition.moved).toBe(true);
    await moved.save;
    await created.session.flush();
    const expectedState = created.session.state;

    time.advance(100);
    const restored = await openGuestStandardSession({
      database,
      clockSources: time.sources,
      ...deterministicIdentity(["must-not-be-used"]),
    });
    expect(restored.status).toBe("ready");
    if (restored.status !== "ready") return;
    expect(restored.restored).toBe(true);
    expect(restored.session.state).toEqual(expectedState);
    expect(restored.session.currentSave.revision).toBe(1);
    expect(restored.session.elapsedMs()).toBeGreaterThanOrEqual(
      expectedState.durationMs + 100,
    );
  });

  it("does not persist an invalid move and respects independent input fences", async () => {
    const { database } = createDatabase("invalid-fence");
    await seedSave(database, {
      board: [
        [2, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ],
    });
    const opened = await openGuestStandardSession({ database });
    expect(opened.status).toBe("ready");
    if (opened.status !== "ready") return;

    const invalid = opened.session.move(3);
    expect(invalid.transition.moved).toBe(false);
    expect(invalid.save).toBeNull();
    expect(opened.session.currentSave.revision).toBe(0);

    opened.session.addInputFence("dialog");
    await opened.session.pause();
    opened.session.removeInputFence("dialog");
    expect(opened.session.inputFences).toEqual(new Set(["background"]));
    expect(() => opened.session.move(1)).toThrow("guest_session_input_locked");
    opened.session.resume();
    expect(opened.session.inputLocked).toBe(false);
  });

  it("finalizes without writing an active terminal save and checkpoints only once", async () => {
    const { database } = createDatabase("terminal-once");
    await seedSave(database, {
      board: [
        [2, 2, 8, 16],
        [32, 64, 128, 256],
        [64, 128, 256, 512],
        [128, 256, 512, 1024],
      ],
    });
    const savedSnapshots: StoredGameSave[] = [];
    const port = portWithOverrides(database, {
      async putSave(save) {
        savedSnapshots.push(structuredClone(save));
        return database.putSave(save);
      },
    });
    const opened = await openGuestStandardSession({ database: port });
    expect(opened.status).toBe("ready");
    if (opened.status !== "ready") return;

    const move = opened.session.move(3);
    expect(move.transition.gameOver).toBe(true);
    expect(move.save).toBeNull();
    const record = await move.terminal;
    expect(record?.source).toBe("guest");
    expect(savedSnapshots).toHaveLength(1);
    expect(savedSnapshots[0].snapshot.state.gameOver).toBe(false);
    expect(savedSnapshots[0].lifecycle).toBe("active");
    expect(await database.listRecords("guest")).toHaveLength(1);
    await expect(
      database.getSave("guest", GUEST_STANDARD_MODE_KEY),
    ).resolves.toEqual({ status: "missing" });
  });

  it("recovers the latest pre-terminal revision after every queued action write failed", async () => {
    const { database } = createDatabase("terminal-recovers-queue");
    const seenRevisions = new Set<number>();
    let repeatedCheckpointCalls = 0;
    const port = portWithOverrides(database, {
      async putSave(save) {
        if (!seenRevisions.has(save.revision)) {
          seenRevisions.add(save.revision);
          throw new Error(`queued_write_failed:${String(save.revision)}`);
        }
        repeatedCheckpointCalls += 1;
        return database.putSave(save);
      },
    });
    const opened = await openGuestStandardSession({
      database: port,
      ...deterministicIdentity(["guest-game-queue-recovery"]),
    });
    expect(opened.status).toBe("ready");
    if (opened.status !== "ready") return;

    let terminal: Promise<unknown> | null = null;
    const directions = [0, 1, 2, 3] as const;
    for (let index = 0; index < 5_000 && !terminal; index += 1) {
      terminal = opened.session.move(
        directions[index % directions.length],
      ).terminal;
    }

    expect(terminal).not.toBeNull();
    await expect(terminal).resolves.toMatchObject({
      clientRecordId: "guest-game-queue-recovery",
    });
    expect(seenRevisions.size).toBeGreaterThan(0);
    expect(repeatedCheckpointCalls).toBe(1);
    expect(await database.listRecords("guest")).toHaveLength(1);
  });

  it("retries an unknown finalize result with the same frozen record and no second checkpoint", async () => {
    const { database } = createDatabase("terminal-unknown");
    await seedSave(database, {
      board: [
        [2, 2, 8, 16],
        [32, 64, 128, 256],
        [64, 128, 256, 512],
        [128, 256, 512, 1024],
      ],
    });
    let checkpointCalls = 0;
    let finalizeCalls = 0;
    const finalizedPayloads: string[] = [];
    const port = portWithOverrides(database, {
      async putSave(save) {
        checkpointCalls += 1;
        return database.putSave(save);
      },
      async finalizeTerminal(input) {
        finalizeCalls += 1;
        finalizedPayloads.push(JSON.stringify(input.record));
        const result = await database.finalizeTerminal(input);
        if (finalizeCalls === 1) throw new Error("commit_result_unknown");
        return result;
      },
    });
    const opened = await openGuestStandardSession({ database: port });
    expect(opened.status).toBe("ready");
    if (opened.status !== "ready") return;

    const move = opened.session.move(3);
    await expect(move.terminal).rejects.toThrow("commit_result_unknown");
    const frozen = opened.session.terminalRecord;
    await expect(opened.session.finalizeTerminal()).resolves.toEqual(frozen);

    expect(checkpointCalls).toBe(1);
    expect(finalizeCalls).toBe(2);
    expect(new Set(finalizedPayloads).size).toBe(1);
    expect(await database.listRecords("guest")).toEqual([frozen]);
  });

  it("retries an unknown pre-terminal checkpoint before the first finalize", async () => {
    const { database } = createDatabase("checkpoint-unknown");
    await seedSave(database, {
      board: [
        [2, 2, 8, 16],
        [32, 64, 128, 256],
        [64, 128, 256, 512],
        [128, 256, 512, 1024],
      ],
    });
    let checkpointCalls = 0;
    let finalizeCalls = 0;
    const port = portWithOverrides(database, {
      async putSave(save) {
        checkpointCalls += 1;
        const result = await database.putSave(save);
        if (checkpointCalls === 1) throw new Error("checkpoint_result_unknown");
        return result;
      },
      async finalizeTerminal(input) {
        finalizeCalls += 1;
        return database.finalizeTerminal(input);
      },
    });
    const opened = await openGuestStandardSession({ database: port });
    expect(opened.status).toBe("ready");
    if (opened.status !== "ready") return;

    const move = opened.session.move(3);
    await expect(move.terminal).rejects.toThrow("checkpoint_result_unknown");
    const frozen = opened.session.terminalRecord;
    await expect(opened.session.finalizeTerminal()).resolves.toEqual(frozen);

    expect(checkpointCalls).toBe(2);
    expect(finalizeCalls).toBe(1);
    expect(await database.listRecords("guest")).toEqual([frozen]);
  });

  it("starts the next generation after finalization without deleting the closed head", async () => {
    const { database } = createDatabase("terminal-restart");
    await seedSave(database, {
      clientRecordId: "guest-game-terminal",
      board: [
        [2, 2, 8, 16],
        [32, 64, 128, 256],
        [64, 128, 256, 512],
        [128, 256, 512, 1024],
      ],
    });
    let deleteCalls = 0;
    const port = portWithOverrides(database, {
      async deleteSave(input) {
        deleteCalls += 1;
        return database.deleteSave(input);
      },
    });
    const opened = await openGuestStandardSession({
      database: port,
      ...deterministicIdentity(["guest-game-after-terminal"]),
    });
    expect(opened.status).toBe("ready");
    if (opened.status !== "ready") return;

    await opened.session.move(3).terminal;
    const replacement = await opened.session.restart();

    expect(deleteCalls).toBe(0);
    expect(replacement.currentSave).toMatchObject({
      clientRecordId: "guest-game-after-terminal",
      generation: 2,
    });
    expect(await database.listRecords("guest")).toHaveLength(1);
  });

  it("rejects restart after ownership loss without deleting the newer save", async () => {
    const { database } = createDatabase("restart-ownership-lost");
    await seedSave(database, {
      clientRecordId: "guest-game-shared",
      board: [
        [2, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ],
    });
    let deleteCalls = 0;
    let startCalls = 0;
    const port = portWithOverrides(database, {
      async deleteSave(input) {
        deleteCalls += 1;
        return database.deleteSave(input);
      },
      async startNewGame(input) {
        startCalls += 1;
        return database.startNewGame(input);
      },
    });
    const first = await openGuestStandardSession({ database: port });
    const second = await openGuestStandardSession({
      database: port,
      ...deterministicIdentity(["must-not-start"]),
    });
    expect(first.status).toBe("ready");
    expect(second.status).toBe("ready");
    if (first.status !== "ready" || second.status !== "ready") return;

    const firstMove = first.session.move(1);
    if (!firstMove.save) throw new Error("first move did not persist");
    await firstMove.save;
    const secondMove = second.session.move(2);
    if (!secondMove.save) throw new Error("second move did not persist");
    await expect(secondMove.save).rejects.toThrow(
      "session_persistence_ownership_lost",
    );

    await expect(second.session.restart()).rejects.toThrow(
      "guest_session_ownership_lost",
    );
    expect(deleteCalls).toBe(0);
    expect(startCalls).toBe(0);
    await expect(
      database.getSave("guest", GUEST_STANDARD_MODE_KEY),
    ).resolves.toMatchObject({
      status: "ok",
      save: {
        clientRecordId: "guest-game-shared",
        generation: 1,
        revision: 1,
      },
    });
  });

  it("restarts through the checked close and allocates a new generation without history", async () => {
    const { database } = createDatabase("restart");
    await seedSave(database, {
      clientRecordId: "guest-game-old",
      steps: 1,
    });
    const opened = await openGuestStandardSession({
      database,
      ...deterministicIdentity(["guest-game-new"]),
    });
    expect(opened.status).toBe("ready");
    if (opened.status !== "ready") return;
    expect(opened.session.hasEffectiveMove).toBe(true);

    const replacement = await opened.session.restart();
    expect(replacement.currentSave).toMatchObject({
      clientRecordId: "guest-game-new",
      generation: 2,
      revision: 0,
    });
    expect(replacement.state.steps).toBe(0);
    expect(await database.listRecords("guest")).toEqual([]);
  });

  it("retries a committed old-save close with the same frozen replacement plan", async () => {
    const { database } = createDatabase("restart-delete-unknown");
    await seedSave(database, { clientRecordId: "guest-game-delete-old" });
    let deleteCalls = 0;
    let startCalls = 0;
    let idCalls = 0;
    let seedCalls = 0;
    const port = portWithOverrides(database, {
      async deleteSave(input) {
        deleteCalls += 1;
        const result = await database.deleteSave(input);
        if (deleteCalls === 1) throw new Error("delete_result_unknown");
        return result;
      },
      async startNewGame(input) {
        startCalls += 1;
        return database.startNewGame(input);
      },
    });
    const opened = await openGuestStandardSession({
      database: port,
      createClientRecordId() {
        idCalls += 1;
        return `guest-game-delete-${String(idCalls)}`;
      },
      createSeed() {
        seedCalls += 1;
        return 8_192 + seedCalls;
      },
    });
    expect(opened.status).toBe("ready");
    if (opened.status !== "ready") return;

    await expect(opened.session.restart()).rejects.toThrow(
      "delete_result_unknown",
    );
    await expect(
      database.getSave("guest", GUEST_STANDARD_MODE_KEY),
    ).resolves.toEqual({ status: "missing" });
    const replacement = await opened.session.restart();

    expect(deleteCalls).toBe(2);
    expect(startCalls).toBe(1);
    expect(idCalls).toBe(1);
    expect(seedCalls).toBe(1);
    expect(replacement.currentSave).toMatchObject({
      clientRecordId: "guest-game-delete-1",
      generation: 2,
    });
    expect(await database.listRecords("guest")).toEqual([]);
  });

  it("retries the same replacement plan when new-game creation fails after closing the old save", async () => {
    const { database } = createDatabase("restart-create-failure");
    await seedSave(database, { clientRecordId: "guest-game-retry-old" });
    let deleteCalls = 0;
    let startCalls = 0;
    let idCalls = 0;
    let seedCalls = 0;
    const startInputs: Array<
      Parameters<GuestSessionDatabase["startNewGame"]>[0]
    > = [];
    const port = portWithOverrides(database, {
      async deleteSave(input) {
        deleteCalls += 1;
        return database.deleteSave(input);
      },
      async startNewGame(input) {
        startCalls += 1;
        startInputs.push(structuredClone(input));
        if (startCalls === 1) throw new Error("start_new_game_failed");
        return database.startNewGame(input);
      },
    });
    const opened = await openGuestStandardSession({
      database: port,
      createClientRecordId() {
        idCalls += 1;
        return `guest-game-retry-${String(idCalls)}`;
      },
      createSeed() {
        seedCalls += 1;
        return 4_096 + seedCalls;
      },
    });
    expect(opened.status).toBe("ready");
    if (opened.status !== "ready") return;

    await expect(opened.session.restart()).rejects.toThrow(
      "start_new_game_failed",
    );
    await expect(
      database.getSave("guest", GUEST_STANDARD_MODE_KEY),
    ).resolves.toEqual({ status: "missing" });
    const replacement = await opened.session.restart();

    expect(deleteCalls).toBe(1);
    expect(startCalls).toBe(2);
    expect(idCalls).toBe(1);
    expect(seedCalls).toBe(1);
    expect(startInputs[1]).toEqual(startInputs[0]);
    expect(replacement.currentSave).toMatchObject({
      clientRecordId: "guest-game-retry-1",
      generation: 2,
    });
  });

  it("reconciles a committed new game when startNewGame reports an unknown result", async () => {
    const { database } = createDatabase("restart-create-unknown");
    await seedSave(database, { clientRecordId: "guest-game-unknown-old" });
    let startCalls = 0;
    const port = portWithOverrides(database, {
      async startNewGame(input) {
        startCalls += 1;
        const save = await database.startNewGame(input);
        if (startCalls === 1) throw new Error("start_new_game_result_unknown");
        return save;
      },
    });
    const opened = await openGuestStandardSession({
      database: port,
      ...deterministicIdentity(["guest-game-unknown-new"]),
    });
    expect(opened.status).toBe("ready");
    if (opened.status !== "ready") return;

    const replacement = await opened.session.restart();

    expect(startCalls).toBe(1);
    expect(replacement.currentSave).toMatchObject({
      clientRecordId: "guest-game-unknown-new",
      generation: 2,
    });
  });

  it.each([
    [
      "future_schema",
      (row: Record<string, unknown>) => ({ ...row, schemaVersion: 99 }),
    ],
    [
      "corrupt",
      (row: Record<string, unknown>) => ({
        ...row,
        snapshot: { version: 1, savedAtMs: 1_000, state: null },
      }),
    ],
  ])("preserves a %s save instead of replacing it", async (status, mutate) => {
    const { database, factory, name } = createDatabase(`preserve-${status}`);
    await seedSave(database);
    await database.close();
    await rewriteSave(factory, name, mutate);

    const opened = await openGuestStandardSession({
      database,
      ...deterministicIdentity(["must-not-replace"]),
    });
    expect(opened.status).toBe(status);
    expect(
      (await database.getSave("guest", GUEST_STANDARD_MODE_KEY)).status,
    ).toBe(status);
  });
});
