import { describe, expect, it, vi } from "vitest";
import { JSDOM } from "jsdom";

import {
  bindGameManagerInputEvents,
  createGameManagerInputEventsRuntime,
  installGameManagerInputEventsRuntime,
  normalizeGameMoveInputAttempt,
  OPERATION_FEEDBACK_RESULT_EVENT,
  OPERATION_FEEDBACK_RESET_EVENT,
  publishConfirmedOperationFeedback,
  publishOperationFeedbackReset,
  type ConfirmedOperationFeedbackResult,
  type GameManagerInputEventsRuntime,
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
    },
  };
}

describe("core game manager input events runtime", () => {
  it("normalizes legacy directions and preserves valid keyboard feedback metadata", () => {
    expect(normalizeGameMoveInputAttempt(2)).toEqual({
      direction: 2,
      feedback: null,
    });
    expect(
      normalizeGameMoveInputAttempt({
        direction: 6,
        feedback: { id: "key-1", key: "Z", repeat: false },
      }),
    ).toEqual({
      direction: 6,
      feedback: { id: "key-1", key: "Z", repeat: false },
    });
  });

  it("counts and publishes repeated invalid input", () => {
    const dom = new JSDOM("<!doctype html><html><body></body></html>");
    const events: ConfirmedOperationFeedbackResult[] = [];
    dom.window.document.addEventListener(
      OPERATION_FEEDBACK_RESULT_EVENT,
      (event) => {
        events.push(
          (event as CustomEvent<ConfirmedOperationFeedbackResult>).detail,
        );
      },
    );
    const manager = {
      validInputCount: 0,
      invalidInputCount: 0,
      getWindowLike: () => dom.window,
    };

    expect(
      publishConfirmedOperationFeedback(
        manager,
        { direction: 0, feedback: { id: "key-1", key: "W", repeat: true } },
        false,
      ),
    ).toBe(true);
    expect(manager.invalidInputCount).toBe(1);
    expect(events).toEqual([
      { id: "key-1", key: "W", repeat: true, valid: false },
    ]);
  });

  it("counts and publishes a single invalid input", () => {
    const dom = new JSDOM("<!doctype html><html><body></body></html>");
    const events: ConfirmedOperationFeedbackResult[] = [];
    const panelSnapshots: Array<[number, number]> = [];
    dom.window.document.addEventListener(
      OPERATION_FEEDBACK_RESULT_EVENT,
      (event) => {
        events.push(
          (event as CustomEvent<ConfirmedOperationFeedbackResult>).detail,
        );
      },
    );
    const manager = {
      validInputCount: 0,
      invalidInputCount: 0,
      updateStatsPanel: vi.fn(() => {
        panelSnapshots.push([
          manager.validInputCount,
          manager.invalidInputCount,
        ]);
      }),
      getWindowLike: () => dom.window,
    };

    expect(
      publishConfirmedOperationFeedback(
        manager,
        {
          direction: 0,
          feedback: { id: "key-2", key: "arrow-up", repeat: false },
        },
        false,
      ),
    ).toBe(true);
    expect(manager.invalidInputCount).toBe(1);
    expect(manager.updateStatsPanel).toHaveBeenCalledTimes(1);
    expect(panelSnapshots).toEqual([[0, 1]]);
    expect(events.at(-1)).toEqual({
      id: "key-2",
      key: "arrow-up",
      repeat: false,
      valid: false,
    });
  });

  it("counts and publishes every repeated input that actually moves", () => {
    const dom = new JSDOM("<!doctype html><html><body></body></html>");
    const events: ConfirmedOperationFeedbackResult[] = [];
    dom.window.document.addEventListener(
      OPERATION_FEEDBACK_RESULT_EVENT,
      (event) => {
        events.push(
          (event as CustomEvent<ConfirmedOperationFeedbackResult>).detail,
        );
      },
    );
    const manager = {
      validInputCount: 0,
      invalidInputCount: 0,
      getWindowLike: () => dom.window,
    };

    expect(
      publishConfirmedOperationFeedback(
        manager,
        { direction: 0, feedback: { id: "key-3", key: "W", repeat: true } },
        true,
      ),
    ).toBe(true);
    expect(manager.validInputCount).toBe(1);
    expect(events.at(-1)).toEqual({
      id: "key-3",
      key: "W",
      repeat: true,
      valid: true,
    });
  });

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
      restart: originalRestart,
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
      "keepPlaying",
    ]);
    expect(handleMoveInput).toHaveBeenCalledWith(manager, 2);
    expect(originalUseItem).not.toHaveBeenCalled();
    expect(currentUseItem).toHaveBeenCalledWith("swap");
    expect(originalRestart).not.toHaveBeenCalled();
    expect(currentRestart).toHaveBeenCalledTimes(1);
  });

  it("publishes a current-round reset lifecycle event", () => {
    const dom = new JSDOM("<!doctype html><html><body></body></html>");
    const resetListener = vi.fn();
    dom.window.document.addEventListener(
      OPERATION_FEEDBACK_RESET_EVENT,
      resetListener,
    );

    expect(
      publishOperationFeedbackReset({ getWindowLike: () => dom.window }),
    ).toBe(true);
    expect(resetListener).toHaveBeenCalledTimes(1);
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
    expect(Object.hasOwn(manager, "keepPlaying")).toBe(false);
  });

  it("falls back to keep-playing state and actuator continue without a prototype handler", () => {
    const inputManager = createInputManagerStub();
    const continueGame = vi.fn();
    const manager = {
      inputManager,
      keepPlaying: false,
      actuator: {
        continue: continueGame,
      },
    };

    bindGameManagerInputEvents(manager, { handleMoveInput: vi.fn() });
    inputManager.emit("keepPlaying");

    expect(manager.keepPlaying).toBe(true);
    expect(continueGame).toHaveBeenCalledTimes(1);
  });

  it("creates and installs the legacy runtime shape without replacing an existing runtime", () => {
    const runtime = createGameManagerInputEventsRuntime();
    expect(runtime.bindGameManagerInputEvents).toBe(bindGameManagerInputEvents);
    expect(runtime.normalizeGameMoveInputAttempt).toBe(
      normalizeGameMoveInputAttempt,
    );
    expect(runtime.publishConfirmedOperationFeedback).toBe(
      publishConfirmedOperationFeedback,
    );
    expect(runtime.publishOperationFeedbackReset).toBe(
      publishOperationFeedbackReset,
    );

    const windowLike: {
      CoreGameManagerInputEventsRuntime?: GameManagerInputEventsRuntime;
    } = {};
    expect(installGameManagerInputEventsRuntime({ windowLike })).toBe(
      windowLike.CoreGameManagerInputEventsRuntime,
    );
    expect(
      windowLike.CoreGameManagerInputEventsRuntime?.bindGameManagerInputEvents,
    ).toBe(bindGameManagerInputEvents);

    const existing = { bindGameManagerInputEvents: vi.fn() };
    expect(
      installGameManagerInputEventsRuntime({
        windowLike: { CoreGameManagerInputEventsRuntime: existing },
      }),
    ).toBe(existing);
  });
});
