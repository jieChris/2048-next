import { describe, expect, it, vi } from "vitest";

import {
  createSetupUiStateRuntime,
  finalizeSetupUiAndStatsState,
  installSetupUiStateRuntime,
  type SetupUiStateRuntime
} from "../../src/core/setup-ui-state";

function createManager(options: { restored?: boolean } = {}) {
  const windowLike = {
    cappedTimerReset: vi.fn(),
    updateTimerScroll: vi.fn(),
    updateItemModeHud: vi.fn(),
    resetMoveTimeoutDeadline: vi.fn(),
    hasMoveTimeoutMode: vi.fn(() => true),
    updateMoveTimeoutHud: vi.fn()
  };
  return {
    getWindowLike: () => windowLike,
    refreshSpawnRateDisplay: vi.fn(),
    updateUndoUiState: vi.fn(),
    notifyUndoSettingsStateChanged: vi.fn(),
    applyTimerModuleView: vi.fn(),
    actuate: vi.fn(),
    updateStatsPanel: vi.fn(),
    callWindowMethod: vi.fn((name: string) => {
      const fn = (windowLike as Record<string, unknown>)[name];
      if (typeof fn === "function") {
        (fn as () => void)();
        return true;
      }
      return false;
    }),
    replayMode: false,
    timerStatus: options.restored ? 1 : 0
  };
}

describe("core setup ui state runtime", () => {
  it("creates the legacy CoreSetupUiStateRuntime shape from TypeScript functions", () => {
    const runtime = createSetupUiStateRuntime();

    expect(runtime.finalizeSetupUiAndStatsState).toBe(finalizeSetupUiAndStatsState);
  });

  it("installs the runtime on a supplied window-like object", () => {
    const windowLike: { CoreSetupUiStateRuntime?: SetupUiStateRuntime } = {};

    const installed = installSetupUiStateRuntime({ windowLike });

    expect(installed).toBe(windowLike.CoreSetupUiStateRuntime);
    expect(installed?.finalizeSetupUiAndStatsState).toBeTypeOf("function");
  });

  it("syncs UI and stats and starts the timer only when needed", () => {
    const manager = createManager({ restored: false });

    finalizeSetupUiAndStatsState(manager, "compact", false);

    expect(manager.refreshSpawnRateDisplay).toHaveBeenCalledTimes(1);
    expect(manager.updateUndoUiState).toHaveBeenCalledTimes(1);
    expect(manager.notifyUndoSettingsStateChanged).toHaveBeenCalledTimes(1);
    expect(manager.applyTimerModuleView).toHaveBeenCalledWith("compact", true);
    expect(manager.actuate).toHaveBeenCalledTimes(1);
    expect(manager.updateStatsPanel).toHaveBeenCalledWith(0, 0, 0, 0, 0);
    expect(manager.callWindowMethod).not.toHaveBeenCalledWith("cappedTimerReset");
    expect(manager.getWindowLike().updateItemModeHud).toHaveBeenCalledTimes(1);
    expect(manager.getWindowLike().resetMoveTimeoutDeadline).toHaveBeenCalledTimes(1);
    expect(manager.getWindowLike().updateMoveTimeoutHud).toHaveBeenCalledTimes(1);
    expect(manager.getWindowLike().cappedTimerReset).not.toHaveBeenCalled();
  });

  it("restores timer state and updates stats panel after saved-state restore", () => {
    const manager = createManager({ restored: true });

    finalizeSetupUiAndStatsState(manager, "full", true);

    expect(manager.callWindowMethod).toHaveBeenCalledWith("cappedTimerReset");
    expect(manager.getWindowLike().cappedTimerReset).toHaveBeenCalledTimes(1);
    expect(manager.updateStatsPanel).toHaveBeenCalledWith();
  });
});
