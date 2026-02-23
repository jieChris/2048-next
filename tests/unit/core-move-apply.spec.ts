import { describe, expect, it } from "vitest";

import { planTileInteraction } from "../../src/core/move-apply";

describe("core move apply: planTileInteraction", () => {
  it("returns merge action when merge conditions are satisfied", () => {
    const result = planTileInteraction({
      cell: { x: 0, y: 0 },
      farthest: { x: 1, y: 0 },
      next: { x: 2, y: 0 },
      hasNextTile: true,
      nextMergedFrom: false,
      mergedValue: 4
    });
    expect(result).toEqual({
      kind: "merge",
      target: { x: 2, y: 0 },
      moved: true
    });
  });

  it("falls back to move when next tile already merged", () => {
    const result = planTileInteraction({
      cell: { x: 0, y: 0 },
      farthest: { x: 1, y: 0 },
      next: { x: 2, y: 0 },
      hasNextTile: true,
      nextMergedFrom: true,
      mergedValue: 4
    });
    expect(result.kind).toBe("move");
    expect(result.target).toEqual({ x: 1, y: 0 });
  });

  it("falls back to move when merged value is invalid", () => {
    const result = planTileInteraction({
      cell: { x: 0, y: 0 },
      farthest: { x: 1, y: 0 },
      next: { x: 2, y: 0 },
      hasNextTile: true,
      nextMergedFrom: false,
      mergedValue: null
    });
    expect(result.kind).toBe("move");
    expect(result.target).toEqual({ x: 1, y: 0 });
  });

  it("reports moved=false when target equals source cell", () => {
    const result = planTileInteraction({
      cell: { x: 1, y: 1 },
      farthest: { x: 1, y: 1 },
      next: { x: 2, y: 1 },
      hasNextTile: false,
      nextMergedFrom: false,
      mergedValue: null
    });
    expect(result.moved).toBe(false);
  });
});
