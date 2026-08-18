/**
 * IndexedDB-based history storage DAO.
 *
 * Replaces the legacy localStorage full-serialize pattern with indexed,
 * paginated, incremental access. Supports automatic migration from
 * localStorage and a fallback path when IndexedDB is unavailable.
 */

import {
  isHistoryExportEnvelopeLike,
  normalizeHistoryRecordLike
} from "../contracts";
import type {
  HistoryRecord,
  HistoryListResult,
  HistoryImportResult,
  HistoryExportEnvelope
} from "../contracts";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DB_NAME = "game_history_db";
const DB_VERSION = 2;
const STORE_NAME = "records";
const LEGACY_STORAGE_KEY = "local_game_history_v1";
const MIGRATION_FLAG = "idb_history_migrated_v1";

// ---------------------------------------------------------------------------
// localStorage helpers (migration-only)
// ---------------------------------------------------------------------------

function resolveLocalStorage(): Storage | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage;
  } catch {
    return null;
  }
}

function readLocalStorageItem(key: string): string | null {
  const storage = resolveLocalStorage();
  if (!storage) return null;
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function writeLocalStorageItem(key: string, value: string): void {
  const storage = resolveLocalStorage();
  if (!storage) return;
  try {
    storage.setItem(key, value);
  } catch {
    // best-effort migration marker write
  }
}

function isMigrationCompleted(): boolean {
  return readLocalStorageItem(MIGRATION_FLAG) === "1";
}

function markMigrationCompleted(): void {
  writeLocalStorageItem(MIGRATION_FLAG, "1");
}

function readLegacyHistoryRecordsFromLocalStorage(): unknown[] {
  try {
    const raw = readLocalStorageItem(LEGACY_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// DB lifecycle
// ---------------------------------------------------------------------------

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      let store: IDBObjectStore;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("mode_key", "mode_key", { unique: false });
        store.createIndex("ended_at", "ended_at", { unique: false });
        store.createIndex("score", "score", { unique: false });
      } else {
        store = request.transaction!.objectStore(STORE_NAME);
      }
      if (!store.indexNames.contains("board_sum")) {
        store.createIndex("board_sum", "board_sum", { unique: false });
      }
      const cursorRequest = store.openCursor();
      cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result;
        if (!cursor) return;
        const normalized = normalizeHistoryRecordLike(cursor.value);
        if (normalized) cursor.update(normalized);
        cursor.continue();
      };
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ---------------------------------------------------------------------------
// Migration from localStorage
// ---------------------------------------------------------------------------

export async function migrateFromLocalStorage(): Promise<number> {
  if (typeof indexedDB === "undefined") return 0;
  if (!resolveLocalStorage()) return 0;
  if (isMigrationCompleted()) return 0;

  const records = readLegacyHistoryRecordsFromLocalStorage();

  if (records.length === 0) {
    markMigrationCompleted();
    return 0;
  }

  const db = await openDatabase();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);

  let migrated = 0;
  for (const record of records) {
    const normalized = normalizeHistoryRecordLike(record);
    if (!normalized) continue;
    store.put(normalized);
    migrated += 1;
  }

  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  markMigrationCompleted();
  db.close();
  return migrated;
}

// ---------------------------------------------------------------------------
// DAO operations
// ---------------------------------------------------------------------------

export async function saveRecord(record: HistoryRecord): Promise<HistoryRecord> {
  const normalized = normalizeHistoryRecordLike(record);
  if (!normalized) throw new Error("invalid_record");
  const db = await openDatabase();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  store.put(normalized);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  return normalized;
}

export async function getById(id: string): Promise<HistoryRecord | null> {
  const db = await openDatabase();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);
  const result = await new Promise<HistoryRecord | null>((resolve, reject) => {
    const req = store.get(id);
    req.onsuccess = () => {
      const normalized = normalizeHistoryRecordLike(req.result);
      resolve(normalized || null);
    };
    req.onerror = () => reject(req.error);
  });
  db.close();
  return result;
}

export async function deleteById(id: string): Promise<boolean> {
  const db = await openDatabase();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  const existing = await new Promise<HistoryRecord | undefined>((resolve, reject) => {
    const req = store.get(id);
    req.onsuccess = () => {
      const normalized = normalizeHistoryRecordLike(req.result);
      resolve(normalized || undefined);
    };
    req.onerror = () => reject(req.error);
  });
  if (!existing) { db.close(); return false; }

  store.delete(id);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  return true;
}

