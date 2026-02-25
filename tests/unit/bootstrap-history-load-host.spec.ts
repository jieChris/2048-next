import { describe, expect, it, vi } from "vitest";

import { applyHistoryLoadAndRender } from "../../src/bootstrap/history-load-host";

describe("bootstrap history load host", () => {
  it("delegates load and render orchestration to runtime dependencies", () => {
    const state = { page: 3, pageSize: 30 };
    const renderHistory = vi.fn();
    const renderSummary = vi.fn();
    const renderBurnInSummary = vi.fn();
    const renderCanaryPolicy = vi.fn();
    const setStatus = vi.fn();

    const result = applyHistoryLoadAndRender({
      resetPage: true,
      state,
      localHistoryStore: {},
      historyLoadRuntime: {
        resolveHistoryLoadPipeline: ({ state: currentState }: { state: { page: number } }) => ({
          listResult: { items: [{ id: "id-1" }], total: 1 },
          burnInSummary: { comparable: 1 },
          pagerState: {
            disablePrev: currentState.page <= 1,
            disableNext: false
          }
        })
      },
      historyQueryRuntime: {},
      historyBurnInRuntime: {},
      burnInMinComparable: 50,
      burnInMaxMismatchRate: 1,
      renderHistory,
      renderSummary,
      renderBurnInSummary,
      renderCanaryPolicy,
      setStatus
    });

    expect(state.page).toBe(1);
    expect(renderHistory).toHaveBeenCalledWith({ items: [{ id: "id-1" }], total: 1 });
    expect(renderSummary).toHaveBeenCalledWith({ items: [{ id: "id-1" }], total: 1 });
    expect(renderBurnInSummary).toHaveBeenCalledWith({ comparable: 1 });
    expect(renderCanaryPolicy).toHaveBeenCalledTimes(1);
    expect(setStatus).toHaveBeenCalledWith("", false);
    expect(result).toEqual({ didLoad: true, disablePrev: true, disableNext: false });
  });

  it("returns noop result when dependencies are missing", () => {
    expect(applyHistoryLoadAndRender({})).toEqual({
      didLoad: false,
      disablePrev: false,
      disableNext: false
    });
    expect(
      applyHistoryLoadAndRender({
        state: { page: 1 },
        localHistoryStore: {},
        historyLoadRuntime: {}
      })
    ).toEqual({
      didLoad: false,
      disablePrev: false,
      disableNext: false
    });
  });
});
