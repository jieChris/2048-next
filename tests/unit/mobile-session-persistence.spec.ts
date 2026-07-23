import { IDBFactory, IDBKeyRange } from "fake-indexeddb";
import { describe, expect, it } from "vitest";

import {
  APP_DATABASE_SCHEMA_VERSION,
  AppDatabase,
  AppDatabaseError,
  type StoredGameSave,
} from "../../mobile/src/data/app-database";
import { GameSessionPersistence } from "../../mobile/src/game/session-persistence";
import { createEngineSession } from "../../src/core/engine";
import type { GameSnapshot } from "../../src/contracts";

type WriteResult = "written" | "unchanged" | "stale";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

function initialSave(revision = 0): StoredGameSave {
  const engine = createEngineSession({
    modeKey: "standard_4x4_pow2_no_undo",
    seed: 2048,
  });
  engine.init();
  return {
    schemaVersion: APP_DATABASE_SCHEMA_VERSION,
    ownerKey: "guest",
    modeKey: "standard_4x4_pow2_no_undo",
    clientRecordId: "guest-game-1",
    generation: 1,
    lifecycle: "active",
    gameKind: "normal",
    revision,
    lastClosedAt: 10,
    rankedSessionId: null,
    snapshot: engine.exportState(10),
  };
}

function snapshotExporter(
  save: StoredGameSave,
  exportedAt: number[] = [],
): [(atMs: number) => GameSnapshot, number[]] {
  return [
    (atMs) => {
      exportedAt.push(atMs);
      return {
        ...structuredClone(save.snapshot),
        savedAtMs: atMs,
      };
    },
    exportedAt,
  ];
}

