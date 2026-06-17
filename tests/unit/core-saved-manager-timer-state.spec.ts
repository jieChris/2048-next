import { describe, expect, it, vi } from "vitest";

import {
  applySavedManagerTimerState,
  createSavedManagerTimerStateRuntime,
  installSavedManagerTimerStateRuntime,
  type SavedManagerTimerStateRuntime
} from "../../src/core/saved-manager-timer-state";

function createManager() {
  return {
    accumulatedTime: 0,
    time: 0,
    startTime: new Date(1),
    timerStatus: 1,
    timerFrozen: false,
    timerElapsedOffsetMs: 0,
    timerAnchorLocalMs: 0,
    timerAnchorServerMs: 0
  };
}

describe("core saved manager timer state runtime", () => {
  it("restores active timer duration from saved anchors across closed-page time", () => {
    vi.useFakeTimers();
    vi.setSystemTime(20_000);
    const manager = createManager();

    applySavedManagerTimerState(manager, {
      duration_ms: 3_000,
      timer_status: 1,
      timer_elapsed_offset_ms: 1_000,
      timer_anchor_local_ms: 5_000,
      timer_anchor_server_ms: 15_000,
      over: false,
      won: false,
      keep_playing: false,
      timer_frozen: false
    });

    expect(manager.accumulatedTime).toBe(16_000);
    expect(manager.time).toBe(16_000);
    expect(manager.timerElapsedOffsetMs).toBe(1_000);
    expect(manager.timerAnchorLocalMs).toBe(5_000);
    expect(manager.timerAnchorServerMs).toBe(15_000);
    expect(manager.startTime).toBeNull();
    expect(manager.timerStatus).toBe(0);
    vi.useRealTimers();
  });

  it("uses saved started-at time as a fallback active duration source", () => {
    vi.useFakeTimers();
    vi.setSystemTime(20_000);
    const manager = createManager();

    applySavedManagerTimerState(manager, {
      duration_ms: 2_500,
      timer_status: 1,
      timer_started_at_ms: 12_000,
      over: false,
      won: false,
      keep_playing: false,
      timer_frozen: false
    });

    expect(manager.accumulatedTime).toBe(8_000);
    expect(manager.time).toBe(8_000);
    expect(manager.timerElapsedOffsetMs).toBe(8_000);
    expect(manager.timerAnchorLocalMs).toBeNull();
    expect(manager.timerAnchorServerMs).toBeNull();
    vi.useRealTimers();
  });

  it("does not resume terminal or frozen timer anchors", () => {
    const manager = createManager();

    applySavedManagerTimerState(manager, {
      duration_ms: 4_000,
      timer_status: 1,
      timer_elapsed_offset_ms: 1_000,
      timer_anchor_local_ms: 5_000,
      timer_anchor_server_ms: 15_000,
      over: false,
      won: true,
      keep_playing: false,
      timer_frozen: true
    });

    expect(manager.accumulatedTime).toBe(4_000);
    expect(manager.time).toBe(4_000);
    expect(manager.timerFrozen).toBe(true);
    expect(manager.timerElapsedOffsetMs).toBe(4_000);
    expect(manager.timerAnchorLocalMs).toBeNull();
    expect(manager.timerAnchorServerMs).toBeNull();
    expect(manager.startTime).toBeNull();
    expect(manager.timerStatus).toBe(0);
  });

  it("creates and installs the legacy runtime shape without replacing an existing runtime", () => {
    const runtime = createSavedManagerTimerStateRuntime();
    expect(runtime.applySavedManagerTimerState).toBe(applySavedManagerTimerState);

    const windowLike: { CoreSavedManagerTimerStateRuntime?: SavedManagerTimerStateRuntime } = {};
    expect(installSavedManagerTimerStateRuntime({ windowLike })).toBe(
      windowLike.CoreSavedManagerTimerStateRuntime
    );
    expect(windowLike.CoreSavedManagerTimerStateRuntime?.applySavedManagerTimerState).toBe(
      applySavedManagerTimerState
    );

    const existing = { applySavedManagerTimerState: vi.fn() };
    expect(
      installSavedManagerTimerStateRuntime({
        windowLike: { CoreSavedManagerTimerStateRuntime: existing }
      })
    ).toBe(existing);
  });
});
