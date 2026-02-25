import { describe, expect, it } from "vitest";

import {
  resolveHistoryCanaryPolicyAndStoredState,
  resolveHistoryCanaryPolicySnapshotInput,
  resolveHistoryCanaryRuntimePolicy,
  resolveHistoryCanaryRuntimeStoredPolicyKeys,
  resolveHistoryCanaryStoredPolicyInput
} from "../../src/bootstrap/history-canary-source";

describe("bootstrap history canary source", () => {
  it("reads runtime policy when resolver is available", () => {
    const runtime = {
      resolveAdapterModePolicy: () => ({ mode: "core", forceLegacy: false })
    };

    expect(resolveHistoryCanaryRuntimePolicy(runtime)).toEqual({
      mode: "core",
      forceLegacy: false
    });
  });

  it("reads runtime stored keys when reader is available", () => {
    const runtime = {
      readStoredAdapterPolicyKeys: () => ({
        adapterModeRaw: "core",
        defaultModeRaw: "core",
        forceLegacyRaw: "0"
      })
    };

    expect(resolveHistoryCanaryRuntimeStoredPolicyKeys(runtime)).toEqual({
      adapterModeRaw: "core",
      defaultModeRaw: "core",
      forceLegacyRaw: "0"
    });
  });

  it("builds canary policy snapshot and stored policy inputs from runtime and storage reader", () => {
    const runtime = {
      resolveAdapterModePolicy: () => ({ mode: "core", forceLegacy: false }),
      readStoredAdapterPolicyKeys: () => ({
        adapterModeRaw: "legacy",
        defaultModeRaw: "core",
        forceLegacyRaw: "0"
      })
    };
    const readStorageValue = (key: unknown) =>
      ({
        engine_adapter_mode: "core-adapter",
        engine_adapter_default_mode: "legacy-bridge",
        engine_adapter_force_legacy: "1"
      } as Record<string, string>)[String(key)] || null;

    expect(
      resolveHistoryCanaryPolicySnapshotInput({
        runtime,
        readStorageValue,
        defaultModeStorageKey: "engine_adapter_default_mode",
        forceLegacyStorageKey: "engine_adapter_force_legacy"
      })
    ).toEqual({
      runtimePolicy: { mode: "core", forceLegacy: false },
      defaultModeRaw: "legacy-bridge",
      forceLegacyRaw: "1"
    });

    expect(
      resolveHistoryCanaryStoredPolicyInput({
        runtime,
        readStorageValue,
        adapterModeStorageKey: "engine_adapter_mode",
        defaultModeStorageKey: "engine_adapter_default_mode",
        forceLegacyStorageKey: "engine_adapter_force_legacy"
      })
    ).toEqual({
      runtimeStoredKeys: {
        adapterModeRaw: "legacy",
        defaultModeRaw: "core",
        forceLegacyRaw: "0"
      },
      adapterModeRaw: "core-adapter",
      defaultModeRaw: "legacy-bridge",
      forceLegacyRaw: "1"
    });
  });

  it("returns null when runtime helper is missing or invalid", () => {
    expect(resolveHistoryCanaryRuntimePolicy(null)).toBeNull();
    expect(resolveHistoryCanaryRuntimePolicy({ resolveAdapterModePolicy: () => 1 })).toBeNull();
    expect(resolveHistoryCanaryRuntimeStoredPolicyKeys({})).toBeNull();
    expect(
      resolveHistoryCanaryRuntimeStoredPolicyKeys({ readStoredAdapterPolicyKeys: () => "bad" })
    ).toBeNull();
  });

  it("resolves policy and stored state via injected resolvers", () => {
    const state = resolveHistoryCanaryPolicyAndStoredState({
      runtime: {
        resolveAdapterModePolicy: () => ({ effectiveMode: "core-adapter" }),
        readStoredAdapterPolicyKeys: () => ({ adapterModeRaw: "core-adapter" })
      },
      readStorageValue(key: unknown) {
        if (String(key) === "engine_adapter_default_mode") return "core-adapter";
        if (String(key) === "engine_adapter_force_legacy") return "0";
        if (String(key) === "engine_adapter_mode") return "core-adapter";
        return null;
      },
      adapterModeStorageKey: "engine_adapter_mode",
      defaultModeStorageKey: "engine_adapter_default_mode",
      forceLegacyStorageKey: "engine_adapter_force_legacy",
      resolvePolicySnapshot(input: unknown) {
        return { kind: "policy", input };
      },
      resolveStoredPolicy(input: unknown) {
        return { kind: "stored", input };
      }
    });

    expect(state).toEqual({
      policy: {
        kind: "policy",
        input: {
          runtimePolicy: { effectiveMode: "core-adapter" },
          defaultModeRaw: "core-adapter",
          forceLegacyRaw: "0"
        }
      },
      stored: {
        kind: "stored",
        input: {
          runtimeStoredKeys: { adapterModeRaw: "core-adapter" },
          adapterModeRaw: "core-adapter",
          defaultModeRaw: "core-adapter",
          forceLegacyRaw: "0"
        }
      }
    });
  });
});
