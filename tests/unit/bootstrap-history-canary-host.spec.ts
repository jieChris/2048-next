import { describe, expect, it, vi } from "vitest";

import {
  applyHistoryCanaryPanelClickAction,
  resolveHistoryCanaryPanelRenderState
} from "../../src/bootstrap/history-canary-host";

describe("bootstrap history canary host", () => {
  it("resolves canary panel html through source/view/panel runtimes", () => {
    const resolveHistoryCanaryPolicyAndStoredState = vi.fn(() => ({
      policy: { effectiveMode: "core-adapter" },
      stored: { defaultMode: "core-adapter" }
    }));
    const resolveHistoryCanaryViewState = vi.fn(() => ({
      gateText: "core-adapter 生效"
    }));
    const resolveHistoryCanaryPanelHtml = vi.fn(() => "<div>panel</div>");

    const state = resolveHistoryCanaryPanelRenderState({
      runtime: { id: "runtime" },
      readStorageValue: () => null,
      adapterModeStorageKey: "engine_adapter_mode",
      defaultModeStorageKey: "engine_adapter_default_mode",
      forceLegacyStorageKey: "engine_adapter_force_legacy",
      historyCanarySourceRuntime: {
        resolveHistoryCanaryPolicyAndStoredState
      },
      historyCanaryPolicyRuntime: {
        resolveCanaryPolicySnapshot: () => ({}),
        resolveStoredPolicyKeys: () => ({})
      },
      historyCanaryViewRuntime: {
        resolveHistoryCanaryViewState
      },
      historyCanaryPanelRuntime: {
        resolveHistoryCanaryPanelHtml
      }
    });

    expect(resolveHistoryCanaryPolicyAndStoredState).toHaveBeenCalledTimes(1);
    expect(resolveHistoryCanaryViewState).toHaveBeenCalledWith(
      { effectiveMode: "core-adapter" },
      { defaultMode: "core-adapter" }
    );
    expect(state.panelHtml).toBe("<div>panel</div>");
  });

  it("applies canary panel click action through canary action runtime", () => {
    const applyHistoryCanaryPanelAction = vi.fn(() => ({
      shouldReload: true,
      reloadResetPage: false,
      statusText: "策略已更新",
      isError: false
    }));

    const result = applyHistoryCanaryPanelClickAction({
      target: { id: "btn" },
      runtime: { id: "runtime" },
      writeStorageValue: () => true,
      defaultModeStorageKey: "engine_adapter_default_mode",
      forceLegacyStorageKey: "engine_adapter_force_legacy",
      historyCanaryActionRuntime: {
        applyHistoryCanaryPanelAction,
        resolveHistoryCanaryPolicyUpdateFailureNotice: () => "策略更新失败"
      },
      historyCanaryPanelRuntime: {
        resolveHistoryCanaryActionName: () => "apply_canary"
      },
      historyCanaryPolicyRuntime: {
        resolveCanaryPolicyActionNotice: () => "策略已更新",
        resolveCanaryPolicyActionPlan: () => ({ isSupported: true })
      }
    });

    expect(applyHistoryCanaryPanelAction).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      shouldReload: true,
      reloadResetPage: false,
      statusText: "策略已更新",
      isError: false
    });
  });

  it("returns noop feedback when canary click dependencies are missing", () => {
    const result = applyHistoryCanaryPanelClickAction({});
    expect(result).toEqual({
      shouldReload: false,
      reloadResetPage: false,
      statusText: "",
      isError: false
    });
  });
});
