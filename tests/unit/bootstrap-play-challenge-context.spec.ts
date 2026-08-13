import { describe, expect, it } from "vitest";

import { resolvePlayChallengeContext } from "../../src/bootstrap/play-challenge-context";

describe("bootstrap play challenge context", () => {
  it("returns null when challenge id and existing context are both missing", () => {
    expect(resolvePlayChallengeContext({ challengeId: "", modeConfig: { key: "x" } })).toBeNull();
    expect(resolvePlayChallengeContext({ challengeId: "   ", modeConfig: { key: "x" } })).toBeNull();
  });

  it("builds context with trimmed id and mode key", () => {
    expect(
      resolvePlayChallengeContext({
        challengeId: "  abc  ",
        modeConfig: { key: "  standard_4x4_pow2_no_undo  " }
      })
    ).toEqual({
      id: "abc",
      mode_key: "standard_4x4_pow2_no_undo"
    });
  });

  it("keeps mode_key empty when mode config key is unavailable", () => {
    expect(
      resolvePlayChallengeContext({
        challengeId: "abc",
        modeConfig: {}
      })
    ).toEqual({
      id: "abc",
      mode_key: ""
    });
  });

  it("reuses existing ranked context when it matches the resolved mode", () => {
    expect(
      resolvePlayChallengeContext({
        challengeId: "",
        modeConfig: { key: "standard_4x4_pow2_no_undo" },
        existingContext: {
          id: "rch_1",
          mode_key: "standard_4x4_pow2_no_undo",
          seed: 123,
          ranked_session_token: "rs1.token"
        }
      })
    ).toEqual({
      id: "rch_1",
      mode_key: "standard_4x4_pow2_no_undo",
      seed: 123,
      ranked_session_token: "rs1.token",
      spawn_sequence_version: 1
    });
  });

  it("falls back to existing plain context when challenge id is absent", () => {
    expect(
      resolvePlayChallengeContext({
        challengeId: "",
        modeConfig: { key: "classic_4x4_pow2_undo" },
        existingContext: {
          id: "daily-2",
          mode_key: "classic_4x4_pow2_undo"
        }
      })
    ).toEqual({
      id: "daily-2",
      mode_key: "classic_4x4_pow2_undo",
      spawn_sequence_version: 1
    });
  });
});
