import { describe, expect, it, vi } from "vitest";

import { applyTopActionBindings } from "../../src/bootstrap/top-action-bindings-host";

function createFakeElement() {
  const handlers: Record<string, (event?: unknown) => void> = {};
  const element = {
    handlers,
    bindCallCount: 0,
    addEventListener(name: string, cb: (event?: unknown) => void) {
      if (this === element) element.bindCallCount += 1;
      handlers[name] = cb;
    }
  };
  return element;
}

describe("bootstrap top action bindings host", () => {
  it("binds top action events and delegates handlers", () => {
    const tryUndo = vi.fn();
    const exportReplay = vi.fn();
    const openPracticeBoardFromCurrent = vi.fn();
    const openSettingsModal = vi.fn();
    const closeSettingsModal = vi.fn();

    const elements: Record<string, ReturnType<typeof createFakeElement>> = {
      "undo-link": createFakeElement(),
      "top-export-replay-btn": createFakeElement(),
      "top-practice-btn": createFakeElement(),
      "practice-mobile-undo-btn": createFakeElement(),
      "top-settings-btn": createFakeElement(),
      "settings-modal": createFakeElement()
    };

    const result = applyTopActionBindings({
      getElementById(id: string) {
        return elements[id] || null;
      },
      tryUndo,
      exportReplay,
      openPracticeBoardFromCurrent,
      openSettingsModal,
      closeSettingsModal
    });

    expect(result).toEqual({ didBind: true, boundControlCount: 6 });

    const withPreventDefault = [
      "undo-link",
      "top-export-replay-btn",
      "top-practice-btn",
      "practice-mobile-undo-btn",
      "top-settings-btn"
    ];
    for (let i = 0; i < withPreventDefault.length; i++) {
      const id = withPreventDefault[i];
      const event = { preventDefault: vi.fn() };
      elements[id].handlers.click(event);
      expect(event.preventDefault).toHaveBeenCalledTimes(1);
    }

    expect(tryUndo).toHaveBeenCalledTimes(2);
    expect(exportReplay).toHaveBeenCalledTimes(1);
    expect(openPracticeBoardFromCurrent).toHaveBeenCalledTimes(1);
    expect(openSettingsModal).toHaveBeenCalledTimes(1);
    expect(closeSettingsModal).toHaveBeenCalledTimes(0);

    elements["settings-modal"].handlers.click({ target: {} });
    expect(closeSettingsModal).toHaveBeenCalledTimes(0);

    elements["settings-modal"].handlers.click({ target: elements["settings-modal"] });
    expect(closeSettingsModal).toHaveBeenCalledTimes(1);
  });

  it("returns noop when getElementById is missing", () => {
    expect(applyTopActionBindings({})).toEqual({
      didBind: false,
      boundControlCount: 0
    });
  });
});
