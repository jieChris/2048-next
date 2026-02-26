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

export interface MobileHintToggleInitResult {
  isScope: boolean;
  hasButton: boolean;
  didBindButton: boolean;
  didRunSync: boolean;
}

export function applyMobileHintToggleInit(input: {
  isGamePageScope?: unknown;
  ensureMobileHintToggleButton?: unknown;
  openMobileHintModal?: unknown;
  syncMobileHintUI?: unknown;
}): MobileHintToggleInitResult {
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

  const ensureButton = asFunction<() => unknown>(source.ensureMobileHintToggleButton);
  const button = ensureButton ? ensureButton() : null;
  if (!button) {
    return {
      isScope: true,
      hasButton: false,
      didBindButton: false,
      didRunSync: false
    };
  }

  const openMobileHintModal = asFunction<() => unknown>(source.openMobileHintModal);

  const buttonRecord = toRecord(button);
  let didBindButton = false;
  if (!buttonRecord.__mobileHintBound) {
    buttonRecord.__mobileHintBound = true;
    didBindButton = bindListener(button, "click", function (eventLike) {
      preventDefault(eventLike);
      if (openMobileHintModal) {
        openMobileHintModal();
      }
    });
  }

  const didRunSync = invoke(source.syncMobileHintUI);

  return {
    isScope: true,
    hasButton: true,
    didBindButton,
    didRunSync
  };
}
