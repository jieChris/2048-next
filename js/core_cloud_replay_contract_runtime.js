(function (root) {
  "use strict";

  if (!root) return;

  var existing = root.CLOUD_REPLAY_CONTRACT && typeof root.CLOUD_REPLAY_CONTRACT === "object"
    ? root.CLOUD_REPLAY_CONTRACT
    : {};

  var payloadVersion = Math.floor(Number(existing.cloud_payload_version) || 0);
  var replayFileVersion = Math.floor(Number(existing.replay_file_version) || 0);
  var replayLogicVersion =
    typeof existing.replay_logic_version === "string" && existing.replay_logic_version
      ? existing.replay_logic_version
      : "v1";

  if (payloadVersion <= 0) payloadVersion = 2;
  if (replayFileVersion <= 0) replayFileVersion = 1;

  root.CLOUD_REPLAY_CONTRACT = Object.freeze({
    cloud_payload_version: payloadVersion,
    replay_file_version: replayFileVersion,
    replay_logic_version: replayLogicVersion
  });
})(
  typeof window !== "undefined"
    ? window
    : (typeof globalThis !== "undefined" ? globalThis : null)
);
