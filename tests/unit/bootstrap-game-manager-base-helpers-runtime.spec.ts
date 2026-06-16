import { describe, expect, it, vi } from "vitest";

import {
  createGameManagerBaseHelpersRuntime,
  installGameManagerBaseHelpersRuntime,
  type GameManagerBaseHelpersRuntimeWindowLike
} from "../../src/bootstrap/game-manager-base-helpers-runtime";
import {
  clonePlain,
  createUnavailableCoreCallResult,
  hasOwnKey,
  isCoreCallAvailable,
  isNonArrayObject,
  readOptionValue,
  resolveCoreBooleanCallOrFallback,
  resolveCoreNumericCallOrFallback,
  resolveCoreObjectCallOrFallback,
  resolveCoreRawCallValueOrUndefined,
  resolveCoreStringCallOrFallback,
  resolveNormalizedCoreValueOrFallback,
  resolveNormalizedCoreValueOrFallbackAllowNull,
  resolveNormalizedCoreValueOrUndefined,
  safeClonePlain,
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
  createUnavailableCoreCallResult,
  clonePlain,
  safeClonePlain,
  hasOwnKey,
  readOptionValue
};

describe("game manager base helpers runtime installer", () => {
  it("creates the legacy global function shape from TypeScript helpers", () => {
    expect(createGameManagerBaseHelpersRuntime()).toEqual(expectedRuntime);
  });

  it("installs missing legacy global functions on a supplied window-like object", () => {
    const windowLike: GameManagerBaseHelpersRuntimeWindowLike = {};

    const installed = installGameManagerBaseHelpersRuntime({ windowLike });

    expect(installed).toEqual(expectedRuntime);
    for (const [name, fn] of Object.entries(expectedRuntime)) {
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
