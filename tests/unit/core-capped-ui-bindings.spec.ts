import { describe, expect, it, vi } from "vitest";

import {
  createCappedUiManagerForwardBindings,
  createCappedUiManagerForwardBindingsRuntime,
  installCappedUiManagerForwardBindingsRuntime,
  type CappedUiManagerForwardBindingsRuntime
} from "../../src/core/capped-ui-bindings";

const EXPECTED_BINDING_NAMES = [
  "setTimerRowVisibleState",
  "setCapped64RowVisible",
  "resolveProgressiveCapped64UnlockedState",
  "resetProgressiveCapped64Rows",
  "resolveCappedTargetValueOrNull",
  "getCappedTimerLegendClass",
  "getCappedTimerLegendFontSize",
  "getCappedTimerFontSize",
  "getCappedPlaceholderRowValues",
  "getCappedOverflowContainer",
  "openStatsPanel",
  "closeStatsPanel",
  "getTimerModuleViewMode",
  "applyTimerModuleView",
  "setTimerModuleViewMode"
] as const;

function createOperations() {
  return Object.fromEntries(EXPECTED_BINDING_NAMES.map((name) => [name, vi.fn()]));
}

describe("core capped UI bindings runtime", () => {
  it("creates the legacy capped UI manager-forward binding list in stable order", () => {
    const operations = createOperations();

    const bindings = createCappedUiManagerForwardBindings(operations);

    expect(bindings.map(([name]) => name)).toEqual(EXPECTED_BINDING_NAMES);
    for (const [name, target] of bindings) {
      expect(target).toBe(operations[name as keyof typeof operations]);
    }
  });

  it("creates and installs the legacy runtime shape without replacing an existing runtime", () => {
    const runtime = createCappedUiManagerForwardBindingsRuntime();
    expect(runtime.createCappedUiManagerForwardBindings).toBe(createCappedUiManagerForwardBindings);

    const windowLike: { CoreCappedUiManagerForwardBindingsRuntime?: CappedUiManagerForwardBindingsRuntime } = {};
    expect(installCappedUiManagerForwardBindingsRuntime({ windowLike })).toBe(
      windowLike.CoreCappedUiManagerForwardBindingsRuntime
    );
    expect(windowLike.CoreCappedUiManagerForwardBindingsRuntime?.createCappedUiManagerForwardBindings).toBe(
      createCappedUiManagerForwardBindings
    );

    const existing = { createCappedUiManagerForwardBindings: vi.fn() };
    expect(
      installCappedUiManagerForwardBindingsRuntime({
        windowLike: { CoreCappedUiManagerForwardBindingsRuntime: existing }
      })
    ).toBe(existing);
  });
});
