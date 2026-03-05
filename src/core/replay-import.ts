export interface ReplayImportV4Envelope {
  kind: "v4c";
  modeKey: string;
  initialBoardEncoded: string;
  actionsEncoded: string;
}

export type ReplayImportEnvelope = ReplayImportV4Envelope | null;

export interface ParseReplayImportEnvelopeInput {
  trimmedReplayString: string;
  fallbackModeKey: string;
  v4Prefix?: string;
}

const DEFAULT_V4_PREFIX = "REPLAY_v4C_";

const V4_MODE_CODE_TO_MODE_KEY: Record<string, string> = {
  S: "standard_4x4_pow2_no_undo",
  C: "classic_4x4_pow2_undo",
  K: "capped_4x4_pow2_no_undo",
  P: "practice"
};

export function parseReplayImportEnvelope(input: ParseReplayImportEnvelopeInput): ReplayImportEnvelope {
  const trimmedReplayString = input.trimmedReplayString;
  const v4Prefix = typeof input.v4Prefix === "string" && input.v4Prefix ? input.v4Prefix : DEFAULT_V4_PREFIX;
  if (trimmedReplayString.indexOf(v4Prefix) === 0) {
    const body = trimmedReplayString.substring(v4Prefix.length);
    if (body.length < 17) throw "Invalid v4C payload";
    const modeCode = body.charAt(0);
    const modeKey = V4_MODE_CODE_TO_MODE_KEY[modeCode];
    if (!modeKey) throw "Invalid v4C mode";
    return {
      kind: "v4c",
      modeKey,
      initialBoardEncoded: body.substring(1, 17),
      actionsEncoded: body.substring(17)
    };
  }

  return null;
}
