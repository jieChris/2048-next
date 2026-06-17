import { describe, expect, it, vi } from "vitest";

import {
  createGameManagerRuntimeAccessorHelpersRuntime,
  installGameManagerRuntimeAccessorHelpersRuntime,
  type GameManagerRuntimeAccessorHelpersRuntimeWindowLike
} from "../../src/bootstrap/game-manager-runtime-accessor-helpers-runtime";
import {
  isRuntimeAccessorObject,
  registerCoreRuntimeAccessors,
  registerCoreRuntimeCaller,
  registerCoreRuntimeGetter,
  registerCoreRuntimeMethodResolver
} from "../../src/core/game-manager-runtime-accessor-helpers";

const expectedRuntime = {
  registerCoreRuntimeMethodResolver,
  isRuntimeAccessorObject,
  registerCoreRuntimeGetter,
  registerCoreRuntimeCaller,
  registerCoreRuntimeAccessors
};

describe("game manager runtime accessor helpers runtime installer", () => {
  it("creates the legacy global function shape from TypeScript helpers", () => {
    const runtime = createGameManagerRuntimeAccessorHelpersRuntime();

    expect(runtime).toEqual(expectedRuntime);
    for (const name of Object.keys(expectedRuntime)) {
      expect(Object.prototype.hasOwnProperty.call(runtime, name)).toBe(true);
      expect(typeof runtime[name as keyof typeof runtime]).toBe("function");
    }
  });

  it("installs missing legacy global functions on a supplied window-like object", () => {
    const windowLike: GameManagerRuntimeAccessorHelpersRuntimeWindowLike = {};

    const installed = installGameManagerRuntimeAccessorHelpersRuntime({ windowLike });

    expect(installed).toEqual(expectedRuntime);
    for (const [name, fn] of Object.entries(expectedRuntime)) {
      expect(typeof fn).toBe("function");
      expect(Object.prototype.hasOwnProperty.call(windowLike, name)).toBe(true);
      expect(windowLike[name as keyof GameManagerRuntimeAccessorHelpersRuntimeWindowLike]).toBe(fn);
    }
  });

  it("does not overwrite existing legacy global function properties", () => {
    const existingRegisterCoreRuntimeGetter = vi.fn();
    const existingIsRuntimeAccessorObject = vi.fn(() => true);
    const windowLike: GameManagerRuntimeAccessorHelpersRuntimeWindowLike = {
      registerCoreRuntimeGetter: existingRegisterCoreRuntimeGetter,
      isRuntimeAccessorObject: existingIsRuntimeAccessorObject
    };

    const installed = installGameManagerRuntimeAccessorHelpersRuntime({ windowLike });

    expect(installed?.registerCoreRuntimeGetter).toBe(existingRegisterCoreRuntimeGetter);
    expect(installed?.isRuntimeAccessorObject).toBe(existingIsRuntimeAccessorObject);
    expect(windowLike.registerCoreRuntimeGetter).toBe(existingRegisterCoreRuntimeGetter);
    expect(windowLike.isRuntimeAccessorObject).toBe(existingIsRuntimeAccessorObject);
    expect(windowLike.registerCoreRuntimeCaller).toBe(registerCoreRuntimeCaller);
  });

  it("returns null when no window-like target is available", () => {
    expect(installGameManagerRuntimeAccessorHelpersRuntime({ windowLike: null })).toBeNull();
  });
});
