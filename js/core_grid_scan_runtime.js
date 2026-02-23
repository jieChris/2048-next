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

  global.CoreGridScanRuntime = global.CoreGridScanRuntime || {};
  global.CoreGridScanRuntime.getAvailableCells = getAvailableCells;
})(typeof window !== "undefined" ? window : undefined);
