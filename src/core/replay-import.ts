export type ReplayFormatKind = "v1rpl-b64" | "unknown";

export function detectReplayFormat(input: string): ReplayFormatKind {
  const trimmed = input.trim();
  if (trimmed.startsWith("REPLAY_v1RPL_B64_")) return "v1rpl-b64";
  return "unknown";
}

export interface ReplayImportV1Envelope {
  kind: "v1rpl-b64";
  encodedBase64: string;
}

export type ReplayImportEnvelope = ReplayImportV1Envelope | null;

export interface ParseReplayImportEnvelopeInput {
  trimmedReplayString: string;
  fallbackModeKey?: string;
  v4Prefix?: string;
  v1RplBase64Prefix?: string;
}

const DEFAULT_V1_RPL_BASE64_PREFIX = "REPLAY_v1RPL_B64_";

export function parseReplayImportEnvelope(input: ParseReplayImportEnvelopeInput): ReplayImportEnvelope {
  const trimmedReplayString = input.trimmedReplayString;
  const v1Prefix =
    typeof input.v1RplBase64Prefix === "string" && input.v1RplBase64Prefix
      ? input.v1RplBase64Prefix
      : DEFAULT_V1_RPL_BASE64_PREFIX;
  if (trimmedReplayString.indexOf(v1Prefix) === 0) {
    const body = trimmedReplayString.substring(v1Prefix.length);
    if (!body) throw "Invalid replay v1 payload";
    return {
      kind: "v1rpl-b64",
      encodedBase64: body
    };
  }

  return null;
}
