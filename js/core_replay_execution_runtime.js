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

  function resolveIpsInputCount(input) {
    var source = input || {};
    if (source.replayMode) {
      var replayIndex = Number(source.replayIndex);
      return Number.isInteger(replayIndex) && replayIndex > 0 ? replayIndex : 0;
    }
    var ipsInputCount = Number(source.ipsInputCount);
    return Number.isInteger(ipsInputCount) && ipsInputCount >= 0 ? ipsInputCount : 0;
  }

  function resolveNextIpsInputCount(input) {
    var source = input || {};
    if (source.replayMode) {
      return {
        shouldRecord: false,
        nextIpsInputCount: resolveIpsInputCount(source)
      };
    }
    return {
      shouldRecord: true,
      nextIpsInputCount: resolveIpsInputCount(source) + 1
    };
  }

  function resolveIpsDisplayText(input) {
    var source = input || {};
    var durationMs = Number(source.durationMs);
    var ms = Number.isFinite(durationMs) && durationMs >= 0 ? durationMs : 0;
    var seconds = ms / 1000;
    var rawCount = Number(source.ipsInputCount);
    var inputCount = Number.isFinite(rawCount) ? rawCount : 0;
    var avgIps = 0;
    if (seconds > 0) {
      avgIps = (inputCount / seconds).toFixed(2);
    }
    return {
      avgIpsText: String(avgIps),
      ipsText: "IPS: " + avgIps
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
  global.CoreReplayExecutionRuntime.resolveIpsInputCount = resolveIpsInputCount;
  global.CoreReplayExecutionRuntime.resolveNextIpsInputCount = resolveNextIpsInputCount;
  global.CoreReplayExecutionRuntime.resolveIpsDisplayText = resolveIpsDisplayText;
  global.CoreReplayExecutionRuntime.resolveReplayExecution = resolveReplayExecution;
})(typeof window !== "undefined" ? window : undefined);
