var STANDARD_GAME_MANAGER_CORE_RUNTIME_KEYS = [
  "Mode",
  "Rules",
  "ReplayCodec",
  "ReplayV4Actions",
  "ReplayImport",
  "ReplayExecution",
  "ReplayDispatch",
  "ReplayLifecycle",
  "ReplayTimer",
  "ReplayFlow",
  "ReplayControl",
  "ReplayLoop",
  "MoveApply",
  "PostMoveRecord",
  "PostUndoRecord",
  "UndoRestore",
  "UndoSnapshot",
  "UndoStackEntry",
  "UndoTileSnapshot",
  "UndoTileRestore",
  "UndoRestorePayload",
  "MergeEffects",
  "SpecialRules",
  "GridScan",
  "DirectionLock",
  "Scoring",
  "PostMove",
  "PrettyTime",
  "MovePath",
  "MoveScan",
  "TimerInterval"
];

function bindGameManagerPrototypeMethod(methodName, bindingFactory) {
  if (!(typeof methodName === "string" && methodName)) return;
  if (typeof bindingFactory !== "function") return;
  GameManager.prototype[methodName] = bindingFactory;
}

function bindGameManagerPrototypeManagerForward(methodName, targetFunction) {
  if (typeof targetFunction !== "function") return;
  bindGameManagerPrototypeMethod(methodName, function () {
    var args = [this];
    for (var index = 0; index < arguments.length; index++) {
      args.push(arguments[index]);
    }
    return targetFunction.apply(null, args);
  });
}

function bindGameManagerPrototypeForward(methodName, targetFunction) {
  if (typeof targetFunction !== "function") return;
  bindGameManagerPrototypeMethod(methodName, function () {
    return targetFunction.apply(null, arguments);
  });
}

function bindGameManagerPrototypeManagerForwardBatch(bindings) {
  if (!Array.isArray(bindings)) return;
  for (var index = 0; index < bindings.length; index++) {
    var bindingDef = bindings[index];
    if (!Array.isArray(bindingDef)) continue;
    bindGameManagerPrototypeManagerForward(bindingDef[0], bindingDef[1]);
  }
}

function bindGameManagerPrototypeForwardBatch(bindings) {
  if (!Array.isArray(bindings)) return;
  for (var index = 0; index < bindings.length; index++) {
    var bindingDef = bindings[index];
    if (!Array.isArray(bindingDef)) continue;
    bindGameManagerPrototypeForward(bindingDef[0], bindingDef[1]);
  }
}

function createPreAccessorManagerForwardBindings() {
  return [
    ["encodeReplay128", encodeReplay128],
    ["decodeReplay128", decodeReplay128],
    ["resolveCoreObjectCallOrFallback", resolveCoreObjectCallOrFallback],
    ["resolveCoreBooleanCallOrFallback", resolveCoreBooleanCallOrFallback],
    ["resolveCoreNumericCallOrFallback", resolveCoreNumericCallOrFallback],
    ["resolveCoreStringCallOrFallback", resolveCoreStringCallOrFallback],
    ["resolveNormalizedCoreValueOrUndefined", resolveNormalizedCoreValueOrUndefined],
    ["resolveNormalizedCoreValueOrFallback", resolveNormalizedCoreValueOrFallback],
    ["resolveNormalizedCoreValueOrFallbackAllowNull", resolveNormalizedCoreValueOrFallbackAllowNull],
    ["resolveCoreRawCallValueOrUndefined", resolveCoreRawCallValueOrUndefined],
    ["tryHandleCoreRawValue", tryHandleCoreRawValue],
    ["createCoreModeContextPayload", createCoreModeContextPayload]
  ];
}

function createPreAccessorPlainForwardBindings() {
  return [
    ["isCoreCallAvailable", isCoreCallAvailable],
    ["isNonArrayObject", isNonArrayObject],
    ["createCoreModeDefaultsPayload", createCoreModeDefaultsPayload]
  ];
}

