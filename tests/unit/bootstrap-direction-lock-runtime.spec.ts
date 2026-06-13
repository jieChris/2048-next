import { describe, expect, it } from "vitest";

import { getLockedDirectionState } from "../../src/core/direction-lock";
import {
  createDirectionLockRuntime,
  installDirectionLockRuntime,
  type DirectionLockRuntime
} from "../../src/bootstrap/direction-lock-runtime";

describe("bootstrap direction-lock runtime", () => {
  it("creates the legacy CoreDirectionLockRuntime shape from TypeScript functions", () => {
    const runtime = createDirectionLockRuntime();

    expect(typeof runtime.getLockedDirectionState).toBe("function");
    expect(
      runtime.getLockedDirectionState({
        directionLockRules: null,
        successfulMoveCount: 6,
        lockConsumedAtMoveCount: -1,
        lockedDirectionTurn: 6,
        lockedDirection: 2,
        initialSeed: "seed"
      })
    ).toEqual(
      getLockedDirectionState({
        directionLockRules: null,
        successfulMoveCount: 6,
        lockConsumedAtMoveCount: -1,
        lockedDirectionTurn: 6,
        lockedDirection: 2,
        initialSeed: "seed"
      })
    );
  });

  it("adapts the legacy randomFromSeed parameter into the TypeScript input", () => {
    const runtime = createDirectionLockRuntime();
    const seenSeeds: string[] = [];

    const state = runtime.getLockedDirectionState(
      {
        directionLockRules: { every_k_moves: 3 },
        successfulMoveCount: 6,
        lockConsumedAtMoveCount: -1,
        lockedDirectionTurn: 3,
        lockedDirection: 1,
        initialSeed: "abc",
        availableDirections: [0, 2, 4, 6]
      },
      (seed) => {
        seenSeeds.push(seed);
        return 0.74;
      }
    );

    expect(seenSeeds).toEqual(["abc:lock:2"]);
    expect(state).toEqual({
      lockedDirection: 4,
      lockedDirectionTurn: 6,
      activeDirection: 4
    });
  });

  it("installs the runtime on a supplied window-like object", () => {
    const windowLike: { CoreDirectionLockRuntime?: DirectionLockRuntime } = {};

    const installed = installDirectionLockRuntime({ windowLike });

    expect(installed).toBe(windowLike.CoreDirectionLockRuntime);
    expect(typeof installed?.getLockedDirectionState).toBe("function");
  });

  it("does not overwrite an existing runtime", () => {
    const existing = createDirectionLockRuntime();
    const windowLike = { CoreDirectionLockRuntime: existing };

    const installed = installDirectionLockRuntime({ windowLike });

    expect(installed).toBe(existing);
    expect(windowLike.CoreDirectionLockRuntime).toBe(existing);
  });

  it("returns null when no window-like target is available", () => {
    expect(installDirectionLockRuntime({ windowLike: null })).toBeNull();
  });
});
