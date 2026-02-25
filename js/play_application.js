(function () {
  var playRuntimeContractRuntime = window.CorePlayRuntimeContractRuntime;
  if (
    !playRuntimeContractRuntime ||
    typeof playRuntimeContractRuntime.resolvePlayRuntimeContracts !== "function"
  ) {
    throw new Error("CorePlayRuntimeContractRuntime is required");
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

  function resolveCustomSpawnModeConfig(modeKey, modeConfig) {
    return playCustomSpawnHostRuntime.resolvePlayCustomSpawnModeConfigFromContext({
      modeKey: modeKey,
      modeConfig: modeConfig,
      searchLike: window.location.search,
      pathname: window.location.pathname,
      hash: window.location.hash || "",
      storageKey: CUSTOM_FOUR_RATE_STORAGE_KEY,
      windowLike: window,
      storageRuntimeLike: storageRuntime,
      playCustomSpawnRuntimeLike: playCustomSpawnRuntime
    });
  }

  function setupChallengeModeIntro(modeConfig) {
    playChallengeIntroHostRuntime.resolvePlayChallengeIntroFromContext({
      modeConfig: modeConfig,
      featureEnabled: false,
      documentLike: document,
      resolveIntroModel: playChallengeIntroRuntime.resolvePlayChallengeIntroModel,
      resolveIntroUiState: playChallengeIntroUiRuntime.resolvePlayChallengeIntroUiState,
      resolveIntroActionState: playChallengeIntroActionRuntime.resolvePlayChallengeIntroActionState
    });
  }

  function setupHeader(modeConfig) {
    playHeaderHostRuntime.resolvePlayHeaderFromContext({
      modeConfig: modeConfig,
      documentLike: document,
      resolveHeaderState: playHeaderRuntime.resolvePlayHeaderState,
      applyChallengeModeIntro: setupChallengeModeIntro
    });
  }

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
      resolveModeConfig: resolveCustomSpawnModeConfig,
      resolveGuardState: playStartGuardRuntime.resolvePlayStartGuardState,
      resolveChallengeContext: playChallengeContextRuntime.resolvePlayChallengeContext,
      applyHeader: setupHeader,
      resolveStartupPayload: playStartupPayloadRuntime.resolvePlayStartupPayload
    });
  });
})();