function bindRuntimeForwardsBeforeAccessorRegistration() {
  bindGameManagerPrototypeManagerForwardBatch(createPreAccessorManagerForwardBindings());
  bindGameManagerPrototypeForwardBatch(createPreAccessorPlainForwardBindings());
}

function createGameManagerCoreRuntimeAccessorDefs() {
  var accessorDefs = [
    [
      "callCoreStorageRuntime",
      "resolveCoreStorageRuntimeMethod",
      "getCoreGameSettingsStorageRuntime",
      "CoreGameSettingsStorageRuntime"
    ]
  ];
  for (var coreRuntimeIndex = 0; coreRuntimeIndex < STANDARD_GAME_MANAGER_CORE_RUNTIME_KEYS.length; coreRuntimeIndex++) {
    var coreRuntimeKey = STANDARD_GAME_MANAGER_CORE_RUNTIME_KEYS[coreRuntimeIndex];
    if (!(typeof coreRuntimeKey === "string" && coreRuntimeKey)) continue;
    accessorDefs.push(["callCore" + coreRuntimeKey + "Runtime", "resolveCore" + coreRuntimeKey + "RuntimeMethod", "getCore" + coreRuntimeKey + "Runtime", "Core" + coreRuntimeKey + "Runtime"]);
  }
  return accessorDefs;
}

function bindRuntimeForwardsBeforeAccessorWiring() {
  bindGameManagerPrototypeManagerForwardBatch([
    ["resolveWindowMethod", resolveWindowMethod],
    ["callWindowMethod", callWindowMethod],
    ["resolveWindowNamespaceMethod", resolveWindowNamespaceMethod],
    ["callWindowNamespaceMethod", callWindowNamespaceMethod],
    ["requestAnimationFrame", requestAnimationFrameByManager],
    ["readLocalStorageJsonMap", readLocalStorageJsonMap],
    ["writeLocalStorageJsonPayload", writeLocalStorageJsonPayload],
    ["clearSavedGameState", clearSavedGameState],
    ["safeClonePlain", safeClonePlain],
    ["getModeConfigFromCatalog", getModeConfigFromCatalog]
  ]);
  bindGameManagerPrototypeForwardBatch([["getWebStorageByName", getWebStorageByName], ["getWindowLike", getWindowLike], ["clonePlain", clonePlain]]);
}

function bindRuntimeForwardsAfterAccessorRegistration() {
  bindGameManagerPrototypeForwardBatch(createPostAccessorPlainForwardBindings());
  bindGameManagerPrototypeManagerForwardBatch(createPostAccessorManagerForwardBindings());
}

function createPostAccessorPlainForwardBindings() {
  return [
    ["hasOwnKey", hasOwnKey],
    ["cloneResolvedCappedModeState", cloneResolvedCappedModeState],
    ["isProgressiveCapped64UnlockValue", isProgressiveCapped64UnlockValue],
    ["setStatsPanelFieldText", setStatsPanelFieldText]
  ];
}

function createPostAccessorManagerForwardBindings() {
  return [
    ["readOptionValue", readOptionValue],
    ["resolveUndoPolicyStateForMode", resolveUndoPolicyStateForMode],
    ["getUndoStateFallbackValues", getUndoStateFallbackValues],
    ["normalizeUndoStackEntry", normalizeUndoStackEntry],
    ["createUndoTileSnapshot", createUndoTileSnapshot],
    ["normalizeSpawnTable", normalizeSpawnTable],
    ["normalizeModeConfig", normalizeModeConfig],
    ["resolveModeConfig", resolveModeConfig],
    ["normalizeSpecialRules", normalizeSpecialRules],
    ["getActiveMoveDirections", getActiveMoveDirections],
    ["isDirectionAllowed", isDirectionAllowed],
    ["isStoneValue", isStoneValue],
    ["useItem", useItem],
    ["updateItemModeHud", updateItemModeHud],
    ["updateMoveTimeoutHud", updateMoveTimeoutHud]
  ];
}

