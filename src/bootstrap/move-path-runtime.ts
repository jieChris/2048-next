import {
  buildTraversals,
  findFarthestPosition,
  getVector,
  positionsEqual,
  type CellPoint,
  type Traversals
} from "../core/move-path";

const ZERO_VECTOR: CellPoint = { x: 0, y: 0 };

export interface MovePathRuntime {
  getVector: typeof getVector;
  positionsEqual: typeof positionsEqual;
  buildTraversals: (width: number, height: number, vector?: CellPoint) => Traversals;
  findFarthestPosition: (
    cell: CellPoint,
    vector: CellPoint | undefined,
    width: number,
    height: number,
    isBlockedCell?: (x: number, y: number) => boolean,
    isCellAvailable?: (cell: CellPoint) => boolean
  ) => { farthest: CellPoint; next: CellPoint };
}

export interface MovePathRuntimeWindowLike {
  CoreMovePathRuntime?: MovePathRuntime;
}

export interface MovePathRuntimeInstallOptions {
  windowLike?: MovePathRuntimeWindowLike | null | undefined;
}

export function createMovePathRuntime(): MovePathRuntime {
  return {
    getVector,
    positionsEqual,
    buildTraversals: (width, height, vector) => buildTraversals(width, height, vector || ZERO_VECTOR),
    findFarthestPosition: (cell, vector, width, height, isBlockedCell, isCellAvailable) =>
      findFarthestPosition(
        cell,
        vector || ZERO_VECTOR,
        width,
        height,
        typeof isBlockedCell === "function" ? isBlockedCell : () => false,
        typeof isCellAvailable === "function" ? isCellAvailable : () => false
      )
  };
}

export function installMovePathRuntime(
  options: MovePathRuntimeInstallOptions = {}
): MovePathRuntime | null {
  const windowLike =
    options.windowLike ||
    (typeof window === "undefined" ? null : (window as unknown as MovePathRuntimeWindowLike));
  if (!windowLike) return null;
  if (!windowLike.CoreMovePathRuntime) {
    windowLike.CoreMovePathRuntime = createMovePathRuntime();
  }
  return windowLike.CoreMovePathRuntime || null;
}
