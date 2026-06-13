import { describe, expect, it } from "vitest";

import { computeUndoRestorePayload } from "../../src/core/undo-restore-payload";
import {
  createUndoRestorePayloadRuntime,
  installUndoRestorePayloadRuntime,
  type UndoRestorePayloadRuntime
} from "../../src/bootstrap/undo-restore-payload-runtime";

describe("bootstrap undo-restore-payload runtime", () => {
  it("creates the legacy CoreUndoRestorePayloadRuntime shape from TypeScript functions", () => {
    const runtime = createUndoRestorePayloadRuntime();
    const input = {
      prev: {
        score: 2048,
        tiles: [{ x: 0, y: 1, value: 2 }]
      },
      fallbackScore: 99
    };

    expect(runtime.computeUndoRestorePayload(input)).toEqual(computeUndoRestorePayload(input));
  });

  it("preserves legacy fallback behavior for missing input", () => {
    const runtime = createUndoRestorePayloadRuntime();

    expect(runtime.computeUndoRestorePayload(undefined)).toEqual({
      score: 0,
      tiles: []
    });
  });

  it("filters non-object tiles through the TypeScript owner", () => {
    const runtime = createUndoRestorePayloadRuntime();

    expect(
      runtime.computeUndoRestorePayload({
        prev: {
          score: 5,
          tiles: [null, 0, "x", { x: 1 }]
        },
        fallbackScore: 0
      })
    ).toEqual({
      score: 5,
      tiles: [{ x: 1 }]
    });
  });

  it("installs the runtime on a supplied window-like object", () => {
    const windowLike: { CoreUndoRestorePayloadRuntime?: UndoRestorePayloadRuntime } = {};

    const installed = installUndoRestorePayloadRuntime({ windowLike });

    expect(installed).toBe(windowLike.CoreUndoRestorePayloadRuntime);
    expect(installed?.computeUndoRestorePayload).toBeTypeOf("function");
  });

  it("does not overwrite an existing runtime", () => {
    const existing = createUndoRestorePayloadRuntime();
    const windowLike = { CoreUndoRestorePayloadRuntime: existing };

    const installed = installUndoRestorePayloadRuntime({ windowLike });

    expect(installed).toBe(existing);
    expect(windowLike.CoreUndoRestorePayloadRuntime).toBe(existing);
  });

  it("returns null when no window-like target is available", () => {
    expect(installUndoRestorePayloadRuntime({ windowLike: null })).toBeNull();
  });
});
