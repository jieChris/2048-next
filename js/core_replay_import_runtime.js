(function (global) {
  "use strict";

  if (!global) return;

  var DEFAULT_V4_PREFIX = "REPLAY_v4C_";
  var V4_MODE_CODE_TO_MODE_KEY = {
    S: "standard_4x4_pow2_no_undo",
    C: "classic_4x4_pow2_undo",
    K: "capped_4x4_pow2_no_undo",
    P: "practice"
  };

  function parseReplayImportEnvelope(input) {
    var trimmedReplayString = input && typeof input.trimmedReplayString === "string"
      ? input.trimmedReplayString
      : "";

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

    return null;
  }

  global.CoreReplayImportRuntime = global.CoreReplayImportRuntime || {};
  global.CoreReplayImportRuntime.parseReplayImportEnvelope = parseReplayImportEnvelope;
})(typeof window !== "undefined" ? window : undefined);
