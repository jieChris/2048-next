import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";

import { describe, expect, it, vi } from "vitest";

type StatsDisplayRuntimeContext = {
  createActuatorPayloadState: (manager: Record<string, unknown>) => Record<string, unknown>;
  finalizeActuatePersistence: (manager: Record<string, unknown>) => void;
  resolveStatsDisplayLanguage: (manager: Record<string, unknown>) => string;
};

function loadStatsDisplayRuntime(extraContext?: Record<string, unknown>): StatsDisplayRuntimeContext {
  const script = readFileSync(
    path.resolve(process.cwd(), "js/core_game_manager_stats_display_helpers_runtime.js"),
    "utf8"
  );
  const context = {
    console,
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
});
