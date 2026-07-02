interface MatchMediaResultLike {
  matches: boolean;
}

interface WindowLike {
  innerWidth?: number;
  innerHeight?: number;
  matchMedia?(query: string): MatchMediaResultLike;
  visualViewport?: {
    height?: number;
    addEventListener?(name: string, listener: () => void): unknown;
  } | null;
  addEventListener?(name: string, listener: () => void): unknown;
  requestAnimationFrame?(callback: () => void): unknown;
  setTimeout?(callback: () => void, delay?: number): unknown;
  ResizeObserver?: new (callback: () => void) => {
    observe(target: unknown): unknown;
  };
  __mobilePageScrollLockBound?: boolean;
}

interface NavigatorLike {
  userAgent?: string;
}

interface BodyLike {
  getAttribute?(name: string): string | null;
  scrollHeight?: number;
  clientHeight?: number;
}

interface AttributeElementLike {
  scrollHeight?: number;
  clientHeight?: number;
  setAttribute?(name: string, value: string): unknown;
  removeAttribute?(name: string): unknown;
}

interface DocumentLike {
  documentElement?: AttributeElementLike | null;
  body?: BodyLike | null;
  querySelector?(selector: string): unknown;
  addEventListener?(
    name: string,
    listener: (event: unknown) => void,
    options?: unknown
  ): unknown;
}

interface TouchMoveEventLike {
  cancelable?: boolean;
  preventDefault?(): unknown;
}

export interface ViewportWidthOptions {
  windowLike?: WindowLike | null | undefined;
  maxWidth?: number | null | undefined;
}

export interface MobileGameViewportOptions extends ViewportWidthOptions {
  navigatorLike?: NavigatorLike | null | undefined;
}

export interface PageScopeOptions {
  bodyLike?: BodyLike | null | undefined;
}

export interface MobilePageScrollLockOptions extends MobileGameViewportOptions, PageScopeOptions {
  documentLike?: DocumentLike | null | undefined;
  tolerancePx?: number | null | undefined;
  attributeName?: string | null | undefined;
  lockedValue?: string | null | undefined;
}

export interface MobilePageScrollLockState {
  shouldLock: boolean;
  isMobileViewport: boolean;
  isPageScope: boolean;
  viewportHeight: number;
  scrollHeight: number;
  overflowPx: number;
}

export function isViewportAtMost(options: ViewportWidthOptions): boolean {
  const opts = options || {};
  const win = opts.windowLike || null;
  const maxWidth = typeof opts.maxWidth === "number" ? opts.maxWidth : 0;
  if (!win || maxWidth <= 0) return false;

  const query = "(max-width: " + maxWidth + "px)";
  try {
    if (typeof win.matchMedia === "function") {
      return !!win.matchMedia(query).matches;
    }
  } catch (_err) {}

  return typeof win.innerWidth === "number" && win.innerWidth <= maxWidth;
}

export function isCompactGameViewport(options: ViewportWidthOptions): boolean {
  return isViewportAtMost(options);
}

export function isTimerboxCollapseViewport(options: ViewportWidthOptions): boolean {
  return isViewportAtMost(options);
}

export function isMobileGameViewport(options: MobileGameViewportOptions): boolean {
  const opts = options || {};
  const win = opts.windowLike || null;
  if (!isViewportAtMost({ windowLike: win, maxWidth: opts.maxWidth })) return false;

  let coarsePointer = false;
  let noHover = false;
  try {
    if (win && typeof win.matchMedia === "function") {
      coarsePointer = !!win.matchMedia("(pointer: coarse)").matches;
      noHover = !!win.matchMedia("(hover: none)").matches;
    }
  } catch (_err) {}

  let ua = "";
  const nav = opts.navigatorLike || null;
  try {
    ua = nav && typeof nav.userAgent === "string" ? nav.userAgent : "";
  } catch (_err) {
    ua = "";
  }
  const mobileUa = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);

  return coarsePointer || noHover || mobileUa;
}

export function resolvePageScopeValue(options: PageScopeOptions): string {
  const opts = options || {};
  const body = opts.bodyLike || null;
  if (!body || typeof body.getAttribute !== "function") return "";
  const value = body.getAttribute("data-page");
  return typeof value === "string" ? value : "";
}

export function isGamePageScope(options: PageScopeOptions): boolean {
  return resolvePageScopeValue(options) === "game";
}

export function isPracticePageScope(options: PageScopeOptions): boolean {
  return resolvePageScopeValue(options) === "practice";
}

export function isTimerboxMobileScope(options: PageScopeOptions): boolean {
  const page = resolvePageScopeValue(options);
  return page === "game" || page === "practice";
}

function toFiniteNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function resolveBodyLike(options: MobilePageScrollLockOptions): BodyLike | null {
  if (options.bodyLike) return options.bodyLike;
  const doc = options.documentLike || null;
  return doc && doc.body ? doc.body : null;
}

