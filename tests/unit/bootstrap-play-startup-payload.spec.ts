import { describe, expect, it } from "vitest";

import { resolvePlayStartupPayload } from "../../src/bootstrap/play-startup-payload";

describe("bootstrap play startup payload", () => {
  it("returns null when mode config is missing", () => {
    expect(resolvePlayStartupPayload({ modeConfig: null })).toBeNull();
  });

  it("builds startup payload with original references", () => {
    const modeConfig = { key: "standard_4x4_pow2_no_undo", ruleset: "pow2" };
    const inputCtor = function InputCtor() {};
    const payload = resolvePlayStartupPayload({
      modeConfig,
      inputManagerCtor: inputCtor,
      defaultBoardWidth: 4
    });

    expect(payload).toEqual({
      modeKey: "standard_4x4_pow2_no_undo",
      modeConfig,
      inputManagerCtor: inputCtor,
      defaultBoardWidth: 4
    });
    expect(payload?.modeConfig).toBe(modeConfig);
  });

  it("falls back to board width 4 when width is invalid", () => {
    const payload = resolvePlayStartupPayload({
      modeConfig: { key: "x" },
      defaultBoardWidth: Number.NaN
    });
    expect(payload?.defaultBoardWidth).toBe(4);
  });
});
