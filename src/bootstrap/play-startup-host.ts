export interface PlayStartupHostLocationLike {
  search?: string | null | undefined;
  href?: string | null | undefined;
}

export interface PlayStartupHostWindowLike {
  location?: PlayStartupHostLocationLike | null | undefined;
  ModeCatalog?: unknown;
  GAME_MODE_CONFIG?: unknown;
  GAME_CHALLENGE_CONTEXT?: unknown;
  alert?: ((message?: string) => void) | null | undefined;
}

export interface PlayStartupHostEntryPlanLike {
  modeKey?: string | null | undefined;
  challengeId?: string | null | undefined;
  modeConfig?: unknown;
  redirectUrl?: string | null | undefined;
}

export interface PlayStartupHostGuardStateLike {
  shouldAbort?: boolean | null | undefined;
  shouldAlert?: boolean | null | undefined;
  alertMessage?: string | null | undefined;
  redirectUrl?: string | null | undefined;
}

export interface PlayStartupHostAbortContextLike {
  kind: "abort";
  shouldAlert?: boolean | null | undefined;
  alertMessage?: string | null | undefined;
  redirectUrl?: string | null | undefined;
}

export interface PlayStartupHostStartContextLike {
  kind: "start";
  modeConfig: unknown;
  challengeId?: string | null | undefined;
}

export type PlayStartupHostContextLike =
  | PlayStartupHostAbortContextLike
  | PlayStartupHostStartContextLike;

export interface ResolvePlayStartupFromContextOptions {
  windowLike?: PlayStartupHostWindowLike | null | undefined;
  defaultModeKey?: string | null | undefined;
  invalidModeRedirectUrl?: string | null | undefined;
  invalidModeMessage?: string | null | undefined;
  defaultBoardWidth?: number | null | undefined;
  inputManagerCtor: unknown;
  resolveEntryPlan: (options: {
    searchLike: string;
    modeCatalog: unknown;
    defaultModeKey: string;
    invalidModeRedirectUrl: string;
  }) => PlayStartupHostEntryPlanLike | null | undefined;
  resolveStartupContext: (options: {
    entryPlan: PlayStartupHostEntryPlanLike | null | undefined;
    invalidModeRedirectUrl: string;
    invalidModeMessage: string;
    resolveModeConfig: (modeKey: string, modeConfig: unknown) => unknown;
    resolveGuardState: (options: {
      entryModeConfig?: unknown;
      resolvedModeConfig?: unknown;
      invalidModeRedirectUrl?: string;
      entryRedirectUrl?: string;
    }) => PlayStartupHostGuardStateLike | null | undefined;
  }) => PlayStartupHostContextLike | null | undefined;
  resolveModeConfig: (modeKey: string, modeConfig: unknown) => unknown;
  resolveGuardState: (options: {
    entryModeConfig?: unknown;
    resolvedModeConfig?: unknown;
    invalidModeRedirectUrl?: string;
    entryRedirectUrl?: string;
  }) => PlayStartupHostGuardStateLike | null | undefined;
  resolveChallengeContext: (options: {
    challengeId: string;
    modeConfig: unknown;
  }) => unknown;
  applyHeader: (modeConfig: unknown) => void;
  resolveStartupPayload: (options: {
    modeConfig: unknown;
    inputManagerCtor: unknown;
    defaultBoardWidth: number;
  }) => unknown;
}

const DEFAULT_MODE_KEY = "standard_4x4_pow2_no_undo";
const DEFAULT_INVALID_MODE_REDIRECT_URL = "play.html?mode_key=standard_4x4_pow2_no_undo";
const DEFAULT_INVALID_MODE_MESSAGE = "无效模式，已回退到标准模式";
const DEFAULT_BOARD_WIDTH = 4;

function getModeKey(modeConfig: unknown): unknown {
  if (!modeConfig || typeof modeConfig !== "object") return undefined;
  if (!Object.prototype.hasOwnProperty.call(modeConfig, "key")) return undefined;
  return (modeConfig as { key?: unknown }).key;
}

export function resolvePlayStartupFromContext(
  options: ResolvePlayStartupFromContextOptions
): unknown | null {
  const opts = options;
  const windowLike = opts.windowLike || null;
  const locationLike = windowLike && windowLike.location ? windowLike.location : null;
  const invalidModeRedirectUrl = String(
    opts.invalidModeRedirectUrl || DEFAULT_INVALID_MODE_REDIRECT_URL
  );
  const invalidModeMessage = String(opts.invalidModeMessage || DEFAULT_INVALID_MODE_MESSAGE);
  const defaultModeKey = String(opts.defaultModeKey || DEFAULT_MODE_KEY);
  const defaultBoardWidth = Number(opts.defaultBoardWidth || DEFAULT_BOARD_WIDTH);
  const searchLike = String((locationLike && locationLike.search) || "");

  const entryPlan = opts.resolveEntryPlan({
    searchLike,
    modeCatalog: windowLike ? windowLike.ModeCatalog : undefined,
    defaultModeKey,
    invalidModeRedirectUrl
  });
  const startupContext = opts.resolveStartupContext({
    entryPlan,
    invalidModeRedirectUrl,
    invalidModeMessage,
    resolveModeConfig: opts.resolveModeConfig,
    resolveGuardState: opts.resolveGuardState
  });

  if (!startupContext || startupContext.kind === "abort") {
    const shouldAlert = !!(startupContext && startupContext.shouldAlert);
    const alertMessage = String(
      (startupContext && startupContext.alertMessage) || invalidModeMessage
    );
    const redirectUrl = String(
      (startupContext && startupContext.redirectUrl) || invalidModeRedirectUrl
    );

    if (shouldAlert && windowLike && typeof windowLike.alert === "function") {
      windowLike.alert(alertMessage);
    }
    if (locationLike) {
      locationLike.href = redirectUrl;
    }
    return null;
  }

  const modeConfig = startupContext.modeConfig;
  const challengeId = String(startupContext.challengeId || "");
  if (windowLike) {
    windowLike.GAME_MODE_CONFIG = modeConfig;
    windowLike.GAME_CHALLENGE_CONTEXT = opts.resolveChallengeContext({
      challengeId,
      modeConfig
    });
  }
  opts.applyHeader(modeConfig);

  const startupPayload = opts.resolveStartupPayload({
    modeConfig,
    inputManagerCtor: opts.inputManagerCtor,
    defaultBoardWidth
  });
  if (startupPayload) return startupPayload;

  return {
    modeKey: getModeKey(modeConfig),
    modeConfig,
    inputManagerCtor: opts.inputManagerCtor,
    defaultBoardWidth
  };
}
