export interface PlayModeConfigLike {
  key?: string | null | undefined;
}

export interface PlayChallengeContext {
  id: string;
  mode_key: string;
}

export interface ResolvePlayChallengeContextOptions {
  challengeId?: string | null | undefined;
  modeConfig?: PlayModeConfigLike | null | undefined;
}

export function resolvePlayChallengeContext(
  options: ResolvePlayChallengeContextOptions
): PlayChallengeContext | null {
  const opts = options || {};
  const id = String(opts.challengeId || "").trim();
  if (!id) return null;
  const modeConfig = opts.modeConfig || null;
  const modeKey = modeConfig && typeof modeConfig.key === "string" ? modeConfig.key.trim() : "";
  return {
    id,
    mode_key: modeKey
  };
}
