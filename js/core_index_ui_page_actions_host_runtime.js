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

  function createIndexUiPageActionResolvers(input) {
    var source = toRecord(input);

    var settingsModalPageHostRuntime = toRecord(source.settingsModalPageHostRuntime);
    var createSettingsModalInitResolvers = asFunction(
      settingsModalPageHostRuntime.createSettingsModalInitResolvers
    );
    var createSettingsModalActionResolvers = asFunction(
      settingsModalPageHostRuntime.createSettingsModalActionResolvers
    );
    if (!createSettingsModalInitResolvers || !createSettingsModalActionResolvers) {
      throw new Error("CoreSettingsModalPageHostRuntime is required");
    }

    var settingsModalInitResolvers = toRecord(
      createSettingsModalInitResolvers({
        themeSettingsPageHostRuntime: source.themeSettingsPageHostRuntime,
        themeSettingsHostRuntime: source.themeSettingsHostRuntime,
        themeSettingsRuntime: source.themeSettingsRuntime,
        timerModuleSettingsHostRuntime: source.timerModuleSettingsHostRuntime,
        timerModuleSettingsPageHostRuntime: source.timerModuleSettingsPageHostRuntime,
        timerModuleRuntime: source.timerModuleRuntime,
        documentLike: source.documentLike || null,
        windowLike: source.windowLike || null,
        retryDelayMs: 60,
        setTimeoutLike: source.setTimeoutLike
      })
    );

    var initThemeSettingsUI = asFunction(settingsModalInitResolvers.initThemeSettingsUI);
    var removeLegacyUndoSettingsUI = asFunction(settingsModalInitResolvers.removeLegacyUndoSettingsUI);
    var initTimerModuleSettingsUI = asFunction(settingsModalInitResolvers.initTimerModuleSettingsUI);
    var initWinPromptSettingsUI = asFunction(settingsModalInitResolvers.initWinPromptSettingsUI);
    if (
      !initThemeSettingsUI ||
      !removeLegacyUndoSettingsUI ||
      !initTimerModuleSettingsUI ||
      !initWinPromptSettingsUI
    ) {
      throw new Error("CoreSettingsModalPageHostRuntime is required");
    }

    var practiceTransferPageHostRuntime = toRecord(source.practiceTransferPageHostRuntime);
    var createPracticeTransferPageActionResolvers = asFunction(
      practiceTransferPageHostRuntime.createPracticeTransferPageActionResolvers
    );
    if (!createPracticeTransferPageActionResolvers) {
      throw new Error("CorePracticeTransferPageHostRuntime is required");
    }

    var practiceTransferPageActionResolvers = toRecord(
      createPracticeTransferPageActionResolvers({
        practiceTransferPageHostRuntime: source.practiceTransferPageHostRuntime,
        practiceTransferHostRuntime: source.practiceTransferHostRuntime,
        practiceTransferRuntime: source.practiceTransferRuntime,
        storageRuntime: source.storageRuntime,
        localStorageKey: source.localStorageKey,
        sessionStorageKey: source.sessionStorageKey,
        documentLike: source.documentLike || null,
        windowLike: source.windowLike || null,
        alertLike: source.alertLike || null
      })
    );

    var openPracticeBoardFromCurrent = asFunction(
      practiceTransferPageActionResolvers.openPracticeBoardFromCurrent
    );
    if (!openPracticeBoardFromCurrent) {
      throw new Error("CorePracticeTransferPageHostRuntime is required");
    }

    var replayPageHostRuntime = toRecord(source.replayPageHostRuntime);
    var createReplayPageActionResolvers = asFunction(
      replayPageHostRuntime.createReplayPageActionResolvers
    );
    if (!createReplayPageActionResolvers) {
      throw new Error("CoreReplayPageHostRuntime is required");
    }

    var replayPageActionResolvers = toRecord(
      createReplayPageActionResolvers({
        replayPageHostRuntime: source.replayPageHostRuntime,
        replayModalRuntime: source.replayModalRuntime,
        replayExportRuntime: source.replayExportRuntime,
        documentLike: source.documentLike || null,
        windowLike: source.windowLike || null,
        navigatorLike: source.navigatorLike || null,
        alertLike: source.alertLike || null,
        consoleLike: source.consoleLike || null
      })
    );

    var showReplayModal = asFunction(replayPageActionResolvers.showReplayModal);
    var closeReplayModal = asFunction(replayPageActionResolvers.closeReplayModal);
    var exportReplay = asFunction(replayPageActionResolvers.exportReplay);
    if (!showReplayModal || !closeReplayModal || !exportReplay) {
      throw new Error("CoreReplayPageHostRuntime is required");
    }

    var settingsModalActionResolvers = toRecord(
      createSettingsModalActionResolvers({
        settingsModalPageHostRuntime: source.settingsModalPageHostRuntime,
        settingsModalHostRuntime: source.settingsModalHostRuntime,
        replayModalRuntime: source.replayModalRuntime,
        documentLike: source.documentLike || null,
        windowLike: source.windowLike || null,
        removeLegacyUndoSettingsUI: removeLegacyUndoSettingsUI,
        initThemeSettingsUI: initThemeSettingsUI,
        initTimerModuleSettingsUI: initTimerModuleSettingsUI,
        initWinPromptSettingsUI: initWinPromptSettingsUI
      })
    );

    var openSettingsModal = asFunction(settingsModalActionResolvers.openSettingsModal);
    var closeSettingsModal = asFunction(settingsModalActionResolvers.closeSettingsModal);
    if (!openSettingsModal || !closeSettingsModal) {
      throw new Error("CoreSettingsModalPageHostRuntime is required");
    }

    return {
      initThemeSettingsUI: initThemeSettingsUI,
      removeLegacyUndoSettingsUI: removeLegacyUndoSettingsUI,
      initTimerModuleSettingsUI: initTimerModuleSettingsUI,
      openPracticeBoardFromCurrent: openPracticeBoardFromCurrent,
      showReplayModal: showReplayModal,
      closeReplayModal: closeReplayModal,
      exportReplay: exportReplay,
      openSettingsModal: openSettingsModal,
      closeSettingsModal: closeSettingsModal
    };
  }

  global.CoreIndexUiPageActionsHostRuntime = global.CoreIndexUiPageActionsHostRuntime || {};
  global.CoreIndexUiPageActionsHostRuntime.createIndexUiPageActionResolvers =
    createIndexUiPageActionResolvers;
})(typeof window !== "undefined" ? window : undefined);
