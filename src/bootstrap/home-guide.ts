export interface HomeGuideAutoStartOptions {
  pathname?: string | null | undefined;
  seenValue?: string | null | undefined;
}

export interface HomeGuideLocationLike {
  pathname?: string | null | undefined;
}

export interface ResolveHomeGuidePathnameOptions {
  locationLike?: HomeGuideLocationLike | null | undefined;
}

export interface HomeGuideStorageLike {
  getItem(key: string): string | null;
  setItem?(key: string, value: string): void;
}

export interface HomeGuideStep {
  selector: string;
  title: string;
  desc: string;
}

export interface BuildHomeGuideStepsOptions {
  isCompactViewport?: boolean;
}

export function buildHomeGuidePanelInnerHtml(): string {
  return (
    "<div id='home-guide-step' class='home-guide-step'></div>" +
    "<div id='home-guide-title' class='home-guide-title'></div>" +
    "<div id='home-guide-desc' class='home-guide-desc'></div>" +
    "<div class='home-guide-actions'>" +
    "<button id='home-guide-prev' class='replay-button home-guide-btn'>上一步</button>" +
    "<button id='home-guide-next' class='replay-button home-guide-btn'>下一步</button>" +
    "<button id='home-guide-skip' class='replay-button home-guide-btn'>跳过</button>" +
    "</div>"
  );
}

export function buildHomeGuideSettingsRowInnerHtml(): string {
  return (
    "<label for='home-guide-toggle'>新手指引</label>" +
    "<label class='settings-switch-row'>" +
    "<input id='home-guide-toggle' type='checkbox'>" +
    "<span>重新播放首页功能指引</span>" +
    "</label>" +
    "<div id='home-guide-note' class='settings-note'></div>"
  );
}

export interface HomeGuideSeenOptions {
  storageLike?: HomeGuideStorageLike | null | undefined;
  seenKey?: string | null | undefined;
}

export interface ResolveHomeGuideAutoStartOptions extends HomeGuideSeenOptions {
  pathname?: string | null | undefined;
}

export interface ResolveHomeGuideAutoStartResult {
  seenValue: string;
  shouldAutoStart: boolean;
}

export interface ResolveHomeGuideSettingsStateOptions {
  isHomePage?: boolean | null | undefined;
  guideActive?: boolean | null | undefined;
  fromSettings?: boolean | null | undefined;
}

export interface ResolveHomeGuideSettingsStateResult {
  toggleDisabled: boolean;
  toggleChecked: boolean;
  noteText: string;
}

export interface ResolveHomeGuideStepUiStateOptions {
  stepIndex?: number | null | undefined;
  stepCount?: number | null | undefined;
}

export interface ResolveHomeGuideStepUiStateResult {
  stepText: string;
  prevDisabled: boolean;
  nextText: string;
}

export interface ResolveHomeGuideStepRenderStateOptions {
  step?: HomeGuideStep | null | undefined;
  stepIndex?: number | null | undefined;
  stepCount?: number | null | undefined;
}

export interface ResolveHomeGuideStepRenderStateResult {
  stepText: string;
  titleText: string;
  descText: string;
  prevDisabled: boolean;
  nextText: string;
}

export interface ResolveHomeGuideStepIndexStateOptions {
  isActive?: boolean | null | undefined;
  stepCount?: number | null | undefined;
  stepIndex?: number | null | undefined;
}

export interface ResolveHomeGuideStepIndexStateResult {
  shouldAbort: boolean;
  shouldFinish: boolean;
  resolvedIndex: number;
}

export interface ResolveHomeGuideStepTargetStateOptions {
  hasTarget?: boolean | null | undefined;
  targetVisible?: boolean | null | undefined;
  stepIndex?: number | null | undefined;
}

export interface ResolveHomeGuideStepTargetStateResult {
  shouldAdvance: boolean;
  nextIndex: number;
}

export interface ResolveHomeGuideElevationPlanOptions {
  hasTopActionButtonsAncestor?: boolean | null | undefined;
  hasHeadingAncestor?: boolean | null | undefined;
}

export interface ResolveHomeGuideElevationPlanResult {
  hostSelector: ".top-action-buttons" | ".heading" | "";
  shouldScopeTopActions: boolean;
}

export interface ResolveHomeGuideBindingStateOptions {
  alreadyBound?: boolean | null | undefined;
}

