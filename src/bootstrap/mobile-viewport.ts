interface MatchMediaResultLike {
  matches: boolean;
}

interface WindowLike {
  innerWidth?: number;
  matchMedia?(query: string): MatchMediaResultLike;
}

interface NavigatorLike {
  userAgent?: string;
}

interface BodyLike {
  getAttribute?(name: string): string | null;
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
