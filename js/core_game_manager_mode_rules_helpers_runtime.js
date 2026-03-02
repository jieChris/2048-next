function isModeRulesRecordObject(value) {
  return !!(value && typeof value === "object");
}

function normalizeModeRulesRecordObject(value, fallback) {
  return isModeRulesRecordObject(value) ? value : fallback;
}

function isModeRulesNonArrayObject(value) {
  return isModeRulesRecordObject(value) && !Array.isArray(value);
}

function resolveCoreModeStringCallOrFallback(
  manager,
  methodName,
  payload,
  fallbackResolver,
  allowEmpty
) {
  return resolveCorePayloadCallWith(
    manager,
    "callCoreModeRuntime",
    methodName,
    payload,
    "",
    function (currentManager, coreCallResult) {
      return resolveCoreStringCallResult(
        currentManager,
        coreCallResult,
        fallbackResolver,
        allowEmpty
      );
    }
  );
}

function resolveCoreModeStringCallOrFallbackWithArgs(
  manager,
  methodName,
  runtimeArgs,
  fallbackResolver,
  allowEmpty
) {
  return resolveCoreArgsStringCallOrFallback(
    manager,
    "callCoreModeRuntime",
    methodName,
    runtimeArgs,
    fallbackResolver,
    allowEmpty
  );
}

function resolveCoreModeBooleanCallOrFallback(
  manager,
  methodName,
  payload,
  fallbackResolver
) {
  return resolveCorePayloadCallWith(
    manager,
    "callCoreModeRuntime",
    methodName,
    payload,
    false,
    function (currentManager, coreCallResult) {
      return resolveCoreBooleanCallResult(currentManager, coreCallResult, fallbackResolver);
    }
  );
}

function resolveCoreModeNormalizedCallOrFallback(
  manager,
  methodName,
  payload,
  normalizer,
  fallbackResolver
) {
  return resolveCoreNormalizedPayloadCallOrFallback(
    manager,
    "callCoreModeRuntime",
    methodName,
    payload,
    normalizer,
    fallbackResolver
  );
}

function resolveCoreModeNormalizedCallOrFallbackAllowNull(
  manager,
  methodName,
  payload,
  normalizer,
  fallbackResolver
) {
  return resolveCorePayloadCallWith(
    manager,
    "callCoreModeRuntime",
    methodName,
    payload,
    undefined,
    function (currentManager, coreCallResult) {
      return resolveCoreNormalizedCallResult(
        currentManager,
        coreCallResult,
        normalizer,
        fallbackResolver,
        true
      );
    }
  );
}

function resolveCoreModeRawCallValueOrUndefined(manager, methodName, payload) {
  return resolveCorePayloadCallWith(
    manager,
    "callCoreModeRuntime",
    methodName,
    payload,
    undefined,
    function (currentManager, coreCallResult) {
      return resolveCoreRawCallResultOrUndefined(currentManager, coreCallResult);
    }
  );
}

function tryHandleCoreModeRawValue(manager, methodName, payload, handler) {
  return tryHandleCorePayloadRawValue(manager, "callCoreModeRuntime", methodName, payload, handler);
}

function resolveCoreRulesNumericCallOrFallback(
  manager,
  methodName,
  runtimeArgs,
  fallbackResolver
) {
  return resolveCoreArgsNumericCallOrFallback(
    manager,
    "callCoreRulesRuntime",
    methodName,
    runtimeArgs,
    fallbackResolver
  );
}

function resolveCoreRulesStringCallOrFallback(
  manager,
  methodName,
  runtimeArgs,
  fallbackResolver,
  allowEmpty
) {
  return resolveCoreArgsStringCallOrFallback(
    manager,
    "callCoreRulesRuntime",
    methodName,
    runtimeArgs,
    fallbackResolver,
    allowEmpty
  );
}

function resolveCoreRulesNormalizedCallOrFallback(
  manager,
  methodName,
  runtimeArgs,
  normalizer,
  fallbackResolver
) {
  return resolveCoreArgsNormalizedCallOrFallback(
    manager,
    "callCoreRulesRuntime",
    methodName,
    runtimeArgs,
    normalizer,
    fallbackResolver
  );
}

function resolveCoreRulesNormalizedCallOrFallbackAllowNull(
  manager,
  methodName,
  runtimeArgs,
  normalizer,
  fallbackResolver
) {
  return resolveCoreArgsCallWith(
    manager,
    "callCoreRulesRuntime",
    methodName,
    runtimeArgs,
    undefined,
    function (currentManager, coreCallResult) {
      return resolveCoreNormalizedCallResult(
        currentManager,
        coreCallResult,
        normalizer,
        fallbackResolver,
        true
      );
    }
  );
}

