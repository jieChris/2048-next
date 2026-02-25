import { describe, expect, it } from "vitest";

import { computeSpecialRulesState } from "../../src/core/special-rules";

describe("core special rules: computeSpecialRulesState", () => {
  it("builds blocked cells set/list with bounds filtering", () => {
    const state = computeSpecialRulesState(
      {
        blocked_cells: [
          [0, 0],
          { x: 1, y: 2 },
          { x: 9, y: 9 },
          [-1, 0],
          [1.5, 2],
          "bad"
        ]
      },
      4,
      4
    );

    expect(state.blockedCellSet).toEqual({
      "0:0": true,
      "1:2": true
    });
    expect(state.blockedCellsList).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 2 }
    ]);
  });

  it("normalizes undo limit and combo multiplier", () => {
    const state = computeSpecialRulesState(
      {
        undo_limit: 3,
        combo_multiplier: 2.5
      },
      4,
      4
    );
    expect(state.undoLimit).toBe(3);
    expect(state.comboMultiplier).toBe(2.5);
  });

  it("falls back for invalid undo/combo values", () => {
    const state = computeSpecialRulesState(
      {
        undo_limit: -1,
        combo_multiplier: 1
      },
      4,
      4
    );
    expect(state.undoLimit).toBeNull();
    expect(state.comboMultiplier).toBe(1);
  });

  it("clones direction lock rules", () => {
    const raw = {
      direction_lock: { every_k_moves: 3, seed: "abc" }
    };
    const state = computeSpecialRulesState(raw, 4, 4);
    expect(state.directionLockRules).toEqual({ every_k_moves: 3, seed: "abc" });

    (raw.direction_lock as { every_k_moves: number }).every_k_moves = 99;
    expect((state.directionLockRules as { every_k_moves: number }).every_k_moves).toBe(3);
  });
});
