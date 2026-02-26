function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function toRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function asFunction<T extends (...args: never[]) => unknown>(value: unknown): T | null {
  return typeof value === "function" ? (value as T) : null;
}

function resolveScopeValue(value: unknown): boolean {
  if (typeof value === "function") {
    const fn = value as () => unknown;
    return !!fn();
  }
  return !!value;
}

function resolveDelayMs(value: unknown, fallback: number): number {
  return Number.isFinite(value) && Number(value) > 0 ? Number(value) : fallback;
}

export interface ResponsiveRelayoutRequestHostResult {
  didRequest: boolean;
  shouldSchedule: boolean;
  shouldClearExistingTimer: boolean;
  didClearExistingTimer: boolean;
  didSchedule: boolean;
  timerRef: unknown;
  delayMs: number;
}

export function applyResponsiveRelayoutRequest(input: {
  responsiveRelayoutRuntime?: unknown;
  isTimerboxMobileScope?: unknown;
  existingTimer?: unknown;
  delayMs?: unknown;
  clearTimeoutLike?: unknown;
  setTimeoutLike?: unknown;
  syncMobileHintUI?: unknown;
  syncMobileTopActionsPlacement?: unknown;
  syncPracticeTopActionsPlacement?: unknown;
  syncMobileUndoTopButtonAvailability?: unknown;
  syncMobileTimerboxUI?: unknown;
  manager?: unknown;
}): ResponsiveRelayoutRequestHostResult {
  const source = toRecord(input);
  const runtime = toRecord(source.responsiveRelayoutRuntime);
  const resolveRequest = asFunction<(opts: unknown) => unknown>(
    runtime.resolveResponsiveRelayoutRequest
  );
  const applyRelayout = asFunction<(opts: unknown) => unknown>(
    runtime.applyResponsiveRelayout
  );
  const existingTimer = source.existingTimer;
  const fallbackDelay = resolveDelayMs(source.delayMs, 120);
  if (!resolveRequest || !applyRelayout) {
    return {
      didRequest: false,
      shouldSchedule: false,
      shouldClearExistingTimer: false,
      didClearExistingTimer: false,
      didSchedule: false,
      timerRef: existingTimer || null,
      delayMs: fallbackDelay
    };
  }

  const requestState = toRecord(
    resolveRequest({
      isTimerboxMobileScope: resolveScopeValue(source.isTimerboxMobileScope),
      hasExistingTimer: !!existingTimer,
      delayMs: fallbackDelay
    })
  );
  const shouldSchedule = !!requestState.shouldSchedule;
  const shouldClearExistingTimer = !!requestState.shouldClearExistingTimer;
  const delayMs = resolveDelayMs(requestState.delayMs, fallbackDelay);

  let didClearExistingTimer = false;
  if (shouldClearExistingTimer && existingTimer) {
    const clearTimeoutLike = asFunction<(timer: unknown) => unknown>(source.clearTimeoutLike);
    if (clearTimeoutLike) {
      clearTimeoutLike(existingTimer);
      didClearExistingTimer = true;
    }
  }

  let timerRef: unknown = existingTimer || null;
  let didSchedule = false;
  if (shouldSchedule) {
    const setTimeoutLike = asFunction<(callback: () => void, delay: number) => unknown>(
      source.setTimeoutLike
    );
    if (setTimeoutLike) {
      timerRef = setTimeoutLike(function () {
        applyRelayout({
          syncMobileHintUI: source.syncMobileHintUI,
          syncMobileTopActionsPlacement: source.syncMobileTopActionsPlacement,
          syncPracticeTopActionsPlacement: source.syncPracticeTopActionsPlacement,
          syncMobileUndoTopButtonAvailability: source.syncMobileUndoTopButtonAvailability,
          syncMobileTimerboxUI: source.syncMobileTimerboxUI,
          manager: source.manager || null
        });
      }, delayMs);
      didSchedule = true;
    }
  }

  return {
    didRequest: true,
    shouldSchedule,
    shouldClearExistingTimer,
    didClearExistingTimer,
    didSchedule,
    timerRef,
    delayMs
  };
}
