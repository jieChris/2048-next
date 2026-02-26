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
  handler: (...args: never[]) => unknown
): boolean {
  const addEventListener = asFunction<(name: string, cb: (...args: never[]) => unknown) => unknown>(
    toRecord(element).addEventListener
  );
  if (!addEventListener) return false;
  (addEventListener as unknown as Function).call(element, eventName, handler);
  return true;
}

function preventDefault(event: unknown): void {
  const eventLike = toRecord(event);
  const preventDefaultFn = asFunction<() => unknown>(eventLike.preventDefault);
  if (preventDefaultFn) {
    preventDefaultFn.call(eventLike);
  }
}

function bindClickWithPreventDefault(
  getElementById: (id: string) => unknown,
  elementId: string,
  action: (() => unknown) | null
): boolean {
  if (!action) return false;
  const element = getElementById(elementId);
  return bindListener(element, "click", function (event: unknown) {
    preventDefault(event);
    action();
  });
}

export interface TopActionBindingsHostResult {
  didBind: boolean;
  boundControlCount: number;
}

export function applyTopActionBindings(input: {
  getElementById?: unknown;
  tryUndo?: unknown;
  exportReplay?: unknown;
  openPracticeBoardFromCurrent?: unknown;
  openSettingsModal?: unknown;
  closeSettingsModal?: unknown;
}): TopActionBindingsHostResult {
  const source = toRecord(input);
  const getElementById = asFunction<(id: string) => unknown>(source.getElementById);
  if (!getElementById) {
    return {
      didBind: false,
      boundControlCount: 0
    };
  }

  const tryUndo = asFunction<() => unknown>(source.tryUndo);
  const exportReplay = asFunction<() => unknown>(source.exportReplay);
  const openPracticeBoardFromCurrent = asFunction<() => unknown>(source.openPracticeBoardFromCurrent);
  const openSettingsModal = asFunction<() => unknown>(source.openSettingsModal);
  const closeSettingsModal = asFunction<() => unknown>(source.closeSettingsModal);

  let boundControlCount = 0;
  if (bindClickWithPreventDefault(getElementById, "undo-link", tryUndo)) {
    boundControlCount += 1;
  }
  if (bindClickWithPreventDefault(getElementById, "top-export-replay-btn", exportReplay)) {
    boundControlCount += 1;
  }
  if (bindClickWithPreventDefault(getElementById, "top-practice-btn", openPracticeBoardFromCurrent)) {
    boundControlCount += 1;
  }
  if (bindClickWithPreventDefault(getElementById, "practice-mobile-undo-btn", tryUndo)) {
    boundControlCount += 1;
  }
  if (bindClickWithPreventDefault(getElementById, "top-settings-btn", openSettingsModal)) {
    boundControlCount += 1;
  }
  if (bindClickWithPreventDefault(getElementById, "settings-close-btn", closeSettingsModal)) {
    boundControlCount += 1;
  }

  const settingsModal = getElementById("settings-modal");
  if (
    closeSettingsModal &&
    bindListener(settingsModal, "click", function (event: unknown) {
      if (toRecord(event).target === settingsModal) {
        closeSettingsModal();
      }
    })
  ) {
    boundControlCount += 1;
  }

  return {
    didBind: boundControlCount > 0,
    boundControlCount
  };
}
