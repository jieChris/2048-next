(function () {
  var playHeaderRuntime = window.CorePlayHeaderRuntime;
  if (
    !playHeaderRuntime ||
    typeof playHeaderRuntime.compactPlayModeLabel !== "function" ||
    typeof playHeaderRuntime.resolvePlayRulesText !== "function" ||
    typeof playHeaderRuntime.buildPlayModeIntroText !== "function" ||
    typeof playHeaderRuntime.resolvePlayHeaderState !== "function"
  ) {
    throw new Error("CorePlayHeaderRuntime is required");
  }
  var playEntryRuntime = window.CorePlayEntryRuntime;
  if (
    !playEntryRuntime ||
    typeof playEntryRuntime.resolvePlayEntryPlan !== "function"
  ) {
    throw new Error("CorePlayEntryRuntime is required");
  }
  var customSpawnRuntime = window.CoreCustomSpawnRuntime;
  if (
    !customSpawnRuntime ||
    typeof customSpawnRuntime.isCustomSpawnModeKey !== "function" ||
    typeof customSpawnRuntime.sanitizeCustomFourRate !== "function" ||
    typeof customSpawnRuntime.formatRatePercent !== "function" ||
    typeof customSpawnRuntime.inferFourRateFromSpawnTable !== "function" ||
    typeof customSpawnRuntime.applyCustomFourRateToModeConfig !== "function"
  ) {
    throw new Error("CoreCustomSpawnRuntime is required");
  }
  var playCustomSpawnRuntime = window.CorePlayCustomSpawnRuntime;
  if (
    !playCustomSpawnRuntime ||
    typeof playCustomSpawnRuntime.resolvePlayCustomSpawnModeConfig !== "function"
  ) {
    throw new Error("CorePlayCustomSpawnRuntime is required");
  }
  var playCustomSpawnHostRuntime = window.CorePlayCustomSpawnHostRuntime;
  if (
    !playCustomSpawnHostRuntime ||
    typeof playCustomSpawnHostRuntime.resolvePlayCustomSpawnModeConfigFromContext !== "function"
  ) {
    throw new Error("CorePlayCustomSpawnHostRuntime is required");
  }
  var playChallengeIntroRuntime = window.CorePlayChallengeIntroRuntime;
  if (
    !playChallengeIntroRuntime ||
    typeof playChallengeIntroRuntime.resolvePlayChallengeIntroModel !== "function"
  ) {
    throw new Error("CorePlayChallengeIntroRuntime is required");
  }
  var playChallengeIntroUiRuntime = window.CorePlayChallengeIntroUiRuntime;
  if (
    !playChallengeIntroUiRuntime ||
    typeof playChallengeIntroUiRuntime.resolvePlayChallengeIntroUiState !== "function"
  ) {
    throw new Error("CorePlayChallengeIntroUiRuntime is required");
  }
  var playChallengeIntroActionRuntime = window.CorePlayChallengeIntroActionRuntime;
  if (
    !playChallengeIntroActionRuntime ||
    typeof playChallengeIntroActionRuntime.resolvePlayChallengeIntroActionState !== "function"
  ) {
    throw new Error("CorePlayChallengeIntroActionRuntime is required");
  }
  var playChallengeIntroHostRuntime = window.CorePlayChallengeIntroHostRuntime;
  if (
    !playChallengeIntroHostRuntime ||
    typeof playChallengeIntroHostRuntime.resolvePlayChallengeIntroFromContext !== "function"
  ) {
    throw new Error("CorePlayChallengeIntroHostRuntime is required");
  }
  var playChallengeContextRuntime = window.CorePlayChallengeContextRuntime;
  if (
    !playChallengeContextRuntime ||
    typeof playChallengeContextRuntime.resolvePlayChallengeContext !== "function"
  ) {
    throw new Error("CorePlayChallengeContextRuntime is required");
  }
  var playStartGuardRuntime = window.CorePlayStartGuardRuntime;
  if (
    !playStartGuardRuntime ||
    typeof playStartGuardRuntime.resolvePlayStartGuardState !== "function"
  ) {
    throw new Error("CorePlayStartGuardRuntime is required");
  }
  var playStartupPayloadRuntime = window.CorePlayStartupPayloadRuntime;
  if (
    !playStartupPayloadRuntime ||
    typeof playStartupPayloadRuntime.resolvePlayStartupPayload !== "function"
  ) {
    throw new Error("CorePlayStartupPayloadRuntime is required");
  }
  var storageRuntime = window.CoreStorageRuntime;
  if (
    !storageRuntime ||
    typeof storageRuntime.resolveStorageByName !== "function" ||
    typeof storageRuntime.safeReadStorageItem !== "function" ||
    typeof storageRuntime.safeSetStorageItem !== "function"
  ) {
    throw new Error("CoreStorageRuntime is required");
  }
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
    var title = document.getElementById("play-mode-title");
    var intro = document.getElementById("play-mode-intro");
    var body = document.body;
    var headerState = playHeaderRuntime.resolvePlayHeaderState(modeConfig);

    if (body) {
      body.setAttribute("data-mode-id", headerState.bodyModeId);
      body.setAttribute("data-ruleset", headerState.bodyRuleset);
    }

    if (title) {
      title.textContent = headerState.titleText;
      title.style.display = headerState.titleDisplay;
    }
    if (intro) {
      intro.textContent = headerState.introText;
      intro.style.display = headerState.introDisplay;
    }
    setupChallengeModeIntro(modeConfig);
  }

  var bootstrap = window.LegacyBootstrapRuntime;
  if (!bootstrap || typeof bootstrap.startGameOnAnimationFrame !== "function") {
    throw new Error("LegacyBootstrapRuntime.startGameOnAnimationFrame is required");
  }

  bootstrap.startGameOnAnimationFrame(function () {
    var entryPlan = playEntryRuntime.resolvePlayEntryPlan({
      searchLike: window.location.search,
      modeCatalog: window.ModeCatalog,
      defaultModeKey: DEFAULT_MODE_KEY,
      invalidModeRedirectUrl: "play.html?mode_key=standard_4x4_pow2_no_undo"
    });
    var modeKey = entryPlan.modeKey;
    var challengeId = entryPlan.challengeId;
    var modeConfig = entryPlan.modeConfig;

    var guardAfterEntry = playStartGuardRuntime.resolvePlayStartGuardState({
      entryModeConfig: modeConfig,
      resolvedModeConfig: modeConfig,
      invalidModeRedirectUrl: "play.html?mode_key=standard_4x4_pow2_no_undo",
      entryRedirectUrl: entryPlan.redirectUrl
    });
    if (guardAfterEntry.shouldAbort) {
      if (guardAfterEntry.shouldAlert) {
        alert(guardAfterEntry.alertMessage || "无效模式，已回退到标准模式");
      }
      window.location.href =
        guardAfterEntry.redirectUrl || "play.html?mode_key=standard_4x4_pow2_no_undo";
      return null;
    }

    modeConfig = resolveCustomSpawnModeConfig(modeKey, modeConfig);
    var guardAfterResolve = playStartGuardRuntime.resolvePlayStartGuardState({
      entryModeConfig: true,
      resolvedModeConfig: modeConfig
    });
    if (guardAfterResolve.shouldAbort) {
      window.location.href = guardAfterResolve.redirectUrl || "modes.html";
      return null;
    }

    window.GAME_MODE_CONFIG = modeConfig;
    window.GAME_CHALLENGE_CONTEXT = playChallengeContextRuntime.resolvePlayChallengeContext({
      challengeId: challengeId,
      modeConfig: modeConfig
    });
    setupHeader(modeConfig);
    var startupPayload = playStartupPayloadRuntime.resolvePlayStartupPayload({
      modeConfig: modeConfig,
      inputManagerCtor: KeyboardInputManager,
      defaultBoardWidth: 4
    });
    if (startupPayload) return startupPayload;
    return {
      modeKey: modeConfig.key,
      modeConfig: modeConfig,
      inputManagerCtor: KeyboardInputManager,
      defaultBoardWidth: 4
    };
  });
})();
