import { describe, expect, it } from "vitest";

import {
  DEFAULT_PLAY_MODE_KEY,
  parsePlayChallengeId,
  parsePlayModeKey
} from "../../src/bootstrap/play-query";

describe("bootstrap play query", () => {
  it("uses default mode key when mode_key is missing", () => {
    expect(parsePlayModeKey("")).toBe(DEFAULT_PLAY_MODE_KEY);
    expect(parsePlayModeKey("?challenge_id=a")).toBe(DEFAULT_PLAY_MODE_KEY);
  });

  it("parses and trims mode_key from search params", () => {
    expect(parsePlayModeKey("?mode_key=spawn_custom_4x4_pow2_no_undo")).toBe(
      "spawn_custom_4x4_pow2_no_undo"
    );
    expect(parsePlayModeKey("?mode_key=%20classic_4x4_pow2_undo%20")).toBe(
      "classic_4x4_pow2_undo"
    );
  });

  it("maps legacy challenge alias to capped mode", () => {
    expect(parsePlayModeKey("?mode_key=challenge")).toBe("capped_4x4_pow2_64_no_undo");
    expect(parsePlayModeKey("?mode_key=ChALlenGe")).toBe("capped_4x4_pow2_64_no_undo");
  });

  it("parses and trims challenge id", () => {
    expect(parsePlayChallengeId("?challenge_id=abc")).toBe("abc");
    expect(parsePlayChallengeId("?challenge_id=%20abc-1%20")).toBe("abc-1");
  });

  it("returns empty string for missing challenge id", () => {
    expect(parsePlayChallengeId("")).toBe("");
    expect(parsePlayChallengeId("?mode_key=standard_4x4_pow2_no_undo")).toBe("");
  });
});
