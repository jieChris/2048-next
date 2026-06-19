import { describe, expect, it, vi } from "vitest";

import {
  createGameManagerTimerRowVisibleStateRuntime,
  installGameManagerTimerRowVisibleStateRuntime,
  setTimerRowVisibleState,
  type GameManagerTimerRowVisibleStateRuntime
} from "../../src/core/game-manager-timer-row-visible-state";

function createRow() {
  return {
    removeAttribute: vi.fn(),
    style: {
      display: "",
      visibility: "",
      pointerEvents: ""
    }
  };
}

describe("core game manager timer row visible state", () => {
  it("shows a timer row and clears scroll-hidden state", () => {
    const row = createRow();
    const manager = {
      getTimerRowEl: vi.fn(() => row)
    };

    setTimerRowVisibleState(manager, 16, true, false);

    expect(manager.getTimerRowEl).toHaveBeenCalledWith(16);
    expect(row.removeAttribute).toHaveBeenCalledWith("data-scroll-hidden");
    expect(row.style).toEqual({
      display: "block",
      visibility: "visible",
      pointerEvents: ""
    });
  });

  it("hides a timer row while keeping layout space", () => {
    const row = createRow();

    setTimerRowVisibleState({ getTimerRowEl: () => row }, 32, false, true);

    expect(row.style).toEqual({
      display: "block",
      visibility: "hidden",
      pointerEvents: "none"
    });
  });

  it("collapses a timer row when layout space is not kept", () => {
    const row = createRow();

    setTimerRowVisibleState({ getTimerRowEl: () => row }, 64, false, false);

    expect(row.style).toEqual({
      display: "none",
      visibility: "",
      pointerEvents: ""
    });
  });

  it("creates and installs the legacy runtime shape without replacing an existing runtime", () => {
    const runtime = createGameManagerTimerRowVisibleStateRuntime();
    expect(runtime.setTimerRowVisibleState).toBe(setTimerRowVisibleState);

    const windowLike: {
      CoreGameManagerTimerRowVisibleStateRuntime?: GameManagerTimerRowVisibleStateRuntime;
    } = {};
    expect(installGameManagerTimerRowVisibleStateRuntime({ windowLike })).toBe(
      windowLike.CoreGameManagerTimerRowVisibleStateRuntime
    );
    expect(windowLike.CoreGameManagerTimerRowVisibleStateRuntime?.setTimerRowVisibleState).toBe(
      setTimerRowVisibleState
    );

    const existing = {
      setTimerRowVisibleState: vi.fn()
    };
    expect(
      installGameManagerTimerRowVisibleStateRuntime({
        windowLike: { CoreGameManagerTimerRowVisibleStateRuntime: existing }
      })
    ).toBe(existing);
  });
});
