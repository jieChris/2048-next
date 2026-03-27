export interface ResolveTimerModuleSettingsStateOptions {
  viewMode?: string | null | undefined;
}

interface TimerModuleManagerLike {
  getTimerModuleViewMode?: (() => string | null | undefined) | null | undefined;
}

export interface ResolveTimerModuleCurrentViewModeOptions {
  manager?: TimerModuleManagerLike | null | undefined;
  fallbackViewMode?: "timer" | "hidden" | null | undefined;
}

export interface ResolveTimerModuleSettingsStateResult {
  toggleDisabled: boolean;
  toggleChecked: boolean;
  toggleLabelText: string;
  noteText: string;
  rowVisible?: boolean;
}

export interface ResolveTimerModuleBindingStateOptions {
  alreadyBound?: boolean | null | undefined;
}

export interface ResolveTimerModuleBindingStateResult {
  shouldBind: boolean;
  boundValue: boolean;
}

export interface ResolveTimerModuleViewModeOptions {
  checked?: boolean | null | undefined;
}

export interface ResolveTimerModuleViewModeResult {
  viewMode: "timer" | "hidden";
}

export interface ResolveTimerModuleAppliedViewModeOptions {
  nextViewMode?: ResolveTimerModuleViewModeResult | null | undefined;
  checked?: boolean | null | undefined;
}

export interface ResolveTimerModuleInitRetryStateOptions {
  hasToggle?: boolean | null | undefined;
  hasManager?: boolean | null | undefined;
  retryDelayMs?: number | null | undefined;
}

export interface ResolveTimerModuleInitRetryStateResult {
  shouldRetry: boolean;
  retryDelayMs: number;
}

function readTimerModuleUiLang(): "zh" | "en" {
  try {
    const raw = String(globalThis.localStorage?.getItem("ui_language_v1") || "").toLowerCase();
    return raw === "en" ? "en" : "zh";
  } catch (_error) {
    return "zh";
  }
}

export function buildTimerModuleSettingsRowInnerHtml(): string {
  const isEn = readTimerModuleUiLang() === "en";
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

export function resolveTimerModuleSettingsState(
  options: ResolveTimerModuleSettingsStateOptions
): ResolveTimerModuleSettingsStateResult {
  const opts = options || {};
  const viewMode = typeof opts.viewMode === "string" ? opts.viewMode : "timer";
  const isTimerMode = viewMode !== "hidden";
  return {
    toggleDisabled: false,
    toggleChecked: isTimerMode,
    toggleLabelText: isTimerMode
      ? "\u5f53\u524d\u53f3\u4fa7\u663e\u793a\u8ba1\u65f6\u5668\u3002"
      : "\u5f53\u524d\u53f3\u4fa7\u663e\u793a\u6392\u884c\u699c\u3002",
    noteText: isTimerMode
      ? "\u5173\u95ed\u540e\u5207\u6362\u4e3a\u6392\u884c\u699c\u754c\u9762\uff0c\u4e0d\u5f71\u54cd\u68cb\u76d8\u4e0e\u56de\u653e\u3002"
      : "\u5f00\u542f\u540e\u5207\u56de\u8ba1\u65f6\u5668\u754c\u9762\u3002",
    rowVisible: true
  };
}

export function resolveTimerModuleCurrentViewMode(
  options: ResolveTimerModuleCurrentViewModeOptions
): "timer" | "hidden" {
  const opts = options || {};
  const fallbackViewMode = opts.fallbackViewMode === "hidden" ? "hidden" : "timer";
  const manager = opts.manager || null;
  if (!manager || typeof manager.getTimerModuleViewMode !== "function") {
    return fallbackViewMode;
  }
  try {
    const viewMode = manager.getTimerModuleViewMode();
    if (viewMode === "timer" || viewMode === "hidden") {
      return viewMode;
    }
  } catch (_err) {}
  return fallbackViewMode;
}

export function resolveTimerModuleBindingState(
  options: ResolveTimerModuleBindingStateOptions
): ResolveTimerModuleBindingStateResult {
  const opts = options || {};
  const alreadyBound = !!opts.alreadyBound;
  return {
    shouldBind: !alreadyBound,
    boundValue: true
  };
}

export function resolveTimerModuleViewMode(
  options: ResolveTimerModuleViewModeOptions
): ResolveTimerModuleViewModeResult {
  const opts = options || {};
  return {
    viewMode: opts.checked ? "timer" : "hidden"
  };
}

export function resolveTimerModuleAppliedViewMode(
  options: ResolveTimerModuleAppliedViewModeOptions
): "timer" | "hidden" {
  const opts = options || {};
  const nextViewMode = opts.nextViewMode;
  if (
    nextViewMode &&
    (nextViewMode.viewMode === "timer" || nextViewMode.viewMode === "hidden")
  ) {
    return nextViewMode.viewMode;
  }
  return opts.checked ? "timer" : "hidden";
}

export function resolveTimerModuleInitRetryState(
  options: ResolveTimerModuleInitRetryStateOptions
): ResolveTimerModuleInitRetryStateResult {
  const opts = options || {};
  const hasToggle = !!opts.hasToggle;
  const hasManager = !!opts.hasManager;
  const retryDelayMs =
    typeof opts.retryDelayMs === "number" && opts.retryDelayMs > 0 ? opts.retryDelayMs : 60;
  return {
    shouldRetry: hasToggle && !hasManager,
    retryDelayMs
  };
}
