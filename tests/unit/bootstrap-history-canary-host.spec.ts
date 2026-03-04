import { describe, expect, it, vi } from "vitest";

import {
  applyHistoryCanaryPanelRender,
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

  it("applies canary panel render and binds canary action buttons", () => {
    const clickHandlers: Array<(event?: unknown) => void> = [];
    function createButton() {
      return {
        addEventListener(_name: string, cb: (event?: unknown) => void) {
          clickHandlers.push(cb);
        }
      };
    }
    const buttonA = createButton();
    const buttonB = createButton();
    const panelElement = {
      innerHTML: "",
      querySelectorAll(selector: string) {
        return selector === ".history-canary-action-btn" ? [buttonA, buttonB] : [];
      }
    };
    const loadHistory = vi.fn();
    const setStatus = vi.fn();

    const result = applyHistoryCanaryPanelRender({
      panelElement,
      runtime: {},
      readStorageValue: () => null,
      adapterModeStorageKey: "engine_adapter_mode",
      defaultModeStorageKey: "engine_adapter_default_mode",
      forceLegacyStorageKey: "engine_adapter_force_legacy",
      historyCanarySourceRuntime: {
        resolveHistoryCanaryPolicyAndStoredState: () => ({
          policy: {},
          stored: {}
        })
      },
      historyCanaryPolicyRuntime: {
        resolveCanaryPolicySnapshot: () => ({}),
        resolveStoredPolicyKeys: () => ({}),
        resolveCanaryPolicyActionNotice: () => "",
        resolveCanaryPolicyActionPlan: () => ({})
      },
      historyCanaryViewRuntime: {
        resolveHistoryCanaryViewState: () => ({})
      },
      historyCanaryPanelRuntime: {
        resolveHistoryCanaryPanelHtml: () =>
          "<button class='history-canary-action-btn' data-action='enter_canary'></button>",
        resolveHistoryCanaryActionName: () => "enter_canary"
      },
      writeStorageValue: () => true,
      historyCanaryActionRuntime: {
        applyHistoryCanaryPanelAction: () => ({
          shouldReload: true,
          reloadResetPage: false,
          statusText: "ok",
          isError: false
        }),
        resolveHistoryCanaryPolicyUpdateFailureNotice: () => "failed"
      },
      loadHistory,
      setStatus
    });

    expect(result).toEqual({
      didRender: true,
      boundButtonCount: 2
    });
    expect(panelElement.innerHTML).toContain("history-canary-action-btn");
    clickHandlers[0]({ currentTarget: buttonA });
    expect(loadHistory).toHaveBeenCalledWith(false);
    expect(setStatus).toHaveBeenCalledWith("ok", false);
  });

  it("does not overwrite status when click feedback is empty", () => {
    const clickHandlers: Array<(event?: unknown) => void> = [];
    const button = {
      addEventListener(_name: string, cb: (event?: unknown) => void) {
        clickHandlers.push(cb);
      }
    };
    const panelElement = {
      innerHTML: "",
      querySelectorAll(selector: string) {
        return selector === ".history-canary-action-btn" ? [button] : [];
      }
    };
    const setStatus = vi.fn();
    const loadHistory = vi.fn();

    applyHistoryCanaryPanelRender({
      panelElement,
      runtime: {},
      readStorageValue: () => null,
      adapterModeStorageKey: "engine_adapter_mode",
      defaultModeStorageKey: "engine_adapter_default_mode",
      forceLegacyStorageKey: "engine_adapter_force_legacy",
      historyCanarySourceRuntime: {
        resolveHistoryCanaryPolicyAndStoredState: () => ({ policy: {}, stored: {} })
      },
      historyCanaryPolicyRuntime: {
        resolveCanaryPolicySnapshot: () => ({}),
        resolveStoredPolicyKeys: () => ({}),
        resolveCanaryPolicyActionNotice: () => "",
        resolveCanaryPolicyActionPlan: () => ({ isSupported: false })
      },
      historyCanaryViewRuntime: {
        resolveHistoryCanaryViewState: () => ({})
      },
      historyCanaryPanelRuntime: {
        resolveHistoryCanaryPanelHtml: () =>
          "<button class='history-canary-action-btn' data-action='unsupported'></button>",
        resolveHistoryCanaryActionName: () => "unsupported"
      },
      historyCanaryActionRuntime: {
        applyHistoryCanaryPanelAction: () => ({
          shouldReload: false,
          reloadResetPage: false,
          statusText: "",
          isError: false
        }),
        resolveHistoryCanaryPolicyUpdateFailureNotice: () => "failed"
      },
      writeStorageValue: () => true,
      loadHistory,
      setStatus
    });

    clickHandlers[0]({ currentTarget: button });
    expect(loadHistory).not.toHaveBeenCalled();
    expect(setStatus).not.toHaveBeenCalled();
  });
});
