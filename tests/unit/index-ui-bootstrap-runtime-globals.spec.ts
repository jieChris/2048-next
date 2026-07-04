import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("index-ui-bootstrap runtime globals", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("merges runtime exports into existing window globals and calls through them", async () => {
    const runtimeContractTarget: Record<string, unknown> = {};
    const pageHostTarget: Record<string, unknown> = {};
    const applyIndexUiPageBootstrap = vi.fn();
    const installHomeGuideRuntime = vi.fn();
    const installHomeGuideControlsHostRuntime = vi.fn();
    const installHomeGuideDomHostRuntime = vi.fn();
    const installHomeGuideDoneNoticeHostRuntime = vi.fn();
    const installHomeGuideFinishHostRuntime = vi.fn();
    const installHomeGuideHighlightHostRuntime = vi.fn();
    const installHomeGuidePageHostRuntime = vi.fn();
    const installHomeGuidePanelHostRuntime = vi.fn();
    const installHomeGuideSettingsHostRuntime = vi.fn();
    const installHomeGuideStartHostRuntime = vi.fn();
    const installHomeGuideStartupHostRuntime = vi.fn();
    const installHomeGuideStepFlowHostRuntime = vi.fn();
    const installHomeGuideStepHostRuntime = vi.fn();
    const installHomeGuideStepViewHostRuntime = vi.fn();
    const installIndexUiStartupHostRuntime = vi.fn();
    const installReplayExportRuntime = vi.fn();
    const installReplayModalRuntime = vi.fn();
    const installReplayPageHostRuntime = vi.fn();
    const installSettingsModalHostRuntime = vi.fn();
    const installSettingsModalPageHostRuntime = vi.fn();
    const createIndexUiTryUndoHandler = vi.fn(() => vi.fn(() => false));
    const createIndexUiBootstrapResolvers = vi.fn(() => ({
      autoStartHomeGuideIfNeeded: vi.fn(),
      closeReplayModal: vi.fn(),
      closeSettingsModal: vi.fn(),
      exportReplay: vi.fn(),
      initHomeGuideSettingsUI: vi.fn(),
      initMobileHintToggle: vi.fn(),
      initMobileTimerboxToggle: vi.fn(),
      initMobileUndoTopButton: vi.fn(),
      initThemeSettingsUI: vi.fn(),
      initTimerModuleSettingsUI: vi.fn(),
      openPracticeBoardFromCurrent: vi.fn(),
      openSettingsModal: vi.fn(),
      removeLegacyUndoSettingsUI: vi.fn(),
      requestResponsiveGameRelayout: vi.fn(),
      syncMobileHintUI: vi.fn(),
      syncMobileTimerboxUI: vi.fn(),
      syncMobileUndoTopButtonAvailability: vi.fn()
    }));
    const runtimeContractProxy = new Proxy(runtimeContractTarget, {
      set(target, prop, value) {
        if (prop === "resolveIndexUiRuntimeContractsCompat" && typeof value === "function") {
          target[prop] = function (runtimeLike: unknown, windowLike: unknown) {
            windowRecord.__indexUiRuntimeContractCalls =
              Number(windowRecord.__indexUiRuntimeContractCalls || 0) + 1;
            return (value as (runtimeLike: unknown, windowLike: unknown) => unknown)(
              runtimeLike,
              windowLike
            );
          };
          return true;
        }
        target[prop] = value;
        return true;
      }
    });
    const pageHostProxy = new Proxy(pageHostTarget, {
      set(target, prop, value) {
        if (prop === "createIndexUiTryUndoHandler" && typeof value === "function") {
          target[prop] = function (input: unknown) {
            windowRecord.__indexUiTryUndoCalls = Number(windowRecord.__indexUiTryUndoCalls || 0) + 1;
            return (value as (input: unknown) => unknown)(input);
          };
          return true;
        }
        if (prop === "applyIndexUiPageBootstrap" && typeof value === "function") {
          target[prop] = function (input: unknown) {
            windowRecord.__indexUiPageBootstrapCalls =
              Number(windowRecord.__indexUiPageBootstrapCalls || 0) + 1;
            return (value as (input: unknown) => unknown)(input);
          };
          return true;
        }
        target[prop] = value;
        return true;
      }
    });
    const windowRecord: Record<string, unknown> = {
      CoreIndexUiPageHostRuntime: pageHostProxy,
      CoreIndexUiRuntimeContractRuntime: runtimeContractProxy
    };

    vi.stubGlobal("document", {});
    vi.stubGlobal("window", windowRecord);
    vi.doMock("../../src/bootstrap/home-guide", () => ({ installHomeGuideRuntime }));
    vi.doMock("../../src/bootstrap/home-guide-controls-host", () => ({
      installHomeGuideControlsHostRuntime
    }));
    vi.doMock("../../src/bootstrap/home-guide-dom-host", () => ({ installHomeGuideDomHostRuntime }));
    vi.doMock("../../src/bootstrap/home-guide-done-notice-host", () => ({
      installHomeGuideDoneNoticeHostRuntime
    }));
    vi.doMock("../../src/bootstrap/home-guide-finish-host", () => ({
      installHomeGuideFinishHostRuntime
    }));
    vi.doMock("../../src/bootstrap/home-guide-highlight-host", () => ({
      installHomeGuideHighlightHostRuntime
    }));
    vi.doMock("../../src/bootstrap/home-guide-page-host", () => ({
      installHomeGuidePageHostRuntime
    }));
    vi.doMock("../../src/bootstrap/home-guide-panel-host", () => ({
      installHomeGuidePanelHostRuntime
    }));
    vi.doMock("../../src/bootstrap/home-guide-settings-host", () => ({
      installHomeGuideSettingsHostRuntime
    }));
    vi.doMock("../../src/bootstrap/home-guide-start-host", () => ({
      installHomeGuideStartHostRuntime
    }));
    vi.doMock("../../src/bootstrap/home-guide-startup-host", () => ({
      installHomeGuideStartupHostRuntime
    }));
    vi.doMock("../../src/bootstrap/home-guide-step-flow-host", () => ({
      installHomeGuideStepFlowHostRuntime
    }));
    vi.doMock("../../src/bootstrap/home-guide-step-host", () => ({ installHomeGuideStepHostRuntime }));
    vi.doMock("../../src/bootstrap/home-guide-step-view-host", () => ({
      installHomeGuideStepViewHostRuntime
    }));
    vi.doMock("../../src/bootstrap/index-ui-startup-host", () => ({
      installIndexUiStartupHostRuntime
    }));
    vi.doMock("../../src/bootstrap/replay-export", () => ({ installReplayExportRuntime }));
    vi.doMock("../../src/bootstrap/replay-modal", () => ({ installReplayModalRuntime }));
    vi.doMock("../../src/bootstrap/replay-page-host", () => ({ installReplayPageHostRuntime }));
    vi.doMock("../../src/bootstrap/settings-modal-host", () => ({
      installSettingsModalHostRuntime
    }));
    vi.doMock("../../src/bootstrap/settings-modal-page-host", () => ({
      installSettingsModalPageHostRuntime
    }));
    vi.doMock("../../src/bootstrap/index-ui-runtime-contract", () => ({
      resolveIndexUiRuntimeContractsCompat: vi.fn(() => ({
        coreContracts: {
          gameOverUndoHostRuntime: {},
          indexUiPageActionsHostRuntime: {},
          indexUiPageHostRuntime: pageHostProxy,
          indexUiPageResolversHostRuntime: {},
          indexUiStartupHostRuntime: {},
          prettyTimeRuntime: {},
          topActionBindingsHostRuntime: {},
          undoActionRuntime: {}
        },
        homeGuideContracts: {},
        modalContracts: {}
      }))
    }));
    vi.doMock("../../src/bootstrap/index-ui-page-host", () => ({
      applyIndexUiPageBootstrap,
      createIndexUiBootstrapResolvers,
      createIndexUiTryUndoHandler
    }));

    const { applyIndexUiBootstrapFromTsRuntime } = await import(
      "../../src/entries/index-ui-bootstrap"
    );

    applyIndexUiBootstrapFromTsRuntime();

    expect(windowRecord.CoreIndexUiRuntimeContractRuntime).toBe(runtimeContractProxy);
    expect(windowRecord.CoreIndexUiPageHostRuntime).toBe(pageHostProxy);
    expect(windowRecord.__indexUiRuntimeContractCalls).toBe(1);
    expect(windowRecord.__indexUiTryUndoCalls).toBe(1);
    expect(windowRecord.__indexUiPageBootstrapCalls).toBe(1);
    expect(applyIndexUiPageBootstrap).toHaveBeenCalledTimes(1);
    for (const installRuntime of [
      installHomeGuideRuntime,
      installHomeGuideControlsHostRuntime,
      installHomeGuideDomHostRuntime,
      installHomeGuideDoneNoticeHostRuntime,
      installHomeGuideFinishHostRuntime,
      installHomeGuideHighlightHostRuntime,
      installHomeGuidePageHostRuntime,
      installHomeGuidePanelHostRuntime,
      installHomeGuideSettingsHostRuntime,
      installHomeGuideStartHostRuntime,
      installHomeGuideStartupHostRuntime,
      installHomeGuideStepFlowHostRuntime,
      installHomeGuideStepHostRuntime,
      installHomeGuideStepViewHostRuntime,
      installIndexUiStartupHostRuntime,
      installReplayExportRuntime,
      installReplayModalRuntime,
      installReplayPageHostRuntime,
      installSettingsModalHostRuntime,
      installSettingsModalPageHostRuntime
    ]) {
      expect(installRuntime).toHaveBeenCalledTimes(1);
    }
  });
});
