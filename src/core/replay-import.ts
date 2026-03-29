export type ReplayFormatKind = "v1rpl-b64" | "v4c" | "v3-json" | "unknown";

export function detectReplayFormat(input: string): ReplayFormatKind {
  const trimmed = input.trim();
  if (trimmed.startsWith("REPLAY_v1RPL_B64_")) return "v1rpl-b64";
  if (trimmed.startsWith("REPLAY_v4C_")) return "v4c";
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return "v3-json";
  return "unknown";
}

export interface ReplayImportV1Envelope {
  kind: "v1rpl-b64";
  encodedBase64: string;
}

export interface ReplayImportV4Envelope {
  kind: "v4c";
  modeKey: string;
  initialBoardEncoded: string;
  actionsEncoded: string;
}

export interface ReplayImportV3JsonEnvelope {
  kind: "v3-json";
  modeKey: string;
  seed: number | null;
  actions: unknown[];
  specialRulesSnapshot?: {
    custom_spawn_four_rate?: number;
  } | null;
}

export type ReplayImportEnvelope =
  | ReplayImportV1Envelope
  | ReplayImportV4Envelope
  | ReplayImportV3JsonEnvelope
  | null;

export interface ParseReplayImportEnvelopeInput {
  trimmedReplayString: string;
  fallbackModeKey: string;
  v4Prefix?: string;
  v1RplBase64Prefix?: string;
}

const DEFAULT_V1_RPL_BASE64_PREFIX = "REPLAY_v1RPL_B64_";
const DEFAULT_V4_PREFIX = "REPLAY_v4C_";

const V4_MODE_CODE_TO_MODE_KEY: Record<string, string> = {
  S: "standard_4x4_pow2_no_undo",
  C: "classic_4x4_pow2_undo",
  K: "capped_4x4_pow2_no_undo",
  P: "practice"
};

function resolveReplayV3ModeKey(source: Record<string, unknown>, fallbackModeKey: string): string {
  const modeKey = typeof source.mode_key === "string" ? source.mode_key.trim() : "";
  if (modeKey) return modeKey;
  const modeTag = typeof source.mode === "string" ? source.mode.trim().toLowerCase() : "";
  if (modeTag === "practice") return "practice";
  if (modeTag === "capped") return "capped_4x4_pow2_no_undo";
  if (modeTag === "classic") return "classic_4x4_pow2_undo";
  return fallbackModeKey;
}

function normalizeReplayV3CustomFourRate(rawRate: unknown): number | null {
  const parsed = Number(rawRate);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) return null;
  return Math.round(parsed * 100) / 100;
}

function resolveReplayV3SpecialRulesSnapshot(
  source: Record<string, unknown>
): ReplayImportV3JsonEnvelope["specialRulesSnapshot"] {
  const rawSnapshot = source.special_rules_snapshot;
  if (!rawSnapshot || typeof rawSnapshot !== "object") return null;
  const snapshot = rawSnapshot as Record<string, unknown>;
  const customFourRate = normalizeReplayV3CustomFourRate(snapshot.custom_spawn_four_rate);
  if (customFourRate === null) return null;
  return { custom_spawn_four_rate: customFourRate };
}

function parseReplayV3JsonEnvelope(trimmedReplayString: string, fallbackModeKey: string): ReplayImportEnvelope {
  const firstChar = trimmedReplayString.charAt(0);
  if (firstChar !== "{" && firstChar !== "[") return null;
  const parsed = JSON.parse(trimmedReplayString);
  if (Array.isArray(parsed)) {
    return {
      kind: "v3-json",
      modeKey: fallbackModeKey,
      seed: null,
      actions: parsed
    };
  }
  if (!parsed || typeof parsed !== "object") throw "Invalid v3 replay payload";
  const source = parsed as Record<string, unknown>;
  const actions = Array.isArray(source.actions) ? source.actions.slice() : [];
  const parsedSeed = Number(source.seed);
  return {
    kind: "v3-json",
    modeKey: resolveReplayV3ModeKey(source, fallbackModeKey),
    seed: Number.isFinite(parsedSeed) ? parsedSeed : null,
    actions,
    specialRulesSnapshot: resolveReplayV3SpecialRulesSnapshot(source)
  };
}

export function parseReplayImportEnvelope(input: ParseReplayImportEnvelopeInput): ReplayImportEnvelope {
  const trimmedReplayString = input.trimmedReplayString;
  const fallbackModeKey =
    typeof input.fallbackModeKey === "string" && input.fallbackModeKey
      ? input.fallbackModeKey
      : "standard_4x4_pow2_no_undo";
  const v4Prefix = typeof input.v4Prefix === "string" && input.v4Prefix ? input.v4Prefix : DEFAULT_V4_PREFIX;
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

  const v3Envelope = parseReplayV3JsonEnvelope(trimmedReplayString, fallbackModeKey);
  if (v3Envelope) return v3Envelope;

  return null;
}
