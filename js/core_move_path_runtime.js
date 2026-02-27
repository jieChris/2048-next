(function (global) {
  "use strict";

  if (!global) return;

  function isWithinBounds(cell, width, height) {
    return cell.x >= 0 && cell.x < width && cell.y >= 0 && cell.y < height;
  }

  var DIRECTION_VECTORS = {
    0: { x: 0, y: -1 },
    1: { x: 1, y: 0 },
    2: { x: 0, y: 1 },
    3: { x: -1, y: 0 }
  };

  function getVector(direction) {
    var key = Number(direction);
    if (!Number.isInteger(key)) return undefined;
    return DIRECTION_VECTORS[key];
  }

  function positionsEqual(first, second) {
    return first.x === second.x && first.y === second.y;
  }

  function buildTraversals(width, height, vector) {
    var w = Number(width);
    var h = Number(height);
    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
      return { x: [], y: [] };
    }

    var gridWidth = Math.floor(w);
    var gridHeight = Math.floor(h);
    var traversals = { x: [], y: [] };

    for (var x = 0; x < gridWidth; x++) {
      traversals.x.push(x);
    }
    for (var y = 0; y < gridHeight; y++) {
      traversals.y.push(y);
    }

    if (vector && vector.x === 1) traversals.x.reverse();
    if (vector && vector.y === 1) traversals.y.reverse();
    return traversals;
  }

  function findFarthestPosition(cell, vector, width, height, isBlockedCell, isCellAvailable) {
    var blockedFn = typeof isBlockedCell === "function" ? isBlockedCell : function () { return false; };
    var availableFn = typeof isCellAvailable === "function" ? isCellAvailable : function () { return false; };
    var safeVector = vector && typeof vector === "object" ? vector : { x: 0, y: 0 };
    var previous;
    var current = cell;

    do {
      previous = current;
      current = { x: previous.x + safeVector.x, y: previous.y + safeVector.y };
    } while (
      isWithinBounds(current, width, height) &&
      !blockedFn(current.x, current.y) &&
      availableFn(current)
    );

    return {
      farthest: previous,
      next: current
    };
  }

  global.CoreMovePathRuntime = global.CoreMovePathRuntime || {};
  global.CoreMovePathRuntime.getVector = getVector;
  global.CoreMovePathRuntime.positionsEqual = positionsEqual;
  global.CoreMovePathRuntime.buildTraversals = buildTraversals;
  global.CoreMovePathRuntime.findFarthestPosition = findFarthestPosition;
})(typeof window !== "undefined" ? window : undefined);
