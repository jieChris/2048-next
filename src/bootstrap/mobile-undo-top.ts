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
