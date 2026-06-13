import { describe, expect, it } from "vitest";

import { createUndoTileSnapshot } from "../../src/core/undo-tile-snapshot";
import {
  createUndoTileSnapshotRuntime,
  installUndoTileSnapshotRuntime,
  type UndoTileSnapshotRuntime
} from "../../src/bootstrap/undo-tile-snapshot-runtime";

describe("bootstrap undo-tile-snapshot runtime", () => {
  it("creates the legacy CoreUndoTileSnapshotRuntime shape from TypeScript functions", () => {
    const runtime = createUndoTileSnapshotRuntime();
    const input = {
      tile: { x: 2, y: 3, value: 128 },
      target: { x: 1, y: 3 }
    };

    expect(runtime.createUndoTileSnapshot(input)).toEqual(createUndoTileSnapshot(input));
  });

  it("preserves legacy fallback behavior for missing objects", () => {
    const runtime = createUndoTileSnapshotRuntime();

    expect(runtime.createUndoTileSnapshot(undefined)).toEqual({
      x: undefined,
      y: undefined,
      value: undefined,
      previousPosition: {
        x: undefined,
        y: undefined
      }
    });
    expect(runtime.createUndoTileSnapshot({ tile: { x: 0, y: 1, value: 2 } })).toEqual({
      x: 0,
      y: 1,
      value: 2,
      previousPosition: {
        x: undefined,
        y: undefined
      }
    });
  });

  it("installs the runtime on a supplied window-like object", () => {
    const windowLike: { CoreUndoTileSnapshotRuntime?: UndoTileSnapshotRuntime } = {};

    const installed = installUndoTileSnapshotRuntime({ windowLike });

    expect(installed).toBe(windowLike.CoreUndoTileSnapshotRuntime);
    expect(installed?.createUndoTileSnapshot).toBeTypeOf("function");
  });

  it("does not overwrite an existing runtime", () => {
    const existing = createUndoTileSnapshotRuntime();
    const windowLike = { CoreUndoTileSnapshotRuntime: existing };

    const installed = installUndoTileSnapshotRuntime({ windowLike });

    expect(installed).toBe(existing);
    expect(windowLike.CoreUndoTileSnapshotRuntime).toBe(existing);
  });

  it("returns null when no window-like target is available", () => {
    expect(installUndoTileSnapshotRuntime({ windowLike: null })).toBeNull();
  });
});
