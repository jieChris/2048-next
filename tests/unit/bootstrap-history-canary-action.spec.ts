import { describe, expect, it } from "vitest";

import {
  applyHistoryCanaryPolicyActionByNameWithFeedback,
  applyHistoryCanaryPolicyActionByName,
  applyHistoryCanaryPolicyAction,
  resolveHistoryCanaryPolicyApplyFeedbackState,
  resolveHistoryCanaryPolicyUpdateFailureNotice
} from "../../src/bootstrap/history-canary-action";

describe("bootstrap history canary action", () => {
  it("returns false for unsupported action plan", () => {
    expect(
      applyHistoryCanaryPolicyAction({
        actionPlan: { isSupported: false },
        runtime: {},
        writeStorageValue: () => true,
        defaultModeStorageKey: "engine_adapter_default_mode",
        forceLegacyStorageKey: "engine_adapter_force_legacy"
      })
    ).toBe(false);
  });

  it("applies via runtime APIs when available", () => {
    const calls: string[] = [];
    const runtime = {
      setStoredAdapterDefaultMode(mode: unknown) {
        calls.push("set:" + String(mode));
        return true;
      },
      setStoredForceLegacy(enabled: boolean) {
        calls.push("force:" + String(enabled));
        return true;
      }
    };

    const ok = applyHistoryCanaryPolicyAction({
      actionPlan: {
        isSupported: true,
        defaultMode: "core-adapter",
        forceLegacy: false
      },
      runtime,
      writeStorageValue: () => false,
      defaultModeStorageKey: "engine_adapter_default_mode",
      forceLegacyStorageKey: "engine_adapter_force_legacy"
    });

    expect(ok).toBe(true);
    expect(calls).toEqual(["set:core-adapter", "force:false"]);
  });

  it("falls back to storage writer and supports clear default mode", () => {
    const writes: Array<{ key: string; value: unknown }> = [];
    const ok = applyHistoryCanaryPolicyAction({
      actionPlan: {
        isSupported: true,
        defaultMode: null,
        forceLegacy: true
      },
      runtime: null,
      writeStorageValue(key: string, value: unknown) {
        writes.push({ key, value });
        return true;
      },
      defaultModeStorageKey: "engine_adapter_default_mode",
      forceLegacyStorageKey: "engine_adapter_force_legacy"
    });

    expect(ok).toBe(true);
    expect(writes).toEqual([
      { key: "engine_adapter_default_mode", value: null },
      { key: "engine_adapter_force_legacy", value: "1" }
    ]);
  });

  it("applies by action name when resolver is available", () => {
    const calls: string[] = [];
    const runtime = {
      setStoredAdapterDefaultMode(mode: unknown) {
        calls.push("set:" + String(mode));
        return true;
      },
      setStoredForceLegacy(enabled: boolean) {
        calls.push("force:" + String(enabled));
        return true;
      }
    };
    const ok = applyHistoryCanaryPolicyActionByName({
      actionName: "force_legacy_on",
      resolveActionPlan(name: string) {
        if (name !== "force_legacy_on") return { isSupported: false };
        return { isSupported: true, defaultMode: "legacy-bridge", forceLegacy: true };
      },
      runtime,
      writeStorageValue: () => false,
      defaultModeStorageKey: "engine_adapter_default_mode",
      forceLegacyStorageKey: "engine_adapter_force_legacy"
    });

    expect(ok).toBe(true);
    expect(calls).toEqual(["set:legacy-bridge", "force:true"]);
  });

  it("returns false when apply-by-name resolver is missing", () => {
    expect(
      applyHistoryCanaryPolicyActionByName({
        actionName: "reset_policy",
        resolveActionPlan: null,
        runtime: {},
        writeStorageValue: () => true,
        defaultModeStorageKey: "engine_adapter_default_mode",
        forceLegacyStorageKey: "engine_adapter_force_legacy"
      })
    ).toBe(false);
  });

  it("provides failure notice text", () => {
    expect(resolveHistoryCanaryPolicyUpdateFailureNotice()).toBe(
      "策略更新失败：请检查浏览器本地存储权限"
    );
  });

  it("resolves apply feedback state", () => {
    expect(
      resolveHistoryCanaryPolicyApplyFeedbackState({
        ok: true,
        successNotice: "策略已更新",
        failureNotice: "失败"
      })
    ).toEqual({
      shouldReload: true,
      reloadResetPage: false,
      statusText: "策略已更新",
      isError: false
    });

    expect(
      resolveHistoryCanaryPolicyApplyFeedbackState({
        ok: false,
        successNotice: "策略已更新",
        failureNotice: "失败"
      })
    ).toEqual({
      shouldReload: false,
      reloadResetPage: false,
      statusText: "失败",
      isError: true
    });
  });

  it("applies by name and returns feedback in one step", () => {
    const state = applyHistoryCanaryPolicyActionByNameWithFeedback({
      actionName: "reset_policy",
      resolveActionPlan() {
        return {
          isSupported: true,
          defaultMode: null,
          forceLegacy: false
        };
      },
      runtime: null,
      writeStorageValue() {
        return true;
      },
      defaultModeStorageKey: "engine_adapter_default_mode",
      forceLegacyStorageKey: "engine_adapter_force_legacy",
      successNotice: "策略已更新",
      failureNotice: "失败"
    });

    expect(state).toEqual({
      shouldReload: true,
      reloadResetPage: false,
      statusText: "策略已更新",
      isError: false
    });
  });
});
