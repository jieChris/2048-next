export interface ReplayImportV3Envelope {
  kind: "json-v3";
  modeKey: string;
  actions: unknown[];
  seed: number;
  specialRulesSnapshot: Record<string, unknown> | null;
  modeFamily: string | null;
  rankPolicy: string | null;
  challengeId: string | null;
}

export interface ReplayImportV4Envelope {
  kind: "v4c";
  modeKey: string;
  initialBoardEncoded: string;
  actionsEncoded: string;
}

export type ReplayImportEnvelope = ReplayImportV3Envelope | ReplayImportV4Envelope | null;

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
  P: "practice_legacy"
};

function normalizeOptionalString(raw: unknown): string | null {
  return typeof raw === "string" && raw ? raw : null;
}

export function parseReplayImportEnvelope(input: ParseReplayImportEnvelopeInput): ReplayImportEnvelope {
  const trimmedReplayString = input.trimmedReplayString;
  if (trimmedReplayString.charAt(0) === "{") {
    const replayObj = JSON.parse(trimmedReplayString) as Record<string, unknown>;
    if (replayObj.v === 3) {
      const actions = replayObj.actions;
      if (!Array.isArray(actions)) throw "Invalid v3 actions";
      const replayModeKey =
        (normalizeOptionalString(replayObj.mode_key) ||
          normalizeOptionalString(replayObj.mode) ||
          input.fallbackModeKey);
      const specialRulesSnapshot =
        replayObj.special_rules_snapshot && typeof replayObj.special_rules_snapshot === "object"
          ? (replayObj.special_rules_snapshot as Record<string, unknown>)
          : null;
      return {
        kind: "json-v3",
        modeKey: replayModeKey,
        actions,
        seed: replayObj.seed as number,
        specialRulesSnapshot,
        modeFamily: normalizeOptionalString(replayObj.mode_family),
        rankPolicy: normalizeOptionalString(replayObj.rank_policy),
        challengeId: normalizeOptionalString(replayObj.challenge_id)
      };
    }
    throw "Unsupported JSON replay version";
  }

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
