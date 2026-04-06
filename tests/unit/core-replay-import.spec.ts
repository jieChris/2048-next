import { describe, expect, it } from "vitest";

import { detectReplayFormat, parseReplayImportEnvelope } from "../../src/core/replay-import";

describe("core replay import: v1 only", () => {
  it("parses v1 base64 envelope", () => {
    const parsed = parseReplayImportEnvelope({
      trimmedReplayString: "REPLAY_v1RPL_B64_AQID"
    });
    expect(parsed).not.toBeNull();
    expect(parsed?.kind).toBe("v1rpl-b64");
    if (!parsed || parsed.kind !== "v1rpl-b64") return;
    expect(parsed.encodedBase64).toBe("AQID");
  });

  it("throws for empty v1 payload", () => {
    expect(() =>
      parseReplayImportEnvelope({
        trimmedReplayString: "REPLAY_v1RPL_B64_"
      })
    ).toThrow("Invalid replay v1 payload");
  });

  it("returns null for legacy formats", () => {
    expect(
      parseReplayImportEnvelope({
        trimmedReplayString: "REPLAY_v4C_C!!!!!!!!!!!!!!!!abc"
      })
    ).toBeNull();
    expect(
      parseReplayImportEnvelope({
        trimmedReplayString: '{"v":3,"actions":[0,1,2]}'
      })
    ).toBeNull();
  });
});

describe("detectReplayFormat", () => {
  it("detects v1 format", () => {
    expect(detectReplayFormat("REPLAY_v1RPL_B64_abc")).toBe("v1rpl-b64");
  });

  it("returns unknown for non-v1", () => {
    expect(detectReplayFormat("REPLAY_v4C_S...")).toBe("unknown");
    expect(detectReplayFormat('{"version":3}')).toBe("unknown");
    expect(detectReplayFormat("[1,2,3]")).toBe("unknown");
    expect(detectReplayFormat("random")).toBe("unknown");
  });
});
