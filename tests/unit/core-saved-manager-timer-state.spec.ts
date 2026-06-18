import { describe, expect, it, vi } from "vitest";

import {
  applySavedManagerTimerState,
  buildSavedTimerSubState,
  createSavedManagerTimerStateRuntime,
  installSavedManagerTimerStateRuntime,
  resolveLegacySecondaryTimerSubStateFromRows,
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
  it("builds saved timer sub-state with secondary rows and legacy compatibility fields", () => {
    const secondaryRows = [
      { parent: 32768, child: 8192, time: "0:08.192", display: "none" },
      { parent: 32768, child: 16384, time: "0:16.384", display: "block" }
    ];
    const expandedParents = [32768];

    expect(buildSavedTimerSubState({ secondaryRows, expandedParents })).toEqual({
      timer_secondary_rows: secondaryRows,
      timer_secondary_expanded_parents: expandedParents,
      timer_sub_8192: "0:08.192",
      timer_sub_16384: "0:16.384",
      timer_sub_visible: true
    });
  });

  it("normalizes invalid saved timer sub-state inputs to empty arrays and legacy fields", () => {
    expect(buildSavedTimerSubState({ secondaryRows: null, expandedParents: "bad" })).toEqual({
      timer_secondary_rows: [],
      timer_secondary_expanded_parents: [],
      timer_sub_8192: "",
      timer_sub_16384: "",
      timer_sub_visible: false
    });
  });

  it("derives legacy secondary timer fields from compatible secondary rows", () => {
    expect(
      resolveLegacySecondaryTimerSubStateFromRows([
        { parent: 32768, child: 8192, time: "0:08.192", display: "none" },
        { parent: 32768, child: 16384, time: "0:16.384", display: "block" },
        { parent: 16384, child: 8192, time: "wrong-parent", display: "block" },
        { parent: 32768, child: 4096, time: "wrong-child", display: "block" }
      ])
    ).toEqual({
      timer_sub_8192: "0:08.192",
      timer_sub_16384: "0:16.384",
      timer_sub_visible: true
    });
  });

  it("normalizes invalid secondary timer rows to empty legacy fields", () => {
    expect(
      resolveLegacySecondaryTimerSubStateFromRows([
        null,
        "bad",
        { parent: 32768, child: 8192, time: 8192, display: "block" },
        { parent: 32768, child: 16384, time: null, display: "none" }
      ])
    ).toEqual({
      timer_sub_8192: "",
      timer_sub_16384: "",
      timer_sub_visible: true
    });
  });

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
    expect(runtime.buildSavedTimerSubState).toBe(buildSavedTimerSubState);
    expect(runtime.resolveLegacySecondaryTimerSubStateFromRows).toBe(
      resolveLegacySecondaryTimerSubStateFromRows
    );

    const windowLike: { CoreSavedManagerTimerStateRuntime?: SavedManagerTimerStateRuntime } = {};
    expect(installSavedManagerTimerStateRuntime({ windowLike })).toBe(
      windowLike.CoreSavedManagerTimerStateRuntime
    );
    expect(windowLike.CoreSavedManagerTimerStateRuntime?.applySavedManagerTimerState).toBe(
      applySavedManagerTimerState
    );
    expect(windowLike.CoreSavedManagerTimerStateRuntime?.buildSavedTimerSubState).toBe(
      buildSavedTimerSubState
    );
    expect(windowLike.CoreSavedManagerTimerStateRuntime?.resolveLegacySecondaryTimerSubStateFromRows).toBe(
      resolveLegacySecondaryTimerSubStateFromRows
    );

    const existing = {
      applySavedManagerTimerState: vi.fn(),
      buildSavedTimerSubState: vi.fn(),
      resolveLegacySecondaryTimerSubStateFromRows: vi.fn()
    };
    expect(
      installSavedManagerTimerStateRuntime({
        windowLike: { CoreSavedManagerTimerStateRuntime: existing }
      })
    ).toBe(existing);
  });
});
