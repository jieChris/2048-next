export interface HistoryBoardPreviewOptions {
  documentLike?: Document | null | undefined;
}

function normalizeBoardMatrix(raw: unknown): number[][] {
  const source = raw;
  let matrixSource: unknown = source;
  if (typeof matrixSource === "string") {
    try {
      matrixSource = JSON.parse(matrixSource);
    } catch (_err) {
      matrixSource = [];
    }
  }
  if (!Array.isArray(matrixSource)) return [];
  const rows: number[][] = [];
  for (let r = 0; r < matrixSource.length; r += 1) {
    const rowSource = matrixSource[r];
    if (!Array.isArray(rowSource)) continue;
    const row: number[] = [];
    for (let c = 0; c < rowSource.length; c += 1) {
      row.push(Math.floor(Number(rowSource[c]) || 0));
    }
    if (row.length > 0) rows.push(row);
  }
  return rows;
}

function resolveBoardDims(boardMatrix: number[][]): { rows: number; cols: number } {
  const rowCount = Array.isArray(boardMatrix) ? boardMatrix.length : 0;
  let cols = 0;
  for (let i = 0; i < rowCount; i += 1) {
    const row = boardMatrix[i];
    if (!Array.isArray(row)) continue;
    if (row.length > cols) cols = row.length;
  }
  return {
    rows: Math.max(0, rowCount),
    cols: Math.max(0, cols)
  };
}

function computePreviewBoardLayout(cols: number, rows: number, boardSize: number, baseGap: number) {
  if (cols === 4 && rows === 4) {
    const cell44 = (boardSize - baseGap * (cols - 1)) / cols;
    return {
      gap: baseGap,
      cell: cell44,
      gridWidth: cols * cell44 + (cols - 1) * baseGap,
      gridHeight: rows * cell44 + (rows - 1) * baseGap
    };
  }

  const cellByRows = (boardSize - baseGap * (rows - 1)) / rows;
  const cellByCols = (boardSize - baseGap * (cols - 1)) / cols;
  let cell = Math.min(cellByRows, cellByCols);
  if (rows === 3 && cols === 3) cell = cellByCols;
  if (!isFinite(cell) || cell < 10) cell = 10;

  return {
    gap: baseGap,
    cell,
    gridWidth: cols * cell + (cols - 1) * baseGap,
    gridHeight: rows * cell + (rows - 1) * baseGap
  };
}

function computePreviewTileFontSize(value: number, cell: number, cols: number, rows: number): number {
  let safeCell = Number(cell) || 0;
  if (!Number.isFinite(safeCell) || safeCell <= 0) safeCell = 56;
  const digits = String(Math.max(0, Math.floor(Math.abs(Number(value) || 0)))).length;
  const maxDim = Math.max(Number(cols) || 4, Number(rows) || 4);

  let boardScale = 1;
  if (maxDim >= 7) boardScale = 0.74;
  else if (maxDim >= 6) boardScale = 0.81;
  else if (maxDim >= 5) boardScale = 0.9;

  let digitScale = 1;
  if (digits === 3) digitScale = 0.84;
  if (digits === 4) digitScale = 0.72;
  if (digits >= 5) digitScale = 0.6;

  const raw = safeCell * 0.48 * boardScale * digitScale;
  const minSize = Math.max(11, Math.floor(safeCell * 0.22));
  const maxSize = Math.max(minSize, Math.floor(safeCell * 0.62));
  return Math.max(minSize, Math.min(maxSize, Math.round(raw)));
}

function isStoneValue(value: number): boolean {
  return Number(value) < 0;
}

function resolvePreviewTileClasses(value: number, x: number, y: number): string {
  const classes = ["tile"];
  const numericValue = Math.floor(Math.abs(Number(value) || 0));
  classes.push("tile-" + String(numericValue || 0));
  classes.push("tile-position-" + String(x + 1) + "-" + String(y + 1));
  if (isStoneValue(value)) {
    classes.push("tile-stone");
  } else if (numericValue > 2048) {
    classes.push("tile-super");
  }
  return classes.join(" ");
}