function tryHandleCoreRulesRawValue(manager, methodName, runtimeArgs, handler) {
  return tryHandleCoreArgsRawValue(manager, "callCoreRulesRuntime", methodName, runtimeArgs, handler);
}

function applySpecialRulesState(manager) {
  if (!manager) return;
  var handledByCore = tryHandleCoreSpecialRulesRawValue(
    manager,
    "computeSpecialRulesState",
    [
      manager.specialRules || {},
      manager.width,
      manager.height,
      manager.clonePlain.bind(manager)
    ],
    function (coreValue) {
      applySpecialRulesCoreState(manager, coreValue);
    }
  );
  if (handledByCore) return;
  applySpecialRulesFallbackState(manager, manager.specialRules || {});
}

function resolveSpecialRulesBlockedCellSetFromCoreState(state) {
  return isModeRulesRecordObject(state.blockedCellSet)
    ? state.blockedCellSet
    : {};
}

function resolveSpecialRulesBlockedCellsListFromCoreState(state) {
  return Array.isArray(state.blockedCellsList) ? state.blockedCellsList : [];
}

function resolveSpecialRulesUndoLimitValue(value) {
  return (Number.isInteger(value) && value >= 0)
    ? value
    : null;
}

function resolveSpecialRulesComboMultiplierValue(value) {
  return (Number.isFinite(value) && value > 1)
    ? Number(value)
    : 1;
}

function resolveSpecialRulesDirectionLockRulesValue(manager, value) {
  if (!manager) return null;
  return isModeRulesRecordObject(value)
    ? manager.clonePlain(value)
    : null;
}

function applySpecialRulesCoreState(manager, coreValue) {
  if (!manager) return;
  var state = normalizeModeRulesRecordObject(coreValue, {});
  manager.blockedCellSet = resolveSpecialRulesBlockedCellSetFromCoreState(state);
  manager.blockedCellsList = resolveSpecialRulesBlockedCellsListFromCoreState(state);
  manager.undoLimit = resolveSpecialRulesUndoLimitValue(state.undoLimit);
  manager.comboMultiplier = resolveSpecialRulesComboMultiplierValue(state.comboMultiplier);
  manager.directionLockRules = resolveSpecialRulesDirectionLockRulesValue(manager, state.directionLockRules);
}

function resolveBlockedCellPoint(item, width, height) {
  var x = null;
  var y = null;
  if (Array.isArray(item) && item.length >= 2) {
    x = Number(item[0]);
    y = Number(item[1]);
  } else if (isModeRulesRecordObject(item)) {
    x = Number(item.x);
    y = Number(item.y);
  }
  if (!Number.isInteger(x) || !Number.isInteger(y)) return null;
  if (x < 0 || x >= width || y < 0 || y >= height) return null;
  return { x: x, y: y };
}

function applySpecialRulesBlockedCellsFallback(manager, blockedRaw) {
  if (!manager) return;
  manager.blockedCellSet = {};
  manager.blockedCellsList = [];
  var source = Array.isArray(blockedRaw) ? blockedRaw : [];
  for (var i = 0; i < source.length; i++) {
    var point = resolveBlockedCellPoint(source[i], manager.width, manager.height);
    if (!point) continue;
    manager.blockedCellSet[point.x + ":" + point.y] = true;
    manager.blockedCellsList.push(point);
  }
}

function applySpecialRulesFallbackState(manager, rules) {
  if (!manager) return;
  var safeRules = normalizeModeRulesRecordObject(rules, {});
  applySpecialRulesBlockedCellsFallback(manager, safeRules.blocked_cells);
  manager.undoLimit = resolveSpecialRulesUndoLimitValue(safeRules.undo_limit);
  manager.comboMultiplier = resolveSpecialRulesComboMultiplierValue(safeRules.combo_multiplier);
  manager.directionLockRules = resolveSpecialRulesDirectionLockRulesValue(manager, safeRules.direction_lock);
}

function normalizeSpecialRules(manager, rules) {
  if (!manager) return {};
  return resolveCoreModeNormalizedCallOrFallback(
    manager,
    "normalizeSpecialRules",
    rules,
    function (coreValue) {
      return manager.isNonArrayObject(coreValue) ? coreValue : undefined;
    },
    function () {
      if (!isModeRulesNonArrayObject(rules)) return {};
      return manager.clonePlain(rules);
    }
  );
}

