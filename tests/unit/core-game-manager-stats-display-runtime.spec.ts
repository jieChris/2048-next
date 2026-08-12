import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";

import { describe, expect, it, vi } from "vitest";

type StatsDisplayRuntimeContext = {
  actuate: (manager: Record<string, unknown>) => void;
  createActuatorPayloadState: (manager: Record<string, unknown>) => Record<string, unknown>;
  finalizeActuatePersistence: (manager: Record<string, unknown>) => void;
  resolveStepStatsFastPath: (manager: Record<string, unknown>) => Record<string, number> | null;
  resolveStatsDisplayLanguage: (manager: Record<string, unknown>) => string;
  updateActuateStatsAndPanel: (manager: Record<string, unknown>) => void;
};

function loadStatsDisplayRuntime(extraContext?: Record<string, unknown>): StatsDisplayRuntimeContext {
  const script = readFileSync(
    path.resolve(process.cwd(), "js/core_game_manager_stats_display_helpers_runtime.js"),
    "utf8"
  );
  const context = {
    console,
    isNonArrayObject: (value: unknown) => !!value && typeof value === "object" && !Array.isArray(value),
    resolveManagerDocumentLike(manager: Record<string, unknown>) {
      return manager.documentLike || null;
    },
    ...(extraContext || {})
  } as Record<string, unknown>;

  vm.runInNewContext(script, context);
  return context as StatsDisplayRuntimeContext;
}

