import { beforeEach, describe, expect, it, vi } from "vitest";

describe("home family bootstrap ranked session ordering", () => {
  beforeEach(() => {
    vi.resetModules();
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

    expect(loadCalls).toEqual([
      ["./js/core_game_manager_replay_helpers_runtime.js?v=20260617-replay-compat"],
      ["./js/home_standard_startup_bundle.js?v=20260609-rescue-sync1"]
    ]);
  });

  it("installs the pre-accessor manager-forward bindings runtime before loading game scripts", async () => {
    const installGameManagerInputEventsRuntime = vi.fn();
    const installGameManagerRuntimeStateRuntime = vi.fn();
    const installGameManagerUndoMoveHandlerRuntime = vi.fn();
    const installGameManagerUndoRestoredTilesRuntime = vi.fn();
    const installSavedManagerReplayStateRuntime = vi.fn();
    const installPreAccessorManagerForwardBindingsRuntime = vi.fn();
    const installSavedManagerTimerStateRuntime = vi.fn();
    const installSavedPayloadRichnessRuntime = vi.fn();

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
    vi.doMock("../../src/core/pre-accessor-manager-forward-bindings", () => ({
      installPreAccessorManagerForwardBindingsRuntime
    }));
    vi.doMock("../../src/core/saved-manager-timer-state", () => ({
      installSavedManagerTimerStateRuntime
    }));
    vi.doMock("../../src/core/saved-payload-richness", () => ({
      installSavedPayloadRichnessRuntime
    }));
    vi.doMock("../../src/core/game-manager-input-events", () => ({
      installGameManagerInputEventsRuntime
    }));
    vi.doMock("../../src/core/game-manager-runtime-state", () => ({
      installGameManagerRuntimeStateRuntime
    }));
    vi.doMock("../../src/core/game-manager-undo-move-handler", () => ({
      installGameManagerUndoMoveHandlerRuntime
    }));
    vi.doMock("../../src/core/game-manager-undo-restored-tiles", () => ({
      installGameManagerUndoRestoredTilesRuntime
    }));
    vi.doMock("../../src/core/saved-manager-replay-state", () => ({
      installSavedManagerReplayStateRuntime
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
    expect(installGameManagerRuntimeStateRuntime).toHaveBeenCalledTimes(1);
    expect(installGameManagerUndoMoveHandlerRuntime).toHaveBeenCalledTimes(1);
    expect(installGameManagerUndoRestoredTilesRuntime).toHaveBeenCalledTimes(1);
    expect(installSavedManagerReplayStateRuntime).toHaveBeenCalledTimes(1);
    expect(installPreAccessorManagerForwardBindingsRuntime).toHaveBeenCalledTimes(1);
    expect(installSavedManagerTimerStateRuntime).toHaveBeenCalledTimes(1);
    expect(installSavedPayloadRichnessRuntime).toHaveBeenCalledTimes(1);
  });
});
