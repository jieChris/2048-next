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
  "ReplayLegacy",
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

function createStandardCoreRuntimeAccessorDef(coreRuntimeKey) {
  if (!(typeof coreRuntimeKey === "string" && coreRuntimeKey)) return null;
  return [
    "callCore" + coreRuntimeKey + "Runtime",
    "resolveCore" + coreRuntimeKey + "RuntimeMethod",
    "getCore" + coreRuntimeKey + "Runtime",
    "Core" + coreRuntimeKey + "Runtime"
  ];
}

function createGameManagerCoreRuntimeAccessorDefs() {
  var defs = [
    [
      "callCoreStorageRuntime",
      "resolveCoreStorageRuntimeMethod",
      "getCoreGameSettingsStorageRuntime",
      "CoreGameSettingsStorageRuntime"
    ]
  ];
  for (var index = 0; index < STANDARD_GAME_MANAGER_CORE_RUNTIME_KEYS.length; index++) {
    var def = createStandardCoreRuntimeAccessorDef(STANDARD_GAME_MANAGER_CORE_RUNTIME_KEYS[index]);
    if (!def) continue;
    defs.push(def);
  }
  return defs;
}

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

function forEachPrototypeBindingDef(bindings, binder) {
  if (!Array.isArray(bindings)) return;
  if (typeof binder !== "function") return;
  for (var index = 0; index < bindings.length; index++) {
    var bindingDef = bindings[index];
    if (!Array.isArray(bindingDef)) continue;
    binder(bindingDef[0], bindingDef[1]);
  }
}

function bindGameManagerPrototypeManagerForwardBatch(bindings) {
  forEachPrototypeBindingDef(bindings, bindGameManagerPrototypeManagerForward);
}

function bindGameManagerPrototypeForwardBatch(bindings) {
  forEachPrototypeBindingDef(bindings, bindGameManagerPrototypeForward);
}

function bindGameManagerPrototypeCappedStateFieldGetter(methodName, fieldName) {
  if (!(typeof methodName === "string" && methodName)) return;
  if (!(typeof fieldName === "string" && fieldName)) return;
  bindGameManagerPrototypeMethod(methodName, function () {
    return this.resolveCappedModeState()[fieldName];
  });
}

function bindGameManagerPrototypeElementByIdResolver(methodName, elementIdPrefix) {
  if (!(typeof methodName === "string" && methodName)) return;
  if (!(typeof elementIdPrefix === "string" && elementIdPrefix)) return;
  bindGameManagerPrototypeMethod(methodName, function (value) {
    return resolveManagerElementById(this, elementIdPrefix + String(value));
  });
}

function bindGameManagerPrototypeCappedStateFieldGetterBatch(defs) {
  forEachPrototypeBindingDef(defs, bindGameManagerPrototypeCappedStateFieldGetter);
}

function bindGameManagerPrototypeElementByIdResolverBatch(defs) {
  forEachPrototypeBindingDef(defs, bindGameManagerPrototypeElementByIdResolver);
}

