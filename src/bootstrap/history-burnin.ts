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
  comparableMatchRateText: string;
  sustainedPassRateText: string;
  topMismatchModesText: string;
  maxMismatchRateText: string;
}

export interface HistoryBurnInMismatchFocusActionState {
  shouldApply: boolean;
  nextAdapterParityFilter: string;
  nextSelectValue: string;
  shouldReload: boolean;
  resetPage: boolean;
}

interface HistoryBurnInSummaryReader {
  getAdapterParityBurnInSummary?: (query: unknown) => unknown;
}

export interface ResolveHistoryBurnInSummarySourceInput {
  localHistoryStore?: unknown;
  resolveBurnInQuery?: ((input: unknown) => unknown) | null;
  queryInput?: unknown;
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

function isPlainObject(value: unknown): value is AnyRecord {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function asSummaryReader(value: unknown): HistoryBurnInSummaryReader | null {
  if (!value || typeof value !== "object") return null;
  return value as HistoryBurnInSummaryReader;
}

function asSummarySourceInput(input: unknown): ResolveHistoryBurnInSummarySourceInput {
  if (!isPlainObject(input)) return {};
  return input;
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

function formatPercentByParts(numerator: unknown, denominator: unknown): string {
  const left = toFiniteNumberOrNull(numerator);
  const right = toFiniteNumberOrNull(denominator);
  if (left === null || right === null || right <= 0) return "-";
  return ((left * 100) / right).toFixed(2) + "%";
}

function formatTopMismatchModes(value: unknown): string {
  const list = Array.isArray(value) ? value : [];
  const rows: string[] = [];
  for (let i = 0; i < list.length && rows.length < 3; i++) {
    const item = isPlainObject(list[i]) ? list[i] : {};
    const modeKey =
      typeof item.modeKey === "string" && item.modeKey
        ? item.modeKey
        : typeof item.mode_key === "string" && item.mode_key
          ? item.mode_key
          : "";
    if (!modeKey) continue;
    const mismatch = toFiniteNumberOrZero(item.mismatchCount);
    const comparable = toFiniteNumberOrZero(item.comparableCount);
    rows.push(modeKey + "(" + mismatch + "/" + comparable + ")");
  }
  return rows.length ? rows.join("，") : "-";
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

export function resolveHistoryBurnInSummarySource(input: unknown): unknown | null {
  const opts = asSummarySourceInput(input);
  const store = asSummaryReader(opts.localHistoryStore);
  if (!store || typeof store.getAdapterParityBurnInSummary !== "function") return null;
  try {
    const query =
      typeof opts.resolveBurnInQuery === "function"
        ? opts.resolveBurnInQuery(opts.queryInput)
        : opts.queryInput;
    return store.getAdapterParityBurnInSummary(query);
  } catch (_error) {
    return null;
  }
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
      comparableMatchRateText: "-",
      sustainedPassRateText: "-",
      topMismatchModesText: "-",
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
    comparableMatchRateText: formatPercentByParts(summary.match, summary.comparable),
    sustainedPassRateText: formatPercentByParts(
      summary.sustainedConsecutivePass,
      summary.sustainedWindows
    ),
    topMismatchModesText: formatTopMismatchModes(summary.topMismatchModes),
    maxMismatchRateText: formatPercent(summary.maxMismatchRate)
  };
}

export function resolveHistoryBurnInMismatchFocusActionState(): HistoryBurnInMismatchFocusActionState {
  return {
    shouldApply: true,
    nextAdapterParityFilter: "mismatch",
    nextSelectValue: "mismatch",
    shouldReload: true,
    resetPage: true
  };
}

export function resolveHistoryBurnInPanelHtml(
  summary: unknown,
  burnInState: unknown
): string {
  const state = burnInState as HistoryBurnInSummaryState | null;
  if (!state || state.hasSummary !== true) {
    return "<div class='history-burnin-empty'>暂无 burn-in 数据</div>";
  }

  const source = isPlainObject(summary) ? summary : {};
  const mismatchAction = state.mismatchActionEnabled
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
      "<span>一致率 " + escapeHtml(state.comparableMatchRateText) + "</span>" +
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
      "（达标率 " +
      escapeHtml(state.sustainedPassRateText) +
      "）" +
      "，已评估窗口 " +
      escapeHtml(state.sustainedEvaluated) +
    "</div>" +
    "<div class='history-burnin-note'>" +
      "模式不一致 Top: " +
      escapeHtml(state.topMismatchModesText) +
    "</div>" +
    (mismatchAction ? "<div class='history-burnin-actions'>" + mismatchAction + "</div>" : "")
  );
}