export interface ResolveHomeGuideBindingStateResult {
  shouldBind: boolean;
  boundValue: boolean;
}

export interface ResolveHomeGuideControlActionOptions {
  action?: string | null | undefined;
  stepIndex?: number | null | undefined;
}

export interface ResolveHomeGuideControlActionResult {
  type: "step" | "finish";
  nextStepIndex: number;
  finishReason: string;
}

export interface ResolveHomeGuideToggleActionOptions {
  checked?: boolean | null | undefined;
  isHomePage?: boolean | null | undefined;
}

export interface ResolveHomeGuideToggleActionResult {
  shouldStartGuide: boolean;
  shouldCloseSettings: boolean;
  shouldResync: boolean;
  startFromSettings: boolean;
}

export interface ResolveHomeGuideLifecycleStateOptions {
  action?: string | null | undefined;
  fromSettings?: boolean | null | undefined;
  steps?: Array<HomeGuideStep> | null | undefined;
}

export interface ResolveHomeGuideLifecycleStateResult {
  active: boolean;
  fromSettings: boolean;
  index: number;
  steps: HomeGuideStep[];
}

export interface ResolveHomeGuideSessionStateOptions {
  lifecycleState?: ResolveHomeGuideLifecycleStateResult | null | undefined;
}

export interface ResolveHomeGuideSessionStateResult {
  active: boolean;
  fromSettings: boolean;
  index: number;
  steps: HomeGuideStep[];
}

export interface ResolveHomeGuideLayerDisplayStateOptions {
  active?: boolean | null | undefined;
}

export interface ResolveHomeGuideLayerDisplayStateResult {
  overlayDisplay: string;
  panelDisplay: string;
}

export interface ResolveHomeGuideFinishStateOptions {
  reason?: string | null | undefined;
}

export interface ResolveHomeGuideFinishStateResult {
  markSeen: boolean;
  showDoneNotice: boolean;
}

export interface ResolveHomeGuideTargetScrollStateOptions {
  isCompactViewport?: boolean | null | undefined;
  canScrollIntoView?: boolean | null | undefined;
}

export interface ResolveHomeGuideTargetScrollStateResult {
  shouldScroll: boolean;
  block: "start" | "center" | "end" | "nearest";
  inline: "start" | "center" | "end" | "nearest";
  behavior: "auto" | "instant" | "smooth";
}

export interface ResolveHomeGuideDoneNoticeOptions {
  message?: string | null | undefined;
  hideDelayMs?: number | null | undefined;
}

export interface ResolveHomeGuideDoneNoticeResult {
  message: string;
  hideDelayMs: number;
}

export interface HomeGuideDoneNoticeStyle {
  position: string;
  left: string;
  bottom: string;
  transform: string;
  background: string;
  color: string;
  padding: string;
  borderRadius: string;
  fontSize: string;
  fontWeight: string;
  zIndex: string;
  boxShadow: string;
  opacity: string;
  transition: string;
}

export interface HomeGuideRectLike {
  left?: number | null | undefined;
  top?: number | null | undefined;
  right?: number | null | undefined;
  bottom?: number | null | undefined;
  width?: number | null | undefined;
  height?: number | null | undefined;
}

export interface ResolveHomeGuidePanelLayoutOptions {
  targetRect?: HomeGuideRectLike | null | undefined;
  viewportWidth?: number | null | undefined;
  viewportHeight?: number | null | undefined;
  panelHeight?: number | null | undefined;
  margin?: number | null | undefined;
  mobileLayout?: boolean | null | undefined;
  mobilePanelMinWidth?: number | null | undefined;
  mobilePanelMaxWidth?: number | null | undefined;
  desktopPanelMinWidth?: number | null | undefined;
  desktopPanelMaxWidth?: number | null | undefined;
}

export interface ResolveHomeGuidePanelLayoutResult {
  panelWidth: number;
  top: number;
  left: number;
}

export interface HomeGuideComputedStyleLike {
  display?: string | null | undefined;
  visibility?: string | null | undefined;
  opacity?: string | null | undefined;
}

export interface HomeGuideVisibilityNodeLike {
  getClientRects?():
    | ArrayLike<unknown>
    | {
        length: number;
      };
}

