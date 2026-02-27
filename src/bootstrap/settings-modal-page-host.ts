function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function toRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function asFunction<T extends (...args: never[]) => unknown>(value: unknown): T | null {
  return typeof value === "function" ? (value as T) : null;
}

type UnknownFn = () => unknown;

function resolvePositiveNumber(value: unknown, fallback: number): number {
  return Number.isFinite(value) && Number(value) > 0 ? Number(value) : fallback;
}

export interface SettingsModalInitResolvers {
  initThemeSettingsUI: () => unknown;
  removeLegacyUndoSettingsUI: () => unknown;
  initTimerModuleSettingsUI: () => unknown;
}

export interface SettingsModalActionResolvers {
  openSettingsModal: () => unknown;
  closeSettingsModal: () => unknown;
}

function resolveSyncMobileTimerboxUi(source: Record<string, unknown>): UnknownFn | null {
  const direct = asFunction<UnknownFn>(source.syncMobileTimerboxUi);
  if (direct) return direct;

  const resolver = asFunction<() => unknown>(source.resolveSyncMobileTimerboxUi);
  if (resolver) {
    const resolved = resolver();
    const callback = asFunction<UnknownFn>(resolved);
    if (callback) return callback;
  }

  const windowLike = source.windowLike || null;
  const syncFromWindow = asFunction<UnknownFn>(toRecord(windowLike).syncMobileTimerboxUI);
  if (!syncFromWindow) return null;
  return function (): unknown {
    return syncFromWindow.call(windowLike);
  };
}

export function createSettingsModalInitResolvers(input: {
  themeSettingsPageHostRuntime?: unknown;
  themeSettingsHostRuntime?: unknown;
  themeSettingsRuntime?: unknown;
  timerModuleSettingsHostRuntime?: unknown;
  timerModuleSettingsPageHostRuntime?: unknown;
  timerModuleRuntime?: unknown;
  documentLike?: unknown;
  windowLike?: unknown;
  retryDelayMs?: unknown;
  setTimeoutLike?: unknown;
  syncMobileTimerboxUi?: unknown;
  resolveSyncMobileTimerboxUi?: unknown;
}): SettingsModalInitResolvers {
  const source = toRecord(input);
  const windowLike = source.windowLike || null;
  const retryDelayMs = resolvePositiveNumber(source.retryDelayMs, 60);
  const setTimeoutLike = asFunction<(callback: () => void, delay: number) => unknown>(
    source.setTimeoutLike
  );
  const themePageHostRuntime = toRecord(source.themeSettingsPageHostRuntime);
  const timerSettingsHostRuntime = toRecord(source.timerModuleSettingsHostRuntime);
  const timerSettingsPageHostRuntime = toRecord(source.timerModuleSettingsPageHostRuntime);
  const applyThemeSettingsPageInit = asFunction<(payload: unknown) => unknown>(
    themePageHostRuntime.applyThemeSettingsPageInit
  );
  const applyLegacyUndoSettingsCleanup = asFunction<(payload: unknown) => unknown>(
    timerSettingsHostRuntime.applyLegacyUndoSettingsCleanup
  );
  const applyTimerModuleSettingsPageInit = asFunction<(payload: unknown) => unknown>(
    timerSettingsPageHostRuntime.applyTimerModuleSettingsPageInit
  );

  function initThemeSettingsUI(): unknown {
    if (!applyThemeSettingsPageInit) return null;
    return applyThemeSettingsPageInit({
      themeSettingsHostRuntime: source.themeSettingsHostRuntime,
      themeSettingsRuntime: source.themeSettingsRuntime,
      documentLike: source.documentLike,
      windowLike
    });
  }

  function removeLegacyUndoSettingsUI(): unknown {
    if (!applyLegacyUndoSettingsCleanup) return null;
    return applyLegacyUndoSettingsCleanup({
      documentLike: source.documentLike
    });
  }

  function initTimerModuleSettingsUI(): unknown {
    if (!applyTimerModuleSettingsPageInit) return null;
    return applyTimerModuleSettingsPageInit({
      timerModuleSettingsHostRuntime: source.timerModuleSettingsHostRuntime,
      timerModuleRuntime: source.timerModuleRuntime,
      documentLike: source.documentLike,
      windowLike,
      retryDelayMs,
      setTimeoutLike,
      reinvokeInit: initTimerModuleSettingsUI,
      syncMobileTimerboxUi: resolveSyncMobileTimerboxUi(source)
    });
  }

  return {
    initThemeSettingsUI,
    removeLegacyUndoSettingsUI,
    initTimerModuleSettingsUI
  };
}

