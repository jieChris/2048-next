function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function toRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function asFunction<T extends (...args: never[]) => unknown>(value: unknown): T | null {
  return typeof value === "function" ? (value as T) : null;
}

function bindListener(
  element: unknown,
  eventName: string,
  handler: (...args: never[]) => unknown,
  options?: unknown
): boolean {
  const addEventListener = asFunction<
    (name: string, cb: (...args: never[]) => unknown, opts?: unknown) => unknown
  >(toRecord(element).addEventListener);
  if (!addEventListener) return false;
  (addEventListener as unknown as Function).call(element, eventName, handler, options);
  return true;
}

function preventDefault(event: unknown): void {
  const eventLike = toRecord(event);
  const preventDefaultFn = asFunction<() => unknown>(eventLike.preventDefault);
  if (preventDefaultFn) {
    preventDefaultFn.call(eventLike);
  }
}

function resolveNowMs(input: Record<string, unknown>): () => number {
  const customNow = asFunction<() => unknown>(input.nowMs);
  if (customNow) {
    return function () {
      const value = Number(customNow());
      return Number.isFinite(value) ? value : 0;
    };
  }
  return function () {
    return Date.now();
  };
}

function resolveTouchGuardWindowMs(input: Record<string, unknown>): number {
  const raw = Number(input.touchGuardWindowMs);
  if (Number.isFinite(raw) && raw >= 0) {
    return raw;
  }
  return 450;
}

export interface GameOverUndoHostResult {
  didBind: boolean;
  boundControlCount: number;
}

export function bindGameOverUndoControl(input: {
  getElementById?: unknown;
  tryUndo?: unknown;
  nowMs?: unknown;
  touchGuardWindowMs?: unknown;
}): GameOverUndoHostResult {
  const source = toRecord(input);
  const getElementById = asFunction<(id: string) => unknown>(source.getElementById);
  const tryUndoFn = asFunction<() => unknown>(source.tryUndo);
  if (!getElementById || !tryUndoFn) {
    return {
      didBind: false,
      boundControlCount: 0
    };
  }

  const control = getElementById("undo-btn-gameover");
  if (!control) {
    return {
      didBind: false,
      boundControlCount: 0
    };
  }

  const nowMs = resolveNowMs(source);
  const touchGuardWindowMs = resolveTouchGuardWindowMs(source);
  let lastUndoTouchAt = 0;

  function handleGameOverUndo(event: unknown, fromTouch: boolean): void {
    preventDefault(event);
    const now = nowMs();
    if (!fromTouch && now - lastUndoTouchAt < touchGuardWindowMs) return;
    if (fromTouch) {
      lastUndoTouchAt = now;
    }
    if (tryUndoFn) {
      tryUndoFn();
    }
  }

  let boundControlCount = 0;
  if (
    bindListener(control, "click", function (event: unknown) {
      handleGameOverUndo(event, false);
    })
  ) {
    boundControlCount += 1;
  }
  if (
    bindListener(
      control,
      "touchend",
      function (event: unknown) {
        handleGameOverUndo(event, true);
      },
      { passive: false }
    )
  ) {
    boundControlCount += 1;
  }

  return {
    didBind: boundControlCount > 0,
    boundControlCount
  };
}
