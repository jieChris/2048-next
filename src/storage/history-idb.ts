/**
 * IndexedDB-based history storage DAO.
 *
 * Replaces the legacy localStorage full-serialize pattern with indexed,
 * paginated, incremental access. Supports automatic migration from
 * localStorage and a fallback path when IndexedDB is unavailable.
 */

import type { HistoryRecord, HistoryListResult, HistoryImportResult, HistoryExportEnvelope } from "../contracts";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DB_NAME = "game_history_db";
const DB_VERSION = 1;
const STORE_NAME = "records";
const LEGACY_STORAGE_KEY = "local_game_history_v1";
const MIGRATION_FLAG = "idb_history_migrated_v1";

// ---------------------------------------------------------------------------
// DB lifecycle
// ---------------------------------------------------------------------------

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("mode_key", "mode_key", { unique: false });
        store.createIndex("ended_at", "ended_at", { unique: false });
        store.createIndex("score", "score", { unique: false });
      }
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
  if (typeof localStorage === "undefined") return 0;
  if (localStorage.getItem(MIGRATION_FLAG)) return 0;

  let records: HistoryRecord[];
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    records = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(records)) records = [];
  } catch {
    records = [];
  }

  if (records.length === 0) {
    localStorage.setItem(MIGRATION_FLAG, "1");
    return 0;
  }

  const db = await openDatabase();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);

  for (const record of records) {
    if (record && typeof record === "object" && record.id) {
      store.put(record);
    }
  }

  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  localStorage.setItem(MIGRATION_FLAG, "1");
  db.close();
  return records.length;
}

// ---------------------------------------------------------------------------
// DAO operations
// ---------------------------------------------------------------------------

export async function saveRecord(record: HistoryRecord): Promise<HistoryRecord> {
  const db = await openDatabase();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  store.put(record);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  return record;
}

export async function getById(id: string): Promise<HistoryRecord | null> {
  const db = await openDatabase();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);
  const result = await new Promise<HistoryRecord | null>((resolve, reject) => {
    const req = store.get(id);
    req.onsuccess = () => resolve((req.result as HistoryRecord) || null);
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
    req.onsuccess = () => resolve(req.result as HistoryRecord | undefined);
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

  const allRecords = await new Promise<HistoryRecord[]>((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result as HistoryRecord[]);
    req.onerror = () => reject(req.error);
  });
  db.close();

  let filtered = allRecords.filter((item) => {
    if (!item) return false;
    if (modeKey && item.mode_key !== modeKey) return false;
    if (keyword) {
      const haystack = [
        item.id, item.mode_key, item.mode,
        String(item.score), String(item.best_tile),
        item.ruleset, item.challenge_id || ""
      ].join(" ").toLowerCase();
      if (!haystack.includes(keyword)) return false;
    }
    return true;
  });

  if (sortBy === "score_desc") {
    filtered.sort((a, b) => (b.score || 0) - (a.score || 0) || compareDates(b.ended_at, a.ended_at));
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
  const all = await new Promise<HistoryRecord[]>((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result as HistoryRecord[]);
    req.onerror = () => reject(req.error);
  });
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
  else if (parsed && typeof parsed === "object" && Array.isArray((parsed as HistoryExportEnvelope).records)) {
    incoming = (parsed as HistoryExportEnvelope).records;
  } else throw new Error("invalid_payload");

  const db = await openDatabase();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);

  let imported = 0;
  let replaced = 0;

  for (const raw of incoming) {
    const item = raw as HistoryRecord;
    if (!item || !item.id) continue;

    if (merge) {
      const existing = await new Promise<HistoryRecord | undefined>((resolve, reject) => {
        const req = store.get(item.id);
        req.onsuccess = () => resolve(req.result as HistoryRecord | undefined);
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
