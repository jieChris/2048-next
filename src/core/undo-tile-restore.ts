export interface UndoRestoreTilePoint {
  x: number;
  y: number;
}

export interface UndoRestoreTileInput extends UndoRestoreTilePoint {
  value: number;
  previousPosition: UndoRestoreTilePoint;
}

export interface UndoRestoreTileResult extends UndoRestoreTilePoint {
  value: number;
  previousPosition: UndoRestoreTilePoint;
}

export function createUndoRestoreTile(input: UndoRestoreTileInput): UndoRestoreTileResult {
  return {
    x: input.x,
    y: input.y,
    value: input.value,
    previousPosition: {
      x: input.previousPosition.x,
      y: input.previousPosition.y
    }
  };
}
