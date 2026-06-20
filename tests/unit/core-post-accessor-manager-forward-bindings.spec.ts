import { describe, expect, it, vi } from "vitest";

import {
  createPostAccessorManagerForwardBindings,
  createPostAccessorManagerForwardBindingsRuntime,
  installPostAccessorManagerForwardBindingsRuntime,
  type PostAccessorManagerForwardBindingsRuntime
} from "../../src/core/post-accessor-manager-forward-bindings";

const EXPECTED_BINDING_NAMES = [
  "readOptionValue",
  "resolveUndoPolicyStateForMode",
  "getUndoStateFallbackValues",
  "normalizeUndoStackEntry",
  "createUndoTileSnapshot",
  "normalizeSpawnTable",
  "normalizeModeConfig",
  "resolveModeConfig",
  "normalizeSpecialRules",
  "getActiveMoveDirections",
  "isDirectionAllowed",
  "isStoneValue",
  "useItem",
  "updateItemModeHud",
  "updateMoveTimeoutHud"
] as const;

function createOperations() {
  return Object.fromEntries(EXPECTED_BINDING_NAMES.map((name) => [name, vi.fn()]));
}

describe("core post-accessor manager forward bindings runtime", () => {
  it("creates the legacy post-accessor manager-forward binding list in stable order", () => {
    const operations = createOperations();

    const bindings = createPostAccessorManagerForwardBindings(operations);

    expect(bindings.map(([name]) => name)).toEqual(EXPECTED_BINDING_NAMES);
    for (const [name, target] of bindings) {
      expect(target).toBe(operations[name as keyof typeof operations]);
    }
  });

  it("creates and installs the legacy runtime shape without replacing an existing runtime", () => {
    const runtime = createPostAccessorManagerForwardBindingsRuntime();
    expect(runtime.createPostAccessorManagerForwardBindings).toBe(
      createPostAccessorManagerForwardBindings
    );

    const windowLike: {
      CorePostAccessorManagerForwardBindingsRuntime?: PostAccessorManagerForwardBindingsRuntime;
    } = {};
    expect(installPostAccessorManagerForwardBindingsRuntime({ windowLike })).toBe(
      windowLike.CorePostAccessorManagerForwardBindingsRuntime
    );
    expect(
      windowLike.CorePostAccessorManagerForwardBindingsRuntime
        ?.createPostAccessorManagerForwardBindings
    ).toBe(createPostAccessorManagerForwardBindings);

    const existing = { createPostAccessorManagerForwardBindings: vi.fn() };
    expect(
      installPostAccessorManagerForwardBindingsRuntime({
        windowLike: {
          CorePostAccessorManagerForwardBindingsRuntime: existing
        }
      })
    ).toBe(existing);
  });
});
