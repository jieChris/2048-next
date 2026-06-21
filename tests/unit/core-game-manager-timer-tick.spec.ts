import { describe, expect, it, vi } from "vitest";

import {
  createGameManagerTimerTickRuntime,
  executeTimerTick,
  installGameManagerTimerTickRuntime,
  type GameManagerTimerTickRuntime
} from "../../src/core/game-manager-timer-tick";

describe("core game manager timer tick", () => {
  it("updates timer text, IPS display and throttled stats panel refresh", () => {
    const timerEl = { textContent: "" };
    const overlay = { style: { display: "block" } };
    const manager = {
      startTime: new Date(1_000),
      pretty: vi.fn(() => "00:02"),
      updateStatsPanel: vi.fn(),
      lastStatsPanelUpdateAt: 0
    };
    const operations = {
      checkAndHandleMoveTimeout: vi.fn(() => false),
      resolveTimerElapsedMs: vi.fn(() => 2_000),
      resolveManagerElementById: vi.fn((_manager: unknown, id: string) =>
        id === "timer" ? timerEl : id === "stats-panel-overlay" ? overlay : null
      ),
      updateMoveTimeoutHud: vi.fn(),
      refreshIpsDisplay: vi.fn(),
      shouldUpdateStatsPanelAtTimerTick: vi.fn(() => true)
    };

    executeTimerTick(manager, operations, 3_000);

    expect(operations.checkAndHandleMoveTimeout).toHaveBeenCalledWith(manager, 3_000);
    expect(operations.resolveTimerElapsedMs).toHaveBeenCalledWith(manager, 3_000);
    expect(manager.time).toBe(2_000);
    expect(timerEl.textContent).toBe("00:02");
    expect(manager.pretty).toHaveBeenCalledWith(2_000);
    expect(operations.updateMoveTimeoutHud).toHaveBeenCalledWith(manager, 3_000);
    expect(operations.refreshIpsDisplay).toHaveBeenCalledWith(manager, 2_000);
    expect(operations.shouldUpdateStatsPanelAtTimerTick).toHaveBeenCalledWith(manager, overlay, 2_000);
    expect(manager.updateStatsPanel).toHaveBeenCalledTimes(1);
    expect(manager.lastStatsPanelUpdateAt).toBe(2_000);
  });

  it("stops before timer updates when move timeout is handled", () => {
    const manager = {
      startTime: new Date(1_000),
      pretty: vi.fn(),
      updateStatsPanel: vi.fn()
    };
    const operations = {
      checkAndHandleMoveTimeout: vi.fn(() => true),
      resolveTimerElapsedMs: vi.fn(),
      resolveManagerElementById: vi.fn(),
      refreshIpsDisplay: vi.fn(),
      shouldUpdateStatsPanelAtTimerTick: vi.fn()
    };

    executeTimerTick(manager, operations, 3_000);

    expect(operations.resolveTimerElapsedMs).not.toHaveBeenCalled();
    expect(operations.refreshIpsDisplay).not.toHaveBeenCalled();
    expect(manager.updateStatsPanel).not.toHaveBeenCalled();
  });

  it("creates and installs the legacy runtime shape without replacing an existing runtime", () => {
    const runtime = createGameManagerTimerTickRuntime();
    expect(runtime.executeTimerTick).toBe(executeTimerTick);

    const windowLike: { CoreGameManagerTimerTickRuntime?: GameManagerTimerTickRuntime } = {};
    expect(installGameManagerTimerTickRuntime({ windowLike })).toBe(
      windowLike.CoreGameManagerTimerTickRuntime
    );
    expect(windowLike.CoreGameManagerTimerTickRuntime?.executeTimerTick).toBe(executeTimerTick);

    const existing = { executeTimerTick: vi.fn() };
    expect(
      installGameManagerTimerTickRuntime({
        windowLike: { CoreGameManagerTimerTickRuntime: existing }
      })
    ).toBe(existing);
  });
});
