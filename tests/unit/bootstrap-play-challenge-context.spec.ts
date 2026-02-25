import { describe, expect, it } from "vitest";

import { resolvePlayChallengeContext } from "../../src/bootstrap/play-challenge-context";

describe("bootstrap play challenge context", () => {
  it("returns null when challenge id is missing", () => {
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
});
