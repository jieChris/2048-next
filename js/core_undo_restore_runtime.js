(function (global) {
  "use strict";

  if (!global) return;

  function resolveEngineUndoFacade() {
    var facade = global && global.CoreEngineFacade;
    if (!facade || typeof facade !== "object") return null;
    if (typeof facade.computeUndoRestoreState !== "function") return null;
    return facade;
  }

  function computeUndoRestoreState(input) {
    var opts = input || {};
    var facade = resolveEngineUndoFacade();
    if (facade) {
      try {
        return facade.computeUndoRestoreState({
          prev: opts.prev,
          fallbackUndoUsed: opts.fallbackUndoUsed,
          timerStatus: opts.timerStatus
        });
      } catch (_err) {}
    }
    var source = opts.prev && typeof opts.prev === "object" ? opts.prev : {};
    var fallbackUndoUsed =
      Number.isInteger(opts.fallbackUndoUsed) && opts.fallbackUndoUsed >= 0
        ? Number(opts.fallbackUndoUsed)
        : 0;
    var undoBase =
      Number.isInteger(source.undoUsed) && source.undoUsed >= 0
        ? Number(source.undoUsed)
        : fallbackUndoUsed;

    return {
      comboStreak:
        Number.isInteger(source.comboStreak) && source.comboStreak >= 0
          ? Number(source.comboStreak)
          : 0,
      successfulMoveCount:
        Number.isInteger(source.successfulMoveCount) && source.successfulMoveCount >= 0
          ? Number(source.successfulMoveCount)
          : 0,
      lockConsumedAtMoveCount: Number.isInteger(source.lockConsumedAtMoveCount)
        ? Number(source.lockConsumedAtMoveCount)
        : -1,
      lockedDirectionTurn: Number.isInteger(source.lockedDirectionTurn)
        ? Number(source.lockedDirectionTurn)
        : null,
      lockedDirection: Number.isInteger(source.lockedDirection)
        ? Number(source.lockedDirection)
        : null,
      undoUsed: undoBase + 1,
      over: false,
      won: false,
      keepPlaying: false,
      shouldClearMessage: true,
      shouldStartTimer: Number(opts.timerStatus) === 0
    };
  }

  global.CoreUndoRestoreRuntime = global.CoreUndoRestoreRuntime || {};
  global.CoreUndoRestoreRuntime.computeUndoRestoreState = computeUndoRestoreState;
})(typeof window !== "undefined" ? window : undefined);