function bindGameManagerPrototypeRuntime() {
  var managerForwardBindingsBeforeAccessorRegistration = [
    ["encodeReplay128", encodeReplay128],
    ["decodeReplay128", decodeReplay128],
    ["setBoardFromMatrix", setBoardFromMatrix],
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
  bindGameManagerPrototypeManagerForwardBatch(managerForwardBindingsBeforeAccessorRegistration);

  var plainForwardBindingsBeforeAccessorRegistration = [
    ["cloneBoardMatrix", cloneBoardMatrix],
    ["isCoreCallAvailable", isCoreCallAvailable],
    ["isNonArrayObject", isNonArrayObject],
    ["createCoreModeDefaultsPayload", createCoreModeDefaultsPayload]
  ];
  bindGameManagerPrototypeForwardBatch(plainForwardBindingsBeforeAccessorRegistration);

  var GAME_MANAGER_CORE_RUNTIME_ACCESSOR_DEFS = createGameManagerCoreRuntimeAccessorDefs();
  var managerForwardBindingsBeforeAccessorWiring = [
    ["resolveSavedGameStateStorageKey", resolveSavedGameStateStorageKey],
    ["resolveWindowMethod", resolveWindowMethod],
    ["callWindowMethod", callWindowMethod],
    ["resolveWindowNamespaceMethod", resolveWindowNamespaceMethod],
    ["callWindowNamespaceMethod", callWindowNamespaceMethod],
    ["requestAnimationFrame", requestAnimationFrameByManager],
    ["readLocalStorageJsonMap", readLocalStorageJsonMap],
    ["writeLocalStorageJsonPayload", writeLocalStorageJsonPayload],
    ["getSavedGameStateStorages", getSavedGameStateStorages],
    ["readSavedPayloadByKey", readSavedPayloadByKey],
    ["readWindowNameRaw", readWindowNameRaw],
    ["writeWindowNameSavedPayload", writeWindowNameSavedPayload],
    ["clearSavedGameState", clearSavedGameState],
    ["createSavedDynamicTimerRow", createSavedDynamicTimerRow],
    ["normalizeCappedRepeatLegendClasses", normalizeCappedRepeatLegendClasses],
    ["safeClonePlain", safeClonePlain],
    ["writeSavedGameStatePayload", writeSavedGameStatePayload],
    ["getModeConfigFromCatalog", getModeConfigFromCatalog]
  ];
  bindGameManagerPrototypeManagerForwardBatch(managerForwardBindingsBeforeAccessorWiring);

  var plainForwardBindingsBeforeAccessorWiring = [
    ["getWebStorageByName", getWebStorageByName],
    ["getWindowLike", getWindowLike],
    ["resolveWindowNameSavedPayloadMarker", resolveWindowNameSavedPayloadMarker],
    ["decodeWindowNameSavedMapPayload", decodeWindowNameSavedMapPayload],
    ["clonePlain", clonePlain]
  ];
  bindGameManagerPrototypeForwardBatch(plainForwardBindingsBeforeAccessorWiring);

  registerCoreRuntimeAccessors(GAME_MANAGER_CORE_RUNTIME_ACCESSOR_DEFS);

  var plainForwardBindingsAfterAccessorRegistration = [
    ["hasOwnKey", hasOwnKey],
    ["cloneResolvedCappedModeState", cloneResolvedCappedModeState],
    ["isProgressiveCapped64UnlockValue", isProgressiveCapped64UnlockValue],
    ["setStatsPanelFieldText", setStatsPanelFieldText]
  ];
  bindGameManagerPrototypeForwardBatch(plainForwardBindingsAfterAccessorRegistration);

  var managerForwardBindingsAfterAccessorRegistration = [
    ["readOptionValue", readOptionValue],
    ["resolveUndoPolicyStateForMode", resolveUndoPolicyStateForMode],
    ["resolveLegacyAdapterBridgeMethod", resolveLegacyAdapterBridgeMethod],
    ["getAdapterSessionParitySnapshot", getAdapterSessionParitySnapshot],
    ["publishAdapterMoveResult", publishAdapterMoveResult],
    ["getUndoStateFallbackValues", getUndoStateFallbackValues],
    ["normalizeUndoStackEntry", normalizeUndoStackEntry],
    ["createUndoTileSnapshot", createUndoTileSnapshot],
    ["normalizeSpawnTable", normalizeSpawnTable],
    ["normalizeModeConfig", normalizeModeConfig],
    ["resolveModeConfig", resolveModeConfig],
    ["normalizeSpecialRules", normalizeSpecialRules]
  ];
  bindGameManagerPrototypeManagerForwardBatch(managerForwardBindingsAfterAccessorRegistration);

  var managerForwardCappedModeBindings = [
    ["isBlockedCell", isBlockedCell],
    ["getLegacyModeFromModeKey", getLegacyModeFromModeKey],
    ["isFibonacciMode", isFibonacciMode],
    ["getTimerMilestoneValues", getTimerMilestoneValues],
    ["resolveCappedModeState", resolveCappedModeState],
    ["resolveProvidedCappedModeState", resolveProvidedCappedModeState]
  ];
  bindGameManagerPrototypeManagerForwardBatch(managerForwardCappedModeBindings);

  bindGameManagerPrototypeCappedStateFieldGetterBatch([
    ["isCappedMode", "isCappedMode"],
    ["getCappedTargetValue", "cappedTargetValue"],
    ["isProgressiveCapped64Mode", "isProgressiveCapped64Mode"]
  ]);

  bindGameManagerPrototypeElementByIdResolverBatch([
    ["getTimerRowEl", "timer-row-"]
  ]);

  var managerForwardCappedUiBindings = [
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
  ];
  bindGameManagerPrototypeManagerForwardBatch(managerForwardCappedUiBindings);

  var managerForwardUndoAndStatsBindings = [
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
  ];
  bindGameManagerPrototypeManagerForwardBatch(managerForwardUndoAndStatsBindings);

  bindGameManagerPrototypeMethod("updateStatsPanel", function (totalSteps, moveSteps, undoSteps) {
    var context = buildStatsPanelUpdateContext(this, totalSteps, moveSteps, undoSteps);
    applyStatsPanelUpdateContext(this, context);
  });

  var managerForwardGameplayBindings = [
    ["restart", restartGame],
    ["restartWithSeed", restartWithSeed],
    ["restartWithBoard", restartWithBoard],
    ["restartReplaySession", restartReplaySession],
    ["keepPlaying", keepPlaying],
    ["clearTransientTileVisualState", clearTransientTileVisualState],
    ["isGameTerminated", isGameTerminated],
    ["setup", setupGame],
    ["addRandomTile", addRandomTile],
    ["actuate", actuate],
    ["move", move],
    ["startTimer", startTimer],
    ["stopTimer", stopTimer],
    ["pretty", formatPrettyTime],
    ["insertCustomTile", insertCustomTile],
    ["getFinalBoardMatrix", getFinalBoardMatrix],
    ["getDurationMs", getDurationMs],
    ["serializeV3", serializeReplayV3],
    ["tryAutoSubmitOnGameOver", tryAutoSubmitOnGameOver],
    ["isSessionTerminated", isSessionTerminated],
    ["serialize", serializeReplay],
    ["applyReplayImportActions", applyReplayImportActions],
    ["import", importReplay],
    ["pause", pauseReplay],
    ["resume", resumeReplay],
    ["setSpeed", setReplaySpeed],
    ["seek", seekReplay],
    ["step", stepReplay]
  ];
  bindGameManagerPrototypeManagerForwardBatch(managerForwardGameplayBindings);

}
