(function (global) {
  "use strict";

  if (!global) return;

  function computeUndoRestorePayload(input) {
    var opts = input || {};
    var source = opts.prev && typeof opts.prev === "object" ? opts.prev : {};
    var score =
      Number.isFinite(source.score) && typeof source.score === "number"
        ? Number(source.score)
        : (Number.isFinite(opts.fallbackScore) && typeof opts.fallbackScore === "number"
          ? Number(opts.fallbackScore)
          : 0);

    var rawTiles = Array.isArray(source.tiles) ? source.tiles : [];
    var tiles = [];
    for (var i = 0; i < rawTiles.length; i++) {
      var item = rawTiles[i];
      if (!item || typeof item !== "object") continue;
      tiles.push(item);
    }

    return {
      score: score,
      tiles: tiles
    };
  }

  global.CoreUndoRestorePayloadRuntime = global.CoreUndoRestorePayloadRuntime || {};
  global.CoreUndoRestorePayloadRuntime.computeUndoRestorePayload = computeUndoRestorePayload;
})(typeof window !== "undefined" ? window : undefined);
