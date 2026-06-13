import { describe, expect, it } from "vitest";

import {
  buildTraversals,
  findFarthestPosition,
  getVector,
  positionsEqual
} from "../../src/core/move-path";
import {
  createMovePathRuntime,
  installMovePathRuntime,
  type MovePathRuntime
} from "../../src/bootstrap/move-path-runtime";

describe("bootstrap move-path runtime", () => {
  it("creates the legacy CoreMovePathRuntime shape from TypeScript functions", () => {
    const runtime = createMovePathRuntime();

    expect(runtime.getVector).toBe(getVector);
    expect(runtime.positionsEqual).toBe(positionsEqual);
    expect(runtime.buildTraversals(4, 3, { x: 1, y: 0 })).toEqual(
      buildTraversals(4, 3, { x: 1, y: 0 })
    );
    expect(
      runtime.findFarthestPosition(
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        4,
        4,
        () => false,
        () => true
      )
    ).toEqual(
      findFarthestPosition(
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        4,
        4,
        () => false,
        () => true
      )
    );
  });

  it("preserves legacy fallback arguments", () => {
    const runtime = createMovePathRuntime();

    expect(runtime.buildTraversals(2, 2)).toEqual({ x: [0, 1], y: [0, 1] });
    expect(runtime.findFarthestPosition({ x: 1, y: 1 }, undefined, 4, 4)).toEqual({
      farthest: { x: 1, y: 1 },
      next: { x: 1, y: 1 }
    });
  });

  it("installs the runtime on a supplied window-like object", () => {
    const windowLike: { CoreMovePathRuntime?: MovePathRuntime } = {};

    const installed = installMovePathRuntime({ windowLike });

    expect(installed).toBe(windowLike.CoreMovePathRuntime);
    expect(installed?.getVector).toBe(getVector);
  });

  it("does not overwrite an existing runtime", () => {
    const existing = createMovePathRuntime();
    const windowLike = { CoreMovePathRuntime: existing };

    const installed = installMovePathRuntime({ windowLike });

    expect(installed).toBe(existing);
    expect(windowLike.CoreMovePathRuntime).toBe(existing);
  });

  it("returns null when no window-like target is available", () => {
    expect(installMovePathRuntime({ windowLike: null })).toBeNull();
  });
});
