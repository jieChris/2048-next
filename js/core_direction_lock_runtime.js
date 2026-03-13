(function (global) {
  "use strict";

  if (!global) return;

  function normalizeAvailableDirections(rawDirections) {
    var source = Array.isArray(rawDirections) ? rawDirections : [];
    var out = [];
    for (var i = 0; i < source.length; i++) {
      var dir = Number(source[i]);
      if (!Number.isInteger(dir) || dir < 0 || dir > 7) continue;
      if (out.indexOf(dir) !== -1) continue;
      out.push(dir);
    }
    if (out.length) return out;
    return [0, 1, 2, 3];
  }

  function getLockedDirectionState(input, randomFromSeed) {
    var opts = input || {};
    var rules = opts.directionLockRules && typeof opts.directionLockRules === "object"
      ? opts.directionLockRules
      : null;
    var currentLockedDirection = Number.isInteger(opts.lockedDirection) ? Number(opts.lockedDirection) : null;
    var currentLockedDirectionTurn = Number.isInteger(opts.lockedDirectionTurn) ? Number(opts.lockedDirectionTurn) : null;

    if (!rules) {
      return {
        lockedDirection: currentLockedDirection,
        lockedDirectionTurn: currentLockedDirectionTurn,
        activeDirection: null
      };
    }

    var everyK = Number(rules.every_k_moves);
    var moveCount = Number(opts.successfulMoveCount);
    if (!Number.isInteger(everyK) || everyK <= 0) {
      return {
        lockedDirection: currentLockedDirection,
        lockedDirectionTurn: currentLockedDirectionTurn,
        activeDirection: null
      };
    }
    if (!Number.isInteger(moveCount) || moveCount <= 0 || moveCount % everyK !== 0) {
      return {
        lockedDirection: currentLockedDirection,
        lockedDirectionTurn: currentLockedDirectionTurn,
        activeDirection: null
      };
    }
    if (Number(opts.lockConsumedAtMoveCount) === moveCount) {
      return {
        lockedDirection: currentLockedDirection,
        lockedDirectionTurn: currentLockedDirectionTurn,
        activeDirection: null
      };
    }

    var lockedDirection = currentLockedDirection;
    var lockedDirectionTurn = currentLockedDirectionTurn;

    var availableDirections = normalizeAvailableDirections(opts.availableDirections);
    var directionCount = availableDirections.length;

    if (lockedDirectionTurn !== moveCount) {
      var phase = Math.floor(moveCount / everyK);
      var seed = String(opts.initialSeed) + ":lock:" + phase;
      var resolver = randomFromSeed;
      if (typeof resolver !== "function" && typeof Math.seedrandom === "function") {
        resolver = function (localSeed) {
          var rng = new Math.seedrandom(localSeed);
          return rng();
        };
      }
      var randomValue = typeof resolver === "function" ? resolver(seed) : Math.random();
      var dirIndex = Math.floor(randomValue * directionCount);
      lockedDirection = availableDirections[dirIndex] || availableDirections[0];
      lockedDirectionTurn = moveCount;
    }

    return {
      lockedDirection: lockedDirection,
      lockedDirectionTurn: lockedDirectionTurn,
      activeDirection: lockedDirection
    };
  }

  global.CoreDirectionLockRuntime = global.CoreDirectionLockRuntime || {};
  global.CoreDirectionLockRuntime.getLockedDirectionState = getLockedDirectionState;
})(typeof window !== "undefined" ? window : undefined);
