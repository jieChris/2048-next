export interface PlayModeConfigLike {
  key?: string | null | undefined;
}

export interface PlayChallengeContext {
  id: string;
  mode_key: string;
  seed?: number;
  ranked_session_token?: string;
  spawn_sequence_version?: 1 | 2;
}

export interface ResolvePlayChallengeContextOptions {
  challengeId?: string | null | undefined;
  modeConfig?: PlayModeConfigLike | null | undefined;
  existingContext?: unknown;
}

function normalizeExistingPlayChallengeContext(
  existingContext: unknown,
  fallbackModeKey: string
): PlayChallengeContext | null {
  if (!existingContext || typeof existingContext !== "object" || Array.isArray(existingContext)) {
    return null;
  }
  const raw = existingContext as Record<string, unknown>;
  const id = String(raw.id || "").trim();
  if (!id) return null;
  const modeKey = String(raw.mode_key || fallbackModeKey || "").trim();
  const seedValue = Number(raw.seed);
  const rankedSessionToken = String(raw.ranked_session_token || "").trim();
  const out: PlayChallengeContext = {
    id,
    mode_key: modeKey
  };
  if (Number.isFinite(seedValue) && Math.floor(seedValue) >= 0) {
    out.seed = Math.floor(seedValue);
  }
  if (rankedSessionToken) {
    out.ranked_session_token = rankedSessionToken;
  }
  out.spawn_sequence_version = Number(raw.spawn_sequence_version) === 2 ? 2 : 1;
  return out;
}

export function resolvePlayChallengeContext(
  options: ResolvePlayChallengeContextOptions
): PlayChallengeContext | null {
  const opts = options || {};
  const modeConfig = opts.modeConfig || null;
  const modeKey = modeConfig && typeof modeConfig.key === "string" ? modeConfig.key.trim() : "";
  const existing = normalizeExistingPlayChallengeContext(opts.existingContext, modeKey);
  if (
    existing &&
    existing.mode_key === modeKey &&
    (typeof existing.seed === "number" || !!existing.ranked_session_token)
  ) {
    return existing;
  }
  const id = String(opts.challengeId || "").trim();
  if (id) {
    return {
      id,
      mode_key: modeKey
    };
  }
  if (existing && modeKey && existing.mode_key && existing.mode_key !== modeKey) {
    return null;
  }
  return existing;
}
