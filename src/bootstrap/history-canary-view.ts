type AnyRecord = Record<string, unknown>;

export interface HistoryCanaryViewState {
  gateClass: string;
  gateText: string;
  effectiveModeText: string;
  modeSourceText: string;
  forceLegacyText: string;
  forceSourceText: string;
  storedDefaultText: string;
  storedForceLegacyText: string;
}

function isPlainObject(value: unknown): value is AnyRecord {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function formatAdapterMode(mode: unknown): string {
  if (mode === "core-adapter") return "core-adapter";
  if (mode === "legacy-bridge") return "legacy-bridge";
  return "-";
}

function formatModeSource(source: unknown): string {
  if (source === "explicit") return "显式参数";
  if (source === "force-legacy") return "强制回滚";
  if (source === "global") return "全局变量";
  if (source === "query") return "URL 参数";
  if (source === "storage") return "本地存储";
  if (source === "default") return "默认策略";
  return "默认回退（core-adapter）";
}

function formatForceSource(source: unknown): string {
  if (source === "input") return "输入参数";
  if (source === "global") return "全局变量";
  if (source === "query") return "URL 参数";
  if (source === "storage") return "本地存储";
  return "-";
}

export function resolveHistoryCanaryViewState(
  policy: unknown,
  stored: unknown
): HistoryCanaryViewState {
  const policyState = isPlainObject(policy) ? policy : {};
  const storedState = isPlainObject(stored) ? stored : {};
  const effectiveMode = policyState.effectiveMode;

  return {
    gateClass: effectiveMode === "core-adapter" ? "history-burnin-gate-pass" : "history-burnin-gate-warn",
    gateText: effectiveMode === "core-adapter" ? "core-adapter 生效" : "legacy-bridge 生效",
    effectiveModeText: formatAdapterMode(effectiveMode),
    modeSourceText: formatModeSource(policyState.modeSource),
    forceLegacyText: policyState.forceLegacyEnabled ? "开启" : "关闭",
    forceSourceText: formatForceSource(policyState.forceLegacySource),
    storedDefaultText: String(storedState.defaultMode || "-"),
    storedForceLegacyText: String(storedState.forceLegacy || "-")
  };
}
