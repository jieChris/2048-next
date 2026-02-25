(function (global) {
  "use strict";

  if (!global) return;

  function isPlainObject(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
  }

  function hasAdapterDiagnostics(item) {
    if (!item || typeof item !== "object") return false;
    return (
      isPlainObject(item.adapter_parity_report_v1) || isPlainObject(item.adapter_parity_ab_diff_v1)
    );
  }

  function toFiniteNumberOrNull(value) {
    var num = Number(value);
    return Number.isFinite(num) ? num : null;
  }

  function formatNullableNumber(value) {
    var num = toFiniteNumberOrNull(value);
    return num === null ? "-" : String(num);
  }

  function formatSignedDelta(value) {
    var num = toFiniteNumberOrNull(value);
    if (num === null) return "-";
    if (num > 0) return "+" + num;
    return String(num);
  }

  function formatNullableBoolean(value) {
    if (value === true) return "是";
    if (value === false) return "否";
    return "-";
  }

  function formatAdapterMode(mode) {
    if (mode === "core-adapter") return "core-adapter";
    if (mode === "legacy-bridge") return "legacy-bridge";
    return "-";
  }

  function getAdapterBadgeText(status) {
    if (status === "mismatch") return "A/B 不一致";
    if (status === "match") return "A/B 一致";
    return "A/B 样本不足";
  }

  function getAdapterBadgeClass(status) {
    if (status === "mismatch") return "history-adapter-badge-mismatch";
    if (status === "match") return "history-adapter-badge-match";
    return "history-adapter-badge-incomplete";
  }

  function resolveHistoryAdapterBadgeState(item, parityStatus) {
    if (!hasAdapterDiagnostics(item)) {
      return {
        hasBadge: false,
        className: "",
        text: ""
      };
    }
    var status = String(parityStatus || "incomplete");
    return {
      hasBadge: true,
      className: getAdapterBadgeClass(status),
      text: getAdapterBadgeText(status)
    };
  }

  function resolveHistoryAdapterDiagnosticsState(item) {
    var source = isPlainObject(item) ? item : null;
    var report =
      source && isPlainObject(source.adapter_parity_report_v1) ? source.adapter_parity_report_v1 : null;
    var diff =
      source && isPlainObject(source.adapter_parity_ab_diff_v1) ? source.adapter_parity_ab_diff_v1 : null;
    if (!report && !diff) {
      return {
        hasDiagnostics: false,
        lines: []
      };
    }

    var lines = [];
    if (report) {
      lines.push(
        "当前 " +
          formatAdapterMode(report.adapterMode) +
          " · 快照分数 " +
          formatNullableNumber(report.lastScoreFromSnapshot) +
          " · undoUsed " +
          formatNullableNumber(report.undoUsedFromSnapshot) +
          " · scoreDelta " +
          formatSignedDelta(report.scoreDelta) +
          " · 对齐 " +
          formatNullableBoolean(report.isScoreAligned)
      );
    }

    if (diff) {
      lines.push(
        "A/B comparable " +
          formatNullableBoolean(diff.comparable) +
          " · scoreΔ " +
          formatSignedDelta(diff.scoreDelta) +
          " · undoΔ " +
          formatSignedDelta(diff.undoUsedDelta) +
          " · overΔ " +
          formatSignedDelta(diff.overEventsDelta)
      );
    }

    return {
      hasDiagnostics: true,
      lines: lines
    };
  }

  global.CoreHistoryAdapterDiagnosticsRuntime = global.CoreHistoryAdapterDiagnosticsRuntime || {};
  global.CoreHistoryAdapterDiagnosticsRuntime.resolveHistoryAdapterBadgeState =
    resolveHistoryAdapterBadgeState;
  global.CoreHistoryAdapterDiagnosticsRuntime.resolveHistoryAdapterDiagnosticsState =
    resolveHistoryAdapterDiagnosticsState;
})(typeof window !== "undefined" ? window : undefined);
