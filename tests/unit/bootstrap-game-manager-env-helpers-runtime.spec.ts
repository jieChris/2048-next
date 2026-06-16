import { describe, expect, it, vi } from "vitest";

import {
  createGameManagerEnvHelpersRuntime,
  installGameManagerEnvHelpersRuntime,
  type GameManagerEnvHelpersRuntimeWindowLike
} from "../../src/bootstrap/game-manager-env-helpers-runtime";
import {
  callWindowMethod,
  callWindowNamespaceMethod,
  canReadFromStorage,
  canWriteToStorage,
  getWebStorageByName,
  getWindowLike,
  requestAnimationFrameByManager,
  resolveManagerDocumentLike,
  resolveManagerElementById,
  resolveWindowMethod,
  resolveWindowNamespaceMethod
} from "../../src/core/game-manager-env-helpers";

const expectedRuntime = {
  getWebStorageByName,
  getWindowLike,
  resolveManagerDocumentLike,
  resolveManagerElementById,
  canReadFromStorage,
  canWriteToStorage,
  resolveWindowMethod,
  callWindowMethod,
  resolveWindowNamespaceMethod,
  callWindowNamespaceMethod,
  requestAnimationFrameByManager
};

describe("game manager env helpers runtime installer", () => {
  it("creates the legacy global function shape from TypeScript helpers", () => {
    const runtime = createGameManagerEnvHelpersRuntime();

    expect(runtime).toEqual(expectedRuntime);
    for (const name of Object.keys(expectedRuntime)) {
      expect(Object.prototype.hasOwnProperty.call(runtime, name)).toBe(true);
      expect(typeof runtime[name as keyof typeof runtime]).toBe("function");
    }
  });

  it("installs missing legacy global functions on a supplied window-like object", () => {
    const windowLike: GameManagerEnvHelpersRuntimeWindowLike = {};

    const installed = installGameManagerEnvHelpersRuntime({ windowLike });

    expect(installed).toEqual(expectedRuntime);
    for (const [name, fn] of Object.entries(expectedRuntime)) {
      expect(typeof fn).toBe("function");
      expect(Object.prototype.hasOwnProperty.call(windowLike, name)).toBe(true);
      expect(windowLike[name as keyof GameManagerEnvHelpersRuntimeWindowLike]).toBe(fn);
    }
  });

  it("does not overwrite existing legacy global function properties", () => {
    const existingGetWindowLike = vi.fn(() => null);
    const existingCanReadFromStorage = vi.fn(() => true);
    const windowLike: GameManagerEnvHelpersRuntimeWindowLike = {
      getWindowLike: existingGetWindowLike,
      canReadFromStorage: existingCanReadFromStorage
    };

    const installed = installGameManagerEnvHelpersRuntime({ windowLike });

    expect(installed?.getWindowLike).toBe(existingGetWindowLike);
    expect(installed?.canReadFromStorage).toBe(existingCanReadFromStorage);
    expect(windowLike.getWindowLike).toBe(existingGetWindowLike);
    expect(windowLike.canReadFromStorage).toBe(existingCanReadFromStorage);
    expect(windowLike.resolveWindowMethod).toBe(resolveWindowMethod);
  });

  it("returns null when no window-like target is available", () => {
    expect(installGameManagerEnvHelpersRuntime({ windowLike: null })).toBeNull();
  });
});
