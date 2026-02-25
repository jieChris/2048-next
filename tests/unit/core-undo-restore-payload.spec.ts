import { describe, expect, it } from "vitest";

import { computeUndoRestorePayload } from "../../src/core/undo-restore-payload";

describe("core undo restore payload: computeUndoRestorePayload", () => {
  it("keeps valid score and object tiles", () => {
    const result = computeUndoRestorePayload({
      prev: {
        score: 2048,
        tiles: [
          { x: 0, y: 0, value: 2, previousPosition: { x: 0, y: 1 } },
          { x: 1, y: 1, value: 4, previousPosition: { x: 1, y: 2 } }
        ]
      },
      fallbackScore: 99
    });

    expect(result.score).toBe(2048);
    expect(result.tiles).toHaveLength(2);
  });

  it("falls back to fallbackScore and empty tiles for invalid payload", () => {
    const result = computeUndoRestorePayload({
      prev: {
        score: null,
        tiles: null
      },
      fallbackScore: 123
    });

    expect(result).toEqual({
      score: 123,
      tiles: []
    });
  });

  it("filters non-object tile entries", () => {
    const result = computeUndoRestorePayload({
      prev: {
        score: 5,
        tiles: [null, 0, "x", { x: 1 }]
      },
      fallbackScore: 0
    });

    expect(result.score).toBe(5);
    expect(result.tiles).toEqual([{ x: 1 }]);
  });
});
