(function (global) {
  "use strict";

  if (!global) return;

  function createUndoTileSnapshot(input) {
    var opts = input || {};
    var tile = opts.tile || {};
    var target = opts.target || {};
    return {
      x: tile.x,
      y: tile.y,
      value: tile.value,
      previousPosition: {
        x: target.x,
        y: target.y
      }
    };
  }

  global.CoreUndoTileSnapshotRuntime = global.CoreUndoTileSnapshotRuntime || {};
  global.CoreUndoTileSnapshotRuntime.createUndoTileSnapshot = createUndoTileSnapshot;
})(typeof window !== "undefined" ? window : undefined);
