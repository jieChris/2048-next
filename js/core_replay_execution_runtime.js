(function (global) {
  "use strict";

  if (!global) return;

  function getReplayActionKind(action) {
    if (action === -1) return "u";
    if (typeof action === "number" && action >= 0 && action <= 3) return "m";
    if (Array.isArray(action) && action.length > 0) return String(action[0]);
    return "x";
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
  global.CoreReplayExecutionRuntime.resolveReplayExecution = resolveReplayExecution;
})(typeof window !== "undefined" ? window : undefined);
