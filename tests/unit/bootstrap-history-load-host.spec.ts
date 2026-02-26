import { describe, expect, it, vi } from "vitest";

import {
  applyHistoryLoadAndRender,
  applyHistoryLoadWithPager,
  applyHistoryPagerButtonState
} from "../../src/bootstrap/history-load-host";

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

  it("delegates summary/status apply via history view host runtime when provided", () => {
    const state = { page: 2, pageSize: 30 };
    const renderSummary = vi.fn();
    const setStatus = vi.fn();
    const applyHistorySummary = vi.fn();
    const applyHistoryStatus = vi.fn();
    const getElementById = vi.fn();

    const result = applyHistoryLoadAndRender({
      state,
      localHistoryStore: {},
      historyLoadRuntime: {
        resolveHistoryLoadPipeline: () => ({
          listResult: { items: [], total: 0 },
          burnInSummary: null,
          pagerState: {
            disablePrev: false,
            disableNext: true
          }
        })
      },
      historyViewHostRuntime: {
        applyHistorySummary,
        applyHistoryStatus
      },
      historySummaryRuntime: {},
      historyStatusRuntime: {},
      getElementById,
      renderSummary,
      setStatus
    });

    expect(result).toEqual({ didLoad: true, disablePrev: false, disableNext: true });
    expect(applyHistorySummary).toHaveBeenCalledWith({
      getElementById,
      summaryElementId: "history-summary",
      result: { items: [], total: 0 },
      state,
      historySummaryRuntime: {}
    });
    expect(applyHistoryStatus).toHaveBeenCalledWith({
      getElementById,
      statusElementId: "history-status",
      text: "",
      isError: false,
      historyStatusRuntime: {}
    });
    expect(renderSummary).not.toHaveBeenCalled();
    expect(setStatus).not.toHaveBeenCalled();
  });

  it("delegates list/burn-in/canary panel rendering via panel host runtime when provided", () => {
    const applyHistoryRecordListPanelRender = vi.fn();
    const applyHistoryBurnInPanelRender = vi.fn();
    const applyHistoryCanaryPolicyPanelRender = vi.fn();
    const renderHistory = vi.fn();
    const renderBurnInSummary = vi.fn();
    const renderCanaryPolicy = vi.fn();

    const result = applyHistoryLoadAndRender({
      state: { page: 1 },
      localHistoryStore: {},
      historyLoadRuntime: {
        resolveHistoryLoadPipeline: () => ({
          listResult: { items: [{ id: "id-1" }], total: 1 },
          burnInSummary: { comparable: 1 },
          pagerState: {
            disablePrev: true,
            disableNext: false
          }
        })
      },
      historyPanelHostRuntime: {
        applyHistoryRecordListPanelRender,
        applyHistoryBurnInPanelRender,
        applyHistoryCanaryPolicyPanelRender
      },
      historyPanelContext: {
        getElementById: () => null,
        listElementId: "history-list",
        burnInPanelElementId: "history-burnin-summary",
        canaryPanelElementId: "history-canary-policy"
      },
      loadHistory: () => undefined,
      setStatus: () => undefined,
      renderHistory,
      renderBurnInSummary,
      renderCanaryPolicy
    });

    expect(result).toEqual({ didLoad: true, disablePrev: true, disableNext: false });
    expect(applyHistoryRecordListPanelRender).toHaveBeenCalledTimes(1);
    expect(applyHistoryBurnInPanelRender).toHaveBeenCalledTimes(1);
    expect(applyHistoryCanaryPolicyPanelRender).toHaveBeenCalledTimes(1);
    expect(renderHistory).not.toHaveBeenCalled();
    expect(renderBurnInSummary).not.toHaveBeenCalled();
    expect(renderCanaryPolicy).not.toHaveBeenCalled();
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

  it("applies pager button disabled state from load result", () => {
    const prevButton = { disabled: false };
    const nextButton = { disabled: false };

    const result = applyHistoryPagerButtonState({
      prevButton,
      nextButton,
      loadResult: {
        disablePrev: true,
        disableNext: false
      }
    });

    expect(result).toEqual({ didApply: true });
    expect(prevButton.disabled).toBe(true);
    expect(nextButton.disabled).toBe(false);
  });

  it("loads and applies pager state through one host entry", () => {
    const state = { page: 2 };
    const prevButton = { disabled: false };
    const nextButton = { disabled: false };
    const getElementById = vi.fn((id: string) => {
      if (id === "history-prev-page") return prevButton;
      if (id === "history-next-page") return nextButton;
      return null;
    });

    const result = applyHistoryLoadWithPager({
      state,
      localHistoryStore: {},
      historyLoadRuntime: {
        resolveHistoryLoadPipeline: () => ({
          listResult: { items: [], total: 0 },
          burnInSummary: null,
          pagerState: {
            disablePrev: false,
            disableNext: true
          }
        })
      },
      getElementById
    });

    expect(result).toEqual({
      didLoad: true,
      disablePrev: false,
      disableNext: true,
      didApplyPagerState: true
    });
    expect(prevButton.disabled).toBe(false);
    expect(nextButton.disabled).toBe(true);
    expect(getElementById).toHaveBeenCalledWith("history-prev-page");
    expect(getElementById).toHaveBeenCalledWith("history-next-page");
  });
});
