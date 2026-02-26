import { describe, expect, it } from "vitest";

import {
  applyHistoryBurnInSummaryRender,
  resolveHistoryBurnInMismatchFocusClickState,
  resolveHistoryBurnInPanelRenderState
} from "../../src/bootstrap/history-burnin-host";

describe("bootstrap history burn-in host", () => {
  it("resolves burn-in panel render state from burn-in runtime", () => {
    const panelState = resolveHistoryBurnInPanelRenderState({
      summary: { comparable: 2 },
      historyBurnInRuntime: {
        resolveHistoryBurnInSummaryState: () => ({ hasSummary: true }),
        resolveHistoryBurnInPanelHtml: () => "<div>burn-in</div>"
      }
    });

    expect(panelState).toEqual({
      panelHtml: "<div>burn-in</div>",
      shouldBindMismatchAction: true
    });
  });

  it("resolves mismatch focus click state from burn-in runtime", () => {
    const clickState = resolveHistoryBurnInMismatchFocusClickState({
      historyBurnInRuntime: {
        resolveHistoryBurnInMismatchFocusActionState: () => ({
          shouldApply: true,
          nextAdapterParityFilter: "mismatch",
          nextSelectValue: "mismatch",
          shouldReload: true,
          resetPage: true
        })
      }
    });

    expect(clickState).toEqual({
      shouldApply: true,
      nextAdapterParityFilter: "mismatch",
      nextSelectValue: "mismatch",
      shouldReload: true,
      resetPage: true
    });
  });

  it("returns noop states when burn-in runtime dependencies are missing", () => {
    expect(resolveHistoryBurnInPanelRenderState({})).toEqual({
      panelHtml: "",
      shouldBindMismatchAction: false
    });
    expect(resolveHistoryBurnInMismatchFocusClickState({})).toEqual({
      shouldApply: false,
      nextAdapterParityFilter: "",
      nextSelectValue: "",
      shouldReload: false,
      resetPage: false
    });
  });

  it("applies burn-in panel render and binds mismatch action", () => {
    const handlers: Record<string, () => void> = {};
    const mismatchButton = {
      addEventListener(name: string, cb: () => void) {
        handlers[name] = cb;
      }
    };
    const panelElement = {
      innerHTML: "",
      querySelector(selector: string) {
        return selector === ".history-burnin-focus-mismatch" ? mismatchButton : null;
      }
    };
    const adapterFilterElement = { value: "all" };
    let adapterParityFilter = "all";
    const loadHistoryCalls: unknown[] = [];

    const result = applyHistoryBurnInSummaryRender({
      panelElement,
      summary: { total: 1 },
      historyBurnInRuntime: {
        resolveHistoryBurnInSummaryState: () => ({ hasSummary: true }),
        resolveHistoryBurnInPanelHtml: () =>
          "<button class='history-burnin-focus-mismatch'>仅看不一致</button>",
        resolveHistoryBurnInMismatchFocusActionState: () => ({
          shouldApply: true,
          nextAdapterParityFilter: "mismatch",
          nextSelectValue: "mismatch",
          shouldReload: true,
          resetPage: true
        })
      },
      adapterFilterElement,
      setAdapterParityFilter: (nextValue: unknown) => {
        adapterParityFilter = String(nextValue);
      },
      loadHistory: (resetPage: unknown) => {
        loadHistoryCalls.push(resetPage);
      }
    });

    expect(result).toEqual({
      didRender: true,
      didBindMismatchAction: true
    });
    expect(panelElement.innerHTML).toContain("history-burnin-focus-mismatch");
    handlers.click();
    expect(adapterFilterElement.value).toBe("mismatch");
    expect(adapterParityFilter).toBe("mismatch");
    expect(loadHistoryCalls).toEqual([true]);
  });
});
