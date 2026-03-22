(function (global) {
  "use strict";

  if (!global) return;

  function resolveEngineUndoFacade() {
    var facade = global && global.CoreEngineFacade;
    if (!facade || typeof facade !== "object") return null;
    if (typeof facade.createUndoSnapshot !== "function") return null;
    return facade;
  }

  function createUndoSnapshot(input) {
    var opts = input || {};
    var facade = resolveEngineUndoFacade();
    if (facade) {
      try {
        return facade.createUndoSnapshot({
          score: opts.score,
          comboStreak: opts.comboStreak,
          successfulMoveCount: opts.successfulMoveCount,
          lockConsumedAtMoveCount: opts.lockConsumedAtMoveCount,
          lockedDirectionTurn: opts.lockedDirectionTurn,
          lockedDirection: opts.lockedDirection,
          undoUsed: opts.undoUsed
        });
      } catch (_err) {}
    }
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
