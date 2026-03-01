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

  function resolveManagerFromWindow(windowLike) {
    var windowRecord = toRecord(windowLike);
    return windowRecord.game_manager || null;
  }

  function resolveGameModeConfigFromWindow(windowLike) {
    var windowRecord = toRecord(windowLike);
    var gameModeConfig = windowRecord.GAME_MODE_CONFIG;
    if (gameModeConfig && typeof gameModeConfig === "object") {
      return gameModeConfig;
    }
    return null;
  }

  function createPracticeTransferPageActionResolvers(input) {
    var source = toRecord(input);
    var pageHostRuntime = toRecord(source.practiceTransferPageHostRuntime);

    function openPracticeBoardFromCurrent() {
      var applyFromContext = asFunction(pageHostRuntime.applyPracticeTransferPageActionFromContext);
      if (applyFromContext) {
        return applyFromContext({
          practiceTransferHostRuntime: source.practiceTransferHostRuntime,
          practiceTransferRuntime: source.practiceTransferRuntime,
          storageRuntime: source.storageRuntime,
          guideShownKey: source.guideShownKey,
          guideSeenFlag: source.guideSeenFlag,
          localStorageKey: source.localStorageKey,
          sessionStorageKey: source.sessionStorageKey,
          documentLike: source.documentLike,
          windowLike: source.windowLike,
          alertLike: source.alertLike
        });
      }
      return applyPracticeTransferPageActionFromContext({
        practiceTransferHostRuntime: source.practiceTransferHostRuntime,
        practiceTransferRuntime: source.practiceTransferRuntime,
        storageRuntime: source.storageRuntime,
        guideShownKey: source.guideShownKey,
        guideSeenFlag: source.guideSeenFlag,
        localStorageKey: source.localStorageKey,
        sessionStorageKey: source.sessionStorageKey,
        documentLike: source.documentLike,
        windowLike: source.windowLike,
        alertLike: source.alertLike
      });
    }

    return {
      openPracticeBoardFromCurrent: openPracticeBoardFromCurrent
    };
  }

  function applyPracticeTransferPageAction(input) {
    var source = toRecord(input);
    var hostRuntime = toRecord(source.practiceTransferHostRuntime);
    var applyTransfer = asFunction(hostRuntime.applyPracticeTransferFromCurrent);
    if (!applyTransfer) {
      return {
        didInvokeHost: false,
        localStorageResolved: false,
        sessionStorageResolved: false,
        transferResult: null
      };
    }

    var windowLike = source.windowLike || null;
    var localStorageLike = resolveStorageByName({
      storageRuntime: source.storageRuntime,
      windowLike: windowLike,
      storageName: "localStorage"
    });
    var sessionStorageLike = resolveStorageByName({
      storageRuntime: source.storageRuntime,
      windowLike: windowLike,
      storageName: "sessionStorage"
    });

    var transferResult = applyTransfer({
      manager: source.manager || null,
      gameModeConfig:
        source.gameModeConfig && typeof source.gameModeConfig === "object"
          ? source.gameModeConfig
          : null,
      practiceTransferRuntime: source.practiceTransferRuntime || null,
      localStorageLike: localStorageLike,
      sessionStorageLike: sessionStorageLike,
      guideShownKey: source.guideShownKey,
      guideSeenFlag: source.guideSeenFlag,
      localStorageKey: source.localStorageKey,
      sessionStorageKey: source.sessionStorageKey,
      documentLike: source.documentLike || null,
      windowLike: windowLike,
      alertLike: source.alertLike
    });

    return {
      didInvokeHost: true,
      localStorageResolved: !!localStorageLike,
      sessionStorageResolved: !!sessionStorageLike,
      transferResult: transferResult || null
    };
  }

  function applyPracticeTransferPageActionFromContext(input) {
    var source = toRecord(input);
    var manager = resolveManagerFromWindow(source.windowLike);
    var gameModeConfig = resolveGameModeConfigFromWindow(source.windowLike);
    var actionResult = applyPracticeTransferPageAction({
      practiceTransferHostRuntime: source.practiceTransferHostRuntime,
      practiceTransferRuntime: source.practiceTransferRuntime,
      storageRuntime: source.storageRuntime,
      manager: manager,
      gameModeConfig: gameModeConfig,
      guideShownKey: source.guideShownKey,
      guideSeenFlag: source.guideSeenFlag,
      localStorageKey: source.localStorageKey,
      sessionStorageKey: source.sessionStorageKey,
      documentLike: source.documentLike,
      windowLike: source.windowLike,
      alertLike: source.alertLike
    });

    return {
      didInvokePageAction: actionResult.didInvokeHost,
      managerResolved: !!manager,
      modeConfigResolved: !!gameModeConfig,
      actionResult: actionResult
    };
  }

  global.CorePracticeTransferPageHostRuntime = global.CorePracticeTransferPageHostRuntime || {};
  global.CorePracticeTransferPageHostRuntime.createPracticeTransferPageActionResolvers =
    createPracticeTransferPageActionResolvers;
  global.CorePracticeTransferPageHostRuntime.applyPracticeTransferPageAction =
    applyPracticeTransferPageAction;
  global.CorePracticeTransferPageHostRuntime.applyPracticeTransferPageActionFromContext =
    applyPracticeTransferPageActionFromContext;
})(typeof window !== "undefined" ? window : undefined);
