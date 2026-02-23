export interface CellPoint {
  x: number;
  y: number;
}

export interface Traversals {
  x: number[];
  y: number[];
}

function isWithinBounds(cell: CellPoint, width: number, height: number): boolean {
  return cell.x >= 0 && cell.x < width && cell.y >= 0 && cell.y < height;
}

export function buildTraversals(width: number, height: number, vector: CellPoint): Traversals {
  const w = Number(width);
  const h = Number(height);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
    return { x: [], y: [] };
  }

  const gridWidth = Math.floor(w);
  const gridHeight = Math.floor(h);
  const traversals: Traversals = { x: [], y: [] };

  for (let x = 0; x < gridWidth; x++) {
    traversals.x.push(x);
  }
  for (let y = 0; y < gridHeight; y++) {
    traversals.y.push(y);
  }

  if (vector.x === 1) traversals.x.reverse();
  if (vector.y === 1) traversals.y.reverse();
  return traversals;
}

export function findFarthestPosition(
  cell: CellPoint,
  vector: CellPoint,
  width: number,
  height: number,
  isBlockedCell: (x: number, y: number) => boolean,
  isCellAvailable: (cell: CellPoint) => boolean
): { farthest: CellPoint; next: CellPoint } {
  let previous = cell;
  let current = cell;

  do {
    previous = current;
    current = { x: previous.x + vector.x, y: previous.y + vector.y };
  } while (
    isWithinBounds(current, width, height) &&
    !isBlockedCell(current.x, current.y) &&
    isCellAvailable(current)
  );

  return {
    farthest: previous,
    next: current
  };
}
