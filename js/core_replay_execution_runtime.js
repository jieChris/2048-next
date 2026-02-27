(function (global) {
  "use strict";

  if (!global) return;

  function getReplayActionKind(action) {
    if (action === -1) return "u";
    if (typeof action === "number" && action >= 0 && action <= 3) return "m";
    if (Array.isArray(action) && action.length > 0) return String(action[0]);
    return "x";
  }

  function computeReplayStepStats(input) {
    var source = input || {};
    var actions = Array.isArray(source.actions) ? source.actions : [];
    var rawLimit = Number(source.limit);
    var limit = Number.isFinite(rawLimit) ? Math.floor(rawLimit) : actions.length;
    if (limit < 0) limit = 0;
    if (limit > actions.length) limit = actions.length;

    var moveSteps = 0;
    var undoSteps = 0;
    for (var i = 0; i < limit; i++) {
      var kind = getReplayActionKind(actions[i]);
      if (kind === "u") {
        undoSteps += 1;
        if (moveSteps > 0) moveSteps -= 1;
      } else if (kind === "m") {
        moveSteps += 1;
      }
    }

    return {
      totalSteps: limit,
      moveSteps: moveSteps,
      undoSteps: undoSteps
    };
  }

  function resolveReplayExecution(action) {
    var kind = getReplayActionKind(action);
    if (kind === "m") {
      var dir = Array.isArray(action) ? action[1] : action;
      return { kind: "m", dir: dir };
    }
    if (kind === "u") {
      return { kind: "u" };
    }
    if (kind === "p") {
      return {
        kind: "p",
        x: action[1],
        y: action[2],
        value: action[3]
      };
    }
    throw "Unknown replay action";
  }

  global.CoreReplayExecutionRuntime = global.CoreReplayExecutionRuntime || {};
  global.CoreReplayExecutionRuntime.getReplayActionKind = getReplayActionKind;
  global.CoreReplayExecutionRuntime.computeReplayStepStats = computeReplayStepStats;
  global.CoreReplayExecutionRuntime.resolveReplayExecution = resolveReplayExecution;
})(typeof window !== "undefined" ? window : undefined);
