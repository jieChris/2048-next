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

  function resolvePageScopeValue(options) {
    var opts = options || {};
    var body = opts.bodyLike || null;
    if (!body || typeof body.getAttribute !== "function") return "";
    var value = body.getAttribute("data-page");
    return typeof value === "string" ? value : "";
  }

  function isGamePageScope(options) {
    return resolvePageScopeValue(options) === "game";
  }

  function isPracticePageScope(options) {
    return resolvePageScopeValue(options) === "practice";
  }

  function isTimerboxMobileScope(options) {
    var page = resolvePageScopeValue(options);
    return page === "game" || page === "practice";
  }

  function toFiniteNumber(value, fallback) {
    return typeof value === "number" && isFinite(value) ? value : fallback;
  }

  function resolveBodyLike(options) {
    if (options.bodyLike) return options.bodyLike;
    var doc = options.documentLike || null;
    return doc && doc.body ? doc.body : null;
  }

  function resolveViewportHeight(windowLike, root) {
    var visualViewport = windowLike && windowLike.visualViewport ? windowLike.visualViewport : null;
    var visualHeight = toFiniteNumber(visualViewport && visualViewport.height, 0);
    if (visualHeight > 0) return visualHeight;
    var innerHeight = toFiniteNumber(windowLike && windowLike.innerHeight, 0);
    if (innerHeight > 0) return innerHeight;
    return toFiniteNumber(root && root.clientHeight, 0);
  }

  function resolvePageScrollHeight(root, body) {
    return Math.max(
      toFiniteNumber(root && root.scrollHeight, 0),
      toFiniteNumber(body && body.scrollHeight, 0),
      toFiniteNumber(root && root.clientHeight, 0),
      toFiniteNumber(body && body.clientHeight, 0)
    );
  }

  function resolveMobilePageScrollLockState(options) {
    var opts = options || {};
    var doc = opts.documentLike || null;
    var root = doc && doc.documentElement ? doc.documentElement : null;
    var body = resolveBodyLike(opts);
    var win = opts.windowLike || null;
    var tolerancePx = Math.max(0, toFiniteNumber(opts.tolerancePx, 2));
    var viewportHeight = resolveViewportHeight(win, root);
    var scrollHeight = resolvePageScrollHeight(root, body);
    var isMobileViewport = isMobileGameViewport({
      windowLike: win,
      navigatorLike: opts.navigatorLike,
      maxWidth: opts.maxWidth
    });
    var isPageScope = isTimerboxMobileScope({ bodyLike: body });
    var overflowPx = Math.max(0, scrollHeight - viewportHeight);

    return {
      shouldLock: isMobileViewport && isPageScope && viewportHeight > 0 && overflowPx <= tolerancePx,
      isMobileViewport: isMobileViewport,
      isPageScope: isPageScope,
      viewportHeight: viewportHeight,
      scrollHeight: scrollHeight,
      overflowPx: overflowPx
    };
  }

  function applyMobilePageScrollLock(options) {
    var opts = options || {};
    var doc = opts.documentLike || null;
    var root = doc && doc.documentElement ? doc.documentElement : null;
    var attributeName =
      typeof opts.attributeName === "string" && opts.attributeName
        ? opts.attributeName
        : "data-mobile-page-scroll-lock";
    var lockedValue =
      typeof opts.lockedValue === "string" && opts.lockedValue ? opts.lockedValue : "1";
    var state = resolveMobilePageScrollLockState(opts);

    if (root) {
      if (state.shouldLock && typeof root.setAttribute === "function") {
        root.setAttribute(attributeName, lockedValue);
      } else if (!state.shouldLock && typeof root.removeAttribute === "function") {
        root.removeAttribute(attributeName);
      }
    }

    return state;
  }

  function handleMobilePageScrollLockTouchMove(options, eventLike) {
    var state = resolveMobilePageScrollLockState(options || {});
    if (!state.shouldLock) return false;
    var eventRecord = eventLike || null;
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

  function bindMobilePageScrollLock(options) {
    var opts = options || {};
    var win = opts.windowLike || null;
    var doc = opts.documentLike || null;
    var sync = function () {
      return applyMobilePageScrollLock(opts);
    };
    var scheduleSync = function () {
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

    var initialState = sync();
    if (!win || win.__mobilePageScrollLockBound) return initialState;
    win.__mobilePageScrollLockBound = true;

    if (typeof win.addEventListener === "function") {
      win.addEventListener("resize", scheduleSync);
      win.addEventListener("orientationchange", scheduleSync);
      win.addEventListener("load", scheduleSync);
    }
    var visualViewport = win.visualViewport || null;
    if (visualViewport && typeof visualViewport.addEventListener === "function") {
      visualViewport.addEventListener("resize", scheduleSync);
    }
    if (doc && typeof doc.addEventListener === "function") {
      doc.addEventListener(
        "touchmove",
        function (event) {
          handleMobilePageScrollLockTouchMove(opts, event);
        },
        { passive: false }
      );
    }
    var ResizeObserverCtor = win.ResizeObserver;
    if (typeof ResizeObserverCtor === "function") {
      var observer = new ResizeObserverCtor(scheduleSync);
      var root = doc && doc.documentElement ? doc.documentElement : null;
      var body = resolveBodyLike(opts);
      if (root) observer.observe(root);
      if (body) observer.observe(body);
      var container =
        doc && typeof doc.querySelector === "function" ? doc.querySelector(".container") : null;
      if (container) observer.observe(container);
    }

    scheduleSync();
    return initialState;
  }

  global.CoreMobileViewportRuntime = global.CoreMobileViewportRuntime || {};
  global.CoreMobileViewportRuntime.isViewportAtMost = isViewportAtMost;
  global.CoreMobileViewportRuntime.isCompactGameViewport = isCompactGameViewport;
  global.CoreMobileViewportRuntime.isTimerboxCollapseViewport = isTimerboxCollapseViewport;
  global.CoreMobileViewportRuntime.isMobileGameViewport = isMobileGameViewport;
  global.CoreMobileViewportRuntime.resolvePageScopeValue = resolvePageScopeValue;
  global.CoreMobileViewportRuntime.isGamePageScope = isGamePageScope;
  global.CoreMobileViewportRuntime.isPracticePageScope = isPracticePageScope;
  global.CoreMobileViewportRuntime.isTimerboxMobileScope = isTimerboxMobileScope;
  global.CoreMobileViewportRuntime.resolveMobilePageScrollLockState =
    resolveMobilePageScrollLockState;
  global.CoreMobileViewportRuntime.applyMobilePageScrollLock = applyMobilePageScrollLock;
  global.CoreMobileViewportRuntime.handleMobilePageScrollLockTouchMove =
    handleMobilePageScrollLockTouchMove;
  global.CoreMobileViewportRuntime.bindMobilePageScrollLock = bindMobilePageScrollLock;
})(typeof window !== "undefined" ? window : undefined);
