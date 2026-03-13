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
      "<div class='settings-toggle-main'>" +
      "<div class='settings-toggle-copy'>" +
      "<label for='timer-module-view-toggle' class='settings-toggle-title'>" +
      (isEn ? "Timer Mode" : "\u8ba1\u65f6\u5668\u6a21\u5f0f") +
      "</label>" +
      "<div id='timer-module-view-label' class='settings-toggle-desc'>" +
      (isEn
        ? "Turn on to show timers, turn off to show leaderboard."
        : "\u5f00\u542f\u65f6\u663e\u793a\u8ba1\u65f6\u5668\uff0c\u5173\u95ed\u65f6\u663e\u793a\u6392\u884c\u699c\u3002") +
      "</div>" +
      "</div>" +
      "<label class='settings-switch' for='timer-module-view-toggle' aria-label='" +
      (isEn ? "Timer Mode" : "\u8ba1\u65f6\u5668\u6a21\u5f0f") +
      "'>" +
      "<input id='timer-module-view-toggle' type='checkbox'>" +
      "<span class='settings-switch-slider'></span>" +
      "</label>" +
      "</div>" +
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
        toggleLabelText:
          lang === "en"
            ? "Leaderboard is not available in this mode."
            : "当前模式不支持排行榜界面。",
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
          ? "Timers are shown in the right panel."
          : "当前右侧显示计时器。"
        : lang === "en"
          ? "Leaderboard is shown in the right panel."
          : "当前右侧显示排行榜。",
      noteText: isTimerMode
        ? lang === "en"
          ? "Switch off to show the leaderboard in the right panel."
          : "关闭后切换为排行榜界面，不影响棋盘与回放。"
        : lang === "en"
          ? "Switch on to return to timer view."
          : "开启后切回计时器界面。",
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
})(typeof window !== "undefined" ? window : this);
