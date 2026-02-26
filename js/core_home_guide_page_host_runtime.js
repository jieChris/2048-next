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

  function resolveStorageByName(input) {
    var source = toRecord(input);
    var storageRuntime = toRecord(source.storageRuntime);
    var resolveStorage = asFunction(storageRuntime.resolveStorageByName);
    if (!resolveStorage) return null;
    return resolveStorage({
      windowLike: source.windowLike || null,
      storageName: source.storageName
    });
  }

  function applyHomeGuideSettingsPageInit(input) {
    var source = toRecord(input);
    var hostRuntime = toRecord(source.homeGuideSettingsHostRuntime);
    var applySettingsUi = asFunction(hostRuntime.applyHomeGuideSettingsUi);
    if (!applySettingsUi) {
      return {
        hasApplySettingsUiApi: false,
        didApply: false
      };
    }

    applySettingsUi({
      documentLike: source.documentLike,
      windowLike: source.windowLike,
      homeGuideRuntime: source.homeGuideRuntime,
      homeGuideState: source.homeGuideState,
      isHomePage: source.isHomePage,
      closeSettingsModal: source.closeSettingsModal,
      startHomeGuide: source.startHomeGuide
    });

    return {
      hasApplySettingsUiApi: true,
      didApply: true
    };
  }

  function applyHomeGuideAutoStartPage(input) {
    var source = toRecord(input);
    var startupHostRuntime = toRecord(source.homeGuideStartupHostRuntime);
    var applyAutoStart = asFunction(startupHostRuntime.applyHomeGuideAutoStart);
    if (!applyAutoStart) {
      return {
        hasApplyAutoStartApi: false,
        didApply: false
      };
    }

    applyAutoStart({
      homeGuideRuntime: source.homeGuideRuntime,
      locationLike: source.locationLike,
      storageLike: source.storageLike,
      seenKey: source.seenKey,
      startHomeGuide: source.startHomeGuide,
      setTimeoutLike: source.setTimeoutLike,
      delayMs: source.delayMs
    });

    return {
      hasApplyAutoStartApi: true,
      didApply: true
    };
  }

  function applyHomeGuideAutoStartPageFromContext(input) {
    var source = toRecord(input);
    var storageLike = resolveStorageByName({
      storageRuntime: source.storageRuntime,
      windowLike: source.windowLike || null,
      storageName: "localStorage"
    });
    var pageResult = applyHomeGuideAutoStartPage({
      homeGuideStartupHostRuntime: source.homeGuideStartupHostRuntime,
      homeGuideRuntime: source.homeGuideRuntime,
      locationLike: source.locationLike,
      storageLike: storageLike,
      seenKey: source.seenKey,
      startHomeGuide: source.startHomeGuide,
      setTimeoutLike: source.setTimeoutLike,
      delayMs: source.delayMs
    });

    return {
      didInvokePageAutoStart: pageResult.didApply,
      localStorageResolved: !!storageLike,
      pageResult: pageResult
    };
  }

  global.CoreHomeGuidePageHostRuntime = global.CoreHomeGuidePageHostRuntime || {};
  global.CoreHomeGuidePageHostRuntime.applyHomeGuideSettingsPageInit =
    applyHomeGuideSettingsPageInit;
  global.CoreHomeGuidePageHostRuntime.applyHomeGuideAutoStartPage =
    applyHomeGuideAutoStartPage;
  global.CoreHomeGuidePageHostRuntime.applyHomeGuideAutoStartPageFromContext =
    applyHomeGuideAutoStartPageFromContext;
})(typeof window !== "undefined" ? window : undefined);
