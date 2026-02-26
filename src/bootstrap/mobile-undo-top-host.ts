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

function preventDefault(eventLike: unknown): void {
  const prevent = asFunction<() => unknown>(toRecord(eventLike).preventDefault);
  if (!prevent) return;
  prevent.call(eventLike);
}

export interface MobileUndoTopInitResult {
  isScope: boolean;
  hasButton: boolean;
  didBindButton: boolean;
  didRunSync: boolean;
}

export function applyMobileUndoTopInit(input: {
  isGamePageScope?: unknown;
  ensureMobileUndoTopButton?: unknown;
  tryUndoFromUi?: unknown;
  syncMobileUndoTopButtonAvailability?: unknown;
}): MobileUndoTopInitResult {
  const source = toRecord(input);
  const isGamePageScope = asFunction<() => unknown>(source.isGamePageScope);
  const inScope = !!(isGamePageScope && isGamePageScope());
  if (!inScope) {
    return {
      isScope: false,
      hasButton: false,
      didBindButton: false,
      didRunSync: false
    };
  }

  const ensureButton = asFunction<() => unknown>(source.ensureMobileUndoTopButton);
  const button = ensureButton ? ensureButton() : null;
  if (!button) {
    return {
      isScope: true,
      hasButton: false,
      didBindButton: false,
      didRunSync: false
    };
  }

  const tryUndoFromUi = asFunction<() => unknown>(source.tryUndoFromUi);

  const buttonRecord = toRecord(button);
  let didBindButton = false;
  if (!buttonRecord.__mobileUndoBound) {
    buttonRecord.__mobileUndoBound = true;
    didBindButton = bindListener(button, "click", function (eventLike) {
      preventDefault(eventLike);
      if (tryUndoFromUi) {
        tryUndoFromUi();
      }
    });
  }

  const didRunSync = invoke(source.syncMobileUndoTopButtonAvailability);

  return {
    isScope: true,
    hasButton: true,
    didBindButton,
    didRunSync
  };
}
