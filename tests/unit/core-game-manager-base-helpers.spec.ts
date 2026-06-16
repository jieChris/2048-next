import { describe, expect, it, vi } from "vitest";

import {
  applySecondaryTimerRowsState,
  collectSecondaryTimerRowsState,
  clonePlain,
  createSecondaryTimerPlacementDebugSnapshot,
  createUnavailableCoreCallResult,
  createCoreModeContextPayload,
  createCoreModeDefaultsPayload,
  getSecondaryTimerChildValues,
  getSecondaryTimerParentValues,
  hasOwnKey,
  invalidateSecondaryTimersByLimit,
  isCoreCallAvailable,
  isNonArrayObject,
  isSecondaryTimerPowerOfTwo,
  normalizeSecondaryTimerValue,
  parseSecondaryTimerRowIdentity,
  readOptionValue,
  resolveCoreBooleanCallOrFallback,
  resolveCoreNumericCallOrFallback,
  resolveCoreObjectCallOrFallback,
  resolveCoreRawCallValueOrUndefined,
  resolveCoreStringCallOrFallback,
  resolveNormalizedCoreValueOrFallback,
  resolveNormalizedCoreValueOrFallbackAllowNull,
  resolveNormalizedCoreValueOrUndefined,
  resolveSecondaryTimerIndentLevel,
  resolveSecondaryTimerLegendFontSize,
  resolveSecondaryTimerPlacementDiagnosticsIndexEntry,
  resolveSecondaryTimerPlacementDiagnosticsPayload,
  resolveSecondaryTimerPlacementDebugSummary,
  resolveSecondaryTimerPlacementDebugSummaryFromSnapshot,
  resolveSecondaryTimerRowId,
  resolveSecondaryTimerSlotByValue,
  resolveSecondaryTimerValueId,
  resolveSecondaryTimerWidthByLevel,
  safeClonePlain,
  stampSecondaryTimersForMergedValue,
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

function withTimerSlotIds<T>(slotIds: unknown[], callback: () => T): T {
  const previousGameManager = (globalThis as { GameManager?: unknown }).GameManager;
  (globalThis as { GameManager?: { TIMER_SLOT_IDS?: unknown } }).GameManager = {
    TIMER_SLOT_IDS: slotIds
  };
  try {
    return callback();
  } finally {
    (globalThis as { GameManager?: unknown }).GameManager = previousGameManager;
  }
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

  it("creates core mode default and context payloads with legacy merge order", () => {
    const previousGameManager = (globalThis as { GameManager?: unknown }).GameManager;
    (globalThis as { GameManager?: { DEFAULT_MODE_KEY: string } }).GameManager = {
      DEFAULT_MODE_KEY: "standard-default"
    };
    const manager = {
      modeKey: "current-key",
      mode: { size: 4 },
      createCoreModeDefaultsPayload: vi.fn((payload: Record<string, unknown>) =>
        createCoreModeDefaultsPayload(payload)
      )
    };

    try {
      expect(createCoreModeDefaultsPayload({ setting: true })).toEqual({
        defaultModeKey: "standard-default",
        setting: true
      });
      expect(createCoreModeDefaultsPayload({ defaultModeKey: "payload-default" })).toEqual({
        defaultModeKey: "payload-default"
      });
      expect(createCoreModeContextPayload(manager, { setting: "context" })).toEqual({
        defaultModeKey: "standard-default",
        currentModeKey: "current-key",
        currentMode: { size: 4 },
        setting: "context"
      });
      expect(manager.createCoreModeDefaultsPayload).toHaveBeenCalledWith({
        currentModeKey: "current-key",
        currentMode: { size: 4 },
        setting: "context"
      });
      expect(createCoreModeContextPayload(null, { setting: "fallback" })).toEqual({
        defaultModeKey: "standard-default",
        setting: "fallback"
      });
    } finally {
      (globalThis as { GameManager?: unknown }).GameManager = previousGameManager;
    }
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

  it("normalizes secondary timer slots, hierarchy, ids, and row identity using legacy constraints", () => {
    withTimerSlotIds([1024, 2048, 4096, 8192, 16384, 24576, "32768"], () => {
      expect(normalizeSecondaryTimerValue("2048")).toBe(2048);
      expect(normalizeSecondaryTimerValue("2048.5")).toBeNull();
      expect(normalizeSecondaryTimerValue(0)).toBeNull();
      expect(isSecondaryTimerPowerOfTwo(8192)).toBe(true);
      expect(isSecondaryTimerPowerOfTwo(24576)).toBe(false);
      expect(getSecondaryTimerParentValues()).toEqual([8192, 16384, 32768]);
      expect(getSecondaryTimerChildValues(32768)).toEqual([16384, 8192, 4096, 2048]);
      expect(getSecondaryTimerChildValues(4096)).toEqual([]);

      expect(resolveSecondaryTimerRowId(8192, 4096)).toBe("timer-row-secondary-8192-4096");
      expect(resolveSecondaryTimerValueId(8192, 4096)).toBe("timer-secondary-8192-4096");
      expect(parseSecondaryTimerRowIdentity("timer-row-secondary-8192-4096")).toEqual({
        parent: 8192,
        child: 4096
      });
      expect(parseSecondaryTimerRowIdentity("timer-row-secondary-4096-2048")).toBeNull();
      expect(resolveSecondaryTimerIndentLevel(32768, 4096)).toBe(3);
      expect(resolveSecondaryTimerLegendFontSize(16384)).toBe("11px");
      expect(resolveSecondaryTimerLegendFontSize(512)).toBe("18px");
      expect(resolveSecondaryTimerWidthByLevel(3)).toBe(172);
      expect(resolveSecondaryTimerWidthByLevel(99)).toBe(150);
    });
  });

  it("resolves secondary timer slots from milestone maps before slot and milestone fallback", () => {
    withTimerSlotIds([2048, 4096, 8192, 16384], () => {
      expect(resolveSecondaryTimerSlotByValue({ timerMilestoneSlotByValue: { "13": 8192 } }, 13)).toBe(8192);
      expect(resolveSecondaryTimerSlotByValue({ timerMilestones: [3, 5, 7, 11] }, 7)).toBe(8192);
      expect(resolveSecondaryTimerSlotByValue({ timerMilestones: [3, 5, 7, 11] }, 4096)).toBe(4096);
      expect(resolveSecondaryTimerSlotByValue({}, "bad")).toBeNull();
    });
  });

  it("summarizes and gates secondary timer placement diagnostics using legacy defaults", () => {
    const snapshot = createSecondaryTimerPlacementDebugSnapshot(4);
    snapshot.validPlacementDescriptors = 3;
    snapshot.placed = 2;
    snapshot.skippedDuplicate = 1;
    snapshot.dedupeKeyHits["row-id:8192:timer-row-secondary-8192-4096"] = 2;
    snapshot.dedupeKeyHits["parent-child:8192:4096"] = 1;
    snapshot.dedupeStrategyHits["row-id"] = 2;
    snapshot.dedupeStrategyHits["parent-child"] = 1;

    expect(resolveSecondaryTimerPlacementDebugSummaryFromSnapshot(snapshot)).toEqual({
      totalDescriptors: 4,
      validPlacementDescriptors: 3,
      placed: 2,
      skippedDuplicate: 1,
      skippedMissingAnchor: 0,
      dedupeKeyKinds: 2,
      rowIdStrategyHits: 2,
      parentChildStrategyHits: 1,
      rowReferenceStrategyHits: 0
    });

    const manager = { secondaryTimerPlacementDebugSnapshot: snapshot };
    expect(resolveSecondaryTimerPlacementDebugSummary(manager)).toMatchObject({
      validPlacementDescriptors: 3,
      placed: 2
    });
    expect(resolveSecondaryTimerPlacementDiagnosticsPayload(manager, { failed: false })).toBeNull();
    expect(
      resolveSecondaryTimerPlacementDiagnosticsPayload(manager, {
        failed: true,
        maxDedupeKeys: 2
      })
    ).toMatchObject({
      totalDescriptors: 4,
      validPlacementDescriptors: 3,
      dedupeKeySamples: ["row-id:8192:timer-row-secondary-8192-4096#2", "parent-child:8192:4096#1"]
    });
    expect(resolveSecondaryTimerPlacementDiagnosticsIndexEntry(manager, { failed: true })).toMatchObject({
      key: "secondaryTimerPlacement",
      schemaVersion: 1
    });
  });

  it("collects, applies, stamps, and invalidates secondary timer row state through descriptors", () => {
    const row = {
      style: { display: "block" },
      removeAttribute: vi.fn(),
      setAttribute: vi.fn()
    };
    const timerEl = { textContent: "1.000" };
    const descriptors = [{ parent: 8192, child: 4096, row, timerEl }];
    const manager = {
      elements: {
        timer8192: { textContent: "parent reached" }
      },
      secondaryTimerExpandedByParent: { "8192": true },
      resolveSecondaryTimerDescriptors: vi.fn(() => descriptors),
      callWindowMethod: vi.fn(() => true)
    };

    expect(collectSecondaryTimerRowsState(manager)).toEqual([
      {
        parent: 8192,
        child: 4096,
        time: "1.000",
        display: "block"
      }
    ]);

    applySecondaryTimerRowsState(manager, [
      {
        parent: 8192,
        child: 4096,
        duration_ms: 65001
      }
    ]);
    expect(timerEl.textContent).toBe("1:05.001");
    expect(manager.callWindowMethod).toHaveBeenCalledWith("updateTimerScroll", undefined);

    timerEl.textContent = "";
    stampSecondaryTimersForMergedValue(manager, 4096, "2.000");
    expect(timerEl.textContent).toBe("2.000");
    expect(manager.callWindowMethod).toHaveBeenCalledTimes(2);

    expect(invalidateSecondaryTimersByLimit(manager, 8192, "DNF")).toBe(true);
    expect(timerEl.textContent).toBe("DNF");
    expect(manager.callWindowMethod).toHaveBeenCalledTimes(3);
  });
});
