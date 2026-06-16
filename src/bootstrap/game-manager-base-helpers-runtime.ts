import {
  applySecondaryTimerRowsState,
  bindSecondaryTimerParentToggleEvents,
  collectSecondaryTimerExpandedParents,
  collectSecondaryTimerRowsState,
  clonePlain,
  createSecondaryTimerPlacementDebugSnapshot,
  createCoreModeContextPayload,
  createCoreModeDefaultsPayload,
  createUnavailableCoreCallResult,
  ensureSecondaryTimerDescriptorRow,
  getSecondaryTimerChildValues,
  getSecondaryTimerParentValues,
  hasOwnKey,
  invalidateSecondaryTimersByLimit,
  isCoreCallAvailable,
  isNonArrayObject,
  isSecondaryTimerPowerOfTwo,
  normalizeSecondaryTimerValue,
  parseSecondaryTimerRowIdentity,
  placeSecondaryTimerRowsNearParents,
  readOptionValue,
  refreshSecondaryTimerRowsVisibility,
  resolveCoreBooleanCallOrFallback,
  resolveCoreNumericCallOrFallback,
  resolveCoreObjectCallOrFallback,
  resolveCoreRawCallValueOrUndefined,
  resolveCoreStringCallOrFallback,
  resolveNormalizedCoreValueOrFallback,
  resolveNormalizedCoreValueOrFallbackAllowNull,
  resolveNormalizedCoreValueOrUndefined,
  resolveSecondaryTimerDescriptors,
  resolveSecondaryTimerDisplayValueBySlot,
  resolveSecondaryTimerIndentLevel,
  resolveSecondaryTimerLegendFontSize,
  resolveSecondaryTimerParentAnchor,
  resolveSecondaryTimerPlacementDiagnosticsIndexEntry,
  resolveSecondaryTimerPlacementDiagnosticsPayload,
  resolveSecondaryTimerPlacementDebugSummary,
  resolveSecondaryTimerPlacementDebugSummaryFromSnapshot,
  resolveSecondaryTimerRowId,
  resolveSecondaryTimerSlotByValue,
  resolveSecondaryTimerValueId,
  resolveSecondaryTimerWidthByLevel,
  resetSecondaryTimerRowsForSetup,
  safeClonePlain,
  stampSecondaryTimerDescriptor,
  stampSecondaryTimersForMergedValue,
  tryHandleCoreRawValue
} from "../core/game-manager-base-helpers";

export interface GameManagerBaseHelpersRuntime {
  isCoreCallAvailable: typeof isCoreCallAvailable;
  resolveCoreObjectCallOrFallback: typeof resolveCoreObjectCallOrFallback;
  resolveCoreBooleanCallOrFallback: typeof resolveCoreBooleanCallOrFallback;
  resolveCoreNumericCallOrFallback: typeof resolveCoreNumericCallOrFallback;
  resolveCoreStringCallOrFallback: typeof resolveCoreStringCallOrFallback;
  resolveNormalizedCoreValueOrUndefined: typeof resolveNormalizedCoreValueOrUndefined;
  resolveNormalizedCoreValueOrFallback: typeof resolveNormalizedCoreValueOrFallback;
  resolveNormalizedCoreValueOrFallbackAllowNull: typeof resolveNormalizedCoreValueOrFallbackAllowNull;
  resolveCoreRawCallValueOrUndefined: typeof resolveCoreRawCallValueOrUndefined;
  tryHandleCoreRawValue: typeof tryHandleCoreRawValue;
  isNonArrayObject: typeof isNonArrayObject;
  createCoreModeDefaultsPayload: typeof createCoreModeDefaultsPayload;
  createCoreModeContextPayload: typeof createCoreModeContextPayload;
  createUnavailableCoreCallResult: typeof createUnavailableCoreCallResult;
  clonePlain: typeof clonePlain;
  safeClonePlain: typeof safeClonePlain;
  hasOwnKey: typeof hasOwnKey;
  readOptionValue: typeof readOptionValue;
  normalizeSecondaryTimerValue: typeof normalizeSecondaryTimerValue;
  isSecondaryTimerPowerOfTwo: typeof isSecondaryTimerPowerOfTwo;
  getSecondaryTimerParentValues: typeof getSecondaryTimerParentValues;
  getSecondaryTimerChildValues: typeof getSecondaryTimerChildValues;
  resolveSecondaryTimerDisplayValueBySlot: typeof resolveSecondaryTimerDisplayValueBySlot;
  resolveSecondaryTimerSlotByValue: typeof resolveSecondaryTimerSlotByValue;
  collectSecondaryTimerExpandedParents: typeof collectSecondaryTimerExpandedParents;
  bindSecondaryTimerParentToggleEvents: typeof bindSecondaryTimerParentToggleEvents;
  resolveSecondaryTimerRowId: typeof resolveSecondaryTimerRowId;
  resolveSecondaryTimerValueId: typeof resolveSecondaryTimerValueId;
  parseSecondaryTimerRowIdentity: typeof parseSecondaryTimerRowIdentity;
  resolveSecondaryTimerIndentLevel: typeof resolveSecondaryTimerIndentLevel;
  resolveSecondaryTimerLegendFontSize: typeof resolveSecondaryTimerLegendFontSize;
  resolveSecondaryTimerWidthByLevel: typeof resolveSecondaryTimerWidthByLevel;
  ensureSecondaryTimerDescriptorRow: typeof ensureSecondaryTimerDescriptorRow;
  resolveSecondaryTimerDescriptors: typeof resolveSecondaryTimerDescriptors;
  resolveSecondaryTimerParentAnchor: typeof resolveSecondaryTimerParentAnchor;
  placeSecondaryTimerRowsNearParents: typeof placeSecondaryTimerRowsNearParents;
  refreshSecondaryTimerRowsVisibility: typeof refreshSecondaryTimerRowsVisibility;
  resetSecondaryTimerRowsForSetup: typeof resetSecondaryTimerRowsForSetup;
  stampSecondaryTimerDescriptor: typeof stampSecondaryTimerDescriptor;
  stampSecondaryTimersForMergedValue: typeof stampSecondaryTimersForMergedValue;
  invalidateSecondaryTimersByLimit: typeof invalidateSecondaryTimersByLimit;
  collectSecondaryTimerRowsState: typeof collectSecondaryTimerRowsState;
  applySecondaryTimerRowsState: typeof applySecondaryTimerRowsState;
  createSecondaryTimerPlacementDebugSnapshot: typeof createSecondaryTimerPlacementDebugSnapshot;
  resolveSecondaryTimerPlacementDebugSummaryFromSnapshot: typeof resolveSecondaryTimerPlacementDebugSummaryFromSnapshot;
  resolveSecondaryTimerPlacementDebugSummary: typeof resolveSecondaryTimerPlacementDebugSummary;
  resolveSecondaryTimerPlacementDiagnosticsPayload: typeof resolveSecondaryTimerPlacementDiagnosticsPayload;
  resolveSecondaryTimerPlacementDiagnosticsIndexEntry: typeof resolveSecondaryTimerPlacementDiagnosticsIndexEntry;
}

