export type CappedUiManagerForwardBindingTarget = (...args: unknown[]) => unknown;

export const CAPPED_UI_MANAGER_FORWARD_BINDING_NAMES = [
  "setTimerRowVisibleState",
  "setCapped64RowVisible",
  "resolveProgressiveCapped64UnlockedState",
  "resetProgressiveCapped64Rows",
  "resolveCappedTargetValueOrNull",
  "getCappedTimerLegendClass",
  "getCappedTimerLegendFontSize",
  "getCappedTimerFontSize",
  "getCappedPlaceholderRowValues",
  "getCappedOverflowContainer",
  "openStatsPanel",
  "closeStatsPanel",
  "getTimerModuleViewMode",
  "applyTimerModuleView",
  "setTimerModuleViewMode"
] as const;

export type CappedUiManagerForwardBindingName =
  (typeof CAPPED_UI_MANAGER_FORWARD_BINDING_NAMES)[number];

export type CappedUiManagerForwardBindingOperations = Partial<
  Record<CappedUiManagerForwardBindingName, CappedUiManagerForwardBindingTarget>
>;

export type CappedUiManagerForwardBinding = [
  CappedUiManagerForwardBindingName,
  CappedUiManagerForwardBindingTarget | undefined
];

export interface CappedUiManagerForwardBindingsRuntime {
  createCappedUiManagerForwardBindings: typeof createCappedUiManagerForwardBindings;
}

export interface CappedUiManagerForwardBindingsWindowLike {
  CoreCappedUiManagerForwardBindingsRuntime?: CappedUiManagerForwardBindingsRuntime;
}

export interface CappedUiManagerForwardBindingsRuntimeInstallOptions {
  windowLike?: CappedUiManagerForwardBindingsWindowLike | null;
}

export function createCappedUiManagerForwardBindings(
  operations: CappedUiManagerForwardBindingOperations
): CappedUiManagerForwardBinding[] {
  return CAPPED_UI_MANAGER_FORWARD_BINDING_NAMES.map((name) => [name, operations[name]]);
}

export function createCappedUiManagerForwardBindingsRuntime(): CappedUiManagerForwardBindingsRuntime {
  return {
    createCappedUiManagerForwardBindings
  };
}

export function installCappedUiManagerForwardBindingsRuntime(
  options: CappedUiManagerForwardBindingsRuntimeInstallOptions = {}
): CappedUiManagerForwardBindingsRuntime | null {
  const target =
    options.windowLike === undefined
      ? typeof window === "undefined"
        ? null
        : (window as unknown as CappedUiManagerForwardBindingsWindowLike)
      : options.windowLike;
  if (!target) return null;
  if (!target.CoreCappedUiManagerForwardBindingsRuntime) {
    target.CoreCappedUiManagerForwardBindingsRuntime = createCappedUiManagerForwardBindingsRuntime();
  }
  return target.CoreCappedUiManagerForwardBindingsRuntime;
}
