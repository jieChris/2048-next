import { describe, expect, it } from "vitest";

import { buildBoardMatrix, getAvailableCells, getBestTileValue } from "../../src/core/grid-scan";
import {
  createGridScanRuntime,
  installGridScanRuntime,
  type GridScanRuntime
} from "../../src/bootstrap/grid-scan-runtime";

describe("bootstrap grid-scan runtime", () => {
  it("creates the legacy CoreGridScanRuntime shape from TypeScript functions", () => {
    const runtime = createGridScanRuntime();

    expect(runtime.getBestTileValue).toBe(getBestTileValue);
    expect(runtime.getAvailableCells(2, 2, () => false, () => true)).toEqual(
      getAvailableCells(2, 2, () => false, () => true)
    );
    expect(runtime.buildBoardMatrix(2, 2, (x, y) => x + y)).toEqual(
      buildBoardMatrix(2, 2, (x, y) => x + y)
    );
  });

  it("preserves legacy fallback callbacks", () => {
    const runtime = createGridScanRuntime();

    expect(runtime.getAvailableCells(2, 2)).toEqual([]);
    expect(runtime.buildBoardMatrix(2, 2)).toEqual([
      [0, 0],
      [0, 0]
    ]);
  });

  it("installs the runtime on a supplied window-like object", () => {
    const windowLike: { CoreGridScanRuntime?: GridScanRuntime } = {};

    const installed = installGridScanRuntime({ windowLike });

    expect(installed).toBe(windowLike.CoreGridScanRuntime);
    expect(installed?.getBestTileValue).toBe(getBestTileValue);
  });

  it("does not overwrite an existing runtime", () => {
    const existing = createGridScanRuntime();
    const windowLike = { CoreGridScanRuntime: existing };

    const installed = installGridScanRuntime({ windowLike });

    expect(installed).toBe(existing);
    expect(windowLike.CoreGridScanRuntime).toBe(existing);
  });

  it("returns null when no window-like target is available", () => {
    expect(installGridScanRuntime({ windowLike: null })).toBeNull();
  });
});
