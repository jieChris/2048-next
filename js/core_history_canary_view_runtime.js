(function (global) {
  "use strict";

  if (!global) return;

  function isPlainObject(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
  }

  function formatAdapterMode(mode) {
    if (mode === "core-adapter") return "core-adapter";
    if (mode === "legacy-bridge") return "legacy-bridge";
    return "-";
  }

  function formatModeSource(source) {
    if (source === "explicit") return "显式参数";
    if (source === "force-legacy") return "强制回滚";
    if (source === "global") return "全局变量";
    if (source === "query") return "URL 参数";
    if (source === "storage") return "本地存储";
    if (source === "default") return "默认策略";
    return "默认回退";
  }

  function formatForceSource(source) {
    if (source === "input") return "输入参数";
    if (source === "global") return "全局变量";
    if (source === "query") return "URL 参数";
    if (source === "storage") return "本地存储";
    return "-";
  }

  function resolveHistoryCanaryViewState(policy, stored) {
    var policyState = isPlainObject(policy) ? policy : {};
    var storedState = isPlainObject(stored) ? stored : {};
    var effectiveMode = policyState.effectiveMode;
    return {
      gateClass:
        effectiveMode === "core-adapter" ? "history-burnin-gate-pass" : "history-burnin-gate-warn",
      gateText: effectiveMode === "core-adapter" ? "core-adapter 生效" : "legacy-bridge 生效",
      effectiveModeText: formatAdapterMode(effectiveMode),
      modeSourceText: formatModeSource(policyState.modeSource),
      forceLegacyText: policyState.forceLegacyEnabled ? "开启" : "关闭",
      forceSourceText: formatForceSource(policyState.forceLegacySource),
      storedDefaultText: String(storedState.defaultMode || "-"),
      storedForceLegacyText: String(storedState.forceLegacy || "-")
    };
  }

  global.CoreHistoryCanaryViewRuntime = global.CoreHistoryCanaryViewRuntime || {};
  global.CoreHistoryCanaryViewRuntime.resolveHistoryCanaryViewState = resolveHistoryCanaryViewState;
})(typeof window !== "undefined" ? window : undefined);