function getModeConfigFromCatalog(manager, modeKey) {
  if (!manager) return null;
  var modeCatalogGetMode = manager.resolveWindowNamespaceMethod("ModeCatalog", "getMode");
  var catalogGetMode = modeCatalogGetMode
    ? function (requestedModeId) {
        return modeCatalogGetMode.method.call(modeCatalogGetMode.scope, requestedModeId);
      }
    : null;

  return resolveCoreModeNormalizedCallOrFallbackAllowNull(
    manager,
    "resolveModeCatalogConfig",
    {
      modeId: modeKey,
      catalogGetMode: catalogGetMode,
      fallbackModeConfigs: GameManager.FALLBACK_MODE_CONFIGS
    },
    function (coreValue) {
      if (coreValue === null) return null;
      return manager.isNonArrayObject(coreValue) ? coreValue : undefined;
    },
    function () {
      if (catalogGetMode) {
        return catalogGetMode(modeKey);
      }
      if (GameManager.FALLBACK_MODE_CONFIGS[modeKey]) {
        return manager.clonePlain(GameManager.FALLBACK_MODE_CONFIGS[modeKey]);
      }
      return null;
    }
  );
}

function resolveGridCellAvailableFn(manager) {
  if (manager && manager.grid && typeof manager.grid.cellAvailable === "function") {
    return manager.grid.cellAvailable.bind(manager.grid);
  }
  return function () { return false; };
}

function resolveSpawnCount(manager, value) {
  if (!manager) return 0;
  return resolveCoreRulesNumericCallOrFallback(
    manager,
    "getSpawnCount",
    [manager.spawnValueCounts, value],
    function () {
      if (!manager.spawnValueCounts) return 0;
      return manager.spawnValueCounts[String(value)] || 0;
    }
  );
}

