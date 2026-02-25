(function (global) {
  "use strict";

  if (!global) return;

  function createUndoRestoreTile(input) {
    var opts = input || {};
    var previous = opts.previousPosition || {};
    return {
      x: opts.x,
      y: opts.y,
      value: opts.value,
      previousPosition: {
        x: previous.x,
        y: previous.y
      }
    };
  }

  global.CoreUndoTileRestoreRuntime = global.CoreUndoTileRestoreRuntime || {};
  global.CoreUndoTileRestoreRuntime.createUndoRestoreTile = createUndoRestoreTile;
})(typeof window !== "undefined" ? window : undefined);
