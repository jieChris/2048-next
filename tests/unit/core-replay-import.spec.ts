import { describe, expect, it } from "vitest";

import { parseReplayImportEnvelope } from "../../src/core/replay-import";

describe("core replay import: parseReplayImportEnvelope", () => {
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

    expect(
      parseReplayImportEnvelope({
        trimmedReplayString: JSON.stringify({ v: 3, actions: [] }),
        fallbackModeKey: "practice"
      })
    ).toBeNull();
  });
});
