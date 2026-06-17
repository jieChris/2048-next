import { describe, expect, it, vi } from "vitest";

import {
  createSavedPayloadRichnessRuntime,
  installSavedPayloadRichnessRuntime,
  resolveSavedPayloadRichnessScore,
  type SavedPayloadRichnessRuntime
} from "../../src/core/saved-payload-richness";

describe("core saved payload richness", () => {
  it("counts only non-empty richness fields and rejects invalid payloads", () => {
    expect(resolveSavedPayloadRichnessScore(null)).toBe(-1);
    expect(
      resolveSavedPayloadRichnessScore({
        move_history: [],
        replay_compact_log: "  ",
        session_replay_v1: { records: [] },
        session_replay_v3: [],
        spawn_value_counts: { "2": 1 },
        replay_string: "REPLAY_v1RPL_B64_demo",
        timer_fixed_rows: {},
        timer_dynamic_rows_capped: [1],
        timer_dynamic_rows_overflow: undefined,
        timer_secondary_rows: null,
        timer_secondary_expanded_parents: 0,
        timer_sub_8192: false,
        timer_sub_16384: "",
        timer_sub_visible: "yes"
      })
    ).toBe(7);
  });

  it("creates and installs the legacy runtime shape without replacing an existing runtime", () => {
    const runtime = createSavedPayloadRichnessRuntime();
    expect(runtime.resolveSavedPayloadRichnessScore).toBe(resolveSavedPayloadRichnessScore);

    const windowLike: { CoreSavedPayloadRichnessRuntime?: SavedPayloadRichnessRuntime } = {};
    expect(installSavedPayloadRichnessRuntime({ windowLike })).toBe(
      windowLike.CoreSavedPayloadRichnessRuntime
    );
    expect(windowLike.CoreSavedPayloadRichnessRuntime?.resolveSavedPayloadRichnessScore).toBe(
      resolveSavedPayloadRichnessScore
    );

    const existing = { resolveSavedPayloadRichnessScore: vi.fn(() => 1) };
    expect(
      installSavedPayloadRichnessRuntime({
        windowLike: { CoreSavedPayloadRichnessRuntime: existing }
      })
    ).toBe(existing);
  });
});
