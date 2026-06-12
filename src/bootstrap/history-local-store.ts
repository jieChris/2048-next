import "../../js/local_history_store.js";

interface HistoryLocalStoreHost {
  LocalHistoryStore?: Record<string, unknown> | null | undefined;
}

export function resolveHistoryLocalStore(windowLike: unknown): Record<string, unknown> | null {
  const host = windowLike && typeof windowLike === "object" ? (windowLike as HistoryLocalStoreHost) : null;
  const store = host?.LocalHistoryStore || null;
  return store && typeof store === "object" ? store : null;
}
