type AnyRecord = Record<string, unknown>;
const PARITY_REPORT_V1_KEY = "adapter_parity_report_v1";
const PARITY_REPORT_V2_KEY = "adapter_parity_report_v2";
const PARITY_DIFF_V1_KEY = "adapter_parity_ab_diff_v1";
const PARITY_DIFF_V2_KEY = "adapter_parity_ab_diff_v2";

export interface HistoryAdapterBadgeState {
  hasBadge: boolean;
  className: string;
  text: string;
}

export interface HistoryAdapterDiagnosticsState {
  hasDiagnostics: boolean;
  lines: string[];
}

interface MaybeBadgeState {
  hasBadge?: unknown;
  className?: unknown;
  text?: unknown;
}

interface MaybeDiagnosticsState {
  hasDiagnostics?: unknown;
  lines?: unknown;
}

function isPlainObject(value: unknown): value is AnyRecord {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function escapeHtml(value: unknown): string {
  const text = String(value == null ? "" : value);
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function hasAdapterDiagnostics(item: unknown): boolean {
  const source = isPlainObject(item) ? item : null;
  return !!(resolveParityReportPayload(source) || resolveParityDiffPayload(source));
}

function resolveParitySchemaVersion(payload: AnyRecord | null, fallback: number): number {
  const num = Number(payload && payload.schemaVersion);
  if (Number.isInteger(num) && num > 0) return Number(num);
  return fallback;
}

function resolveParityPayload(
  source: AnyRecord | null,
  v2Key: string,
  v1Key: string
): AnyRecord | null {
  if (!source) return null;
  const fromV2 = source[v2Key];
  if (isPlainObject(fromV2)) {
    const schemaVersion = resolveParitySchemaVersion(fromV2, 2);
    return {
      ...fromV2,
      schemaVersion
    };
  }
  const fromV1 = source[v1Key];
  if (isPlainObject(fromV1)) {
    const schemaVersion = resolveParitySchemaVersion(fromV1, 1);
    return {
      ...fromV1,
      schemaVersion
    };
  }
  return null;
}

function resolveParityReportPayload(source: AnyRecord | null): AnyRecord | null {
  return resolveParityPayload(source, PARITY_REPORT_V2_KEY, PARITY_REPORT_V1_KEY);
}

function resolveParityDiffPayload(source: AnyRecord | null): AnyRecord | null {
  return resolveParityPayload(source, PARITY_DIFF_V2_KEY, PARITY_DIFF_V1_KEY);
}

function toFiniteNumberOrNull(value: unknown): number | null {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function formatNullableNumber(value: unknown): string {
  const num = toFiniteNumberOrNull(value);
  return num === null ? "-" : String(num);
}

function formatSignedDelta(value: unknown): string {
  const num = toFiniteNumberOrNull(value);
  if (num === null) return "-";
  if (num > 0) return "+" + num;
  return String(num);
}

function formatNullableBoolean(value: unknown): string {
  if (value === true) return "是";
  if (value === false) return "否";
  return "-";
}

function formatAdapterMode(mode: unknown): string {
  if (mode === "core-adapter") return "core-adapter";
  if (mode === "legacy-bridge") return "legacy-bridge";
  return "-";
}

function formatSchemaTag(payload: AnyRecord | null): string {
  if (!payload) return "-";
  const schemaVersion = resolveParitySchemaVersion(payload, 0);
  if (schemaVersion <= 0) return "-";
  return "v" + String(schemaVersion);
}

function getAdapterBadgeText(status: string): string {
  if (status === "mismatch") return "A/B 不一致";
  if (status === "match") return "A/B 一致";
  return "A/B 样本不足";
}

function formatComparableReason(diff: AnyRecord | null): string {
  if (!diff) return "-";
  if (diff.comparable === true) return "-";
  if (diff.hasLegacyReport === false && diff.hasCoreReport === true) return "缺少 legacy 报告";
  if (diff.hasLegacyReport === true && diff.hasCoreReport === false) return "缺少 core 报告";
  if (diff.hasLegacyReport === false && diff.hasCoreReport === false) return "双侧报告缺失";
  if (diff.hasLegacyReport === true && diff.hasCoreReport === true) return "mode 不可比";
  return "-";
}

function getAdapterBadgeClass(status: string): string {
  if (status === "mismatch") return "history-adapter-badge-mismatch";
  if (status === "match") return "history-adapter-badge-match";
  return "history-adapter-badge-incomplete";
}

export function resolveHistoryAdapterParityStatus(
  localHistoryStore: unknown,
  item: unknown
): string {
  const store = isPlainObject(localHistoryStore) ? localHistoryStore : null;
  const readStatus = store && typeof store.getAdapterParityStatus === "function"
    ? store.getAdapterParityStatus
    : null;
  if (!readStatus) return "incomplete";
  const status = (readStatus as (entry: unknown) => unknown)(item);
  return typeof status === "string" && status ? status : "incomplete";
}

export function resolveHistoryAdapterBadgeState(
  item: unknown,
  parityStatus: unknown
): HistoryAdapterBadgeState {
  if (!hasAdapterDiagnostics(item)) {
    return {
      hasBadge: false,
      className: "",
      text: ""
    };
  }
  const status = String(parityStatus || "incomplete");
  return {
    hasBadge: true,
    className: getAdapterBadgeClass(status),
    text: getAdapterBadgeText(status)
  };
}

export function resolveHistoryAdapterDiagnosticsState(item: unknown): HistoryAdapterDiagnosticsState {
  const source = isPlainObject(item) ? item : null;
  const report = resolveParityReportPayload(source);
  const diff = resolveParityDiffPayload(source);

  if (!report && !diff) {
    return {
      hasDiagnostics: false,
      lines: []
    };
  }

  const lines: string[] = [];
  if (report) {
    lines.push(
      "Report(" +
        formatSchemaTag(report) +
        ") 当前 " +
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
      "Diff(" +
        formatSchemaTag(diff) +
        ") A/B comparable " +
        formatNullableBoolean(diff.comparable) +
        " · scoreΔ " +
        formatSignedDelta(diff.scoreDelta) +
        " · undoΔ " +
        formatSignedDelta(diff.undoUsedDelta) +
        " · overΔ " +
        formatSignedDelta(diff.overEventsDelta) +
        " · undoEvtΔ " +
        formatSignedDelta(diff.undoEventsDelta) +
        " · wonEvtΔ " +
        formatSignedDelta(diff.wonEventsDelta) +
        " · scoreMatch " +
        formatNullableBoolean(diff.isScoreMatch) +
        " · 双侧对齐 " +
        formatNullableBoolean(diff.bothScoreAligned) +
        " · 原因 " +
        formatComparableReason(diff)
    );
  }

  return {
    hasDiagnostics: true,
    lines
  };
}

export function resolveHistoryAdapterBadgeHtml(state: unknown): string {
  const badgeState = isPlainObject(state) ? (state as MaybeBadgeState) : null;
  if (!badgeState || badgeState.hasBadge !== true) return "";
  const className = String(badgeState.className || "");
  const text = String(badgeState.text || "");
  return (
    "<span class='history-adapter-badge " +
    escapeHtml(className) +
    "'>" +
    escapeHtml(text) +
    "</span>"
  );
}

export function resolveHistoryAdapterDiagnosticsHtml(state: unknown): string {
  const diagnosticsState = isPlainObject(state) ? (state as MaybeDiagnosticsState) : null;
  if (!diagnosticsState || diagnosticsState.hasDiagnostics !== true) return "";
  const lines = Array.isArray(diagnosticsState.lines) ? diagnosticsState.lines : [];
  let html = "<div class='history-adapter-diagnostics'><div class='history-adapter-title'>Adapter 诊断</div>";
  for (let i = 0; i < lines.length; i++) {
    html += "<div class='history-adapter-line'>" + escapeHtml(lines[i]) + "</div>";
  }
  html += "</div>";
  return html;
}
