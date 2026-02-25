type AnyRecord = Record<string, unknown>;

export interface HistoryAdapterBadgeState {
  hasBadge: boolean;
  className: string;
  text: string;
}

export interface HistoryAdapterDiagnosticsState {
  hasDiagnostics: boolean;
  lines: string[];
}

function isPlainObject(value: unknown): value is AnyRecord {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function hasAdapterDiagnostics(item: unknown): boolean {
  if (!item || typeof item !== "object") return false;
  const source = item as AnyRecord;
  return (
    isPlainObject(source.adapter_parity_report_v1) || isPlainObject(source.adapter_parity_ab_diff_v1)
  );
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

function getAdapterBadgeText(status: string): string {
  if (status === "mismatch") return "A/B 不一致";
  if (status === "match") return "A/B 一致";
  return "A/B 样本不足";
}

function getAdapterBadgeClass(status: string): string {
  if (status === "mismatch") return "history-adapter-badge-mismatch";
  if (status === "match") return "history-adapter-badge-match";
  return "history-adapter-badge-incomplete";
}

export function resolveHistoryAdapterBadgeState(
  item: unknown,
  parityStatus: string
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
  const report = source && isPlainObject(source.adapter_parity_report_v1)
    ? source.adapter_parity_report_v1
    : null;
  const diff = source && isPlainObject(source.adapter_parity_ab_diff_v1)
    ? source.adapter_parity_ab_diff_v1
    : null;

  if (!report && !diff) {
    return {
      hasDiagnostics: false,
      lines: []
    };
  }

  const lines: string[] = [];
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
    lines
  };
}
