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

  function resolveBoolean(value) {
    return !!value;
  }

  function resolveNumber(value, fallback) {
    var parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
    return fallback;
  }

  function resolveSteps(value) {
    return Array.isArray(value) ? value : [];
  }

  function resolveDisplayValue(value) {
    if (value == null) return "none";
    return String(value);
  }

  function setDisplay(node, display) {
    var style = toRecord(toRecord(node).style);
    style.display = display;
  }

  function setBodyClassState(documentLike, className, active) {
    var body = toRecord(toRecord(documentLike).body);
    if (!body) return;

    var classList = toRecord(body.classList);
    var addClass = asFunction(classList.add);
    var removeClass = asFunction(classList.remove);
    if (active && addClass) {
      addClass.call(body.classList, className);
      return;
    }
    if (!active && removeClass) {
      removeClass.call(body.classList, className);
      return;
    }

    var rawClassName = String(body.className || "").trim();
    var tokens = rawClassName ? rawClassName.split(/\s+/) : [];
    var nextTokens = tokens.filter(function (token) {
      return token && token !== className;
    });
    if (active) {
      nextTokens.push(className);
    }
    body.className = nextTokens.join(" ");
  }

  function applyHomeGuideStart(input) {
    var source = toRecord(input);
    var isHomePage = asFunction(source.isHomePage);
    if (!isHomePage || !isHomePage()) {
      return {
        didStart: false,
        hasDom: false
      };
    }

    var homeGuideRuntime = toRecord(source.homeGuideRuntime);
    var resolveLifecycleState = asFunction(homeGuideRuntime.resolveHomeGuideLifecycleState);
    var resolveSessionState = asFunction(homeGuideRuntime.resolveHomeGuideSessionState);
    var resolveLayerDisplayState = asFunction(homeGuideRuntime.resolveHomeGuideLayerDisplayState);
    var ensureHomeGuideDom = asFunction(source.ensureHomeGuideDom);
    var getHomeGuideSteps = asFunction(source.getHomeGuideSteps);

    if (!resolveLifecycleState || !resolveSessionState || !resolveLayerDisplayState || !ensureHomeGuideDom || !getHomeGuideSteps) {
      return {
        didStart: false,
        hasDom: false
      };
    }

    var dom = toRecord(ensureHomeGuideDom());
    var options = toRecord(source.options);

    var lifecycleState = toRecord(resolveLifecycleState({
      action: "start",
      fromSettings: resolveBoolean(options.fromSettings),
      steps: getHomeGuideSteps()
    }));

    var sessionState = toRecord(resolveSessionState({
      lifecycleState: lifecycleState
    }));

    var homeGuideState = toRecord(source.homeGuideState);
    homeGuideState.active = resolveBoolean(sessionState.active);
    homeGuideState.fromSettings = resolveBoolean(sessionState.fromSettings);
    homeGuideState.steps = resolveSteps(sessionState.steps);
    homeGuideState.index = resolveNumber(sessionState.index, 0);

    var layerDisplayState = toRecord(resolveLayerDisplayState({
      active: resolveBoolean(homeGuideState.active)
    }));

    if (dom.overlay) {
      setDisplay(dom.overlay, resolveDisplayValue(layerDisplayState.overlayDisplay));
    }
    if (dom.panel) {
      setDisplay(dom.panel, resolveDisplayValue(layerDisplayState.panelDisplay));
    }
    setBodyClassState(source.documentLike, "home-guide-active", resolveBoolean(homeGuideState.active));

    return {
      didStart: true,
      hasDom: !!(dom.overlay && dom.panel)
    };
  }

  global.CoreHomeGuideStartHostRuntime = global.CoreHomeGuideStartHostRuntime || {};
  global.CoreHomeGuideStartHostRuntime.applyHomeGuideStart = applyHomeGuideStart;
})(typeof window !== "undefined" ? window : undefined);