export function createSettingsModalActionResolvers(input: {
  settingsModalPageHostRuntime?: unknown;
  settingsModalHostRuntime?: unknown;
  replayModalRuntime?: unknown;
  documentLike?: unknown;
  removeLegacyUndoSettingsUI?: unknown;
  initThemeSettingsUI?: unknown;
  initTimerModuleSettingsUI?: unknown;
  initHomeGuideSettingsUI?: unknown;
}): SettingsModalActionResolvers {
  const source = toRecord(input);
  const pageHostRuntime = toRecord(source.settingsModalPageHostRuntime);

  function openSettingsModal(): unknown {
    const applyOpen = asFunction<(payload: unknown) => unknown>(
      pageHostRuntime.applySettingsModalPageOpen
    );
    if (applyOpen) {
      return applyOpen({
        settingsModalHostRuntime: source.settingsModalHostRuntime,
        replayModalRuntime: source.replayModalRuntime,
        documentLike: source.documentLike,
        removeLegacyUndoSettingsUI: source.removeLegacyUndoSettingsUI,
        initThemeSettingsUI: source.initThemeSettingsUI,
        initTimerModuleSettingsUI: source.initTimerModuleSettingsUI,
        initHomeGuideSettingsUI: source.initHomeGuideSettingsUI
      });
    }
    return applySettingsModalPageOpen({
      settingsModalHostRuntime: source.settingsModalHostRuntime,
      replayModalRuntime: source.replayModalRuntime,
      documentLike: source.documentLike,
      removeLegacyUndoSettingsUI: source.removeLegacyUndoSettingsUI,
      initThemeSettingsUI: source.initThemeSettingsUI,
      initTimerModuleSettingsUI: source.initTimerModuleSettingsUI,
      initHomeGuideSettingsUI: source.initHomeGuideSettingsUI
    });
  }

  function closeSettingsModal(): unknown {
    const applyClose = asFunction<(payload: unknown) => unknown>(
      pageHostRuntime.applySettingsModalPageClose
    );
    if (applyClose) {
      return applyClose({
        settingsModalHostRuntime: source.settingsModalHostRuntime,
        replayModalRuntime: source.replayModalRuntime,
        documentLike: source.documentLike
      });
    }
    return applySettingsModalPageClose({
      settingsModalHostRuntime: source.settingsModalHostRuntime,
      replayModalRuntime: source.replayModalRuntime,
      documentLike: source.documentLike
    });
  }

  return {
    openSettingsModal,
    closeSettingsModal
  };
}

export interface SettingsModalPageOpenResult {
  hasApplyOpenApi: boolean;
  didApply: boolean;
}

export function applySettingsModalPageOpen(input: {
  settingsModalHostRuntime?: unknown;
  replayModalRuntime?: unknown;
  documentLike?: unknown;
  removeLegacyUndoSettingsUI?: unknown;
  initThemeSettingsUI?: unknown;
  initTimerModuleSettingsUI?: unknown;
  initHomeGuideSettingsUI?: unknown;
}): SettingsModalPageOpenResult {
  const source = toRecord(input);
  const hostRuntime = toRecord(source.settingsModalHostRuntime);
  const applyOpen = asFunction<(payload: unknown) => unknown>(
    hostRuntime.applySettingsModalOpenOrchestration
  );
  if (!applyOpen) {
    return {
      hasApplyOpenApi: false,
      didApply: false
    };
  }

  applyOpen({
    replayModalRuntime: source.replayModalRuntime,
    documentLike: source.documentLike,
    removeLegacyUndoSettingsUI: source.removeLegacyUndoSettingsUI,
    initThemeSettingsUI: source.initThemeSettingsUI,
    initTimerModuleSettingsUI: source.initTimerModuleSettingsUI,
    initHomeGuideSettingsUI: source.initHomeGuideSettingsUI
  });

  return {
    hasApplyOpenApi: true,
    didApply: true
  };
}

export interface SettingsModalPageCloseResult {
  hasApplyCloseApi: boolean;
  didApply: boolean;
}

export function applySettingsModalPageClose(input: {
  settingsModalHostRuntime?: unknown;
  replayModalRuntime?: unknown;
  documentLike?: unknown;
}): SettingsModalPageCloseResult {
  const source = toRecord(input);
  const hostRuntime = toRecord(source.settingsModalHostRuntime);
  const applyClose = asFunction<(payload: unknown) => unknown>(
    hostRuntime.applySettingsModalCloseOrchestration
  );
  if (!applyClose) {
    return {
      hasApplyCloseApi: false,
      didApply: false
    };
  }

  applyClose({
    replayModalRuntime: source.replayModalRuntime,
    documentLike: source.documentLike
  });

  return {
    hasApplyCloseApi: true,
    didApply: true
  };
}