export interface IsHomeGuideTargetVisibleOptions {
  nodeLike?: HomeGuideVisibilityNodeLike | null | undefined;
  getComputedStyle?:
    | ((node: HomeGuideVisibilityNodeLike) => HomeGuideComputedStyleLike | null | undefined)
    | null
    | undefined;
}

const BASE_HOME_GUIDE_STEPS: HomeGuideStep[] = [
  { selector: "#home-title-link", title: "首页标题", desc: "点击 2048 标题可回到首页。" },
  { selector: "#top-announcement-btn", title: "版本公告", desc: "查看版本更新内容，红点表示有未读公告。" },
  { selector: "#stats-panel-toggle", title: "统计", desc: "打开统计汇总面板，查看步数和出数数据。" },
  { selector: "#top-export-replay-btn", title: "导出回放", desc: "导出当前对局回放字符串，便于保存和复盘。" },
  { selector: "#top-practice-btn", title: "直通练习板", desc: "把当前盘面复制到练习板，并在新页继续调试。" },
  { selector: "#top-advanced-replay-btn", title: "高级回放", desc: "进入高级回放页，导入并控制回放进度。" },
  { selector: "#top-modes-btn", title: "模式选择", desc: "进入模式页面，切换不同棋盘和玩法。" },
  { selector: "#top-history-btn", title: "历史记录", desc: "查看本地历史记录，支持删除/导入/导出。" },
  { selector: "#top-settings-btn", title: "设置", desc: "打开设置，调整主题、计时器显示与指引开关。" },
  { selector: "#top-restart-btn", title: "新游戏", desc: "开始新的一局，会重置当前局面。" }
];

const MOBILE_HINT_STEP: HomeGuideStep = {
  selector: "#top-mobile-hint-btn",
  title: "提示文本",
  desc: "移动端可用此按钮打开提示弹窗，集中查看玩法说明与项目说明。"
};

export function resolveHomeGuidePathname(options: ResolveHomeGuidePathnameOptions): string {
  const opts = options || {};
  const locationLike = opts.locationLike || null;
  try {
    const rawPathname = locationLike ? locationLike.pathname : "";
    return typeof rawPathname === "string" ? rawPathname : String(rawPathname || "");
  } catch (_err) {
    return "";
  }
}

export function isHomePagePath(pathname: string | null | undefined): boolean {
  const path = typeof pathname === "string" ? pathname : "";
  return path === "/" || /\/index\.html?$/.test(path) || path === "";
}

export function buildHomeGuideSteps(options: BuildHomeGuideStepsOptions): HomeGuideStep[] {
  const opts = options || {};
  const steps = BASE_HOME_GUIDE_STEPS.map((step) => ({
    selector: step.selector,
    title: step.title,
    desc: step.desc
  }));
  if (opts.isCompactViewport) {
    steps.splice(9, 0, {
      selector: MOBILE_HINT_STEP.selector,
      title: MOBILE_HINT_STEP.title,
      desc: MOBILE_HINT_STEP.desc
    });
  }
  return steps;
}

function resolveSeenKey(value: string | null | undefined): string {
  return typeof value === "string" && value ? value : "home_guide_seen_v1";
}

export function readHomeGuideSeenValue(options: HomeGuideSeenOptions): string {
  const opts = options || {};
  const storage = opts.storageLike || null;
  const seenKey = resolveSeenKey(opts.seenKey);
  if (!storage || typeof storage.getItem !== "function") return "0";
  try {
    return storage.getItem(seenKey) === "1" ? "1" : "0";
  } catch (_err) {
    return "0";
  }
}

export function markHomeGuideSeen(options: HomeGuideSeenOptions): boolean {
  const opts = options || {};
  const storage = opts.storageLike || null;
  const seenKey = resolveSeenKey(opts.seenKey);
  if (!storage || typeof storage.setItem !== "function") return false;
  try {
    storage.setItem(seenKey, "1");
    return true;
  } catch (_err) {
    return false;
  }
}

export function shouldAutoStartHomeGuide(options: HomeGuideAutoStartOptions): boolean {
  const opts = options || {};
  if (!isHomePagePath(opts.pathname)) return false;
  return String(opts.seenValue || "0") !== "1";
}

export function resolveHomeGuideAutoStart(
  options: ResolveHomeGuideAutoStartOptions
): ResolveHomeGuideAutoStartResult {
  const opts = options || {};
  const seenValue = readHomeGuideSeenValue({
    storageLike: opts.storageLike || null,
    seenKey: opts.seenKey
  });
  return {
    seenValue,
    shouldAutoStart: shouldAutoStartHomeGuide({
      pathname: opts.pathname,
      seenValue
    })
  };
}

