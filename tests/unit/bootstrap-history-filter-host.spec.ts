import { describe, expect, it, vi } from "vitest";

import { applyHistoryFilterStateFromInputs } from "../../src/bootstrap/history-filter-host";

describe("bootstrap history filter host", () => {
  it("reads filter inputs and delegates to query runtime", () => {
    const state = {
      modeKey: "",
      keyword: "",
      sortBy: "ended_desc",
      adapterParityFilter: "all",
      burnInWindow: "200",
      sustainedWindows: "3"
    };
    const applyHistoryFilterState = vi.fn();

    const getElementById = vi.fn((id: string) => {
      const values: Record<string, unknown> = {
        "history-mode": { value: "standard_4x4_pow2_no_undo" },
        "history-keyword": { value: "smoke" },
        "history-sort": { value: "ended_asc" },
        "history-adapter-filter": { value: "mismatch" },
        "history-burnin-window": { value: "300" },
        "history-sustained-window": { value: "5" }
      };
      return values[id] || null;
    });

    const result = applyHistoryFilterStateFromInputs({
      state,
      getElementById,
      historyQueryRuntime: {
        applyHistoryFilterState
      }
    });

    expect(result).toEqual({
      didApply: true
    });
    expect(applyHistoryFilterState).toHaveBeenCalledWith(state, {
      modeKeyRaw: "standard_4x4_pow2_no_undo",
      keywordRaw: "smoke",
      sortByRaw: "ended_asc",
      adapterParityFilterRaw: "mismatch",
      burnInWindowRaw: "300",
      sustainedWindowsRaw: "5"
    });
  });

  it("returns no-op result when runtime apply function is missing", () => {
    expect(applyHistoryFilterStateFromInputs({})).toEqual({
      didApply: false
    });
  });

  it("supports custom filter element ids", () => {
    const applyHistoryFilterState = vi.fn();
    const getElementById = vi.fn((id: string) => {
      const values: Record<string, unknown> = {
        mode: { value: "custom" },
        keyword: { value: "kw" },
        sort: { value: "ended_desc" },
        adapter: { value: "all" },
        burnin: { value: "100" },
        sustained: { value: "2" }
      };
      return values[id] || null;
    });

    applyHistoryFilterStateFromInputs({
      state: {},
      getElementById,
      historyQueryRuntime: {
        applyHistoryFilterState
      },
      modeElementId: "mode",
      keywordElementId: "keyword",
      sortElementId: "sort",
      adapterFilterElementId: "adapter",
      burnInWindowElementId: "burnin",
      sustainedWindowElementId: "sustained"
    });

    expect(applyHistoryFilterState).toHaveBeenCalledWith({}, {
      modeKeyRaw: "custom",
      keywordRaw: "kw",
      sortByRaw: "ended_desc",
      adapterParityFilterRaw: "all",
      burnInWindowRaw: "100",
      sustainedWindowsRaw: "2"
    });
  });
});
