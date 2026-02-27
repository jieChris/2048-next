(function (global) {
  "use strict";

  if (!global) return;

  function clonePlain(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function safeClonePlain(value, fallback) {
    try {
      return clonePlain(value);
    } catch (_err) {
      return fallback;
    }
  }

  function normalizeRuleset(raw) {
    return raw === "fibonacci" ? "fibonacci" : "pow2";
  }

  function normalizeSpecialRules(rules) {
    if (!rules || typeof rules !== "object" || Array.isArray(rules)) return {};
    return safeClonePlain(rules, {});
  }

  function fallbackNormalizeSpawnTable(spawnTable, ruleset) {
    var normalizedRuleset = normalizeRuleset(ruleset);
    if (Array.isArray(spawnTable) && spawnTable.length > 0) {
      var out = [];
      for (var i = 0; i < spawnTable.length; i++) {
        var item = spawnTable[i];
        if (!item || !Number.isInteger(item.value) || item.value <= 0) continue;
        if (!Number.isFinite(item.weight) || item.weight <= 0) continue;
        out.push({ value: item.value, weight: Number(item.weight) });
      }
      if (out.length > 0) return out;
    }
    if (normalizedRuleset === "fibonacci") {
      return [{ value: 1, weight: 90 }, { value: 2, weight: 10 }];
    }
    return [{ value: 2, weight: 90 }, { value: 4, weight: 10 }];
  }

  function fallbackGetTheoreticalMaxTile(width, height, ruleset) {
    var w = Number(width);
    var h = Number(height);
    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null;
    var cells = Math.floor(w) * Math.floor(h);
    if (!Number.isInteger(cells) || cells <= 0) return null;

    if (normalizeRuleset(ruleset) === "fibonacci") {
      var targetIndex = cells + 2;
      var a = 1;
      var b = 2;
      if (targetIndex <= 1) return 1;
      if (targetIndex === 2) return 2;
      for (var i = 3; i <= targetIndex; i++) {
        var next = a + b;
        a = b;
        b = next;
      }
      return b;
    }

    return Math.pow(2, cells + 1);
  }

  function resolveNormalizeSpawnTable(options) {
    if (options && typeof options.normalizeSpawnTable === "function") {
      return options.normalizeSpawnTable;
    }
    if (
      global.CoreRulesRuntime &&
      typeof global.CoreRulesRuntime.normalizeSpawnTable === "function"
    ) {
      return global.CoreRulesRuntime.normalizeSpawnTable;
    }
    return fallbackNormalizeSpawnTable;
  }

  function resolveGetTheoreticalMaxTile(options) {
    if (options && typeof options.getTheoreticalMaxTile === "function") {
      return options.getTheoreticalMaxTile;
    }
    if (
      global.CoreRulesRuntime &&
      typeof global.CoreRulesRuntime.getTheoreticalMaxTile === "function"
    ) {
      return global.CoreRulesRuntime.getTheoreticalMaxTile;
    }
    return fallbackGetTheoreticalMaxTile;
  }

  function normalizeModeConfig(options) {
    var opts = options || {};
    var modeKey = opts.modeKey;
    var rawConfig = opts.rawConfig;
    var defaultModeKey = opts.defaultModeKey || "standard_4x4_pow2_no_undo";
    var defaultModeConfig = opts.defaultModeConfig || {};

    var fallbackBase = safeClonePlain(defaultModeConfig, {});
    var cfg = rawConfig ? safeClonePlain(rawConfig, fallbackBase) : fallbackBase;
    if (!cfg || typeof cfg !== "object" || Array.isArray(cfg)) {
      cfg = safeClonePlain(defaultModeConfig, {});
    }

    cfg.key = cfg.key || modeKey || defaultModeKey;
    cfg.board_width = Number.isInteger(cfg.board_width) && cfg.board_width > 0 ? cfg.board_width : 4;
    cfg.board_height = Number.isInteger(cfg.board_height) && cfg.board_height > 0 ? cfg.board_height : cfg.board_width;
    cfg.ruleset = normalizeRuleset(cfg.ruleset);

    var normalizeSpecialRulesFn =
      typeof opts.normalizeSpecialRules === "function"
        ? opts.normalizeSpecialRules
        : normalizeSpecialRules;
    cfg.special_rules = normalizeSpecialRulesFn(cfg.special_rules);
    cfg.undo_enabled = !!cfg.undo_enabled;

    var hasNumericMaxTile = Number.isInteger(cfg.max_tile) && cfg.max_tile > 0;
    var isCappedKey = typeof cfg.key === "string" && cfg.key.indexOf("capped") !== -1;
    var forceMaxTile = !!cfg.special_rules.enforce_max_tile;

    var getTheoreticalMaxTile = resolveGetTheoreticalMaxTile(opts);
    if (cfg.ruleset === "fibonacci") {
      cfg.max_tile = hasNumericMaxTile && (isCappedKey || forceMaxTile) ? cfg.max_tile : null;
    } else if (hasNumericMaxTile) {
      cfg.max_tile = cfg.max_tile;
    } else {
      cfg.max_tile = getTheoreticalMaxTile(cfg.board_width, cfg.board_height, cfg.ruleset);
    }

    var normalizeSpawnTable = resolveNormalizeSpawnTable(opts);
    var customFourRate = Number(cfg.special_rules.custom_spawn_four_rate);
    if (cfg.ruleset === "pow2" && Number.isFinite(customFourRate)) {
      if (customFourRate < 0) customFourRate = 0;
      if (customFourRate > 100) customFourRate = 100;
      customFourRate = Math.round(customFourRate * 100) / 100;

      var twoRate = Math.round((100 - customFourRate) * 100) / 100;
      var strictTable = [];
      if (twoRate > 0) strictTable.push({ value: 2, weight: twoRate });
      if (customFourRate > 0) strictTable.push({ value: 4, weight: customFourRate });
      if (!strictTable.length) strictTable.push({ value: 2, weight: 100 });
      cfg.spawn_table = strictTable;
      cfg.special_rules.custom_spawn_four_rate = customFourRate;
    } else {
      cfg.spawn_table = normalizeSpawnTable(cfg.spawn_table, cfg.ruleset);
    }

    cfg.ranked_bucket = cfg.ranked_bucket || "none";
    cfg.mode_family = cfg.mode_family || (cfg.ruleset === "fibonacci" ? "fibonacci" : "pow2");
    cfg.rank_policy = cfg.rank_policy || (cfg.ranked_bucket !== "none" ? "ranked" : "unranked");
    return cfg;
  }

  function toModeId(mode) {
    if (typeof mode !== "string") return "";
    var value = mode.trim().toLowerCase();
    return value || "";
  }

  function isCappedModeState(input) {
    var source = input || {};
    var key = String(source.modeKey || source.mode || "");
    var maxTile = Number(source.maxTile);
    return key.indexOf("capped") !== -1 && Number.isFinite(maxTile) && maxTile > 0;
  }

  function getCappedTargetValue(input) {
    if (!isCappedModeState(input)) return null;
    return Number(input && input.maxTile);
  }

  function isProgressiveCapped64Mode(_input) {
    return false;
  }

  function getForcedUndoSetting(input) {
    var source = input || {};
    var modeCfg = source.modeConfig || null;
    if (modeCfg && typeof modeCfg.undo_enabled === "boolean") {
      return modeCfg.undo_enabled;
    }

    var modeId = toModeId(source.mode);
    if (!modeId) return null;
    if (modeId === "capped" || modeId.indexOf("capped") !== -1) return false;
    if (modeId.indexOf("no_undo") !== -1 || modeId.indexOf("no-undo") !== -1) return false;
    if (modeId.indexOf("undo_only") !== -1 || modeId.indexOf("undo-only") !== -1) return true;
    return null;
  }

  function isUndoAllowedByMode(input) {
    return getForcedUndoSetting(input) !== false;
  }

  function isUndoSettingFixedForMode(input) {
    return getForcedUndoSetting(input) !== null;
  }

  function canToggleUndoSetting(input) {
    var source = input || {};
    if (!isUndoAllowedByMode(source)) return false;
    if (isUndoSettingFixedForMode(source)) return false;
    return !source.hasGameStarted;
  }

  function isTimerLeaderboardAvailableByMode(_mode) {
    return true;
  }

  function resolveLegacyModeFromModeKey(input) {
    var source = input || {};
    var key = source.modeKey || source.fallbackModeKey || source.mode || "";
    var legacyModeByKey = source.legacyModeByKey || null;
    if (legacyModeByKey && typeof legacyModeByKey[key] === "string") {
      return legacyModeByKey[key] || "classic";
    }
    if (key && key.indexOf("capped") !== -1) return "capped";
    if (key && key.indexOf("practice") !== -1) return "practice";
    return "classic";
  }

  function resolveModeCatalogAlias(input) {
    var source = input || {};
    var id = source.modeId || source.defaultModeKey;
    var legacyAliasToModeKey = source.legacyAliasToModeKey || null;
    if (
      legacyAliasToModeKey &&
      Object.prototype.hasOwnProperty.call(legacyAliasToModeKey, id) &&
      typeof legacyAliasToModeKey[id] === "string" &&
      legacyAliasToModeKey[id]
    ) {
      return legacyAliasToModeKey[id];
    }
    return id;
  }

  global.CoreModeRuntime = global.CoreModeRuntime || {};
  global.CoreModeRuntime.normalizeSpecialRules = normalizeSpecialRules;
  global.CoreModeRuntime.normalizeModeConfig = normalizeModeConfig;
  global.CoreModeRuntime.isCappedModeState = isCappedModeState;
  global.CoreModeRuntime.getCappedTargetValue = getCappedTargetValue;
  global.CoreModeRuntime.isProgressiveCapped64Mode = isProgressiveCapped64Mode;
  global.CoreModeRuntime.getForcedUndoSetting = getForcedUndoSetting;
  global.CoreModeRuntime.isUndoAllowedByMode = isUndoAllowedByMode;
  global.CoreModeRuntime.isUndoSettingFixedForMode = isUndoSettingFixedForMode;
  global.CoreModeRuntime.canToggleUndoSetting = canToggleUndoSetting;
  global.CoreModeRuntime.isTimerLeaderboardAvailableByMode = isTimerLeaderboardAvailableByMode;
  global.CoreModeRuntime.resolveLegacyModeFromModeKey = resolveLegacyModeFromModeKey;
  global.CoreModeRuntime.resolveModeCatalogAlias = resolveModeCatalogAlias;
})(typeof window !== "undefined" ? window : undefined);
