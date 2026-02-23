(function (global) {
  "use strict";

  if (!global) return;

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
      lockedDirection = Math.floor(randomValue * 4);
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
