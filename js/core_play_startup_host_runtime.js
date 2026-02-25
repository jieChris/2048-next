(function (global) {
  "use strict";

  if (!global) return;

  var DEFAULT_MODE_KEY = "standard_4x4_pow2_no_undo";
  var DEFAULT_INVALID_MODE_REDIRECT_URL = "play.html?mode_key=standard_4x4_pow2_no_undo";
  var DEFAULT_INVALID_MODE_MESSAGE = "无效模式，已回退到标准模式";
  var DEFAULT_BOARD_WIDTH = 4;

  function getModeKey(modeConfig) {
    if (!modeConfig || typeof modeConfig !== "object") return undefined;
    if (!Object.prototype.hasOwnProperty.call(modeConfig, "key")) return undefined;
    return modeConfig.key;
  }

  function resolvePlayStartupFromContext(options) {
    var opts = options || {};
    var windowLike = opts.windowLike || null;
    var locationLike = windowLike && windowLike.location ? windowLike.location : null;
    var invalidModeRedirectUrl = String(
      opts.invalidModeRedirectUrl || DEFAULT_INVALID_MODE_REDIRECT_URL
    );
    var invalidModeMessage = String(opts.invalidModeMessage || DEFAULT_INVALID_MODE_MESSAGE);
    var defaultModeKey = String(opts.defaultModeKey || DEFAULT_MODE_KEY);
    var defaultBoardWidth = Number(opts.defaultBoardWidth || DEFAULT_BOARD_WIDTH);
    var searchLike = String((locationLike && locationLike.search) || "");

    var entryPlan = opts.resolveEntryPlan({
      searchLike: searchLike,
      modeCatalog: windowLike ? windowLike.ModeCatalog : undefined,
      defaultModeKey: defaultModeKey,
      invalidModeRedirectUrl: invalidModeRedirectUrl
    });
    var startupContext = opts.resolveStartupContext({
      entryPlan: entryPlan,
      invalidModeRedirectUrl: invalidModeRedirectUrl,
      invalidModeMessage: invalidModeMessage,
      resolveModeConfig: opts.resolveModeConfig,
      resolveGuardState: opts.resolveGuardState
    });

    if (!startupContext || startupContext.kind === "abort") {
      var shouldAlert = !!(startupContext && startupContext.shouldAlert);
      var alertMessage = String(
        (startupContext && startupContext.alertMessage) || invalidModeMessage
      );
      var redirectUrl = String(
        (startupContext && startupContext.redirectUrl) || invalidModeRedirectUrl
      );

      if (shouldAlert && windowLike && typeof windowLike.alert === "function") {
        windowLike.alert(alertMessage);
      }
      if (locationLike) {
        locationLike.href = redirectUrl;
      }
      return null;
    }

    var modeConfig = startupContext.modeConfig;
    var challengeId = String(startupContext.challengeId || "");
    if (windowLike) {
      windowLike.GAME_MODE_CONFIG = modeConfig;
      windowLike.GAME_CHALLENGE_CONTEXT = opts.resolveChallengeContext({
        challengeId: challengeId,
        modeConfig: modeConfig
      });
    }
    opts.applyHeader(modeConfig);

    var startupPayload = opts.resolveStartupPayload({
      modeConfig: modeConfig,
      inputManagerCtor: opts.inputManagerCtor,
      defaultBoardWidth: defaultBoardWidth
    });
    if (startupPayload) return startupPayload;

    return {
      modeKey: getModeKey(modeConfig),
      modeConfig: modeConfig,
      inputManagerCtor: opts.inputManagerCtor,
      defaultBoardWidth: defaultBoardWidth
    };
  }

  global.CorePlayStartupHostRuntime = global.CorePlayStartupHostRuntime || {};
  global.CorePlayStartupHostRuntime.resolvePlayStartupFromContext = resolvePlayStartupFromContext;
})(typeof window !== "undefined" ? window : undefined);
