(function (global) {
  "use strict";

  if (!global) return;

  function hasFunction(target, key) {
    if (!target || typeof target !== "object") return false;
    return typeof target[key] === "function";
  }

  function requireRuntimeFunctions(target, functionNames, errorMessage) {
    if (!target || typeof target !== "object") {
      throw new Error(errorMessage);
    }
    for (var i = 0; i < functionNames.length; i += 1) {
      if (!hasFunction(target, functionNames[i])) {
        throw new Error(errorMessage);
      }
    }
    return target;
  }

  function resolvePlayRuntimeContracts(windowLike) {
    var source = windowLike || {};
    var playHeaderRuntime = requireRuntimeFunctions(
      source.CorePlayHeaderRuntime,
      [
        "compactPlayModeLabel",
        "resolvePlayRulesText",
        "buildPlayModeIntroText",
        "resolvePlayHeaderState"
      ],
      "CorePlayHeaderRuntime is required"
    );
    var playHeaderHostRuntime = requireRuntimeFunctions(
      source.CorePlayHeaderHostRuntime,
      ["resolvePlayHeaderFromContext"],
      "CorePlayHeaderHostRuntime is required"
    );
    var playPageContextRuntime = requireRuntimeFunctions(
      source.CorePlayPageContextRuntime,
      ["resolvePlayCustomSpawnModeConfigFromPageContext", "applyPlayHeaderFromPageContext"],
      "CorePlayPageContextRuntime is required"
    );
    var playEntryRuntime = requireRuntimeFunctions(
      source.CorePlayEntryRuntime,
      ["resolvePlayEntryPlan"],
      "CorePlayEntryRuntime is required"
    );
    var customSpawnRuntime = requireRuntimeFunctions(
      source.CoreCustomSpawnRuntime,
      [
        "isCustomSpawnModeKey",
        "sanitizeCustomFourRate",
        "formatRatePercent",
        "inferFourRateFromSpawnTable",
        "applyCustomFourRateToModeConfig"
      ],
      "CoreCustomSpawnRuntime is required"
    );
    var playCustomSpawnRuntime = requireRuntimeFunctions(
      source.CorePlayCustomSpawnRuntime,
      ["resolvePlayCustomSpawnModeConfig"],
      "CorePlayCustomSpawnRuntime is required"
    );
    var playCustomSpawnHostRuntime = requireRuntimeFunctions(
      source.CorePlayCustomSpawnHostRuntime,
      ["resolvePlayCustomSpawnModeConfigFromContext"],
      "CorePlayCustomSpawnHostRuntime is required"
    );
    var playChallengeIntroRuntime = requireRuntimeFunctions(
      source.CorePlayChallengeIntroRuntime,
      ["resolvePlayChallengeIntroModel"],
      "CorePlayChallengeIntroRuntime is required"
    );
    var playChallengeIntroUiRuntime = requireRuntimeFunctions(
      source.CorePlayChallengeIntroUiRuntime,
      ["resolvePlayChallengeIntroUiState"],
      "CorePlayChallengeIntroUiRuntime is required"
    );
    var playChallengeIntroActionRuntime = requireRuntimeFunctions(
      source.CorePlayChallengeIntroActionRuntime,
      ["resolvePlayChallengeIntroActionState"],
      "CorePlayChallengeIntroActionRuntime is required"
    );
    var playChallengeIntroHostRuntime = requireRuntimeFunctions(
      source.CorePlayChallengeIntroHostRuntime,
      ["resolvePlayChallengeIntroFromContext"],
      "CorePlayChallengeIntroHostRuntime is required"
    );
    var playChallengeContextRuntime = requireRuntimeFunctions(
      source.CorePlayChallengeContextRuntime,
      ["resolvePlayChallengeContext"],
      "CorePlayChallengeContextRuntime is required"
    );
    var playStartGuardRuntime = requireRuntimeFunctions(
      source.CorePlayStartGuardRuntime,
      ["resolvePlayStartGuardState"],
      "CorePlayStartGuardRuntime is required"
    );
    var playStartupPayloadRuntime = requireRuntimeFunctions(
      source.CorePlayStartupPayloadRuntime,
      ["resolvePlayStartupPayload"],
      "CorePlayStartupPayloadRuntime is required"
    );
    var playStartupContextRuntime = requireRuntimeFunctions(
      source.CorePlayStartupContextRuntime,
      ["resolvePlayStartupContext"],
      "CorePlayStartupContextRuntime is required"
    );
    var playStartupHostRuntime = requireRuntimeFunctions(
      source.CorePlayStartupHostRuntime,
      ["resolvePlayStartupFromContext"],
      "CorePlayStartupHostRuntime is required"
    );
    var storageRuntime = requireRuntimeFunctions(
      source.CoreStorageRuntime,
      ["resolveStorageByName", "safeReadStorageItem", "safeSetStorageItem"],
      "CoreStorageRuntime is required"
    );
    var bootstrapRuntime = requireRuntimeFunctions(
      source.CoreBootstrapRuntime || source.LegacyBootstrapRuntime,
      ["startGameOnAnimationFrame"],
      "CoreBootstrapRuntime.startGameOnAnimationFrame is required"
    );

    return {
      playHeaderRuntime: playHeaderRuntime,
      playHeaderHostRuntime: playHeaderHostRuntime,
      playPageContextRuntime: playPageContextRuntime,
      playEntryRuntime: playEntryRuntime,
      customSpawnRuntime: customSpawnRuntime,
      playCustomSpawnRuntime: playCustomSpawnRuntime,
      playCustomSpawnHostRuntime: playCustomSpawnHostRuntime,
      playChallengeIntroRuntime: playChallengeIntroRuntime,
      playChallengeIntroUiRuntime: playChallengeIntroUiRuntime,
      playChallengeIntroActionRuntime: playChallengeIntroActionRuntime,
      playChallengeIntroHostRuntime: playChallengeIntroHostRuntime,
      playChallengeContextRuntime: playChallengeContextRuntime,
      playStartGuardRuntime: playStartGuardRuntime,
      playStartupPayloadRuntime: playStartupPayloadRuntime,
      playStartupContextRuntime: playStartupContextRuntime,
      playStartupHostRuntime: playStartupHostRuntime,
      storageRuntime: storageRuntime,
      bootstrapRuntime: bootstrapRuntime
    };
  }

  global.CorePlayRuntimeContractRuntime = global.CorePlayRuntimeContractRuntime || {};
  global.CorePlayRuntimeContractRuntime.resolvePlayRuntimeContracts = resolvePlayRuntimeContracts;
})(typeof window !== "undefined" ? window : undefined);
