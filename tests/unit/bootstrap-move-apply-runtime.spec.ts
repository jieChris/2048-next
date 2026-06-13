import { describe, expect, it } from "vitest";

import { planTileInteraction } from "../../src/core/move-apply";
import {
  createMoveApplyRuntime,
  installMoveApplyRuntime,
  type MoveApplyRuntime
} from "../../src/bootstrap/move-apply-runtime";

describe("bootstrap move-apply runtime", () => {
  it("creates the legacy CoreMoveApplyRuntime shape from TypeScript functions", () => {
    const runtime = createMoveApplyRuntime();
    const input = {
      cell: { x: 0, y: 0 },
      farthest: { x: 1, y: 0 },
      next: { x: 2, y: 0 },
      hasNextTile: true,
      nextMergedFrom: false,
      mergedValue: 4
    };

    expect(runtime.planTileInteraction(input)).toEqual(planTileInteraction(input));
  });

  it("preserves legacy fallback behavior for missing input", () => {
    const runtime = createMoveApplyRuntime();

    expect(runtime.planTileInteraction(undefined)).toEqual({
      kind: "move",
      target: { x: 0, y: 0 },
      moved: false
    });
  });

  it("normalizes invalid target coordinates through the TypeScript owner", () => {
    const runtime = createMoveApplyRuntime();

    expect(
      runtime.planTileInteraction({
        cell: { x: 0, y: 1 },
        farthest: { x: Number.NaN, y: 3.5 },
        next: { x: 2, y: 2 },
        hasNextTile: false,
        nextMergedFrom: false,
        mergedValue: null
      })
    ).toEqual({
      kind: "move",
      target: { x: 0, y: 0 },
      moved: true
    });
  });

  it("installs the runtime on a supplied window-like object", () => {
    const windowLike: { CoreMoveApplyRuntime?: MoveApplyRuntime } = {};

    const installed = installMoveApplyRuntime({ windowLike });

    expect(installed).toBe(windowLike.CoreMoveApplyRuntime);
    expect(installed?.planTileInteraction).toBeTypeOf("function");
  });

  it("does not overwrite an existing runtime", () => {
    const existing = createMoveApplyRuntime();
    const windowLike = { CoreMoveApplyRuntime: existing };

    const installed = installMoveApplyRuntime({ windowLike });

    expect(installed).toBe(existing);
    expect(windowLike.CoreMoveApplyRuntime).toBe(existing);
  });

  it("returns null when no window-like target is available", () => {
    expect(installMoveApplyRuntime({ windowLike: null })).toBeNull();
  });
});
