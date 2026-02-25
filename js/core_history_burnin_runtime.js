(function (global) {
  "use strict";

  if (!global) return;

  function isPlainObject(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
  }

  function escapeHtml(value) {
    var text = String(value == null ? "" : value);
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
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

  function resolveHistoryBurnInPanelHtml(summary, burnInState) {
    var state = burnInState;
    if (!state || state.hasSummary !== true) {
      return "<div class='history-burnin-empty'>暂无 burn-in 数据</div>";
    }

    var source = isPlainObject(summary) ? summary : {};
    var mismatchAction = state.mismatchActionEnabled
      ? "<button class='replay-button history-burnin-focus-mismatch'>仅看不一致</button>"
      : "";

    return (
      "<div class='history-burnin-head'>" +
        "<div class='history-burnin-title'>Cutover Burn-in 统计</div>" +
        "<div class='history-burnin-gates'>" +
          "<span class='history-burnin-gate " +
            state.gateClass +
            "'>单窗口: " +
            escapeHtml(state.gateLabel) +
          "</span>" +
          "<span class='history-burnin-gate " +
            state.sustainedGateClass +
            "'>连续窗口: " +
            escapeHtml(state.sustainedGateLabel) +
          "</span>" +
        "</div>" +
      "</div>" +
      "<div class='history-burnin-grid'>" +
        "<span>采样: " + escapeHtml(state.limitText) + "</span>" +
        "<span>诊断记录 " + escapeHtml(source.withDiagnostics) + "</span>" +
        "<span>可比较样本 " + escapeHtml(source.comparable) + "</span>" +
        "<span>一致 " + escapeHtml(source.match) + "</span>" +
        "<span>不一致 " + escapeHtml(source.mismatch) + "</span>" +
        "<span>样本不足 " + escapeHtml(source.incomplete) + "</span>" +
        "<span>不一致率 " + escapeHtml(state.mismatchRateText) + "</span>" +
      "</div>" +
      "<div class='history-burnin-note'>" +
        "门槛: 可比较 >= " +
        escapeHtml(source.minComparable) +
        "，不一致率 <= " +
        escapeHtml(state.maxMismatchRateText) +
      "</div>" +
      "<div class='history-burnin-note'>" +
        "连续门槛: 最近 " +
        escapeHtml(state.sustainedRequired) +
        " 个窗口（每窗口 " +
        escapeHtml(state.sustainedWindowSize) +
        " 条）均需单窗口达标" +
      "</div>" +
      "<div class='history-burnin-note'>" +
        "连续通过 " +
        escapeHtml(state.sustainedConsecutive) +
        "/" +
        escapeHtml(state.sustainedRequired) +
        "，已评估窗口 " +
        escapeHtml(state.sustainedEvaluated) +
      "</div>" +
      (mismatchAction ? "<div class='history-burnin-actions'>" + mismatchAction + "</div>" : "")
    );
  }

  global.CoreHistoryBurnInRuntime = global.CoreHistoryBurnInRuntime || {};
  global.CoreHistoryBurnInRuntime.resolveHistoryBurnInSummaryState = resolveHistoryBurnInSummaryState;
  global.CoreHistoryBurnInRuntime.resolveHistoryBurnInMismatchFocusActionState =
    resolveHistoryBurnInMismatchFocusActionState;
  global.CoreHistoryBurnInRuntime.resolveHistoryBurnInPanelHtml = resolveHistoryBurnInPanelHtml;
})(typeof window !== "undefined" ? window : undefined);
