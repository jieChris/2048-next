import { describe, expect, it } from "vitest";

import {
  applyAdapterModeToPayload,
  resolveEngineAdapterMode,
  resolveEngineAdapterModePolicy
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

  it("defaults to core-adapter mode when inputs are missing or invalid", () => {
    expect(resolveEngineAdapterMode({})).toBe("core-adapter");
    expect(resolveEngineAdapterMode({ explicitMode: "invalid" })).toBe("core-adapter");
    expect(resolveEngineAdapterMode({ defaultMode: "invalid" })).toBe("core-adapter");
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

describe("bridge adapter mode: resolveEngineAdapterModePolicy", () => {
  it("reports mode source and normalized candidates", () => {
    const out = resolveEngineAdapterModePolicy({
      globalMode: "core",
      queryMode: "legacy",
      storageMode: "legacy-bridge",
      defaultMode: "legacy"
    });

    expect(out.effectiveMode).toBe("core-adapter");
    expect(out.modeSource).toBe("global");
    expect(out.globalMode).toBe("core-adapter");
    expect(out.queryMode).toBe("legacy-bridge");
    expect(out.storageMode).toBe("legacy-bridge");
    expect(out.defaultMode).toBe("legacy-bridge");
    expect(out.forceLegacyEnabled).toBe(false);
    expect(out.forceLegacySource).toBeNull();
  });

  it("tracks force-legacy source precedence across input/global/query/storage", () => {
    expect(
      resolveEngineAdapterModePolicy({
        globalForceLegacy: "1",
        queryForceLegacy: "1",
        storageForceLegacy: "1"
      }).forceLegacySource
    ).toBe("global");

    expect(
      resolveEngineAdapterModePolicy({
        queryForceLegacy: "1",
        storageForceLegacy: "1"
      }).forceLegacySource
    ).toBe("query");

    const out = resolveEngineAdapterModePolicy({
      storageForceLegacy: "1",
      defaultMode: "core-adapter"
    });
    expect(out.forceLegacySource).toBe("storage");
    expect(out.modeSource).toBe("force-legacy");
    expect(out.effectiveMode).toBe("legacy-bridge");
  });

  it("keeps explicit mode highest priority even when force-legacy flags exist", () => {
    const out = resolveEngineAdapterModePolicy({
      explicitMode: "core-adapter",
      forceLegacy: "1",
      globalMode: "legacy-bridge"
    });

    expect(out.effectiveMode).toBe("core-adapter");
    expect(out.modeSource).toBe("explicit");
    expect(out.forceLegacyEnabled).toBe(true);
    expect(out.forceLegacySource).toBe("input");
  });
});