describe("core game manager stats display runtime", () => {
  it("delegates actuate persistence finalization to the TypeScript runtime", () => {
    const finalizeActuatePersistence = vi.fn();
    const consumeSkipActuatePersistenceOnce = vi.fn(() => false);
    const publishSavedStateSyncSnapshot = vi.fn();
    const isTerminalSessionForPersistence = vi.fn(() => false);
    const saveGameState = vi.fn();
    const runtime = loadStatsDisplayRuntime({
      CoreGameManagerActuatePersistenceRuntime: {
        finalizeActuatePersistence
      },
      consumeSkipActuatePersistenceOnce,
      publishSavedStateSyncSnapshot,
      isTerminalSessionForPersistence,
      saveGameState
    });
    const manager = {
      modeKey: "standard",
      over: false
    };

    runtime.finalizeActuatePersistence(manager);

    expect(finalizeActuatePersistence).toHaveBeenCalledWith(
      manager,
      expect.objectContaining({
        consumeSkipActuatePersistenceOnce: expect.any(Function),
        publishSavedStateSyncSnapshot: expect.any(Function),
        isTerminalSessionForPersistence: expect.any(Function),
        saveGameState: expect.any(Function)
      })
    );
  });

  it("delegates stats display language resolution to the TypeScript stats panel runtime", () => {
    const resolveStatsPanelLanguage = vi.fn(() => "zh");
    const runtime = loadStatsDisplayRuntime({
      CoreStatsPanelCopyRuntime: {
        resolveStatsPanelLanguage
      }
    });
    const documentElement = {
      getAttribute: vi.fn((name: string) => (name === "data-ui-lang" ? "en-GB" : ""))
    };
    const manager = {
      window: {
        UII18N: {
          getLanguage: vi.fn(() => "en-US")
        },
        localStorage: {
          getItem: vi.fn((key: string) => (key === "ui_language_v1" ? "zh-CN" : ""))
        }
      },
      documentLike: {
        documentElement
      }
    };

    expect(runtime.resolveStatsDisplayLanguage(manager)).toBe("zh");
    expect(resolveStatsPanelLanguage).toHaveBeenCalledWith({
      i18nLanguage: "en-US",
      storageLanguage: "zh-CN",
      documentLanguage: "en-GB"
    });
  });

  it("delegates actuator payload creation to the TypeScript runtime", () => {
    const payload = { fromRuntime: true };
    const createActuatorPayloadState = vi.fn(() => payload);
    const isGameTerminated = vi.fn(() => true);
    const runtime = loadStatsDisplayRuntime({
      CoreGameManagerActuatorPayloadStateRuntime: {
        createActuatorPayloadState
      },
      isGameTerminated
    });
    const manager = {
      score: 16,
      over: false,
      won: false,
      scoreManager: {
        get: vi.fn(() => 32)
      },
      stoneValueSet: {},
      blockedCellsList: []
    };

    expect(runtime.createActuatorPayloadState(manager)).toBe(payload);
    expect(createActuatorPayloadState).toHaveBeenCalledTimes(1);
    expect(createActuatorPayloadState).toHaveBeenCalledWith(
      manager,
      expect.objectContaining({
        isGameTerminated: expect.any(Function)
      })
    );

    const operations = createActuatorPayloadState.mock.calls[0]?.[1] as {
      isGameTerminated: (currentManager: Record<string, unknown>) => boolean;
    };
    expect(operations.isGameTerminated(manager)).toBe(true);
    expect(isGameTerminated).toHaveBeenCalledWith(manager);
  });

  it("does not actuate a ranked setup that is blocked until a legal seed is ready", () => {
    const runtime = loadStatsDisplayRuntime({
      isGameTerminated: vi.fn(() => false)
    });
    const manager = {
      rankedSetupBlockedUntilSessionReady: true,
      actuator: {
        actuate: vi.fn()
      },
      scoreManager: {
        get: vi.fn()
      },
      computeStepStats: vi.fn(),
      updateStatsPanel: vi.fn()
    } as Record<string, unknown>;

    runtime.actuate(manager);

    expect((manager.actuator as { actuate: ReturnType<typeof vi.fn> }).actuate).not.toHaveBeenCalled();
    expect(manager.computeStepStats).not.toHaveBeenCalled();
    expect(manager.updateStatsPanel).not.toHaveBeenCalled();
  });

  it.each(["rankCheckpointApplying", "rankCheckpointRestorePending"])(
    "does not render or persist while %s is active",
    (guardKey) => {
    const finalizeActuatePersistence = vi.fn();
    const runtime = loadStatsDisplayRuntime({
      CoreGameManagerActuatePersistenceRuntime: { finalizeActuatePersistence }
    });
    const manager = {
      [guardKey]: true,
      actuator: { actuate: vi.fn() },
      scoreManager: { get: vi.fn(), set: vi.fn() },
      computeStepStats: vi.fn(),
      updateStatsPanel: vi.fn()
    } as Record<string, unknown>;

    runtime.actuate(manager);

    expect((manager.actuator as { actuate: ReturnType<typeof vi.fn> }).actuate).not.toHaveBeenCalled();
    expect(finalizeActuatePersistence).not.toHaveBeenCalled();
    expect((manager.scoreManager as { set: ReturnType<typeof vi.fn> }).set).not.toHaveBeenCalled();
    }
  );

  it("normalizes current-round input counts in the stats fast path", () => {
    const runtime = loadStatsDisplayRuntime();

    expect(
      runtime.resolveStepStatsFastPath({
        replayMode: false,
        moveHistory: [{}, {}, {}],
        successfulMoveCount: 2.9,
        undoUsed: 1,
        validInputCount: "7.8",
        invalidInputCount: -4
      })
    ).toEqual({
      totalSteps: 3,
      moveSteps: 2,
      undoSteps: 1,
      validInputs: 7,
      invalidInputs: 0
    });
  });

  it("passes normalized input counts through the stats display update", () => {
    const updateStatsPanel = vi.fn();
    const runtime = loadStatsDisplayRuntime({
      resolveManagerElementById: vi.fn(() => null)
    });
    const manager = {
      replayMode: true,
      validInputCount: 5.6,
      invalidInputCount: "2.9",
      computeStepStats: vi.fn(() => ({ totalSteps: 8, moveSteps: 6, undoSteps: 2 })),
      updateStatsPanel
    };

    runtime.updateActuateStatsAndPanel(manager);

    expect(manager.computeStepStats).toHaveBeenCalledTimes(1);
    expect(updateStatsPanel).toHaveBeenCalledWith(8, 6, 2, 5, 2);
  });
});
