(function (global) {
  "use strict";

  if (!global) return;

  function resolvePlayChallengeContext(options) {
    var opts = options || {};
    var id = String(opts.challengeId || "").trim();
    if (!id) return null;
    var modeConfig = opts.modeConfig || null;
    var modeKey =
      modeConfig && typeof modeConfig.key === "string" ? modeConfig.key.trim() : "";
    return {
      id: id,
      mode_key: modeKey
    };
  }

  global.CorePlayChallengeContextRuntime = global.CorePlayChallengeContextRuntime || {};
  global.CorePlayChallengeContextRuntime.resolvePlayChallengeContext =
    resolvePlayChallengeContext;
})(typeof window !== "undefined" ? window : undefined);
