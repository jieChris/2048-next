(function (global) {
  "use strict";

  if (!global) return;

  var DIRECTION_VECTORS = [
    { x: 0, y: -1 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 }
  ];

  function tileMatchesAvailable(width, height, isBlockedCell, getCellValue, canMerge) {
    var w = Number(width);
    var h = Number(height);
    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return false;

    var gridWidth = Math.floor(w);
    var gridHeight = Math.floor(h);
    var blockedFn = typeof isBlockedCell === "function" ? isBlockedCell : function () { return false; };
    var valueFn = typeof getCellValue === "function" ? getCellValue : function () { return null; };
    var mergeFn = typeof canMerge === "function" ? canMerge : function () { return false; };

    for (var x = 0; x < gridWidth; x++) {
      for (var y = 0; y < gridHeight; y++) {
        if (blockedFn(x, y)) continue;
        var tileValue = Number(valueFn({ x: x, y: y }));
        if (!Number.isInteger(tileValue) || tileValue <= 0) continue;

        for (var i = 0; i < DIRECTION_VECTORS.length; i++) {
          var vector = DIRECTION_VECTORS[i];
          var cell = { x: x + vector.x, y: y + vector.y };
          if (blockedFn(cell.x, cell.y)) continue;

          var otherValue = Number(valueFn(cell));
          if (!Number.isInteger(otherValue) || otherValue <= 0) continue;
          if (mergeFn(tileValue, otherValue)) return true;
        }
      }
    }

    return false;
  }

  function movesAvailable(availableCellCount, hasTileMatch) {
    return Number(availableCellCount) > 0 || !!hasTileMatch;
  }

  global.CoreMoveScanRuntime = global.CoreMoveScanRuntime || {};
  global.CoreMoveScanRuntime.tileMatchesAvailable = tileMatchesAvailable;
  global.CoreMoveScanRuntime.movesAvailable = movesAvailable;
})(typeof window !== "undefined" ? window : undefined);
