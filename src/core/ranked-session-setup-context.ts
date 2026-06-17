export interface RankedSessionSetupManagerLike {
  rankPolicy?: string;
  modeKey?: unknown;
  mode?: unknown;
  getWindowLike?: () => RankedSessionSetupWindowLike | null;
}

export interface RankedSessionSetupWindowLike {
  GAME_CHALLENGE_CONTEXT?: unknown;
  CoreRankedSessionSetupContextRuntime?: RankedSessionSetupContextRuntime;
}

export interface RankedSessionSetupContext {
  id: string;
  mode_key: string;
  seed: number;
  ranked_session_token: string;
}

export interface RankedSessionSetupContextRuntime {
  resolveSetupRankedSessionContext: typeof resolveSetupRankedSessionContext;
}

export interface RankedSessionSetupContextRuntimeInstallOptions {
  windowLike?: RankedSessionSetupWindowLike | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function resolveModeKey(manager: RankedSessionSetupManagerLike | null | undefined): string {
  if (!manager) return "";
  if (typeof manager.modeKey === "string" && manager.modeKey) return manager.modeKey;
  if (typeof manager.mode === "string" && manager.mode) return manager.mode;
  return "";
}

export function resolveSetupRankedSessionContext(
  manager: RankedSessionSetupManagerLike | null | undefined
): RankedSessionSetupContext | null {
  if (!manager || manager.rankPolicy !== "ranked") return null;
  const windowLike = typeof manager.getWindowLike === "function" ? manager.getWindowLike() : null;
  const context = windowLike?.GAME_CHALLENGE_CONTEXT;
  if (!isRecord(context)) return null;
  const modeKey = resolveModeKey(manager);
  const contextModeKey = typeof context.mode_key === "string" ? context.mode_key.trim() : "";
  if (modeKey && contextModeKey && contextModeKey !== modeKey) return null;
  const challengeId = typeof context.id === "string" ? context.id.trim() : "";
  const seed = Math.floor(Number(context.seed));
  const rankedSessionToken =
    typeof context.ranked_session_token === "string" ? context.ranked_session_token.trim() : "";
  if (!challengeId) return null;
  if (!Number.isInteger(seed) || seed < 0) return null;
  return {
    id: challengeId,
    mode_key: contextModeKey || modeKey,
    seed,
    ranked_session_token: rankedSessionToken
  };
}

export function createRankedSessionSetupContextRuntime(): RankedSessionSetupContextRuntime {
  return {
    resolveSetupRankedSessionContext
  };
}

export function installRankedSessionSetupContextRuntime(
  options: RankedSessionSetupContextRuntimeInstallOptions = {}
): RankedSessionSetupContextRuntime | null {
  const target =
    options.windowLike === undefined
      ? typeof window === "undefined"
        ? null
        : (window as unknown as RankedSessionSetupWindowLike)
      : options.windowLike;
  if (!target) return null;
  if (!target.CoreRankedSessionSetupContextRuntime) {
    target.CoreRankedSessionSetupContextRuntime = createRankedSessionSetupContextRuntime();
  }
  return target.CoreRankedSessionSetupContextRuntime;
}