function createCappedModeManagerForwardBindings() {
  return [
    ["isBlockedCell", isBlockedCell],
    ["isFibonacciMode", isFibonacciMode],
    ["getTimerMilestoneValues", getTimerMilestoneValues],
    ["resolveCappedModeState", resolveCappedModeState],
    ["resolveProvidedCappedModeState", resolveProvidedCappedModeState]
  ];
}

function bindCappedModeBindings() {
  bindGameManagerPrototypeManagerForwardBatch(createCappedModeManagerForwardBindings());

  bindGameManagerPrototypeMethod("isCappedMode", function () {
    return this.resolveCappedModeState().isCappedMode;
  });
  bindGameManagerPrototypeMethod("getCappedTargetValue", function () {
    return this.resolveCappedModeState().cappedTargetValue;
  });
  bindGameManagerPrototypeMethod("isProgressiveCapped64Mode", function () {
    return this.resolveCappedModeState().isProgressiveCapped64Mode;
  });
  bindGameManagerPrototypeMethod("getTimerRowEl", function (value) {
    return resolveManagerElementById(this, "timer-row-" + String(value));
  });
}

function bindCappedUiBindings() {
  bindGameManagerPrototypeManagerForwardBatch([
    ["setTimerRowVisibleState", setTimerRowVisibleState],
    ["setCapped64RowVisible", setCapped64RowVisible],
    ["resolveProgressiveCapped64UnlockedState", resolveProgressiveCapped64UnlockedState],
    ["resetProgressiveCapped64Rows", resetProgressiveCapped64Rows],
    ["resolveCappedTargetValueOrNull", resolveCappedTargetValueOrNull],
    ["getCappedTimerLegendClass", getCappedTimerLegendClass],
    ["getCappedTimerFontSize", getCappedTimerFontSize],
    ["getCappedPlaceholderRowValues", getCappedPlaceholderRowValues],
    ["getCappedOverflowContainer", getCappedOverflowContainer],
    ["openStatsPanel", openStatsPanel],
    ["closeStatsPanel", closeStatsPanel],
    ["getTimerModuleViewMode", getTimerModuleViewMode],
    ["applyTimerModuleView", applyTimerModuleView],
    ["setTimerModuleViewMode", setTimerModuleViewMode]
  ]);
}

function bindUndoAndStatsBindings() {
  bindGameManagerPrototypeManagerForwardBatch([
    ["readUndoPolicyFieldForMode", readUndoPolicyFieldForMode],
    ["getForcedUndoSettingForMode", getForcedUndoSettingForMode],
    ["isUndoAllowedByMode", isUndoAllowedByMode],
    ["isUndoSettingFixedForMode", isUndoSettingFixedForMode],
    ["resolveUndoPolicyStateForCurrentSessionMode", resolveUndoPolicyStateForCurrentSessionMode],
    ["canToggleUndoSetting", canToggleUndoSetting],
    ["notifyUndoSettingsStateChanged", notifyUndoSettingsStateChanged],
    ["loadUndoSettingForMode", loadUndoSettingForMode],
    ["isUndoInteractionEnabled", isUndoInteractionEnabled],
    ["updateUndoUiState", updateUndoUiState],
    ["getSpawnStatPair", getSpawnStatPair],
    ["getActualSecondaryRate", getActualSecondaryRate],
    ["getActualFourRate", getActualFourRate],
    ["computeStepStats", computeStepStats]
  ]);
}

function resolveStatsPanelStepValues(manager, totalSteps, moveSteps, undoSteps) {
  var fallback = manager.computeStepStats();
  return {
    totalSteps: typeof totalSteps === "undefined" ? fallback.totalSteps : totalSteps,
    moveSteps: typeof moveSteps === "undefined" ? fallback.moveSteps : moveSteps,
    undoSteps: typeof undoSteps === "undefined" ? fallback.undoSteps : undoSteps
  };
}

function applyStatsPanelSpawnLabels(manager, pair) {
  var twoLabel = resolveManagerElementById(manager, "stats-panel-two-label");
  if (twoLabel) twoLabel.textContent = "出" + pair.primary + "数量";
  var fourLabel = resolveManagerElementById(manager, "stats-panel-four-label");
  if (fourLabel) fourLabel.textContent = "出" + pair.secondary + "数量";
  var rateLabel = resolveManagerElementById(manager, "stats-panel-four-rate-label");
  if (rateLabel) rateLabel.textContent = "实际出" + pair.secondary + "率";
}

