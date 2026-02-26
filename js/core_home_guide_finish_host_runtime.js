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

  function resolveDisplayValue(value) {
    if (value == null) return "none";
    return String(value);
  }

  function setDisplay(node, display) {
    var style = toRecord(toRecord(node).style);
    style.display = display;
    toRecord(node).style = style;
  }

  function applyHomeGuideFinish(input) {
    var source = toRecord(input);
    var homeGuideRuntime = toRecord(source.homeGuideRuntime);

    var resolveLifecycleState = asFunction(homeGuideRuntime.resolveHomeGuideLifecycleState);
    var resolveSessionState = asFunction(homeGuideRuntime.resolveHomeGuideSessionState);
    var resolveLayerDisplayState = asFunction(homeGuideRuntime.resolveHomeGuideLayerDisplayState);

    if (!resolveLifecycleState || !resolveSessionState || !resolveLayerDisplayState) {
      return {
        didFinish: false,
        markedSeen: false,
        syncedSettings: false,
        showedDoneNotice: false
      };
    }

    var clearHomeGuideHighlight = asFunction(source.clearHomeGuideHighlight);
    if (clearHomeGuideHighlight) {
      clearHomeGuideHighlight();
    }

    var homeGuideState = toRecord(source.homeGuideState);

    var lifecycleState = toRecord(resolveLifecycleState({
      action: "finish"
    }));

    var sessionState = toRecord(resolveSessionState({
      lifecycleState: lifecycleState
    }));

    homeGuideState.active = resolveBoolean(sessionState.active);
    homeGuideState.steps = Array.isArray(sessionState.steps) ? sessionState.steps : [];
    homeGuideState.index = resolveNumber(sessionState.index, 0);
    homeGuideState.fromSettings = resolveBoolean(sessionState.fromSettings);

    var layerDisplayState = toRecord(resolveLayerDisplayState({
      active: resolveBoolean(homeGuideState.active)
    }));

    if (homeGuideState.overlay) {
      setDisplay(homeGuideState.overlay, resolveDisplayValue(layerDisplayState.overlayDisplay));
    }
    if (homeGuideState.panel) {
      setDisplay(homeGuideState.panel, resolveDisplayValue(layerDisplayState.panelDisplay));
    }

    var markSeen = resolveBoolean(source.markSeen);
    var markedSeen = false;
    var markHomeGuideSeen = asFunction(homeGuideRuntime.markHomeGuideSeen);
    if (markSeen && markHomeGuideSeen) {
      markHomeGuideSeen({
        storageLike: source.storageLike || null,
        seenKey: source.seenKey
      });
      markedSeen = true;
    }

    var syncHomeGuideSettingsUI = asFunction(source.syncHomeGuideSettingsUI);
    var syncedSettings = false;
    if (syncHomeGuideSettingsUI) {
      syncHomeGuideSettingsUI();
      syncedSettings = true;
    }

    var options = toRecord(source.options);
    var showHomeGuideDoneNotice = asFunction(source.showHomeGuideDoneNotice);
    var showedDoneNotice = false;
    if (resolveBoolean(options.showDoneNotice) && showHomeGuideDoneNotice) {
      showHomeGuideDoneNotice();
      showedDoneNotice = true;
    }

    return {
      didFinish: true,
      markedSeen: markedSeen,
      syncedSettings: syncedSettings,
      showedDoneNotice: showedDoneNotice
    };
  }

  global.CoreHomeGuideFinishHostRuntime = global.CoreHomeGuideFinishHostRuntime || {};
  global.CoreHomeGuideFinishHostRuntime.applyHomeGuideFinish = applyHomeGuideFinish;
})(typeof window !== "undefined" ? window : undefined);
