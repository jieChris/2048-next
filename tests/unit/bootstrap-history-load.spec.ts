import { describe, expect, it } from "vitest";

import { resolveHistoryLoadPipeline } from "../../src/bootstrap/history-load";

describe("bootstrap history load", () => {
  it("resolves list query, burn-in summary and pager state from runtimes", () => {
    const calls = {
      listQuery: 0,
      listSource: 0,
      burnIn: 0,
      pager: 0
    };

    const result = resolveHistoryLoadPipeline({
      state: {
        modeKey: "classic",
        keyword: "42",
        sortBy: "ended_desc",
        adapterParityFilter: "mismatch",
        page: 3,
        pageSize: 30,
        burnInWindow: "200",
        sustainedWindows: "3",
        burnInMinComparable: "40",
        burnInMaxMismatchRate: "0.5"
      },
      localHistoryStore: { id: "store" },
      historyQueryRuntime: {
        resolveHistoryListQuery(input: Record<string, unknown>) {
          calls.listQuery += 1;
          expect(input.modeKey).toBe("classic");
          expect(input.page).toBe(3);
          return { queryToken: "q1" };
        },
        resolveHistoryListResultSource(input: Record<string, unknown>) {
          calls.listSource += 1;
          expect(input.listQuery).toEqual({ queryToken: "q1" });
          return { items: [{ id: "r1" }], total: 88 };
        },
        resolveHistoryBurnInQuery(input: Record<string, unknown>) {
          return { burnInQuery: input.sampleLimit };
        },
        resolveHistoryPagerState(input: Record<string, unknown>) {
          calls.pager += 1;
          expect(input.total).toBe(88);
          expect(input.pageSize).toBe(30);
          return { disablePrev: false, disableNext: true };
        }
      },
      historyBurnInRuntime: {
        resolveHistoryBurnInSummarySource(input: Record<string, unknown>) {
          calls.burnIn += 1;
          expect(input.queryInput).toEqual({
            modeKey: "classic",
            keyword: "42",
            sortBy: "ended_desc",
            sampleLimit: "200",
            sustainedWindows: "3",
            minComparable: 40,
            maxMismatchRate: 0.5
          });
          return { mismatchRate: 0.25 };
        }
      },
      burnInMinComparable: 50,
      burnInMaxMismatchRate: 1
    });

    expect(result.listResult).toEqual({ items: [{ id: "r1" }], total: 88 });
    expect(result.burnInSummary).toEqual({ mismatchRate: 0.25 });
    expect(result.pagerState).toEqual({ disablePrev: false, disableNext: true });
    expect(calls).toEqual({
      listQuery: 1,
      listSource: 1,
      burnIn: 1,
      pager: 1
    });
  });

  it("falls back to safe defaults when runtime functions are missing", () => {
    const result = resolveHistoryLoadPipeline({
      state: { page: 1, pageSize: 30 }
    });

    expect(result.listQuery).toEqual({});
    expect(result.listResult).toEqual({ items: [], total: 0 });
    expect(result.burnInSummary).toBeNull();
    expect(result.pagerState).toEqual({
      disablePrev: false,
      disableNext: false
    });
  });

  it("falls back to source burn-in thresholds when state values are absent", () => {
    const result = resolveHistoryLoadPipeline({
      state: {
        modeKey: "classic",
        burnInWindow: "200",
        sustainedWindows: "3"
      },
      localHistoryStore: {},
      historyQueryRuntime: {
        resolveHistoryBurnInQuery(input: Record<string, unknown>) {
          return input;
        }
      },
      historyBurnInRuntime: {
        resolveHistoryBurnInSummarySource(input: Record<string, unknown>) {
          return input.queryInput;
        }
      },
      burnInMinComparable: 60,
      burnInMaxMismatchRate: 0.8
    });

    expect(result.burnInSummary).toEqual({
      modeKey: "classic",
      keyword: undefined,
      sortBy: undefined,
      sampleLimit: "200",
      sustainedWindows: "3",
      minComparable: 60,
      maxMismatchRate: 0.8
    });
  });
});