function applyStatsPanelStepAndSpawnValues(manager, stepValues, pair) {
  manager.setStatsPanelFieldText("stats-panel-total", stepValues.totalSteps);
  manager.setStatsPanelFieldText("stats-panel-moves", stepValues.moveSteps);
  manager.setStatsPanelFieldText("stats-panel-undo", stepValues.undoSteps);
  manager.setStatsPanelFieldText("stats-panel-two", resolveSpawnCount(manager, pair.primary));
  manager.setStatsPanelFieldText("stats-panel-four", resolveSpawnCount(manager, pair.secondary));
}

function applyStatsPanelRateValue(manager) {
  var rateEl = resolveManagerElementById(manager, "stats-panel-four-rate");
  if (rateEl) rateEl.textContent = manager.getActualSecondaryRate();
}

function bindUpdateStatsPanelBinding() {
  bindGameManagerPrototypeMethod("updateStatsPanel", function (totalSteps, moveSteps, undoSteps) {
    if (!this) return;
    var stepValues = resolveStatsPanelStepValues(this, totalSteps, moveSteps, undoSteps);
    var pair = this.getSpawnStatPair();
    applyStatsPanelSpawnLabels(this, pair);
    applyStatsPanelStepAndSpawnValues(this, stepValues, pair);
    applyStatsPanelRateValue(this);
  });
}

var GAMEPLAY_LIFECYCLE_BINDINGS = [["restart", restartGame], ["restartWithSeed", restartWithSeed], ["restartWithBoard", restartWithBoard], ["keepPlaying", keepPlaying], ["clearTransientTileVisualState", clearTransientTileVisualState], ["isGameTerminated", isGameTerminated], ["setup", setupGame], ["addRandomTile", addRandomTile], ["actuate", actuate], ["move", move], ["startTimer", startTimer], ["stopTimer", stopTimer], ["pretty", formatPrettyTime], ["insertCustomTile", insertCustomTile], ["getFinalBoardMatrix", getFinalBoardMatrix], ["getDurationMs", getDurationMs]];

var GAMEPLAY_REPLAY_BINDINGS = [["serializeV3", serializeReplayV3], ["serializeV9Verse", serializeReplayAsV9Verse], ["exportV9VerseBlob", exportReplayAsV9VerseBlob], ["serializeV9RplBase64", serializeReplayAsV9RplBase64], ["tryAutoSubmitOnGameOver", tryAutoSubmitOnGameOver], ["isSessionTerminated", isSessionTerminated], ["serialize", serializeReplay], ["applyReplayImportActions", applyReplayImportActions], ["import", importReplay], ["importV9RplBuffer", importV9RplBuffer], ["pause", pauseReplay], ["resume", resumeReplay], ["setSpeed", setReplaySpeed], ["seek", seekReplay], ["step", stepReplay]];

function bindGameplayBindings() {
  var managerForwardBindings = GAMEPLAY_LIFECYCLE_BINDINGS
    .slice()
    .concat(GAMEPLAY_REPLAY_BINDINGS.slice());
  bindGameManagerPrototypeManagerForwardBatch(managerForwardBindings);
}

function bindGameManagerPrototypeRuntime() {
  bindRuntimeForwardsBeforeAccessorRegistration();
  bindRuntimeForwardsBeforeAccessorWiring();
  var GAME_MANAGER_CORE_RUNTIME_ACCESSOR_DEFS = createGameManagerCoreRuntimeAccessorDefs();
  registerCoreRuntimeAccessors(GAME_MANAGER_CORE_RUNTIME_ACCESSOR_DEFS);
  bindRuntimeForwardsAfterAccessorRegistration();
  bindCappedModeBindings();
  bindCappedUiBindings();
  bindUndoAndStatsBindings();
  bindUpdateStatsPanelBinding();
  bindGameplayBindings();
}
