(function (global) {
  "use strict";

  if (!global) return;

  function normalizeUndoStackEntry(input) {
    var opts = input || {};
    var source = opts.entry && typeof opts.entry === "object" ? opts.entry : {};

    var score =
      Number.isFinite(source.score) && typeof source.score === "number"
        ? Number(source.score)
        : (Number.isFinite(opts.fallbackScore) ? Number(opts.fallbackScore) : 0);

    var rawTiles = Array.isArray(source.tiles) ? source.tiles : [];
    var tiles = [];
    for (var i = 0; i < rawTiles.length; i++) {
      var item = rawTiles[i];
      if (!item || typeof item !== "object") continue;
      tiles.push(item);
    }

    var comboStreak =
      Number.isInteger(source.comboStreak) && source.comboStreak >= 0
        ? Number(source.comboStreak)
        : (Number.isInteger(opts.fallbackComboStreak) && opts.fallbackComboStreak >= 0
          ? Number(opts.fallbackComboStreak)
          : 0);

    var successfulMoveCount =
      Number.isInteger(source.successfulMoveCount) && source.successfulMoveCount >= 0
        ? Number(source.successfulMoveCount)
        : (Number.isInteger(opts.fallbackSuccessfulMoveCount) && opts.fallbackSuccessfulMoveCount >= 0
          ? Number(opts.fallbackSuccessfulMoveCount)
          : 0);

    var lockConsumedAtMoveCount =
      Number.isInteger(source.lockConsumedAtMoveCount)
        ? Number(source.lockConsumedAtMoveCount)
        : (Number.isInteger(opts.fallbackLockConsumedAtMoveCount)
          ? Number(opts.fallbackLockConsumedAtMoveCount)
          : -1);

    var lockedDirectionTurn =
      Number.isInteger(source.lockedDirectionTurn)
        ? Number(source.lockedDirectionTurn)
        : (Number.isInteger(opts.fallbackLockedDirectionTurn)
          ? Number(opts.fallbackLockedDirectionTurn)
          : null);

    var lockedDirection =
      Number.isInteger(source.lockedDirection)
        ? Number(source.lockedDirection)
        : (Number.isInteger(opts.fallbackLockedDirection)
          ? Number(opts.fallbackLockedDirection)
          : null);

    var undoUsed =
      Number.isInteger(source.undoUsed) && source.undoUsed >= 0
        ? Number(source.undoUsed)
        : (Number.isInteger(opts.fallbackUndoUsed) && opts.fallbackUndoUsed >= 0
          ? Number(opts.fallbackUndoUsed)
          : 0);

    return {
      score: score,
      tiles: tiles,
      comboStreak: comboStreak,
      successfulMoveCount: successfulMoveCount,
      lockConsumedAtMoveCount: lockConsumedAtMoveCount,
      lockedDirectionTurn: lockedDirectionTurn,
      lockedDirection: lockedDirection,
      undoUsed: undoUsed
    };
  }

  global.CoreUndoStackEntryRuntime = global.CoreUndoStackEntryRuntime || {};
  global.CoreUndoStackEntryRuntime.normalizeUndoStackEntry = normalizeUndoStackEntry;
})(typeof window !== "undefined" ? window : undefined);
