import { describe, expect, it, vi } from "vitest";

import { applyHistoryLoadEntry } from "../../src/bootstrap/history-load-entry-host";

describe("bootstrap history load entry host", () => {
  it("delegates filter apply and load-with-pager orchestration", () => {
    const applyHistoryFilterStateFromInputs = vi.fn();
    const applyHistoryLoadWithPager = vi.fn();
    const persistHistoryFilterState = vi.fn();
    const state = { page: 2 };
    const getElementById = vi.fn();
    const localHistoryStore = {};

    const result = applyHistoryLoadEntry({
      resetPage: true,
      localHistoryStore,
      historyFilterHostRuntime: {
        applyHistoryFilterStateFromInputs
      },
      state,
      historyQueryRuntime: {},
      getElementById,
      historyLoadHostRuntime: {
        applyHistoryLoadWithPager
      },
      historyLoadRuntime: {},
      historyBurnInRuntime: {},
      burnInMinComparable: 50,
      burnInMaxMismatchRate: 1,
      renderHistory: () => undefined,
      renderSummary: () => undefined,
      renderBurnInSummary: () => undefined,
      renderCanaryPolicy: () => undefined,
      setStatus: () => undefined,
      persistHistoryFilterState,
      prevButtonId: "history-prev-page",
      nextButtonId: "history-next-page"
    });

    expect(result).toEqual({
      didLoad: true,
      missingStore: false
    });
    expect(applyHistoryFilterStateFromInputs).toHaveBeenCalledWith({
      state,
      historyQueryRuntime: {},
      getElementById
    });
    expect(persistHistoryFilterState).toHaveBeenCalledTimes(1);
    expect(applyHistoryLoadWithPager).toHaveBeenCalledTimes(1);
  });

  it("returns missingStore when LocalHistoryStore is absent", () => {
    expect(applyHistoryLoadEntry({})).toEqual({
      didLoad: false,
      missingStore: true
    });
  });

  it("returns didLoad false when load host runtime function is missing", () => {
    const result = applyHistoryLoadEntry({
      localHistoryStore: {},
      historyFilterHostRuntime: {}
    });
    expect(result).toEqual({
      didLoad: false,
      missingStore: false
    });
  });
});
