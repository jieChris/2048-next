import { describe, expect, it } from "vitest";

import {
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
});
