(function (global) {
  "use strict";

  if (!global) return;

  function createUndoSnapshot(input) {
    var opts = input || {};
    return {
      score: Number.isFinite(opts.score) ? Number(opts.score) : 0,
      tiles: [],
      comboStreak:
        Number.isInteger(opts.comboStreak) && opts.comboStreak >= 0
          ? Number(opts.comboStreak)
          : 0,
      successfulMoveCount:
        Number.isInteger(opts.successfulMoveCount) && opts.successfulMoveCount >= 0
          ? Number(opts.successfulMoveCount)
          : 0,
      lockConsumedAtMoveCount: Number.isInteger(opts.lockConsumedAtMoveCount)
        ? Number(opts.lockConsumedAtMoveCount)
        : -1,
      lockedDirectionTurn: Number.isInteger(opts.lockedDirectionTurn)
        ? Number(opts.lockedDirectionTurn)
        : null,
      lockedDirection: Number.isInteger(opts.lockedDirection)
        ? Number(opts.lockedDirection)
        : null,
      undoUsed:
        Number.isInteger(opts.undoUsed) && opts.undoUsed >= 0
          ? Number(opts.undoUsed)
          : 0
    };
  }

  global.CoreUndoSnapshotRuntime = global.CoreUndoSnapshotRuntime || {};
  global.CoreUndoSnapshotRuntime.createUndoSnapshot = createUndoSnapshot;
})(typeof window !== "undefined" ? window : undefined);
