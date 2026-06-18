import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";

import { describe, expect, it, vi } from "vitest";

import { createGameManagerInputEventsRuntime } from "../../src/core/game-manager-input-events";

type SessionInitRuntime = {
  initializeGameManagerRuntimeState: (manager: Record<string, unknown>) => void;
  resetRoundStatsState: (manager: Record<string, unknown>) => void;
  bindGameManagerInputEvents: (manager: Record<string, unknown>) => void;
};

function loadSessionInitRuntime(options?: {
  runtimeStateRuntime?: {
    initializeGameManagerRuntimeState?: (
      manager: Record<string, unknown> | null,
      operations: Record<string, unknown>
    ) => void;
    resetRoundStatsState?: (
      manager: Record<string, unknown> | null,
      operations: Record<string, unknown>
    ) => void;
  };
  inputEventsRuntime?: {
    bindGameManagerInputEvents?: (
      manager: Record<string, unknown> | null,
      operations: Record<string, unknown>
    ) => void;
  };
}): SessionInitRuntime {
  const scriptPath = path.resolve(
    process.cwd(),
    "js/core_game_manager_session_init_helpers_runtime.js"
  );
  const script = readFileSync(scriptPath, "utf8");
  const context = {
    console,
    GameManager: {
      TIMER_SLOT_IDS: []
    },
    Date,
    createEmptyItemInventory: vi.fn(() => ({ hammer: 0, swap: 0 })),
    detectMode: vi.fn(() => "classic"),
    handleMoveInput: vi.fn(),
    updateItemModeHud: vi.fn(),
    updateMoveTimeoutHud: vi.fn(),
    CoreGameManagerRuntimeStateRuntime: options?.runtimeStateRuntime,
    CoreGameManagerInputEventsRuntime:
      options?.inputEventsRuntime || createGameManagerInputEventsRuntime()
  } as Record<string, unknown>;

  vm.runInNewContext(script, context);
  return context as SessionInitRuntime;
}

function createInputManagerStub(): {
  on: ReturnType<typeof vi.fn>;
  emit: (event: string, data?: unknown) => void;
} {
  const events = new Map<string, Array<(data?: unknown) => void>>();
  return {
    on: vi.fn((event: string, callback: (data?: unknown) => void) => {
      events.set(event, [...(events.get(event) || []), callback]);
    }),
    emit(event: string, data?: unknown) {
      for (const callback of events.get(event) || []) callback(data);
    }
  };
}

describe("core game manager session init runtime", () => {
  it("delegates runtime state initialization to the TypeScript runtime", () => {
    const initializeGameManagerRuntimeState = vi.fn();
    const runtime = loadSessionInitRuntime({
      runtimeStateRuntime: {
        initializeGameManagerRuntimeState
      }
    });
    const manager = {} as Record<string, unknown>;

    runtime.initializeGameManagerRuntimeState(manager);

    expect(initializeGameManagerRuntimeState).toHaveBeenCalledWith(
      manager,
      expect.objectContaining({
        detectMode: expect.any(Function),
        createEmptyItemInventory: expect.any(Function)
      })
    );
  });

  it("delegates round stats reset to the TypeScript runtime", () => {
    const resetRoundStatsState = vi.fn();
    const runtime = loadSessionInitRuntime({
      runtimeStateRuntime: {
        resetRoundStatsState
      }
    });
    const manager = {
      mode: "practice",
      loadUndoSettingForMode: vi.fn(() => true)
    } as Record<string, unknown>;

    runtime.resetRoundStatsState(manager);

    expect(resetRoundStatsState).toHaveBeenCalledWith(
      manager,
      expect.objectContaining({
        createEmptyItemInventory: expect.any(Function),
        updateItemModeHud: expect.any(Function),
        updateMoveTimeoutHud: expect.any(Function),
        nowMs: expect.any(Number)
      })
    );
  });

  it("delegates input event binding to the TypeScript runtime", () => {
    const bindGameManagerInputEvents = vi.fn();
    const runtime = loadSessionInitRuntime({
      inputEventsRuntime: {
        bindGameManagerInputEvents
      }
    });
    const manager = {
      inputManager: createInputManagerStub()
    } as Record<string, unknown>;

    runtime.bindGameManagerInputEvents(manager);

    expect(bindGameManagerInputEvents).toHaveBeenCalledWith(
      manager,
      expect.objectContaining({
        handleMoveInput: expect.any(Function)
      })
    );
  });

  it("dispatches restart input through the current manager method", () => {
    const runtime = loadSessionInitRuntime();
    const inputManager = createInputManagerStub();
    const originalRestart = vi.fn();
    const wrappedRestart = vi.fn();
    const manager = {
      inputManager,
      restart: originalRestart,
      keepPlaying: vi.fn()
    } as Record<string, unknown>;

    runtime.bindGameManagerInputEvents(manager);
    manager.restart = wrappedRestart;
    inputManager.emit("restart");

    expect(originalRestart).not.toHaveBeenCalled();
    expect(wrappedRestart).toHaveBeenCalledTimes(1);
  });
});
