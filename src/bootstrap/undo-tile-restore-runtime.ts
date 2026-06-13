import {
  createUndoRestoreTile,
  type UndoRestoreTileInput,
  type UndoRestoreTileResult
} from "../core/undo-tile-restore";

export type UndoTileRestoreRuntimeInput =
  | (Partial<Omit<UndoRestoreTileInput, "previousPosition">> & {
      previousPosition?: Partial<UndoRestoreTileInput["previousPosition"]> | null | undefined;
    })
  | null
  | undefined;

export interface UndoTileRestoreRuntime {
  createUndoRestoreTile: (input: UndoTileRestoreRuntimeInput) => UndoRestoreTileResult;
}

export interface UndoTileRestoreRuntimeWindowLike {
  CoreUndoTileRestoreRuntime?: UndoTileRestoreRuntime;
}

export interface UndoTileRestoreRuntimeInstallOptions {
  windowLike?: UndoTileRestoreRuntimeWindowLike | null | undefined;
}

function normalizeLegacyRestoreTileInput(input: UndoTileRestoreRuntimeInput): UndoRestoreTileInput {
  const opts = input || {};
  const previousPosition = opts.previousPosition || {};
  return {
    x: opts.x as number,
    y: opts.y as number,
    value: opts.value as number,
    previousPosition: {
      x: previousPosition.x as number,
      y: previousPosition.y as number
    }
  };
}

export function createUndoTileRestoreRuntime(): UndoTileRestoreRuntime {
  return {
    createUndoRestoreTile: (input) => createUndoRestoreTile(normalizeLegacyRestoreTileInput(input))
  };
}

export function installUndoTileRestoreRuntime(
  options: UndoTileRestoreRuntimeInstallOptions = {}
): UndoTileRestoreRuntime | null {
  const windowLike =
    options.windowLike ||
    (typeof window === "undefined"
      ? null
      : (window as unknown as UndoTileRestoreRuntimeWindowLike));
  if (!windowLike) return null;
  if (!windowLike.CoreUndoTileRestoreRuntime) {
    windowLike.CoreUndoTileRestoreRuntime = createUndoTileRestoreRuntime();
  }
  return windowLike.CoreUndoTileRestoreRuntime || null;
}
