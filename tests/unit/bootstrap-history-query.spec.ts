import { describe, expect, it } from "vitest";

import {
  applyHistoryFilterState,
  resolveHistoryBurnInQuery,
  resolveHistoryFilterState,
  resolveHistoryListResultSource,
  resolveHistoryListQuery,
  resolveHistoryPagerState
} from "../../src/bootstrap/history-query";

describe("bootstrap history query", () => {
  it("normalizes filter state from raw input", () => {
    const filter = resolveHistoryFilterState({
      modeKeyRaw: " standard_4x4_pow2_no_undo ",
      keywordRaw: "  test  ",
      sortByRaw: "ended_asc",
      adapterParityFilterRaw: "mismatch",
      burnInWindowRaw: " 300 ",
      sustainedWindowsRaw: " 5 "
    });

    expect(filter).toEqual({
      modeKey: "standard_4x4_pow2_no_undo",
      keyword: "test",
      sortBy: "ended_asc",
      adapterParityFilter: "mismatch",
      burnInWindow: "300",
      sustainedWindows: "5"
    });
  });

  it("builds list query with fallback values", () => {
    const query = resolveHistoryListQuery({
      modeKey: "",
      keyword: 123,
      sortBy: "",
      adapterParityFilter: null,
      page: 0,
      pageSize: "bad"
    });

    expect(query).toEqual({
      mode_key: "",
      keyword: "",
      sort_by: "ended_desc",
      adapter_parity_filter: "all",
      page: 1,
      page_size: 30
    });
  });

  it("applies normalized filter state into target object", () => {
    const target: Record<string, unknown> = {
      page: 2,
      pageSize: 30,
      modeKey: "old"
    };
    const ok = applyHistoryFilterState(target, {
      modeKeyRaw: " standard_4x4_pow2_no_undo ",
      keywordRaw: " core ",
      sortByRaw: "score_desc",
      adapterParityFilterRaw: "match",
      burnInWindowRaw: "500",
      sustainedWindowsRaw: "2"
    });

    expect(ok).toBe(true);
    expect(target).toMatchObject({
      page: 2,
      pageSize: 30,
      modeKey: "standard_4x4_pow2_no_undo",
      keyword: "core",
      sortBy: "score_desc",
      adapterParityFilter: "match",
      burnInWindow: "500",
      sustainedWindows: "2"
    });
  });

  it("returns false when filter state target is invalid", () => {
    expect(applyHistoryFilterState(null, { modeKeyRaw: "x" })).toBe(false);
  });

  it("builds burn-in query and pager state", () => {
    const burnInQuery = resolveHistoryBurnInQuery({
      modeKey: "standard_4x4_pow2_no_undo",
      keyword: "core",
      sortBy: "ended_desc",
      sampleLimit: "250",
      sustainedWindows: "4",
      minComparable: 80,
      maxMismatchRate: 2
    });

    const pager = resolveHistoryPagerState({
      total: 61,
      page: 3,
      pageSize: 30
    });

    expect(burnInQuery).toEqual({
      mode_key: "standard_4x4_pow2_no_undo",
      keyword: "core",
      sort_by: "ended_desc",
      sample_limit: "250",
      sustained_windows: "4",
      min_comparable: 80,
      max_mismatch_rate: 2
    });
    expect(pager).toEqual({
      maxPage: 3,
      disablePrev: false,
      disableNext: true
    });
  });

  it("reads list result via local history store source with fallback", () => {
    const calls: unknown[] = [];
    const result = resolveHistoryListResultSource({
      localHistoryStore: {
        listRecords(query: unknown) {
          calls.push(query);
          return { items: [1], total: 1 };
        }
      },
      listQuery: { page: 2 }
    });
    const fallback = resolveHistoryListResultSource({
      localHistoryStore: null,
      listQuery: { page: 1 },
      fallbackResult: { items: [], total: 0 }
    });

    expect(calls).toEqual([{ page: 2 }]);
    expect(result).toEqual({ items: [1], total: 1 });
    expect(fallback).toEqual({ items: [], total: 0 });
  });
});
