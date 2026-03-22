import { describe, expect, it } from "vitest";

import {
  HISTORY_FILTER_STORAGE_KEY,
  readHistoryFilterState,
  persistHistoryFilterState
} from "../../src/features/history/history-filter-state";

type StorageMap = Map<string, string>;

function createMemoryStorage(store: StorageMap) {
  return {
    getItem: (key: string) => (store.has(key) ? store.get(key) || null : null),
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    }
  };
}

describe("history-filter-state", () => {
  it("returns defaults when storage is empty", () => {
    const store = new Map();
    const storage = createMemoryStorage(store);
    const defaults = {
      page: 1,
      pageSize: 30,
      modeKey: "",
      ownerKey: "",
      keyword: "",
      sortBy: "ended_desc"
    };

    expect(readHistoryFilterState({ storageLike: storage, defaults })).toEqual({
      page: 1,
      pageSize: 30,
      modeKey: "",
      ownerKey: "",
      keyword: "",
      sortBy: "ended_desc"
    });
  });

  it("persists non-default filter values and removes defaults", () => {
    const store = new Map();
    const storage = createMemoryStorage(store);
    const defaults = {
      page: 1,
      pageSize: 30,
      modeKey: "",
      ownerKey: "",
      keyword: "",
      sortBy: "ended_desc"
    };

    persistHistoryFilterState({
      storageLike: storage,
      defaults,
      state: {
        page: 1,
        pageSize: 30,
        modeKey: "pow2",
        ownerKey: "guest",
        keyword: "2048",
        sortBy: "score_desc"
      }
    });

    const raw = store.get(HISTORY_FILTER_STORAGE_KEY) || "";
    const parsed = JSON.parse(raw);
    expect(parsed.schemaVersion).toBe(2);
    expect(parsed.filter).toEqual({
      modeKey: "pow2",
      ownerKey: "guest",
      keyword: "2048",
      sortBy: "score_desc"
    });

    persistHistoryFilterState({
      storageLike: storage,
      defaults,
      state: { ...defaults }
    });
    expect(store.has(HISTORY_FILTER_STORAGE_KEY)).toBe(false);
  });
});
