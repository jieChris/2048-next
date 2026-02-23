export interface CellPoint {
  x: number;
  y: number;
}

export function getAvailableCells(
  width: number,
  height: number,
  isBlockedCell: (x: number, y: number) => boolean,
  isCellAvailable: (cell: CellPoint) => boolean
): CellPoint[] {
  const w = Number(width);
  const h = Number(height);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return [];

  const gridWidth = Math.floor(w);
  const gridHeight = Math.floor(h);
  const out: CellPoint[] = [];

  for (let x = 0; x < gridWidth; x++) {
    for (let y = 0; y < gridHeight; y++) {
      if (isBlockedCell(x, y)) continue;
      if (isCellAvailable({ x, y })) out.push({ x, y });
    }
  }
  return out;
}
