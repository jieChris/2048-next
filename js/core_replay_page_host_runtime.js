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

  function resolveManagerFromWindow(windowLike) {
    var windowRecord = toRecord(windowLike);
    return windowRecord.game_manager || null;
  }

  function applyReplayModalPageOpen(input) {
    var source = toRecord(input);
    var modalRuntime = toRecord(source.replayModalRuntime);
    var applyOpen = asFunction(modalRuntime.applyReplayModalOpen);
    if (!applyOpen) {
      return {
        hasApplyOpenApi: false,
        didApply: false
      };
    }

    applyOpen({
      documentLike: source.documentLike,
      title: source.title,
      content: source.content,
      actionName: source.actionName,
      actionCallback: source.actionCallback,
      closeCallback: source.closeCallback
    });

    return {
      hasApplyOpenApi: true,
      didApply: true
    };
  }

  function applyReplayModalPageClose(input) {
    var source = toRecord(input);
    var modalRuntime = toRecord(source.replayModalRuntime);
    var applyClose = asFunction(modalRuntime.applyReplayModalClose);
    if (!applyClose) {
      return {
        hasApplyCloseApi: false,
        didApply: false
      };
    }

    applyClose({
      documentLike: source.documentLike
    });

    return {
      hasApplyCloseApi: true,
      didApply: true
    };
  }

  function applyReplayExportPageAction(input) {
    var source = toRecord(input);
    var exportRuntime = toRecord(source.replayExportRuntime);
    var applyExport = asFunction(exportRuntime.applyReplayExport);
    if (!applyExport) {
      return {
        hasApplyExportApi: false,
        didApply: false
      };
    }

    applyExport({
      gameManager: source.gameManager,
      showReplayModal: source.showReplayModal,
      navigatorLike: source.navigatorLike,
      documentLike: source.documentLike,
      alertLike: source.alertLike,
      consoleLike: source.consoleLike
    });

    return {
      hasApplyExportApi: true,
      didApply: true
    };
  }

  function applyReplayExportPageActionFromContext(input) {
    var source = toRecord(input);
    var gameManager = resolveManagerFromWindow(source.windowLike);
    var exportResult = applyReplayExportPageAction({
      replayExportRuntime: source.replayExportRuntime,
      gameManager: gameManager,
      showReplayModal: source.showReplayModal,
      navigatorLike: source.navigatorLike,
      documentLike: source.documentLike,
      alertLike: source.alertLike,
      consoleLike: source.consoleLike
    });

    return {
      didInvokeExport: !!exportResult.didApply,
      managerResolved: !!gameManager,
      exportResult: exportResult
    };
  }

  global.CoreReplayPageHostRuntime = global.CoreReplayPageHostRuntime || {};
  global.CoreReplayPageHostRuntime.applyReplayModalPageOpen = applyReplayModalPageOpen;
  global.CoreReplayPageHostRuntime.applyReplayModalPageClose = applyReplayModalPageClose;
  global.CoreReplayPageHostRuntime.applyReplayExportPageAction = applyReplayExportPageAction;
  global.CoreReplayPageHostRuntime.applyReplayExportPageActionFromContext =
    applyReplayExportPageActionFromContext;
})(typeof window !== "undefined" ? window : undefined);
