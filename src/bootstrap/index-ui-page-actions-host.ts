function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function toRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function asFunction<T extends (...args: never[]) => unknown>(value: unknown): T | null {
  return typeof value === "function" ? (value as T) : null;
}

export interface IndexUiPageActionResolvers {
  initThemeSettingsUI: () => unknown;
  removeLegacyUndoSettingsUI: () => unknown;
  initTimerModuleSettingsUI: () => unknown;
  openPracticeBoardFromCurrent: () => unknown;
  showReplayModal: () => unknown;
  closeReplayModal: () => unknown;
  exportReplay: () => unknown;
  openSettingsModal: () => unknown;
  closeSettingsModal: () => unknown;
}

export function createIndexUiPageActionResolvers(input: {
  settingsModalPageHostRuntime?: unknown;
  settingsModalHostRuntime?: unknown;
  replayModalRuntime?: unknown;
  themeSettingsPageHostRuntime?: unknown;
  themeSettingsHostRuntime?: unknown;
  themeSettingsRuntime?: unknown;
  timerModuleSettingsHostRuntime?: unknown;
  timerModuleSettingsPageHostRuntime?: unknown;
  timerModuleRuntime?: unknown;
  practiceTransferPageHostRuntime?: unknown;
  practiceTransferHostRuntime?: unknown;
  practiceTransferRuntime?: unknown;
  storageRuntime?: unknown;
  mobileViewportRuntime?: unknown;
  replayPageHostRuntime?: unknown;
  replayExportRuntime?: unknown;
  isCompactGameViewport?: unknown;
  documentLike?: unknown;
  windowLike?: unknown;
  locationLike?: unknown;
  navigatorLike?: unknown;
  alertLike?: unknown;
  consoleLike?: unknown;
  setTimeoutLike?: unknown;
  clearTimeoutLike?: unknown;
  localStorageKey?: unknown;
  sessionStorageKey?: unknown;
}): IndexUiPageActionResolvers {
  const source = toRecord(input);

  const settingsModalPageHostRuntime = toRecord(source.settingsModalPageHostRuntime);
  const createSettingsModalInitResolvers = asFunction<(payload: unknown) => unknown>(
    settingsModalPageHostRuntime.createSettingsModalInitResolvers
  );
  const createSettingsModalActionResolvers = asFunction<(payload: unknown) => unknown>(
    settingsModalPageHostRuntime.createSettingsModalActionResolvers
  );
  if (!createSettingsModalInitResolvers || !createSettingsModalActionResolvers) {
    throw new Error("CoreSettingsModalPageHostRuntime is required");
  }

  const settingsModalInitResolvers = toRecord(
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

  const initThemeSettingsUI = asFunction<() => unknown>(settingsModalInitResolvers.initThemeSettingsUI);
  const removeLegacyUndoSettingsUI = asFunction<() => unknown>(
    settingsModalInitResolvers.removeLegacyUndoSettingsUI
  );
  const initTimerModuleSettingsUI = asFunction<() => unknown>(
    settingsModalInitResolvers.initTimerModuleSettingsUI
  );
  const initWinPromptSettingsUI = asFunction<() => unknown>(
    settingsModalInitResolvers.initWinPromptSettingsUI
  );
  if (
    !initThemeSettingsUI ||
    !removeLegacyUndoSettingsUI ||
    !initTimerModuleSettingsUI ||
    !initWinPromptSettingsUI
  ) {
    throw new Error("CoreSettingsModalPageHostRuntime is required");
  }

  const practiceTransferPageHostRuntime = toRecord(source.practiceTransferPageHostRuntime);
  const createPracticeTransferPageActionResolvers = asFunction<(payload: unknown) => unknown>(
    practiceTransferPageHostRuntime.createPracticeTransferPageActionResolvers
  );
  if (!createPracticeTransferPageActionResolvers) {
    throw new Error("CorePracticeTransferPageHostRuntime is required");
  }

  const practiceTransferPageActionResolvers = toRecord(
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

  const openPracticeBoardFromCurrent = asFunction<() => unknown>(
    practiceTransferPageActionResolvers.openPracticeBoardFromCurrent
  );
  if (!openPracticeBoardFromCurrent) {
    throw new Error("CorePracticeTransferPageHostRuntime is required");
  }

  const replayPageHostRuntime = toRecord(source.replayPageHostRuntime);
  const createReplayPageActionResolvers = asFunction<(payload: unknown) => unknown>(
    replayPageHostRuntime.createReplayPageActionResolvers
  );
  if (!createReplayPageActionResolvers) {
    throw new Error("CoreReplayPageHostRuntime is required");
  }

  const replayPageActionResolvers = toRecord(
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

  const showReplayModal = asFunction<() => unknown>(replayPageActionResolvers.showReplayModal);
  const closeReplayModal = asFunction<() => unknown>(replayPageActionResolvers.closeReplayModal);
  const exportReplay = asFunction<() => unknown>(replayPageActionResolvers.exportReplay);
  if (!showReplayModal || !closeReplayModal || !exportReplay) {
    throw new Error("CoreReplayPageHostRuntime is required");
  }

  const settingsModalActionResolvers = toRecord(
    createSettingsModalActionResolvers({
      settingsModalPageHostRuntime: source.settingsModalPageHostRuntime,
      settingsModalHostRuntime: source.settingsModalHostRuntime,
      replayModalRuntime: source.replayModalRuntime,
      documentLike: source.documentLike || null,
      windowLike: source.windowLike || null,
      removeLegacyUndoSettingsUI,
      initThemeSettingsUI,
      initTimerModuleSettingsUI,
      initWinPromptSettingsUI
    })
  );

  const openSettingsModal = asFunction<() => unknown>(settingsModalActionResolvers.openSettingsModal);
  const closeSettingsModal = asFunction<() => unknown>(
    settingsModalActionResolvers.closeSettingsModal
  );
  if (!openSettingsModal || !closeSettingsModal) {
    throw new Error("CoreSettingsModalPageHostRuntime is required");
  }

  return {
    initThemeSettingsUI,
    removeLegacyUndoSettingsUI,
    initTimerModuleSettingsUI,
    openPracticeBoardFromCurrent,
    showReplayModal,
    closeReplayModal,
    exportReplay,
    openSettingsModal,
    closeSettingsModal
  };
}
