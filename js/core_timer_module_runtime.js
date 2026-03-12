(function (global) {
  "use strict";

  if (!global) return;

  function resolveLang() {
    try {
      var raw = String(
        (global.localStorage && global.localStorage.getItem("ui_language_v1")) || ""
      ).toLowerCase();
      return raw === "en" ? "en" : "zh";
    } catch (_err) {
      return "zh";
    }
  }

  function buildTimerModuleSettingsRowInnerHtml() {
    var isEn = resolveLang() === "en";
    return (
      "<label for='timer-module-view-toggle'>" +
      (isEn ? "Right Panel View" : "右侧栏视图") +
      "</label>" +
      "<label class='settings-switch-row'>" +
      "<input id='timer-module-view-toggle' type='checkbox'>" +
      "<span id='timer-module-view-label'>" +
      (isEn ? "Timer Mode" : "计时器模式") +
      "</span>" +
      "</label>" +
      "<div id='timer-module-view-note' class='settings-note'></div>"
    );
  }

  function resolveTimerModuleSettingsState(options) {
    var opts = options || {};
    var lang = opts.lang === "en" ? "en" : resolveLang();
    var viewMode = opts.viewMode === "hidden" ? "hidden" : "timer";
    var hasLeaderboard = !!opts.hasLeaderboard;
    var isTimerMode = viewMode !== "hidden";

    if (!hasLeaderboard) {
      return {
        toggleDisabled: true,
        toggleChecked: true,
        toggleLabelText: lang === "en" ? "Timer Mode" : "计时器模式",
        noteText:
          lang === "en"
            ? "Current mode does not support leaderboard panel."
            : "当前模式不支持排行榜面板。",
        rowVisible: false
      };
    }

    return {
      toggleDisabled: false,
      toggleChecked: isTimerMode,
      toggleLabelText: isTimerMode
        ? lang === "en"
          ? "Timer Mode"
          : "计时器模式"
        : lang === "en"
          ? "Leaderboard Mode"
          : "榜单模式",
      noteText: isTimerMode
        ? lang === "en"
          ? "Switch off to show the top-10 leaderboard in the right panel."
          : "关闭后显示当前模式榜单（前10名 + 我的排名）。"
        : lang === "en"
          ? "Top-10 leaderboard is shown. Toggle on to return to timers."
          : "当前显示榜单，开启后切回计时器。",
      rowVisible: true
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
    return {
      shouldBind: !opts.alreadyBound,
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
    var retryDelayMs =
      typeof opts.retryDelayMs === "number" && opts.retryDelayMs > 0 ? opts.retryDelayMs : 60;
    return {
      shouldRetry: !!opts.hasToggle && !opts.hasManager,
      retryDelayMs: retryDelayMs
    };
  }

  global.CoreTimerModuleRuntime = global.CoreTimerModuleRuntime || {};
  global.CoreTimerModuleRuntime.buildTimerModuleSettingsRowInnerHtml =
    buildTimerModuleSettingsRowInnerHtml;
  global.CoreTimerModuleRuntime.resolveTimerModuleSettingsState =
    resolveTimerModuleSettingsState;
  global.CoreTimerModuleRuntime.resolveTimerModuleCurrentViewMode =
    resolveTimerModuleCurrentViewMode;
  global.CoreTimerModuleRuntime.resolveTimerModuleBindingState =
    resolveTimerModuleBindingState;
  global.CoreTimerModuleRuntime.resolveTimerModuleViewMode = resolveTimerModuleViewMode;
  global.CoreTimerModuleRuntime.resolveTimerModuleAppliedViewMode =
    resolveTimerModuleAppliedViewMode;
  global.CoreTimerModuleRuntime.resolveTimerModuleInitRetryState =
    resolveTimerModuleInitRetryState;
})(typeof window !== "undefined" ? window : undefined);
