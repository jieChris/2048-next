(function (global) {
  "use strict";

  if (!global) return;

  function buildTimerModuleSettingsRowInnerHtml() {
    return (
      "<label for='timer-module-view-toggle'>计时器显示</label>" +
      "<label class='settings-switch-row'>" +
      "<input id='timer-module-view-toggle' type='checkbox'>" +
      "<span>显示计时器（关闭后隐藏）</span>" +
      "</label>" +
      "<div id='timer-module-view-note' class='settings-note'></div>"
    );
  }

  function resolveTimerModuleSettingsState(options) {
    var opts = options || {};
    var viewMode = typeof opts.viewMode === "string" ? opts.viewMode : "timer";
    return {
      toggleDisabled: false,
      toggleChecked: viewMode !== "hidden",
      noteText: "关闭后仅隐藏右侧计时器栏，不影响棋盘和回放。"
    };
  }

  function resolveTimerModuleCurrentViewMode(options) {
    var opts = options || {};
    var fallbackViewMode = opts.fallbackViewMode === "hidden" ? "hidden" : "timer";
    var manager = opts.manager || null;
    if (!manager || typeof manager.getTimerModuleViewMode !== "function") {
      return fallbackViewMode;
    }
    try {
      var viewMode = manager.getTimerModuleViewMode();
      if (viewMode === "timer" || viewMode === "hidden") {
        return viewMode;
      }
    } catch (_err) {}
    return fallbackViewMode;
  }

  function resolveTimerModuleBindingState(options) {
    var opts = options || {};
    var alreadyBound = !!opts.alreadyBound;
    return {
      shouldBind: !alreadyBound,
      boundValue: true
    };
  }

  function resolveTimerModuleViewMode(options) {
    var opts = options || {};
    return {
      viewMode: opts.checked ? "timer" : "hidden"
    };
  }

  function resolveTimerModuleAppliedViewMode(options) {
    var opts = options || {};
    var nextViewMode = opts.nextViewMode;
    if (
      nextViewMode &&
      (nextViewMode.viewMode === "timer" || nextViewMode.viewMode === "hidden")
    ) {
      return nextViewMode.viewMode;
    }
    return opts.checked ? "timer" : "hidden";
  }

  function resolveTimerModuleInitRetryState(options) {
    var opts = options || {};
    var hasToggle = !!opts.hasToggle;
    var hasManager = !!opts.hasManager;
    var retryDelayMs =
      typeof opts.retryDelayMs === "number" && opts.retryDelayMs > 0 ? opts.retryDelayMs : 60;
    return {
      shouldRetry: hasToggle && !hasManager,
      retryDelayMs: retryDelayMs
    };
  }

  global.CoreTimerModuleRuntime = global.CoreTimerModuleRuntime || {};
  global.CoreTimerModuleRuntime.buildTimerModuleSettingsRowInnerHtml =
    buildTimerModuleSettingsRowInnerHtml;
  global.CoreTimerModuleRuntime.resolveTimerModuleSettingsState = resolveTimerModuleSettingsState;
  global.CoreTimerModuleRuntime.resolveTimerModuleCurrentViewMode =
    resolveTimerModuleCurrentViewMode;
  global.CoreTimerModuleRuntime.resolveTimerModuleBindingState = resolveTimerModuleBindingState;
  global.CoreTimerModuleRuntime.resolveTimerModuleViewMode = resolveTimerModuleViewMode;
  global.CoreTimerModuleRuntime.resolveTimerModuleAppliedViewMode =
    resolveTimerModuleAppliedViewMode;
  global.CoreTimerModuleRuntime.resolveTimerModuleInitRetryState =
    resolveTimerModuleInitRetryState;
})(typeof window !== "undefined" ? window : undefined);
