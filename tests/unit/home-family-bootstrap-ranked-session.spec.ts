import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("home family bootstrap ranked session ordering", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("waits for the ranked session before loading the ranked home game startup scripts", async () => {
    const loadCalls: string[][] = [];
    let releaseRankedSession: (() => void) | null = null;
    const rankedSessionReady = new Promise<void>((resolve) => {
      releaseRankedSession = resolve;
    });

    vi.doMock("../../src/bootstrap/page-bootstrap", () => ({
      createBootstrapPipeline: () => [],
      resolvePageDescriptor: () => ({ id: "index" })
    }));
    vi.doMock("../../src/bootstrap/engine-facade-host", () => ({
      registerEngineFacade: vi.fn()
    }));
    vi.doMock("../../src/bootstrap/ranked-session", () => ({
      bootstrapRankedSessionForHomeFamilyPage: vi.fn(() => rankedSessionReady)
    }));
    vi.doMock("../../src/bootstrap/storage", () => ({
      resolveStorageByName: () => null,
      safeReadStorageItem: () => ""
    }));
    vi.doMock("../../src/bootstrap/home-user-display", () => ({
      bindHomeUserDisplay: vi.fn()
    }));
    vi.doMock("../../src/bootstrap/access-gate", () => ({
      runBetaAccessGate: vi.fn(async () => ({ allowed: true })),
      shouldRunBetaAccessGate: vi.fn(() => true)
    }));
    vi.doMock("../../src/core/pre-accessor-manager-forward-bindings", () => ({
      installPreAccessorManagerForwardBindingsRuntime: vi.fn()
    }));
    vi.doMock("../../src/entries/legacy-loader", () => ({
      loadLegacyScriptsSequentially: vi.fn(async (scripts: string[]) => {
        loadCalls.push(scripts);
      })
    }));
    vi.doMock("../../src/entries/runtime-manifest", () => ({
      getPageManifest: () => ({
        id: "index",
        capabilities: ["core", "standard-startup"]
      })
    }));
    vi.doMock("../../src/entries/home-family-shared", () => ({
      resolveHomeFamilyScriptsByCapabilities: () => ["mock-runtime.js"]
    }));

    const { bootstrapHomeFamilyPage } = await import("../../src/entries/home-family-bootstrap");
    const pendingBootstrap = bootstrapHomeFamilyPage("index");

    await Promise.resolve();
    expect(loadCalls).toEqual([]);

    releaseRankedSession?.();
    await pendingBootstrap;

    expect(loadCalls).toEqual([["./js/home_standard_startup_bundle.js?v=20260625-ranked-cache"]]);
  });

  it("keeps the modern index bootstrap boundary without the removed deferred bundle", async () => {
    const loadCalls: string[][] = [];
    const idleCallbacks: Array<() => void> = [];
    const installSettingsModalHostRuntime = vi.fn();
    const installSettingsModalPageHostRuntime = vi.fn();
    const installHomeGuideRuntime = vi.fn();
    const installHomeGuideSettingsHostRuntime = vi.fn();
    const installHomeGuideStartupHostRuntime = vi.fn();
    const installIndexUiStartupHostRuntime = vi.fn();
    const applyIndexUiBootstrapFromTsRuntime = vi.fn();
    const applyIndexUiPageBootstrap = vi.fn();
    const indexUiBootstrapResolvers = {
      exportReplay: vi.fn(),
      closeReplayModal: vi.fn(),
      openPracticeBoardFromCurrent: vi.fn(),
      openSettingsModal: vi.fn(),
      closeSettingsModal: vi.fn(),
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
      syncMobileUndoTopButtonAvailability: vi.fn()
    };

    vi.stubGlobal("document", {
      addEventListener: vi.fn(),
      body: {
        clientHeight: 800,
        getAttribute: vi.fn(() => "game"),
        scrollHeight: 800
      },
      documentElement: {
        clientHeight: 800,
        removeAttribute: vi.fn(),
        scrollHeight: 800,
        setAttribute: vi.fn()
      },
      getElementById: vi.fn(() => null),
      querySelector: vi.fn(() => null)
    });
    vi.stubGlobal("navigator", { userAgent: "" });
    vi.stubGlobal("window", {
      addEventListener: vi.fn(),
      localStorage: {},
      requestIdleCallback: vi.fn((callback: () => void) => {
        idleCallbacks.push(callback);
        return 1;
      }),
      setTimeout: vi.fn()
    });

    vi.doMock("../../src/bootstrap/page-bootstrap", () => ({
      createBootstrapPipeline: () => [],
      resolvePageDescriptor: () => ({ id: "index" })
    }));
    vi.doMock("../../src/bootstrap/engine-facade-host", () => ({
      registerEngineFacade: vi.fn()
    }));
    vi.doMock("../../src/bootstrap/ranked-session", () => ({
      bootstrapRankedSessionForHomeFamilyPage: vi.fn(async () => {})
    }));
    vi.doMock("../../src/bootstrap/storage", () => ({
      resolveStorageByName: () => null,
      safeReadStorageItem: () => ""
    }));
    vi.doMock("../../src/bootstrap/home-user-display", () => ({
      bindHomeUserDisplay: vi.fn()
    }));
    vi.doMock("../../src/bootstrap/access-gate", () => ({
      runBetaAccessGate: vi.fn(async () => ({ allowed: true })),
      shouldRunBetaAccessGate: vi.fn(() => true)
    }));
    vi.doMock("../../src/bootstrap/settings-modal-host", () => ({
      installSettingsModalHostRuntime
    }));
    vi.doMock("../../src/bootstrap/settings-modal-page-host", () => ({
      installSettingsModalPageHostRuntime
    }));
    vi.doMock("../../src/bootstrap/home-guide", () => ({
      installHomeGuideRuntime
    }));
    vi.doMock("../../src/bootstrap/home-guide-settings-host", () => ({
      installHomeGuideSettingsHostRuntime
    }));
    vi.doMock("../../src/bootstrap/home-guide-startup-host", () => ({
      installHomeGuideStartupHostRuntime
    }));
    vi.doMock("../../src/bootstrap/index-ui-startup-host", () => ({
      installIndexUiStartupHostRuntime
    }));
    vi.doMock("../../src/bootstrap/index-ui-runtime-contract", async (importOriginal) => {
      const actual = await importOriginal<typeof import("../../src/bootstrap/index-ui-runtime-contract")>();
      const contracts = {
        modalContracts: {},
        homeGuideContracts: {},
        coreContracts: {
          gameOverUndoHostRuntime: {},
          indexUiStartupHostRuntime: {},
          prettyTimeRuntime: {},
          topActionBindingsHostRuntime: {}
        }
      };
      return {
        ...actual,
        resolveIndexUiRuntimeContracts: vi.fn(() => contracts),
        resolveIndexUiRuntimeContractsCompat: vi.fn(() => contracts)
      };
    });
    vi.doMock("../../src/bootstrap/index-ui-page-host", async (importOriginal) => {
      const actual = await importOriginal<typeof import("../../src/bootstrap/index-ui-page-host")>();
      return {
        ...actual,
        applyIndexUiPageBootstrap,
        createIndexUiBootstrapResolvers: vi.fn(() => indexUiBootstrapResolvers),
        createIndexUiTryUndoHandler: vi.fn(() => vi.fn(() => false))
      };
    });
    vi.doMock("../../src/entries/index-ui-bootstrap", () => ({
      applyIndexUiBootstrapFromTsRuntime
    }));
    vi.doMock("../../src/entries/legacy-loader", () => ({
      loadLegacyScriptsSequentially: vi.fn(async (scripts: string[]) => {
        loadCalls.push(scripts);
      })
    }));
    vi.doMock("../../src/entries/runtime-manifest", () => ({
      getPageManifest: () => ({
        id: "index",
        capabilities: [
          "announcement",
          "core",
          "standard-startup",
          "settings-and-panel",
          "top-button-style",
          "index-tail",
          "leaderboard",
          "i18n"
        ]
      })
    }));
    vi.doMock("../../src/entries/home-family-shared", () => ({
      resolveHomeFamilyScriptsByCapabilities: (capabilities: string[]) =>
        capabilities.flatMap((capability) => {
          if (capability === "settings-and-panel") {
            return ["./js/core_bgm_runtime.js", "./js/core_night_mode_runtime.js"];
          }
          if (capability === "top-button-style") return ["./js/core_top_button_style_runtime.js"];
          if (capability === "i18n") return ["./js/core_i18n_runtime.js"];
          if (capability === "index-tail") return ["./js/index_ui.js"];
          return [`runtime:${capability}`];
        })
    }));

    const { bootstrapHomeFamilyPage } = await import("../../src/entries/home-family-bootstrap");

    await bootstrapHomeFamilyPage("index");
    for (const callback of idleCallbacks) callback();
    await Promise.resolve();
    for (let i = 0; i < 5; i += 1) {
      await new Promise((resolve) => globalThis.setTimeout(resolve, 0));
    }

    const loadedScriptText = loadCalls.flat().join("\n");
    expect(installSettingsModalHostRuntime).not.toHaveBeenCalled();
    expect(installSettingsModalPageHostRuntime).not.toHaveBeenCalled();
    expect(installHomeGuideRuntime).not.toHaveBeenCalled();
    expect(installHomeGuideSettingsHostRuntime).not.toHaveBeenCalled();
    expect(installHomeGuideStartupHostRuntime).not.toHaveBeenCalled();
    expect(installIndexUiStartupHostRuntime).not.toHaveBeenCalled();
    expect(loadedScriptText).not.toContain("home_standard_deferred_bundle.js");
    expect(loadedScriptText).toContain("core_bgm_runtime.js");
    expect(loadedScriptText).toContain("core_night_mode_runtime.js");
    expect(loadedScriptText).toContain("core_top_button_style_runtime.js");
    expect(loadedScriptText).toContain("core_i18n_runtime.js");
    expect(loadedScriptText).not.toContain("index_ui.js");
    expect(applyIndexUiBootstrapFromTsRuntime).toHaveBeenCalledTimes(1);
  });

  it("installs the pre-accessor manager-forward bindings runtime before loading game scripts", async () => {
    const installGameManagerInputEventsRuntime = vi.fn();
    const installGameManagerActuatorPayloadStateRuntime = vi.fn();
    const installGameManagerRuntimeStateRuntime = vi.fn();
    const installGameManagerSavedStatePersistenceBindingRuntime = vi.fn();
    const installGameManagerRedoRestoreStateRuntime = vi.fn();
    const installGameManagerTimerElapsedRuntime = vi.fn();
    const installGameManagerTimerRowVisibleStateRuntime = vi.fn();
    const installGameManagerUndoMoveHandlerRuntime = vi.fn();
    const installGameManagerUndoRestoredTilesRuntime = vi.fn();
    const installSavedManagerBaseStateRuntime = vi.fn();
    const installSavedManagerReplayStateRuntime = vi.fn();
    const installSavedManagerProgressStateRuntime = vi.fn();
    const installPreAccessorManagerForwardBindingsRuntime = vi.fn();
    const installSavedManagerTimerStateRuntime = vi.fn();
    const installSavedPayloadCandidateRuntime = vi.fn();
    const installSavedPayloadPersistFallbackRuntime = vi.fn();
    const installSavedPayloadRichnessRuntime = vi.fn();
    const installSavedStatePersistTimestampsRuntime = vi.fn();
    const installSavedStateSyncPayloadRuntime = vi.fn();
    const installSetupTimerRowNormalizeRuntime = vi.fn();
    const installStatsPanelCopyRuntime = vi.fn();

    vi.doMock("../../src/bootstrap/page-bootstrap", () => ({
      createBootstrapPipeline: () => [],
      resolvePageDescriptor: () => ({ id: "play" })
    }));
    vi.doMock("../../src/bootstrap/engine-facade-host", () => ({
      registerEngineFacade: vi.fn()
    }));
    vi.doMock("../../src/bootstrap/ranked-session", () => ({
      bootstrapRankedSessionForHomeFamilyPage: vi.fn(async () => {})
    }));
    vi.doMock("../../src/bootstrap/storage", () => ({
      resolveStorageByName: () => null,
      safeReadStorageItem: () => ""
    }));
    vi.doMock("../../src/bootstrap/home-user-display", () => ({
      bindHomeUserDisplay: vi.fn()
    }));
    vi.doMock("../../src/bootstrap/access-gate", () => ({
      runBetaAccessGate: vi.fn(async () => ({ allowed: true })),
      shouldRunBetaAccessGate: vi.fn(() => true)
    }));
    vi.doMock("../../src/core/pre-accessor-manager-forward-bindings", () => ({
      installPreAccessorManagerForwardBindingsRuntime
    }));
    vi.doMock("../../src/core/saved-manager-timer-state", () => ({
      installSavedManagerTimerStateRuntime
    }));
    vi.doMock("../../src/core/saved-payload-candidate", () => ({
      installSavedPayloadCandidateRuntime
    }));
    vi.doMock("../../src/core/saved-payload-persist-fallback", () => ({
      installSavedPayloadPersistFallbackRuntime
    }));
    vi.doMock("../../src/core/saved-payload-richness", () => ({
      installSavedPayloadRichnessRuntime
    }));
    vi.doMock("../../src/core/saved-state-persist-timestamps", () => ({
      installSavedStatePersistTimestampsRuntime
    }));
    vi.doMock("../../src/core/saved-state-sync-payload", () => ({
      installSavedStateSyncPayloadRuntime
    }));
    vi.doMock("../../src/core/setup-timer-row-normalize", () => ({
      installSetupTimerRowNormalizeRuntime
    }));
    vi.doMock("../../src/core/stats-panel-copy", () => ({
      installStatsPanelCopyRuntime
    }));
    vi.doMock("../../src/core/game-manager-input-events", () => ({
      installGameManagerInputEventsRuntime
    }));
    vi.doMock("../../src/core/game-manager-actuator-payload-state", () => ({
      installGameManagerActuatorPayloadStateRuntime
    }));
    vi.doMock("../../src/core/game-manager-runtime-state", () => ({
      installGameManagerRuntimeStateRuntime
    }));
    vi.doMock("../../src/core/game-manager-saved-state-persistence-binding", () => ({
      installGameManagerSavedStatePersistenceBindingRuntime
    }));
    vi.doMock("../../src/core/game-manager-redo-restore-state", () => ({
      installGameManagerRedoRestoreStateRuntime
    }));
    vi.doMock("../../src/core/game-manager-timer-elapsed", () => ({
      installGameManagerTimerElapsedRuntime
    }));
    vi.doMock("../../src/core/game-manager-timer-row-visible-state", () => ({
      installGameManagerTimerRowVisibleStateRuntime
    }));
    vi.doMock("../../src/core/game-manager-undo-move-handler", () => ({
      installGameManagerUndoMoveHandlerRuntime
    }));
    vi.doMock("../../src/core/game-manager-undo-restored-tiles", () => ({
      installGameManagerUndoRestoredTilesRuntime
    }));
    vi.doMock("../../src/core/saved-manager-base-state", () => ({
      installSavedManagerBaseStateRuntime
    }));
    vi.doMock("../../src/core/saved-manager-replay-state", () => ({
      installSavedManagerReplayStateRuntime
    }));
    vi.doMock("../../src/core/saved-manager-progress-state", () => ({
      installSavedManagerProgressStateRuntime
    }));
    vi.doMock("../../src/entries/legacy-loader", () => ({
      loadLegacyScriptsSequentially: vi.fn(async () => {})
    }));
    vi.doMock("../../src/entries/runtime-manifest", () => ({
      getPageManifest: () => ({
        id: "play",
        capabilities: ["core", "standard-startup"]
      })
    }));
    vi.doMock("../../src/entries/home-family-shared", () => ({
      resolveHomeFamilyScriptsByCapabilities: () => ["mock-runtime.js"]
    }));

    const { bootstrapHomeFamilyPage } = await import("../../src/entries/home-family-bootstrap");

    await bootstrapHomeFamilyPage("play");

    expect(installGameManagerInputEventsRuntime).toHaveBeenCalledTimes(1);
    expect(installGameManagerActuatorPayloadStateRuntime).toHaveBeenCalledTimes(1);
    expect(installGameManagerRuntimeStateRuntime).toHaveBeenCalledTimes(1);
    expect(installGameManagerSavedStatePersistenceBindingRuntime).toHaveBeenCalledTimes(1);
    expect(installGameManagerRedoRestoreStateRuntime).toHaveBeenCalledTimes(1);
    expect(installGameManagerTimerElapsedRuntime).toHaveBeenCalledTimes(1);
    expect(installGameManagerTimerRowVisibleStateRuntime).toHaveBeenCalledTimes(1);
    expect(installGameManagerUndoMoveHandlerRuntime).toHaveBeenCalledTimes(1);
    expect(installGameManagerUndoRestoredTilesRuntime).toHaveBeenCalledTimes(1);
    expect(installSavedManagerBaseStateRuntime).toHaveBeenCalledTimes(1);
    expect(installSavedManagerReplayStateRuntime).toHaveBeenCalledTimes(1);
    expect(installSavedManagerProgressStateRuntime).toHaveBeenCalledTimes(1);
    expect(installPreAccessorManagerForwardBindingsRuntime).toHaveBeenCalledTimes(1);
    expect(installSavedManagerTimerStateRuntime).toHaveBeenCalledTimes(1);
    expect(installSavedPayloadCandidateRuntime).toHaveBeenCalledTimes(1);
    expect(installSavedPayloadPersistFallbackRuntime).toHaveBeenCalledTimes(1);
    expect(installSavedPayloadRichnessRuntime).toHaveBeenCalledTimes(1);
    expect(installSavedStatePersistTimestampsRuntime).toHaveBeenCalledTimes(1);
    expect(installSavedStateSyncPayloadRuntime).toHaveBeenCalledTimes(1);
    expect(installSetupTimerRowNormalizeRuntime).toHaveBeenCalledTimes(1);
    expect(installStatsPanelCopyRuntime).toHaveBeenCalledTimes(1);
  });
});
