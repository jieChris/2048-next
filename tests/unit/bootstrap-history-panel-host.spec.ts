import { describe, expect, it, vi } from "vitest";

import {
  applyHistoryBurnInPanelRender,
  applyHistoryCanaryPolicyPanelRender,
  applyHistoryRecordListPanelRender
} from "../../src/bootstrap/history-panel-host";

describe("bootstrap history panel host", () => {
  it("delegates burn-in panel render orchestration to burn-in host runtime", () => {
    const applyHistoryBurnInSummaryRender = vi.fn();
    const state = { adapterParityFilter: "all" };
    const panelElement = {};
    const adapterFilterElement = { value: "all" };

    const result = applyHistoryBurnInPanelRender({
      getElementById: (id: string) =>
        id === "history-burnin-summary"
          ? panelElement
          : id === "history-adapter-filter"
            ? adapterFilterElement
            : null,
      state,
      summary: { comparable: 2 },
      historyBurnInHostRuntime: {
        applyHistoryBurnInSummaryRender
      },
      historyBurnInRuntime: { resolveHistoryBurnInSummaryState: () => ({}) },
      loadHistory: () => undefined
    });

    expect(result).toEqual({ didRender: true });
    expect(applyHistoryBurnInSummaryRender).toHaveBeenCalledTimes(1);
    const payload = applyHistoryBurnInSummaryRender.mock.calls[0][0] as {
      setAdapterParityFilter: (nextValue: string) => void;
    };
    payload.setAdapterParityFilter("mismatch");
    expect(state.adapterParityFilter).toBe("mismatch");
  });

  it("delegates canary panel render orchestration to canary host runtime", () => {
    const applyHistoryCanaryPanelRender = vi.fn();
    const panelElement = {};

    const result = applyHistoryCanaryPolicyPanelRender({
      getElementById: () => panelElement,
      historyCanaryHostRuntime: {
        applyHistoryCanaryPanelRender
      },
      runtime: {},
      readStorageValue: () => null,
      historyCanarySourceRuntime: {},
      historyCanaryPolicyRuntime: {},
      historyCanaryViewRuntime: {},
      historyCanaryPanelRuntime: {},
      historyCanaryActionRuntime: {},
      writeStorageValue: () => true,
      loadHistory: () => undefined,
      setStatus: () => undefined
    });

    expect(result).toEqual({ didRender: true });
    expect(applyHistoryCanaryPanelRender).toHaveBeenCalledTimes(1);
  });

  it("delegates history list render orchestration to list host runtime", () => {
    const applyHistoryRecordListRender = vi.fn();
    const resolveHistoryFinalBoardHtml = vi.fn(() => "<div>board</div>");
    const listElement = {};

    const result = applyHistoryRecordListPanelRender({
      getElementById: () => listElement,
      result: { items: [{ id: "id-1" }], total: 1 },
      documentLike: {},
      localHistoryStore: {},
      modeCatalog: {},
      historyAdapterHostRuntime: {},
      historyAdapterDiagnosticsRuntime: {},
      historyRecordViewRuntime: {},
      historyRecordItemRuntime: {},
      historyRecordActionsRuntime: {},
      historyRecordHostRuntime: {},
      historyExportRuntime: {},
      historyRecordListHostRuntime: {
        applyHistoryRecordListRender
      },
      historyBoardRuntime: {
        resolveHistoryFinalBoardHtml
      },
      confirmAction: () => true,
      setStatus: () => undefined,
      loadHistory: () => undefined,
      navigateToHref: () => undefined
    });

    expect(result).toEqual({ didRender: true });
    expect(applyHistoryRecordListRender).toHaveBeenCalledTimes(1);
    const payload = applyHistoryRecordListRender.mock.calls[0][0] as {
      boardToHtml: (board: unknown, width: unknown, height: unknown) => string;
    };
    expect(payload.boardToHtml([], 4, 4)).toBe("<div>board</div>");
    expect(resolveHistoryFinalBoardHtml).toHaveBeenCalledWith([], 4, 4);
  });

  it("returns noop when required element is missing", () => {
    expect(
      applyHistoryBurnInPanelRender({
        getElementById: () => null,
        historyBurnInHostRuntime: {
          applyHistoryBurnInSummaryRender: () => undefined
        }
      })
    ).toEqual({ didRender: false });
  });
});