export async function clearAll(): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction(STORE_NAME, "readwrite");
  tx.objectStore(STORE_NAME).clear();
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function listRecords(options?: {
  mode_key?: string;
  keyword?: string;
  sort_by?: string;
  page?: number;
  page_size?: number;
}): Promise<HistoryListResult> {
  const opts = options || {};
  const modeKey = opts.mode_key || "";
  const keyword = (opts.keyword || "").toLowerCase();
  const sortBy = opts.sort_by || "ended_desc";
  const page = (opts.page && opts.page > 0) ? opts.page : 1;
  const pageSize = (opts.page_size && opts.page_size > 0) ? Math.min(opts.page_size, 500) : 50;

  const db = await openDatabase();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);

  const allRecords = await readAllRecordsByCursor(store);
  db.close();

  let filtered = allRecords.filter((item) => {
    if (!item) return false;
    if (modeKey && item.mode_key !== modeKey) return false;
    if (keyword) {
      const haystack = [
        item.id, item.mode_key, item.mode,
        String(item.score), String(item.board_sum), String(item.best_tile),
        item.ruleset, item.challenge_id || ""
      ].join(" ").toLowerCase();
      if (!haystack.includes(keyword)) return false;
    }
    return true;
  });

  if (sortBy === "score_desc") {
    filtered.sort((a, b) => (b.score || 0) - (a.score || 0) || compareDates(b.ended_at, a.ended_at));
  } else if (sortBy === "board_sum_desc") {
    filtered.sort((a, b) =>
      (b.board_sum || 0) - (a.board_sum || 0) ||
      (b.score || 0) - (a.score || 0) ||
      compareDates(b.ended_at, a.ended_at)
    );
  } else if (sortBy === "ended_asc") {
    filtered.sort((a, b) => compareDates(a.ended_at, b.ended_at));
  } else {
    filtered.sort((a, b) => compareDates(b.ended_at, a.ended_at));
  }

  const total = filtered.length;
  const start = (page - 1) * pageSize;
  return {
    total,
    page,
    page_size: pageSize,
    items: filtered.slice(start, start + pageSize)
  };
}

export async function exportRecords(ids?: string[]): Promise<string> {
  const db = await openDatabase();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);
  const all = await readAllRecordsByCursor(store);
  db.close();

  let selected = all;
  if (ids && ids.length > 0) {
    const idSet = new Set(ids);
    selected = all.filter((r) => r && idSet.has(r.id));
  }

  const envelope: HistoryExportEnvelope = {
    v: 1,
    exported_at: new Date().toISOString(),
    count: selected.length,
    records: selected
  };
  return JSON.stringify(envelope, null, 2);
}

export async function importRecords(
  text: string,
  options?: { merge?: boolean }
): Promise<HistoryImportResult> {
  const merge = options?.merge !== false;
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { throw new Error("invalid_json"); }

  let incoming: unknown[];
  if (Array.isArray(parsed)) incoming = parsed;
  else if (isHistoryExportEnvelopeLike(parsed)) {
    incoming = (parsed as HistoryExportEnvelope).records;
  } else throw new Error("invalid_payload");

  const db = await openDatabase();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);

  let imported = 0;
  let replaced = 0;

  for (const raw of incoming) {
    const item = normalizeHistoryRecordLike(raw);
    if (!item) continue;

    if (merge) {
      const existing = await new Promise<HistoryRecord | undefined>((resolve, reject) => {
        const req = store.get(item.id);
        req.onsuccess = () => {
          const normalized = normalizeHistoryRecordLike(req.result);
          resolve(normalized || undefined);
        };
        req.onerror = () => reject(req.error);
      });
      if (existing) replaced++; else imported++;
    } else {
      imported++;
    }
    store.put(item);
  }

  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();

  return { imported, replaced, total: imported + replaced };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function compareDates(a: string | undefined, b: string | undefined): number {
  return (Date.parse(a || "") || 0) - (Date.parse(b || "") || 0);
}

function readAllRecordsByCursor(store: IDBObjectStore): Promise<HistoryRecord[]> {
  return new Promise((resolve, reject) => {
    const items: HistoryRecord[] = [];
    const req = store.openCursor();
    req.onsuccess = () => {
      const cursor = req.result;
      if (!cursor) {
        resolve(items);
        return;
      }
      const normalized = normalizeHistoryRecordLike(cursor.value);
      if (normalized) items.push(normalized);
      cursor.continue();
    };
    req.onerror = () => reject(req.error);
  });
}

// ---------------------------------------------------------------------------
// Feature detection
// ---------------------------------------------------------------------------

export function isIndexedDBAvailable(): boolean {
  try {
    return typeof indexedDB !== "undefined" && indexedDB !== null;
  } catch {
    return false;
  }
}
