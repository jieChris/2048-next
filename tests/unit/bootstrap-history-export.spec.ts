import { describe, expect, it } from "vitest";

import {
  downloadHistoryAllRecords,
  downloadHistoryMismatchRecords,
  downloadHistorySingleRecord,
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

  it("downloads single-record export payload from runtime helper", () => {
    const captures: Array<{ fileName: string; payload: unknown }> = [];
    const ok = downloadHistorySingleRecord({
      localHistoryStore: {
        exportRecords(ids: unknown[]) {
          return JSON.stringify(ids);
        },
        download(fileName: string, payload: unknown) {
          captures.push({ fileName, payload });
        }
      },
      item: {
        id: "abc-2",
        mode_key: "pow2/4x4?ranked"
      }
    });

    expect(ok).toBe(true);
    expect(captures).toEqual([
      {
        fileName: "history_pow2_4x4_ranked_abc-2.json",
        payload: "[\"abc-2\"]"
      }
    ]);
  });

  it("returns false when single-record download cannot be prepared", () => {
    expect(
      downloadHistorySingleRecord({
        localHistoryStore: {
          exportRecords: () => "[]",
          download: () => {}
        },
        item: {
          id: ""
        }
      })
    ).toBe(false);
  });

  it("downloads all records from runtime helper", () => {
    const captures: Array<{ fileName: string; payload: unknown }> = [];
    const ok = downloadHistoryAllRecords({
      localHistoryStore: {
        exportRecords() {
          return "{\"records\":[]}";
        },
        download(fileName: string, payload: unknown) {
          captures.push({ fileName, payload });
        }
      },
      dateValue: "2026-02-25T08:00:00.000Z",
      resolveDateTag: (value) => String(value).slice(0, 10),
      resolveFileName: (dateTag) => "all_" + String(dateTag) + ".json"
    });

    expect(ok).toBe(true);
    expect(captures).toEqual([
      {
        fileName: "all_2026-02-25.json",
        payload: "{\"records\":[]}"
      }
    ]);
  });

  it("returns empty state when mismatch export has no ids", () => {
    const result = downloadHistoryMismatchRecords({
      localHistoryStore: {
        listRecords() {
          return { items: [], total: 0 };
        },
        exportRecords(ids?: unknown[]) {
          return JSON.stringify(ids || []);
        },
        download() {
          throw new Error("should not download on empty result");
        }
      },
      queryOptions: {
        mode_key: "standard_4x4_pow2_no_undo",
        adapter_parity_filter: "mismatch"
      }
    });

    expect(result).toEqual({
      downloaded: false,
      count: 0,
      empty: true
    });
  });

  it("downloads mismatch records and returns count", () => {
    const captures: Array<{ fileName: string; payload: unknown }> = [];
    const result = downloadHistoryMismatchRecords({
      localHistoryStore: {
        listRecords(query: { page: number }) {
          if (query.page === 1) return { items: [{ id: "m-1" }, { id: "m-2" }], total: 2 };
          return { items: [], total: 2 };
        },
        exportRecords(ids?: unknown[]) {
          return JSON.stringify(ids || []);
        },
        download(fileName: string, payload: unknown) {
          captures.push({ fileName, payload });
        }
      },
      queryOptions: {
        mode_key: "standard_4x4_pow2_no_undo",
        adapter_parity_filter: "mismatch"
      },
      dateValue: "2026-02-25T08:00:00.000Z",
      resolveDateTag: (value) => String(value).slice(0, 10),
      resolveFileName: (dateTag) => "mismatch_" + String(dateTag) + ".json"
    });

    expect(result).toEqual({
      downloaded: true,
      count: 2,
      empty: false
    });
    expect(captures).toEqual([
      {
        fileName: "mismatch_2026-02-25.json",
        payload: "[\"m-1\",\"m-2\"]"
      }
    ]);
  });
});
