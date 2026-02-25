(function (global) {
  "use strict";

  if (!global) return;

  var DEFAULT_INVALID_MODE_REDIRECT_URL = "play.html?mode_key=standard_4x4_pow2_no_undo";
  var DEFAULT_INVALID_MODE_MESSAGE = "无效模式，已回退到标准模式";
  var DEFAULT_RESOLVE_MODE_REDIRECT_URL = "modes.html";

  function resolvePlayStartGuardState(options) {
    var opts = options || {};
    var entryModeConfig = opts.entryModeConfig;
    var resolvedModeConfig = opts.resolvedModeConfig;
    var invalidModeRedirectUrl = String(opts.invalidModeRedirectUrl || "").trim();
    var entryRedirectUrl = String(opts.entryRedirectUrl || "").trim();

    if (!entryModeConfig) {
      return {
        shouldAbort: true,
        shouldAlert: true,
        alertMessage: DEFAULT_INVALID_MODE_MESSAGE,
        redirectUrl: entryRedirectUrl || invalidModeRedirectUrl || DEFAULT_INVALID_MODE_REDIRECT_URL
      };
    }

    if (!resolvedModeConfig) {
      return {
        shouldAbort: true,
        shouldAlert: false,
        alertMessage: "",
        redirectUrl: DEFAULT_RESOLVE_MODE_REDIRECT_URL
      };
    }

    return {
      shouldAbort: false,
      shouldAlert: false,
      alertMessage: "",
      redirectUrl: ""
    };
  }

  global.CorePlayStartGuardRuntime = global.CorePlayStartGuardRuntime || {};
  global.CorePlayStartGuardRuntime.resolvePlayStartGuardState =
    resolvePlayStartGuardState;
})(typeof window !== "undefined" ? window : undefined);
