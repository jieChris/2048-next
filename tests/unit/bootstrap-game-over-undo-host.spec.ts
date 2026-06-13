import { describe, expect, it, vi } from "vitest";

import {
  bindGameOverUndoControl,
  createGameOverUndoHostRuntime,
  installGameOverUndoHostRuntime,
  type GameOverUndoHostRuntime
} from "../../src/bootstrap/game-over-undo-host";

function createFakeElement() {
  const handlers: Record<string, (event?: unknown) => void> = {};
  const element = {
    handlers,
    optionsByEvent: {} as Record<string, unknown>,
    addEventListener(name: string, cb: (event?: unknown) => void, options?: unknown) {
      handlers[name] = cb;
      this.optionsByEvent[name] = options;
    }
  };
  return element;
}

describe("bootstrap game over undo host", () => {
  it("creates the legacy CoreGameOverUndoHostRuntime shape from TypeScript functions", () => {
    const runtime = createGameOverUndoHostRuntime();

    expect(runtime.bindGameOverUndoControl).toBe(bindGameOverUndoControl);
  });

  it("installs the runtime on a supplied window-like object", () => {
    const windowLike: { CoreGameOverUndoHostRuntime?: GameOverUndoHostRuntime } = {};

    const installed = installGameOverUndoHostRuntime({ windowLike });

    expect(installed).toBe(windowLike.CoreGameOverUndoHostRuntime);
    expect(installed?.bindGameOverUndoControl).toBeTypeOf("function");
  });

  it("does not overwrite an existing host runtime", () => {
    const existing = createGameOverUndoHostRuntime();
    const windowLike = { CoreGameOverUndoHostRuntime: existing };

    const installed = installGameOverUndoHostRuntime({ windowLike });

    expect(installed).toBe(existing);
    expect(windowLike.CoreGameOverUndoHostRuntime).toBe(existing);
  });

  it("returns null when no window-like target is available", () => {
    expect(installGameOverUndoHostRuntime({ windowLike: null })).toBeNull();
  });

  it("binds click/touch handlers and keeps touch guard behavior", () => {
    const tryUndo = vi.fn();
    const control = createFakeElement();
    const nowValues = [1000, 1200, 1600];
    let index = 0;

    const result = bindGameOverUndoControl({
      getElementById(id: string) {
        return id === "undo-btn-gameover" ? control : null;
      },
      tryUndo,
      nowMs() {
        const value = nowValues[index] ?? 2000;
        index += 1;
        return value;
      },
      touchGuardWindowMs: 450
    });

    expect(result).toEqual({
      didBind: true,
      boundControlCount: 2
    });
    expect(control.optionsByEvent.touchend).toEqual({ passive: false });

    const touchEvent = { preventDefault: vi.fn() };
    control.handlers.touchend(touchEvent);
    expect(touchEvent.preventDefault).toHaveBeenCalledTimes(1);
    expect(tryUndo).toHaveBeenCalledTimes(1);

    const clickEventBlocked = { preventDefault: vi.fn() };
    control.handlers.click(clickEventBlocked);
    expect(clickEventBlocked.preventDefault).toHaveBeenCalledTimes(1);
    expect(tryUndo).toHaveBeenCalledTimes(1);

    const clickEventAllowed = { preventDefault: vi.fn() };
    control.handlers.click(clickEventAllowed);
    expect(clickEventAllowed.preventDefault).toHaveBeenCalledTimes(1);
    expect(tryUndo).toHaveBeenCalledTimes(2);
  });

  it("returns noop when required dependencies are missing", () => {
    expect(bindGameOverUndoControl({})).toEqual({
      didBind: false,
      boundControlCount: 0
    });
  });
});
