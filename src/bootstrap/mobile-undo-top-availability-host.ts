function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function toRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function asFunction<T extends (...args: never[]) => unknown>(value: unknown): T | null {
  return typeof value === "function" ? (value as T) : null;
}

function setStyleProperty(element: unknown, property: string, value: string): boolean {
  const style = toRecord(toRecord(element).style);
  style[property] = value;
  return true;
}

function setAttribute(element: unknown, key: string, value: string): boolean {
  const setAttributeFn = asFunction<(name: string, content: string) => unknown>(
    toRecord(element).setAttribute
  );
  if (!setAttributeFn) return false;
  try {
    setAttributeFn.call(element, key, value);
    return true;
  } catch (_err) {
    return false;
  }
}

function resolveStringValue(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

export interface MobileUndoTopAvailabilitySyncResult {
  isScope: boolean;
  hasButton: boolean;
  compactViewport: boolean;
  modeUndoCapable: boolean;
  canUndoNow: boolean;
  didApply: boolean;
  didApplyLabel: boolean;
}

export function applyMobileUndoTopAvailabilitySync(input: {
  isGamePageScope?: unknown;
  ensureMobileUndoTopButton?: unknown;
  isCompactGameViewport?: unknown;
  manager?: unknown;
  resolveUndoCapabilityState?: unknown;
  undoActionRuntime?: unknown;
  mobileUndoTopRuntime?: unknown;
  fallbackLabel?: unknown;
}): MobileUndoTopAvailabilitySyncResult {
  const source = toRecord(input);
  const isGamePageScope = asFunction<() => unknown>(source.isGamePageScope);
  const inScope = !!(isGamePageScope && isGamePageScope());
  if (!inScope) {
    return {
      isScope: false,
      hasButton: false,
      compactViewport: false,
      modeUndoCapable: false,
      canUndoNow: false,
      didApply: false,
      didApplyLabel: false
    };
  }

  const ensureMobileUndoTopButton = asFunction<() => unknown>(source.ensureMobileUndoTopButton);
  const button = ensureMobileUndoTopButton ? ensureMobileUndoTopButton() : null;
  if (!button) {
    return {
      isScope: true,
      hasButton: false,
      compactViewport: false,
      modeUndoCapable: false,
      canUndoNow: false,
      didApply: false,
      didApplyLabel: false
    };
  }

  const isCompactGameViewport = asFunction<() => unknown>(source.isCompactGameViewport);
  const compactViewport = !!(isCompactGameViewport && isCompactGameViewport());

  const resolveUndoCapabilityState = asFunction<(manager: unknown) => unknown>(
    source.resolveUndoCapabilityState
  );
  const undoCapabilityState = toRecord(
    resolveUndoCapabilityState ? resolveUndoCapabilityState(source.manager || null) : null
  );
  const modeUndoCapable = !!undoCapabilityState.modeUndoCapable;

  const undoActionRuntime = toRecord(source.undoActionRuntime);
  const isUndoInteractionEnabled = asFunction<(manager: unknown) => unknown>(
    undoActionRuntime.isUndoInteractionEnabled
  );
  const canUndoNow = !!(
    isUndoInteractionEnabled && isUndoInteractionEnabled(source.manager || null)
  );

  const mobileUndoTopRuntime = toRecord(source.mobileUndoTopRuntime);
  const resolveDisplayModel = asFunction<(payload: unknown) => unknown>(
    mobileUndoTopRuntime.resolveMobileUndoTopButtonDisplayModel
  );
  const resolveAppliedModel = asFunction<(payload: unknown) => unknown>(
    mobileUndoTopRuntime.resolveMobileUndoTopAppliedModel
  );

  const displayModel = toRecord(
    resolveDisplayModel
      ? resolveDisplayModel({
          compactViewport,
          modeUndoCapable,
          canUndoNow,
          label: "撤回"
        })
      : null
  );
  const fallbackLabel =
    typeof source.fallbackLabel === "string" && source.fallbackLabel ? source.fallbackLabel : "撤回";
  const appliedModel = toRecord(
    resolveAppliedModel
      ? resolveAppliedModel({
          displayModel,
          fallbackLabel
        })
      : null
  );

  setStyleProperty(button, "display", resolveStringValue(appliedModel.buttonDisplay, "none"));
  setStyleProperty(
    button,
    "pointerEvents",
    resolveStringValue(appliedModel.pointerEvents, "none")
  );
  setStyleProperty(button, "opacity", resolveStringValue(appliedModel.opacity, "0.45"));
  setAttribute(button, "aria-disabled", resolveStringValue(appliedModel.ariaDisabled, "true"));

  let didApplyLabel = false;
  if (!!appliedModel.shouldApplyLabel) {
    const label = String(appliedModel.label || fallbackLabel);
    setAttribute(button, "aria-label", label);
    setAttribute(button, "title", label);
    didApplyLabel = true;
  }

  return {
    isScope: true,
    hasButton: true,
    compactViewport,
    modeUndoCapable,
    canUndoNow,
    didApply: true,
    didApplyLabel
  };
}
