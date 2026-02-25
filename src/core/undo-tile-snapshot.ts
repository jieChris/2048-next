export interface UndoTileSnapshotPoint {
  x: number;
  y: number;
}

export interface UndoTileSnapshotTile extends UndoTileSnapshotPoint {
  value: number;
}

export interface UndoTileSnapshotInput {
  tile: UndoTileSnapshotTile;
  target: UndoTileSnapshotPoint;
}

export interface UndoTileSnapshotResult extends UndoTileSnapshotTile {
  previousPosition: UndoTileSnapshotPoint;
}

export function createUndoTileSnapshot(input: UndoTileSnapshotInput): UndoTileSnapshotResult {
  return {
    x: input.tile.x,
    y: input.tile.y,
    value: input.tile.value,
    previousPosition: {
      x: input.target.x,
      y: input.target.y
    }
  };
}