export function createHistoryBoardPreviewNode(
  boardMatrix: unknown,
  options?: HistoryBoardPreviewOptions
): HTMLElement | null {
  const documentLike = options?.documentLike || (typeof document !== "undefined" ? document : null);
  if (!documentLike) return null;

  const matrix = normalizeBoardMatrix(boardMatrix);
  const dims = resolveBoardDims(matrix);
  const rows = dims.rows;
  const cols = dims.cols;
  if (rows <= 0 || cols <= 0) return null;

  const maxDim = Math.max(rows, cols);
  const baseGap = maxDim >= 5 ? 6 : 8;
  const boardSize = Math.max(196, Math.min(320, maxDim * 58 + (maxDim - 1) * baseGap));
  const layout = computePreviewBoardLayout(cols, rows, boardSize, baseGap);
  const framePadding = 8;

  const wrap = documentLike.createElement("div");
  wrap.className = "history-board history-mini-board-wrap";

  const board = documentLike.createElement("div");
  board.className = "game-container history-mini-game";
  board.style.width = String(Math.round(layout.gridWidth + framePadding * 2)) + "px";
  board.style.height = String(Math.round(layout.gridHeight + framePadding * 2)) + "px";

  const gridContainer = documentLike.createElement("div");
  gridContainer.className = "grid-container";
  gridContainer.style.left = "50%";
  gridContainer.style.top = "50%";
  gridContainer.style.width = String(Math.round(layout.gridWidth)) + "px";
  gridContainer.style.height = String(Math.round(layout.gridHeight)) + "px";
  gridContainer.style.transform = "translate(-50%, -50%)";
  board.appendChild(gridContainer);

  const tileContainer = documentLike.createElement("div");
  tileContainer.className = "tile-container";
  tileContainer.style.left = "50%";
  tileContainer.style.top = "50%";
  tileContainer.style.width = String(Math.round(layout.gridWidth)) + "px";
  tileContainer.style.height = String(Math.round(layout.gridHeight)) + "px";
  tileContainer.style.transform = "translate(-50%, -50%)";
  board.appendChild(tileContainer);

  for (let y = 0; y < rows; y += 1) {
    const rowEl = documentLike.createElement("div");
    rowEl.className = "grid-row";
    rowEl.style.marginBottom = y === rows - 1 ? "0" : String(Math.round(layout.gap)) + "px";
    for (let x = 0; x < cols; x += 1) {
      const bgCell = documentLike.createElement("div");
      bgCell.className = "grid-cell";
      bgCell.style.width = String(Math.round(layout.cell)) + "px";
      bgCell.style.height = String(Math.round(layout.cell)) + "px";
      bgCell.style.marginRight = x === cols - 1 ? "0" : String(Math.round(layout.gap)) + "px";
      rowEl.appendChild(bgCell);
    }
    gridContainer.appendChild(rowEl);
  }

  for (let r = 0; r < rows; r += 1) {
    const row = matrix[r] || [];
    for (let c = 0; c < cols; c += 1) {
      const value = Math.floor(Number(row[c]) || 0);
      if (!isStoneValue(value) && value <= 0) continue;

      const tile = documentLike.createElement("div");
      tile.setAttribute("class", resolvePreviewTileClasses(value, c, r));
      tile.style.width = String(Math.round(layout.cell)) + "px";
      tile.style.height = String(Math.round(layout.cell)) + "px";
      tile.style.transform =
        "translate(" +
        String(Math.round(c * (layout.cell + layout.gap))) +
        "px, " +
        String(Math.round(r * (layout.cell + layout.gap))) +
        "px)";

      const inner = documentLike.createElement("div");
      inner.className = "tile-inner";
      inner.style.width = String(Math.round(layout.cell)) + "px";
      inner.style.height = String(Math.round(layout.cell)) + "px";
      inner.style.lineHeight = String(Math.round(layout.cell)) + "px";
      inner.style.fontSize = String(computePreviewTileFontSize(value, layout.cell, cols, rows)) + "px";
      inner.textContent = isStoneValue(value) ? "" : String(Math.floor(Math.abs(value)));
      tile.appendChild(inner);
      tileContainer.appendChild(tile);
    }
  }

  wrap.appendChild(board);
  return wrap;
}
