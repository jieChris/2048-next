type AnyRecord = Record<string, unknown>;

export interface HistoryBurnInSummaryState {
  hasSummary: boolean;
  limitText: string;
  gateLabel: string;
  gateClass: string;
  sustainedGateLabel: string;
  sustainedGateClass: string;
  sustainedWindowSize: number;
  sustainedRequired: number;
  sustainedEvaluated: number;
  sustainedConsecutive: number;
  mismatchActionEnabled: boolean;
  mismatchRateText: string;
  maxMismatchRateText: string;
}

function isPlainObject(value: unknown): value is AnyRecord {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function toFiniteNumberOrNull(value: unknown): number | null {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function toFiniteNumberOrZero(value: unknown): number {
  const num = toFiniteNumberOrNull(value);
  return num === null ? 0 : num;
}

function formatPercent(value: unknown): string {
  const num = toFiniteNumberOrNull(value);
  if (num === null) return "-";
  return num.toFixed(2) + "%";
}

function getBurnInGateLabel(status: unknown): string {
  if (status === "pass") return "达标";
  if (status === "fail") return "未达标";
  return "样本不足";
}

function getBurnInGateClass(status: unknown): string {
  if (status === "pass") return "history-burnin-gate-pass";
  if (status === "fail") return "history-burnin-gate-fail";
  return "history-burnin-gate-warn";
}

function getSustainedGateLabel(status: unknown): string {
  if (status === "pass") return "连续达标";
  if (status === "fail") return "连续未达标";
  if (status === "insufficient_window") return "窗口不足";
  return "样本不足";
}

export function resolveHistoryBurnInSummaryState(summary: unknown): HistoryBurnInSummaryState {
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

  const limitText = summary.sampleLimit === null
    ? "全部 " + toFiniteNumberOrZero(summary.evaluatedRecords) + " 条"
    : "最近 " +
      toFiniteNumberOrZero(summary.evaluatedRecords) +
      " 条（窗口 " +
      String(summary.sampleLimit) +
      "）";

  const sustainedGateClassInput =
    summary.sustainedGateStatus === "pass" || summary.sustainedGateStatus === "fail"
      ? summary.sustainedGateStatus
      : "warn";

  return {
    hasSummary: true,
    limitText,
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
