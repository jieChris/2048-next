import { describe, expect, it, vi } from "vitest";

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

function createManager() {
  return {
    marker: "manager-this",
    isCoreCallAvailable,
    clonePlain,
    hasOwnKey,
    resolveNormalizedCoreValueOrUndefined(coreCallResult: unknown, normalizer?: unknown) {
      return resolveNormalizedCoreValueOrUndefined(this, coreCallResult, normalizer);
    }
  };
}

describe("core game manager base helpers", () => {
  it("detects available core call results using the legacy strict flag", () => {
    expect(isCoreCallAvailable({ available: true, value: 0 })).toBe(true);
    expect(isCoreCallAvailable({ available: false, value: "x" })).toBe(false);
    expect(isCoreCallAvailable({ available: 1, value: "x" })).toBe(false);
    expect(isCoreCallAvailable(null)).toBe(false);
  });

  it("resolves object, boolean, numeric, and string core calls with legacy fallback coercion", () => {
    const manager = createManager();
    const fallback = vi.fn(function (this: typeof manager) {
      return {
        marker: this.marker,
        count: "7"
      };
    });

    expect(resolveCoreObjectCallOrFallback(manager, { available: true, value: { core: true } }, fallback)).toEqual({
      core: true
    });
    expect(resolveCoreObjectCallOrFallback(manager, { available: false, value: null }, fallback)).toEqual({
      marker: "manager-this",
      count: "7"
    });
    expect(fallback).toHaveBeenCalledTimes(1);

    expect(resolveCoreBooleanCallOrFallback(manager, { available: true, value: false }, () => true)).toBe(false);
    expect(resolveCoreBooleanCallOrFallback(manager, { available: false }, () => "truthy")).toBe(true);
    expect(resolveCoreBooleanCallOrFallback(null, { available: true, value: true }, () => false)).toBeNull();

    expect(resolveCoreNumericCallOrFallback(manager, { available: true, value: "12" }, () => 99)).toBe(12);
    expect(resolveCoreNumericCallOrFallback(manager, { available: true, value: "bad" }, () => 99)).toBe(0);
    expect(resolveCoreNumericCallOrFallback(manager, { available: false }, () => "8")).toBe(8);

    expect(resolveCoreStringCallOrFallback(manager, { available: true, value: "core" }, () => "fallback")).toBe("core");
    expect(resolveCoreStringCallOrFallback(manager, { available: true, value: "" }, () => "fallback")).toBe("fallback");
    expect(resolveCoreStringCallOrFallback(manager, { available: true, value: "" }, () => "fallback", true)).toBe("");
    expect(resolveCoreStringCallOrFallback(manager, { available: false }, () => 42)).toBe("42");
  });

  it("normalizes available core values and calls normalizers and fallbacks with the manager as this", () => {
    const manager = createManager();
    const normalizer = vi.fn(function (this: typeof manager, value: unknown) {
      return `${this.marker}:${String(value)}`;
    });
    const fallback = vi.fn(function (this: typeof manager) {
      return `${this.marker}:fallback`;
    });

    expect(resolveNormalizedCoreValueOrUndefined(manager, { available: true, value: "core" }, normalizer)).toBe(
      "manager-this:core"
    );
    expect(normalizer).toHaveBeenCalledWith("core");
    expect(resolveNormalizedCoreValueOrUndefined(manager, { available: false, value: "core" }, normalizer)).toBeUndefined();
    expect(resolveNormalizedCoreValueOrFallback(manager, { available: true, value: null }, () => null, fallback)).toBe(
      "manager-this:fallback"
    );
    expect(resolveNormalizedCoreValueOrFallbackAllowNull(manager, { available: true, value: null }, () => null, fallback)).toBeNull();
    expect(resolveNormalizedCoreValueOrFallback(manager, { available: false }, normalizer, fallback)).toBe(
      "manager-this:fallback"
    );
    expect(fallback).toHaveBeenCalledTimes(2);
  });

  it("resolves and handles raw core values only when the core call is available", () => {
    const manager = createManager();
    const handler = vi.fn(function (this: typeof manager, value: unknown) {
      expect(this).toBe(manager);
      expect(value).toEqual({ raw: true });
    });

    expect(resolveCoreRawCallValueOrUndefined(manager, { available: true, value: 0 })).toBe(0);
    expect(resolveCoreRawCallValueOrUndefined(manager, { available: false, value: "x" })).toBeUndefined();
    expect(tryHandleCoreRawValue(manager, { available: true, value: { raw: true } }, handler)).toBe(true);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(tryHandleCoreRawValue(manager, { available: false, value: "x" }, handler)).toBe(false);
    expect(tryHandleCoreRawValue(null, { available: true, value: "x" }, handler)).toBe(false);
  });

  it("preserves object, clone, own-key, unavailable-result, and option-reading legacy edges", () => {
    const manager = createManager();
    const inherited = Object.create({ inherited: "no" }) as Record<string, unknown>;
    inherited.own = "yes";

    expect(isNonArrayObject({})).toBe(true);
    expect(isNonArrayObject([])).toBe(false);
    expect(isNonArrayObject(null)).toBe(false);
    expect(createUnavailableCoreCallResult()).toEqual({ available: false, value: null });
    expect(clonePlain({ nested: { value: 1 } })).toEqual({ nested: { value: 1 } });
    expect(safeClonePlain(manager, { ok: true }, null)).toEqual({ ok: true });
    expect(safeClonePlain({ clonePlain: () => {
      throw new Error("clone failed");
    } }, { ok: false }, "fallback")).toBe("fallback");
    expect(safeClonePlain(null, { ok: false }, "fallback")).toBe("fallback");
    expect(hasOwnKey(inherited, "own")).toBe(true);
    expect(hasOwnKey(inherited, "inherited")).toBe(false);
    expect(hasOwnKey(null, "own")).toBe(false);
    expect(readOptionValue(manager, inherited, "own", "fallback")).toBe("yes");
    expect(readOptionValue(manager, inherited, "inherited", "fallback")).toBe("fallback");
    expect(readOptionValue(null, inherited, "own", "fallback")).toBe("fallback");
    expect(readOptionValue(manager, null, "own", "fallback")).toBe("fallback");
  });
});
