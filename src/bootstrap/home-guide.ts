export interface HomeGuideAutoStartOptions {
  pathname?: string | null | undefined;
  seenValue?: string | null | undefined;
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
