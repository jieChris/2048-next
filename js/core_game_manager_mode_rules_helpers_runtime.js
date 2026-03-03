function isModeRulesRecordObject(value) {
  return !!(value && typeof value === "object");
}
function isModeRulesNonArrayObject(value) {
  return isModeRulesRecordObject(value) && !Array.isArray(value);
}
function normalizeModeRulesRecordObject(value, fallback) {
  return isModeRulesRecordObject(value) ? value : fallback;
}
function normalizeSpecialRules(manager, rules) {
  if (!manager) return {};
  return resolveCorePayloadCallWith(manager, "callCoreModeRuntime", "normalizeSpecialRules", rules, undefined, function (currentManager, coreCallResult) {
    return currentManager.resolveNormalizedCoreValueOrFallback(coreCallResult, function (coreValue) {
      return currentManager.isNonArrayObject(coreValue) ? coreValue : undefined;
    }, function () {
      return isModeRulesNonArrayObject(rules) ? currentManager.clonePlain(rules) : {};
    });
  });
}
function resolveModeCatalogGetModeAccessor(manager) {
  if (!manager) return null;
  var modeCatalogGetMode = manager.resolveWindowNamespaceMethod("ModeCatalog", "getMode");
  if (!modeCatalogGetMode) return null;
  return function (requestedModeId) {
    return modeCatalogGetMode.method.call(modeCatalogGetMode.scope, requestedModeId);
  };
}
function createModeCatalogResolvePayload(modeKey, catalogGetMode) {
  return {
    modeId: modeKey,
    catalogGetMode: catalogGetMode,
    fallbackModeConfigs: GameManager.FALLBACK_MODE_CONFIGS
  };
}
function normalizeModeCatalogConfigFromCore(currentManager, coreValue) {
  if (coreValue === null) return null;
  return currentManager.isNonArrayObject(coreValue) ? coreValue : undefined;
}
function resolveModeCatalogConfigFallback(currentManager, modeKey, catalogGetMode) {
  if (catalogGetMode) {
    return catalogGetMode(modeKey);
  }
  if (GameManager.FALLBACK_MODE_CONFIGS[modeKey]) {
    return currentManager.clonePlain(GameManager.FALLBACK_MODE_CONFIGS[modeKey]);
  }
  return null;
}
function getModeConfigFromCatalog(manager, modeKey) {
  if (!manager) return null;
  var catalogGetMode = resolveModeCatalogGetModeAccessor(manager);
  return resolveCorePayloadCallWith(manager, "callCoreModeRuntime", "resolveModeCatalogConfig", createModeCatalogResolvePayload(modeKey, catalogGetMode), undefined, function (currentManager, coreCallResult) {
    return currentManager.resolveNormalizedCoreValueOrFallbackAllowNull(coreCallResult, function (coreValue) {
      return normalizeModeCatalogConfigFromCore(currentManager, coreValue);
    }, function () {
      return resolveModeCatalogConfigFallback(currentManager, modeKey, catalogGetMode);
    });
  });
}
function resolveSpawnCount(manager, value) {
  if (!manager) return 0;
  return resolveCoreArgsCallWith(
    manager,
    "callCoreRulesRuntime",
    "getSpawnCount",
    [manager.spawnValueCounts, value],
    0,
    function (currentManager, coreCallResult) {
      return currentManager.resolveCoreNumericCallOrFallback(coreCallResult, function () {
        if (!currentManager.spawnValueCounts) return 0;
        return currentManager.spawnValueCounts[String(value)] || 0;
      });
    }
  );
}
function normalizeTheoreticalMaxTileFromCore(coreValue) {
  if (coreValue === null) return null;
  var tileValue = Number(coreValue);
  return Number.isInteger(tileValue) && tileValue > 0 ? tileValue : undefined;
}
function resolveTheoreticalCellsCount(width, height) {
  var w = Number(width);
  var h = Number(height);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null;
  var cells = Math.floor(w) * Math.floor(h);
  return Number.isInteger(cells) && cells > 0 ? cells : null;
}
function resolveFibonacciTheoreticalMaxTile(cells) {
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
function resolveTheoreticalMaxTileFallback(width, height, ruleset) {
  var cells = resolveTheoreticalCellsCount(width, height);
  if (cells === null) return null;
  if (ruleset === "fibonacci") {
    return resolveFibonacciTheoreticalMaxTile(cells);
  }
  // Pow2 4x4 theoretical max: 131072.
  return Math.pow(2, cells + 1);
}
function resolveTheoreticalMaxTile(manager, width, height, ruleset) {
  if (!manager) return null;
  return resolveCoreArgsCallWith(manager, "callCoreRulesRuntime", "getTheoreticalMaxTile", [width, height, ruleset], undefined, function (currentManager, coreCallResult) {
    return currentManager.resolveNormalizedCoreValueOrFallbackAllowNull(coreCallResult, function (coreValue) {
      return normalizeTheoreticalMaxTileFromCore(coreValue);
    }, function () {
      return resolveTheoreticalMaxTileFallback(width, height, ruleset);
    });
  });
}
function createDefaultSpawnTableByRuleset(ruleset) {
  if (ruleset === "fibonacci") {
    return [{ value: 1, weight: 90 }, { value: 2, weight: 10 }];
  }
  return [{ value: 2, weight: 90 }, { value: 4, weight: 10 }];
}
function normalizeSpawnTableFallbackItems(spawnTable) {
  var normalizedFallbackItems = [];
  if (Array.isArray(spawnTable) && spawnTable.length > 0) {
    for (var i = 0; i < spawnTable.length; i++) {
      var item = spawnTable[i];
      if (!item || !Number.isInteger(item.value) || item.value <= 0) continue;
      if (!(Number.isFinite(item.weight) && item.weight > 0)) continue;
      normalizedFallbackItems.push({ value: item.value, weight: Number(item.weight) });
    }
  }
  return normalizedFallbackItems;
}
function resolveNormalizedSpawnTableFallback(spawnTable, ruleset) {
  var normalizedFallbackItems = normalizeSpawnTableFallbackItems(spawnTable);
  if (normalizedFallbackItems.length > 0) return normalizedFallbackItems;
  return createDefaultSpawnTableByRuleset(ruleset);
}

function createNormalizeSpawnTableResolveArgs(spawnTable, ruleset) {
  return [spawnTable, ruleset];
}

function normalizeSpawnTableFromCore(coreValue) {
  return Array.isArray(coreValue) ? coreValue : undefined;
}

function normalizeSpawnTableByCore(manager, spawnTable, ruleset) {
  return resolveCoreArgsCallWith(manager, "callCoreRulesRuntime", "normalizeSpawnTable", createNormalizeSpawnTableResolveArgs(spawnTable, ruleset), undefined, function (currentManager, coreCallResult) {
    return currentManager.resolveNormalizedCoreValueOrFallback(coreCallResult, function (coreValue) {
      return normalizeSpawnTableFromCore(coreValue);
    }, function () {
      return resolveNormalizedSpawnTableFallback(spawnTable, ruleset);
    });
  });
}

function normalizeSpawnTable(manager, spawnTable, ruleset) {
  if (!manager) return createDefaultSpawnTableByRuleset(ruleset);
  return normalizeSpawnTableByCore(manager, spawnTable, ruleset);
}
function createModeConfigFallbackClone(manager, modeKey, rawConfig) {
  if (!manager) return {};
  var fallbackSource = rawConfig
    ? manager.clonePlain(rawConfig)
    : manager.clonePlain(GameManager.DEFAULT_MODE_CONFIG);
  fallbackSource.key = fallbackSource.key || modeKey || GameManager.DEFAULT_MODE_KEY;
  return fallbackSource;
}
function applyModeConfigBoardAndRuleDefaults(manager, cfg) {
  if (!manager || !cfg) return;
  cfg.board_width = Number.isInteger(cfg.board_width) && cfg.board_width > 0 ? cfg.board_width : 4;
  cfg.board_height = Number.isInteger(cfg.board_height) && cfg.board_height > 0 ? cfg.board_height : cfg.board_width;
  cfg.ruleset = cfg.ruleset === "fibonacci" ? "fibonacci" : "pow2";
  cfg.special_rules = manager.normalizeSpecialRules(cfg.special_rules);
  cfg.undo_enabled = !!cfg.undo_enabled;
}
function applyModeConfigMaxTileDefaults(manager, cfg) {
  if (!manager || !cfg) return;
  var hasNumericMaxTile = Number.isInteger(cfg.max_tile) && cfg.max_tile > 0;
  var isCappedKey = typeof cfg.key === "string" && cfg.key.indexOf("capped") !== -1;
  var forceMaxTile = !!cfg.special_rules.enforce_max_tile;
  if (cfg.ruleset === "fibonacci") {
    // Fibonacci modes are uncapped by default; only explicit capped modes should enforce max_tile.
    cfg.max_tile = (hasNumericMaxTile && (isCappedKey || forceMaxTile)) ? cfg.max_tile : null;
    return;
  }
  if (!hasNumericMaxTile) {
    cfg.max_tile = resolveTheoreticalMaxTile(manager, cfg.board_width, cfg.board_height, cfg.ruleset);
  }
}
function normalizeModeConfigCustomSpawnFourRate(rawRate) {
  var customFourRate = Number(rawRate);
  if (!Number.isFinite(customFourRate)) {
    return null;
  }
  if (customFourRate < 0) customFourRate = 0;
  if (customFourRate > 100) customFourRate = 100;
  return Math.round(customFourRate * 100) / 100;
}
function buildStrictPow2SpawnTableByRate(customFourRate) {
  var twoRate = Math.round((100 - customFourRate) * 100) / 100;
  var strictTable = [];
  if (twoRate > 0) strictTable.push({ value: 2, weight: twoRate });
  if (customFourRate > 0) strictTable.push({ value: 4, weight: customFourRate });
  if (!strictTable.length) strictTable.push({ value: 2, weight: 100 });
  return strictTable;
}
function applyModeConfigSpawnTableDefaults(manager, cfg) {
  if (!manager || !cfg) return;
  var customFourRate = normalizeModeConfigCustomSpawnFourRate(cfg.special_rules.custom_spawn_four_rate);
  if (cfg.ruleset === "pow2" && customFourRate !== null) {
    cfg.spawn_table = buildStrictPow2SpawnTableByRate(customFourRate);
    cfg.special_rules.custom_spawn_four_rate = customFourRate;
    return;
  }
  cfg.spawn_table = manager.normalizeSpawnTable(cfg.spawn_table, cfg.ruleset);
}
function applyModeConfigPolicyDefaults(cfg) {
  if (!cfg) return;
  cfg.ranked_bucket = cfg.ranked_bucket || "none";
  cfg.mode_family = cfg.mode_family || (cfg.ruleset === "fibonacci" ? "fibonacci" : "pow2");
  cfg.rank_policy = cfg.rank_policy || (cfg.ranked_bucket !== "none" ? "ranked" : "unranked");
}
function createNormalizeModeConfigPayload(manager, modeKey, rawConfig) {
  return manager.createCoreModeDefaultsPayload({
    modeKey: modeKey,
    rawConfig: rawConfig,
    defaultModeConfig: GameManager.DEFAULT_MODE_CONFIG,
    normalizeSpawnTable: manager.normalizeSpawnTable.bind(manager),
    getTheoreticalMaxTile: function (width, height, ruleset) {
      return resolveTheoreticalMaxTile(manager, width, height, ruleset);
    },
    normalizeSpecialRules: manager.normalizeSpecialRules.bind(manager)
  });
}
function normalizeModeConfigFromCore(currentManager, coreValue) {
  return currentManager.isNonArrayObject(coreValue) ? coreValue : undefined;
}
function resolveNormalizeModeConfigFallback(currentManager, modeKey, rawConfig) {
  var cfg = createModeConfigFallbackClone(currentManager, modeKey, rawConfig);
  applyModeConfigBoardAndRuleDefaults(currentManager, cfg);
  applyModeConfigMaxTileDefaults(currentManager, cfg);
  applyModeConfigSpawnTableDefaults(currentManager, cfg);
  applyModeConfigPolicyDefaults(cfg);
  return cfg;
}
function normalizeModeConfig(manager, modeKey, rawConfig) {
  if (!manager) return null;
  return resolveCorePayloadCallWith(manager, "callCoreModeRuntime", "normalizeModeConfig", createNormalizeModeConfigPayload(manager, modeKey, rawConfig), undefined, function (currentManager, coreCallResult) {
    return currentManager.resolveNormalizedCoreValueOrFallback(coreCallResult, function (coreValue) {
      return normalizeModeConfigFromCore(currentManager, coreValue);
    }, function () {
      return resolveNormalizeModeConfigFallback(currentManager, modeKey, rawConfig);
    });
  });
}
function resolveModeIdFromCoreValue(coreValue) {
  var resolvedByCore = coreValue || {};
  return typeof resolvedByCore.resolvedModeId === "string" && resolvedByCore.resolvedModeId
    ? resolvedByCore.resolvedModeId
    : GameManager.DEFAULT_MODE_KEY;
}
function resolveModeConfigFromCoreValue(currentManager, coreValue) {
  var resolvedByCore = coreValue || {};
  var normalizedModeId = resolveModeIdFromCoreValue(coreValue);
  var rawConfig = resolvedByCore.modeConfig;
  if (isModeRulesNonArrayObject(rawConfig)) {
    return currentManager.normalizeModeConfig(normalizedModeId, rawConfig);
  }
  return currentManager.normalizeModeConfig(GameManager.DEFAULT_MODE_KEY, GameManager.DEFAULT_MODE_CONFIG);
}
function resolveModeConfigFromCatalogById(currentManager, modeId) {
  var byCatalogRaw = currentManager.getModeConfigFromCatalog(modeId);
  if (byCatalogRaw) return currentManager.normalizeModeConfig(modeId, byCatalogRaw);
  return null;
}
function resolveModeConfigFromCatalogFallback(currentManager, id) {
  var resolvedById = resolveModeConfigFromCatalogById(currentManager, id);
  if (resolvedById) return resolvedById;
  var mapped = GameManager.LEGACY_ALIAS_TO_MODE_KEY[id] || id;
  if (mapped && mapped !== id) {
    var resolvedByMapped = resolveModeConfigFromCatalogById(currentManager, mapped);
    if (resolvedByMapped) return resolvedByMapped;
  }
  return currentManager.normalizeModeConfig(GameManager.DEFAULT_MODE_KEY, GameManager.DEFAULT_MODE_CONFIG);
}

function createResolveModeConfigPayload(manager, id) {
  return manager.createCoreModeDefaultsPayload({
    modeId: id,
    getModeConfig: manager.getModeConfigFromCatalog.bind(manager),
    legacyAliasToModeKey: GameManager.LEGACY_ALIAS_TO_MODE_KEY
  });
}

function normalizeResolvedModeConfigFromCore(currentManager, coreValue) {
  return resolveModeConfigFromCoreValue(currentManager, coreValue);
}

function resolveModeConfigFallback(currentManager, id) {
  return resolveModeConfigFromCatalogFallback(currentManager, id);
}

function resolveModeConfig(manager, modeId) {
  if (!manager) return null;
  var id = modeId || GameManager.DEFAULT_MODE_KEY;
  return resolveCorePayloadCallWith(manager, "callCoreModeRuntime", "resolveModeConfigFromCatalog", createResolveModeConfigPayload(manager, id), undefined, function (currentManager, coreCallResult) {
    return currentManager.resolveNormalizedCoreValueOrFallback(coreCallResult, function (coreValue) {
      return normalizeResolvedModeConfigFromCore(currentManager, coreValue);
    }, function () {
      return resolveModeConfigFallback(currentManager, id);
    });
  });
}

function createLegacyModeResolvePayload(manager, modeKey) {
  return {
    modeKey: modeKey,
    fallbackModeKey: manager.modeKey,
    mode: manager.mode,
    legacyModeByKey: GameManager.LEGACY_MODE_BY_KEY
  };
}

function resolveLegacyModeFallback(manager, modeKey) {
  var key = modeKey || manager.modeKey || manager.mode;
  if (GameManager.LEGACY_MODE_BY_KEY[key]) return GameManager.LEGACY_MODE_BY_KEY[key];
  if (key && key.indexOf("capped") !== -1) return "capped";
  if (key && key.indexOf("practice") !== -1) return "practice";
  return "classic";
}

function getLegacyModeFromModeKey(manager, modeKey) {
  if (!manager) return "classic";
  return resolveCorePayloadCallWith(
    manager,
    "callCoreModeRuntime",
    "resolveLegacyModeFromModeKey",
    createLegacyModeResolvePayload(manager, modeKey),
    "",
    function (currentManager, coreCallResult) {
      return currentManager.resolveCoreStringCallOrFallback(coreCallResult, function () {
        return resolveLegacyModeFallback(currentManager, modeKey);
      });
    }
  );
}
function createTimerMilestoneResolveArgs(manager) {
  return [
    manager.isFibonacciMode() ? "fibonacci" : "pow2",
    GameManager.TIMER_SLOT_IDS
  ];
}
function normalizeTimerMilestoneValuesFromCore(coreValue) {
  return Array.isArray(coreValue) ? coreValue : undefined;
}
function resolveTimerMilestoneValuesFallback(currentManager) {
  if (currentManager.isFibonacciMode()) {
    // 13 slots mapped to Fibonacci milestones.
    return [13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584, 4181];
  }
  return GameManager.TIMER_SLOT_IDS.slice();
}
function getTimerMilestoneValues(manager) {
  if (!manager) return GameManager.TIMER_SLOT_IDS.slice();
  return resolveCoreArgsCallWith(manager, "callCoreRulesRuntime", "getTimerMilestoneValues", createTimerMilestoneResolveArgs(manager), undefined, function (currentManager, coreCallResult) {
    return currentManager.resolveNormalizedCoreValueOrFallback(coreCallResult, function (coreValue) {
      return normalizeTimerMilestoneValuesFromCore(coreValue);
    }, function () {
      return resolveTimerMilestoneValuesFallback(currentManager);
    });
  });
}
function applySetupModeConfig(manager, cfg) {
  if (!manager || !cfg) return;
  applySetupModeConfigBaseFields(manager, cfg);
  var handledByCore = applySpecialRulesStateFromCore(manager);
  if (!handledByCore) {
    applySpecialRulesStateFallback(manager);
  }
  syncScoreManagerModeKeyForSetup(manager, cfg.key);
  syncModeAttributesToDocumentBody(manager, cfg);
  syncModeConfigToWindowContext(manager);
}
function applySetupModeConfigBaseFields(manager, cfg) {
  if (!manager || !cfg) return;
  manager.modeConfig = cfg;
  manager.mode = cfg.key;
  manager.modeKey = cfg.key;
  manager.width = cfg.board_width;
  manager.height = cfg.board_height;
  manager.size = manager.width;
  manager.ruleset = cfg.ruleset;
  manager.maxTile = cfg.max_tile || Infinity;
  manager.spawnTable = manager.normalizeSpawnTable(cfg.spawn_table, cfg.ruleset);
  manager.specialRules = manager.normalizeSpecialRules(cfg.special_rules);
  manager.rankedBucket = cfg.ranked_bucket || "none";
  manager.modeFamily = cfg.mode_family || (cfg.ruleset === "fibonacci" ? "fibonacci" : "pow2");
  manager.rankPolicy = cfg.rank_policy || (manager.rankedBucket !== "none" ? "ranked" : "unranked");
}
function createSpecialRulesStateResolveArgs(manager) {
  return [manager.specialRules || {}, manager.width, manager.height, manager.clonePlain.bind(manager)];
}
function applySpecialRulesStateSnapshot(manager, stateValue) {
  if (!manager) return;
  var state = normalizeModeRulesRecordObject(stateValue, {});
  manager.blockedCellSet = isModeRulesRecordObject(state.blockedCellSet)
    ? state.blockedCellSet
    : {};
  manager.blockedCellsList = Array.isArray(state.blockedCellsList) ? state.blockedCellsList : [];
  manager.undoLimit = (Number.isInteger(state.undoLimit) && state.undoLimit >= 0)
    ? state.undoLimit
    : null;
  manager.comboMultiplier = (Number.isFinite(state.comboMultiplier) && state.comboMultiplier > 1)
    ? Number(state.comboMultiplier)
    : 1;
  manager.directionLockRules = isModeRulesRecordObject(state.directionLockRules)
    ? manager.clonePlain(state.directionLockRules)
    : null;
}
function applySpecialRulesStateFromCore(manager) {
  if (!manager) return false;
  return resolveCoreArgsCallWith(
    manager,
    "callCoreSpecialRulesRuntime",
    "computeSpecialRulesState",
    createSpecialRulesStateResolveArgs(manager),
    false,
    function (currentManager, coreCallResult) {
      return currentManager.tryHandleCoreRawValue(coreCallResult, function (coreValue) {
        applySpecialRulesStateSnapshot(currentManager, coreValue);
      });
    }
  );
}
function normalizeBlockedCellPoint(item, width, height) {
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
function applyBlockedCellsFromSpecialRulesFallback(manager, safeRules) {
  if (!manager) return;
  manager.blockedCellSet = {};
  manager.blockedCellsList = [];
  var source = Array.isArray(safeRules.blocked_cells) ? safeRules.blocked_cells : [];
  for (var i = 0; i < source.length; i++) {
    var point = normalizeBlockedCellPoint(source[i], manager.width, manager.height);
    if (!point) continue;
    manager.blockedCellSet[point.x + ":" + point.y] = true;
    manager.blockedCellsList.push(point);
  }
}
function applySpecialRulesStateFallback(manager) {
  if (!manager) return;
  var safeRules = normalizeModeRulesRecordObject(manager.specialRules || {}, {});
  applyBlockedCellsFromSpecialRulesFallback(manager, safeRules);
  manager.undoLimit = (Number.isInteger(safeRules.undo_limit) && safeRules.undo_limit >= 0)
    ? safeRules.undo_limit
    : null;
  manager.comboMultiplier = (Number.isFinite(safeRules.combo_multiplier) && safeRules.combo_multiplier > 1)
    ? Number(safeRules.combo_multiplier)
    : 1;
  manager.directionLockRules = isModeRulesRecordObject(safeRules.direction_lock)
    ? manager.clonePlain(safeRules.direction_lock)
    : null;
}
function syncScoreManagerModeKeyForSetup(manager, modeKey) {
  if (!manager || !manager.scoreManager || typeof manager.scoreManager.setModeKey !== "function") return;
  manager.scoreManager.setModeKey(modeKey);
}
function syncModeAttributesToDocumentBody(manager, cfg) {
  if (!manager || !cfg) return;
  var documentLike = resolveManagerDocumentLike(manager);
  if (documentLike && documentLike.body) {
    documentLike.body.setAttribute("data-mode-id", cfg.key);
    documentLike.body.setAttribute("data-ruleset", cfg.ruleset);
    documentLike.body.setAttribute("data-mode-family", manager.modeFamily);
    documentLike.body.setAttribute("data-rank-policy", manager.rankPolicy);
  }
}
function syncModeConfigToWindowContext(manager) {
  if (!manager) return;
  var windowLike = typeof manager.getWindowLike === "function"
    ? manager.getWindowLike()
    : (typeof window !== "undefined" ? window : null);
  if (windowLike) {
    windowLike.GAME_MODE_CONFIG = manager.clonePlain(manager.modeConfig);
  }
}
function isBlockedCell(manager, x, y) {
  if (!manager) return false;
  return !!(manager.blockedCellSet && manager.blockedCellSet[x + ":" + y]);
}
function isFibonacciMode(manager) {
  if (!manager) return false;
  return manager.ruleset === "fibonacci";
}
function createDefaultMergeEffectsResult() {
  return {
    shouldRecordCappedMilestone: false,
    shouldSetWon: false,
    shouldSetReached32k: false,
    timerIdsToStamp: [],
    showSubTimerContainer: false,
    hideTimerRows: []
  };
}
function applyCappedAndWinMergeEffects(result, value, cappedMode, hasCappedTarget, cappedTarget) {
  if (!result) return;
  if (cappedMode && hasCappedTarget && value === cappedTarget) {
    result.shouldRecordCappedMilestone = true;
  } else if (!cappedMode && value === 2048) {
    result.shouldSetWon = true;
  }
}
function applyTimerMilestoneMergeEffects(result, value, reached32k) {
  if (!result) return;
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
}
function resolveMergeEffectsFallback(currentManager, mergedValue, cappedState) {
  var value = Number(mergedValue);
  var cappedTarget = Number(cappedState.cappedTargetValue);
  var cappedMode = !!cappedState.isCappedMode;
  var hasCappedTarget = Number.isFinite(cappedTarget) && cappedTarget > 0;
  var reached32k = !!currentManager.reached32k;
  var result = createDefaultMergeEffectsResult();
  if (!Number.isInteger(value) || value <= 0) return result;
  applyCappedAndWinMergeEffects(result, value, cappedMode, hasCappedTarget, cappedTarget);
  applyTimerMilestoneMergeEffects(result, value, reached32k);
  return result;
}
function createMergeEffectsPayload(manager, mergedValue, cappedState) {
  return {
    mergedValue: mergedValue,
    isCappedMode: !!cappedState.isCappedMode,
    cappedTargetValue: cappedState.cappedTargetValue,
    reached32k: !!manager.reached32k
  };
}
function computeMergeEffects(manager, mergedValue) {
  if (!manager) return null;
  var cappedState = manager.resolveCappedModeState();
  return resolveCorePayloadCallWith(
    manager,
    "callCoreMergeEffectsRuntime",
    "computeMergeEffects",
    createMergeEffectsPayload(manager, mergedValue, cappedState),
    {},
    function (currentManager, coreCallResult) {
      return currentManager.resolveCoreObjectCallOrFallback(coreCallResult, function () {
        return resolveMergeEffectsFallback(currentManager, mergedValue, cappedState);
      });
    }
  );
}
function createBuildTraversalsResolveArgs(manager, vector) {
  return [manager.width, manager.height, vector];
}
function normalizeBuildTraversalsFromCore(runtimeValue) {
  var computed = runtimeValue || {};
  return {
    x: Array.isArray(computed.x) ? computed.x : [],
    y: Array.isArray(computed.y) ? computed.y : []
  };
}
function createTraversalAxis(length) {
  var axis = [];
  for (var index = 0; index < length; index++) {
    axis.push(index);
  }
  return axis;
}
function resolveBuildTraversalsFallback(currentManager, vector) {
  var axisX = createTraversalAxis(currentManager.width);
  var axisY = createTraversalAxis(currentManager.height);
  return {
    x: vector.x === 1 ? axisX.reverse() : axisX,
    y: vector.y === 1 ? axisY.reverse() : axisY
  };
}
function buildTraversals(manager, vector) {
  if (!manager) return { x: [], y: [] };
  return resolveCoreArgsCallWith(manager, "callCoreMovePathRuntime", "buildTraversals", createBuildTraversalsResolveArgs(manager, vector), undefined, function (currentManager, coreCallResult) {
    return currentManager.resolveNormalizedCoreValueOrFallback(coreCallResult, function (runtimeValue) {
      return normalizeBuildTraversalsFromCore(runtimeValue);
    }, function () {
      return resolveBuildTraversalsFallback(currentManager, vector);
    });
  });
}
function resolveGridCellAvailableForMovePath(manager) {
  return manager.grid && typeof manager.grid.cellAvailable === "function"
    ? manager.grid.cellAvailable.bind(manager.grid)
    : function () { return false; };
}
function createFindFarthestPositionCoreArgs(manager, cell, vector, gridCellAvailable) {
  return [
    cell,
    vector,
    manager.width,
    manager.height,
    manager.isBlockedCell.bind(manager),
    gridCellAvailable
  ];
}
function normalizeFindFarthestPositionByCore(currentManager, runtimeValue) {
  var computed = runtimeValue || {};
  if (computed.farthest && computed.next) return computed;
  return null;
}
function resolveFindFarthestPositionByCore(manager, cell, vector, gridCellAvailable) {
  if (!manager) return undefined;
  return resolveCoreArgsCallWith(manager, "callCoreMovePathRuntime", "findFarthestPosition", createFindFarthestPositionCoreArgs(manager, cell, vector, gridCellAvailable), undefined, function (currentManager, coreCallResult) {
    return currentManager.resolveNormalizedCoreValueOrFallback(coreCallResult, function (runtimeValue) {
      return normalizeFindFarthestPositionByCore(currentManager, runtimeValue);
    }, function () {
      return undefined;
    });
  });
}
function findFarthestPositionFallback(manager, cell, vector) {
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
function findFarthestPosition(manager, cell, vector) {
  if (!manager) return { farthest: cell, next: cell };
  var gridCellAvailable = resolveGridCellAvailableForMovePath(manager);
  var farthestPositionByCore = resolveFindFarthestPositionByCore(manager, cell, vector, gridCellAvailable);
  if (typeof farthestPositionByCore !== "undefined") {
    var resolvedByCore = farthestPositionByCore;
    if (resolvedByCore) return resolvedByCore;
  }
  return findFarthestPositionFallback(manager, cell, vector);
}
function createPickSpawnValueResolveArgs(manager) {
  return [manager.spawnTable || [], Math.random];
}
function normalizePickSpawnValueFromCore(coreValue) {
  var value = Number(coreValue);
  return Number.isInteger(value) && value > 0 ? value : undefined;
}
function resolveSpawnTableTotalWeight(table) {
  var totalWeight = 0;
  for (var i = 0; i < table.length; i++) {
    totalWeight += table[i].weight;
  }
  return totalWeight;
}
function resolveSpawnValueByWeight(table, totalWeight) {
  var pick = Math.random() * totalWeight;
  var running = 0;
  for (var index = 0; index < table.length; index++) {
    running += table[index].weight;
    if (pick <= running) return table[index].value;
  }
  return table[table.length - 1].value;
}
function resolvePickSpawnValueFallback(manager) {
  var table = manager.spawnTable || [];
  if (!table.length) return 2;
  var totalWeight = resolveSpawnTableTotalWeight(table);
  if (totalWeight <= 0) return table[0].value;
  return resolveSpawnValueByWeight(table, totalWeight);
}
function pickSpawnValue(manager) {
  if (!manager) return 2;
  return resolveCoreArgsCallWith(manager, "callCoreRulesRuntime", "pickSpawnValue", createPickSpawnValueResolveArgs(manager), undefined, function (currentManager, coreCallResult) {
    return currentManager.resolveNormalizedCoreValueOrFallback(coreCallResult, function (coreValue) {
      return normalizePickSpawnValueFromCore(coreValue);
    }, function () {
      return resolvePickSpawnValueFallback(currentManager);
    });
  });
}
function createTileInteractionPayload(cell, positions, next, mergedValue) {
  return {
    cell: cell,
    farthest: positions && positions.farthest ? positions.farthest : { x: 0, y: 0 },
    next: positions && positions.next ? positions.next : { x: 0, y: 0 },
    hasNextTile: !!next,
    nextMergedFrom: !!(next && next.mergedFrom),
    mergedValue: mergedValue
  };
}
function normalizeTileInteractionByCore(currentManager, computed, cell, positions) {
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
      : !positionsEqual(currentManager, cell, target)
  };
}
function resolveTileInteractionFallback(currentManager, cell, positions, next, mergedValue) {
  var shouldMerge = !!next && !next.mergedFrom && Number.isInteger(mergedValue) && mergedValue > 0;
  var targetLegacy = shouldMerge ? positions.next : positions.farthest;
  return {
    kind: shouldMerge ? "merge" : "move",
    target: targetLegacy,
    moved: !positionsEqual(currentManager, cell, targetLegacy)
  };
}
function planTileInteraction(manager, cell, positions, next, mergedValue) {
  if (!manager) return null;
  return resolveCorePayloadCallWith(manager, "callCoreMoveApplyRuntime", "planTileInteraction", createTileInteractionPayload(cell, positions, next, mergedValue), undefined, function (currentManager, coreCallResult) {
    return currentManager.resolveNormalizedCoreValueOrFallback(coreCallResult, function (coreValue) {
      var computed = coreValue || {};
      return normalizeTileInteractionByCore(currentManager, computed, cell, positions);
    }, function () {
      return resolveTileInteractionFallback(currentManager, cell, positions, next, mergedValue);
    });
  });
}
function movesAvailable(manager) {
  if (!manager) return false;
  return resolveCoreArgsCallWith(
    manager,
    "callCoreMoveScanRuntime",
    "movesAvailable",
    [
      getAvailableCells(manager).length,
      tileMatchesAvailable(manager)
    ],
    false,
    function (currentManager, coreCallResult) {
      return currentManager.resolveCoreBooleanCallOrFallback(coreCallResult, function () {
        return getAvailableCells(manager).length > 0 || tileMatchesAvailable(manager);
      });
    }
  );
}
function normalizeNextFibonacciFromCore(coreValue) {
  if (coreValue === null) return null;
  var nextValue = Number(coreValue);
  return Number.isInteger(nextValue) && nextValue > 0 ? nextValue : undefined;
}
function resolveNextFibonacciFallback(value) {
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
function nextFibonacci(manager, value) {
  if (!manager) return null;
  return resolveCoreArgsCallWith(manager, "callCoreRulesRuntime", "nextFibonacci", [value], undefined, function (currentManager, coreCallResult) {
    return currentManager.resolveNormalizedCoreValueOrFallbackAllowNull(coreCallResult, function (coreValue) {
      return normalizeNextFibonacciFromCore(coreValue);
    }, function () {
      return resolveNextFibonacciFallback(value);
    });
  });
}
function normalizeVectorFromCore(manager, coreValue) {
  if (!manager.isNonArrayObject(coreValue)) return undefined;
  var x = Number(coreValue.x);
  var y = Number(coreValue.y);
  if (!Number.isInteger(x) || !Number.isInteger(y)) return undefined;
  return { x: x, y: y };
}
function resolveVectorFallback(direction) {
  return {
    0: { x: 0, y: -1 }, // up
    1: { x: 1, y: 0 }, // right
    2: { x: 0, y: 1 }, // down
    3: { x: -1, y: 0 } // left
  }[direction];
}
function getVector(manager, direction) {
  if (!manager) return undefined;
  return resolveCoreArgsCallWith(manager, "callCoreMovePathRuntime", "getVector", [direction], undefined, function (currentManager, coreCallResult) {
    return currentManager.resolveNormalizedCoreValueOrFallback(coreCallResult, function (coreValue) {
      return normalizeVectorFromCore(currentManager, coreValue);
    }, function () {
      return resolveVectorFallback(direction);
    });
  });
}
function createMergedValueResolveArgs(manager, a, b) {
  return [
    a,
    b,
    manager.isFibonacciMode() ? "fibonacci" : "pow2",
    manager.maxTile
  ];
}
function normalizeMergedValueFromCore(coreValue) {
  if (coreValue === null) return null;
  var mergedValue = Number(coreValue);
  return Number.isInteger(mergedValue) && mergedValue > 0 ? mergedValue : undefined;
}
function resolvePow2MergedValueFallback(currentManager, a, b) {
  if (a !== b) return null;
  var mergedPow2 = a * 2;
  if (mergedPow2 > currentManager.maxTile) return null;
  return mergedPow2;
}
function resolveFibonacciMergedValueFallback(currentManager, a, b) {
  if (a === 1 && b === 1) {
    if (2 > currentManager.maxTile) return null;
    return 2;
  }
  var low = Math.min(a, b);
  var high = Math.max(a, b);
  var next = nextFibonacci(currentManager, low);
  if (next !== high) return null;
  var mergedFibonacci = low + high;
  if (mergedFibonacci > currentManager.maxTile) return null;
  return mergedFibonacci;
}
function resolveMergedValueFallback(currentManager, a, b) {
  if (!Number.isInteger(a) || !Number.isInteger(b) || a <= 0 || b <= 0) return null;
  if (!currentManager.isFibonacciMode()) {
    return resolvePow2MergedValueFallback(currentManager, a, b);
  }
  return resolveFibonacciMergedValueFallback(currentManager, a, b);
}
function getMergedValue(manager, a, b) {
  if (!manager) return null;
  return resolveCoreArgsCallWith(manager, "callCoreRulesRuntime", "getMergedValue", createMergedValueResolveArgs(manager, a, b), undefined, function (currentManager, coreCallResult) {
    return currentManager.resolveNormalizedCoreValueOrFallbackAllowNull(coreCallResult, function (coreValue) {
      return normalizeMergedValueFromCore(coreValue);
    }, function () {
      return resolveMergedValueFallback(currentManager, a, b);
    });
  });
}
function positionsEqual(manager, first, second) {
  if (!manager) return false;
  return resolveCoreArgsCallWith(
    manager,
    "callCoreMovePathRuntime",
    "positionsEqual",
    [first, second],
    false,
    function (currentManager, coreCallResult) {
      return currentManager.resolveCoreBooleanCallOrFallback(coreCallResult, function () {
        return first.x === second.x && first.y === second.y;
      });
    }
  );
}
function resolveGridCellAvailableAccessor(manager) {
  return manager.grid && typeof manager.grid.cellAvailable === "function"
    ? manager.grid.cellAvailable.bind(manager.grid)
    : function () { return false; };
}
function createGetAvailableCellsResolveArgs(manager, gridCellAvailable) {
  return [
    manager.width,
    manager.height,
    manager.isBlockedCell.bind(manager),
    gridCellAvailable
  ];
}
function normalizeAvailableCellsFromCore(coreValue) {
  return Array.isArray(coreValue) ? coreValue : undefined;
}
function resolveAvailableCellsFallback(manager, gridCellAvailable) {
  var out = [];
  for (var x = 0; x < manager.width; x++) {
    for (var y = 0; y < manager.height; y++) {
      if (manager.isBlockedCell(x, y)) continue;
      if (gridCellAvailable({ x: x, y: y })) out.push({ x: x, y: y });
    }
  }
  return out;
}
function resolveGridCellValue(cell, manager) {
  var tile = manager.grid.cellContent(cell);
  return tile ? tile.value : null;
}
function createTileMatchesAvailableResolveArgs(manager) {
  return [
    manager.width,
    manager.height,
    manager.isBlockedCell.bind(manager),
    function (cell) {
      return resolveGridCellValue(cell, manager);
    },
    function (a, b) {
      return getMergedValue(manager, a, b) !== null;
    }
  ];
}
function hasMergeableNeighbor(manager, x, y, tileValue) {
  for (var direction = 0; direction < 4; direction++) {
    var vector = getVector(manager, direction);
    var cell = { x: x + vector.x, y: y + vector.y };
    if (manager.isBlockedCell(cell.x, cell.y)) continue;
    var other = manager.grid.cellContent(cell);
    if (other && getMergedValue(manager, tileValue, other.value) !== null) {
      return true;
    }
  }
  return false;
}
function resolveTileMatchesAvailableFallback(manager) {
  for (var x = 0; x < manager.width; x++) {
    for (var y = 0; y < manager.height; y++) {
      if (manager.isBlockedCell(x, y)) continue;
      var tile = manager.grid.cellContent({ x: x, y: y });
      if (!tile) continue;
      if (hasMergeableNeighbor(manager, x, y, tile.value)) {
        return true;
      }
    }
  }
  return false;
}
function getAvailableCells(manager) {
  if (!manager) return [];
  var gridCellAvailable = resolveGridCellAvailableAccessor(manager);
  return resolveCoreArgsCallWith(manager, "callCoreGridScanRuntime", "getAvailableCells", createGetAvailableCellsResolveArgs(manager, gridCellAvailable), undefined, function (currentManager, coreCallResult) {
    return currentManager.resolveNormalizedCoreValueOrFallback(coreCallResult, function (coreValue) {
      return normalizeAvailableCellsFromCore(coreValue);
    }, function () {
      return resolveAvailableCellsFallback(currentManager, gridCellAvailable);
    });
  });
}
function tileMatchesAvailable(manager) {
  if (!manager) return false;
  return resolveCoreArgsCallWith(
    manager,
    "callCoreMoveScanRuntime",
    "tileMatchesAvailable",
    createTileMatchesAvailableResolveArgs(manager),
    false,
    function (currentManager, coreCallResult) {
      return currentManager.resolveCoreBooleanCallOrFallback(coreCallResult, function () {
        return resolveTileMatchesAvailableFallback(currentManager);
      });
    }
  );
}
