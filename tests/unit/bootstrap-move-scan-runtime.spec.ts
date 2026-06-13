import { describe, expect, it } from "vitest";

import { movesAvailable, tileMatchesAvailable } from "../../src/core/move-scan";
import {
  createMoveScanRuntime,
  installMoveScanRuntime,
  type MoveScanRuntime
} from "../../src/bootstrap/move-scan-runtime";

describe("bootstrap move-scan runtime", () => {
  it("creates the legacy CoreMoveScanRuntime shape from TypeScript functions", () => {
    const runtime = createMoveScanRuntime();
    const board = new Map<string, number>([
      ["0:0", 2],
      ["1:0", 2]
    ]);

    expect(runtime.movesAvailable).toBe(movesAvailable);
    expect(
      runtime.tileMatchesAvailable(
        4,
        4,
        () => false,
        (cell) => board.get(`${cell.x}:${cell.y}`) ?? null,
        (a, b) => a === b
      )
    ).toBe(
      tileMatchesAvailable(
        4,
        4,
        () => false,
        (cell) => board.get(`${cell.x}:${cell.y}`) ?? null,
        (a, b) => a === b
      )
    );
  });

  it("preserves legacy fallback callbacks", () => {
    const runtime = createMoveScanRuntime();

    expect(runtime.tileMatchesAvailable(2, 2)).toBe(false);
  });

  it("installs the runtime on a supplied window-like object", () => {
    const windowLike: { CoreMoveScanRuntime?: MoveScanRuntime } = {};

    const installed = installMoveScanRuntime({ windowLike });

    expect(installed).toBe(windowLike.CoreMoveScanRuntime);
    expect(installed?.movesAvailable).toBe(movesAvailable);
  });

  it("does not overwrite an existing runtime", () => {
    const existing = createMoveScanRuntime();
    const windowLike = { CoreMoveScanRuntime: existing };

    const installed = installMoveScanRuntime({ windowLike });

    expect(installed).toBe(existing);
    expect(windowLike.CoreMoveScanRuntime).toBe(existing);
  });

  it("returns null when no window-like target is available", () => {
    expect(installMoveScanRuntime({ windowLike: null })).toBeNull();
  });
});