function resolveViewportHeight(windowLike: WindowLike | null, root: AttributeElementLike | null): number {
  const visualViewport = windowLike && windowLike.visualViewport ? windowLike.visualViewport : null;
  const visualHeight = toFiniteNumber(visualViewport && visualViewport.height, 0);
  if (visualHeight > 0) return visualHeight;
  const innerHeight = toFiniteNumber(windowLike && windowLike.innerHeight, 0);
  if (innerHeight > 0) return innerHeight;
  return toFiniteNumber(root && root.clientHeight, 0);
}

function resolvePageScrollHeight(
  root: AttributeElementLike | null,
  body: BodyLike | null
): number {
  return Math.max(
    toFiniteNumber(root && root.scrollHeight, 0),
    toFiniteNumber(body && body.scrollHeight, 0),
    toFiniteNumber(root && root.clientHeight, 0),
    toFiniteNumber(body && body.clientHeight, 0)
  );
}

export function resolveMobilePageScrollLockState(
  options: MobilePageScrollLockOptions
): MobilePageScrollLockState {
  const opts = options || {};
  const doc = opts.documentLike || null;
  const root = doc && doc.documentElement ? doc.documentElement : null;
  const body = resolveBodyLike(opts);
  const win = opts.windowLike || null;
  const tolerancePx = Math.max(0, toFiniteNumber(opts.tolerancePx, 2));
  const viewportHeight = resolveViewportHeight(win, root);
  const scrollHeight = resolvePageScrollHeight(root, body);
  const isMobileViewport = isMobileGameViewport({
    windowLike: win,
    navigatorLike: opts.navigatorLike,
    maxWidth: opts.maxWidth
  });
  const isPageScope = isTimerboxMobileScope({ bodyLike: body });
  const overflowPx = Math.max(0, scrollHeight - viewportHeight);

  return {
    shouldLock: isMobileViewport && isPageScope && viewportHeight > 0 && overflowPx <= tolerancePx,
    isMobileViewport,
    isPageScope,
    viewportHeight,
    scrollHeight,
    overflowPx
  };
}

export function applyMobilePageScrollLock(
  options: MobilePageScrollLockOptions
): MobilePageScrollLockState {
  const opts = options || {};
  const doc = opts.documentLike || null;
  const root = doc && doc.documentElement ? doc.documentElement : null;
  const attributeName =
    typeof opts.attributeName === "string" && opts.attributeName
      ? opts.attributeName
      : "data-mobile-page-scroll-lock";
  const lockedValue =
    typeof opts.lockedValue === "string" && opts.lockedValue ? opts.lockedValue : "1";
  const state = resolveMobilePageScrollLockState(opts);

  if (root) {
    if (state.shouldLock && typeof root.setAttribute === "function") {
      root.setAttribute(attributeName, lockedValue);
    } else if (!state.shouldLock && typeof root.removeAttribute === "function") {
      root.removeAttribute(attributeName);
    }
  }

  return state;
}

export function handleMobilePageScrollLockTouchMove(
  options: MobilePageScrollLockOptions,
  eventLike: TouchMoveEventLike | null | undefined
): boolean {
  const state = resolveMobilePageScrollLockState(options || {});
  if (!state.shouldLock) return false;
  const eventRecord = eventLike || null;
  if (
    eventRecord &&
    eventRecord.cancelable !== false &&
    typeof eventRecord.preventDefault === "function"
  ) {
    eventRecord.preventDefault();
    return true;
  }
  return false;
}

export function bindMobilePageScrollLock(options: MobilePageScrollLockOptions): MobilePageScrollLockState {
  const opts = options || {};
  const win = opts.windowLike || null;
  const doc = opts.documentLike || null;
  const sync = function (): MobilePageScrollLockState {
    return applyMobilePageScrollLock(opts);
  };
  const scheduleSync = function (): void {
    if (win && typeof win.requestAnimationFrame === "function") {
      win.requestAnimationFrame(sync);
      return;
    }
    if (win && typeof win.setTimeout === "function") {
      win.setTimeout(sync, 0);
      return;
    }
    sync();
  };

  const initialState = sync();
  if (!win || win.__mobilePageScrollLockBound) return initialState;
  win.__mobilePageScrollLockBound = true;

  if (typeof win.addEventListener === "function") {
    win.addEventListener("resize", scheduleSync);
    win.addEventListener("orientationchange", scheduleSync);
    win.addEventListener("load", scheduleSync);
  }
  const visualViewport = win.visualViewport || null;
  if (visualViewport && typeof visualViewport.addEventListener === "function") {
    visualViewport.addEventListener("resize", scheduleSync);
  }
  if (doc && typeof doc.addEventListener === "function") {
    doc.addEventListener(
      "touchmove",
      function (event: unknown): void {
        handleMobilePageScrollLockTouchMove(opts, event as TouchMoveEventLike);
      },
      { passive: false }
    );
  }
  const ResizeObserverCtor = win.ResizeObserver;
  if (typeof ResizeObserverCtor === "function") {
    const observer = new ResizeObserverCtor(scheduleSync);
    const root = doc && doc.documentElement ? doc.documentElement : null;
    const body = resolveBodyLike(opts);
    if (root) observer.observe(root);
    if (body) observer.observe(body);
    const container =
      doc && typeof doc.querySelector === "function" ? doc.querySelector(".container") : null;
    if (container) observer.observe(container);
  }

  scheduleSync();
  return initialState;
}
