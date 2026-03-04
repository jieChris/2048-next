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
const WIN_PROMPT_STORAGE_KEY = "settings_win_prompt_enabled_v1";
const LEGACY_WIN_PROMPT_STORAGE_KEYS = ["settings_win_prompt_enabled", "win_prompt_enabled"];

function resolvePositiveNumber(value: unknown, fallback: number): number {
  return Number.isFinite(value) && Number(value) > 0 ? Number(value) : fallback;
}

function getElementById(documentLike: unknown, id: string): unknown {
  const getter = asFunction<(value: string) => unknown>(toRecord(documentLike).getElementById);
  if (!getter) return null;
  return (getter as unknown as Function).call(documentLike, id);
}

function bindListener(
  element: unknown,
  eventName: string,
  handler: (...args: never[]) => unknown
): boolean {
  const addEventListener = asFunction<(name: string, cb: (...args: never[]) => unknown) => unknown>(
    toRecord(element).addEventListener
  );
  if (!addEventListener) return false;
  (addEventListener as unknown as Function).call(element, eventName, handler);
  return true;
}

function readWinPromptEnabled(windowLike: unknown): boolean {
  const storage = toRecord(windowLike).localStorage;
  const getItem = asFunction<(key: string) => string | null>(toRecord(storage).getItem);
  if (!getItem) return true;
  try {
    const normalize = (raw: unknown): boolean => {
      if (raw === null || raw === undefined) return true;
      const text = String(raw).trim().toLowerCase();
      if (!text) return true;
      if (text === "0" || text === "false" || text === "off" || text === "no") return false;
      if (text === "1" || text === "true" || text === "on" || text === "yes") return true;
      return true;
    };

    const currentValue = getItem.call(storage, WIN_PROMPT_STORAGE_KEY);
    if (currentValue !== null && currentValue !== undefined && String(currentValue).trim() !== "") {
      return normalize(currentValue);
    }

    for (const legacyKey of LEGACY_WIN_PROMPT_STORAGE_KEYS) {
      const legacyValue = getItem.call(storage, legacyKey);
      if (legacyValue !== null && legacyValue !== undefined && String(legacyValue).trim() !== "") {
        return normalize(legacyValue);
      }
    }

    return true;
  } catch (_err) {
    return true;
  }
}

function writeWinPromptEnabled(windowLike: unknown, enabled: boolean): boolean {
  const storage = toRecord(windowLike).localStorage;
  const setItem = asFunction<(key: string, value: string) => unknown>(toRecord(storage).setItem);
  if (!setItem) return false;
  const nextValue = enabled ? "1" : "0";
  let didWrite = false;
  try {
    setItem.call(storage, WIN_PROMPT_STORAGE_KEY, nextValue);
    didWrite = true;
  } catch (_err) {
    didWrite = false;
  }
  for (const legacyKey of LEGACY_WIN_PROMPT_STORAGE_KEYS) {
    try {
      setItem.call(storage, legacyKey, nextValue);
      didWrite = true;
    } catch (_err) {}
  }
  return didWrite;
}

function resolveWinPromptNoteText(enabled: boolean): string {
  return enabled
    ? "合成 2048 时会弹出胜利提示，可选择继续游戏。"
    : "合成 2048 时不弹出胜利提示，将自动继续游戏。";
}

export interface SettingsModalInitResolvers {
  initThemeSettingsUI: () => unknown;
  removeLegacyUndoSettingsUI: () => unknown;
  initTimerModuleSettingsUI: () => unknown;
  initWinPromptSettingsUI: () => unknown;
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

  function initWinPromptSettingsUI(): unknown {
    const toggle = getElementById(source.documentLike, "win-prompt-toggle");
    if (!toggle) {
      return {
        hasToggle: false,
        didBindToggle: false,
        didSync: false
      };
    }

    const note = getElementById(source.documentLike, "win-prompt-note");
    const toggleRecord = toRecord(toggle);
    const sync = function (): void {
      const enabled = readWinPromptEnabled(windowLike);
      toggleRecord.checked = enabled;
      if (note) {
        toRecord(note).textContent = resolveWinPromptNoteText(enabled);
      }
    };

    let didBindToggle = false;
    if (!toggleRecord.__winPromptBound) {
      toggleRecord.__winPromptBound = true;
      didBindToggle = bindListener(toggle, "change", function () {
        const enabled = !!toRecord(toggle).checked;
        writeWinPromptEnabled(windowLike, enabled);
        sync();
      });
    }

    sync();

    return {
      hasToggle: true,
      didBindToggle,
      didSync: true
    };
  }

  return {
    initThemeSettingsUI,
    removeLegacyUndoSettingsUI,
    initTimerModuleSettingsUI,
    initWinPromptSettingsUI
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
  initWinPromptSettingsUI?: unknown;
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
        initWinPromptSettingsUI: source.initWinPromptSettingsUI,
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
      initWinPromptSettingsUI: source.initWinPromptSettingsUI,
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
  initWinPromptSettingsUI?: unknown;
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
    initWinPromptSettingsUI: source.initWinPromptSettingsUI,
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