export function resolveHomeGuideSettingsState(
  options: ResolveHomeGuideSettingsStateOptions
): ResolveHomeGuideSettingsStateResult {
  const opts = options || {};
  const isHome = !!opts.isHomePage;
  return {
    toggleDisabled: !isHome,
    toggleChecked: Boolean(isHome && opts.guideActive && opts.fromSettings),
    noteText: isHome
      ? "打开后将立即进入首页新手引导，完成后自动关闭。"
      : "该功能仅在首页可用。"
  };
}

export function resolveHomeGuideStepUiState(
  options: ResolveHomeGuideStepUiStateOptions
): ResolveHomeGuideStepUiStateResult {
  const opts = options || {};
  const count = Math.max(0, Math.floor(toFiniteNumber(opts.stepCount, 0)));
  const maxIndex = count > 0 ? count - 1 : 0;
  const rawIndex = Math.floor(toFiniteNumber(opts.stepIndex, 0));
  const index = Math.min(Math.max(rawIndex, 0), maxIndex);
  return {
    stepText: count > 0 ? "步骤 " + (index + 1) + " / " + count : "步骤 0 / 0",
    prevDisabled: index <= 0,
    nextText: count > 0 && index >= count - 1 ? "完成" : "下一步"
  };
}

export function resolveHomeGuideStepRenderState(
  options: ResolveHomeGuideStepRenderStateOptions
): ResolveHomeGuideStepRenderStateResult {
  const opts = options || {};
  const step = opts.step || null;
  const uiState = resolveHomeGuideStepUiState({
    stepIndex: opts.stepIndex,
    stepCount: opts.stepCount
  });
  return {
    stepText: uiState.stepText,
    titleText: step && typeof step.title === "string" ? step.title : "",
    descText: step && typeof step.desc === "string" ? step.desc : "",
    prevDisabled: uiState.prevDisabled,
    nextText: uiState.nextText
  };
}

export function resolveHomeGuideStepIndexState(
  options: ResolveHomeGuideStepIndexStateOptions
): ResolveHomeGuideStepIndexStateResult {
  const opts = options || {};
  const count = Math.max(0, Math.floor(toFiniteNumber(opts.stepCount, 0)));
  const rawIndex = Math.floor(toFiniteNumber(opts.stepIndex, 0));
  const resolvedIndex = Math.max(0, rawIndex);
  if (!opts.isActive || count <= 0) {
    return {
      shouldAbort: true,
      shouldFinish: false,
      resolvedIndex: 0
    };
  }
  if (resolvedIndex >= count) {
    return {
      shouldAbort: false,
      shouldFinish: true,
      resolvedIndex
    };
  }
  return {
    shouldAbort: false,
    shouldFinish: false,
    resolvedIndex
  };
}

export function resolveHomeGuideStepTargetState(
  options: ResolveHomeGuideStepTargetStateOptions
): ResolveHomeGuideStepTargetStateResult {
  const opts = options || {};
  const index = Math.max(0, Math.floor(toFiniteNumber(opts.stepIndex, 0)));
  const shouldAdvance = !opts.hasTarget || !opts.targetVisible;
  return {
    shouldAdvance,
    nextIndex: shouldAdvance ? index + 1 : index
  };
}

export function resolveHomeGuideElevationPlan(
  options: ResolveHomeGuideElevationPlanOptions
): ResolveHomeGuideElevationPlanResult {
  const opts = options || {};
  const hasTop = !!opts.hasTopActionButtonsAncestor;
  const hasHeading = !!opts.hasHeadingAncestor;
  if (hasTop) {
    return {
      hostSelector: ".top-action-buttons",
      shouldScopeTopActions: true
    };
  }
  if (hasHeading) {
    return {
      hostSelector: ".heading",
      shouldScopeTopActions: false
    };
  }
  return {
    hostSelector: "",
    shouldScopeTopActions: false
  };
}

export function resolveHomeGuideBindingState(
  options: ResolveHomeGuideBindingStateOptions
): ResolveHomeGuideBindingStateResult {
  const opts = options || {};
  const alreadyBound = !!opts.alreadyBound;
  return {
    shouldBind: !alreadyBound,
    boundValue: true
  };
}

