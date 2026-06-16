import { describe, expect, it, vi } from "vitest";

import {
  createGameManagerBaseHelpersRuntime,
  installGameManagerBaseHelpersRuntime,
  type GameManagerBaseHelpersRuntimeWindowLike
} from "../../src/bootstrap/game-manager-base-helpers-runtime";
import {
  applySecondaryTimerRowsState,
  applySecondaryTimerExpandedParentsState,
  bindSecondaryTimerParentToggleEvents,
  collectSecondaryTimerExpandedParents,
  collectSecondaryTimerRowsState,
  clonePlain,
  createSecondaryTimerPlacementDebugSnapshot,
  ensureSecondaryTimerDescriptorRow,
  createCoreModeContextPayload,
  createCoreModeDefaultsPayload,
  createUnavailableCoreCallResult,
  getSecondaryTimerChildValues,
  getSecondaryTimerExpandedStateMap,
  getSecondaryTimerParentValues,
  getSecondaryTimerSlotIds,
  hasOwnKey,
  invalidateSecondaryTimersByLimit,
  isCoreCallAvailable,
  isNonArrayObject,
  isSecondaryTimerParentExpanded,
  isSecondaryTimerParentReached,
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
  resolveSecondaryTimerSlotIndexByValue,
  resolveSecondaryTimerSlotByValue,
  resolveSecondaryTimerValueId,
  resolveSecondaryTimerWidthByLevel,
  resetSecondaryTimerRowsForSetup,
  safeClonePlain,
  setSecondaryTimerParentExpanded,
  stampSecondaryTimerDescriptor,
  stampSecondaryTimersForMergedValue,
  toggleSecondaryTimerParentExpanded,
  tryHandleCoreRawValue
} from "../../src/core/game-manager-base-helpers";

const expectedRuntime = {
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
  getSecondaryTimerSlotIds,
  resolveSecondaryTimerSlotIndexByValue,
  getSecondaryTimerParentValues,
  getSecondaryTimerChildValues,
  resolveSecondaryTimerDisplayValueBySlot,
  resolveSecondaryTimerSlotByValue,
  getSecondaryTimerExpandedStateMap,
  isSecondaryTimerParentExpanded,
  isSecondaryTimerParentReached,
  setSecondaryTimerParentExpanded,
  toggleSecondaryTimerParentExpanded,
  collectSecondaryTimerExpandedParents,
  applySecondaryTimerExpandedParentsState,
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

describe("game manager base helpers runtime installer", () => {
  it("creates the legacy global function shape from TypeScript helpers", () => {
    const runtime = createGameManagerBaseHelpersRuntime();

    expect(runtime).toEqual(expectedRuntime);
    for (const name of Object.keys(expectedRuntime)) {
      expect(Object.prototype.hasOwnProperty.call(runtime, name)).toBe(true);
      expect(typeof runtime[name as keyof typeof runtime]).toBe("function");
    }
  });

  it("installs missing legacy global functions on a supplied window-like object", () => {
    const windowLike: GameManagerBaseHelpersRuntimeWindowLike = {};

    const installed = installGameManagerBaseHelpersRuntime({ windowLike });

    expect(installed).toEqual(expectedRuntime);
    for (const [name, fn] of Object.entries(expectedRuntime)) {
      expect(typeof fn).toBe("function");
      expect(Object.prototype.hasOwnProperty.call(windowLike, name)).toBe(true);
      expect(windowLike[name as keyof GameManagerBaseHelpersRuntimeWindowLike]).toBe(fn);
    }
  });

  it("does not overwrite existing legacy global function properties", () => {
    const existingIsCoreCallAvailable = vi.fn(() => true);
    const existingClonePlain = vi.fn((value: unknown) => value);
    const windowLike: GameManagerBaseHelpersRuntimeWindowLike = {
      isCoreCallAvailable: existingIsCoreCallAvailable,
      clonePlain: existingClonePlain
    };

    const installed = installGameManagerBaseHelpersRuntime({ windowLike });

    expect(installed?.isCoreCallAvailable).toBe(existingIsCoreCallAvailable);
    expect(installed?.clonePlain).toBe(existingClonePlain);
    expect(windowLike.isCoreCallAvailable).toBe(existingIsCoreCallAvailable);
    expect(windowLike.clonePlain).toBe(existingClonePlain);
    expect(windowLike.readOptionValue).toBe(readOptionValue);
  });

  it("returns null when no window-like target is available", () => {
    expect(installGameManagerBaseHelpersRuntime({ windowLike: null })).toBeNull();
  });
});
