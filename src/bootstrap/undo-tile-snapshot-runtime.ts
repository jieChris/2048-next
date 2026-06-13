import {
  createUndoTileSnapshot,
  type UndoTileSnapshotInput,
  type UndoTileSnapshotResult
} from "../core/undo-tile-snapshot";

export type UndoTileSnapshotRuntimeInput =
  | {
      tile?: Partial<UndoTileSnapshotInput["tile"]> | null | undefined;
      target?: Partial<UndoTileSnapshotInput["target"]> | null | undefined;
    }
  | null
  | undefined;

export interface UndoTileSnapshotRuntime {
  createUndoTileSnapshot: (input: UndoTileSnapshotRuntimeInput) => UndoTileSnapshotResult;
}

export interface UndoTileSnapshotRuntimeWindowLike {
  CoreUndoTileSnapshotRuntime?: UndoTileSnapshotRuntime;
}

export interface UndoTileSnapshotRuntimeInstallOptions {
  windowLike?: UndoTileSnapshotRuntimeWindowLike | null | undefined;
}

function normalizeLegacySnapshotInput(input: UndoTileSnapshotRuntimeInput): UndoTileSnapshotInput {
  const opts = input || {};
  const tile = opts.tile || {};
  const target = opts.target || {};
  return {
    tile: {
      x: tile.x as number,
      y: tile.y as number,
      value: tile.value as number
    },
    target: {
      x: target.x as number,
      y: target.y as number
    }
  };
}

export function createUndoTileSnapshotRuntime(): UndoTileSnapshotRuntime {
  return {
    createUndoTileSnapshot: (input) => createUndoTileSnapshot(normalizeLegacySnapshotInput(input))
  };
}

export function installUndoTileSnapshotRuntime(
  options: UndoTileSnapshotRuntimeInstallOptions = {}
): UndoTileSnapshotRuntime | null {
  const windowLike =
    options.windowLike ||
    (typeof window === "undefined"
      ? null
      : (window as unknown as UndoTileSnapshotRuntimeWindowLike));
  if (!windowLike) return null;
  if (!windowLike.CoreUndoTileSnapshotRuntime) {
    windowLike.CoreUndoTileSnapshotRuntime = createUndoTileSnapshotRuntime();
  }
  return windowLike.CoreUndoTileSnapshotRuntime || null;
}
