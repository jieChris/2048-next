function normalizeBoardSize(board: unknown, width: unknown, height: unknown): { width: number; height: number } {
  const rows = Array.isArray(board) ? board : [];
  const normalizedHeight = Number.isInteger(height) && Number(height) > 0 ? Number(height) : rows.length;
  const normalizedWidth =
    Number.isInteger(width) && Number(width) > 0
      ? Number(width)
      : Array.isArray(rows[0])
        ? rows[0].length
        : 0;

  return {
    width: normalizedWidth,
    height: normalizedHeight
  };
}

export function resolveHistoryFinalBoardHtml(board: unknown, width: unknown, height: unknown): string {
  if (!Array.isArray(board) || board.length === 0) return "";

  const size = normalizeBoardSize(board, width, height);
  if (size.width <= 0 || size.height <= 0) return "";

  const style =
    "grid-template-columns: repeat(" +
    size.width +
    ", 48px); grid-template-rows: repeat(" +
    size.height +
    ", 48px);";
  let html = "<div class='final-board-grid' style='" + style + "'>";

  for (let y = 0; y < size.height; y += 1) {
    const row = Array.isArray(board[y]) ? board[y] : [];
    for (let x = 0; x < size.width; x += 1) {
      const value = Number(row[x]) || 0;
      const valueClass = value === 0 ? "final-board-cell-empty" : "final-board-cell-v-" + value;
      const superClass = value > 2048 ? " final-board-cell-super" : "";
      html +=
        "<div class='final-board-cell " + valueClass + superClass + "'>" + (value === 0 ? "" : value) + "</div>";
    }
  }

  html += "</div>";
  return html;
}
