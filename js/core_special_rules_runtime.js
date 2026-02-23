(function (global) {
  "use strict";

  if (!global) return;

  function clonePlain(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function safeClonePlain(value, fallback, clonePlainFn) {
    var copier = typeof clonePlainFn === "function" ? clonePlainFn : clonePlain;
    try {
      return copier(value);
    } catch (_err) {
      return fallback;
    }
  }

  function computeSpecialRulesState(rules, width, height, clonePlainFn) {
    var source = rules && typeof rules === "object" ? rules : {};
    var blockedRaw = Array.isArray(source.blocked_cells) ? source.blocked_cells : [];
    var blockedCellSet = {};
    var blockedCellsList = [];

    for (var i = 0; i < blockedRaw.length; i++) {
      var item = blockedRaw[i];
      var x = null;
      var y = null;
      if (Array.isArray(item) && item.length >= 2) {
        x = Number(item[0]);
        y = Number(item[1]);
      } else if (item && typeof item === "object") {
        x = Number(item.x);
        y = Number(item.y);
      }
      if (!Number.isInteger(x) || !Number.isInteger(y)) continue;
      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      blockedCellSet[x + ":" + y] = true;
      blockedCellsList.push({ x: x, y: y });
    }

    var undoLimit =
      Number.isInteger(source.undo_limit) && source.undo_limit >= 0
        ? source.undo_limit
        : null;
    var comboMultiplier =
      Number.isFinite(source.combo_multiplier) && source.combo_multiplier > 1
        ? Number(source.combo_multiplier)
        : 1;
    var directionLockRules =
      source.direction_lock && typeof source.direction_lock === "object"
        ? safeClonePlain(source.direction_lock, null, clonePlainFn)
        : null;

    return {
      blockedCellSet: blockedCellSet,
      blockedCellsList: blockedCellsList,
      undoLimit: undoLimit,
      comboMultiplier: comboMultiplier,
      directionLockRules: directionLockRules
    };
  }

  global.CoreSpecialRulesRuntime = global.CoreSpecialRulesRuntime || {};
  global.CoreSpecialRulesRuntime.computeSpecialRulesState = computeSpecialRulesState;
})(typeof window !== "undefined" ? window : undefined);
