(function (global) {
  "use strict";

  if (!global) return;

  function isViewportAtMost(options) {
    var opts = options || {};
    var win = opts.windowLike || null;
    var maxWidth = typeof opts.maxWidth === "number" ? opts.maxWidth : 0;
    if (!win || maxWidth <= 0) return false;

    var query = "(max-width: " + maxWidth + "px)";
    try {
      if (typeof win.matchMedia === "function") {
        return !!win.matchMedia(query).matches;
      }
    } catch (_err) {}

    return typeof win.innerWidth === "number" && win.innerWidth <= maxWidth;
  }

  function isCompactGameViewport(options) {
    return isViewportAtMost(options);
  }

  function isTimerboxCollapseViewport(options) {
    return isViewportAtMost(options);
  }

  function isMobileGameViewport(options) {
    var opts = options || {};
    var win = opts.windowLike || null;
    if (!isViewportAtMost({ windowLike: win, maxWidth: opts.maxWidth })) return false;

    var coarsePointer = false;
    var noHover = false;
    try {
      if (win && typeof win.matchMedia === "function") {
        coarsePointer = !!win.matchMedia("(pointer: coarse)").matches;
        noHover = !!win.matchMedia("(hover: none)").matches;
      }
    } catch (_err) {}

    var ua = "";
    var nav = opts.navigatorLike || null;
    try {
      ua = nav && typeof nav.userAgent === "string" ? nav.userAgent : "";
    } catch (_err) {
      ua = "";
    }
    var mobileUa = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);

    return coarsePointer || noHover || mobileUa;
  }

  global.CoreMobileViewportRuntime = global.CoreMobileViewportRuntime || {};
  global.CoreMobileViewportRuntime.isViewportAtMost = isViewportAtMost;
  global.CoreMobileViewportRuntime.isCompactGameViewport = isCompactGameViewport;
  global.CoreMobileViewportRuntime.isTimerboxCollapseViewport = isTimerboxCollapseViewport;
  global.CoreMobileViewportRuntime.isMobileGameViewport = isMobileGameViewport;
})(typeof window !== "undefined" ? window : undefined);
