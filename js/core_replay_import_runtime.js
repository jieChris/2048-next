(function (global) {
  "use strict";

  if (!global) return;

  var DEFAULT_V1_RPL_BASE64_PREFIX = "REPLAY_v1RPL_B64_";
  var DEFAULT_V4_PREFIX = "REPLAY_v4C_";
  var V4_MODE_CODE_TO_MODE_KEY = {
    S: "standard_4x4_pow2_no_undo",
    C: "classic_4x4_pow2_undo",
    K: "capped_4x4_pow2_no_undo",
    P: "practice"
  };

  function resolveReplayV3ModeKey(source, fallbackModeKey) {
    var modeKey = source && typeof source.mode_key === "string" ? source.mode_key.trim() : "";
    if (modeKey) return modeKey;
    var modeTag = source && typeof source.mode === "string" ? source.mode.trim().toLowerCase() : "";
    if (modeTag === "practice") return "practice";
    if (modeTag === "capped") return "capped_4x4_pow2_no_undo";
    if (modeTag === "classic") return "classic_4x4_pow2_undo";
    return fallbackModeKey;
  }

  function parseReplayV3JsonEnvelope(trimmedReplayString, fallbackModeKey) {
    if (typeof trimmedReplayString !== "string" || !trimmedReplayString) return null;
    var firstChar = trimmedReplayString.charAt(0);
    if (firstChar !== "{" && firstChar !== "[") return null;
    var parsed = JSON.parse(trimmedReplayString);
    if (Array.isArray(parsed)) {
      return {
        kind: "v3-json",
        modeKey: fallbackModeKey,
        seed: null,
        actions: parsed.slice()
      };
    }
    if (!parsed || typeof parsed !== "object") throw "Invalid v3 replay payload";
    var actions = Array.isArray(parsed.actions) ? parsed.actions.slice() : [];
    var parsedSeed = Number(parsed.seed);
    return {
      kind: "v3-json",
      modeKey: resolveReplayV3ModeKey(parsed, fallbackModeKey),
      seed: Number.isFinite(parsedSeed) ? parsedSeed : null,
      actions: actions
    };
  }

  function parseReplayImportEnvelope(input) {
    var trimmedReplayString = input && typeof input.trimmedReplayString === "string"
      ? input.trimmedReplayString
      : "";
    var fallbackModeKey = input && typeof input.fallbackModeKey === "string" && input.fallbackModeKey
      ? input.fallbackModeKey
      : "standard_4x4_pow2_no_undo";
    var v1Prefix = input && typeof input.v1RplBase64Prefix === "string" && input.v1RplBase64Prefix
      ? input.v1RplBase64Prefix
      : DEFAULT_V1_RPL_BASE64_PREFIX;
    if (trimmedReplayString.indexOf(v1Prefix) === 0) {
      var bodyV1 = trimmedReplayString.substring(v1Prefix.length);
      if (!bodyV1) throw "Invalid replay v1 payload";
      return {
        kind: "v1rpl-b64",
        encodedBase64: bodyV1
      };
    }

    var v4Prefix = input && typeof input.v4Prefix === "string" && input.v4Prefix
      ? input.v4Prefix
      : DEFAULT_V4_PREFIX;
    if (trimmedReplayString.indexOf(v4Prefix) === 0) {
      var body = trimmedReplayString.substring(v4Prefix.length);
      if (body.length < 17) throw "Invalid v4C payload";
      var modeCode = body.charAt(0);
      var modeKey = V4_MODE_CODE_TO_MODE_KEY[modeCode];
      if (!modeKey) throw "Invalid v4C mode";
      return {
        kind: "v4c",
        modeKey: modeKey,
        initialBoardEncoded: body.substring(1, 17),
        actionsEncoded: body.substring(17)
      };
    }

    var v3Envelope = parseReplayV3JsonEnvelope(trimmedReplayString, fallbackModeKey);
    if (v3Envelope) return v3Envelope;

    return null;
  }

  global.CoreReplayImportRuntime = global.CoreReplayImportRuntime || {};
  global.CoreReplayImportRuntime.parseReplayImportEnvelope = parseReplayImportEnvelope;
})(typeof window !== "undefined" ? window : undefined);
