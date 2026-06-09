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

    expect(loadCalls).toEqual([["./js/home_standard_startup_bundle.js?v=20260609-rescue-sync1"]]);
  });
});
