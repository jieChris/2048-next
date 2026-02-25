(function () {
  var playRuntimeContractRuntime = window.CorePlayRuntimeContractRuntime;
  if (
    !playRuntimeContractRuntime ||
    typeof playRuntimeContractRuntime.resolvePlayRuntimeContracts !== "function"
  ) {
    throw new Error("CorePlayRuntimeContractRuntime is required");
  }
  var playPageContextRuntime = window.CorePlayPageContextRuntime;
  if (
    !playPageContextRuntime ||
    typeof playPageContextRuntime.resolvePlayCustomSpawnModeConfigFromPageContext !== "function" ||
    typeof playPageContextRuntime.applyPlayHeaderFromPageContext !== "function"
  ) {
    throw new Error("CorePlayPageContextRuntime is required");
  }

  var runtimeContracts = playRuntimeContractRuntime.resolvePlayRuntimeContracts(window);
  var playHeaderRuntime = runtimeContracts.playHeaderRuntime;
  var playHeaderHostRuntime = runtimeContracts.playHeaderHostRuntime;
  var playEntryRuntime = runtimeContracts.playEntryRuntime;
  var playCustomSpawnRuntime = runtimeContracts.playCustomSpawnRuntime;
  var playCustomSpawnHostRuntime = runtimeContracts.playCustomSpawnHostRuntime;
  var playChallengeIntroRuntime = runtimeContracts.playChallengeIntroRuntime;
  var playChallengeIntroUiRuntime = runtimeContracts.playChallengeIntroUiRuntime;
  var playChallengeIntroActionRuntime = runtimeContracts.playChallengeIntroActionRuntime;
  var playChallengeIntroHostRuntime = runtimeContracts.playChallengeIntroHostRuntime;
  var playChallengeContextRuntime = runtimeContracts.playChallengeContextRuntime;
  var playStartGuardRuntime = runtimeContracts.playStartGuardRuntime;
  var playStartupPayloadRuntime = runtimeContracts.playStartupPayloadRuntime;
  var playStartupContextRuntime = runtimeContracts.playStartupContextRuntime;
  var playStartupHostRuntime = runtimeContracts.playStartupHostRuntime;
  var storageRuntime = runtimeContracts.storageRuntime;
  var bootstrap = runtimeContracts.bootstrapRuntime;
  var CUSTOM_FOUR_RATE_STORAGE_KEY =
    playCustomSpawnHostRuntime.PLAY_CUSTOM_FOUR_RATE_STORAGE_KEY || "custom_spawn_4x4_four_rate_v1";
  var DEFAULT_MODE_KEY = "standard_4x4_pow2_no_undo";

  bootstrap.startGameOnAnimationFrame(function () {
    return playStartupHostRuntime.resolvePlayStartupFromContext({
      windowLike: window,
      defaultModeKey: DEFAULT_MODE_KEY,
      invalidModeRedirectUrl: "play.html?mode_key=standard_4x4_pow2_no_undo",
      invalidModeMessage: "无效模式，已回退到标准模式",
      defaultBoardWidth: 4,
      inputManagerCtor: KeyboardInputManager,
      resolveEntryPlan: playEntryRuntime.resolvePlayEntryPlan,
      resolveStartupContext: playStartupContextRuntime.resolvePlayStartupContext,
      resolveModeConfig: function (modeKey, modeConfig) {
        return playPageContextRuntime.resolvePlayCustomSpawnModeConfigFromPageContext({
          modeKey: modeKey,
          modeConfig: modeConfig,
          storageKey: CUSTOM_FOUR_RATE_STORAGE_KEY,
          windowLike: window,
          storageRuntimeLike: storageRuntime,
          playCustomSpawnRuntimeLike: playCustomSpawnRuntime,
          playCustomSpawnHostRuntimeLike: playCustomSpawnHostRuntime
        });
      },
      resolveGuardState: playStartGuardRuntime.resolvePlayStartGuardState,
      resolveChallengeContext: playChallengeContextRuntime.resolvePlayChallengeContext,
      applyHeader: function (modeConfig) {
        return playPageContextRuntime.applyPlayHeaderFromPageContext({
          modeConfig: modeConfig,
          documentLike: document,
          playHeaderRuntimeLike: playHeaderRuntime,
          playHeaderHostRuntimeLike: playHeaderHostRuntime,
          playChallengeIntroRuntimeLike: playChallengeIntroRuntime,
          playChallengeIntroUiRuntimeLike: playChallengeIntroUiRuntime,
          playChallengeIntroActionRuntimeLike: playChallengeIntroActionRuntime,
          playChallengeIntroHostRuntimeLike: playChallengeIntroHostRuntime
        });
      },
      resolveStartupPayload: playStartupPayloadRuntime.resolvePlayStartupPayload
    });
  });
})();
