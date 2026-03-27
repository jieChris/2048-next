import { describe, expect, it } from "vitest";

import { parseReplayImportEnvelope, detectReplayFormat } from "../../src/core/replay-import";

describe("core replay import: parseReplayImportEnvelope", () => {
  it("parses v1 base64 envelope", () => {
    const parsed = parseReplayImportEnvelope({
      trimmedReplayString: "REPLAY_v1RPL_B64_AQID",
      fallbackModeKey: "practice"
    });
    expect(parsed).not.toBeNull();
    expect(parsed?.kind).toBe("v1rpl-b64");
    if (!parsed || parsed.kind !== "v1rpl-b64") return;
    expect(parsed.encodedBase64).toBe("AQID");
  });

  it("throws for empty v1 base64 payload", () => {
    expect(() =>
      parseReplayImportEnvelope({
        trimmedReplayString: "REPLAY_v1RPL_B64_",
        fallbackModeKey: "practice"
      })
    ).toThrow("Invalid replay v1 payload");
  });

  it("parses v4C envelope with mode mapping", () => {
    const parsed = parseReplayImportEnvelope({
      trimmedReplayString: "REPLAY_v4C_C" + "!".repeat(16) + "abc",
      fallbackModeKey: "practice"
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
        fallbackModeKey: "practice"
      })
    ).toThrow("Invalid v4C payload");
  });

  it("throws for invalid v4C mode code", () => {
    expect(() =>
      parseReplayImportEnvelope({
        trimmedReplayString: "REPLAY_v4C_X" + "!".repeat(16),
        fallbackModeKey: "practice"
      })
    ).toThrow("Invalid v4C mode");
  });

  it("returns null for unsupported legacy payloads", () => {
    expect(
      parseReplayImportEnvelope({
        trimmedReplayString: "REPLAY_v2_abc",
        fallbackModeKey: "practice"
      })
    ).toBeNull();
  });

  it("parses v3 JSON envelope with mode key and seed", () => {
    const parsed = parseReplayImportEnvelope({
      trimmedReplayString: JSON.stringify({
        v: 3,
        mode_key: "diag_4x4_pow2_no_undo",
        seed: 0.125,
        actions: [["m", 6], ["u"]]
      }),
      fallbackModeKey: "practice"
    });
    expect(parsed).not.toBeNull();
    expect(parsed?.kind).toBe("v3-json");
    if (!parsed || parsed.kind !== "v3-json") return;
    expect(parsed.modeKey).toBe("diag_4x4_pow2_no_undo");
    expect(parsed.seed).toBe(0.125);
    expect(parsed.actions).toEqual([["m", 6], ["u"]]);
  });

  it("uses fallback mode key when v3 payload omits mode key", () => {
    const parsed = parseReplayImportEnvelope({
      trimmedReplayString: JSON.stringify({
        v: 3,
        seed: 0.5,
        actions: [1, 2, 3]
      }),
      fallbackModeKey: "practice"
    });
    expect(parsed).not.toBeNull();
    expect(parsed?.kind).toBe("v3-json");
    if (!parsed || parsed.kind !== "v3-json") return;
    expect(parsed.modeKey).toBe("practice");
    expect(parsed.seed).toBe(0.5);
    expect(parsed.actions).toEqual([1, 2, 3]);
  });
});

describe("detectReplayFormat", () => {
  it("detects v1 rpl base64 format", () => {
    expect(detectReplayFormat("REPLAY_v1RPL_B64_abc")).toBe("v1rpl-b64");
  });
  it("detects v4c format", () => {
    expect(detectReplayFormat("REPLAY_v4C_S...")).toBe("v4c");
  });
  it("detects v3 JSON object format", () => {
    expect(detectReplayFormat('{"version":3}')).toBe("v3-json");
  });
  it("detects v3 JSON array format", () => {
    expect(detectReplayFormat("[1,2,3]")).toBe("v3-json");
  });
  it("returns unknown for unrecognized", () => {
    expect(detectReplayFormat("random")).toBe("unknown");
  });
  it("handles whitespace", () => {
    expect(detectReplayFormat("  REPLAY_v4C_X")).toBe("v4c");
  });
});
