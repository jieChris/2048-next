(function (global) {
  "use strict";

  if (!global) return;

  var DEFAULT_INVALID_MODE_REDIRECT_URL = "play.html?mode_key=standard_4x4_pow2_no_undo";
  var DEFAULT_INVALID_MODE_MESSAGE = "无效模式，已回退到标准模式";
  var DEFAULT_RESOLVED_MODE_REDIRECT_URL = "modes.html";

  function resolvePlayStartupContext(options) {
    var opts = options || {};
    var entryPlan = opts.entryPlan || {};
    var modeKey = String(entryPlan.modeKey || "");
    var challengeId = String(entryPlan.challengeId || "");
    var entryModeConfig = entryPlan.modeConfig;
    var invalidModeRedirectUrl = String(
      opts.invalidModeRedirectUrl || DEFAULT_INVALID_MODE_REDIRECT_URL
    );
    var invalidModeMessage = String(opts.invalidModeMessage || DEFAULT_INVALID_MODE_MESSAGE);

    var guardAfterEntry =
      opts.resolveGuardState({
        entryModeConfig: entryModeConfig,
        resolvedModeConfig: entryModeConfig,
        invalidModeRedirectUrl: invalidModeRedirectUrl,
        entryRedirectUrl: String(entryPlan.redirectUrl || "")
      }) || {};

    if (guardAfterEntry.shouldAbort) {
      return {
        kind: "abort",
        shouldAlert: !!guardAfterEntry.shouldAlert,
        alertMessage: String(guardAfterEntry.alertMessage || invalidModeMessage),
        redirectUrl: String(guardAfterEntry.redirectUrl || invalidModeRedirectUrl)
      };
    }

    var resolvedModeConfig = opts.resolveModeConfig(modeKey, entryModeConfig);
    var guardAfterResolve =
      opts.resolveGuardState({
        entryModeConfig: true,
        resolvedModeConfig: resolvedModeConfig
      }) || {};

    if (guardAfterResolve.shouldAbort) {
      return {
        kind: "abort",
        shouldAlert: false,
        alertMessage: "",
        redirectUrl: String(guardAfterResolve.redirectUrl || DEFAULT_RESOLVED_MODE_REDIRECT_URL)
      };
    }

    return {
      kind: "start",
      modeConfig: resolvedModeConfig,
      challengeId: challengeId
    };
  }

  global.CorePlayStartupContextRuntime = global.CorePlayStartupContextRuntime || {};
  global.CorePlayStartupContextRuntime.resolvePlayStartupContext = resolvePlayStartupContext;
})(typeof window !== "undefined" ? window : undefined);
