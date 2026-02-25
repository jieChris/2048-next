import { describe, expect, it } from "vitest";

import { encodeReplay128 } from "../../src/core/replay-codec";
import { decodeReplayV4Actions } from "../../src/core/replay-v4-actions";

describe("core replay v4 actions: decodeReplayV4Actions", () => {
  it("decodes direct move+spawn token", () => {
    const raw = (2 << 5) | (1 << 4) | 6;
    const actions = encodeReplay128(raw);
    const result = decodeReplayV4Actions(actions);
    expect(result.replayMoves).toEqual([2]);
    expect(result.replaySpawns).toEqual([{ x: 2, y: 1, value: 4 }]);
  });

  it("decodes escaped subtype 0 as raw code 127", () => {
    const actions = encodeReplay128(127) + encodeReplay128(0);
    const result = decodeReplayV4Actions(actions);
    expect(result.replayMoves).toEqual([3]);
    expect(result.replaySpawns).toEqual([{ x: 3, y: 3, value: 4 }]);
  });

  it("decodes escaped undo and practice actions", () => {
    const undo = encodeReplay128(127) + encodeReplay128(1);
    const practice = encodeReplay128(127) + encodeReplay128(2) + encodeReplay128(9) + encodeReplay128(5);
    const result = decodeReplayV4Actions(undo + practice);
    expect(result.replayMoves).toEqual([-1, ["p", 2, 1, 32]]);
    expect(result.replaySpawns).toEqual([null, null]);
  });

  it("throws on malformed escapes", () => {
    expect(() => decodeReplayV4Actions(encodeReplay128(127))).toThrow();
    expect(() => decodeReplayV4Actions(encodeReplay128(127) + encodeReplay128(9))).toThrow();
    expect(() =>
      decodeReplayV4Actions(encodeReplay128(127) + encodeReplay128(2) + encodeReplay128(16) + encodeReplay128(0))
    ).toThrow();
  });
});
