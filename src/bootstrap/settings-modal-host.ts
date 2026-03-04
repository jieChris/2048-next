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

export interface SettingsModalOpenHostResult {
  didOpen: boolean;
  initCallCount: number;
}

export function applySettingsModalOpenOrchestration(input: {
  replayModalRuntime?: unknown;
  documentLike?: unknown;
  removeLegacyUndoSettingsUI?: unknown;
  initThemeSettingsUI?: unknown;
  initTimerModuleSettingsUI?: unknown;
  initWinPromptSettingsUI?: unknown;
  initHomeGuideSettingsUI?: unknown;
}): SettingsModalOpenHostResult {
  const source = toRecord(input);
  const replayModalRuntime = toRecord(source.replayModalRuntime);
  const applySettingsModalOpen = asFunction<(payload: unknown) => unknown>(
    replayModalRuntime.applySettingsModalOpen
  );

  let didOpen = false;
  if (applySettingsModalOpen) {
    applySettingsModalOpen({
      documentLike: source.documentLike
    });
    didOpen = true;
  }

  let initCallCount = 0;
  if (invoke(source.removeLegacyUndoSettingsUI)) initCallCount += 1;
  if (invoke(source.initThemeSettingsUI)) initCallCount += 1;
  if (invoke(source.initTimerModuleSettingsUI)) initCallCount += 1;
  if (invoke(source.initWinPromptSettingsUI)) initCallCount += 1;
  if (invoke(source.initHomeGuideSettingsUI)) initCallCount += 1;

  return {
    didOpen,
    initCallCount
  };
}

export interface SettingsModalCloseHostResult {
  didClose: boolean;
}

export function applySettingsModalCloseOrchestration(input: {
  replayModalRuntime?: unknown;
  documentLike?: unknown;
}): SettingsModalCloseHostResult {
  const source = toRecord(input);
  const replayModalRuntime = toRecord(source.replayModalRuntime);
  const applySettingsModalClose = asFunction<(payload: unknown) => unknown>(
    replayModalRuntime.applySettingsModalClose
  );

  if (!applySettingsModalClose) {
    return {
      didClose: false
    };
  }

  applySettingsModalClose({
    documentLike: source.documentLike
  });

  return {
    didClose: true
  };
}