export function resolveHomeGuideControlAction(
  options: ResolveHomeGuideControlActionOptions
): ResolveHomeGuideControlActionResult {
  const opts = options || {};
  const action = typeof opts.action === "string" ? opts.action : "";
  const index = Math.max(0, Math.floor(toFiniteNumber(opts.stepIndex, 0)));
  if (action === "prev") {
    return {
      type: "step",
      nextStepIndex: Math.max(0, index - 1),
      finishReason: ""
    };
  }
  if (action === "next") {
    return {
      type: "step",
      nextStepIndex: index + 1,
      finishReason: ""
    };
  }
  if (action === "skip") {
    return {
      type: "finish",
      nextStepIndex: index,
      finishReason: "skipped"
    };
  }
  return {
    type: "step",
    nextStepIndex: index,
    finishReason: ""
  };
}

export function resolveHomeGuideToggleAction(
  options: ResolveHomeGuideToggleActionOptions
): ResolveHomeGuideToggleActionResult {
  const opts = options || {};
  const checked = !!opts.checked;
  const isHome = !!opts.isHomePage;
  if (!checked) {
    return {
      shouldStartGuide: false,
      shouldCloseSettings: false,
      shouldResync: false,
      startFromSettings: false
    };
  }
  if (!isHome) {
    return {
      shouldStartGuide: false,
      shouldCloseSettings: false,
      shouldResync: true,
      startFromSettings: false
    };
  }
  return {
    shouldStartGuide: true,
    shouldCloseSettings: true,
    shouldResync: false,
    startFromSettings: true
  };
}

export function resolveHomeGuideLifecycleState(
  options: ResolveHomeGuideLifecycleStateOptions
): ResolveHomeGuideLifecycleStateResult {
  const opts = options || {};
  const action = typeof opts.action === "string" ? opts.action : "";
  if (action === "start") {
    const inputSteps = Array.isArray(opts.steps) ? opts.steps : [];
    return {
      active: true,
      fromSettings: !!opts.fromSettings,
      index: 0,
      steps: inputSteps.map((step) => ({
        selector: step && typeof step.selector === "string" ? step.selector : "",
        title: step && typeof step.title === "string" ? step.title : "",
        desc: step && typeof step.desc === "string" ? step.desc : ""
      }))
    };
  }
  return {
    active: false,
    fromSettings: false,
    index: 0,
    steps: []
  };
}

export function resolveHomeGuideSessionState(
  options: ResolveHomeGuideSessionStateOptions
): ResolveHomeGuideSessionStateResult {
  const opts = options || {};
  const lifecycleState = opts.lifecycleState || null;
  const inputSteps = lifecycleState && Array.isArray(lifecycleState.steps) ? lifecycleState.steps : [];
  const rawIndex =
    lifecycleState && typeof lifecycleState.index === "number" ? lifecycleState.index : 0;
  const index = Number.isFinite(rawIndex) ? Math.max(0, Math.floor(rawIndex)) : 0;
  return {
    active: !!(lifecycleState && lifecycleState.active),
    fromSettings: !!(lifecycleState && lifecycleState.fromSettings),
    index,
    steps: inputSteps.map((step) => ({
      selector: step && typeof step.selector === "string" ? step.selector : "",
      title: step && typeof step.title === "string" ? step.title : "",
      desc: step && typeof step.desc === "string" ? step.desc : ""
    }))
  };
}

export function resolveHomeGuideLayerDisplayState(
  options: ResolveHomeGuideLayerDisplayStateOptions
): ResolveHomeGuideLayerDisplayStateResult {
  const opts = options || {};
  const active = !!opts.active;
  return {
    overlayDisplay: active ? "block" : "none",
    panelDisplay: active ? "block" : "none"
  };
}

export function resolveHomeGuideFinishState(
  options: ResolveHomeGuideFinishStateOptions
): ResolveHomeGuideFinishStateResult {
  const opts = options || {};
  const reason = typeof opts.reason === "string" ? opts.reason : "";
  return {
    markSeen: true,
    showDoneNotice: reason === "completed"
  };
}

