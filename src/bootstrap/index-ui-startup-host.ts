function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function toRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function asFunction<T extends (...args: never[]) => unknown>(value: unknown): T | null {
  return typeof value === "function" ? (value as T) : null;
}

function invoke(callback: unknown): boolean {
  const fn = asFunction<() => unknown>(callback);
  if (!fn) return false;
  fn();
  return true;
}

function bindWindowListener(windowLike: unknown, eventName: string, handler: unknown): boolean {
  const win = toRecord(windowLike);
  const addEventListener = asFunction<(name: string, cb: (...args: never[]) => unknown) => unknown>(
    win.addEventListener
  );
  const listener = asFunction<(...args: never[]) => unknown>(handler);
  if (!addEventListener || !listener) return false;
  (addEventListener as unknown as Function).call(win, eventName, listener);
  return true;
}

export interface IndexUiStartupHostResult {
  appliedTopActionBindings: boolean;
  appliedGameOverUndoBinding: boolean;
  initCallCount: number;
  boundResponsiveRelayoutListeners: boolean;
}

export function applyIndexUiStartup(input: {
  topActionBindingsHostRuntime?: unknown;
  gameOverUndoHostRuntime?: unknown;
  getElementById?: unknown;
  windowLike?: unknown;
  tryUndo?: unknown;
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
  nowMs?: unknown;
  touchGuardWindowMs?: unknown;
}): IndexUiStartupHostResult {
  const source = toRecord(input);
  const getElementById = asFunction<(id: string) => unknown>(source.getElementById);

  let appliedTopActionBindings = false;
  const topActionBindingsHostRuntime = toRecord(source.topActionBindingsHostRuntime);
  const applyTopActionBindings = asFunction<(payload: unknown) => unknown>(
    topActionBindingsHostRuntime.applyTopActionBindings
  );
  if (applyTopActionBindings && getElementById) {
    applyTopActionBindings({
      getElementById,
      tryUndo: source.tryUndo,
      exportReplay: source.exportReplay,
      openPracticeBoardFromCurrent: source.openPracticeBoardFromCurrent,
      openSettingsModal: source.openSettingsModal,
      closeSettingsModal: source.closeSettingsModal
    });
    appliedTopActionBindings = true;
  }

  let initCallCount = 0;
  if (invoke(source.initThemeSettingsUI)) initCallCount += 1;
  if (invoke(source.removeLegacyUndoSettingsUI)) initCallCount += 1;
  if (invoke(source.initTimerModuleSettingsUI)) initCallCount += 1;
  if (invoke(source.initMobileHintToggle)) initCallCount += 1;
  if (invoke(source.initMobileUndoTopButton)) initCallCount += 1;
  if (invoke(source.initHomeGuideSettingsUI)) initCallCount += 1;
  if (invoke(source.autoStartHomeGuideIfNeeded)) initCallCount += 1;

  let appliedGameOverUndoBinding = false;
  const gameOverUndoHostRuntime = toRecord(source.gameOverUndoHostRuntime);
  const bindGameOverUndoControl = asFunction<(payload: unknown) => unknown>(
    gameOverUndoHostRuntime.bindGameOverUndoControl
  );
  if (bindGameOverUndoControl && getElementById) {
    bindGameOverUndoControl({
      getElementById,
      tryUndo: source.tryUndo,
      nowMs: source.nowMs,
      touchGuardWindowMs: source.touchGuardWindowMs
    });
    appliedGameOverUndoBinding = true;
  }

  if (invoke(source.initMobileTimerboxToggle)) initCallCount += 1;
  if (invoke(source.requestResponsiveGameRelayout)) initCallCount += 1;

  let boundResponsiveRelayoutListeners = false;
  const windowLike = toRecord(source.windowLike);
  const alreadyBound = !!windowLike.__responsiveGameRelayoutBound;
  if (!alreadyBound) {
    const resizeBound = bindWindowListener(windowLike, "resize", source.requestResponsiveGameRelayout);
    const orientationBound = bindWindowListener(
      windowLike,
      "orientationchange",
      source.requestResponsiveGameRelayout
    );
    if (resizeBound || orientationBound) {
      windowLike.__responsiveGameRelayoutBound = true;
      boundResponsiveRelayoutListeners = true;
    }
  }

  return {
    appliedTopActionBindings,
    appliedGameOverUndoBinding,
    initCallCount,
    boundResponsiveRelayoutListeners
  };
}
