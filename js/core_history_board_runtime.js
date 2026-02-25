(function (global) {
  "use strict";

  if (!global) return;

  function normalizeBoardSize(board, width, height) {
    var rows = Array.isArray(board) ? board : [];
    var normalizedHeight = Number.isInteger(height) && Number(height) > 0 ? Number(height) : rows.length;
    var normalizedWidth =
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

  function resolveHistoryFinalBoardHtml(board, width, height) {
    if (!Array.isArray(board) || board.length === 0) return "";

    var size = normalizeBoardSize(board, width, height);
    if (size.width <= 0 || size.height <= 0) return "";

    var style =
      "grid-template-columns: repeat(" +
      size.width +
      ", 48px); grid-template-rows: repeat(" +
      size.height +
      ", 48px);";
    var html = "<div class='final-board-grid' style='" + style + "'>";

    for (var y = 0; y < size.height; y += 1) {
      var row = Array.isArray(board[y]) ? board[y] : [];
      for (var x = 0; x < size.width; x += 1) {
        var value = Number(row[x]) || 0;
        var valueClass = value === 0 ? "final-board-cell-empty" : "final-board-cell-v-" + value;
        var superClass = value > 2048 ? " final-board-cell-super" : "";
        html += "<div class='final-board-cell " + valueClass + superClass + "'>" + (value === 0 ? "" : value) + "</div>";
      }
    }

    html += "</div>";
    return html;
  }

  global.CoreHistoryBoardRuntime = global.CoreHistoryBoardRuntime || {};
  global.CoreHistoryBoardRuntime.resolveHistoryFinalBoardHtml = resolveHistoryFinalBoardHtml;
})(typeof window !== "undefined" ? window : undefined);
