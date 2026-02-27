export interface CellPoint {
  x: number;
  y: number;
}

export type CellValueReader = (x: number, y: number) => unknown;

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

export function buildBoardMatrix(width: number, height: number, readCellValue: CellValueReader): number[][] {
  const w = Number(width);
  const h = Number(height);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return [];

  const gridWidth = Math.floor(w);
  const gridHeight = Math.floor(h);
  const out: number[][] = [];

  for (let y = 0; y < gridHeight; y++) {
    const row: number[] = [];
    for (let x = 0; x < gridWidth; x++) {
      const raw = Number(readCellValue(x, y));
      row.push(Number.isFinite(raw) ? raw : 0);
    }
    out.push(row);
  }
  return out;
}

export function getBestTileValue(board: unknown): number {
  if (!Array.isArray(board)) return 0;
  let best = 0;
  for (let y = 0; y < board.length; y++) {
    const row = board[y];
    if (!Array.isArray(row)) continue;
    for (let x = 0; x < row.length; x++) {
      const value = Number(row[x]);
      if (Number.isFinite(value) && value > best) best = value;
    }
  }
  return best;
}
