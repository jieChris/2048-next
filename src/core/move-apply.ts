export interface CellPoint {
  x: number;
  y: number;
}

export interface TileInteractionInput {
  cell: CellPoint;
  farthest: CellPoint;
  next: CellPoint;
  hasNextTile: boolean;
  nextMergedFrom: boolean;
  mergedValue: number | null;
}

export interface TileInteractionResult {
  kind: "merge" | "move";
  target: CellPoint;
  moved: boolean;
}

export function planTileInteraction(input: TileInteractionInput): TileInteractionResult {
  const shouldMerge =
    !!input.hasNextTile &&
    !input.nextMergedFrom &&
    Number.isInteger(input.mergedValue) &&
    Number(input.mergedValue) > 0;

  const target = shouldMerge ? input.next : input.farthest;
  const safeTarget = {
    x: Number.isInteger(target.x) ? Number(target.x) : 0,
    y: Number.isInteger(target.y) ? Number(target.y) : 0
  };
  const moved = safeTarget.x !== Number(input.cell.x) || safeTarget.y !== Number(input.cell.y);

  return {
    kind: shouldMerge ? "merge" : "move",
    target: safeTarget,
    moved
  };
}
