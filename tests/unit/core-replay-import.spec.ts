import { describe, expect, it } from "vitest";

import { parseReplayImportEnvelope } from "../../src/core/replay-import";

describe("core replay import: parseReplayImportEnvelope", () => {
  it("parses json v3 envelope", () => {
    const payload = JSON.stringify({
      v: 3,
      mode_key: "classic_4x4_pow2_undo",
      seed: 0.5,
      actions: [0, 1, -1],
      special_rules_snapshot: { lock_after_undo: true },
      mode_family: "pow2",
      rank_policy: "ranked",
      challenge_id: "challenge-1"
    });
    const parsed = parseReplayImportEnvelope({
      trimmedReplayString: payload,
      fallbackModeKey: "standard_4x4_pow2_no_undo"
    });

    expect(parsed).not.toBeNull();
    expect(parsed?.kind).toBe("json-v3");
    if (!parsed || parsed.kind !== "json-v3") return;
    expect(parsed.modeKey).toBe("classic_4x4_pow2_undo");
    expect(parsed.seed).toBe(0.5);
    expect(parsed.actions).toEqual([0, 1, -1]);
    expect(parsed.specialRulesSnapshot).toEqual({ lock_after_undo: true });
    expect(parsed.modeFamily).toBe("pow2");
    expect(parsed.rankPolicy).toBe("ranked");
    expect(parsed.challengeId).toBe("challenge-1");
  });

  it("uses fallback mode key for json v3 when mode is missing", () => {
    const payload = JSON.stringify({ v: 3, seed: 0.1, actions: [] });
    const parsed = parseReplayImportEnvelope({
      trimmedReplayString: payload,
      fallbackModeKey: "practice_legacy"
    });
    expect(parsed).not.toBeNull();
    expect(parsed?.kind).toBe("json-v3");
    if (!parsed || parsed.kind !== "json-v3") return;
    expect(parsed.modeKey).toBe("practice_legacy");
  });

  it("throws for invalid json v3 actions", () => {
    const payload = JSON.stringify({ v: 3, actions: 123 });
    expect(() =>
      parseReplayImportEnvelope({
        trimmedReplayString: payload,
        fallbackModeKey: "practice_legacy"
      })
    ).toThrow("Invalid v3 actions");
  });

  it("throws for unsupported json replay version", () => {
    const payload = JSON.stringify({ v: 2, actions: [] });
    expect(() =>
      parseReplayImportEnvelope({
        trimmedReplayString: payload,
        fallbackModeKey: "practice_legacy"
      })
    ).toThrow("Unsupported JSON replay version");
  });

  it("parses v4C envelope with mode mapping", () => {
    const parsed = parseReplayImportEnvelope({
      trimmedReplayString: "REPLAY_v4C_C" + "!".repeat(16) + "abc",
      fallbackModeKey: "practice_legacy"
    });
    expect(parsed).not.toBeNull();
    expect(parsed?.kind).toBe("v4c");
    if (!parsed || parsed.kind !== "v4c") return;
    expect(parsed.modeKey).toBe("classic_4x4_pow2_undo");
    expect(parsed.initialBoardEncoded).toBe("!".repeat(16));
    expect(parsed.actionsEncoded).toBe("abc");
  });

  it("throws for invalid v4C payload size", () => {
    expect(() =>
      parseReplayImportEnvelope({
        trimmedReplayString: "REPLAY_v4C_Cshort",
        fallbackModeKey: "practice_legacy"
      })
    ).toThrow("Invalid v4C payload");
  });

  it("throws for invalid v4C mode code", () => {
    expect(() =>
      parseReplayImportEnvelope({
        trimmedReplayString: "REPLAY_v4C_X" + "!".repeat(16),
        fallbackModeKey: "practice_legacy"
      })
    ).toThrow("Invalid v4C mode");
  });

  it("returns null for non-v3 non-v4 payloads", () => {
    const parsed = parseReplayImportEnvelope({
      trimmedReplayString: "REPLAY_v2_abc",
      fallbackModeKey: "practice_legacy"
    });
    expect(parsed).toBeNull();
  });
});
