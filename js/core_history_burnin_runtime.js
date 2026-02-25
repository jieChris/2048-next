(function (global) {
  "use strict";

  if (!global) return;

  function isPlainObject(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
  }

  function toFiniteNumberOrNull(value) {
    var num = Number(value);
    return Number.isFinite(num) ? num : null;
  }

  function toFiniteNumberOrZero(value) {
    var num = toFiniteNumberOrNull(value);
    return num === null ? 0 : num;
  }

  function formatPercent(value) {
    var num = toFiniteNumberOrNull(value);
    if (num === null) return "-";
    return num.toFixed(2) + "%";
  }

  function getBurnInGateLabel(status) {
    if (status === "pass") return "达标";
    if (status === "fail") return "未达标";
    return "样本不足";
  }

  function getBurnInGateClass(status) {
    if (status === "pass") return "history-burnin-gate-pass";
    if (status === "fail") return "history-burnin-gate-fail";
    return "history-burnin-gate-warn";
  }

  function getSustainedGateLabel(status) {
    if (status === "pass") return "连续达标";
    if (status === "fail") return "连续未达标";
    if (status === "insufficient_window") return "窗口不足";
    return "样本不足";
  }

  function resolveHistoryBurnInSummaryState(summary) {
    if (!isPlainObject(summary)) {
      return {
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
      };
    }

    var limitText =
      summary.sampleLimit === null
        ? "全部 " + toFiniteNumberOrZero(summary.evaluatedRecords) + " 条"
        : "最近 " +
          toFiniteNumberOrZero(summary.evaluatedRecords) +
          " 条（窗口 " +
          String(summary.sampleLimit) +
          "）";

    var sustainedGateClassInput =
      summary.sustainedGateStatus === "pass" || summary.sustainedGateStatus === "fail"
        ? summary.sustainedGateStatus
        : "warn";

    return {
      hasSummary: true,
      limitText: limitText,
      gateLabel: getBurnInGateLabel(summary.gateStatus),
      gateClass: getBurnInGateClass(summary.gateStatus),
      sustainedGateLabel: getSustainedGateLabel(summary.sustainedGateStatus),
      sustainedGateClass: getBurnInGateClass(sustainedGateClassInput),
      sustainedWindowSize: toFiniteNumberOrZero(summary.sustainedWindowSize),
      sustainedRequired: toFiniteNumberOrZero(summary.sustainedWindows),
      sustainedEvaluated: toFiniteNumberOrZero(summary.sustainedEvaluatedWindows),
      sustainedConsecutive: toFiniteNumberOrZero(summary.sustainedConsecutivePass),
      mismatchActionEnabled: toFiniteNumberOrZero(summary.mismatch) > 0,
      mismatchRateText: formatPercent(summary.mismatchRate),
      maxMismatchRateText: formatPercent(summary.maxMismatchRate)
    };
  }

  function resolveHistoryBurnInMismatchFocusActionState() {
    return {
      shouldApply: true,
      nextAdapterParityFilter: "mismatch",
      nextSelectValue: "mismatch",
      shouldReload: true,
      resetPage: true
    };
  }

  global.CoreHistoryBurnInRuntime = global.CoreHistoryBurnInRuntime || {};
  global.CoreHistoryBurnInRuntime.resolveHistoryBurnInSummaryState = resolveHistoryBurnInSummaryState;
  global.CoreHistoryBurnInRuntime.resolveHistoryBurnInMismatchFocusActionState =
    resolveHistoryBurnInMismatchFocusActionState;
})(typeof window !== "undefined" ? window : undefined);