describe("mobile game session persistence", () => {
  it("captures two rapid actions immediately and writes them in revision order", async () => {
    const save = initialSave();
    const [exportSnapshot, exportedAt] = snapshotExporter(save);
    const gates = [deferred<WriteResult>(), deferred<WriteResult>()];
    const started = [deferred<void>(), deferred<void>()];
    const writes: StoredGameSave[] = [];
    let activeWrites = 0;
    let maxActiveWrites = 0;
    const persistence = new GameSessionPersistence(save, exportSnapshot, {
      async putSave(nextSave) {
        const index = writes.length;
        writes.push(structuredClone(nextSave));
        activeWrites += 1;
        maxActiveWrites = Math.max(maxActiveWrites, activeWrites);
        started[index].resolve();
        try {
          return await gates[index].promise;
        } finally {
          activeWrites -= 1;
        }
      },
    });

    persistence.saveAction(20, 20);
    persistence.saveAction(30, 30);

    expect(exportedAt).toEqual([20, 30]);
    expect(persistence.currentSave).toMatchObject({
      revision: 2,
      lastClosedAt: 30,
      snapshot: { savedAtMs: 30 },
    });
    await started[0].promise;
    expect(writes.map((entry) => entry.revision)).toEqual([1]);
    gates[0].resolve("written");
    await started[1].promise;
    expect(writes.map((entry) => entry.revision)).toEqual([1, 2]);
    gates[1].resolve("written");

    await expect(persistence.idle).resolves.toBe("written");
    expect(writes.map((entry) => entry.lastClosedAt)).toEqual([20, 30]);
    expect(maxActiveWrites).toBe(1);
  });

  it("queues pause flush behind an action before taking its closing snapshot", async () => {
    const save = initialSave();
    const [exportSnapshot, exportedAt] = snapshotExporter(save);
    const firstWrite = deferred<WriteResult>();
    const firstStarted = deferred<void>();
    const secondStarted = deferred<void>();
    const writes: StoredGameSave[] = [];
    const persistence = new GameSessionPersistence(save, exportSnapshot, {
      async putSave(nextSave) {
        writes.push(structuredClone(nextSave));
        if (writes.length === 1) {
          firstStarted.resolve();
          return firstWrite.promise;
        }
        secondStarted.resolve();
        return "written";
      },
    });

    persistence.saveAction(20, 20);
    await firstStarted.promise;
    const flush = persistence.flush(50, 50);
    expect(() => persistence.saveAction(60, 60)).toThrow(
      "session_persistence_flushing",
    );

    await Promise.resolve();
    expect(exportedAt).toEqual([20]);
    expect(writes).toHaveLength(1);
    firstWrite.resolve("written");
    await secondStarted.promise;

    expect(exportedAt).toEqual([20, 50]);
    expect(writes[1]).toMatchObject({
      revision: 1,
      lastClosedAt: 50,
      snapshot: { savedAtMs: 50 },
    });
    await expect(flush).resolves.toBe("written");
    await expect(persistence.saveAction(60, 60)).resolves.toBe("written");
  });

  it("allows repeated flushes to advance closing time without a new revision", async () => {
    const save = initialSave(4);
    const [exportSnapshot] = snapshotExporter(save);
    const writes: StoredGameSave[] = [];
    const persistence = new GameSessionPersistence(save, exportSnapshot, {
      async putSave(nextSave) {
        writes.push(structuredClone(nextSave));
        return "written";
      },
    });

    await expect(
      Promise.all([persistence.flush(100, 100), persistence.flush(200, 200)]),
    ).resolves.toEqual(["written", "written"]);

    expect(
      writes.map(({ revision, lastClosedAt, snapshot }) => ({
        revision,
        lastClosedAt,
        savedAtMs: snapshot.savedAtMs,
      })),
    ).toEqual([
      { revision: 4, lastClosedAt: 100, savedAtMs: 100 },
      { revision: 4, lastClosedAt: 200, savedAtMs: 200 },
    ]);
    expect(persistence.currentSave).toMatchObject({
      revision: 4,
      lastClosedAt: 200,
      snapshot: { savedAtMs: 200 },
    });
  });

  it("accepts an unchanged idempotent flush without retiring the session", async () => {
    const save = initialSave();
    const [exportSnapshot] = snapshotExporter(save);
    const writes: StoredGameSave[] = [];
    const persistence = new GameSessionPersistence(save, exportSnapshot, {
      async putSave(nextSave) {
        writes.push(structuredClone(nextSave));
        return writes.length === 1 ? "unchanged" : "written";
      },
    });

    await expect(persistence.flush(10, 10)).resolves.toBe("unchanged");
    await expect(persistence.saveAction(20, 20)).resolves.toBe("written");
    expect(writes.map((entry) => entry.revision)).toEqual([0, 1]);
  });

  it("recovers the write chain by retrying the current revision after a failure", async () => {
    const save = initialSave();
    const [exportSnapshot] = snapshotExporter(save);
    const writes: StoredGameSave[] = [];
    const persistence = new GameSessionPersistence(save, exportSnapshot, {
      async putSave(nextSave) {
        writes.push(structuredClone(nextSave));
        if (writes.length === 1) throw new Error("disk unavailable");
        return "written";
      },
    });

    persistence.saveAction(20, 20);
    await expect(persistence.idle).rejects.toThrow("disk unavailable");
    await expect(persistence.flush(40, 40)).resolves.toBe("written");

    expect(
      writes.map(({ revision, lastClosedAt, snapshot }) => ({
        revision,
        lastClosedAt,
        savedAtMs: snapshot.savedAtMs,
      })),
    ).toEqual([
      { revision: 1, lastClosedAt: 20, savedAtMs: 20 },
      { revision: 1, lastClosedAt: 40, savedAtMs: 40 },
    ]);
  });

  it("loses ownership on the first stale write and never writes from that instance again", async () => {
    const save = initialSave();
    const [exportSnapshot] = snapshotExporter(save);
    const writes: StoredGameSave[] = [];
    const persistence = new GameSessionPersistence(save, exportSnapshot, {
      async putSave(nextSave) {
        writes.push(structuredClone(nextSave));
        return writes.length === 1 ? "stale" : "written";
      },
    });

    persistence.saveAction(20, 20);
    await expect(persistence.idle).rejects.toThrow(
      "session_persistence_ownership_lost",
    );
    expect(() => persistence.saveAction(30, 30)).toThrow(
      "session_persistence_ownership_lost",
    );
    await expect(persistence.flush(30, 30)).rejects.toThrow(
      "session_persistence_ownership_lost",
    );

    expect(writes.map((entry) => entry.revision)).toEqual([1]);
    expect(persistence.currentSave.revision).toBe(1);
  });

  it("cancels already queued writes after the first stale ownership result", async () => {
    const save = initialSave();
    const [exportSnapshot] = snapshotExporter(save);
    const firstWrite = deferred<WriteResult>();
    const writes: StoredGameSave[] = [];
    const persistence = new GameSessionPersistence(save, exportSnapshot, {
      async putSave(nextSave) {
        writes.push(structuredClone(nextSave));
        return firstWrite.promise;
      },
    });

    const first = persistence.saveAction(20, 20);
    const second = persistence.saveAction(30, 30);
    firstWrite.resolve("stale");

    await expect(first).rejects.toThrow("session_persistence_ownership_lost");
    await expect(second).rejects.toThrow("session_persistence_ownership_lost");
    expect(writes.map((entry) => entry.revision)).toEqual([1]);
  });

  it("retires the session and cancels queued writes when owner cleanup starts", async () => {
    const save = initialSave();
    const [exportSnapshot] = snapshotExporter(save);
    let writeCount = 0;
    const persistence = new GameSessionPersistence(save, exportSnapshot, {
      async putSave() {
        writeCount += 1;
        throw new AppDatabaseError("owner_clearing");
      },
    });

    const first = persistence.saveAction(20, 20);
    const second = persistence.saveAction(30, 30);

    await expect(first).rejects.toThrow("session_persistence_ownership_lost");
    await expect(second).rejects.toThrow("session_persistence_ownership_lost");
    expect(writeCount).toBe(1);
    await expect(persistence.flush(40, 40)).rejects.toThrow(
      "session_persistence_ownership_lost",
    );
  });

  it("rejects work after deactivation while allowing the queued stale write to finish", async () => {
    const save = initialSave();
    const [exportSnapshot, exportedAt] = snapshotExporter(save);
    const write = deferred<WriteResult>();
    const started = deferred<void>();
    const writes: StoredGameSave[] = [];
    const persistence = new GameSessionPersistence(save, exportSnapshot, {
      async putSave(nextSave) {
        writes.push(structuredClone(nextSave));
        started.resolve();
        return write.promise;
      },
    });

    persistence.saveAction(20, 20);
    await started.promise;
    persistence.deactivate();

    expect(() => persistence.saveAction(30, 30)).toThrow(
      "session_persistence_inactive",
    );
    await expect(persistence.flush(40, 40)).rejects.toThrow(
      "session_persistence_inactive",
    );
    expect(exportedAt).toEqual([20]);
    expect(writes).toHaveLength(1);
    write.resolve("written");
    await expect(persistence.idle).resolves.toBe("written");
  });

  it("uses every persisted time relation as the initial rollback lower bound", async () => {
    const save = initialSave();
    save.lastClosedAt = 10_000;
    save.snapshot.savedAtMs = 30;
    save.snapshot.state.startedAtMs = 100;
    save.snapshot.state.lastEventAtMs = 140;
    save.snapshot.state.durationMs = 50;
    const [exportSnapshot] = snapshotExporter(save);
    const writes: StoredGameSave[] = [];
    const persistence = new GameSessionPersistence(save, exportSnapshot, {
      async putSave(nextSave) {
        writes.push(structuredClone(nextSave));
        return "written";
      },
    });

    expect(() => persistence.saveAction(149, 149)).toThrow(
      "session_persistence_timestamp_rollback",
    );
    await expect(persistence.flush(149, 149)).rejects.toThrow(
      "session_persistence_timestamp_rollback",
    );
    await expect(persistence.saveAction(150, 9_000)).resolves.toBe("written");
    expect(writes[0]).toMatchObject({
      lastClosedAt: 10_000,
      snapshot: { savedAtMs: 150 },
    });
  });

  it("rejects timestamp rollback and protects current save snapshots from mutation", async () => {
    const save = initialSave(2);
    const [exportSnapshot] = snapshotExporter(save);
    const persistence = new GameSessionPersistence(save, exportSnapshot, {
      async putSave() {
        return "written";
      },
    });

    const exposed = persistence.currentSave;
    exposed.snapshot.state.board[0][0] = 65_536;
    expect(persistence.currentSave.snapshot.state.board[0][0]).not.toBe(65_536);
    expect(() => persistence.saveAction(9, 9)).toThrow(
      "session_persistence_timestamp_rollback",
    );
    await expect(persistence.flush(9, 9)).rejects.toThrow(
      "session_persistence_timestamp_rollback",
    );
    expect(persistence.currentSave.revision).toBe(2);

    const closing = persistence.flush(20, 20);
    await expect(persistence.flush(19, 19)).rejects.toThrow(
      "session_persistence_timestamp_rollback",
    );
    await expect(closing).resolves.toBe("written");
  });

  it("persists actions and idempotent lifecycle flushes through AppDatabase", async () => {
    const factory = new IDBFactory();
    const database = new AppDatabase({
      factory,
      keyRange: IDBKeyRange,
      name: "session-persistence-integration",
    });
    const engine = createEngineSession({
      modeKey: "standard_4x4_pow2_no_undo",
      seed: 2048,
    });
    engine.init({
      board: [
        [2, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ],
    });
    const save: StoredGameSave = {
      ...initialSave(),
      snapshot: engine.exportState(10),
    };
    await database.putSave(save);
    const persistence = new GameSessionPersistence(
      save,
      (atMs) => engine.exportState(atMs),
      database,
    );

    expect(engine.move({ direction: 1, atMs: 20 }).moved).toBe(true);
    await expect(persistence.saveAction(20, 1_020)).resolves.toBe("written");
    await expect(persistence.flush(20, 1_020)).resolves.toBe("unchanged");
    expect(engine.move({ direction: 3, atMs: 30 }).moved).toBe(true);
    await expect(persistence.saveAction(30, 1_030)).resolves.toBe("written");
    await expect(persistence.flush(40, 1_040)).resolves.toBe("written");

    const stored = await database.getSave("guest", "standard_4x4_pow2_no_undo");
    expect(stored).toMatchObject({
      status: "ok",
      save: {
        revision: 2,
        lastClosedAt: 1_040,
        snapshot: {
          savedAtMs: 40,
          state: { steps: 2, lastEventAtMs: 30 },
        },
      },
    });
  });

  it("prevents a stale persistence instance from overtaking a newer one", async () => {
    const factory = new IDBFactory();
    const database = new AppDatabase({
      factory,
      keyRange: IDBKeyRange,
      name: "session-persistence-competing-instances",
    });
    const save = initialSave();
    await database.putSave(save);
    const [exportNewer] = snapshotExporter(save);
    const [exportOlder] = snapshotExporter(save);
    const newer = new GameSessionPersistence(save, exportNewer, database);
    const older = new GameSessionPersistence(save, exportOlder, database);

    await expect(newer.saveAction(20, 20)).resolves.toBe("written");
    await expect(newer.saveAction(30, 30)).resolves.toBe("written");
    await expect(older.saveAction(25, 25)).rejects.toThrow(
      "session_persistence_ownership_lost",
    );
    expect(() => older.saveAction(40, 40)).toThrow(
      "session_persistence_ownership_lost",
    );

    const stored = await database.getSave("guest", "standard_4x4_pow2_no_undo");
    expect(stored).toMatchObject({
      status: "ok",
      save: { revision: 2, lastClosedAt: 30 },
    });
  });

  it("permanently retires the losing side of a same-revision database fork", async () => {
    const factory = new IDBFactory();
    const database = new AppDatabase({
      factory,
      keyRange: IDBKeyRange,
      name: "session-persistence-revision-fork",
    });
    const createForkEngine = () => {
      const engine = createEngineSession({
        modeKey: "standard_4x4_pow2_no_undo",
        seed: 4096,
      });
      engine.init({
        board: [
          [0, 2, 0, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0],
        ],
      });
      return engine;
    };
    const winningEngine = createForkEngine();
    const losingEngine = createForkEngine();
    const save: StoredGameSave = {
      ...initialSave(),
      snapshot: winningEngine.exportState(10),
    };
    await database.putSave(save);
    const winner = new GameSessionPersistence(
      save,
      (atMs) => winningEngine.exportState(atMs),
      database,
    );
    const loser = new GameSessionPersistence(
      save,
      (atMs) => losingEngine.exportState(atMs),
      database,
    );

    expect(winningEngine.move({ direction: 3, atMs: 20 }).moved).toBe(true);
    expect(losingEngine.move({ direction: 1, atMs: 20 }).moved).toBe(true);
    const winningState = winningEngine.exportState(20).state;
    await expect(winner.saveAction(20, 20)).resolves.toBe("written");
    await expect(loser.saveAction(20, 20)).rejects.toThrow(
      "session_persistence_ownership_lost",
    );
    expect(() => loser.saveAction(30, 30)).toThrow(
      "session_persistence_ownership_lost",
    );

    const stored = await database.getSave("guest", "standard_4x4_pow2_no_undo");
    expect(stored).toMatchObject({
      status: "ok",
      save: {
        revision: 1,
        lastClosedAt: 20,
        snapshot: { state: winningState },
      },
    });
  });
});
