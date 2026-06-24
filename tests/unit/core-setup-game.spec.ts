import { describe, expect, it, vi } from "vitest";

import {
  createSetupGameRuntime,
  installSetupGameRuntime,
  setupGame,
  type SetupGameRuntime
} from "../../src/core/setup-game";

function createOperations(overrides: Record<string, unknown> = {}) {
  return {
    applySetupModeConfig: vi.fn(),
    createGrid: vi.fn(() => ({ id: "grid" })),
    detectMode: vi.fn(() => "practice"),
    ensureSingleModePageLock: vi.fn(() => true),
    handleSingleModePageDuplicate: vi.fn(),
    isNonArrayObject: vi.fn((value: unknown) => !!value && typeof value === "object" && !Array.isArray(value)),
    resolveSetupModeConfig: vi.fn(() => ({ key: "practice", size: 4 })),
    resolveSetupNoXModeConfig: vi.fn(() => ({ key: "practice-no-x", size: 4 })),
    runSetupStateInitialization: vi.fn(),
    ...overrides
  };
}

function createManager() {
  return {
    width: 4,
    height: 4,
    rankPolicy: "unranked",
    normalizeModeConfig: vi.fn(() => ({ key: "practice-normalized", size: 4 })),
    setRuntimeGrid: vi.fn(),
    setRuntimeScore: vi.fn(),
    over: true,
    won: true,
    keepPlaying: true
  };
}

describe("core setup game runtime", () => {
  it("sets up a fresh game and runs setup state initialization", () => {
    const manager = createManager();
    const operations = createOperations();
    const setupOptions = { restore: true };

    setupGame(manager, 123, setupOptions, operations);

    expect(operations.isNonArrayObject).toHaveBeenCalledWith(setupOptions);
    expect(operations.detectMode).toHaveBeenCalledWith(manager);
    expect(operations.resolveSetupModeConfig).toHaveBeenCalledWith(manager, setupOptions, "practice");
    expect(manager.normalizeModeConfig).toHaveBeenCalledWith("practice", {
      key: "practice",
      size: 4
    });
    expect(operations.resolveSetupNoXModeConfig).toHaveBeenCalledWith(
      manager,
      { key: "practice-normalized", size: 4 },
      setupOptions,
      123
    );
    expect(operations.applySetupModeConfig).toHaveBeenCalledWith(manager, {
      key: "practice-no-x",
      size: 4
    });
    expect(operations.ensureSingleModePageLock).toHaveBeenCalledWith(manager);
    expect(operations.createGrid).toHaveBeenCalledWith(4, 4);
    expect(manager.setRuntimeGrid).toHaveBeenCalledWith({ id: "grid" });
    expect(manager.setRuntimeScore).toHaveBeenCalledWith(0);
    expect(manager.over).toBe(false);
    expect(manager.won).toBe(false);
    expect(manager.keepPlaying).toBe(false);
    expect(operations.runSetupStateInitialization).toHaveBeenCalledWith(manager, 123, setupOptions);
  });

  it("stops after handling a duplicate single-mode page lock", () => {
    const manager = createManager();
    const operations = createOperations({
      ensureSingleModePageLock: vi.fn(() => false)
    });

    setupGame(manager, undefined, [], operations);

    expect(operations.resolveSetupModeConfig).toHaveBeenCalledWith(manager, {}, "practice");
    expect(operations.handleSingleModePageDuplicate).toHaveBeenCalledWith(manager);
    expect(manager.setRuntimeGrid).not.toHaveBeenCalled();
    expect(operations.runSetupStateInitialization).not.toHaveBeenCalled();
  });

  it("blocks ranked setup before creating a board when no legal ranked seed is active", () => {
    const manager = createManager();
    manager.rankPolicy = "ranked";
    (manager as Record<string, unknown>).grid = { stale: true };
    const clearRankedBlockedBoardView = vi.fn();
    const operations = createOperations({
      applySetupModeConfig: vi.fn((target: typeof manager) => {
        target.rankPolicy = "ranked";
      }),
      clearRankedBlockedBoardView,
      hasLegalRankedSetupSeed: vi.fn(() => false)
    });

    setupGame(manager, undefined, {}, operations);

    expect(operations.hasLegalRankedSetupSeed).toHaveBeenCalledWith(manager);
    expect(operations.ensureSingleModePageLock).not.toHaveBeenCalled();
    expect(operations.createGrid).not.toHaveBeenCalled();
    expect(manager.setRuntimeScore).not.toHaveBeenCalled();
    expect(operations.runSetupStateInitialization).not.toHaveBeenCalled();
    expect((manager as Record<string, unknown>).rankedSetupBlockedUntilSessionReady).toBe(true);
    expect(manager.setRuntimeGrid).toHaveBeenCalledWith(null);
    expect(clearRankedBlockedBoardView).toHaveBeenCalledWith(manager);
  });

  it("creates and installs the legacy runtime shape without replacing an existing runtime", () => {
    const runtime = createSetupGameRuntime();
    expect(runtime.setupGame).toBe(setupGame);

    const windowLike: { CoreSetupGameRuntime?: SetupGameRuntime } = {};
    expect(installSetupGameRuntime({ windowLike })).toBe(windowLike.CoreSetupGameRuntime);
    expect(windowLike.CoreSetupGameRuntime?.setupGame).toBe(setupGame);

    const existing = { setupGame: vi.fn() };
    expect(installSetupGameRuntime({ windowLike: { CoreSetupGameRuntime: existing } })).toBe(
      existing
    );
  });
});
