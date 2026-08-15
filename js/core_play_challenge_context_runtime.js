(function (global) {
  "use strict";

  if (!global) return;

  function normalizeExistingPlayChallengeContext(existingContext, fallbackModeKey) {
    if (!existingContext || typeof existingContext !== "object" || Array.isArray(existingContext)) {
      return null;
    }
    var id = String(existingContext.id || "").trim();
    if (!id) return null;
    var modeKey = String(existingContext.mode_key || fallbackModeKey || "").trim();
    var seedValue = Number(existingContext.seed);
    var rankedSessionToken = String(existingContext.ranked_session_token || "").trim();
    var out = {
      id: id,
      mode_key: modeKey
    };
    if (Number.isFinite(seedValue) && Math.floor(seedValue) >= 0) {
      out.seed = Math.floor(seedValue);
    }
    if (rankedSessionToken) {
      out.ranked_session_token = rankedSessionToken;
    }
    return out;
  }

  function resolvePlayChallengeContext(options) {
    var opts = options || {};
    var modeConfig = opts.modeConfig || null;
    var modeKey =
      modeConfig && typeof modeConfig.key === "string" ? modeConfig.key.trim() : "";
    var existing = normalizeExistingPlayChallengeContext(opts.existingContext, modeKey);
    if (
      existing &&
      existing.mode_key === modeKey &&
      (typeof existing.seed === "number" || !!existing.ranked_session_token)
    ) {
      return existing;
    }
    var id = String(opts.challengeId || "").trim();
    if (!id) {
      if (existing && modeKey && existing.mode_key && existing.mode_key !== modeKey) return null;
      return existing;
    }
    return {
      id: id,
      mode_key: modeKey
    };
  }

  global.CorePlayChallengeContextRuntime = global.CorePlayChallengeContextRuntime || {};
  global.CorePlayChallengeContextRuntime.resolvePlayChallengeContext =
    resolvePlayChallengeContext;
})(typeof window !== "undefined" ? window : undefined);
