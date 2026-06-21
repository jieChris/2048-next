export interface CappedRepeatLegendElementLike {
  className?: string;
  style?: {
    color?: string;
    fontSize?: string;
  };
}

export interface CappedRepeatLegendRowLike {
  querySelector?: (selector: string) => CappedRepeatLegendElementLike | null | undefined;
}

export interface CappedRepeatLegendDocumentLike {
  querySelectorAll?: (selector: string) => ArrayLike<CappedRepeatLegendRowLike | null | undefined>;
}

export interface CappedRepeatLegendResolvedStateLike {
  isCappedMode?: boolean;
  cappedTargetValue?: unknown;
}

export interface CappedRepeatLegendManagerLike {
  resolveProvidedCappedModeState?: (cappedState: unknown) => CappedRepeatLegendResolvedStateLike;
  getCappedTimerLegendClass?: (targetValue: unknown) => string;
  getCappedTimerLegendFontSize?: (targetValue: unknown) => string;
  getCappedTimerFontSize?: (targetValue: unknown) => string;
  callWindowNamespaceMethod?: (namespaceName: string, methodName: string) => unknown;
}

export interface CappedRepeatLegendOperations {
  resolveManagerDocumentLike: (
    manager: CappedRepeatLegendManagerLike
  ) => CappedRepeatLegendDocumentLike | null | undefined;
}

export interface CappedRepeatLegendRuntime {
  normalizeCappedRepeatLegendClasses: typeof normalizeCappedRepeatLegendClasses;
}

export interface CappedRepeatLegendWindowLike {
  CoreCappedRepeatLegendRuntime?: CappedRepeatLegendRuntime;
}

export interface CappedRepeatLegendRuntimeInstallOptions {
  windowLike?: CappedRepeatLegendWindowLike | null;
}

export function normalizeCappedRepeatLegendClasses(
  manager: CappedRepeatLegendManagerLike | null | undefined,
  cappedState: unknown,
  operations: CappedRepeatLegendOperations
): void {
  if (!manager || typeof manager.resolveProvidedCappedModeState !== "function") return;
  const documentLike = operations.resolveManagerDocumentLike(manager);
  if (!documentLike || typeof documentLike.querySelectorAll !== "function") return;
  const resolvedCappedState = manager.resolveProvidedCappedModeState(cappedState);
  if (!resolvedCappedState.isCappedMode) return;
  const targetValue = resolvedCappedState.cappedTargetValue;
  const rows = documentLike.querySelectorAll("#timerbox [data-capped-repeat]");
  const legendClass = manager.getCappedTimerLegendClass?.(targetValue) || "";
  const fontSize =
    typeof manager.getCappedTimerLegendFontSize === "function"
      ? manager.getCappedTimerLegendFontSize(targetValue)
      : manager.getCappedTimerFontSize?.(targetValue) || "";
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const legend = row?.querySelector?.(".timertile");
    if (!legend) continue;
    legend.className = legendClass;
    if (!legend.style) legend.style = {};
    legend.style.color = "#f9f6f2";
    legend.style.fontSize = fontSize;
  }
  manager.callWindowNamespaceMethod?.("ThemeManager", "syncTimerLegendStyles");
}

export function createCappedRepeatLegendRuntime(): CappedRepeatLegendRuntime {
  return {
    normalizeCappedRepeatLegendClasses
  };
}

export function installCappedRepeatLegendRuntime(
  options: CappedRepeatLegendRuntimeInstallOptions = {}
): CappedRepeatLegendRuntime | null {
  const target =
    options.windowLike === undefined
      ? typeof window === "undefined"
        ? null
        : (window as unknown as CappedRepeatLegendWindowLike)
      : options.windowLike;
  if (!target) return null;
  if (!target.CoreCappedRepeatLegendRuntime) {
    target.CoreCappedRepeatLegendRuntime = createCappedRepeatLegendRuntime();
  }
  return target.CoreCappedRepeatLegendRuntime;
}
