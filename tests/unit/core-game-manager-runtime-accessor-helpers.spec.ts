import { describe, expect, it, vi } from "vitest";

import {
  isRuntimeAccessorObject,
  registerCoreRuntimeAccessors,
  registerCoreRuntimeCaller,
  registerCoreRuntimeGetter,
  registerCoreRuntimeMethodResolver
} from "../../src/core/game-manager-runtime-accessor-helpers";

describe("game manager runtime accessor helpers", () => {
  it("detects runtime accessor objects", () => {
    expect(isRuntimeAccessorObject({})).toBe(true);
    expect(isRuntimeAccessorObject([])).toBe(true);
    expect(isRuntimeAccessorObject(null)).toBe(false);
    expect(isRuntimeAccessorObject(() => {})).toBe(false);
    expect(isRuntimeAccessorObject("runtime")).toBe(false);
  });

  it("registers runtime getters on the supplied game manager prototype", () => {
    const prototype: Record<PropertyKey, unknown> = {};
    registerCoreRuntimeGetter("getCoreExampleRuntime", "CoreExampleRuntime", {
      gameManagerPrototype: prototype
    });

    const manager = {
      getWindowLike: () => ({
        CoreExampleRuntime: { ping: vi.fn() }
      })
    };

    expect(typeof prototype.getCoreExampleRuntime).toBe("function");
    expect((prototype.getCoreExampleRuntime as Function).call(manager)).toEqual({
      ping: expect.any(Function)
    });
    expect((prototype.getCoreExampleRuntime as Function).call({ getWindowLike: () => null })).toBeNull();
    expect((prototype.getCoreExampleRuntime as Function).call({ getWindowLike: () => ({ CoreExampleRuntime: null }) })).toBeNull();
  });

  it("registers runtime method resolvers that bind runtime methods to their runtime object", () => {
    const prototype: Record<PropertyKey, unknown> = {};
    const runtime = {
      calls: [] as string[],
      ping(value: string) {
        this.calls.push(value);
        return this.calls.length;
      }
    };
    const manager = {
      getCoreExampleRuntime: () => runtime
    };

    registerCoreRuntimeMethodResolver("resolveCoreExampleRuntimeMethod", "getCoreExampleRuntime", {
      gameManagerPrototype: prototype
    });

    const resolved = (prototype.resolveCoreExampleRuntimeMethod as Function).call(manager, "ping");

    expect(typeof resolved).toBe("function");
    expect(resolved("ready")).toBe(1);
    expect(runtime.calls).toEqual(["ready"]);
    expect((prototype.resolveCoreExampleRuntimeMethod as Function).call(manager, "")).toBeNull();
    expect((prototype.resolveCoreExampleRuntimeMethod as Function).call({ getCoreExampleRuntime: () => null }, "ping")).toBeNull();
    expect((prototype.resolveCoreExampleRuntimeMethod as Function).call({ getCoreExampleRuntime: () => ({}) }, "missing")).toBeNull();
  });

  it("registers runtime callers that return available or unavailable core call results", () => {
    const unavailable = { available: false, value: "unavailable" };
    const prototype: Record<PropertyKey, unknown> = {};
    const runtimeMethod = vi.fn((value: string) => `called:${value}`);
    const manager = {
      resolveCoreExampleRuntimeMethod: vi.fn((methodName: string) =>
        methodName === "ping" ? runtimeMethod : null
      )
    };

    registerCoreRuntimeCaller("callCoreExampleRuntime", "resolveCoreExampleRuntimeMethod", {
      gameManagerPrototype: prototype,
      createUnavailableCoreCallResult: () => unavailable
    });

    expect((prototype.callCoreExampleRuntime as Function).call(manager, "ping", ["ready"])).toEqual({
      available: true,
      value: "called:ready"
    });
    expect(runtimeMethod).toHaveBeenCalledWith("ready");
    expect((prototype.callCoreExampleRuntime as Function).call(manager, "missing", [])).toBe(unavailable);
    expect((prototype.callCoreExampleRuntime as Function).call({}, "ping", [])).toBe(unavailable);
    expect((prototype.callCoreExampleRuntime as Function).call(manager, "ping", "not-array")).toEqual({
      available: true,
      value: "called:undefined"
    });
  });

  it("registers runtime accessor triples and ignores invalid definitions", () => {
    const prototype: Record<PropertyKey, unknown> = {};
    const runtime = {
      double(value: number) {
        return value * 2;
      }
    };
    const manager = Object.assign(Object.create(prototype), {
      getWindowLike: () => ({
        CoreExampleRuntime: runtime
      })
    });

    registerCoreRuntimeAccessors(
      [
        ["callCoreExampleRuntime", "resolveCoreExampleRuntimeMethod", "getCoreExampleRuntime", "CoreExampleRuntime"],
        ["ignored"]
      ],
      { gameManagerPrototype: prototype }
    );

    expect(typeof prototype.getCoreExampleRuntime).toBe("function");
    expect(typeof prototype.resolveCoreExampleRuntimeMethod).toBe("function");
    expect(typeof prototype.callCoreExampleRuntime).toBe("function");
    expect((prototype.callCoreExampleRuntime as Function).call(manager, "double", [21])).toEqual({
      available: true,
      value: 42
    });
    expect(Object.prototype.hasOwnProperty.call(prototype, "ignored")).toBe(false);
  });
});
