import { describe, expect, it, vi } from "vitest";

import {
  applyHomeGuideAutoStartPage,
  applyHomeGuideAutoStartPageFromContext,
  applyHomeGuideSettingsPageInit,
  createHomeGuideLifecycleResolvers,
  createHomeGuidePageResolvers
} from "../../src/bootstrap/home-guide-page-host";

describe("bootstrap home guide page host", () => {
  it("returns false result when settings host api is missing", () => {
    const result = applyHomeGuideSettingsPageInit({
      homeGuideSettingsHostRuntime: {}
    });

    expect(result).toEqual({
      hasApplySettingsUiApi: false,
      didApply: false
    });
  });

  it("delegates settings init to settings host runtime", () => {
    const applyHomeGuideSettingsUi = vi.fn();
    const documentLike = { id: "document" };
    const windowLike = { id: "window" };
    const homeGuideRuntime = { id: "runtime" };
    const homeGuideState = { active: false };
    const isHomePage = vi.fn(() => true);
    const closeSettingsModal = vi.fn();
    const startHomeGuide = vi.fn();

    const result = applyHomeGuideSettingsPageInit({
      homeGuideSettingsHostRuntime: {
        applyHomeGuideSettingsUi
      },
      documentLike,
      windowLike,
      homeGuideRuntime,
      homeGuideState,
      isHomePage,
      closeSettingsModal,
      startHomeGuide
    });

    expect(applyHomeGuideSettingsUi).toHaveBeenCalledWith({
      documentLike,
      windowLike,
      homeGuideRuntime,
      homeGuideState,
      isHomePage,
      closeSettingsModal,
      startHomeGuide
    });
    expect(result).toEqual({
      hasApplySettingsUiApi: true,
      didApply: true
    });
  });

  it("creates lifecycle resolvers with safe fallbacks", () => {
    const resolvers = createHomeGuideLifecycleResolvers({});
    expect(typeof resolvers.initHomeGuideSettingsUI).toBe("function");
    expect(typeof resolvers.autoStartHomeGuideIfNeeded).toBe("function");
    expect(resolvers.initHomeGuideSettingsUI()).toEqual({
      hasApplySettingsUiApi: false,
      didApply: false
    });
    expect(resolvers.autoStartHomeGuideIfNeeded()).toEqual({
      didInvokePageAutoStart: false,
      localStorageResolved: false,
      pageResult: {
        hasApplyAutoStartApi: false,
        didApply: false
      }
    });
  });

  it("delegates lifecycle orchestration through page host runtime methods", () => {
    const applyHomeGuideSettingsPageInit = vi.fn(() => ({ marker: "settings-init" }));
    const applyHomeGuideAutoStartPageFromContext = vi.fn(() => ({ marker: "auto-start" }));
    const windowLike = { location: { pathname: "/index.html" } };
    const documentLike = { id: "doc" };
    const homeGuideRuntime = { id: "runtime" };
    const homeGuideState = { active: false };
    const isHomePage = vi.fn(() => true);
    const closeSettingsModal = vi.fn();
    const startHomeGuide = vi.fn();
    const setTimeoutLike = vi.fn();

    const resolvers = createHomeGuideLifecycleResolvers({
      homeGuidePageHostRuntime: {
        applyHomeGuideSettingsPageInit,
        applyHomeGuideAutoStartPageFromContext
      },
      homeGuideSettingsHostRuntime: { id: "settings-host" },
      homeGuideStartupHostRuntime: { id: "startup-host" },
      documentLike,
      windowLike,
      homeGuideRuntime,
      homeGuideState,
      isHomePage,
      closeSettingsModal,
      startHomeGuide,
      storageRuntime: { id: "storage" },
      seenKey: "home_guide_seen_v1",
      setTimeoutLike,
      autoStartDelayMs: 280
    });

    expect(resolvers.initHomeGuideSettingsUI()).toEqual({ marker: "settings-init" });
    expect(resolvers.autoStartHomeGuideIfNeeded()).toEqual({ marker: "auto-start" });

    expect(applyHomeGuideSettingsPageInit).toHaveBeenCalledWith({
      homeGuideSettingsHostRuntime: { id: "settings-host" },
      documentLike,
      windowLike,
      homeGuideRuntime,
      homeGuideState,
      isHomePage,
      closeSettingsModal,
      startHomeGuide
    });
    expect(applyHomeGuideAutoStartPageFromContext).toHaveBeenCalledWith({
      homeGuideStartupHostRuntime: { id: "startup-host" },
      homeGuideRuntime,
      locationLike: windowLike.location,
      storageRuntime: { id: "storage" },
      windowLike,
      seenKey: "home_guide_seen_v1",
      startHomeGuide,
      setTimeoutLike,
      delayMs: 280
    });
  });

  it("resolves closeSettingsModal from window context when not explicitly provided", () => {
    const applyHomeGuideSettingsUi = vi.fn();
    const closeSettingsModal = vi.fn();
    const windowLike = { closeSettingsModal };

    const resolvers = createHomeGuideLifecycleResolvers({
      homeGuideSettingsHostRuntime: {
        applyHomeGuideSettingsUi
      },
      documentLike: { id: "doc" },
      windowLike,
      homeGuideRuntime: { id: "runtime" },
      homeGuideState: { active: false },
      isHomePage: vi.fn(() => true),
      startHomeGuide: vi.fn()
    });

    expect(resolvers.initHomeGuideSettingsUI()).toEqual({
      hasApplySettingsUiApi: true,
      didApply: true
    });

    const payload = applyHomeGuideSettingsUi.mock.calls[0]?.[0] as Record<string, unknown>;
    const closeResolver = payload.closeSettingsModal as (() => unknown) | undefined;
    expect(typeof closeResolver).toBe("function");
    closeResolver && closeResolver();
    expect(closeSettingsModal).toHaveBeenCalledTimes(1);
    expect(closeSettingsModal.mock.contexts[0]).toBe(windowLike);
  });

  it("creates home page resolvers with safe fallbacks", () => {
    const resolvers = createHomeGuidePageResolvers({});
    expect(resolvers.isHomePage()).toBe(false);
    expect(resolvers.getHomeGuideSteps()).toEqual([]);
    expect(resolvers.ensureHomeGuideDom()).toBeNull();
    expect(resolvers.clearHomeGuideHighlight()).toBeNull();
    expect(resolvers.elevateHomeGuideTarget()).toBeNull();
    expect(resolvers.positionHomeGuidePanel()).toBeNull();
    expect(resolvers.isElementVisibleForGuide()).toBe(false);
    expect(resolvers.showHomeGuideDoneNotice()).toBeNull();
    expect(resolvers.finishHomeGuide()).toBeNull();
    expect(resolvers.showHomeGuideStep()).toBeNull();
    expect(resolvers.startHomeGuide()).toBeNull();
  });

  it("delegates home page checks and step build to runtime with viewport resolver", () => {
    const resolveHomeGuidePathname = vi.fn(() => "/index.html");
    const isHomePagePath = vi.fn((path: unknown) => path === "/index.html");
    const buildHomeGuideSteps = vi.fn(() => [{ selector: "#top-settings-btn" }]);
    const isCompactViewport = vi.fn(() => true);

    const resolvers = createHomeGuidePageResolvers({
      homeGuideRuntime: {
        resolveHomeGuidePathname,
        isHomePagePath,
        buildHomeGuideSteps
      },
      locationLike: { pathname: "/index.html" },
      isCompactViewport
    });

    expect(resolvers.isHomePage()).toBe(true);
    expect(resolvers.getHomeGuideSteps()).toEqual([{ selector: "#top-settings-btn" }]);
    expect(resolveHomeGuidePathname).toHaveBeenCalledWith({
      locationLike: { pathname: "/index.html" }
    });
    expect(isHomePagePath).toHaveBeenCalledWith("/index.html");
    expect(buildHomeGuideSteps).toHaveBeenCalledWith({ isCompactViewport: true });
  });

  it("delegates home guide dom/highlight/panel/done-notice orchestration to host runtimes", () => {
    const applyHomeGuideDomEnsure = vi.fn(() => ({ panel: {} }));
    const applyHomeGuideHighlightClear = vi.fn(() => undefined);
    const applyHomeGuideTargetElevation = vi.fn(() => undefined);
    const applyHomeGuidePanelPosition = vi.fn(() => undefined);
    const resolveHomeGuideTargetVisibility = vi.fn(() => true);
    const applyHomeGuideDoneNotice = vi.fn(() => undefined);
    const homeGuideState = { active: true };
    const documentLike = { id: "doc" };
    const windowLike = { id: "window" };

    const resolvers = createHomeGuidePageResolvers({
      homeGuideRuntime: { id: "runtime" },
      homeGuideDomHostRuntime: { applyHomeGuideDomEnsure },
      homeGuideHighlightHostRuntime: {
        applyHomeGuideHighlightClear,
        applyHomeGuideTargetElevation
      },
      homeGuidePanelHostRuntime: {
        applyHomeGuidePanelPosition,
        resolveHomeGuideTargetVisibility
      },
      homeGuideDoneNoticeHostRuntime: { applyHomeGuideDoneNotice },
      mobileViewportRuntime: { id: "viewport" },
      documentLike,
      windowLike,
      homeGuideState,
      mobileUiMaxWidth: 980,
      panelMargin: 16,
      defaultPanelHeight: 180,
      setTimeoutLike: vi.fn(),
      clearTimeoutLike: vi.fn()
    });

    const target = { id: "target" };
    expect(resolvers.ensureHomeGuideDom()).toEqual({ panel: {} });
    expect(resolvers.clearHomeGuideHighlight()).toBeUndefined();
    expect(resolvers.elevateHomeGuideTarget(target)).toBeUndefined();
    expect(resolvers.positionHomeGuidePanel()).toBeUndefined();
    expect(resolvers.isElementVisibleForGuide(target)).toBe(true);
    expect(resolvers.showHomeGuideDoneNotice()).toBeUndefined();

    expect(applyHomeGuideDomEnsure).toHaveBeenCalledWith({
      documentLike,
      homeGuideRuntime: { id: "runtime" },
      homeGuideState
    });
    expect(applyHomeGuideHighlightClear).toHaveBeenCalledWith({
      documentLike,
      homeGuideState
    });
    expect(applyHomeGuideTargetElevation).toHaveBeenCalledWith({
      target,
      homeGuideRuntime: { id: "runtime" },
      homeGuideState
    });
    expect(applyHomeGuidePanelPosition).toHaveBeenCalledWith({
      homeGuideState,
      homeGuideRuntime: { id: "runtime" },
      mobileViewportRuntime: { id: "viewport" },
      windowLike,
      mobileUiMaxWidth: 980,
      margin: 16,
      defaultPanelHeight: 180
    });
    expect(resolveHomeGuideTargetVisibility).toHaveBeenCalledWith({
      homeGuideRuntime: { id: "runtime" },
      windowLike,
      node: target
    });
    expect(applyHomeGuideDoneNotice).toHaveBeenCalledWith({
      documentLike,
      homeGuideRuntime: { id: "runtime" },
      setTimeoutLike: expect.any(Function),
      clearTimeoutLike: expect.any(Function)
    });
  });

  it("delegates finish/step/start orchestration to host runtimes", () => {
    const applyHomeGuideFinishFromContext = vi.fn(() => ({ didInvokeFinish: true }));
    const applyHomeGuideStepOrchestration = vi.fn(() => ({ didRender: true }));
    const applyHomeGuideStart = vi.fn(() => ({ didStart: true }));
    const applyHomeGuideControls = vi.fn(() => ({ didKickoff: true }));
    const syncHomeGuideSettingsUI = vi.fn();
    const windowLike = { syncHomeGuideSettingsUI };
    const homeGuideState = { active: true, index: 0, steps: [] };

    const resolvers = createHomeGuidePageResolvers({
      homeGuideRuntime: { id: "runtime" },
      locationLike: { pathname: "/index.html" },
      isCompactViewport: () => false,
      homeGuideFinishHostRuntime: {
        applyHomeGuideFinishFromContext
      },
      homeGuideStepHostRuntime: {
        applyHomeGuideStepOrchestration
      },
      homeGuideStepFlowHostRuntime: { id: "step-flow" },
      homeGuideStepViewHostRuntime: { id: "step-view" },
      homeGuideStartHostRuntime: {
        applyHomeGuideStart
      },
      homeGuideControlsHostRuntime: {
        applyHomeGuideControls
      },
      storageRuntime: { id: "storage" },
      seenKey: "home_guide_seen_v1",
      maxAdvanceLoops: 64,
      windowLike,
      homeGuideState
    });

    expect(resolvers.finishHomeGuide(true, { showDoneNotice: true })).toEqual({
      didInvokeFinish: true
    });
    expect(resolvers.showHomeGuideStep(3)).toEqual({ didRender: true });
    expect(resolvers.startHomeGuide({ fromSettings: true })).toEqual({ didStart: true });

    expect(applyHomeGuideFinishFromContext).toHaveBeenCalledWith(
      expect.objectContaining({
        homeGuideState,
        markSeen: true,
        seenKey: "home_guide_seen_v1",
        syncHomeGuideSettingsUI: expect.any(Function)
      })
    );
    const finishPayload = applyHomeGuideFinishFromContext.mock.calls[0]?.[0] as Record<
      string,
      unknown
    >;
    const finishSyncResolver = finishPayload.syncHomeGuideSettingsUI as (() => unknown) | undefined;
    finishSyncResolver && finishSyncResolver();
    expect(syncHomeGuideSettingsUI).toHaveBeenCalledTimes(1);
    expect(syncHomeGuideSettingsUI.mock.contexts[0]).toBe(windowLike);
    expect(applyHomeGuideStepOrchestration).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 3,
        maxAdvanceLoops: 64,
        stepFlowHostRuntime: { id: "step-flow" },
        stepViewHostRuntime: { id: "step-view" }
      })
    );
    expect(applyHomeGuideStart).toHaveBeenCalledWith(
      expect.objectContaining({
        homeGuideState,
        options: { fromSettings: true },
        isHomePage: expect.any(Function),
        getHomeGuideSteps: expect.any(Function),
        ensureHomeGuideDom: expect.any(Function)
      })
    );
    expect(applyHomeGuideControls).toHaveBeenCalledWith(
      expect.objectContaining({
        homeGuideState,
        showHomeGuideStep: expect.any(Function),
        finishHomeGuide: expect.any(Function),
        syncHomeGuideSettingsUI: expect.any(Function)
      })
    );
  });

  it("returns false result when startup host api is missing", () => {
    const result = applyHomeGuideAutoStartPage({
      homeGuideStartupHostRuntime: {}
    });

    expect(result).toEqual({
      hasApplyAutoStartApi: false,
      didApply: false
    });
  });

  it("delegates auto-start orchestration to startup host runtime", () => {
    const applyHomeGuideAutoStart = vi.fn();
    const homeGuideRuntime = { id: "runtime" };
    const locationLike = { pathname: "/index.html" };
    const storageLike = { getItem: vi.fn(() => null) };
    const startHomeGuide = vi.fn();
    const setTimeoutLike = vi.fn();

    const result = applyHomeGuideAutoStartPage({
      homeGuideStartupHostRuntime: {
        applyHomeGuideAutoStart
      },
      homeGuideRuntime,
      locationLike,
      storageLike,
      seenKey: "home_guide_seen_v1",
      startHomeGuide,
      setTimeoutLike,
      delayMs: 260
    });

    expect(applyHomeGuideAutoStart).toHaveBeenCalledWith({
      homeGuideRuntime,
      locationLike,
      storageLike,
      seenKey: "home_guide_seen_v1",
      startHomeGuide,
      setTimeoutLike,
      delayMs: 260
    });
    expect(result).toEqual({
      hasApplyAutoStartApi: true,
      didApply: true
    });
  });

  it("resolves localStorage from context and delegates auto-start orchestration", () => {
    const applyHomeGuideAutoStart = vi.fn();
    const storageLike = { getItem: vi.fn(() => null) };

    const result = applyHomeGuideAutoStartPageFromContext({
      homeGuideStartupHostRuntime: {
        applyHomeGuideAutoStart
      },
      homeGuideRuntime: { id: "runtime" },
      locationLike: { pathname: "/index.html" },
      storageRuntime: {
        resolveStorageByName(payload: { storageName?: string }) {
          return payload.storageName === "localStorage" ? storageLike : null;
        }
      },
      windowLike: { localStorage: storageLike },
      seenKey: "home_guide_seen_v1",
      startHomeGuide: vi.fn(),
      setTimeoutLike: vi.fn(),
      delayMs: 260
    });

    expect(result.didInvokePageAutoStart).toBe(true);
    expect(result.localStorageResolved).toBe(true);
    expect(result.pageResult).toEqual({
      hasApplyAutoStartApi: true,
      didApply: true
    });
    expect(applyHomeGuideAutoStart).toHaveBeenCalledWith(
      expect.objectContaining({
        storageLike,
        seenKey: "home_guide_seen_v1"
      })
    );
  });
});
