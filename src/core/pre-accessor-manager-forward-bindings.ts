export type PreAccessorManagerForwardBindingTarget = (...args: unknown[]) => unknown;

export const PRE_ACCESSOR_MANAGER_FORWARD_BINDING_NAMES = [
  "encodeReplay128",
  "decodeReplay128",
  "resolveCoreObjectCallOrFallback",
  "resolveCoreBooleanCallOrFallback",
  "resolveCoreNumericCallOrFallback",
  "resolveCoreStringCallOrFallback",
  "resolveNormalizedCoreValueOrUndefined",
  "resolveNormalizedCoreValueOrFallback",
  "resolveNormalizedCoreValueOrFallbackAllowNull",
  "resolveCoreRawCallValueOrUndefined",
  "tryHandleCoreRawValue",
  "createCoreModeContextPayload",
  "setRuntimeScore",
  "addRuntimeScoreDelta",
  "setRuntimeReplayIndex",
  "setRuntimeReplayMoves",
  "setRuntimeReplaySpawns",
  "setRuntimeReplayMovesV2",
  "setRuntimeUndoEnabled",
  "setRuntimeDisableSessionSync",
  "setRuntimeReplayDelay",
  "setRuntimeGrid",
  "setRuntimeUndoStack",
  "setRuntimeRedoStack",
  "pushRuntimeUndoStackEntry",
  "clearRuntimeRedoStack",
  "writeRuntimeGridCell",
  "clearRuntimeGridCell"
] as const;

export type PreAccessorManagerForwardBindingName =
  (typeof PRE_ACCESSOR_MANAGER_FORWARD_BINDING_NAMES)[number];

export type PreAccessorManagerForwardBindingOperations = Partial<
  Record<PreAccessorManagerForwardBindingName, PreAccessorManagerForwardBindingTarget>
>;

export type PreAccessorManagerForwardBinding = [
  PreAccessorManagerForwardBindingName,
  PreAccessorManagerForwardBindingTarget | undefined
];

export interface PreAccessorManagerForwardBindingsRuntime {
  createPreAccessorManagerForwardBindings: typeof createPreAccessorManagerForwardBindings;
}

export interface PreAccessorManagerForwardBindingsWindowLike {
  CorePreAccessorManagerForwardBindingsRuntime?: PreAccessorManagerForwardBindingsRuntime;
}

export interface PreAccessorManagerForwardBindingsRuntimeInstallOptions {
  windowLike?: PreAccessorManagerForwardBindingsWindowLike | null;
}

export function createPreAccessorManagerForwardBindings(
  operations: PreAccessorManagerForwardBindingOperations
): PreAccessorManagerForwardBinding[] {
  return PRE_ACCESSOR_MANAGER_FORWARD_BINDING_NAMES.map((name) => [name, operations[name]]);
}

export function createPreAccessorManagerForwardBindingsRuntime(): PreAccessorManagerForwardBindingsRuntime {
  return {
    createPreAccessorManagerForwardBindings
  };
}

export function installPreAccessorManagerForwardBindingsRuntime(
  options: PreAccessorManagerForwardBindingsRuntimeInstallOptions = {}
): PreAccessorManagerForwardBindingsRuntime | null {
  const target =
    options.windowLike === undefined
      ? typeof window === "undefined"
        ? null
        : (window as unknown as PreAccessorManagerForwardBindingsWindowLike)
      : options.windowLike;
  if (!target) return null;
  if (!target.CorePreAccessorManagerForwardBindingsRuntime) {
    target.CorePreAccessorManagerForwardBindingsRuntime =
      createPreAccessorManagerForwardBindingsRuntime();
  }
  return target.CorePreAccessorManagerForwardBindingsRuntime;
}
