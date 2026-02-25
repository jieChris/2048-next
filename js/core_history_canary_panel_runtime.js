(function (global) {
  "use strict";

  if (!global) return;

  function toText(value) {
    return typeof value === "string" ? value : "";
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function normalizeCanaryView(input) {
    return input && typeof input === "object" ? input : {};
  }

  function resolveHistoryCanaryPanelHtml(input) {
    var canaryView = normalizeCanaryView(input);
    var gateClass = toText(canaryView.gateClass);
    var gateText = toText(canaryView.gateText);
    var effectiveModeText = toText(canaryView.effectiveModeText);
    var modeSourceText = toText(canaryView.modeSourceText);
    var forceLegacyText = toText(canaryView.forceLegacyText);
    var forceSourceText = toText(canaryView.forceSourceText);
    var storedDefaultText = toText(canaryView.storedDefaultText);
    var storedForceLegacyText = toText(canaryView.storedForceLegacyText);

    return (
      "<div class='history-canary-head'>" +
        "<div class='history-canary-title'>Canary 策略控制</div>" +
        "<span class='history-burnin-gate " + escapeHtml(gateClass) + "'>" + escapeHtml(gateText) + "</span>" +
      "</div>" +
      "<div class='history-canary-grid'>" +
        "<span>当前有效模式: " + escapeHtml(effectiveModeText) + "</span>" +
        "<span>生效来源: " + escapeHtml(modeSourceText) + "</span>" +
        "<span>强制回滚: " + escapeHtml(forceLegacyText) + "</span>" +
        "<span>回滚来源: " + escapeHtml(forceSourceText) + "</span>" +
      "</div>" +
      "<div class='history-canary-note'>" +
        "storage(engine_adapter_default_mode)=" + escapeHtml(storedDefaultText) +
        " · storage(engine_adapter_force_legacy)=" + escapeHtml(storedForceLegacyText) +
      "</div>" +
      "<div class='history-canary-note'>" +
        "说明: 修改后需刷新任一对局页（index/play/undo/capped/practice/replay）以应用新策略。" +
      "</div>" +
      "<div class='history-canary-actions'>" +
        "<button class='replay-button history-canary-action-btn' data-action='apply_canary'>进入 Canary（默认 core）</button>" +
        "<button class='replay-button history-canary-action-btn' data-action='emergency_rollback'>紧急回滚（强制 legacy）</button>" +
        "<button class='replay-button history-canary-action-btn' data-action='resume_canary'>解除回滚（恢复默认）</button>" +
        "<button class='replay-button history-canary-action-btn' data-action='reset_policy'>重置策略（回到基线）</button>" +
      "</div>"
    );
  }

  function resolveHistoryCanaryActionName(target) {
    if (!target || typeof target !== "object") return "";
    if (typeof target.getAttribute !== "function") return "";
    return target.getAttribute("data-action") || "";
  }

  global.CoreHistoryCanaryPanelRuntime = global.CoreHistoryCanaryPanelRuntime || {};
  global.CoreHistoryCanaryPanelRuntime.resolveHistoryCanaryPanelHtml = resolveHistoryCanaryPanelHtml;
  global.CoreHistoryCanaryPanelRuntime.resolveHistoryCanaryActionName = resolveHistoryCanaryActionName;
})(typeof window !== "undefined" ? window : undefined);
