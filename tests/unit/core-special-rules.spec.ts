import { describe, expect, it } from "vitest";

import {
  applySpecialRulesStateSnapshot,
  computeSpecialRulesState,
  createSpecialRulesRuntime,
  installSpecialRulesRuntime,
  type SpecialRulesRuntime
} from "../../src/core/special-rules";

describe("core special rules runtime installer", () => {
  it("creates the legacy CoreSpecialRulesRuntime shape from TypeScript functions", () => {
    const runtime = createSpecialRulesRuntime();

    expect(runtime.computeSpecialRulesState).toBe(computeSpecialRulesState);
    expect(runtime.applySpecialRulesStateSnapshot).toBe(applySpecialRulesStateSnapshot);
  });

  it("installs the runtime on a supplied window-like object", () => {
    const windowLike: { CoreSpecialRulesRuntime?: SpecialRulesRuntime } = {};

    const installed = installSpecialRulesRuntime({ windowLike });

    expect(installed).toBe(windowLike.CoreSpecialRulesRuntime);
    expect(installed?.computeSpecialRulesState).toBeTypeOf("function");
    expect(installed?.applySpecialRulesStateSnapshot).toBeTypeOf("function");
  });

  it("does not overwrite an existing special rules runtime", () => {
    const existing = createSpecialRulesRuntime();
    const windowLike = { CoreSpecialRulesRuntime: existing };

    const installed = installSpecialRulesRuntime({ windowLike });

    expect(installed).toBe(existing);
    expect(windowLike.CoreSpecialRulesRuntime).toBe(existing);
  });

  it("returns null when no window-like target is available", () => {
    expect(installSpecialRulesRuntime({ windowLike: null })).toBeNull();
  });
});

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

  it("applies a computed state snapshot to the legacy manager shape", () => {
    const manager = {
      width: 4,
      height: 4,
      clonePlain(value: unknown) {
        return JSON.parse(JSON.stringify(value));
      }
    };

    applySpecialRulesStateSnapshot(manager, {
      blockedCellSet: { "0:0": true },
      blockedCellsList: [{ x: 0, y: 0 }],
      stoneCellsList: [{ x: 1, y: 1 }],
      undoLimit: 2,
      comboMultiplier: 3,
      directionLockRules: { every_k_moves: 4 },
      movementDirections: [0, 2, 2, 9],
      moveTimeoutMs: 1500,
      itemModeRules: { enabled: true, grantEveryMoves: 5, maxPerItem: 2 }
    });

    expect(manager).toMatchObject({
      blockedCellSet: { "0:0": true },
      blockedCellsList: [{ x: 0, y: 0 }],
      stoneCellsList: [{ x: 1, y: 1 }],
      stoneValueSet: { "3": true },
      undoLimit: 2,
      comboMultiplier: 3,
      directionLockRules: { every_k_moves: 4 },
      allowedDirections: [0, 2],
      allowedDirectionSet: { "0": true, "2": true },
      moveTimeoutMs: 1500,
      itemModeRules: { enabled: true, grantEveryMoves: 5, maxPerItem: 2 }
    });
  });
});
