const DONE_KEY = "refactor_cutover_v1_done";
const PRACTICE_OLD = "practice_legacy";
const PRACTICE_NEW = "practice";
const HISTORY_KEY = "local_game_history_v1";

function resolveLocalStorage(globalLike: Window | undefined): Storage | null {
  try {
    if (!globalLike) return null;
    return globalLike.localStorage ?? null;
  } catch (_error) {
    return null;
  }
}

function safeGet(storage: Storage | null, key: string): string | null {
  try {
    return storage ? storage.getItem(key) : null;
  } catch (_error) {
    return null;
  }
}

function safeSet(storage: Storage | null, key: string, value: string): boolean {
  try {
    if (!storage) return false;
    storage.setItem(key, value);
    return true;
  } catch (_error) {
    return false;
  }
}

function safeRemove(storage: Storage | null, key: string): boolean {
  try {
    if (!storage) return false;
    storage.removeItem(key);
    return true;
  } catch (_error) {
    return false;
  }
}

function parseObject(raw: string | null): Record<string, unknown> | null {
  if (!raw || typeof raw !== "string") return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch (_error) {
    return null;
  }
}

function parseArray(raw: string | null): Array<Record<string, unknown>> | null {
  if (!raw || typeof raw !== "string") return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Array<Record<string, unknown>>) : null;
  } catch (_error) {
    return null;
  }
}

function migrateBestScore(storage: Storage | null): void {
  const oldKey = `bestScoreByMode:${PRACTICE_OLD}`;
  const nextKey = `bestScoreByMode:${PRACTICE_NEW}`;
  const oldRaw = safeGet(storage, oldKey);
  if (!oldRaw) return;

  const oldValue = Number(oldRaw);
  if (!Number.isFinite(oldValue)) return;
  const nextValue = Number(safeGet(storage, nextKey));
  const resolved = Number.isFinite(nextValue) ? Math.max(nextValue, oldValue) : oldValue;
  safeSet(storage, nextKey, String(resolved));
  safeRemove(storage, oldKey);
}

function resolveSavedAt(payload: Record<string, unknown> | null): number {
  if (!payload) return 0;
  const savedAt = Number(payload.saved_at);
  return Number.isFinite(savedAt) ? savedAt : 0;
}

function migrateSavedState(storage: Storage | null, keyPrefix: string): void {
  const oldKey = `${keyPrefix}${PRACTICE_OLD}`;
  const nextKey = `${keyPrefix}${PRACTICE_NEW}`;
  const oldPayload = parseObject(safeGet(storage, oldKey));
  if (!oldPayload) return;

  const nextPayload = parseObject(safeGet(storage, nextKey));
  if (!nextPayload || resolveSavedAt(oldPayload) >= resolveSavedAt(nextPayload)) {
    oldPayload.mode_key = PRACTICE_NEW;
    safeSet(storage, nextKey, JSON.stringify(oldPayload));
  }
  safeRemove(storage, oldKey);
}

function migrateHistoryRecords(storage: Storage | null): void {
  const rows = parseArray(safeGet(storage, HISTORY_KEY));
  if (!rows) return;

  let changed = false;
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    if (!row || typeof row !== "object") continue;
    if (row.mode_key === PRACTICE_OLD) {
      row.mode_key = PRACTICE_NEW;
      changed = true;
    }
    const cleanupKeys = [
      "adapter_parity_report_v1",
      "adapter_parity_report_v2",
      "adapter_parity_ab_diff_v1",
      "adapter_parity_ab_diff_v2"
    ];
    for (let k = 0; k < cleanupKeys.length; k += 1) {
      if (Object.prototype.hasOwnProperty.call(row, cleanupKeys[k])) {
        delete row[cleanupKeys[k]];
        changed = true;
      }
    }
  }

  if (changed) {
    safeSet(storage, HISTORY_KEY, JSON.stringify(rows));
  }
}

function cleanupFilterState(storage: Storage | null): void {
  const key = "history_filter_state_v1";
  const parsed = parseObject(safeGet(storage, key));
  if (!parsed) {
    safeRemove(storage, key);
    return;
  }

  const filter =
    parsed.filter && typeof parsed.filter === "object"
      ? (parsed.filter as Record<string, unknown>)
      : parsed;
  const modeKey = filter.modeKey == null ? "" : String(filter.modeKey);
  const keyword = filter.keyword == null ? "" : String(filter.keyword);
  const sortBy = filter.sortBy == null ? "ended_desc" : String(filter.sortBy || "ended_desc");

  if (!modeKey && !keyword && sortBy === "ended_desc") {
    safeRemove(storage, key);
    return;
  }

  safeSet(
    storage,
    key,
    JSON.stringify({
      schemaVersion: 2,
      filter: {
        modeKey,
        keyword,
        sortBy
      }
    })
  );
}

export function runRefactorCutoverMigration(windowLike?: Window): void {
  const globalLike = windowLike ?? (typeof window !== "undefined" ? window : undefined);
  const storage = resolveLocalStorage(globalLike);
  if (!storage) return;
  if (safeGet(storage, DONE_KEY) === "1") return;

  migrateBestScore(storage);
  migrateSavedState(storage, "savedGameStateByMode:v1:");
  migrateSavedState(storage, "savedGameStateLiteByMode:v1:");
  migrateHistoryRecords(storage);

  safeRemove(storage, "engine_adapter_mode");
  safeRemove(storage, "engine_adapter_default_mode");
  safeRemove(storage, "engine_adapter_force_legacy");
  cleanupFilterState(storage);

  safeSet(storage, DONE_KEY, "1");
}
