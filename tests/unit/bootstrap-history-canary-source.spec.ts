import { describe, expect, it } from "vitest";

import {
  resolveHistoryCanaryRuntimePolicy,
  resolveHistoryCanaryRuntimeStoredPolicyKeys
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

  it("returns null when runtime helper is missing or invalid", () => {
    expect(resolveHistoryCanaryRuntimePolicy(null)).toBeNull();
    expect(resolveHistoryCanaryRuntimePolicy({ resolveAdapterModePolicy: () => 1 })).toBeNull();
    expect(resolveHistoryCanaryRuntimeStoredPolicyKeys({})).toBeNull();
    expect(
      resolveHistoryCanaryRuntimeStoredPolicyKeys({ readStoredAdapterPolicyKeys: () => "bad" })
    ).toBeNull();
  });
});
