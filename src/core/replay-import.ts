export type ReplayFormatKind = "v4c" | "v3-json" | "unknown";

export function detectReplayFormat(input: string): ReplayFormatKind {
  const trimmed = input.trim();
  if (trimmed.startsWith("REPLAY_v4C_")) return "v4c";
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return "v3-json";
  return "unknown";
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
}

export type ReplayImportEnvelope = ReplayImportV4Envelope | ReplayImportV3JsonEnvelope | null;

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

function resolveReplayV3ModeKey(source: Record<string, unknown>, fallbackModeKey: string): string {
  const modeKey = typeof source.mode_key === "string" ? source.mode_key.trim() : "";
  if (modeKey) return modeKey;
  const modeTag = typeof source.mode === "string" ? source.mode.trim().toLowerCase() : "";
  if (modeTag === "practice") return "practice";
  if (modeTag === "capped") return "capped_4x4_pow2_no_undo";
  if (modeTag === "classic") return "classic_4x4_pow2_undo";
  return fallbackModeKey;
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
    actions
  };
}

export function parseReplayImportEnvelope(input: ParseReplayImportEnvelopeInput): ReplayImportEnvelope {
  const trimmedReplayString = input.trimmedReplayString;
  const fallbackModeKey =
    typeof input.fallbackModeKey === "string" && input.fallbackModeKey
      ? input.fallbackModeKey
      : "standard_4x4_pow2_no_undo";
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

  const v3Envelope = parseReplayV3JsonEnvelope(trimmedReplayString, fallbackModeKey);
  if (v3Envelope) return v3Envelope;

  return null;
}
