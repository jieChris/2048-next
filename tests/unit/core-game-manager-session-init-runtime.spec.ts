import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";

import { describe, expect, it, vi } from "vitest";

import { createGameManagerInputEventsRuntime } from "../../src/core/game-manager-input-events";

type SessionInitRuntime = {
  bindGameManagerInputEvents: (manager: Record<string, unknown>) => void;
};

function loadSessionInitRuntime(options?: {
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
    handleMoveInput: vi.fn(),
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
