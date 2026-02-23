import { describe, expect, it } from "vitest";

import { computePostMoveRecord } from "../../src/core/post-move-record";

describe("core post move record: computePostMoveRecord", () => {
  it("returns no-op in replay mode", () => {
    const result = computePostMoveRecord({
      replayMode: true,
      direction: 1,
      lastSpawn: { x: 0, y: 0, value: 2 },
      width: 4,
      height: 4,
      isFibonacciMode: false,
      hasSessionReplayV3: true
    });
    expect(result).toEqual({
      shouldRecordMoveHistory: false,
      compactMoveCode: null,
      shouldPushSessionAction: false,
      sessionAction: null,
      shouldResetLastSpawn: false
    });
  });

  it("computes compact code on eligible 4x4 pow2 spawn", () => {
    const result = computePostMoveRecord({
      replayMode: false,
      direction: 2,
      lastSpawn: { x: 1, y: 2, value: 4 },
      width: 4,
      height: 4,
      isFibonacciMode: false,
      hasSessionReplayV3: true
    });
    const expectedCode = (2 << 5) | (1 << 4) | (1 + 2 * 4);
    expect(result.compactMoveCode).toBe(expectedCode);
    expect(result.sessionAction).toEqual(["m", 2]);
  });

  it("disables compact code outside eligible conditions", () => {
    const fib = computePostMoveRecord({
      replayMode: false,
      direction: 0,
      lastSpawn: { x: 0, y: 0, value: 2 },
      width: 4,
      height: 4,
      isFibonacciMode: true,
      hasSessionReplayV3: false
    });
    const non4x4 = computePostMoveRecord({
      replayMode: false,
      direction: 0,
      lastSpawn: { x: 0, y: 0, value: 4 },
      width: 5,
      height: 4,
      isFibonacciMode: false,
      hasSessionReplayV3: false
    });
    expect(fib.compactMoveCode).toBeNull();
    expect(non4x4.compactMoveCode).toBeNull();
  });
});
