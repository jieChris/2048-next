import { describe, expect, it, vi } from "vitest";

import { bindGameOverUndoControl } from "../../src/bootstrap/game-over-undo-host";

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
