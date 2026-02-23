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

  function parsePlayModeKey(searchLike, fallbackModeKey) {
    var params = toSearchParams(searchLike);
    var raw = params.get("mode_key");
    var key = raw && raw.trim() ? raw.trim() : (fallbackModeKey || DEFAULT_PLAY_MODE_KEY);
    var mapped = PLAY_MODE_ALIAS[String(key || "").toLowerCase()];
    return mapped || key;
  }

  function parsePlayChallengeId(searchLike) {
    var params = toSearchParams(searchLike);
    var raw = params.get("challenge_id");
    return raw && raw.trim() ? raw.trim() : "";
  }

  global.CorePlayQueryRuntime = global.CorePlayQueryRuntime || {};
  global.CorePlayQueryRuntime.DEFAULT_PLAY_MODE_KEY = DEFAULT_PLAY_MODE_KEY;
  global.CorePlayQueryRuntime.parsePlayModeKey = parsePlayModeKey;
  global.CorePlayQueryRuntime.parsePlayChallengeId = parsePlayChallengeId;
})(typeof window !== "undefined" ? window : undefined);
