import { describe, expect, it } from "vitest";

import { getLockedDirectionState } from "../../src/core/direction-lock";

describe("core direction lock: getLockedDirectionState", () => {
  it("returns inactive when rules are missing", () => {
    const state = getLockedDirectionState({
      directionLockRules: null,
      successfulMoveCount: 6,
      lockConsumedAtMoveCount: -1,
      lockedDirectionTurn: 6,
      lockedDirection: 2,
      initialSeed: "seed"
    });
    expect(state).toEqual({
      lockedDirection: 2,
      lockedDirectionTurn: 6,
      activeDirection: null
    });
  });

  it("returns inactive when move count does not hit cadence", () => {
    const state = getLockedDirectionState({
      directionLockRules: { every_k_moves: 3 },
      successfulMoveCount: 5,
      lockConsumedAtMoveCount: -1,
      lockedDirectionTurn: null,
      lockedDirection: null,
      initialSeed: "seed"
    });
    expect(state.activeDirection).toBeNull();
  });

  it("returns inactive when lock is consumed for current move", () => {
    const state = getLockedDirectionState({
      directionLockRules: { every_k_moves: 3 },
      successfulMoveCount: 6,
      lockConsumedAtMoveCount: 6,
      lockedDirectionTurn: 6,
      lockedDirection: 1,
      initialSeed: "seed"
    });
    expect(state.activeDirection).toBeNull();
  });

  it("reuses existing lock direction on same turn", () => {
    let calls = 0;
    const state = getLockedDirectionState({
      directionLockRules: { every_k_moves: 3 },
      successfulMoveCount: 6,
      lockConsumedAtMoveCount: -1,
      lockedDirectionTurn: 6,
      lockedDirection: 3,
      initialSeed: "seed",
      randomFromSeed: () => {
        calls += 1;
        return 0;
      }
    });
    expect(calls).toBe(0);
    expect(state.activeDirection).toBe(3);
    expect(state.lockedDirectionTurn).toBe(6);
  });

  it("computes deterministic direction when entering lock turn", () => {
    const state = getLockedDirectionState({
      directionLockRules: { every_k_moves: 3 },
      successfulMoveCount: 6,
      lockConsumedAtMoveCount: -1,
      lockedDirectionTurn: 3,
      lockedDirection: 1,
      initialSeed: "abc",
      randomFromSeed: (seed) => {
        expect(seed).toBe("abc:lock:2");
        return 0.74;
      }
    });
    expect(state).toEqual({
      lockedDirection: 2,
      lockedDirectionTurn: 6,
      activeDirection: 2
    });
  });
});
