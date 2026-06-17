import { describe, expect, it, vi } from "vitest";

import {
  createPreAccessorManagerForwardBindings,
  createPreAccessorManagerForwardBindingsRuntime,
  installPreAccessorManagerForwardBindingsRuntime,
  type PreAccessorManagerForwardBindingsRuntime
} from "../../src/core/pre-accessor-manager-forward-bindings";

const EXPECTED_BINDING_NAMES = [
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

function createOperations() {
  return Object.fromEntries(EXPECTED_BINDING_NAMES.map((name) => [name, vi.fn()]));
}

describe("core pre-accessor manager forward bindings runtime", () => {
  it("creates the legacy pre-accessor manager-forward binding list in stable order", () => {
    const operations = createOperations();

    const bindings = createPreAccessorManagerForwardBindings(operations);

    expect(bindings.map(([name]) => name)).toEqual(EXPECTED_BINDING_NAMES);
    for (const [name, target] of bindings) {
      expect(target).toBe(operations[name as keyof typeof operations]);
    }
  });

  it("creates and installs the legacy runtime shape without replacing an existing runtime", () => {
    const runtime = createPreAccessorManagerForwardBindingsRuntime();
    expect(runtime.createPreAccessorManagerForwardBindings).toBe(
      createPreAccessorManagerForwardBindings
    );

    const windowLike: {
      CorePreAccessorManagerForwardBindingsRuntime?: PreAccessorManagerForwardBindingsRuntime;
    } = {};
    expect(installPreAccessorManagerForwardBindingsRuntime({ windowLike })).toBe(
      windowLike.CorePreAccessorManagerForwardBindingsRuntime
    );
    expect(
      windowLike.CorePreAccessorManagerForwardBindingsRuntime
        ?.createPreAccessorManagerForwardBindings
    ).toBe(createPreAccessorManagerForwardBindings);

    const existing = { createPreAccessorManagerForwardBindings: vi.fn() };
    expect(
      installPreAccessorManagerForwardBindingsRuntime({
        windowLike: {
          CorePreAccessorManagerForwardBindingsRuntime: existing
        }
      })
    ).toBe(existing);
  });
});
