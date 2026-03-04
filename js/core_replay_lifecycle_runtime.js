(function (global) {
  "use strict";

  if (!global) return;

  function normalizeReplaySeekTarget(input) {
    var opts = input || {};
    var targetIndex = Number(opts.targetIndex);
    if (!Number.isFinite(targetIndex)) {
      targetIndex = Number(opts.replayIndex);
    }
    if (!Number.isFinite(targetIndex)) {
      targetIndex = 0;
    }
    targetIndex = Math.floor(targetIndex);
    if (targetIndex < 0) targetIndex = 0;
    if (opts.hasReplayMoves && targetIndex > opts.replayMovesLength) {
      targetIndex = opts.replayMovesLength;
    }
    return targetIndex;
  }

  function planReplayStep(input) {
    var opts = input || {};
    var shouldInjectForcedSpawn = !!opts.hasReplaySpawns && !Array.isArray(opts.action);
    return {
      shouldInjectForcedSpawn: shouldInjectForcedSpawn,
      forcedSpawn: shouldInjectForcedSpawn ? opts.spawnAtIndex : undefined
    };
  }

  global.CoreReplayLifecycleRuntime = global.CoreReplayLifecycleRuntime || {};
  global.CoreReplayLifecycleRuntime.normalizeReplaySeekTarget = normalizeReplaySeekTarget;
  global.CoreReplayLifecycleRuntime.planReplayStep = planReplayStep;
})(typeof window !== "undefined" ? window : undefined);
