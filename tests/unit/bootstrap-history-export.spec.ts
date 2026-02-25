import { describe, expect, it } from "vitest";

import {
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
});
