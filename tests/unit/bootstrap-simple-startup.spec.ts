import { describe, expect, it } from "vitest";

import { resolveSimpleStartupPayload } from "../../src/bootstrap/simple-startup";

describe("bootstrap simple startup", () => {
  it("builds payload with required fields", () => {
    const inputManagerCtor = function ReplayInput() {};
    const payload = resolveSimpleStartupPayload({
      modeKey: "standard_4x4_pow2_no_undo",
      fallbackModeKey: "standard_4x4_pow2_no_undo",
      inputManagerCtor,
      defaultBoardWidth: 4
    });

    expect(payload).toEqual({
      modeKey: "standard_4x4_pow2_no_undo",
      fallbackModeKey: "standard_4x4_pow2_no_undo",
      inputManagerCtor,
      defaultBoardWidth: 4
    });
  });

  it("includes disableSessionSync when enabled", () => {
    const payload = resolveSimpleStartupPayload({
      modeKey: "standard_4x4_pow2_no_undo",
      fallbackModeKey: "standard_4x4_pow2_no_undo",
      inputManagerCtor: function ReplayInput() {},
      disableSessionSync: true
    });

    expect(payload.disableSessionSync).toBe(true);
    expect(payload.defaultBoardWidth).toBe(4);
  });
});
