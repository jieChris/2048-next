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

  global.CoreTimerModuleRuntime = global.CoreTimerModuleRuntime || {};
  global.CoreTimerModuleRuntime.buildTimerModuleSettingsRowInnerHtml =
    buildTimerModuleSettingsRowInnerHtml;
  global.CoreTimerModuleRuntime.resolveTimerModuleSettingsState = resolveTimerModuleSettingsState;
  global.CoreTimerModuleRuntime.resolveTimerModuleBindingState = resolveTimerModuleBindingState;
  global.CoreTimerModuleRuntime.resolveTimerModuleViewMode = resolveTimerModuleViewMode;
  global.CoreTimerModuleRuntime.resolveTimerModuleAppliedViewMode =
    resolveTimerModuleAppliedViewMode;
})(typeof window !== "undefined" ? window : undefined);
