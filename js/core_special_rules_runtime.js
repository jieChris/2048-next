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

  function normalizePointList(rawList, width, height) {
    var source = Array.isArray(rawList) ? rawList : [];
    var out = [];
    for (var i = 0; i < source.length; i++) {
      var item = source[i];
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
      out.push({ x: x, y: y });
    }
    return out;
  }

  function normalizeMovementDirections(rawDirections, allowDiagonalRaw) {
    var out = [];
    if (Array.isArray(rawDirections)) {
      for (var i = 0; i < rawDirections.length; i++) {
        var dir = Number(rawDirections[i]);
        if (!Number.isInteger(dir) || dir < 0 || dir > 7) continue;
        if (out.indexOf(dir) !== -1) continue;
        out.push(dir);
      }
    }
    if (out.length) return out;
    if (allowDiagonalRaw === true) return [0, 1, 2, 3, 4, 5, 6, 7];
    return [0, 1, 2, 3];
  }

  function normalizeMoveTimeoutMs(rawValue) {
    var timeoutMs = Number(rawValue);
    if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) return null;
    return timeoutMs;
  }

  function normalizeItemModeRules(rawValue) {
    if (!(rawValue && typeof rawValue === "object" && !Array.isArray(rawValue))) return null;
    if (rawValue.enabled === false) return null;
    var grantEveryMoves =
      Number.isInteger(rawValue.grant_every_moves) && Number(rawValue.grant_every_moves) > 0
        ? Number(rawValue.grant_every_moves)
        : 6;
    var maxPerItem =
      Number.isInteger(rawValue.max_per_item) && Number(rawValue.max_per_item) > 0
        ? Number(rawValue.max_per_item)
        : 3;
    return {
      enabled: true,
      grantEveryMoves: grantEveryMoves,
      maxPerItem: maxPerItem
    };
  }

  function computeSpecialRulesState(rules, width, height, clonePlainFn) {
    var source = rules && typeof rules === "object" ? rules : {};
    var blockedCellsList = normalizePointList(source.blocked_cells, width, height);
    var blockedCellSet = {};
    for (var i = 0; i < blockedCellsList.length; i++) {
      var cell = blockedCellsList[i];
      blockedCellSet[cell.x + ":" + cell.y] = true;
    }
    var stoneCellsList = normalizePointList(source.stone_tiles, width, height);

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
    var movementDirections = normalizeMovementDirections(
      source.movement_directions,
      source.allow_diagonal_moves
    );
    var moveTimeoutMs = normalizeMoveTimeoutMs(source.move_timeout_ms);
    var itemModeRules = normalizeItemModeRules(source.item_mode);

    return {
      blockedCellSet: blockedCellSet,
      blockedCellsList: blockedCellsList,
      stoneCellsList: stoneCellsList,
      undoLimit: undoLimit,
      comboMultiplier: comboMultiplier,
      directionLockRules: directionLockRules,
      movementDirections: movementDirections,
      moveTimeoutMs: moveTimeoutMs,
      itemModeRules: itemModeRules
    };
  }

  global.CoreSpecialRulesRuntime = global.CoreSpecialRulesRuntime || {};
  global.CoreSpecialRulesRuntime.computeSpecialRulesState = computeSpecialRulesState;
})(typeof window !== "undefined" ? window : undefined);
