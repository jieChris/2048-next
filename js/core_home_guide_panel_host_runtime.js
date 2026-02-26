(function (global) {
  "use strict";

  if (!global) return;

  function isRecord(value) {
    return !!value && typeof value === "object";
  }

  function toRecord(value) {
    return isRecord(value) ? value : {};
  }

  function asFunction(value) {
    return typeof value === "function" ? value : null;
  }

  function resolveNumber(value, fallback) {
    var parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
    return fallback;
  }

  function applyHomeGuidePanelPosition(input) {
    var source = toRecord(input);
    var homeGuideState = toRecord(source.homeGuideState);
    var panel = toRecord(homeGuideState.panel);
    var target = homeGuideState.target;
    if (!panel || !target) {
      return {
        didPosition: false
      };
    }

    var getBoundingClientRect = asFunction(toRecord(target).getBoundingClientRect);
    if (!getBoundingClientRect) {
      return {
        didPosition: false
      };
    }

    var homeGuideRuntime = toRecord(source.homeGuideRuntime);
    var resolveHomeGuidePanelLayout = asFunction(homeGuideRuntime.resolveHomeGuidePanelLayout);
    if (!resolveHomeGuidePanelLayout) {
      return {
        didPosition: false
      };
    }

    var mobileViewportRuntime = toRecord(source.mobileViewportRuntime);
    var isViewportAtMost = asFunction(mobileViewportRuntime.isViewportAtMost);

    var windowLike = toRecord(source.windowLike);
    var rect = getBoundingClientRect.call(target);
    var margin = resolveNumber(source.margin, 12);
    var defaultPanelHeight = resolveNumber(source.defaultPanelHeight, 160);
    var mobileLayout = !!(
      isViewportAtMost &&
      isViewportAtMost({
        windowLike: source.windowLike,
        maxWidth: resolveNumber(source.mobileUiMaxWidth, 640)
      })
    );

    var initialLayout = toRecord(
      resolveHomeGuidePanelLayout({
        targetRect: rect,
        viewportWidth: resolveNumber(windowLike.innerWidth, 0),
        viewportHeight: resolveNumber(windowLike.innerHeight, 0),
        panelHeight: defaultPanelHeight,
        margin: margin,
        mobileLayout: mobileLayout
      })
    );

    var panelStyle = toRecord(panel.style);
    panelStyle.maxWidth = resolveNumber(initialLayout.panelWidth, 0) + "px";
    panelStyle.width = resolveNumber(initialLayout.panelWidth, 0) + "px";

    var panelHeight = resolveNumber(panel.offsetHeight, defaultPanelHeight);
    var layout = toRecord(
      resolveHomeGuidePanelLayout({
        targetRect: rect,
        viewportWidth: resolveNumber(windowLike.innerWidth, 0),
        viewportHeight: resolveNumber(windowLike.innerHeight, 0),
        panelHeight: panelHeight,
        margin: margin,
        mobileLayout: mobileLayout
      })
    );

    panelStyle.maxWidth = resolveNumber(layout.panelWidth, 0) + "px";
    panelStyle.width = resolveNumber(layout.panelWidth, 0) + "px";
    panelStyle.top = resolveNumber(layout.top, 0) + "px";
    panelStyle.left = resolveNumber(layout.left, 0) + "px";
    panel.style = panelStyle;

    return {
      didPosition: true
    };
  }

  function resolveHomeGuideTargetVisibility(input) {
    var source = toRecord(input);
    var homeGuideRuntime = toRecord(source.homeGuideRuntime);
    var isHomeGuideTargetVisible = asFunction(homeGuideRuntime.isHomeGuideTargetVisible);
    if (!isHomeGuideTargetVisible) return false;

    var windowLike = toRecord(source.windowLike);
    var getComputedStyle = asFunction(windowLike.getComputedStyle);

    return !!isHomeGuideTargetVisible({
      nodeLike: source.node || null,
      getComputedStyle:
        getComputedStyle && source.windowLike
          ? function (el) {
              return getComputedStyle.call(source.windowLike, el);
            }
          : null
    });
  }

  global.CoreHomeGuidePanelHostRuntime = global.CoreHomeGuidePanelHostRuntime || {};
  global.CoreHomeGuidePanelHostRuntime.applyHomeGuidePanelPosition = applyHomeGuidePanelPosition;
  global.CoreHomeGuidePanelHostRuntime.resolveHomeGuideTargetVisibility =
    resolveHomeGuideTargetVisibility;
})(typeof window !== "undefined" ? window : undefined);