function resolveTheoreticalMaxTile(manager, width, height, ruleset) {
  if (!manager) return null;
  return resolveCoreRulesNormalizedCallOrFallbackAllowNull(
    manager,
    "getTheoreticalMaxTile",
    [width, height, ruleset],
    function (coreValue) {
      if (coreValue === null) return null;
      var tileValue = Number(coreValue);
      return Number.isInteger(tileValue) && tileValue > 0 ? tileValue : undefined;
    },
    function () {
      var w = Number(width);
      var h = Number(height);
      if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null;
      var cells = Math.floor(w) * Math.floor(h);
      cells = Number.isInteger(cells) && cells > 0 ? cells : null;
      if (cells === null) return null;
      if (ruleset === "fibonacci") {
        // Fibonacci 4x4 theoretical max: 4181.
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
      // Pow2 4x4 theoretical max: 131072.
      return Math.pow(2, cells + 1);
    }
  );
}

function collectNormalizedSpawnTableFallbackItems(spawnTable) {
  var normalizedFallbackItems = [];
  if (!(Array.isArray(spawnTable) && spawnTable.length > 0)) return normalizedFallbackItems;
  for (var i = 0; i < spawnTable.length; i++) {
    var item = spawnTable[i];
    if (!item || !Number.isInteger(item.value) || item.value <= 0) continue;
    if (!(Number.isFinite(item.weight) && item.weight > 0)) continue;
    normalizedFallbackItems.push({ value: item.value, weight: Number(item.weight) });
  }
  return normalizedFallbackItems;
}

function resolveDefaultSpawnTableByRuleset(ruleset) {
  if (ruleset === "fibonacci") {
    return [{ value: 1, weight: 90 }, { value: 2, weight: 10 }];
  }
  return [{ value: 2, weight: 90 }, { value: 4, weight: 10 }];
}

function createModeConfigFallbackBase(manager, modeKey, rawConfig) {
  if (!manager) return null;
  var cfg = rawConfig ? manager.clonePlain(rawConfig) : manager.clonePlain(GameManager.DEFAULT_MODE_CONFIG);
  cfg.key = cfg.key || modeKey || GameManager.DEFAULT_MODE_KEY;
  cfg.board_width = Number.isInteger(cfg.board_width) && cfg.board_width > 0 ? cfg.board_width : 4;
  cfg.board_height = Number.isInteger(cfg.board_height) && cfg.board_height > 0 ? cfg.board_height : cfg.board_width;
  cfg.ruleset = cfg.ruleset === "fibonacci" ? "fibonacci" : "pow2";
  cfg.special_rules = manager.normalizeSpecialRules(cfg.special_rules);
  cfg.undo_enabled = !!cfg.undo_enabled;
  return cfg;
}

function resolveModeConfigMaxTile(manager, cfg) {
  if (!manager || !cfg) return null;
  var hasNumericMaxTile = Number.isInteger(cfg.max_tile) && cfg.max_tile > 0;
  var isCappedKey = typeof cfg.key === "string" && cfg.key.indexOf("capped") !== -1;
  var forceMaxTile = !!cfg.special_rules.enforce_max_tile;
  if (cfg.ruleset === "fibonacci") {
    // Fibonacci modes are uncapped by default; only explicit capped modes should enforce max_tile.
    return (hasNumericMaxTile && (isCappedKey || forceMaxTile)) ? cfg.max_tile : null;
  }
  if (hasNumericMaxTile) return cfg.max_tile;
  return resolveTheoreticalMaxTile(manager, cfg.board_width, cfg.board_height, cfg.ruleset);
}

function normalizeCustomSpawnFourRate(rawRate) {
  var customFourRate = Number(rawRate);
  if (!Number.isFinite(customFourRate)) return null;
  if (customFourRate < 0) customFourRate = 0;
  if (customFourRate > 100) customFourRate = 100;
  return Math.round(customFourRate * 100) / 100;
}

function buildPow2StrictSpawnTableByFourRate(customFourRate) {
  var twoRate = Math.round((100 - customFourRate) * 100) / 100;
  var strictTable = [];
  if (twoRate > 0) strictTable.push({ value: 2, weight: twoRate });
  if (customFourRate > 0) strictTable.push({ value: 4, weight: customFourRate });
  if (!strictTable.length) strictTable.push({ value: 2, weight: 100 });
  return strictTable;
}

function applyModeConfigSpawnTableFallback(manager, cfg) {
  if (!manager || !cfg) return;
  var customFourRate = normalizeCustomSpawnFourRate(cfg.special_rules.custom_spawn_four_rate);
  if (cfg.ruleset === "pow2" && customFourRate !== null) {
    cfg.spawn_table = buildPow2StrictSpawnTableByFourRate(customFourRate);
    cfg.special_rules.custom_spawn_four_rate = customFourRate;
    return;
  }
  cfg.spawn_table = manager.normalizeSpawnTable(cfg.spawn_table, cfg.ruleset);
}

function applyModeConfigRankingDefaults(cfg) {
  if (!cfg) return;
  cfg.ranked_bucket = cfg.ranked_bucket || "none";
  cfg.mode_family = cfg.mode_family || (cfg.ruleset === "fibonacci" ? "fibonacci" : "pow2");
  cfg.rank_policy = cfg.rank_policy || (cfg.ranked_bucket !== "none" ? "ranked" : "unranked");
}

function normalizeSpawnTable(manager, spawnTable, ruleset) {
  if (!manager) return resolveDefaultSpawnTableByRuleset(ruleset);
  return resolveCoreRulesNormalizedCallOrFallback(
    manager,
    "normalizeSpawnTable",
    [spawnTable, ruleset],
    function (coreValue) {
      return Array.isArray(coreValue) ? coreValue : undefined;
    },
    function () {
      var normalizedFallbackItems = collectNormalizedSpawnTableFallbackItems(spawnTable);
      if (normalizedFallbackItems.length > 0) return normalizedFallbackItems;
      return resolveDefaultSpawnTableByRuleset(ruleset);
    }
  );
}

function normalizeModeConfig(manager, modeKey, rawConfig) {
  if (!manager) return createModeConfigFallbackBase(null, modeKey, rawConfig);
  return resolveCoreModeNormalizedCallOrFallback(
    manager,
    "normalizeModeConfig",
    manager.createCoreModeDefaultsPayload({
      modeKey: modeKey,
      rawConfig: rawConfig,
      defaultModeConfig: GameManager.DEFAULT_MODE_CONFIG,
      normalizeSpawnTable: manager.normalizeSpawnTable.bind(manager),
      getTheoreticalMaxTile: function (width, height, ruleset) {
        return resolveTheoreticalMaxTile(manager, width, height, ruleset);
      },
      normalizeSpecialRules: manager.normalizeSpecialRules.bind(manager)
    }),
    function (coreValue) {
      return manager.isNonArrayObject(coreValue) ? coreValue : undefined;
    },
    function () {
      var cfg = createModeConfigFallbackBase(manager, modeKey, rawConfig);
      cfg.max_tile = resolveModeConfigMaxTile(manager, cfg);
      applyModeConfigSpawnTableFallback(manager, cfg);
      applyModeConfigRankingDefaults(cfg);
      return cfg;
    }
  );
}

function normalizeResolvedModeConfigFromCore(manager, coreValue) {
  if (!manager) return null;
  var resolvedByCore = coreValue || {};
  var normalizedModeId =
    typeof resolvedByCore.resolvedModeId === "string" && resolvedByCore.resolvedModeId
      ? resolvedByCore.resolvedModeId
      : GameManager.DEFAULT_MODE_KEY;
  var rawConfig = resolvedByCore.modeConfig;
  if (isModeRulesNonArrayObject(rawConfig)) {
    return manager.normalizeModeConfig(normalizedModeId, rawConfig);
  }
  return manager.normalizeModeConfig(GameManager.DEFAULT_MODE_KEY, GameManager.DEFAULT_MODE_CONFIG);
}

function resolveModeConfigFallbackFromCatalog(manager, modeId) {
  if (!manager) return null;
  var byCatalogRaw = manager.getModeConfigFromCatalog(modeId);
  if (byCatalogRaw) return manager.normalizeModeConfig(modeId, byCatalogRaw);
  var mapped = GameManager.LEGACY_ALIAS_TO_MODE_KEY[modeId] || modeId;
  if (mapped && mapped !== modeId) {
    var mappedRaw = manager.getModeConfigFromCatalog(mapped);
    if (mappedRaw) return manager.normalizeModeConfig(mapped, mappedRaw);
  }
  return manager.normalizeModeConfig(GameManager.DEFAULT_MODE_KEY, GameManager.DEFAULT_MODE_CONFIG);
}

function resolveModeConfig(manager, modeId) {
  if (!manager) return null;
  var id = modeId || GameManager.DEFAULT_MODE_KEY;
  return resolveCoreModeNormalizedCallOrFallback(
    manager,
    "resolveModeConfigFromCatalog",
    manager.createCoreModeDefaultsPayload({
      modeId: id,
      getModeConfig: manager.getModeConfigFromCatalog.bind(manager),
      legacyAliasToModeKey: GameManager.LEGACY_ALIAS_TO_MODE_KEY
    }),
    function (coreValue) {
      return normalizeResolvedModeConfigFromCore(manager, coreValue);
    },
    function () {
      return resolveModeConfigFallbackFromCatalog(manager, id);
    }
  );
}

function getLegacyModeFromModeKey(manager, modeKey) {
  if (!manager) return "classic";
  return resolveCoreModeStringCallOrFallback(
    manager,
    "resolveLegacyModeFromModeKey",
    {
      modeKey: modeKey,
      fallbackModeKey: manager.modeKey,
      mode: manager.mode,
      legacyModeByKey: GameManager.LEGACY_MODE_BY_KEY
    },
    function () {
      var key = modeKey || manager.modeKey || manager.mode;
      if (GameManager.LEGACY_MODE_BY_KEY[key]) return GameManager.LEGACY_MODE_BY_KEY[key];
      if (key && key.indexOf("capped") !== -1) return "capped";
      if (key && key.indexOf("practice") !== -1) return "practice";
      return "classic";
    }
  );
}

function getTimerMilestoneValues(manager) {
  if (!manager) return GameManager.TIMER_SLOT_IDS.slice();
  return resolveCoreRulesNormalizedCallOrFallback(
    manager,
    "getTimerMilestoneValues",
    [
      manager.isFibonacciMode() ? "fibonacci" : "pow2",
      GameManager.TIMER_SLOT_IDS
    ],
    function (coreValue) {
      return Array.isArray(coreValue) ? coreValue : undefined;
    },
    function () {
      if (manager.isFibonacciMode()) {
        // 13 slots mapped to Fibonacci milestones.
        return [13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584, 4181];
      }
      return GameManager.TIMER_SLOT_IDS.slice();
    }
  );
}

function applySetupModeConfig(manager, cfg) {
  if (!manager || !cfg) return;
  applySetupModeConfigCoreFields(manager, cfg);
  applySetupModeConfigRulesAndSpecialState(manager, cfg);
  syncSetupModeScoreManager(manager, cfg);
  syncSetupModeDocumentAttributes(manager, cfg);
  syncSetupModeWindowConfig(manager);
}

function applySetupModeConfigCoreFields(manager, cfg) {
  if (!manager || !cfg) return;
  manager.modeConfig = cfg;
  manager.mode = cfg.key;
  manager.modeKey = cfg.key;
  manager.width = cfg.board_width;
  manager.height = cfg.board_height;
  manager.size = manager.width;
  manager.ruleset = cfg.ruleset;
  manager.maxTile = cfg.max_tile || Infinity;
}

function resolveSetupModeFamily(cfg, rankedBucket) {
  if (!cfg) return "pow2";
  if (cfg.mode_family) return cfg.mode_family;
  return cfg.ruleset === "fibonacci" ? "fibonacci" : "pow2";
}

function resolveSetupRankPolicy(cfg, rankedBucket) {
  if (!cfg) return "unranked";
  if (cfg.rank_policy) return cfg.rank_policy;
  return rankedBucket !== "none" ? "ranked" : "unranked";
}

function applySetupModeDerivedPolicyFields(manager, cfg) {
  if (!manager || !cfg) return;
  manager.rankedBucket = cfg.ranked_bucket || "none";
  manager.modeFamily = resolveSetupModeFamily(cfg, manager.rankedBucket);
  manager.rankPolicy = resolveSetupRankPolicy(cfg, manager.rankedBucket);
}

function applySetupModeRuleNormalization(manager, cfg) {
  if (!manager || !cfg) return;
  manager.spawnTable = manager.normalizeSpawnTable(cfg.spawn_table, cfg.ruleset);
  manager.specialRules = manager.normalizeSpecialRules(cfg.special_rules);
}

function applySetupModeConfigRulesAndSpecialState(manager, cfg) {
  if (!manager || !cfg) return;
  applySetupModeRuleNormalization(manager, cfg);
  applySetupModeDerivedPolicyFields(manager, cfg);
  applySpecialRulesState(manager);
}

function syncSetupModeScoreManager(manager, cfg) {
  if (!manager || !cfg) return;
  if (manager.scoreManager && typeof manager.scoreManager.setModeKey === "function") {
    manager.scoreManager.setModeKey(cfg.key);
  }
}

function syncSetupModeDocumentAttributes(manager, cfg) {
  if (!manager || !cfg) return;
  var documentLike = resolveManagerDocumentLike(manager);
  if (!documentLike || !documentLike.body) return;
  documentLike.body.setAttribute("data-mode-id", cfg.key);
  documentLike.body.setAttribute("data-ruleset", cfg.ruleset);
  documentLike.body.setAttribute("data-mode-family", manager.modeFamily);
  documentLike.body.setAttribute("data-rank-policy", manager.rankPolicy);
}

function syncSetupModeWindowConfig(manager) {
  if (!manager) return;
  var windowLike = typeof manager.getWindowLike === "function"
    ? manager.getWindowLike()
    : (typeof window !== "undefined" ? window : null);
  if (!windowLike) return;
  windowLike.GAME_MODE_CONFIG = manager.clonePlain(manager.modeConfig);
}

function isBlockedCell(manager, x, y) {
  if (!manager) return false;
  return !!(manager.blockedCellSet && manager.blockedCellSet[x + ":" + y]);
}

function isFibonacciMode(manager) {
  if (!manager) return false;
  return manager.ruleset === "fibonacci";
}

function computeMergeEffects(manager, mergedValue) {
  if (!manager) return null;
  var cappedState = manager.resolveCappedModeState();
  return resolveCoreMergeEffectsObjectCallOrFallback(
    manager,
    "computeMergeEffects",
    {
      mergedValue: mergedValue,
      isCappedMode: !!cappedState.isCappedMode,
      cappedTargetValue: cappedState.cappedTargetValue,
      reached32k: !!manager.reached32k
    },
    function () {
      var value = Number(mergedValue);
      var cappedTarget = Number(cappedState.cappedTargetValue);
      var cappedMode = !!cappedState.isCappedMode;
      var hasCappedTarget = Number.isFinite(cappedTarget) && cappedTarget > 0;
      var reached32k = !!manager.reached32k;
      var result = {
        shouldRecordCappedMilestone: false,
        shouldSetWon: false,
        shouldSetReached32k: false,
        timerIdsToStamp: [],
        showSubTimerContainer: false,
        hideTimerRows: []
      };

      if (!Number.isInteger(value) || value <= 0) return result;
      if (cappedMode && hasCappedTarget && value === cappedTarget) {
        result.shouldRecordCappedMilestone = true;
      } else if (!cappedMode && value === 2048) {
        result.shouldSetWon = true;
      }
      if (value === 8192) {
        result.timerIdsToStamp.push(reached32k ? "timer8192-sub" : "timer8192");
      }
      if (value === 16384) {
        result.timerIdsToStamp.push(reached32k ? "timer16384-sub" : "timer16384");
      }
      if (value === 32768) {
        result.shouldSetReached32k = true;
        result.timerIdsToStamp.push("timer32768");
        result.showSubTimerContainer = true;
        result.hideTimerRows = [16, 32];
      }
      return result;
    }
  );
}

function buildTraversals(manager, vector) {
  if (!manager) return { x: [], y: [] };
  return resolveCoreMovePathNormalizedCallOrFallback(
    manager,
    "buildTraversals",
    [manager.width, manager.height, vector],
    function (runtimeValue) {
      var computed = runtimeValue || {};
      return {
        x: Array.isArray(computed.x) ? computed.x : [],
        y: Array.isArray(computed.y) ? computed.y : []
      };
    },
    function () {
      var axisX = [];
      for (var x = 0; x < manager.width; x++) {
        axisX.push(x);
      }
      var axisY = [];
      for (var y = 0; y < manager.height; y++) {
        axisY.push(y);
      }
      return {
        x: vector.x === 1 ? axisX.reverse() : axisX,
        y: vector.y === 1 ? axisY.reverse() : axisY
      };
    }
  );
}

function findFarthestPosition(manager, cell, vector) {
  if (!manager) return { farthest: cell, next: cell };
  var farthestPositionByCore = resolveCoreMovePathNormalizedCallOrFallback(
    manager,
    "findFarthestPosition",
    [
      cell,
      vector,
      manager.width,
      manager.height,
      manager.isBlockedCell.bind(manager),
      resolveGridCellAvailableFn(manager)
    ],
    function (runtimeValue) {
      var computed = runtimeValue || {};
      if (computed.farthest && computed.next) return computed;
      return null;
    },
    function () {
      return undefined;
    }
  );
  if (typeof farthestPositionByCore !== "undefined") {
    var resolvedByCore = farthestPositionByCore;
    if (resolvedByCore) return resolvedByCore;
  }
  var previous;
  // Progress towards the vector direction until an obstacle is found
  do {
    previous = cell;
    cell = { x: previous.x + vector.x, y: previous.y + vector.y };
  } while (
    manager.grid.withinBounds(cell) &&
    !manager.isBlockedCell(cell.x, cell.y) &&
    manager.grid.cellAvailable(cell)
  );
  return {
    farthest: previous,
    next: cell // Used to check if a merge is required
  };
}

function pickSpawnValue(manager) {
  if (!manager) return 2;
  return resolveCoreRulesNormalizedCallOrFallback(
    manager,
    "pickSpawnValue",
    [manager.spawnTable || [], Math.random],
    function (coreValue) {
      var value = Number(coreValue);
      return Number.isInteger(value) && value > 0 ? value : undefined;
    },
    function () {
      var table = manager.spawnTable || [];
      if (!table.length) return 2;
      var totalWeight = 0;
      for (var i = 0; i < table.length; i++) {
        totalWeight += table[i].weight;
      }
      if (totalWeight <= 0) return table[0].value;
      var pick = Math.random() * totalWeight;
      var running = 0;
      for (var j = 0; j < table.length; j++) {
        running += table[j].weight;
        if (pick <= running) return table[j].value;
      }
      return table[table.length - 1].value;
    }
  );
}

function planTileInteraction(manager, cell, positions, next, mergedValue) {
  if (!manager) return null;
  return resolveCoreMoveApplyNormalizedCallOrFallback(
    manager,
    "planTileInteraction",
    {
      cell: cell,
      farthest: positions && positions.farthest ? positions.farthest : { x: 0, y: 0 },
      next: positions && positions.next ? positions.next : { x: 0, y: 0 },
      hasNextTile: !!next,
      nextMergedFrom: !!(next && next.mergedFrom),
      mergedValue: mergedValue
    },
    function (coreValue) {
      var computed = coreValue || {};
      var mergeKind = computed.kind === "merge";
      var fallbackTarget = mergeKind ? positions.next : positions.farthest;
      var target = computed.target && Number.isInteger(computed.target.x) && Number.isInteger(computed.target.y)
        ? computed.target
        : fallbackTarget;
      return {
        kind: mergeKind ? "merge" : "move",
        target: target,
        moved: typeof computed.moved === "boolean"
          ? computed.moved
          : !positionsEqual(manager, cell, target)
      };
    },
    function () {
      var shouldMerge = !!next && !next.mergedFrom && Number.isInteger(mergedValue) && mergedValue > 0;
      var targetLegacy = shouldMerge ? positions.next : positions.farthest;
      return {
        kind: shouldMerge ? "merge" : "move",
        target: targetLegacy,
        moved: !positionsEqual(manager, cell, targetLegacy)
      };
    }
  );
}

function movesAvailable(manager) {
  if (!manager) return false;
  return resolveCoreMoveScanBooleanCallOrFallback(
    manager,
    "movesAvailable",
    [
      getAvailableCells(manager).length,
      tileMatchesAvailable(manager)
    ],
    function () {
      return getAvailableCells(manager).length > 0 || tileMatchesAvailable(manager);
    }
  );
}

function nextFibonacci(manager, value) {
  if (!manager) return null;
  return resolveCoreRulesNormalizedCallOrFallbackAllowNull(
    manager,
    "nextFibonacci",
    [value],
    function (coreValue) {
      if (coreValue === null) return null;
      var nextValue = Number(coreValue);
      return Number.isInteger(nextValue) && nextValue > 0 ? nextValue : undefined;
    },
    function () {
      if (value <= 0) return 1;
      if (value === 1) return 2;
      var a = 1;
      var b = 2;
      while (b < value) {
        var c = a + b;
        a = b;
        b = c;
      }
      if (b !== value) return null;
      return a + b;
    }
  );
}

function getVector(manager, direction) {
  if (!manager) return undefined;
  return resolveCoreMovePathNormalizedCallOrFallback(
    manager,
    "getVector",
    [direction],
    function (coreValue) {
      if (!manager.isNonArrayObject(coreValue)) return undefined;
      var x = Number(coreValue.x);
      var y = Number(coreValue.y);
      if (!Number.isInteger(x) || !Number.isInteger(y)) return undefined;
      return { x: x, y: y };
    },
    function () {
      return {
        0: { x: 0, y: -1 }, // up
        1: { x: 1, y: 0 },  // right
        2: { x: 0, y: 1 },  // down
        3: { x: -1, y: 0 }  // left
      }[direction];
    }
  );
}

function getMergedValue(manager, a, b) {
  if (!manager) return null;
  return resolveCoreRulesNormalizedCallOrFallbackAllowNull(
    manager,
    "getMergedValue",
    [
      a,
      b,
      manager.isFibonacciMode() ? "fibonacci" : "pow2",
      manager.maxTile
    ],
    function (coreValue) {
      if (coreValue === null) return null;
      var mergedValue = Number(coreValue);
      return Number.isInteger(mergedValue) && mergedValue > 0 ? mergedValue : undefined;
    },
    function () {
      if (!Number.isInteger(a) || !Number.isInteger(b) || a <= 0 || b <= 0) return null;
      if (!manager.isFibonacciMode()) {
        if (a !== b) return null;
        var mergedPow2 = a * 2;
        if (mergedPow2 > manager.maxTile) return null;
        return mergedPow2;
      }
      if (a === 1 && b === 1) {
        if (2 > manager.maxTile) return null;
        return 2;
      }
      var low = Math.min(a, b);
      var high = Math.max(a, b);
      var next = nextFibonacci(manager, low);
      if (next !== high) return null;
      var mergedFibonacci = low + high;
      if (mergedFibonacci > manager.maxTile) return null;
      return mergedFibonacci;
    }
  );
}

function positionsEqual(manager, first, second) {
  if (!manager) return false;
  return resolveCoreMovePathBooleanCallOrFallback(
    manager,
    "positionsEqual",
    [first, second],
    function () {
      return first.x === second.x && first.y === second.y;
    }
  );
}

function getAvailableCells(manager) {
  if (!manager) return [];
  var gridCellAvailable = resolveGridCellAvailableFn(manager);
  return resolveCoreGridScanNormalizedCallOrFallback(
    manager,
    "getAvailableCells",
    [
      manager.width,
      manager.height,
      manager.isBlockedCell.bind(manager),
      gridCellAvailable
    ],
    function (coreValue) {
      return Array.isArray(coreValue) ? coreValue : undefined;
    },
    function () {
      var out = [];
      for (var x = 0; x < manager.width; x++) {
        for (var y = 0; y < manager.height; y++) {
          if (manager.isBlockedCell(x, y)) continue;
          if (gridCellAvailable({ x: x, y: y })) out.push({ x: x, y: y });
        }
      }
      return out;
    }
  );
}

function tileMatchesAvailable(manager) {
  if (!manager) return false;
  return resolveCoreMoveScanBooleanCallOrFallback(
    manager,
    "tileMatchesAvailable",
    [
      manager.width,
      manager.height,
      manager.isBlockedCell.bind(manager),
      function (cell) {
        var tile = manager.grid.cellContent(cell);
        return tile ? tile.value : null;
      },
      function (a, b) {
        return getMergedValue(manager, a, b) !== null;
      }
    ],
    function () {
      for (var x = 0; x < manager.width; x++) {
        for (var y = 0; y < manager.height; y++) {
          if (manager.isBlockedCell(x, y)) continue;
          var tile = manager.grid.cellContent({ x: x, y: y });
          if (!tile) continue;
          for (var direction = 0; direction < 4; direction++) {
            var vector = getVector(manager, direction);
            var cell = { x: x + vector.x, y: y + vector.y };
            if (manager.isBlockedCell(cell.x, cell.y)) continue;
            var other = manager.grid.cellContent(cell);
            if (other && getMergedValue(manager, tile.value, other.value) !== null) {
              return true;
            }
          }
        }
      }
      return false;
    }
  );
}
