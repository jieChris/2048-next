import { safeReadStorageItem, safeSetStorageItem } from "../../bootstrap/storage";

export interface HistoryFilterState {
  page: number;
  pageSize: number;
  modeKey: string;
  ownerKey: string;
  keyword: string;
  sortBy: string;
}

export interface HistoryFilterStateDefaults extends HistoryFilterState {}

export interface HistoryFilterStateStorageLike {
  getItem?(key: string): string | null;
  setItem?(key: string, value: string): void;
  removeItem?(key: string): void;
}

export interface ReadHistoryFilterStateOptions {
  storageLike?: HistoryFilterStateStorageLike | null | undefined;
  defaults: HistoryFilterStateDefaults;
}

export interface PersistHistoryFilterStateOptions {
  storageLike?: HistoryFilterStateStorageLike | null | undefined;
  state: HistoryFilterState;
  defaults: HistoryFilterStateDefaults;
}

export const HISTORY_FILTER_STORAGE_KEY = "history_filter_state_v1";

function toText(value: unknown): string {
  return value == null ? "" : String(value);
}

function safeRemoveStorageItem(storageLike: HistoryFilterStateStorageLike | null | undefined, key: string): void {
  const storage = storageLike || null;
  if (!storage || typeof storage.removeItem !== "function") return;
  try {
    storage.removeItem(key);
  } catch (_err) {
    return;
  }
}

export function readHistoryFilterState(options: ReadHistoryFilterStateOptions): HistoryFilterState {
  const defaults = options.defaults;
  try {
    const raw = safeReadStorageItem({
      storageLike: options.storageLike || null,
      key: HISTORY_FILTER_STORAGE_KEY
    });
    if (!raw) {
      return {
        page: 1,
        pageSize: defaults.pageSize,
        modeKey: defaults.modeKey,
        ownerKey: defaults.ownerKey,
        keyword: defaults.keyword,
        sortBy: defaults.sortBy
      };
    }
    const parsed = JSON.parse(raw);
    const filter = parsed && parsed.filter && typeof parsed.filter === "object" ? parsed.filter : parsed;
    if (!filter || typeof filter !== "object") {
      return {
        page: 1,
        pageSize: defaults.pageSize,
        modeKey: defaults.modeKey,
        ownerKey: defaults.ownerKey,
        keyword: defaults.keyword,
        sortBy: defaults.sortBy
      };
    }
    return {
      page: 1,
      pageSize: defaults.pageSize,
      modeKey: typeof (filter as Record<string, unknown>).modeKey === "string" ? (filter as any).modeKey : defaults.modeKey,
      ownerKey: typeof (filter as Record<string, unknown>).ownerKey === "string" ? (filter as any).ownerKey : defaults.ownerKey,
      keyword: typeof (filter as Record<string, unknown>).keyword === "string" ? (filter as any).keyword : defaults.keyword,
      sortBy: typeof (filter as Record<string, unknown>).sortBy === "string" ? (filter as any).sortBy : defaults.sortBy
    };
  } catch (_err) {
    return {
      page: 1,
      pageSize: defaults.pageSize,
      modeKey: defaults.modeKey,
      ownerKey: defaults.ownerKey,
      keyword: defaults.keyword,
      sortBy: defaults.sortBy
    };
  }
}

export function persistHistoryFilterState(options: PersistHistoryFilterStateOptions): void {
  const state = options.state;
  const defaults = options.defaults;
  const filter = {
    modeKey: toText(state.modeKey),
    ownerKey: toText(state.ownerKey),
    keyword: toText(state.keyword),
    sortBy: toText(state.sortBy)
  };
  const isDefault =
    filter.modeKey === toText(defaults.modeKey) &&
    filter.ownerKey === toText(defaults.ownerKey) &&
    filter.keyword === toText(defaults.keyword) &&
    filter.sortBy === toText(defaults.sortBy);

  if (isDefault) {
    safeRemoveStorageItem(options.storageLike || null, HISTORY_FILTER_STORAGE_KEY);
    return;
  }

  safeSetStorageItem({
    storageLike: options.storageLike || null,
    key: HISTORY_FILTER_STORAGE_KEY,
    value: JSON.stringify({
      schemaVersion: 2,
      filter
    })
  });
}
