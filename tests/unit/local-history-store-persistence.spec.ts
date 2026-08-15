import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";

import { describe, expect, it } from "vitest";

const scriptSource = readFileSync(
  path.resolve(process.cwd(), "js/local_history_store.js"),
  "utf8"
);

const HISTORY_KEY = "local_game_history_v1";
const MIGRATION_KEY = "idb_history_migrated_v1";

class MemoryStorage {
  readonly values = new Map<string, string>();
  failHistoryWrites = false;
  failHistoryReads = false;
  historyWriteAttempts = 0;
  afterNextHistoryRead: (() => void) | null = null;

  getItem(key: string): string | null {
    if (this.failHistoryReads && key === HISTORY_KEY) {
      const error = new Error("storage read denied");
      error.name = "SecurityError";
      throw error;
    }
    const value = this.values.has(key) ? this.values.get(key) || "" : null;
    if (key === HISTORY_KEY && this.afterNextHistoryRead) {
      const callback = this.afterNextHistoryRead;
      this.afterNextHistoryRead = null;
      callback();
    }
    return value;
  }

  setItem(key: string, value: string): void {
    if (key === HISTORY_KEY) this.historyWriteAttempts += 1;
    if (this.failHistoryWrites && key === HISTORY_KEY) {
      const error = new Error("quota exceeded");
      error.name = "QuotaExceededError";
      throw error;
    }
    this.values.set(key, String(value));
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

function createIndexedDbStub(
  options: { failDataTransactions?: boolean; manualDataTransactions?: boolean } = {}
) {
  const records = new Map<string, Record<string, unknown>>();
  const pendingDataTransactions: Array<Record<string, unknown>> = [];
  let created = false;

  const indexNames = { contains: () => false };
  const store = {
    indexNames,
    createIndex: () => undefined,
    openCursor() {
      const request: Record<string, unknown> = {};
      queueMicrotask(() => {
        request.result = null;
        (request.onsuccess as (() => void) | undefined)?.();
      });
      return request;
    },
    put(value: Record<string, unknown>) {
      records.set(String(value.id), structuredClone(value));
      return {};
    }
  };

  const db = {
    objectStoreNames: {
      contains: () => created
    },
    createObjectStore() {
      created = true;
      return store;
    },
    transaction(...args: unknown[]) {
      const transaction: Record<string, unknown> = {
        objectStore: () => store
      };
      if (options.manualDataTransactions && args.length > 0) {
        pendingDataTransactions.push(transaction);
        return transaction;
      }
      setTimeout(() => {
        if (options.failDataTransactions && args.length > 0) {
          transaction.error = new Error("transaction aborted");
          (transaction.onabort as (() => void) | undefined)?.();
          return;
        }
        (transaction.oncomplete as (() => void) | undefined)?.();
      }, 0);
      return transaction;
    }
  };

  return {
    records,
    pendingDataTransactions,
    settleNextDataTransaction(outcome: "complete" | "abort") {
      const transaction = pendingDataTransactions.shift();
      if (!transaction) throw new Error("no_pending_data_transaction");
      if (outcome === "abort") {
        transaction.error = new Error("transaction aborted");
        (transaction.onabort as (() => void) | undefined)?.();
        return;
      }
      (transaction.oncomplete as (() => void) | undefined)?.();
    },
    indexedDB: {
      open() {
        const request: Record<string, unknown> = {};
        queueMicrotask(() => {
          request.result = db;
          if (!created) {
            request.transaction = db.transaction();
            (request.onupgradeneeded as (() => void) | undefined)?.();
          }
          (request.onsuccess as (() => void) | undefined)?.();
        });
        return request;
      }
    }
  };
}

async function waitFor(condition: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (condition()) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error("condition_not_reached");
}

function loadStore(options: { storage?: MemoryStorage; indexedDB?: unknown } = {}) {
  const storage = options.storage || new MemoryStorage();
  const context: Record<string, unknown> = {
    Blob,
    Date,
    JSON,
    Math,
    Object,
    Promise,
    URL,
    console,
    localStorage: storage,
    indexedDB: options.indexedDB,
    queueMicrotask,
    setTimeout,
    clearTimeout
  };
  context.window = context;
  vm.runInNewContext(scriptSource, context, { filename: "local_history_store.js" });
  return {
    storage,
    store: context.LocalHistoryStore as {
      ensureMigrated: () => Promise<number>;
      saveRecord: (record: Record<string, unknown>) => Record<string, unknown> | null;
      saveRecordAsync: (record: Record<string, unknown>) => Promise<Record<string, unknown>>;
      listRecords: (options?: Record<string, unknown>) => { items: Record<string, unknown>[] };
      listRecordsAsync: (
        options?: Record<string, unknown>
      ) => Promise<{ items: Record<string, unknown>[] }>;
      importRecords: (text: string) => Record<string, unknown>;
      importRecordsAsync: (text: string) => Promise<Record<string, unknown>>;
    }
  };
}

function createRecord(id: string, score = 1024) {
  return {
    id,
    mode_key: "board_5x5_pow2_no_undo",
    score,
    ended_at: "2026-08-03T00:00:00.000Z",
    replay_string: `replay-${id}`
  };
}

describe("local history durable persistence", () => {
  it("removes the full localStorage mirror only after IndexedDB migration commits", async () => {
    const storage = new MemoryStorage();
    storage.setItem(HISTORY_KEY, JSON.stringify([createRecord("legacy-record")]));
    const indexedDb = createIndexedDbStub();
    const runtime = loadStore({ storage, indexedDB: indexedDb.indexedDB });

    await runtime.store.ensureMigrated();

    expect(indexedDb.records.has("legacy-record")).toBe(true);
    expect(storage.getItem(HISTORY_KEY)).toBeNull();
    expect(storage.getItem(MIGRATION_KEY)).toBe("1");
  });

  it("treats a committed IndexedDB record as success without rebuilding the localStorage mirror", async () => {
    const storage = new MemoryStorage();
    const indexedDb = createIndexedDbStub();
    const runtime = loadStore({ storage, indexedDB: indexedDb.indexedDB });
    await runtime.store.ensureMigrated();
    storage.historyWriteAttempts = 0;
    storage.failHistoryWrites = true;

    await expect(runtime.store.saveRecordAsync(createRecord("idb-record"))).resolves.toMatchObject({
      id: "idb-record"
    });
    expect(indexedDb.records.has("idb-record")).toBe(true);
    expect(storage.historyWriteAttempts).toBe(0);
    expect(storage.getItem(HISTORY_KEY)).toBeNull();
  });

  it("rejects with the storage error when neither IndexedDB nor the fallback can persist", async () => {
    const storage = new MemoryStorage();
    storage.failHistoryWrites = true;
    const runtime = loadStore({ storage });

    await expect(runtime.store.saveRecordAsync(createRecord("quota-record"))).rejects.toMatchObject({
      name: "QuotaExceededError"
    });
    expect(runtime.store.saveRecord(createRecord("sync-quota-record"))).toBeNull();
  });

  it("preserves unverified legacy payloads instead of deleting them during migration", async () => {
    const storage = new MemoryStorage();
    storage.setItem(HISTORY_KEY, "{broken");
    const indexedDb = createIndexedDbStub();
    const runtime = loadStore({ storage, indexedDB: indexedDb.indexedDB });

    await runtime.store.ensureMigrated();

    expect(storage.getItem(HISTORY_KEY)).toBe("{broken");
    expect(storage.getItem(MIGRATION_KEY)).toBeNull();
    expect(indexedDb.records.size).toBe(0);
  });

  it("refuses to overwrite an invalid fallback when IndexedDB is unavailable", async () => {
    const storage = new MemoryStorage();
    storage.setItem(HISTORY_KEY, "{broken");
    const runtime = loadStore({ storage });

    await expect(runtime.store.saveRecordAsync(createRecord("new-record"))).rejects.toMatchObject({
      name: "InvalidFallbackError"
    });
    expect(runtime.store.saveRecord(createRecord("compat-record"))).toBeNull();
    expect(storage.getItem(HISTORY_KEY)).toBe("{broken");
  });

  it("refuses to overwrite an unreadable fallback when IndexedDB is unavailable", async () => {
    const storage = new MemoryStorage();
    storage.values.set(HISTORY_KEY, JSON.stringify([createRecord("preserved-record")]));
    storage.failHistoryReads = true;
    const runtime = loadStore({ storage });

    await expect(runtime.store.saveRecordAsync(createRecord("new-record"))).rejects.toMatchObject({
      name: "SecurityError"
    });
    expect(runtime.store.saveRecord(createRecord("compat-record"))).toBeNull();
    expect(storage.values.get(HISTORY_KEY)).toContain("preserved-record");
  });

  it("refuses merge imports that would overwrite an invalid fallback", async () => {
    const storage = new MemoryStorage();
    storage.setItem(HISTORY_KEY, "{broken");
    const runtime = loadStore({ storage });
    const payload = JSON.stringify({ records: [createRecord("imported-record")] });

    await expect(runtime.store.importRecordsAsync(payload)).rejects.toMatchObject({
      name: "InvalidFallbackError"
    });
    expect(() => runtime.store.importRecords(payload)).toThrowError(
      expect.objectContaining({ name: "InvalidFallbackError" })
    );
    expect(storage.getItem(HISTORY_KEY)).toBe("{broken");
  });

  it("never rewrites fallback rows with future fields while listing without IndexedDB", async () => {
    const storage = new MemoryStorage();
    const legacyPayload = JSON.stringify([
      {
        ...createRecord("valid-row"),
        final_board: [[2, 4]]
      },
      {
        ...createRecord("future-row"),
        schema_version: 999,
        future_payload: { keep: "verbatim" }
      }
    ]);
    storage.setItem(HISTORY_KEY, legacyPayload);
    const runtime = loadStore({ storage });

    const validRow = runtime.store
      .listRecords()
      .items.find((item) => item.id === "valid-row");
    expect(validRow).toMatchObject({ id: "valid-row", board_sum: 6 });
    expect(storage.getItem(HISTORY_KEY)).toBe(legacyPayload);

    await runtime.store.listRecordsAsync();
    expect(storage.getItem(HISTORY_KEY)).toBe(legacyPayload);
  });

  it("keeps the legacy key when part of its array cannot be safely migrated", async () => {
    const storage = new MemoryStorage();
    const legacyPayload = JSON.stringify([createRecord("valid-row"), { score: 64 }]);
    storage.setItem(HISTORY_KEY, legacyPayload);
    const indexedDb = createIndexedDbStub();
    const runtime = loadStore({ storage, indexedDB: indexedDb.indexedDB });

    await runtime.store.ensureMigrated();

    expect(indexedDb.records.has("valid-row")).toBe(true);
    expect(storage.getItem(HISTORY_KEY)).toBe(legacyPayload);
    expect(storage.getItem(MIGRATION_KEY)).toBeNull();
  });

  it("keeps the legacy key and marker unset when the migration transaction aborts", async () => {
    const storage = new MemoryStorage();
    const legacyPayload = JSON.stringify([createRecord("aborted-row")]);
    storage.setItem(HISTORY_KEY, legacyPayload);
    const indexedDb = createIndexedDbStub({ failDataTransactions: true });
    const runtime = loadStore({ storage, indexedDB: indexedDb.indexedDB });

    await runtime.store.ensureMigrated();

    expect(storage.getItem(HISTORY_KEY)).toBe(legacyPayload);
    expect(storage.getItem(MIGRATION_KEY)).toBeNull();
  });

  it("does not delete a compatibility record written while migration is pending", async () => {
    const storage = new MemoryStorage();
    storage.setItem(HISTORY_KEY, JSON.stringify([createRecord("legacy-a")]));
    const indexedDb = createIndexedDbStub({ manualDataTransactions: true });
    const runtime = loadStore({ storage, indexedDB: indexedDb.indexedDB });
    const migrationPromise = runtime.store.ensureMigrated();
    await waitFor(() => indexedDb.pendingDataTransactions.length === 1);

    expect(runtime.store.saveRecord(createRecord("new-b"))).toMatchObject({ id: "new-b" });
    indexedDb.settleNextDataTransaction("complete");
    await migrationPromise;

    expect(JSON.parse(storage.getItem(HISTORY_KEY) || "[]").map((item: { id: string }) => item.id)).toEqual([
      "new-b",
      "legacy-a"
    ]);
    expect(storage.getItem(MIGRATION_KEY)).toBeNull();

    await waitFor(() => indexedDb.pendingDataTransactions.length === 1);
    indexedDb.settleNextDataTransaction("abort");
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(JSON.parse(storage.getItem(HISTORY_KEY) || "[]").map((item: { id: string }) => item.id)).toContain(
      "new-b"
    );
  });

  it("reimports a residual fallback before removing it even when the migration marker exists", async () => {
    const storage = new MemoryStorage();
    storage.setItem(MIGRATION_KEY, "1");
    storage.setItem(HISTORY_KEY, JSON.stringify([createRecord("pending-after-marker")]));
    const indexedDb = createIndexedDbStub();
    const runtime = loadStore({ storage, indexedDB: indexedDb.indexedDB });

    await runtime.store.ensureMigrated();

    expect(indexedDb.records.has("pending-after-marker")).toBe(true);
    expect(storage.getItem(HISTORY_KEY)).toBeNull();
    expect(storage.getItem(MIGRATION_KEY)).toBe("1");
  });

  it("rejects imports when the fallback cannot persist them", async () => {
    const storage = new MemoryStorage();
    storage.failHistoryWrites = true;
    const runtime = loadStore({ storage });
    const payload = JSON.stringify({ records: [createRecord("quota-import")] });

    await expect(runtime.store.importRecordsAsync(payload)).rejects.toMatchObject({
      name: "QuotaExceededError"
    });
    expect(() => runtime.store.importRecords(payload)).toThrowError(
      expect.objectContaining({ name: "QuotaExceededError" })
    );
  });

  it("cleans only committed compatibility records from the fallback mirror", async () => {
    const storage = new MemoryStorage();
    const indexedDb = createIndexedDbStub();
    const runtime = loadStore({ storage, indexedDB: indexedDb.indexedDB });
    await runtime.store.ensureMigrated();

    expect(runtime.store.saveRecord(createRecord("compat-a"))).toMatchObject({ id: "compat-a" });
    expect(runtime.store.saveRecord(createRecord("compat-b"))).toMatchObject({ id: "compat-b" });
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(indexedDb.records.has("compat-a")).toBe(true);
    expect(indexedDb.records.has("compat-b")).toBe(true);
    expect(storage.getItem(HISTORY_KEY)).toBeNull();
  });

  it("keeps a concurrent fallback write when committed cleanup loses its snapshot", async () => {
    const storage = new MemoryStorage();
    const indexedDb = createIndexedDbStub({ manualDataTransactions: true });
    const runtime = loadStore({ storage, indexedDB: indexedDb.indexedDB });
    await runtime.store.ensureMigrated();

    expect(runtime.store.saveRecord(createRecord("compat-a"))).toMatchObject({ id: "compat-a" });
    await waitFor(() => indexedDb.pendingDataTransactions.length === 1);
    storage.afterNextHistoryRead = () => {
      const current = JSON.parse(storage.values.get(HISTORY_KEY) || "[]");
      storage.setItem(HISTORY_KEY, JSON.stringify([createRecord("concurrent-b"), ...current]));
    };

    indexedDb.settleNextDataTransaction("complete");
    await waitFor(() => storage.afterNextHistoryRead === null);

    expect(JSON.parse(storage.getItem(HISTORY_KEY) || "[]").map((item: { id: string }) => item.id)).toEqual([
      "concurrent-b",
      "compat-a"
    ]);
    expect(indexedDb.records.has("compat-a")).toBe(true);
  });
});
