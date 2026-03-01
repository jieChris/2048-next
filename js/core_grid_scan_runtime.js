(function (global) {
  "use strict";

  if (!global) return;

  function getAvailableCells(width, height, isBlockedCell, isCellAvailable) {
    var w = Number(width);
    var h = Number(height);
    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return [];

    var gridWidth = Math.floor(w);
    var gridHeight = Math.floor(h);
    var blockedFn = typeof isBlockedCell === "function" ? isBlockedCell : function () { return false; };
    var availableFn = typeof isCellAvailable === "function" ? isCellAvailable : function () { return false; };
    var out = [];
    for (var x = 0; x < gridWidth; x++) {
      for (var y = 0; y < gridHeight; y++) {
        if (blockedFn(x, y)) continue;
        if (availableFn({ x: x, y: y })) out.push({ x: x, y: y });
      }
    }
    return out;
  }

  function buildBoardMatrix(width, height, readCellValue) {
    var w = Number(width);
    var h = Number(height);
    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return [];

    var gridWidth = Math.floor(w);
    var gridHeight = Math.floor(h);
    var readValue = typeof readCellValue === "function" ? readCellValue : function () { return 0; };
    var out = [];
    for (var y = 0; y < gridHeight; y++) {
      var row = [];
      for (var x = 0; x < gridWidth; x++) {
        var raw = Number(readValue(x, y));
        row.push(Number.isFinite(raw) ? raw : 0);
      }
      out.push(row);
    }
    return out;
  }

  function getBestTileValue(board) {
    if (!Array.isArray(board)) return 0;
    var best = 0;
    for (var y = 0; y < board.length; y++) {
      var row = board[y];
      if (!Array.isArray(row)) continue;
      for (var x = 0; x < row.length; x++) {
        var value = Number(row[x]);
        if (Number.isFinite(value) && value > best) best = value;
      }
    }
    return best;
  }

  global.CoreGridScanRuntime = global.CoreGridScanRuntime || {};
  global.CoreGridScanRuntime.getAvailableCells = getAvailableCells;
  global.CoreGridScanRuntime.buildBoardMatrix = buildBoardMatrix;
  global.CoreGridScanRuntime.getBestTileValue = getBestTileValue;
})(typeof window !== "undefined" ? window : undefined);
