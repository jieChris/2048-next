(function (global) {
  "use strict";

  if (!global) return;

  var DEFAULT_PLAY_MODE_KEY = "standard_4x4_pow2_no_undo";
  var PLAY_MODE_ALIAS = {
    challenge: "capped_4x4_pow2_64_no_undo"
  };

  function toSearchParams(searchLike) {
    if (searchLike && typeof searchLike.get === "function") {
      return searchLike;
    }
    try {
      return new URLSearchParams(searchLike || "");
    } catch (_err) {
      return new URLSearchParams();
    }
  }

  function parsePlayModeKeyLocal(searchLike, fallbackModeKey) {
    var params = toSearchParams(searchLike);
    var raw = params.get("mode_key");
    var key = raw && raw.trim() ? raw.trim() : fallbackModeKey || DEFAULT_PLAY_MODE_KEY;
    var mapped = PLAY_MODE_ALIAS[String(key || "").toLowerCase()];
    return mapped || key;
  }

  function parsePlayChallengeIdLocal(searchLike) {
    var params = toSearchParams(searchLike);
    var raw = params.get("challenge_id");
    return raw && raw.trim() ? raw.trim() : "";
  }

  function resolveCatalogModeWithDefaultLocal(catalog, modeKey, defaultModeKey) {
    if (!catalog || typeof catalog.getMode !== "function") return null;
    var key = modeKey && String(modeKey).trim() ? String(modeKey).trim() : defaultModeKey;
    return catalog.getMode(key) || catalog.getMode(defaultModeKey) || null;
  }

  function normalizeDefaultModeKey(defaultModeKey) {
    var key = String(defaultModeKey || DEFAULT_PLAY_MODE_KEY).trim();
    return key || DEFAULT_PLAY_MODE_KEY;
  }

  function buildInvalidPlayModeRedirectUrl(defaultModeKey) {
    return "play.html?mode_key=" + encodeURIComponent(normalizeDefaultModeKey(defaultModeKey));
  }

  function resolvePlayModeKey(searchLike, defaultModeKey) {
    var runtime = global.CorePlayQueryRuntime;
    if (runtime && typeof runtime.parsePlayModeKey === "function") {
      return runtime.parsePlayModeKey(searchLike, normalizeDefaultModeKey(defaultModeKey));
    }
    return parsePlayModeKeyLocal(searchLike, normalizeDefaultModeKey(defaultModeKey));
  }

  function resolvePlayChallengeId(searchLike) {
    var runtime = global.CorePlayQueryRuntime;
    if (runtime && typeof runtime.parsePlayChallengeId === "function") {
      return runtime.parsePlayChallengeId(searchLike);
    }
    return parsePlayChallengeIdLocal(searchLike);
  }

  function resolveCatalogModeWithDefault(catalog, modeKey, defaultModeKey) {
    var runtime = global.CoreModeCatalogRuntime;
    if (runtime && typeof runtime.resolveCatalogModeWithDefault === "function") {
      return runtime.resolveCatalogModeWithDefault(catalog, modeKey, defaultModeKey);
    }
    return resolveCatalogModeWithDefaultLocal(catalog, modeKey, defaultModeKey);
  }

  function resolvePlayEntryPlan(options) {
    var opts = options || {};
    var defaultModeKey = normalizeDefaultModeKey(opts.defaultModeKey);
    var modeKey = resolvePlayModeKey(opts.searchLike || "", defaultModeKey);
    var challengeId = resolvePlayChallengeId(opts.searchLike || "");
    var modeConfig = resolveCatalogModeWithDefault(opts.modeCatalog || null, modeKey, defaultModeKey);
    if (modeConfig) {
      return {
        modeKey: modeKey,
        challengeId: challengeId,
        modeConfig: modeConfig,
        redirectUrl: null
      };
    }
    var redirectUrl =
      typeof opts.invalidModeRedirectUrl === "string" && opts.invalidModeRedirectUrl
        ? opts.invalidModeRedirectUrl
        : buildInvalidPlayModeRedirectUrl(defaultModeKey);
    return {
      modeKey: modeKey,
      challengeId: challengeId,
      modeConfig: null,
      redirectUrl: redirectUrl
    };
  }

  global.CorePlayEntryRuntime = global.CorePlayEntryRuntime || {};
  global.CorePlayEntryRuntime.DEFAULT_PLAY_MODE_KEY = DEFAULT_PLAY_MODE_KEY;
  global.CorePlayEntryRuntime.buildInvalidPlayModeRedirectUrl = buildInvalidPlayModeRedirectUrl;
  global.CorePlayEntryRuntime.resolvePlayEntryPlan = resolvePlayEntryPlan;
})(typeof window !== "undefined" ? window : undefined);
