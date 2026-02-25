(function (global) {
  "use strict";

  if (!global) return;

  function planReplayStepExecution(input) {
    var opts = input || {};
    var moves = Array.isArray(opts.replayMoves) ? opts.replayMoves : [];
    var spawns = Array.isArray(opts.replaySpawns) ? opts.replaySpawns : null;
    var action = moves[opts.replayIndex];
    var spawnAtIndex = spawns ? spawns[opts.replayIndex] : undefined;
    var shouldInjectForcedSpawn = !!spawns && !Array.isArray(action);

    return {
      action: action,
      shouldInjectForcedSpawn: shouldInjectForcedSpawn,
      forcedSpawn: shouldInjectForcedSpawn ? spawnAtIndex : undefined,
      nextReplayIndex: opts.replayIndex + 1
    };
  }

  global.CoreReplayLoopRuntime = global.CoreReplayLoopRuntime || {};
  global.CoreReplayLoopRuntime.planReplayStepExecution = planReplayStepExecution;
})(typeof window !== "undefined" ? window : undefined);
