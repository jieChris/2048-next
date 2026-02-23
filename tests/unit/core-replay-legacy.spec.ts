import { describe, expect, it } from "vitest";

import {
  decodeLegacyReplay,
  decodeReplayV1Moves,
  decodeReplayV2Log
} from "../../src/core/replay-legacy";

function encodeV2Code(code: number): string {
  return String.fromCharCode(code + 33);
}

describe("core replay legacy: decodeReplayV1Moves", () => {
  it("decodes v1 move chars", () => {
    expect(decodeReplayV1Moves("URDLZ")).toEqual([0, 1, 2, 3, -1]);
  });

  it("throws on invalid move char", () => {
    expect(() => decodeReplayV1Moves("UX")).toThrow("Invalid move char: X");
  });
});

describe("core replay legacy: decodeReplayV2Log", () => {
  it("decodes v2 move/spawn + undo entries", () => {
    const moveCode = (2 << 5) | (1 << 4) | 6;
    const undoCode = 128;
    const decoded = decodeReplayV2Log(encodeV2Code(moveCode) + encodeV2Code(undoCode));
    expect(decoded.replayMoves).toEqual([2, -1]);
    expect(decoded.replaySpawns).toEqual([{ x: 2, y: 1, value: 4 }, null]);
  });

  it("throws on out-of-range replay char", () => {
    expect(() => decodeReplayV2Log(" ")).toThrow("Invalid replay char at index 0");
  });
});

describe("core replay legacy: decodeLegacyReplay", () => {
  it("decodes v1 wrapper payload", () => {
    const decoded = decodeLegacyReplay("REPLAY_v1_0.5_UR");
    expect(decoded).not.toBeNull();
    expect(decoded?.seed).toBe(0.5);
    expect(decoded?.replayMoves).toEqual([0, 1]);
    expect(decoded?.replaySpawns).toBeNull();
  });

  it("decodes v2S payload with explicit seed", () => {
    const code = (1 << 5) | (0 << 4) | 3;
    const payload = "REPLAY_v2S_0.75_" + encodeV2Code(code);
    const decoded = decodeLegacyReplay(payload);
    expect(decoded?.seed).toBe(0.75);
    expect(decoded?.replayMovesV2).toBe(encodeV2Code(code));
    expect(decoded?.replayMoves).toEqual([1]);
    expect(decoded?.replaySpawns).toEqual([{ x: 3, y: 0, value: 2 }]);
  });

  it("decodes v2 payload with legacy dummy seed", () => {
    const code = (3 << 5) | (1 << 4) | 15;
    const payload = "REPLAY_v2_" + encodeV2Code(code);
    const decoded = decodeLegacyReplay(payload);
    expect(decoded?.seed).toBe(0.123);
    expect(decoded?.replayMovesV2).toBe(encodeV2Code(code));
    expect(decoded?.replayMoves).toEqual([3]);
    expect(decoded?.replaySpawns).toEqual([{ x: 3, y: 3, value: 4 }]);
  });

  it("throws on invalid v2S seed", () => {
    expect(() => decodeLegacyReplay("REPLAY_v2S_not-a-number_!")).toThrow("Invalid v2S seed");
  });

  it("returns null for unknown legacy prefixes", () => {
    expect(decodeLegacyReplay("REPLAY_v9_abc")).toBeNull();
  });
});
