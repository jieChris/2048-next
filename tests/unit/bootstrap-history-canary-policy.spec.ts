import { describe, expect, it } from "vitest";

import {
  resolveCanaryPolicyActionNotice,
  resolveCanaryPolicyActionPlan,
  resolveCanaryPolicySnapshot,
  resolveStoredPolicyKeys
} from "../../src/bootstrap/history-canary-policy";

describe("bootstrap history canary policy", () => {
  it("uses runtime policy snapshot when provided and sanitizes values", () => {
    const snapshot = resolveCanaryPolicySnapshot({
      runtimePolicy: {
        effectiveMode: "core-adapter",
        modeSource: "default",
        forceLegacyEnabled: false,
        forceLegacySource: null,
        explicitMode: "core-adapter",
        globalMode: "legacy-bridge",
        queryMode: "invalid",
        storageMode: "legacy",
        defaultMode: "core"
      }
    });

    expect(snapshot).toEqual({
      effectiveMode: "core-adapter",
      modeSource: "default",
      forceLegacyEnabled: false,
      forceLegacySource: null,
      explicitMode: "core-adapter",
      globalMode: "legacy-bridge",
      queryMode: null,
      storageMode: "legacy-bridge",
      defaultMode: "core-adapter"
    });
  });

  it("falls back to force-legacy policy from storage values", () => {
    const snapshot = resolveCanaryPolicySnapshot({
      defaultModeRaw: "core-adapter",
      forceLegacyRaw: "1"
    });

    expect(snapshot.effectiveMode).toBe("legacy-bridge");
    expect(snapshot.modeSource).toBe("force-legacy");
    expect(snapshot.forceLegacyEnabled).toBe(true);
    expect(snapshot.forceLegacySource).toBe("storage");
    expect(snapshot.defaultMode).toBe("core-adapter");
  });

  it("falls back to core-adapter when storage policy is empty", () => {
    const snapshot = resolveCanaryPolicySnapshot({});
    expect(snapshot.effectiveMode).toBe("core-adapter");
    expect(snapshot.modeSource).toBe("fallback");
    expect(snapshot.forceLegacyEnabled).toBe(false);
  });

  it("reads stored policy keys from runtime output with string-only contract", () => {
    const keys = resolveStoredPolicyKeys({
      runtimeStoredKeys: {
        adapterMode: "core-adapter",
        defaultMode: "legacy-bridge",
        forceLegacy: 1
      }
    });

    expect(keys).toEqual({
      adapterMode: "core-adapter",
      defaultMode: "legacy-bridge",
      forceLegacy: null
    });
  });

  it("builds canary action plans and notices", () => {
    expect(resolveCanaryPolicyActionPlan("apply_canary")).toEqual({
      isSupported: true,
      defaultMode: "core-adapter",
      forceLegacy: false
    });
    expect(resolveCanaryPolicyActionPlan("reset_policy")).toEqual({
      isSupported: true,
      defaultMode: null,
      forceLegacy: false
    });
    expect(resolveCanaryPolicyActionPlan("unknown")).toEqual({
      isSupported: false,
      defaultMode: undefined,
      forceLegacy: undefined
    });

    expect(resolveCanaryPolicyActionNotice("emergency_rollback")).toBe(
      "已开启强制回滚：legacy-bridge"
    );
    expect(resolveCanaryPolicyActionNotice("unknown")).toBe("策略已更新");
  });
});
