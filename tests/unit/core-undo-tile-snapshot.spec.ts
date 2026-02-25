import { describe, expect, it } from "vitest";

import { createUndoTileSnapshot } from "../../src/core/undo-tile-snapshot";

describe("core undo tile snapshot: createUndoTileSnapshot", () => {
  it("serializes tile and target with legacy save semantics", () => {
    const result = createUndoTileSnapshot({
      tile: { x: 2, y: 3, value: 128 },
      target: { x: 1, y: 3 }
    });

    expect(result).toEqual({
      x: 2,
      y: 3,
      value: 128,
      previousPosition: { x: 1, y: 3 }
    });
  });

  it("keeps zero coordinates and values", () => {
    const result = createUndoTileSnapshot({
      tile: { x: 0, y: 0, value: 0 },
      target: { x: 0, y: 0 }
    });

    expect(result).toEqual({
      x: 0,
      y: 0,
      value: 0,
      previousPosition: { x: 0, y: 0 }
    });
  });
});
