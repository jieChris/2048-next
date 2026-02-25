import { describe, expect, it } from "vitest";

import {
  resolveHistoryBurnInMismatchFocusActionState,
  resolveHistoryBurnInPanelHtml,
  resolveHistoryBurnInSummaryState
} from "../../src/bootstrap/history-burnin";

describe("bootstrap history burn-in", () => {
  it("returns empty state for invalid summary input", () => {
    const state = resolveHistoryBurnInSummaryState(null);
    expect(state).toEqual({
      hasSummary: false,
      limitText: "",
      gateLabel: "",
      gateClass: "history-burnin-gate-warn",
      sustainedGateLabel: "",
      sustainedGateClass: "history-burnin-gate-warn",
      sustainedWindowSize: 0,
      sustainedRequired: 0,
      sustainedEvaluated: 0,
      sustainedConsecutive: 0,
      mismatchActionEnabled: false,
      mismatchRateText: "-",
      maxMismatchRateText: "-"
    });
  });

  it("builds summary labels, classes and mismatch action state", () => {
    const state = resolveHistoryBurnInSummaryState({
      sampleLimit: 200,
      evaluatedRecords: 120,
      gateStatus: "fail",
      sustainedGateStatus: "pass",
      sustainedWindowSize: 200,
      sustainedWindows: 3,
      sustainedEvaluatedWindows: 2,
      sustainedConsecutivePass: 1,
      mismatch: 4,
      mismatchRate: 2.5,
      maxMismatchRate: 1
    });

    expect(state.hasSummary).toBe(true);
    expect(state.limitText).toBe("最近 120 条（窗口 200）");
    expect(state.gateLabel).toBe("未达标");
    expect(state.gateClass).toBe("history-burnin-gate-fail");
    expect(state.sustainedGateLabel).toBe("连续达标");
    expect(state.sustainedGateClass).toBe("history-burnin-gate-pass");
    expect(state.sustainedWindowSize).toBe(200);
    expect(state.sustainedRequired).toBe(3);
    expect(state.sustainedEvaluated).toBe(2);
    expect(state.sustainedConsecutive).toBe(1);
    expect(state.mismatchActionEnabled).toBe(true);
    expect(state.mismatchRateText).toBe("2.50%");
    expect(state.maxMismatchRateText).toBe("1.00%");
  });

  it("handles all-records limit and non-pass sustained gate fallback", () => {
    const state = resolveHistoryBurnInSummaryState({
      sampleLimit: null,
      evaluatedRecords: 2,
      gateStatus: "unknown",
      sustainedGateStatus: "insufficient_window",
      sustainedWindowSize: "bad",
      sustainedWindows: undefined,
      sustainedEvaluatedWindows: null,
      sustainedConsecutivePass: NaN,
      mismatch: 0,
      mismatchRate: "bad",
      maxMismatchRate: "bad"
    });

    expect(state.limitText).toBe("全部 2 条");
    expect(state.gateLabel).toBe("样本不足");
    expect(state.gateClass).toBe("history-burnin-gate-warn");
    expect(state.sustainedGateLabel).toBe("窗口不足");
    expect(state.sustainedGateClass).toBe("history-burnin-gate-warn");
    expect(state.sustainedWindowSize).toBe(0);
    expect(state.sustainedRequired).toBe(0);
    expect(state.sustainedEvaluated).toBe(0);
    expect(state.sustainedConsecutive).toBe(0);
    expect(state.mismatchActionEnabled).toBe(false);
    expect(state.mismatchRateText).toBe("-");
    expect(state.maxMismatchRateText).toBe("-");
  });

  it("returns mismatch focus action state", () => {
    expect(resolveHistoryBurnInMismatchFocusActionState()).toEqual({
      shouldApply: true,
      nextAdapterParityFilter: "mismatch",
      nextSelectValue: "mismatch",
      shouldReload: true,
      resetPage: true
    });
  });

  it("builds burn-in panel html from summary state", () => {
    const summaryState = resolveHistoryBurnInSummaryState({
      sampleLimit: 200,
      evaluatedRecords: 120,
      gateStatus: "fail",
      sustainedGateStatus: "pass",
      sustainedWindowSize: 200,
      sustainedWindows: 3,
      sustainedEvaluatedWindows: 2,
      sustainedConsecutivePass: 1,
      mismatch: 4,
      mismatchRate: 2.5,
      maxMismatchRate: 1
    });
    const html = resolveHistoryBurnInPanelHtml(
      {
        withDiagnostics: 20,
        comparable: 18,
        match: 14,
        mismatch: 4,
        incomplete: 2,
        minComparable: 50
      },
      summaryState
    );
    expect(html).toContain("Cutover Burn-in 统计");
    expect(html).toContain("仅看不一致");
    expect(html).toContain("不一致率 2.50%");
  });

  it("builds empty burn-in panel html when summary state is unavailable", () => {
    expect(resolveHistoryBurnInPanelHtml(null, null)).toBe(
      "<div class='history-burnin-empty'>暂无 burn-in 数据</div>"
    );
  });
});
