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

  function resolveCappedTimerLegendFontSize(cappedTargetValue) {
    var cap = Number(cappedTargetValue);
    var resolvedCap = Number.isFinite(cap) && cap > 0 ? cap : 2048;
    if (resolvedCap >= 8192) return "13px";
    if (resolvedCap >= 1024) return "14px";
    if (resolvedCap >= 128) return "18px";
    return "22px";
  }

  function resolveCappedTimerLegendClass(input) {
    var source = input || {};
    var rawSlotByValue = source.timerMilestoneSlotByValue;
    var slotByValue =
      rawSlotByValue && typeof rawSlotByValue === "object" ? rawSlotByValue : null;
    var targetKey = String(source.cappedTargetValue);
    var slotId = slotByValue ? slotByValue[targetKey] : null;
    if (slotId === null || slotId === undefined || slotId === "") return "timertile";
    return "timertile timer-legend-" + String(slotId);
  }

  function formatCappedRepeatLabel(repeatCount) {
    return "x" + String(repeatCount);
  }

  function resolveCappedPlaceholderRowValues(input) {
    var source = input || {};
    if (!source.isCappedMode) return [];
    var cap = Number(source.cappedTargetValue);
    if (!Number.isFinite(cap) || cap <= 0) return [];

    var timerSlotIds = Array.isArray(source.timerSlotIds) ? source.timerSlotIds : [];
    var values = [];
    for (var i = 0; i < timerSlotIds.length; i++) {
      var slotId = Number(timerSlotIds[i]);
      if (!Number.isInteger(slotId) || slotId <= 0) continue;
      if (slotId > cap) values.push(slotId);
    }
    return values;
  }

  function resolveCappedPlaceholderSlotByRepeatCount(input) {
    var source = input || {};
    var repeatCount = Number(source.repeatCount);
    if (!Number.isInteger(repeatCount) || repeatCount < 2) return null;

    var values = Array.isArray(source.placeholderRowValues) ? source.placeholderRowValues : [];
    var placeholderIndex = repeatCount - 2; // x2 => first placeholder row
    if (placeholderIndex < 0 || placeholderIndex >= values.length) return null;

    var slotId = Number(values[placeholderIndex]);
    if (!Number.isInteger(slotId) || slotId <= 0) return null;
    return slotId;
  }

  function resolveCappedRowVisibilityPlan(input) {
    var source = input || {};
    var timerSlotIds = Array.isArray(source.timerSlotIds) ? source.timerSlotIds : [];
    var values = [];
    for (var i = 0; i < timerSlotIds.length; i++) {
      var slotId = Number(timerSlotIds[i]);
      if (!Number.isInteger(slotId) || slotId <= 0) continue;
      values.push(slotId);
    }

    if (!source.isCappedMode) {
      return values.map(function (value) {
        return { value: value, visible: true, keepSpace: false };
      });
    }

    if (source.isProgressiveCapped64Mode) {
      return values.map(function (value) {
        return { value: value, visible: false, keepSpace: true };
      });
    }

    var cap = Number(source.cappedTargetValue);
    var resolvedCap = Number.isFinite(cap) ? cap : 0;
    return values.map(function (value) {
      return {
        value: value,
        visible: value <= resolvedCap,
        keepSpace: true
      };
    });
  }

  function createProgressiveCapped64UnlockedState(unlockedState) {
    var base = { "16": false, "32": false, "64": false };
    if (!unlockedState || typeof unlockedState !== "object") return base;
    if (unlockedState["16"] === true) base["16"] = true;
    if (unlockedState["32"] === true) base["32"] = true;
    if (unlockedState["64"] === true) base["64"] = true;
    return base;
  }

  function resolveProgressiveCapped64Unlock(input) {
    var source = input || {};
    var nextUnlockedState = createProgressiveCapped64UnlockedState(source.unlockedState);
    if (!source.isProgressiveCapped64Mode) {
      return { nextUnlockedState: nextUnlockedState, unlockedValue: null };
    }

    var value = Number(source.value);
    if (value !== 16 && value !== 32 && value !== 64) {
      return { nextUnlockedState: nextUnlockedState, unlockedValue: null };
    }
    var key = String(value);
    if (nextUnlockedState[key]) {
      return { nextUnlockedState: nextUnlockedState, unlockedValue: null };
    }
    nextUnlockedState[key] = true;
    return { nextUnlockedState: nextUnlockedState, unlockedValue: value };
  }

  function isGameTerminatedState(input) {
    var source = input || {};
    return !!source.over || (!!source.won && !source.keepPlaying);
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

  function resolveUndoPolicyState(input) {
    var source = input || {};
    var forcedUndoSetting = getForcedUndoSetting(source);
    var modeAllowed = forcedUndoSetting !== false;
    var fixedSetting = forcedUndoSetting !== null;
    var canToggle = modeAllowed && !fixedSetting && !source.hasGameStarted;

    var replayMode = !!source.replayMode;
    var overUndoLimit = source.undoLimit !== null && Number(source.undoUsed) >= Number(source.undoLimit);
    var interactionEnabled = !replayMode && !overUndoLimit && !!(source.undoEnabled && modeAllowed);

    return {
      forcedUndoSetting: forcedUndoSetting,
      isUndoAllowedByMode: modeAllowed,
      isUndoSettingFixedForMode: fixedSetting,
      canToggleUndoSetting: canToggle,
      isUndoInteractionEnabled: interactionEnabled
    };
  }

  function isUndoInteractionEnabled(input) {
    var source = input || {};
    if (source.replayMode) return false;
    if (source.undoLimit !== null && Number(source.undoUsed) >= Number(source.undoLimit)) return false;
    return !!(source.undoEnabled && source.isUndoAllowedByMode);
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

  function isPlainRecord(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
  }

  function resolveModeConfigModeKey(input) {
    var source = input || {};
    var defaultModeKey = source.defaultModeKey || "standard_4x4_pow2_no_undo";
    var id = source.modeId || defaultModeKey;
    var getModeConfig = typeof source.getModeConfig === "function" ? source.getModeConfig : null;

    if (getModeConfig && isPlainRecord(getModeConfig(id))) return id;

    var mapped = resolveModeCatalogAlias({
      modeId: id,
      defaultModeKey: defaultModeKey,
      legacyAliasToModeKey: source.legacyAliasToModeKey || null
    });
    if (mapped && mapped !== id && getModeConfig && isPlainRecord(getModeConfig(mapped))) {
      return mapped;
    }

    return defaultModeKey;
  }

  function resolveModeCatalogConfig(input) {
    var source = input || {};
    var modeId = typeof source.modeId === "string" ? source.modeId : "";
    if (!modeId) return null;

    var catalogGetMode = typeof source.catalogGetMode === "function" ? source.catalogGetMode : null;
    if (catalogGetMode) {
      var catalogConfig = catalogGetMode(modeId);
      if (catalogConfig && typeof catalogConfig === "object" && !Array.isArray(catalogConfig)) {
        try {
          return clonePlain(catalogConfig);
        } catch (_err) {
          return null;
        }
      }
    }

    var fallbackModeConfigs = source.fallbackModeConfigs || null;
    if (
      fallbackModeConfigs &&
      typeof fallbackModeConfigs === "object" &&
      !Array.isArray(fallbackModeConfigs) &&
      Object.prototype.hasOwnProperty.call(fallbackModeConfigs, modeId)
    ) {
      var fallbackConfig = fallbackModeConfigs[modeId];
      if (fallbackConfig && typeof fallbackConfig === "object" && !Array.isArray(fallbackConfig)) {
        try {
          return clonePlain(fallbackConfig);
        } catch (_err2) {
          return null;
        }
      }
    }

    return null;
  }

  function resolveModeConfigFromCatalog(input) {
    var source = input || {};
    var defaultModeKey = source.defaultModeKey || "standard_4x4_pow2_no_undo";
    var getModeConfig = typeof source.getModeConfig === "function" ? source.getModeConfig : null;

    var resolvedModeId = resolveModeConfigModeKey({
      modeId: source.modeId || defaultModeKey,
      defaultModeKey: defaultModeKey,
      getModeConfig: getModeConfig,
      legacyAliasToModeKey: source.legacyAliasToModeKey || null
    });

    var resolvedModeConfig = getModeConfig ? getModeConfig(resolvedModeId) : null;
    if (isPlainRecord(resolvedModeConfig)) {
      return {
        resolvedModeId: resolvedModeId,
        modeConfig: clonePlain(resolvedModeConfig)
      };
    }

    var defaultModeConfig = getModeConfig ? getModeConfig(defaultModeKey) : null;
    if (isPlainRecord(defaultModeConfig)) {
      return {
        resolvedModeId: defaultModeKey,
        modeConfig: clonePlain(defaultModeConfig)
      };
    }

    return {
      resolvedModeId: defaultModeKey,
      modeConfig: null
    };
  }

  function resolveDetectedMode(input) {
    var source = input || {};
    var fallbackModeKey = source.defaultModeKey || "standard_4x4_pow2_no_undo";

    var existingMode = typeof source.existingMode === "string" ? source.existingMode : "";
    if (existingMode) return existingMode;

    var bodyMode = typeof source.bodyMode === "string" ? source.bodyMode : "";
    if (bodyMode) return bodyMode;

    var pathname = typeof source.pathname === "string" ? source.pathname : "";
    if (!pathname) return fallbackModeKey;
    if (pathname.indexOf("undo_2048") !== -1) return "classic_4x4_pow2_undo";
    if (pathname.indexOf("Practice_board") !== -1) return "practice_legacy";
    if (pathname.indexOf("capped_2048") !== -1) return "capped_4x4_pow2_no_undo";
    if (
      pathname === "/" ||
      /\/$/.test(pathname) ||
      pathname.indexOf("/index.html") !== -1 ||
      pathname.indexOf("index.html") !== -1
    ) {
      return "standard_4x4_pow2_no_undo";
    }
    return "classic_4x4_pow2_undo";
  }

  global.CoreModeRuntime = global.CoreModeRuntime || {};
  global.CoreModeRuntime.normalizeSpecialRules = normalizeSpecialRules;
  global.CoreModeRuntime.normalizeModeConfig = normalizeModeConfig;
  global.CoreModeRuntime.isCappedModeState = isCappedModeState;
  global.CoreModeRuntime.getCappedTargetValue = getCappedTargetValue;
  global.CoreModeRuntime.isProgressiveCapped64Mode = isProgressiveCapped64Mode;
  global.CoreModeRuntime.resolveCappedTimerLegendFontSize = resolveCappedTimerLegendFontSize;
  global.CoreModeRuntime.resolveCappedTimerLegendClass = resolveCappedTimerLegendClass;
  global.CoreModeRuntime.formatCappedRepeatLabel = formatCappedRepeatLabel;
  global.CoreModeRuntime.resolveCappedPlaceholderRowValues = resolveCappedPlaceholderRowValues;
  global.CoreModeRuntime.resolveCappedPlaceholderSlotByRepeatCount = resolveCappedPlaceholderSlotByRepeatCount;
  global.CoreModeRuntime.resolveCappedRowVisibilityPlan = resolveCappedRowVisibilityPlan;
  global.CoreModeRuntime.createProgressiveCapped64UnlockedState = createProgressiveCapped64UnlockedState;
  global.CoreModeRuntime.resolveProgressiveCapped64Unlock = resolveProgressiveCapped64Unlock;
  global.CoreModeRuntime.isGameTerminatedState = isGameTerminatedState;
  global.CoreModeRuntime.getForcedUndoSetting = getForcedUndoSetting;
  global.CoreModeRuntime.isUndoAllowedByMode = isUndoAllowedByMode;
  global.CoreModeRuntime.isUndoSettingFixedForMode = isUndoSettingFixedForMode;
  global.CoreModeRuntime.canToggleUndoSetting = canToggleUndoSetting;
  global.CoreModeRuntime.resolveUndoPolicyState = resolveUndoPolicyState;
  global.CoreModeRuntime.isUndoInteractionEnabled = isUndoInteractionEnabled;
  global.CoreModeRuntime.isTimerLeaderboardAvailableByMode = isTimerLeaderboardAvailableByMode;
  global.CoreModeRuntime.resolveLegacyModeFromModeKey = resolveLegacyModeFromModeKey;
  global.CoreModeRuntime.resolveModeCatalogAlias = resolveModeCatalogAlias;
  global.CoreModeRuntime.resolveModeConfigModeKey = resolveModeConfigModeKey;
  global.CoreModeRuntime.resolveModeCatalogConfig = resolveModeCatalogConfig;
  global.CoreModeRuntime.resolveModeConfigFromCatalog = resolveModeConfigFromCatalog;
  global.CoreModeRuntime.resolveDetectedMode = resolveDetectedMode;
})(typeof window !== "undefined" ? window : undefined);
