import { describe, expect, it, vi } from "vitest";

import {
  applyIndexUiPageBootstrap,
  createIndexUiBootstrapResolvers,
  createIndexUiTryUndoHandler
} from "../../src/bootstrap/index-ui-page-host";

describe("bootstrap index ui page host", () => {
  it("creates undo handler and delegates to undo action runtime", () => {
    const tryTriggerUndoFromContext = vi.fn(() => ({ didTrigger: true }));
    const tryUndoFromUi = createIndexUiTryUndoHandler({
      undoActionRuntime: {
        tryTriggerUndoFromContext
      },
      windowLike: { id: "window" },
      direction: -1
    });

    expect(tryUndoFromUi()).toBe(true);
    expect(tryTriggerUndoFromContext).toHaveBeenCalledWith({
      windowLike: { id: "window" },
      direction: -1
    });
  });

  it("returns false when undo runtime contract is unavailable", () => {
    const tryUndoFromUi = createIndexUiTryUndoHandler({
      undoActionRuntime: {}
    });

    expect(tryUndoFromUi()).toBe(false);
  });

  it("creates bootstrap resolvers by delegating to page resolver/action host runtimes", () => {
    const trace: string[] = [];
    let mobilePayload: unknown = null;
    let actionPayload: unknown = null;
    const fallbackSetTimeout = () => 1;
    const fallbackClearTimeout = () => {};
    const windowLike = {
      id: "window",
      location: { id: "location" },
      navigator: { id: "navigator" },
      alert: () => {},
      console: { id: "console" },
      setTimeout: fallbackSetTimeout,
      clearTimeout: fallbackClearTimeout
    };

    const result = createIndexUiBootstrapResolvers({
      indexUiPageResolversHostRuntime: {
        createIndexUiMobileResolvers(payload: unknown) {
          mobilePayload = payload;
          trace.push("mobile:create");
          return {
            isCompactGameViewport() {
              trace.push("mobile:compact");
              return true;
            },
            syncMobileUndoTopButtonAvailability() {
              trace.push("mobile:sync-undo");
            },
            initMobileUndoTopButton() {
              trace.push("mobile:init-undo");
            },
            syncMobileHintUI() {
              trace.push("mobile:sync-hint");
            },
            initMobileHintToggle() {
              trace.push("mobile:init-hint");
            },
            syncMobileTimerboxUI() {
              trace.push("mobile:sync-timer");
            },
            initMobileTimerboxToggle() {
              trace.push("mobile:init-timer");
            },
            requestResponsiveGameRelayout() {
              trace.push("mobile:relayout");
            }
          };
        }
      },
      indexUiPageActionsHostRuntime: {
        createIndexUiPageActionResolvers(payload: unknown) {
          actionPayload = payload;
          trace.push("actions:create");
          return {
            initThemeSettingsUI() {
              trace.push("actions:init-theme");
            },
            removeLegacyUndoSettingsUI() {
              trace.push("actions:remove-legacy-undo");
            },
            initTimerModuleSettingsUI() {
              trace.push("actions:init-timer-module");
            },
            openPracticeBoardFromCurrent() {
              trace.push("actions:open-practice");
            },
            initHomeGuideSettingsUI() {
              trace.push("actions:init-home-guide");
            },
            autoStartHomeGuideIfNeeded() {
              trace.push("actions:auto-home-guide");
            },
            closeReplayModal() {
              trace.push("actions:close-replay");
            },
            exportReplay() {
              trace.push("actions:export-replay");
            },
            openSettingsModal() {
              trace.push("actions:open-settings");
            },
            closeSettingsModal() {
              trace.push("actions:close-settings");
            }
          };
        }
      },
      coreContracts: {
        mobileViewportPageHostRuntime: { id: "viewport-page" },
        mobileViewportRuntime: { id: "viewport-runtime" },
        mobileTopButtonsPageHostRuntime: { id: "top-buttons-page" },
        mobileTopButtonsRuntime: { id: "top-buttons-runtime" },
        mobileUndoTopAvailabilityHostRuntime: { id: "undo-top-availability" },
        mobileUndoTopHostRuntime: { id: "undo-top-host" },
        mobileUndoTopRuntime: { id: "undo-top-runtime" },
        undoActionRuntime: { id: "undo-action" },
        topActionsPageHostRuntime: { id: "top-actions-page" },
        topActionsRuntime: { id: "top-actions-runtime" },
        topActionsHostRuntime: { id: "top-actions-host" },
        mobileHintPageHostRuntime: { id: "mobile-hint-page" },
        mobileHintModalRuntime: { id: "mobile-hint-modal" },
        mobileHintOpenHostRuntime: { id: "mobile-hint-open-host" },
        mobileHintUiHostRuntime: { id: "mobile-hint-ui-host" },
        mobileHintHostRuntime: { id: "mobile-hint-host" },
        mobileHintRuntime: { id: "mobile-hint-runtime" },
        mobileHintUiRuntime: { id: "mobile-hint-ui-runtime" },
        mobileTimerboxPageHostRuntime: { id: "mobile-timerbox-page" },
        mobileTimerboxHostRuntime: { id: "mobile-timerbox-host" },
        mobileTimerboxRuntime: { id: "mobile-timerbox-runtime" },
        responsiveRelayoutHostRuntime: { id: "responsive-relayout-host" },
        responsiveRelayoutRuntime: { id: "responsive-relayout-runtime" },
        storageRuntime: { id: "storage-runtime" },
        themeSettingsPageHostRuntime: { id: "theme-settings-page" },
        themeSettingsHostRuntime: { id: "theme-settings-host" },
        themeSettingsRuntime: { id: "theme-settings-runtime" },
        timerModuleSettingsHostRuntime: { id: "timer-settings-host" },
        timerModuleSettingsPageHostRuntime: { id: "timer-settings-page" },
        timerModuleRuntime: { id: "timer-runtime" },
        practiceTransferPageHostRuntime: { id: "practice-transfer-page" },
        practiceTransferHostRuntime: { id: "practice-transfer-host" },
        practiceTransferRuntime: { id: "practice-transfer-runtime" }
      },
      modalContracts: {
        settingsModalPageHostRuntime: { id: "settings-modal-page" },
        settingsModalHostRuntime: { id: "settings-modal-host" },
        replayModalRuntime: { id: "replay-modal-runtime" },
        replayPageHostRuntime: { id: "replay-page-host" },
        replayExportRuntime: { id: "replay-export-runtime" }
      },
      homeGuideContracts: {
        homeGuidePageHostRuntime: { id: "home-guide-page" },
        homeGuideRuntime: { id: "home-guide-runtime" },
        homeGuideDomHostRuntime: { id: "home-guide-dom-host" },
        homeGuideHighlightHostRuntime: { id: "home-guide-highlight-host" },
        homeGuidePanelHostRuntime: { id: "home-guide-panel-host" },
        homeGuideDoneNoticeHostRuntime: { id: "home-guide-done-notice-host" },
        homeGuideFinishHostRuntime: { id: "home-guide-finish-host" },
        homeGuideStepHostRuntime: { id: "home-guide-step-host" },
        homeGuideStepFlowHostRuntime: { id: "home-guide-step-flow-host" },
        homeGuideStepViewHostRuntime: { id: "home-guide-step-view-host" },
        homeGuideStartHostRuntime: { id: "home-guide-start-host" },
        homeGuideControlsHostRuntime: { id: "home-guide-controls-host" },
        homeGuideSettingsHostRuntime: { id: "home-guide-settings-host" },
        homeGuideStartupHostRuntime: { id: "home-guide-startup-host" }
      },
      documentLike: { body: { id: "body" } },
      windowLike,
      tryUndoFromUi() {
        trace.push("undo:try");
      }
    });

    expect(typeof result.isCompactGameViewport).toBe("function");
    expect(typeof result.openSettingsModal).toBe("function");
    expect(typeof result.syncMobileTimerboxUI).toBe("function");
    expect(trace).toContain("mobile:create");
    expect(trace).toContain("actions:create");
    const mobilePayloadRecord = (mobilePayload ?? {}) as Record<string, unknown>;
    const actionPayloadRecord = (actionPayload ?? {}) as Record<string, unknown>;
    expect(mobilePayloadRecord.timerboxStorageKey).toBe("ui_timerbox_collapsed_mobile_v1");
    expect(mobilePayloadRecord.navigatorLike).toEqual(windowLike.navigator);
    expect(mobilePayloadRecord.setTimeoutLike).toBe(fallbackSetTimeout);
    expect(mobilePayloadRecord.clearTimeoutLike).toBe(fallbackClearTimeout);
    expect(typeof actionPayloadRecord.isCompactGameViewport).toBe("function");
    expect(actionPayloadRecord.locationLike).toEqual(windowLike.location);
    expect(actionPayloadRecord.navigatorLike).toEqual(windowLike.navigator);
    expect(actionPayloadRecord.alertLike).toBe(windowLike.alert);
    expect(actionPayloadRecord.consoleLike).toEqual(windowLike.console);
    expect(actionPayloadRecord.setTimeoutLike).toBe(fallbackSetTimeout);
    expect(actionPayloadRecord.clearTimeoutLike).toBe(fallbackClearTimeout);
  });

  it("binds page globals and delegates startup on dom ready", () => {
    let domReadyHandler: (() => unknown) | null = null;
    const addEventListener = vi.fn((name: string, listener: () => unknown) => {
      if (name === "DOMContentLoaded") {
        domReadyHandler = listener;
      }
    });

    const getElementById = vi.fn();
    const applyIndexUiStartup = vi.fn(() => ({ didStart: true }));
    const nowMs = vi.fn(() => 123456);
    const windowLike: Record<string, unknown> = {};
    const documentLike = {
      addEventListener,
      getElementById
    };

    const exportReplay = vi.fn();
    const openPracticeBoardFromCurrent = vi.fn();
    const openSettingsModal = vi.fn();
    const closeSettingsModal = vi.fn();

    const result = applyIndexUiPageBootstrap({
      indexUiStartupHostRuntime: {
        applyIndexUiStartup
      },
      topActionBindingsHostRuntime: { id: "top-actions-host" },
      gameOverUndoHostRuntime: { id: "game-over-host" },
      documentLike,
      windowLike,
      nowMs,
      touchGuardWindowMs: 450,
      tryUndoFromUi: () => true,
      exportReplay,
      closeReplayModal: vi.fn(),
      openPracticeBoardFromCurrent,
      openSettingsModal,
      closeSettingsModal,
      initThemeSettingsUI: vi.fn(),
      removeLegacyUndoSettingsUI: vi.fn(),
      initTimerModuleSettingsUI: vi.fn(),
      initMobileHintToggle: vi.fn(),
      initMobileUndoTopButton: vi.fn(),
      initHomeGuideSettingsUI: vi.fn(),
      autoStartHomeGuideIfNeeded: vi.fn(),
      initMobileTimerboxToggle: vi.fn(),
      requestResponsiveGameRelayout: vi.fn(),
      syncMobileTimerboxUI: vi.fn(),
      syncMobileHintUI: vi.fn(),
      syncMobileUndoTopButtonAvailability: vi.fn(),
      prettyTimeRuntime: {
        formatPrettyTime(value: unknown) {
          return `pretty:${String(value)}`;
        }
      }
    });

    expect(result.appliedGlobalBindings).toBe(true);
    expect(result.boundDomContentLoaded).toBe(true);
    expect(result.startupInvoked).toBe(false);

    expect(typeof windowLike.exportReplay).toBe("function");
    expect(typeof windowLike.openPracticeBoardFromCurrent).toBe("function");
    expect(typeof windowLike.openSettingsModal).toBe("function");
    expect(typeof windowLike.closeSettingsModal).toBe("function");
    expect(typeof windowLike.pretty).toBe("function");
    expect((windowLike.pretty as (input: number) => string)(30)).toBe("pretty:30");

    expect(domReadyHandler).not.toBeNull();
    domReadyHandler?.();

    expect(applyIndexUiStartup).toHaveBeenCalledTimes(1);
    expect(applyIndexUiStartup).toHaveBeenCalledWith(
      expect.objectContaining({
        topActionBindingsHostRuntime: { id: "top-actions-host" },
        gameOverUndoHostRuntime: { id: "game-over-host" },
        windowLike,
        exportReplay,
        openPracticeBoardFromCurrent,
        openSettingsModal,
        closeSettingsModal,
        nowMs,
        touchGuardWindowMs: 450,
        getElementById: expect.any(Function)
      })
    );

    const second = applyIndexUiPageBootstrap({
      indexUiStartupHostRuntime: {
        applyIndexUiStartup
      },
      documentLike,
      windowLike
    });

    expect(second.boundDomContentLoaded).toBe(false);
    expect(addEventListener).toHaveBeenCalledTimes(1);
  });
});
