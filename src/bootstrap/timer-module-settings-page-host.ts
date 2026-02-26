function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function toRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function asFunction<T extends (...args: never[]) => unknown>(value: unknown): T | null {
  return typeof value === "function" ? (value as T) : null;
}

function getElementById(documentLike: unknown, id: string): unknown {
  const getter = asFunction<(value: string) => unknown>(toRecord(documentLike).getElementById);
  if (!getter) return null;
  return (getter as unknown as Function).call(documentLike, id);
}

function resolveRetryDelay(value: unknown, fallback: number): number {
  return Number.isFinite(value) && Number(value) > 0 ? Number(value) : fallback;
}

export interface TimerModuleSettingsPageInitResult {
  hasEnsureToggleApi: boolean;
  hasApplyUiApi: boolean;
  hasToggle: boolean;
  hasNoteElement: boolean;
  didScheduleRetry: boolean;
  didBindToggle: boolean;
  didSync: boolean;
}

export function applyTimerModuleSettingsPageInit(input: {
  timerModuleSettingsHostRuntime?: unknown;
  timerModuleRuntime?: unknown;
  documentLike?: unknown;
  windowLike?: unknown;
  retryDelayMs?: unknown;
  setTimeoutLike?: unknown;
  reinvokeInit?: unknown;
  syncMobileTimerboxUi?: unknown;
}): TimerModuleSettingsPageInitResult {
  const source = toRecord(input);
  const hostRuntime = toRecord(source.timerModuleSettingsHostRuntime);
  const ensureToggle = asFunction<(payload: unknown) => unknown>(
    hostRuntime.ensureTimerModuleSettingsToggle
  );
  const applyUi = asFunction<(payload: unknown) => unknown>(hostRuntime.applyTimerModuleSettingsUi);
  if (!ensureToggle || !applyUi) {
    return {
      hasEnsureToggleApi: !!ensureToggle,
      hasApplyUiApi: !!applyUi,
      hasToggle: false,
      hasNoteElement: false,
      didScheduleRetry: false,
      didBindToggle: false,
      didSync: false
    };
  }

  const toggle =
    ensureToggle({
      documentLike: source.documentLike,
      timerModuleRuntime: source.timerModuleRuntime
    }) || null;
  const noteElement = getElementById(source.documentLike, "timer-module-view-note");

  const setTimeoutLike = asFunction<(callback: () => void, delay: number) => unknown>(
    source.setTimeoutLike
  );
  const reinvokeInit = asFunction<() => unknown>(source.reinvokeInit);
  const fallbackRetryDelay = resolveRetryDelay(source.retryDelayMs, 60);

  const hostResult = toRecord(
    applyUi({
      toggle,
      noteElement,
      windowLike: source.windowLike,
      timerModuleRuntime: source.timerModuleRuntime,
      retryDelayMs: fallbackRetryDelay,
      scheduleRetry: function (delayMs: number): void {
        if (!setTimeoutLike || !reinvokeInit) return;
        setTimeoutLike(reinvokeInit, resolveRetryDelay(delayMs, fallbackRetryDelay));
      },
      syncMobileTimerboxUi: source.syncMobileTimerboxUi || null
    })
  );

  return {
    hasEnsureToggleApi: true,
    hasApplyUiApi: true,
    hasToggle: !!toggle,
    hasNoteElement: !!noteElement,
    didScheduleRetry: !!hostResult.didScheduleRetry,
    didBindToggle: !!hostResult.didBindToggle,
    didSync: !!hostResult.didSync
  };
}
