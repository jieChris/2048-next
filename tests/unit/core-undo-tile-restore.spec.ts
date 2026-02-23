import { describe, expect, it } from "vitest";

import { createUndoRestoreTile } from "../../src/core/undo-tile-restore";

describe("core undo tile restore: createUndoRestoreTile", () => {
  it("keeps tile restore payload unchanged", () => {
    const result = createUndoRestoreTile({
      x: 3,
      y: 2,
      value: 512,
      previousPosition: {
        x: 1,
        y: 2
      }
    });

    expect(result).toEqual({
      x: 3,
      y: 2,
      value: 512,
      previousPosition: {
        x: 1,
        y: 2
      }
    });
  });

  it("keeps zero values and coordinates", () => {
    const result = createUndoRestoreTile({
      x: 0,
      y: 0,
      value: 0,
      previousPosition: {
        x: 0,
        y: 0
      }
    });

    expect(result).toEqual({
      x: 0,
      y: 0,
      value: 0,
      previousPosition: {
        x: 0,
        y: 0
      }
    });
  });
});
