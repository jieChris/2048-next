import { describe, expect, it } from "vitest";

import { createUndoRestoreTile } from "../../src/core/undo-tile-restore";
import {
  createUndoTileRestoreRuntime,
  installUndoTileRestoreRuntime,
  type UndoTileRestoreRuntime
} from "../../src/bootstrap/undo-tile-restore-runtime";

describe("bootstrap undo-tile-restore runtime", () => {
  it("creates the legacy CoreUndoTileRestoreRuntime shape from TypeScript functions", () => {
    const runtime = createUndoTileRestoreRuntime();
    const input = {
      x: 3,
      y: 2,
      value: 512,
      previousPosition: { x: 1, y: 2 }
    };

    expect(runtime.createUndoRestoreTile(input)).toEqual(createUndoRestoreTile(input));
  });

  it("preserves legacy fallback behavior for missing objects", () => {
    const runtime = createUndoTileRestoreRuntime();

    expect(runtime.createUndoRestoreTile(undefined)).toEqual({
      x: undefined,
      y: undefined,
      value: undefined,
      previousPosition: {
        x: undefined,
        y: undefined
      }
    });
    expect(runtime.createUndoRestoreTile({ x: 0, y: 1, value: 2 })).toEqual({
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
    const windowLike: { CoreUndoTileRestoreRuntime?: UndoTileRestoreRuntime } = {};

    const installed = installUndoTileRestoreRuntime({ windowLike });

    expect(installed).toBe(windowLike.CoreUndoTileRestoreRuntime);
    expect(installed?.createUndoRestoreTile).toBeTypeOf("function");
  });

  it("does not overwrite an existing runtime", () => {
    const existing = createUndoTileRestoreRuntime();
    const windowLike = { CoreUndoTileRestoreRuntime: existing };

    const installed = installUndoTileRestoreRuntime({ windowLike });

    expect(installed).toBe(existing);
    expect(windowLike.CoreUndoTileRestoreRuntime).toBe(existing);
  });

  it("returns null when no window-like target is available", () => {
    expect(installUndoTileRestoreRuntime({ windowLike: null })).toBeNull();
  });
});
