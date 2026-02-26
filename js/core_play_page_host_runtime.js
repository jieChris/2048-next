(function (global) {
  "use strict";

  if (!global) return;

  function isRecord(value) {
    return !!value && typeof value === "object";
  }

  function toRecord(value) {
    return isRecord(value) ? value : {};
  }

  function asFunction(value) {
    return typeof value === "function" ? value : null;
  }

  function hasOwnKeys(value) {
    return Object.keys(value).length > 0;
  }

  function resolvePlayPageDefaults(input) {
    var source = toRecord(input);
    return {
      defaultModeKey:
        typeof source.defaultModeKey === "string"
          ? source.defaultModeKey
          : "standard_4x4_pow2_no_undo",
      invalidModeRedirectUrl:
        typeof source.invalidModeRedirectUrl === "string"
          ? source.invalidModeRedirectUrl
          : "play.html?mode_key=standard_4x4_pow2_no_undo",
      invalidModeMessage:
        typeof source.invalidModeMessage === "string"
          ? source.invalidModeMessage
          : "无效模式，已回退到标准模式",
      defaultBoardWidth: typeof source.defaultBoardWidth === "number" ? source.defaultBoardWidth : 4,
      customFourRateStorageKey:
        typeof source.customFourRateStorageKey === "string"
          ? source.customFourRateStorageKey
          : "custom_spawn_4x4_four_rate_v1"
    };
  }

  function resolvePlayPageRuntimes(input) {
    var source = toRecord(input);
    var windowLike = toRecord(source.windowLike);
    var playRuntimeContractRuntime = toRecord(
      source.playRuntimeContractRuntime || windowLike.CorePlayRuntimeContractRuntime
    );
    var resolvePlayRuntimeContracts = asFunction(
      playRuntimeContractRuntime.resolvePlayRuntimeContracts
    );
    if (!resolvePlayRuntimeContracts) {
      throw new Error("CorePlayRuntimeContractRuntime is required");
    }

    var result = resolvePlayRuntimeContracts(windowLike);
    return isRecord(result) ? result : {};
  }

  function applyPlayPageBootstrap(input) {
    var source = toRecord(input);
    var windowLike = toRecord(source.windowLike);
    var sourceDefaults = toRecord(source.playPageDefaults);
    var playPageDefaults = hasOwnKeys(sourceDefaults) ? sourceDefaults : resolvePlayPageDefaults();
    var sourcePlayRuntimes = toRecord(source.playRuntimes);
    var playRuntimes = hasOwnKeys(sourcePlayRuntimes)
      ? sourcePlayRuntimes
      : resolvePlayPageRuntimes({
          windowLike: windowLike,
          playRuntimeContractRuntime: source.playRuntimeContractRuntime
        });

    var bootstrapRuntime = toRecord(playRuntimes.bootstrapRuntime);
    var startGameOnAnimationFrame = asFunction(bootstrapRuntime.startGameOnAnimationFrame);
    if (!startGameOnAnimationFrame) {
      return {
        started: false,
        missingBootstrapRuntime: true
      };
    }

    var playStartupHostRuntime = toRecord(playRuntimes.playStartupHostRuntime);
    var resolvePlayStartupFromContext = asFunction(
      playStartupHostRuntime.resolvePlayStartupFromContext
    );
    if (!resolvePlayStartupFromContext) {
      return {
        started: false,
        missingStartupRuntime: true
      };
    }

    var playHeaderRuntime = toRecord(playRuntimes.playHeaderRuntime);
    var playHeaderHostRuntime = toRecord(playRuntimes.playHeaderHostRuntime);
    var playPageContextRuntime = toRecord(playRuntimes.playPageContextRuntime);
    var playEntryRuntime = toRecord(playRuntimes.playEntryRuntime);
    var playCustomSpawnRuntime = toRecord(playRuntimes.playCustomSpawnRuntime);
    var playCustomSpawnHostRuntime = toRecord(playRuntimes.playCustomSpawnHostRuntime);
    var playChallengeIntroRuntime = toRecord(playRuntimes.playChallengeIntroRuntime);
    var playChallengeIntroUiRuntime = toRecord(playRuntimes.playChallengeIntroUiRuntime);
    var playChallengeIntroActionRuntime = toRecord(playRuntimes.playChallengeIntroActionRuntime);
    var playChallengeIntroHostRuntime = toRecord(playRuntimes.playChallengeIntroHostRuntime);
    var playChallengeContextRuntime = toRecord(playRuntimes.playChallengeContextRuntime);
    var playStartGuardRuntime = toRecord(playRuntimes.playStartGuardRuntime);
    var playStartupPayloadRuntime = toRecord(playRuntimes.playStartupPayloadRuntime);
    var playStartupContextRuntime = toRecord(playRuntimes.playStartupContextRuntime);
    var storageRuntime = toRecord(playRuntimes.storageRuntime);

    var customFourRateStorageKey =
      typeof playCustomSpawnHostRuntime.PLAY_CUSTOM_FOUR_RATE_STORAGE_KEY === "string"
        ? playCustomSpawnHostRuntime.PLAY_CUSTOM_FOUR_RATE_STORAGE_KEY
        : playPageDefaults.customFourRateStorageKey;
    var inputManagerCtor = source.inputManagerCtor || windowLike.KeyboardInputManager;

    var startupResult = startGameOnAnimationFrame(function () {
      return resolvePlayStartupFromContext({
        windowLike: windowLike,
        defaultModeKey: playPageDefaults.defaultModeKey,
        invalidModeRedirectUrl: playPageDefaults.invalidModeRedirectUrl,
        invalidModeMessage: playPageDefaults.invalidModeMessage,
        defaultBoardWidth: playPageDefaults.defaultBoardWidth,
        inputManagerCtor: inputManagerCtor,
        resolveEntryPlan: playEntryRuntime.resolvePlayEntryPlan,
        resolveStartupContext: playStartupContextRuntime.resolvePlayStartupContext,
        resolveModeConfig: function (modeKey, modeConfig) {
          var resolvePlayCustomSpawnModeConfigFromPageContext = asFunction(
            playPageContextRuntime.resolvePlayCustomSpawnModeConfigFromPageContext
          );
          return resolvePlayCustomSpawnModeConfigFromPageContext
            ? resolvePlayCustomSpawnModeConfigFromPageContext({
                modeKey: modeKey,
                modeConfig: modeConfig,
                storageKey: customFourRateStorageKey,
                windowLike: windowLike,
                storageRuntimeLike: storageRuntime,
                playCustomSpawnRuntimeLike: playCustomSpawnRuntime,
                playCustomSpawnHostRuntimeLike: playCustomSpawnHostRuntime
              })
            : modeConfig;
        },
        resolveGuardState: playStartGuardRuntime.resolvePlayStartGuardState,
        resolveChallengeContext: playChallengeContextRuntime.resolvePlayChallengeContext,
        applyHeader: function (modeConfig) {
          var applyPlayHeaderFromPageContext = asFunction(
            playPageContextRuntime.applyPlayHeaderFromPageContext
          );
          return applyPlayHeaderFromPageContext
            ? applyPlayHeaderFromPageContext({
                modeConfig: modeConfig,
                documentLike: windowLike.document,
                playHeaderRuntimeLike: playHeaderRuntime,
                playHeaderHostRuntimeLike: playHeaderHostRuntime,
                playChallengeIntroRuntimeLike: playChallengeIntroRuntime,
                playChallengeIntroUiRuntimeLike: playChallengeIntroUiRuntime,
                playChallengeIntroActionRuntimeLike: playChallengeIntroActionRuntime,
                playChallengeIntroHostRuntimeLike: playChallengeIntroHostRuntime
              })
            : null;
        },
        resolveStartupPayload: playStartupPayloadRuntime.resolvePlayStartupPayload
      });
    });

    return {
      started: true,
      startupResult: startupResult
    };
  }

  global.CorePlayPageHostRuntime = global.CorePlayPageHostRuntime || {};
  global.CorePlayPageHostRuntime.resolvePlayPageDefaults = resolvePlayPageDefaults;
  global.CorePlayPageHostRuntime.resolvePlayPageRuntimes = resolvePlayPageRuntimes;
  global.CorePlayPageHostRuntime.applyPlayPageBootstrap = applyPlayPageBootstrap;
})(typeof window !== "undefined" ? window : undefined);
