import { describe, expect, it } from "vitest";

import {
  resolveHistoryMismatchExportRecordIds,
  resolveHistorySingleRecordExportState,
  collectHistoryRecordIdsForExport,
  resolveHistoryRecordExportFileName
} from "../../src/bootstrap/history-export";

describe("bootstrap history export", () => {
  it("builds safe single-record export filename", () => {
    const fileName = resolveHistoryRecordExportFileName({
      modeKey: "pow2/4x4?ranked",
      id: "abc-1"
    });

    expect(fileName).toBe("history_pow2_4x4_ranked_abc-1.json");
  });

  it("collects ids across pages and stops when total reached", () => {
    const calls: number[] = [];
    const ids = collectHistoryRecordIdsForExport({
      listRecords: (query) => {
        calls.push(query.page);
        if (query.page === 1) {
          return {
            items: [{ id: "a" }, { id: "b" }],
            total: 3
          };
        }
        if (query.page === 2) {
          return {
            items: [{ id: "c" }, { id: "d" }],
            total: 3
          };
        }
        return { items: [], total: 3 };
      },
      queryOptions: {
        mode_key: "standard_4x4_pow2_no_undo",
        adapter_parity_filter: "mismatch"
      },
      maxPages: 100,
      pageSize: 500
    });

    expect(ids).toEqual(["a", "b", "c", "d"]);
    expect(calls).toEqual([1, 2]);
  });

  it("returns empty id list when listRecords is unavailable", () => {
    const ids = collectHistoryRecordIdsForExport({
      listRecords: null,
      queryOptions: {
        mode_key: "standard_4x4_pow2_no_undo",
        adapter_parity_filter: "mismatch"
      }
    });

    expect(ids).toEqual([]);
  });

  it("resolves mismatch export ids from local history store source", () => {
    const calls: number[] = [];
    const ids = resolveHistoryMismatchExportRecordIds({
      localHistoryStore: {
        listRecords(query: { page: number }) {
          calls.push(query.page);
          if (query.page === 1) return { items: [{ id: "x" }], total: 2 };
          if (query.page === 2) return { items: [{ id: "y" }], total: 2 };
          return { items: [], total: 2 };
        }
      },
      queryOptions: {
        mode_key: "standard_4x4_pow2_no_undo",
        adapter_parity_filter: "mismatch"
      },
      maxPages: 5,
      pageSize: 100
    });

    expect(ids).toEqual(["x", "y"]);
    expect(calls).toEqual([1, 2]);
  });

  it("resolves single-record export state with filename and payload", () => {
    const state = resolveHistorySingleRecordExportState({
      localHistoryStore: {
        exportRecords(ids: unknown[]) {
          return JSON.stringify(ids);
        }
      },
      item: {
        id: "abc-1",
        mode_key: "pow2/4x4?ranked"
      }
    });

    expect(state).toEqual({
      canDownload: true,
      fileName: "history_pow2_4x4_ranked_abc-1.json",
      payload: "[\"abc-1\"]"
    });
  });

  it("returns non-downloadable state when store or id is invalid", () => {
    expect(resolveHistorySingleRecordExportState({ localHistoryStore: null, item: { id: "x" } })).toEqual({
      canDownload: false,
      fileName: "",
      payload: ""
    });
    expect(
      resolveHistorySingleRecordExportState({
        localHistoryStore: { exportRecords: () => "[]" },
        item: { id: "" }
      })
    ).toEqual({
      canDownload: false,
      fileName: "",
      payload: ""
    });
  });
});
