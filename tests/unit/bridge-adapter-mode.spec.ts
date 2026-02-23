import { describe, expect, it } from "vitest";

import {
  applyAdapterModeToPayload,
  resolveEngineAdapterMode
} from "../../src/bridge/adapter-mode";

describe("bridge adapter mode: resolveEngineAdapterMode", () => {
  it("uses explicit mode first when provided", () => {
    expect(
      resolveEngineAdapterMode({
        explicitMode: "core-adapter",
        globalMode: "legacy-bridge",
        queryMode: "legacy",
        storageMode: "legacy"
      })
    ).toBe("core-adapter");
  });

  it("falls back through global, query, then storage", () => {
    expect(resolveEngineAdapterMode({ globalMode: "core" })).toBe("core-adapter");
    expect(resolveEngineAdapterMode({ queryMode: "core-adapter" })).toBe("core-adapter");
    expect(resolveEngineAdapterMode({ storageMode: "legacy" })).toBe("legacy-bridge");
  });

  it("supports configurable default mode when explicit overrides are absent", () => {
    expect(resolveEngineAdapterMode({ defaultMode: "core-adapter" })).toBe("core-adapter");
    expect(resolveEngineAdapterMode({ defaultMode: "legacy" })).toBe("legacy-bridge");
  });

  it("applies force legacy rollback switch before non-explicit mode sources", () => {
    expect(
      resolveEngineAdapterMode({
        forceLegacy: true,
        globalMode: "core-adapter",
        queryMode: "core-adapter",
        storageMode: "core-adapter",
        defaultMode: "core-adapter"
      })
    ).toBe("legacy-bridge");
    expect(
      resolveEngineAdapterMode({
        forceLegacy: "1",
        queryMode: "core-adapter"
      })
    ).toBe("legacy-bridge");
  });

  it("defaults to legacy mode when inputs are missing or invalid", () => {
    expect(resolveEngineAdapterMode({})).toBe("legacy-bridge");
    expect(resolveEngineAdapterMode({ explicitMode: "invalid" })).toBe("legacy-bridge");
    expect(resolveEngineAdapterMode({ defaultMode: "invalid" })).toBe("legacy-bridge");
  });
});

describe("bridge adapter mode: applyAdapterModeToPayload", () => {
  it("writes adapter mode onto legacy engine payload", () => {
    const payload = { modeKey: "standard_4x4_pow2_no_undo" };
    const out = applyAdapterModeToPayload(payload, "core-adapter");
    expect(out).toBe(payload);
    expect(payload.adapterMode).toBe("core-adapter");
  });
});
