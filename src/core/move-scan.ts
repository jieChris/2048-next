export interface CellPoint {
  x: number;
  y: number;
}

const DIRECTION_VECTORS: CellPoint[] = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 }
];

export function tileMatchesAvailable(
  width: number,
  height: number,
  isBlockedCell: (x: number, y: number) => boolean,
  getCellValue: (cell: CellPoint) => number | null | undefined,
  canMerge: (a: number, b: number) => boolean
): boolean {
  const w = Number(width);
  const h = Number(height);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return false;

  const gridWidth = Math.floor(w);
  const gridHeight = Math.floor(h);

  for (let x = 0; x < gridWidth; x++) {
    for (let y = 0; y < gridHeight; y++) {
      if (isBlockedCell(x, y)) continue;
      const tileValue = Number(getCellValue({ x, y }));
      if (!Number.isInteger(tileValue) || tileValue <= 0) continue;

      for (let i = 0; i < DIRECTION_VECTORS.length; i++) {
        const vector = DIRECTION_VECTORS[i];
        const cell = { x: x + vector.x, y: y + vector.y };
        if (isBlockedCell(cell.x, cell.y)) continue;

        const otherValue = Number(getCellValue(cell));
        if (!Number.isInteger(otherValue) || otherValue <= 0) continue;
        if (canMerge(tileValue, otherValue)) return true;
      }
    }
  }

  return false;
}

export function movesAvailable(availableCellCount: number, hasTileMatch: boolean): boolean {
  return Number(availableCellCount) > 0 || !!hasTileMatch;
}
