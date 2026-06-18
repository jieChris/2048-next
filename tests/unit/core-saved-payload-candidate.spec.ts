import { describe, expect, it, vi } from "vitest";

import {
  createSavedPayloadCandidateRuntime,
  installSavedPayloadCandidateRuntime,
  resolveLatestSavedPayloadCandidate,
  type SavedPayloadCandidateRuntime
} from "../../src/core/saved-payload-candidate";

describe("core saved payload candidate", () => {
  it("prefers the richer payload when timestamps are equal", () => {
    const savedAt = 1700000000000;
    const litePayload = {
      saved_at: savedAt,
      mode_key: "practice",
      board: [[2, 0, 0, 0]],
      replay_compact_log: ""
    };
    const fullPayload = {
      saved_at: savedAt,
      mode_key: "practice",
      board: [[2, 0, 0, 0]],
      replay_compact_log: "m1",
      timer_fixed_rows: {}
    };

    expect(resolveLatestSavedPayloadCandidate([null, litePayload, fullPayload])).toBe(fullPayload);
  });

  it("keeps a richer same-position payload ahead of a newer lite snapshot", () => {
    const fullPayload = {
      saved_at: 1700000000000,
      mode_key: "standard_4x4_pow2_no_undo",
      score: 32,
      board: [[2, 4]],
      replay_string: "REPLAY_v1RPL_B64_rescue",
      timer_fixed_rows: { "32768": { timerText: "1:23.456" } }
    };
    const newerLitePayload = {
      saved_at: 1700000001000,
      mode_key: "standard_4x4_pow2_no_undo",
      score: 32,
      board: [[2, 4]],
      replay_string: "",
      timer_fixed_rows: undefined
    };

    expect(resolveLatestSavedPayloadCandidate([fullPayload, newerLitePayload])).toBe(fullPayload);
  });

  it("creates and installs the legacy runtime shape without replacing an existing runtime", () => {
    const runtime = createSavedPayloadCandidateRuntime();
    expect(runtime.resolveLatestSavedPayloadCandidate).toBe(resolveLatestSavedPayloadCandidate);

    const windowLike: { CoreSavedPayloadCandidateRuntime?: SavedPayloadCandidateRuntime } = {};
    expect(installSavedPayloadCandidateRuntime({ windowLike })).toBe(
      windowLike.CoreSavedPayloadCandidateRuntime
    );
    expect(windowLike.CoreSavedPayloadCandidateRuntime?.resolveLatestSavedPayloadCandidate).toBe(
      resolveLatestSavedPayloadCandidate
    );

    const existing = { resolveLatestSavedPayloadCandidate: vi.fn() };
    expect(
      installSavedPayloadCandidateRuntime({
        windowLike: { CoreSavedPayloadCandidateRuntime: existing }
      })
    ).toBe(existing);
  });
});
