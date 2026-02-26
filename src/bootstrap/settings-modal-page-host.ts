function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function toRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function asFunction<T extends (...args: never[]) => unknown>(value: unknown): T | null {
  return typeof value === "function" ? (value as T) : null;
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