export type GameManagerBaseHelpersRuntimeWindowLike = Partial<GameManagerBaseHelpersRuntime>;

export interface GameManagerBaseHelpersRuntimeInstallOptions {
  windowLike?: GameManagerBaseHelpersRuntimeWindowLike | null | undefined;
}

type RuntimeEntry = {
  [Key in keyof GameManagerBaseHelpersRuntime]: [Key, GameManagerBaseHelpersRuntime[Key]];
}[keyof GameManagerBaseHelpersRuntime];

function getRuntimeEntries(runtime: GameManagerBaseHelpersRuntime): RuntimeEntry[] {
  return Object.entries(runtime) as RuntimeEntry[];
}

export function createGameManagerBaseHelpersRuntime(): GameManagerBaseHelpersRuntime {
  return {
    isCoreCallAvailable,
    resolveCoreObjectCallOrFallback,
    resolveCoreBooleanCallOrFallback,
    resolveCoreNumericCallOrFallback,
    resolveCoreStringCallOrFallback,
    resolveNormalizedCoreValueOrUndefined,
    resolveNormalizedCoreValueOrFallback,
    resolveNormalizedCoreValueOrFallbackAllowNull,
    resolveCoreRawCallValueOrUndefined,
    tryHandleCoreRawValue,
    isNonArrayObject,
    createCoreModeDefaultsPayload,
    createCoreModeContextPayload,
    createUnavailableCoreCallResult,
    clonePlain,
    safeClonePlain,
    hasOwnKey,
    readOptionValue,
    normalizeSecondaryTimerValue,
    isSecondaryTimerPowerOfTwo,
    getSecondaryTimerParentValues,
    getSecondaryTimerChildValues,
    resolveSecondaryTimerDisplayValueBySlot,
    resolveSecondaryTimerSlotByValue,
    collectSecondaryTimerExpandedParents,
    bindSecondaryTimerParentToggleEvents,
    resolveSecondaryTimerRowId,
    resolveSecondaryTimerValueId,
    parseSecondaryTimerRowIdentity,
    resolveSecondaryTimerIndentLevel,
    resolveSecondaryTimerLegendFontSize,
    resolveSecondaryTimerWidthByLevel,
    ensureSecondaryTimerDescriptorRow,
    resolveSecondaryTimerDescriptors,
    resolveSecondaryTimerParentAnchor,
    placeSecondaryTimerRowsNearParents,
    refreshSecondaryTimerRowsVisibility,
    resetSecondaryTimerRowsForSetup,
    stampSecondaryTimerDescriptor,
    stampSecondaryTimersForMergedValue,
    invalidateSecondaryTimersByLimit,
    collectSecondaryTimerRowsState,
    applySecondaryTimerRowsState,
    createSecondaryTimerPlacementDebugSnapshot,
    resolveSecondaryTimerPlacementDebugSummaryFromSnapshot,
    resolveSecondaryTimerPlacementDebugSummary,
    resolveSecondaryTimerPlacementDiagnosticsPayload,
    resolveSecondaryTimerPlacementDiagnosticsIndexEntry
  };
}

export function installGameManagerBaseHelpersRuntime(
  options: GameManagerBaseHelpersRuntimeInstallOptions = {}
): GameManagerBaseHelpersRuntime | null {
  const windowLike =
    options.windowLike ||
    (typeof window === "undefined"
      ? null
      : (window as unknown as GameManagerBaseHelpersRuntimeWindowLike));
  if (!windowLike) return null;

  const runtime = createGameManagerBaseHelpersRuntime();
  for (const [name, helper] of getRuntimeEntries(runtime)) {
    if (typeof windowLike[name] !== "function") {
      windowLike[name] = helper as never;
    }
  }

  const installed: Partial<GameManagerBaseHelpersRuntime> = {};
  for (const [name] of getRuntimeEntries(runtime)) {
    installed[name] = windowLike[name] as never;
  }
  return installed as GameManagerBaseHelpersRuntime;
}
