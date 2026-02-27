(function (global) {
  "use strict";

  if (!global) return;

  var PARITY_REPORT_V1_KEY = "adapter_parity_report_v1";
  var PARITY_REPORT_V2_KEY = "adapter_parity_report_v2";
  var PARITY_DIFF_V1_KEY = "adapter_parity_ab_diff_v1";
  var PARITY_DIFF_V2_KEY = "adapter_parity_ab_diff_v2";

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

  function hasAdapterDiagnostics(item) {
    var source = isPlainObject(item) ? item : null;
    return !!(resolveParityReportPayload(source) || resolveParityDiffPayload(source));
  }

  function resolveParitySchemaVersion(payload, fallback) {
    var num = Number(payload && payload.schemaVersion);
    if (Number.isInteger(num) && num > 0) return Number(num);
    return fallback;
  }

  function resolveParityPayload(source, v2Key, v1Key) {
    if (!source) return null;
    var fromV2 = source[v2Key];
    if (isPlainObject(fromV2)) {
      var schemaVersionV2 = resolveParitySchemaVersion(fromV2, 2);
      return Object.assign({}, fromV2, { schemaVersion: schemaVersionV2 });
    }
    var fromV1 = source[v1Key];
    if (isPlainObject(fromV1)) {
      var schemaVersionV1 = resolveParitySchemaVersion(fromV1, 1);
      return Object.assign({}, fromV1, { schemaVersion: schemaVersionV1 });
    }
    return null;
  }

  function resolveParityReportPayload(source) {
    return resolveParityPayload(source, PARITY_REPORT_V2_KEY, PARITY_REPORT_V1_KEY);
  }

  function resolveParityDiffPayload(source) {
    return resolveParityPayload(source, PARITY_DIFF_V2_KEY, PARITY_DIFF_V1_KEY);
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

  function resolveHistoryAdapterParityStatus(localHistoryStore, item) {
    var store = isPlainObject(localHistoryStore) ? localHistoryStore : null;
    var readStatus =
      store && typeof store.getAdapterParityStatus === "function"
        ? store.getAdapterParityStatus
        : null;
    if (!readStatus) return "incomplete";
    var status = readStatus(item);
    return typeof status === "string" && status ? status : "incomplete";
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
    var report = resolveParityReportPayload(source);
    var diff = resolveParityDiffPayload(source);
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

  function resolveHistoryAdapterBadgeHtml(state) {
    var badgeState = isPlainObject(state) ? state : null;
    if (!badgeState || badgeState.hasBadge !== true) return "";
    var className = String(badgeState.className || "");
    var text = String(badgeState.text || "");
    return (
      "<span class='history-adapter-badge " +
      escapeHtml(className) +
      "'>" +
      escapeHtml(text) +
      "</span>"
    );
  }

  function resolveHistoryAdapterDiagnosticsHtml(state) {
    var diagnosticsState = isPlainObject(state) ? state : null;
    if (!diagnosticsState || diagnosticsState.hasDiagnostics !== true) return "";
    var lines = Array.isArray(diagnosticsState.lines) ? diagnosticsState.lines : [];
    var html =
      "<div class='history-adapter-diagnostics'><div class='history-adapter-title'>Adapter 诊断</div>";
    for (var i = 0; i < lines.length; i++) {
      html += "<div class='history-adapter-line'>" + escapeHtml(lines[i]) + "</div>";
    }
    html += "</div>";
    return html;
  }

  global.CoreHistoryAdapterDiagnosticsRuntime = global.CoreHistoryAdapterDiagnosticsRuntime || {};
  global.CoreHistoryAdapterDiagnosticsRuntime.resolveHistoryAdapterParityStatus =
    resolveHistoryAdapterParityStatus;
  global.CoreHistoryAdapterDiagnosticsRuntime.resolveHistoryAdapterBadgeState =
    resolveHistoryAdapterBadgeState;
  global.CoreHistoryAdapterDiagnosticsRuntime.resolveHistoryAdapterDiagnosticsState =
    resolveHistoryAdapterDiagnosticsState;
  global.CoreHistoryAdapterDiagnosticsRuntime.resolveHistoryAdapterBadgeHtml =
    resolveHistoryAdapterBadgeHtml;
  global.CoreHistoryAdapterDiagnosticsRuntime.resolveHistoryAdapterDiagnosticsHtml =
    resolveHistoryAdapterDiagnosticsHtml;
})(typeof window !== "undefined" ? window : undefined);
