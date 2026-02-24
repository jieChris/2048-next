export interface ResolveTimerModuleSettingsStateOptions {
  viewMode?: string | null | undefined;
}

export interface ResolveTimerModuleSettingsStateResult {
  toggleDisabled: boolean;
  toggleChecked: boolean;
  noteText: string;
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

export function buildTimerModuleSettingsRowInnerHtml(): string {
  return (
    "<label for='timer-module-view-toggle'>计时器显示</label>" +
    "<label class='settings-switch-row'>" +
    "<input id='timer-module-view-toggle' type='checkbox'>" +
    "<span>显示计时器（关闭后隐藏）</span>" +
    "</label>" +
    "<div id='timer-module-view-note' class='settings-note'></div>"
  );
}

export function resolveTimerModuleSettingsState(
  options: ResolveTimerModuleSettingsStateOptions
): ResolveTimerModuleSettingsStateResult {
  const opts = options || {};
  const viewMode = typeof opts.viewMode === "string" ? opts.viewMode : "timer";
  return {
    toggleDisabled: false,
    toggleChecked: viewMode !== "hidden",
    noteText: "关闭后仅隐藏右侧计时器栏，不影响棋盘和回放。"
  };
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
