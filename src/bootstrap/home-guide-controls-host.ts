function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function toRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function asFunction<T extends (...args: never[]) => unknown>(value: unknown): T | null {
  return typeof value === "function" ? (value as T) : null;
}

function resolveBoolean(value: unknown): boolean {
  return !!value;
}

function resolveNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  if (Number.isFinite(parsed)) return parsed;
  return fallback;
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

function bindStepControl(input: {
  element?: unknown;
  action?: string;
  homeGuideRuntime?: unknown;
  homeGuideState?: unknown;
  showHomeGuideStep?: unknown;
}): boolean {
  const source = toRecord(input);
  const element = source.element;
  if (!element) return false;

  const homeGuideRuntime = toRecord(source.homeGuideRuntime);
  const resolveHomeGuideBindingState = asFunction<(payload: unknown) => unknown>(
    homeGuideRuntime.resolveHomeGuideBindingState
  );
  const resolveHomeGuideControlAction = asFunction<(payload: unknown) => unknown>(
    homeGuideRuntime.resolveHomeGuideControlAction
  );
  const showHomeGuideStep = asFunction<(stepIndex: number) => unknown>(source.showHomeGuideStep);
  if (!resolveHomeGuideBindingState || !resolveHomeGuideControlAction || !showHomeGuideStep) {
    return false;
  }

  const elementRecord = toRecord(element);
  const bindingState = toRecord(
    resolveHomeGuideBindingState({
      alreadyBound: resolveBoolean(elementRecord.__homeGuideBound)
    })
  );
  if (!bindingState.shouldBind) {
    return false;
  }

  elementRecord.__homeGuideBound = bindingState.boundValue;
  return bindListener(element, "click", function () {
    const actionState = toRecord(
      resolveHomeGuideControlAction({
        action: source.action,
        stepIndex: resolveNumber(toRecord(source.homeGuideState).index, 0)
      })
    );
    showHomeGuideStep(resolveNumber(actionState.nextStepIndex, 0));
  });
}

function bindSkipControl(input: {
  element?: unknown;
  homeGuideRuntime?: unknown;
  homeGuideState?: unknown;
  finishHomeGuide?: unknown;
}): boolean {
  const source = toRecord(input);
  const element = source.element;
  if (!element) return false;

  const homeGuideRuntime = toRecord(source.homeGuideRuntime);
  const resolveHomeGuideBindingState = asFunction<(payload: unknown) => unknown>(
    homeGuideRuntime.resolveHomeGuideBindingState
  );
  const resolveHomeGuideControlAction = asFunction<(payload: unknown) => unknown>(
    homeGuideRuntime.resolveHomeGuideControlAction
  );
  const resolveHomeGuideFinishState = asFunction<(payload: unknown) => unknown>(
    homeGuideRuntime.resolveHomeGuideFinishState
  );
  const finishHomeGuide = asFunction<(markSeen: boolean, options: unknown) => unknown>(
    source.finishHomeGuide
  );
  if (
    !resolveHomeGuideBindingState ||
    !resolveHomeGuideControlAction ||
    !resolveHomeGuideFinishState ||
    !finishHomeGuide
  ) {
    return false;
  }

  const elementRecord = toRecord(element);
  const bindingState = toRecord(
    resolveHomeGuideBindingState({
      alreadyBound: resolveBoolean(elementRecord.__homeGuideBound)
    })
  );
  if (!bindingState.shouldBind) {
    return false;
  }

  elementRecord.__homeGuideBound = bindingState.boundValue;
  return bindListener(element, "click", function () {
    const actionState = toRecord(
      resolveHomeGuideControlAction({
        action: "skip",
        stepIndex: resolveNumber(toRecord(source.homeGuideState).index, 0)
      })
    );
    const finishState = toRecord(
      resolveHomeGuideFinishState({
        reason: actionState.finishReason
      })
    );
    finishHomeGuide(resolveBoolean(finishState.markSeen), {
      showDoneNotice: resolveBoolean(finishState.showDoneNotice)
    });
  });
}

export interface HomeGuideControlsHostResult {
  didBindControls: boolean;
  boundControlCount: number;
  didKickoff: boolean;
  didSyncSettings: boolean;
}

export function applyHomeGuideControls(input: {
  documentLike?: unknown;
  homeGuideRuntime?: unknown;
  homeGuideState?: unknown;
  showHomeGuideStep?: unknown;
  finishHomeGuide?: unknown;
  syncHomeGuideSettingsUI?: unknown;
}): HomeGuideControlsHostResult {
  const source = toRecord(input);
  const showHomeGuideStep = asFunction<(stepIndex: number) => unknown>(source.showHomeGuideStep);
  if (!showHomeGuideStep) {
    return {
      didBindControls: false,
      boundControlCount: 0,
      didKickoff: false,
      didSyncSettings: false
    };
  }

  const prevBtn = getElementById(source.documentLike, "home-guide-prev");
  const nextBtn = getElementById(source.documentLike, "home-guide-next");
  const skipBtn = getElementById(source.documentLike, "home-guide-skip");

  let boundControlCount = 0;
  if (
    bindStepControl({
      element: prevBtn,
      action: "prev",
      homeGuideRuntime: source.homeGuideRuntime,
      homeGuideState: source.homeGuideState,
      showHomeGuideStep
    })
  ) {
    boundControlCount += 1;
  }
  if (
    bindStepControl({
      element: nextBtn,
      action: "next",
      homeGuideRuntime: source.homeGuideRuntime,
      homeGuideState: source.homeGuideState,
      showHomeGuideStep
    })
  ) {
    boundControlCount += 1;
  }
  if (
    bindSkipControl({
      element: skipBtn,
      homeGuideRuntime: source.homeGuideRuntime,
      homeGuideState: source.homeGuideState,
      finishHomeGuide: source.finishHomeGuide
    })
  ) {
    boundControlCount += 1;
  }

  showHomeGuideStep(0);

  let didSyncSettings = false;
  const syncHomeGuideSettingsUI = asFunction<() => unknown>(source.syncHomeGuideSettingsUI);
  if (syncHomeGuideSettingsUI) {
    syncHomeGuideSettingsUI();
    didSyncSettings = true;
  }

  return {
    didBindControls: boundControlCount > 0,
    boundControlCount,
    didKickoff: true,
    didSyncSettings
  };
}
