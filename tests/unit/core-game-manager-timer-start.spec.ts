import { describe, expect, it, vi } from "vitest";

import {
  createGameManagerTimerStartRuntime,
  installGameManagerTimerStartRuntime,
  startTimer,
  type GameManagerTimerStartRuntime
} from "../../src/core/game-manager-timer-start";

describe("core game manager timer start", () => {
  it("starts an idle timer from the resolved elapsed duration", () => {
    const manager = {
      timerStatus: 0,
      notifyUndoSettingsStateChanged: vi.fn()
    };
    const operations = {
      bindTimerVisibilityChangeListener: vi.fn(),
      ensureTimerAnchors: vi.fn(),
      resolveTimerElapsedMs: vi.fn(() => 2_500),
      restartTimerIntervalWithCurrentSettings: vi.fn(),
      updateMoveTimeoutHud: vi.fn()
    };

    startTimer(manager, operations, 10_000);

    expect(operations.ensureTimerAnchors).toHaveBeenCalledWith(manager, 10_000);
    expect(operations.resolveTimerElapsedMs).toHaveBeenCalledWith(manager, 10_000);
    expect(manager.timerStatus).toBe(1);
    expect(manager.hasGameStarted).toBe(true);
    expect(manager.timerFrozen).toBe(false);
    expect(manager.accumulatedTime).toBe(2_500);
    expect(manager.time).toBe(2_500);
    expect(manager.startTime?.getTime()).toBe(7_500);
    expect(manager.notifyUndoSettingsStateChanged).toHaveBeenCalledTimes(1);
    expect(manager.lastStatsPanelUpdateAt).toBe(0);
    expect(operations.bindTimerVisibilityChangeListener).toHaveBeenCalledWith(manager);
    expect(operations.restartTimerIntervalWithCurrentSettings).toHaveBeenCalledWith(manager);
    expect(operations.updateMoveTimeoutHud).toHaveBeenCalledWith(manager, 10_000);
  });

  it("does not restart an already active timer", () => {
    const manager = {
      timerStatus: 1,
      notifyUndoSettingsStateChanged: vi.fn()
    };
    const operations = {
      bindTimerVisibilityChangeListener: vi.fn(),
      ensureTimerAnchors: vi.fn(),
      resolveTimerElapsedMs: vi.fn(),
      restartTimerIntervalWithCurrentSettings: vi.fn(),
      updateMoveTimeoutHud: vi.fn()
    };

    startTimer(manager, operations, 10_000);

    expect(operations.ensureTimerAnchors).not.toHaveBeenCalled();
    expect(operations.restartTimerIntervalWithCurrentSettings).not.toHaveBeenCalled();
    expect(manager.notifyUndoSettingsStateChanged).not.toHaveBeenCalled();
  });

  it("creates and installs the legacy runtime shape without replacing an existing runtime", () => {
    const runtime = createGameManagerTimerStartRuntime();
    expect(runtime.startTimer).toBe(startTimer);

    const windowLike: { CoreGameManagerTimerStartRuntime?: GameManagerTimerStartRuntime } = {};
    expect(installGameManagerTimerStartRuntime({ windowLike })).toBe(
      windowLike.CoreGameManagerTimerStartRuntime
    );
    expect(windowLike.CoreGameManagerTimerStartRuntime?.startTimer).toBe(startTimer);

    const existing = { startTimer: vi.fn() };
    expect(
      installGameManagerTimerStartRuntime({
        windowLike: { CoreGameManagerTimerStartRuntime: existing }
      })
    ).toBe(existing);
  });
});
