export interface MobileUndoTopButtonDisplayModel {
  shouldShow: boolean;
  buttonDisplay: "inline-flex" | "none";
  pointerEvents: "" | "none";
  opacity: "" | "0.45";
  ariaDisabled: "true" | "false";
  label: string;
}

export interface ResolveMobileUndoTopButtonDisplayModelOptions {
  compactViewport?: boolean | null | undefined;
  modeUndoCapable?: boolean | null | undefined;
  canUndoNow?: boolean | null | undefined;
  label?: string | null | undefined;
}

export interface ResolveMobileUndoTopAppliedModelOptions {
  displayModel?: MobileUndoTopButtonDisplayModel | null | undefined;
  fallbackLabel?: string | null | undefined;
}

export interface MobileUndoTopAppliedModel {
  shouldShow: boolean;
  buttonDisplay: "inline-flex" | "none";
  pointerEvents: "" | "none";
  opacity: "" | "0.45";
  ariaDisabled: "true" | "false";
  label: string;
  shouldApplyLabel: boolean;
}

const DEFAULT_LABEL = "撤回";

function resolveLabel(value: string | null | undefined): string {
  return typeof value === "string" && value ? value : DEFAULT_LABEL;
}

export function resolveMobileUndoTopButtonDisplayModel(
  options: ResolveMobileUndoTopButtonDisplayModelOptions
): MobileUndoTopButtonDisplayModel {
  const opts = options || {};
  const shouldShow = !!opts.compactViewport && !!opts.modeUndoCapable;
  const canUndoNow = shouldShow && !!opts.canUndoNow;
  const label = resolveLabel(opts.label);

  if (!shouldShow) {
    return {
      shouldShow: false,
      buttonDisplay: "none",
      pointerEvents: "none",
      opacity: "0.45",
      ariaDisabled: "true",
      label
    };
  }

  return {
    shouldShow: true,
    buttonDisplay: "inline-flex",
    pointerEvents: canUndoNow ? "" : "none",
    opacity: canUndoNow ? "" : "0.45",
    ariaDisabled: canUndoNow ? "false" : "true",
    label
  };
}

export function resolveMobileUndoTopAppliedModel(
  options: ResolveMobileUndoTopAppliedModelOptions
): MobileUndoTopAppliedModel {
  const opts = options || {};
  const model = opts.displayModel || null;
  const fallbackLabel = resolveLabel(opts.fallbackLabel);
  const shouldShow = !!(model && model.shouldShow);
  const buttonDisplay =
    model && (model.buttonDisplay === "inline-flex" || model.buttonDisplay === "none")
      ? model.buttonDisplay
      : "none";
  const pointerEvents =
    model && (model.pointerEvents === "" || model.pointerEvents === "none")
      ? model.pointerEvents
      : "none";
  const opacity =
    model && (model.opacity === "" || model.opacity === "0.45") ? model.opacity : "0.45";
  const ariaDisabled =
    model && (model.ariaDisabled === "true" || model.ariaDisabled === "false")
      ? model.ariaDisabled
      : "true";
  const label =
    model && typeof model.label === "string" && model.label ? model.label : fallbackLabel;
  return {
    shouldShow,
    buttonDisplay,
    pointerEvents,
    opacity,
    ariaDisabled,
    label,
    shouldApplyLabel: shouldShow
  };
}
