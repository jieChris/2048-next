import { describe, expect, it, vi } from "vitest";

import {
  bindGameManagerInputEvents,
  createGameManagerInputEventsRuntime,
  installGameManagerInputEventsRuntime,
  type GameManagerInputEventsRuntime
} from "../../src/core/game-manager-input-events";

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

describe("core game manager input events runtime", () => {
  it("does nothing without a manager input manager", () => {
    const handleMoveInput = vi.fn();

    bindGameManagerInputEvents(null, { handleMoveInput });
    bindGameManagerInputEvents({}, { handleMoveInput });

    expect(handleMoveInput).not.toHaveBeenCalled();
  });

  it("binds move, item, and restart events against the current manager methods", () => {
    const inputManager = createInputManagerStub();
    const handleMoveInput = vi.fn();
    const originalUseItem = vi.fn();
    const currentUseItem = vi.fn();
    const originalRestart = vi.fn();
    const currentRestart = vi.fn();
    const manager = {
      inputManager,
      useItem: originalUseItem,
      restart: originalRestart
    };

    bindGameManagerInputEvents(manager, { handleMoveInput });
    manager.useItem = currentUseItem;
    manager.restart = currentRestart;
    inputManager.emit("move", 2);
    inputManager.emit("item", "swap");
    inputManager.emit("restart");

    expect(inputManager.on.mock.calls.map(([event]) => event)).toEqual([
      "move",
      "item",
      "restart",
      "keepPlaying"
    ]);
    expect(handleMoveInput).toHaveBeenCalledWith(manager, 2);
    expect(originalUseItem).not.toHaveBeenCalled();
    expect(currentUseItem).toHaveBeenCalledWith("swap");
    expect(originalRestart).not.toHaveBeenCalled();
    expect(currentRestart).toHaveBeenCalledTimes(1);
  });

  it("dispatches keep-playing through a prototype handler when one exists", () => {
    const inputManager = createInputManagerStub();
    const keepPlaying = vi.fn();
    const manager = Object.create({ keepPlaying }) as {
      inputManager: ReturnType<typeof createInputManagerStub>;
      keepPlaying?: boolean;
    };
    manager.inputManager = inputManager;

    bindGameManagerInputEvents(manager, { handleMoveInput: vi.fn() });
    inputManager.emit("keepPlaying");

    expect(keepPlaying).toHaveBeenCalledWith();
    expect(keepPlaying.mock.instances[0]).toBe(manager);
    expect(Object.prototype.hasOwnProperty.call(manager, "keepPlaying")).toBe(false);
  });

  it("falls back to keep-playing state and actuator continue without a prototype handler", () => {
    const inputManager = createInputManagerStub();
    const continueGame = vi.fn();
    const manager = {
      inputManager,
      keepPlaying: false,
      actuator: {
        continue: continueGame
      }
    };

    bindGameManagerInputEvents(manager, { handleMoveInput: vi.fn() });
    inputManager.emit("keepPlaying");

    expect(manager.keepPlaying).toBe(true);
    expect(continueGame).toHaveBeenCalledTimes(1);
  });

  it("creates and installs the legacy runtime shape without replacing an existing runtime", () => {
    const runtime = createGameManagerInputEventsRuntime();
    expect(runtime.bindGameManagerInputEvents).toBe(bindGameManagerInputEvents);

    const windowLike: { CoreGameManagerInputEventsRuntime?: GameManagerInputEventsRuntime } = {};
    expect(installGameManagerInputEventsRuntime({ windowLike })).toBe(
      windowLike.CoreGameManagerInputEventsRuntime
    );
    expect(windowLike.CoreGameManagerInputEventsRuntime?.bindGameManagerInputEvents).toBe(
      bindGameManagerInputEvents
    );

    const existing = { bindGameManagerInputEvents: vi.fn() };
    expect(
      installGameManagerInputEventsRuntime({
        windowLike: { CoreGameManagerInputEventsRuntime: existing }
      })
    ).toBe(existing);
  });
});
