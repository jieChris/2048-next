import { beforeEach, describe, expect, it, vi } from "vitest";

describe("home family bootstrap ranked session ordering", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("starts the ranked session without blocking the ranked home game startup scripts", async () => {
    const loadCalls: string[][] = [];
    let releaseRankedSession: (() => void) | null = null;
    const rankedSessionReady = new Promise<void>((resolve) => {
      releaseRankedSession = resolve;
    });
    const bootstrapRankedSessionForHomeFamilyPage = vi.fn(() => rankedSessionReady);

    vi.doMock("../../src/bootstrap/page-bootstrap", () => ({
      createBootstrapPipeline: () => [],
      resolvePageDescriptor: () => ({ id: "index" })
    }));
    vi.doMock("../../src/bootstrap/engine-facade-host", () => ({
      registerEngineFacade: vi.fn()
    }));
    vi.doMock("../../src/bootstrap/ranked-session", () => ({
      bootstrapRankedSessionForHomeFamilyPage
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

    try {
      await vi.dynamicImportSettled();
      expect(bootstrapRankedSessionForHomeFamilyPage).toHaveBeenCalledWith("index");
      expect(loadCalls[0]).toEqual([
        "./js/core_game_manager_replay_helpers_runtime.js?v=20260617-replay-compat"
      ]);
      expect(loadCalls[1]).toHaveLength(1);
      expect(loadCalls[1][0]).toMatch(
        /^\.\/js\/home_standard_startup_bundle\.[a-f0-9]{12}\.js$/
      );
    } finally {
      releaseRankedSession?.();
      await pendingBootstrap;
    }
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
