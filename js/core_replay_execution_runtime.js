(function (global) {
  "use strict";

  if (!global) return;

  function getReplayActionKind(action) {
    if (action === -1) return "u";
    if (typeof action === "number" && action >= 0 && action <= 7) return "m";
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
    var hasTimesArray = Array.isArray(source.ipsInputTimes);
    if (hasTimesArray && !source.replayMode) {
      var nowMs = resolveIpsWindowNowMs(source.nowMs);
      return resolveIpsWindowTimes(source.ipsInputTimes, nowMs).length;
    }
    if (source.replayMode) {
      var replayIndex = Number(source.replayIndex);
      return Number.isInteger(replayIndex) && replayIndex > 0 ? replayIndex : 0;
    }
    var ipsInputCount = Number(source.ipsInputCount);
    return Number.isInteger(ipsInputCount) && ipsInputCount >= 0 ? ipsInputCount : 0;
  }

  function resolveNextIpsInputCount(input) {
    var source = input || {};
    var hasTimesArray = Array.isArray(source.ipsInputTimes);
    if (hasTimesArray && !source.replayMode) {
      var nowMs = resolveIpsWindowNowMs(source.nowMs);
      var nextIpsInputTimes = resolveIpsWindowTimes(source.ipsInputTimes, nowMs, true);
      return {
        shouldRecord: true,
        nextIpsInputCount: nextIpsInputTimes.length,
        nextIpsInputTimes: nextIpsInputTimes
      };
    }
    if (source.replayMode) {
      return {
        shouldRecord: false,
        nextIpsInputCount: resolveIpsInputCount(source),
        nextIpsInputTimes: []
      };
    }
    return {
      shouldRecord: true,
      nextIpsInputCount: resolveIpsInputCount(source) + 1,
      nextIpsInputTimes: []
    };
  }

  function resolveIpsDisplayText(input) {
    var source = input || {};
    var rawCount = Number(source.ipsInputCount);
    var inputCount = Number.isFinite(rawCount) && rawCount >= 0 ? Math.floor(rawCount) : 0;
    var avgIps = String(inputCount);
    return {
      avgIpsText: avgIps,
      ipsText: "IPS: " + avgIps
    };
  }

  var IPS_WINDOW_MS = 1000;

  function resolveIpsWindowNowMs(rawNowMs) {
    var nowMs = Number(rawNowMs);
    if (Number.isFinite(nowMs) && nowMs >= 0) {
      return Math.floor(nowMs);
    }
    return Date.now();
  }

  function normalizeIpsInputTime(raw) {
    var value = Number(raw);
    if (!Number.isFinite(value) || value < 0) return null;
    return Math.floor(value);
  }

  function resolveIpsWindowTimes(rawTimes, nowMs, includeNow) {
    var minMs = nowMs - IPS_WINDOW_MS;
    var next = [];
    var list = Array.isArray(rawTimes) ? rawTimes : [];
    for (var i = 0; i < list.length; i++) {
      var time = normalizeIpsInputTime(list[i]);
      if (time === null) continue;
      if (time < minMs || time > nowMs + IPS_WINDOW_MS) continue;
      next.push(time);
    }
    if (includeNow) {
      next.push(nowMs);
    }
    return next;
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
