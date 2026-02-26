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

function getElementById(getter: unknown, id: string): unknown {
  const fn = asFunction<(value: string) => unknown>(getter);
  if (!fn) return null;
  return fn(id);
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

function hasClass(element: unknown, className: string): boolean {
  const classList = toRecord(toRecord(element).classList);
  const contains = asFunction<(value: string) => unknown>(classList.contains);
  return contains ? !!contains.call(classList, className) : false;
}

export interface MobileTimerboxToggleInitResult {
  isScope: boolean;
  hasToggle: boolean;
  hasTimerbox: boolean;
  didBindToggle: boolean;
  didRunSync: boolean;
}

export function applyMobileTimerboxToggleInit(input: {
  isTimerboxMobileScope?: unknown;
  getElementById?: unknown;
  syncMobileTimerboxUI?: unknown;
  requestResponsiveGameRelayout?: unknown;
  syncMobileTopActionsPlacement?: unknown;
  syncPracticeTopActionsPlacement?: unknown;
  syncMobileUndoTopButtonAvailability?: unknown;
}): MobileTimerboxToggleInitResult {
  const source = toRecord(input);
  const isScopeFn = asFunction<() => unknown>(source.isTimerboxMobileScope);
  const isScope = !!(isScopeFn && isScopeFn());
  if (!isScope) {
    return {
      isScope: false,
      hasToggle: false,
      hasTimerbox: false,
      didBindToggle: false,
      didRunSync: false
    };
  }

  const getById = source.getElementById;
  const toggleBtn = getElementById(getById, "timerbox-toggle-btn");
  const timerBox = getElementById(getById, "timerbox");
  if (!toggleBtn || !timerBox) {
    return {
      isScope: true,
      hasToggle: !!toggleBtn,
      hasTimerbox: !!timerBox,
      didBindToggle: false,
      didRunSync: false
    };
  }

  const syncMobileTimerboxUi = asFunction<(payload?: unknown) => unknown>(source.syncMobileTimerboxUI);
  const requestResponsiveGameRelayout = asFunction<() => unknown>(source.requestResponsiveGameRelayout);

  const toggleRecord = toRecord(toggleBtn);
  let didBindToggle = false;
  if (!toggleRecord.__mobileTimerboxBound) {
    toggleRecord.__mobileTimerboxBound = true;
    didBindToggle = bindListener(toggleBtn, "click", function (eventLike) {
      preventDefault(eventLike);
      if (syncMobileTimerboxUi) {
        syncMobileTimerboxUi({
          collapsed: hasClass(timerBox, "is-mobile-expanded"),
          persist: true
        });
      }
      if (requestResponsiveGameRelayout) {
        requestResponsiveGameRelayout();
      }
    });
  }

  invoke(source.syncMobileTopActionsPlacement);
  invoke(source.syncPracticeTopActionsPlacement);
  invoke(source.syncMobileUndoTopButtonAvailability);

  let didRunSync = false;
  if (syncMobileTimerboxUi) {
    syncMobileTimerboxUi();
    didRunSync = true;
  }

  return {
    isScope: true,
    hasToggle: true,
    hasTimerbox: true,
    didBindToggle,
    didRunSync
  };
}
