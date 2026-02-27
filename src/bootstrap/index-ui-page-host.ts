function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function toRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function asFunction<T extends (...args: never[]) => unknown>(value: unknown): T | null {
  return typeof value === "function" ? (value as T) : null;
}

export interface IndexUiPageBootstrapResult {
  appliedGlobalBindings: boolean;
  boundDomContentLoaded: boolean;
  startupInvoked: boolean;
}

export function createIndexUiTryUndoHandler(input: {
  undoActionRuntime?: unknown;
  windowLike?: unknown;
  direction?: unknown;
}): () => boolean {
  const source = toRecord(input);
  const undoActionRuntime = toRecord(source.undoActionRuntime);
  const windowLike = source.windowLike || null;
  const direction = typeof source.direction === "number" ? source.direction : -1;

  return function tryUndoFromUi(): boolean {
    const tryTriggerUndoFromContext = asFunction<(payload: unknown) => unknown>(
      toRecord(undoActionRuntime).tryTriggerUndoFromContext
    );
    if (!tryTriggerUndoFromContext) return false;
    const result = toRecord(
      tryTriggerUndoFromContext({
        windowLike,
        direction
      })
    );
    return !!result.didTrigger;
  };
}

function bindGlobalFunction(
  windowRecord: Record<string, unknown>,
  key: string,
  callback: unknown
): boolean {
  const fn = asFunction<(...args: never[]) => unknown>(callback);
  if (!fn) return false;
  windowRecord[key] = fn;
  return true;
}

export function applyIndexUiPageBootstrap(input: {
  indexUiStartupHostRuntime?: unknown;
  topActionBindingsHostRuntime?: unknown;
  gameOverUndoHostRuntime?: unknown;
  documentLike?: unknown;
  windowLike?: unknown;
  nowMs?: unknown;
  touchGuardWindowMs?: unknown;
  tryUndoFromUi?: unknown;
  exportReplay?: unknown;
  openPracticeBoardFromCurrent?: unknown;
  openSettingsModal?: unknown;
  closeSettingsModal?: unknown;
  initThemeSettingsUI?: unknown;
  removeLegacyUndoSettingsUI?: unknown;
  initTimerModuleSettingsUI?: unknown;
  initMobileHintToggle?: unknown;
  initMobileUndoTopButton?: unknown;
  initHomeGuideSettingsUI?: unknown;
  autoStartHomeGuideIfNeeded?: unknown;
  initMobileTimerboxToggle?: unknown;
  requestResponsiveGameRelayout?: unknown;
  syncMobileTimerboxUI?: unknown;
  syncMobileHintUI?: unknown;
  syncMobileUndoTopButtonAvailability?: unknown;
  closeReplayModal?: unknown;
  prettyTimeRuntime?: unknown;
}): IndexUiPageBootstrapResult {
  const source = toRecord(input);
  const windowRecord = toRecord(source.windowLike);
  const documentRecord = toRecord(source.documentLike);
  const indexUiStartupHostRuntime = toRecord(source.indexUiStartupHostRuntime);
  const applyIndexUiStartup = asFunction<(payload: unknown) => unknown>(
    indexUiStartupHostRuntime.applyIndexUiStartup
  );
  const getElementByIdRaw = asFunction<(id: string) => unknown>(documentRecord.getElementById);
  const getElementById = getElementByIdRaw
    ? function (id: string): unknown {
        return getElementByIdRaw.call(documentRecord, id);
      }
    : null;
  const addEventListener = asFunction<
    (name: string, listener: (...args: never[]) => unknown) => unknown
  >(documentRecord.addEventListener);
  const formatPrettyTime = asFunction<(value: unknown) => unknown>(
    toRecord(source.prettyTimeRuntime).formatPrettyTime
  );
  const nowMs = asFunction<() => number>(source.nowMs);
  const touchGuardWindowMs =
    typeof source.touchGuardWindowMs === "number" && Number.isFinite(source.touchGuardWindowMs)
      ? source.touchGuardWindowMs
      : 450;

  let appliedGlobalBindings = false;
  if (bindGlobalFunction(windowRecord, "syncMobileTimerboxUI", source.syncMobileTimerboxUI)) {
    appliedGlobalBindings = true;
  }
  if (bindGlobalFunction(windowRecord, "syncMobileHintUI", source.syncMobileHintUI)) {
    appliedGlobalBindings = true;
  }
  if (
    bindGlobalFunction(
      windowRecord,
      "syncMobileUndoTopButtonAvailability",
      source.syncMobileUndoTopButtonAvailability
    )
  ) {
    appliedGlobalBindings = true;
  }
  if (
    bindGlobalFunction(windowRecord, "openPracticeBoardFromCurrent", source.openPracticeBoardFromCurrent)
  ) {
    appliedGlobalBindings = true;
  }
  if (bindGlobalFunction(windowRecord, "closeReplayModal", source.closeReplayModal)) {
    appliedGlobalBindings = true;
  }
  if (bindGlobalFunction(windowRecord, "exportReplay", source.exportReplay)) {
    appliedGlobalBindings = true;
  }
  if (bindGlobalFunction(windowRecord, "openSettingsModal", source.openSettingsModal)) {
    appliedGlobalBindings = true;
  }
  if (bindGlobalFunction(windowRecord, "closeSettingsModal", source.closeSettingsModal)) {
    appliedGlobalBindings = true;
  }
  if (formatPrettyTime) {
    windowRecord.pretty = function (time: unknown): unknown {
      return formatPrettyTime(time);
    };
    appliedGlobalBindings = true;
  }

  let startupInvoked = false;
  const startupHandler = function (): unknown {
    if (!applyIndexUiStartup || !getElementById) return null;
    startupInvoked = true;
    return applyIndexUiStartup({
      topActionBindingsHostRuntime: source.topActionBindingsHostRuntime,
      gameOverUndoHostRuntime: source.gameOverUndoHostRuntime,
      getElementById,
      windowLike: source.windowLike || null,
      tryUndo: source.tryUndoFromUi,
      exportReplay: windowRecord.exportReplay,
      openPracticeBoardFromCurrent: windowRecord.openPracticeBoardFromCurrent,
      openSettingsModal: windowRecord.openSettingsModal,
      closeSettingsModal: windowRecord.closeSettingsModal,
      initThemeSettingsUI: source.initThemeSettingsUI,
      removeLegacyUndoSettingsUI: source.removeLegacyUndoSettingsUI,
      initTimerModuleSettingsUI: source.initTimerModuleSettingsUI,
      initMobileHintToggle: source.initMobileHintToggle,
      initMobileUndoTopButton: source.initMobileUndoTopButton,
      initHomeGuideSettingsUI: source.initHomeGuideSettingsUI,
      autoStartHomeGuideIfNeeded: source.autoStartHomeGuideIfNeeded,
      initMobileTimerboxToggle: source.initMobileTimerboxToggle,
      requestResponsiveGameRelayout: source.requestResponsiveGameRelayout,
      nowMs: nowMs
        ? nowMs
        : function (): number {
            return Date.now();
          },
      touchGuardWindowMs
    });
  };

  let boundDomContentLoaded = false;
  if (!documentRecord.__indexUiPageBootstrapBound && addEventListener) {
    addEventListener.call(documentRecord, "DOMContentLoaded", startupHandler);
    documentRecord.__indexUiPageBootstrapBound = true;
    boundDomContentLoaded = true;
  }

  return {
    appliedGlobalBindings,
    boundDomContentLoaded,
    startupInvoked
  };
}
