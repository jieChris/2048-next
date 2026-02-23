(function (global) {
  "use strict";

  if (!global) return;

  function planTileInteraction(input) {
    var opts = input || {};
    var cell = opts.cell || { x: 0, y: 0 };
    var farthest = opts.farthest || { x: 0, y: 0 };
    var next = opts.next || { x: 0, y: 0 };
    var shouldMerge =
      !!opts.hasNextTile &&
      !opts.nextMergedFrom &&
      Number.isInteger(opts.mergedValue) &&
      Number(opts.mergedValue) > 0;

    var rawTarget = shouldMerge ? next : farthest;
    var target = {
      x: Number.isInteger(rawTarget.x) ? Number(rawTarget.x) : 0,
      y: Number.isInteger(rawTarget.y) ? Number(rawTarget.y) : 0
    };
    var moved = target.x !== Number(cell.x) || target.y !== Number(cell.y);

    return {
      kind: shouldMerge ? "merge" : "move",
      target: target,
      moved: moved
    };
  }

  global.CoreMoveApplyRuntime = global.CoreMoveApplyRuntime || {};
  global.CoreMoveApplyRuntime.planTileInteraction = planTileInteraction;
})(typeof window !== "undefined" ? window : undefined);
