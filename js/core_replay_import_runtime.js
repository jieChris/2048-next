(function (global) {
  "use strict";

  if (!global) return;

  var DEFAULT_V1_RPL_BASE64_PREFIX = "REPLAY_v1RPL_B64_";

  function parseReplayImportEnvelope(input) {
    var trimmedReplayString = input && typeof input.trimmedReplayString === "string"
      ? input.trimmedReplayString
      : "";
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
    return null;
  }

  global.CoreReplayImportRuntime = global.CoreReplayImportRuntime || {};
  global.CoreReplayImportRuntime.parseReplayImportEnvelope = parseReplayImportEnvelope;
})(typeof window !== "undefined" ? window : undefined);
