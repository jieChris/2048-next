function asFunction<T extends (...args: never[]) => unknown>(value: unknown): T | null {
  return typeof value === "function" ? (value as T) : null;
}

function toDelayMs(value: unknown, fallback: number): number {
  return Number.isFinite(value) && Number(value) > 0 ? Number(value) : fallback;
}

export interface ResolveResponsiveRelayoutRequestResult {
  shouldSchedule: boolean;
  shouldClearExistingTimer: boolean;
  delayMs: number;
}

export function resolveResponsiveRelayoutRequest(input: {
  isTimerboxMobileScope?: unknown;
  hasExistingTimer?: unknown;
  delayMs?: unknown;
}): ResolveResponsiveRelayoutRequestResult {
  const source = input || {};
  const scope = !!source.isTimerboxMobileScope;
  if (!scope) {
    return {
      shouldSchedule: false,
      shouldClearExistingTimer: false,
      delayMs: toDelayMs(source.delayMs, 120)
    };
  }

  return {
    shouldSchedule: true,
    shouldClearExistingTimer: !!source.hasExistingTimer,
    delayMs: toDelayMs(source.delayMs, 120)
  };
}

export interface ApplyResponsiveRelayoutResult {
  ran: boolean;
  syncCallCount: number;
  managerActuated: boolean;
}

export function applyResponsiveRelayout(input: {
  syncMobileHintUI?: unknown;
  syncMobileTopActionsPlacement?: unknown;
  syncPracticeTopActionsPlacement?: unknown;
  syncMobileUndoTopButtonAvailability?: unknown;
  syncMobileTimerboxUI?: unknown;
  manager?: unknown;
}): ApplyResponsiveRelayoutResult {
  const source = input || {};
  const syncFns = [
    asFunction<() => unknown>(source.syncMobileHintUI),
    asFunction<() => unknown>(source.syncMobileTopActionsPlacement),
    asFunction<() => unknown>(source.syncPracticeTopActionsPlacement),
    asFunction<() => unknown>(source.syncMobileUndoTopButtonAvailability),
    asFunction<() => unknown>(source.syncMobileTimerboxUI)
  ];
  let syncCallCount = 0;
  for (let i = 0; i < syncFns.length; i++) {
    const fn = syncFns[i];
    if (!fn) continue;
    fn();
    syncCallCount++;
  }

  let managerActuated = false;
  const manager = source.manager && typeof source.manager === "object" ? source.manager : null;
  const actuator = manager && typeof manager === "object" ? (manager as Record<string, unknown>).actuator : null;
  const invalidateLayoutCache = actuator && typeof actuator === "object"
    ? asFunction<() => unknown>((actuator as Record<string, unknown>).invalidateLayoutCache)
    : null;
  const clearTransientTileVisualState = manager
    ? asFunction<() => unknown>((manager as Record<string, unknown>).clearTransientTileVisualState)
    : null;
  const actuate = manager ? asFunction<() => unknown>((manager as Record<string, unknown>).actuate) : null;

  if (invalidateLayoutCache) {
    invalidateLayoutCache.call(actuator);
  }
  if (clearTransientTileVisualState) {
    clearTransientTileVisualState.call(manager);
  }
  if (actuate) {
    actuate.call(manager);
    managerActuated = true;
  }

  return {
    ran: true,
    syncCallCount,
    managerActuated
  };
}