export function resolveHomeGuideTargetScrollState(
  options: ResolveHomeGuideTargetScrollStateOptions
): ResolveHomeGuideTargetScrollStateResult {
  const opts = options || {};
  return {
    shouldScroll: !!opts.isCompactViewport && !!opts.canScrollIntoView,
    block: "center",
    inline: "nearest",
    behavior: "smooth"
  };
}

export function resolveHomeGuideDoneNotice(
  options: ResolveHomeGuideDoneNoticeOptions
): ResolveHomeGuideDoneNoticeResult {
  const opts = options || {};
  const defaultMessage = "指引已完成，可在设置中重新打开新手指引。";
  const rawMessage = typeof opts.message === "string" ? opts.message.trim() : "";
  const hideDelayMs = Math.max(0, Math.floor(toFiniteNumber(opts.hideDelayMs, 2600)));
  return {
    message: rawMessage || defaultMessage,
    hideDelayMs
  };
}

export function resolveHomeGuideDoneNoticeStyle(): HomeGuideDoneNoticeStyle {
  return {
    position: "fixed",
    left: "50%",
    bottom: "26px",
    transform: "translateX(-50%)",
    background: "rgba(46, 40, 34, 0.94)",
    color: "#f9f6f2",
    padding: "10px 14px",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "bold",
    zIndex: "3400",
    boxShadow: "0 6px 20px rgba(0,0,0,0.35)",
    opacity: "0",
    transition: "opacity 160ms ease"
  };
}

function toFiniteNumber(value: number | null | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function resolveHomeGuidePanelLayout(
  options: ResolveHomeGuidePanelLayoutOptions
): ResolveHomeGuidePanelLayoutResult {
  const opts = options || {};
  const rect = opts.targetRect || {};
  const margin = toFiniteNumber(opts.margin, 12);
  const viewportWidth = toFiniteNumber(opts.viewportWidth, 0);
  const viewportHeight = toFiniteNumber(opts.viewportHeight, 0);
  const mobileLayout = !!opts.mobileLayout;
  const mobilePanelMinWidth = toFiniteNumber(opts.mobilePanelMinWidth, 240);
  const mobilePanelMaxWidth = toFiniteNumber(opts.mobilePanelMaxWidth, 380);
  const desktopPanelMinWidth = toFiniteNumber(opts.desktopPanelMinWidth, 280);
  const desktopPanelMaxWidth = toFiniteNumber(opts.desktopPanelMaxWidth, 430);
  const panelHeight = toFiniteNumber(opts.panelHeight, 160);
  const rectLeft = toFiniteNumber(rect.left, 0);
  const rectTop = toFiniteNumber(rect.top, 0);
  const rectBottom = toFiniteNumber(rect.bottom, rectTop);
  const rectWidth = toFiniteNumber(rect.width, 0);

  let panelWidth;
  if (mobileLayout) {
    panelWidth = Math.min(mobilePanelMaxWidth, Math.max(mobilePanelMinWidth, viewportWidth - margin * 2));
  } else {
    panelWidth = Math.min(desktopPanelMaxWidth, Math.max(desktopPanelMinWidth, viewportWidth - margin * 2));
  }

  let top;
  if (mobileLayout) {
    top = viewportHeight - panelHeight - margin;
  } else {
    top = rectBottom + margin;
    if (top + panelHeight > viewportHeight - margin) {
      top = rectTop - panelHeight - margin;
    }
  }
  if (top < margin) top = margin;

  let left = rectLeft + rectWidth / 2 - panelWidth / 2;
  if (left < margin) left = margin;
  if (left + panelWidth > viewportWidth - margin) {
    left = viewportWidth - panelWidth - margin;
  }

  return {
    panelWidth: Math.round(panelWidth),
    top: Math.round(top),
    left: Math.round(left)
  };
}

export function isHomeGuideTargetVisible(options: IsHomeGuideTargetVisibleOptions): boolean {
  const opts = options || {};
  const node = opts.nodeLike || null;
  if (!node) return false;

  if (typeof node.getClientRects === "function") {
    const rects = node.getClientRects();
    if (!rects || rects.length === 0) return false;
  }

  let style: HomeGuideComputedStyleLike | null | undefined = null;
  try {
    if (typeof opts.getComputedStyle === "function") {
      style = opts.getComputedStyle(node);
    }
  } catch (_err) {
    style = null;
  }
  if (
    style &&
    (style.display === "none" || style.visibility === "hidden" || style.opacity === "0")
  ) {
    return false;
  }
  return true;
}
