export interface PlayStartupContextEntryPlanLike {
  modeKey?: string | null | undefined;
  challengeId?: string | null | undefined;
  modeConfig?: unknown;
  redirectUrl?: string | null | undefined;
}

export interface PlayStartupContextGuardStateLike {
  shouldAbort?: boolean | null | undefined;
  shouldAlert?: boolean | null | undefined;
  alertMessage?: string | null | undefined;
  redirectUrl?: string | null | undefined;
}

export interface ResolvePlayStartupContextOptions {
  entryPlan?: PlayStartupContextEntryPlanLike | null | undefined;
  invalidModeRedirectUrl?: string | null | undefined;
  invalidModeMessage?: string | null | undefined;
  resolveModeConfig: (modeKey: string, modeConfig: unknown) => unknown;
  resolveGuardState: (options: {
    entryModeConfig?: unknown;
    resolvedModeConfig?: unknown;
    invalidModeRedirectUrl?: string;
    entryRedirectUrl?: string;
  }) => PlayStartupContextGuardStateLike | null | undefined;
}

export interface PlayStartupContextAbortResult {
  kind: "abort";
  shouldAlert: boolean;
  alertMessage: string;
  redirectUrl: string;
}

export interface PlayStartupContextStartResult {
  kind: "start";
  modeConfig: unknown;
  challengeId: string;
}

export type PlayStartupContextResult =
  | PlayStartupContextAbortResult
  | PlayStartupContextStartResult;

const DEFAULT_INVALID_MODE_REDIRECT_URL = "play.html?mode_key=standard_4x4_pow2_no_undo";
const DEFAULT_INVALID_MODE_MESSAGE = "无效模式，已回退到标准模式";
const DEFAULT_RESOLVED_MODE_REDIRECT_URL = "modes.html";

export function resolvePlayStartupContext(
  options: ResolvePlayStartupContextOptions
): PlayStartupContextResult {
  const opts = options;
  const entryPlan = opts.entryPlan || {};
  const modeKey = String(entryPlan.modeKey || "");
  const challengeId = String(entryPlan.challengeId || "");
  const entryModeConfig = entryPlan.modeConfig;
  const invalidModeRedirectUrl = String(
    opts.invalidModeRedirectUrl || DEFAULT_INVALID_MODE_REDIRECT_URL
  );
  const invalidModeMessage = String(opts.invalidModeMessage || DEFAULT_INVALID_MODE_MESSAGE);

  const guardAfterEntry =
    opts.resolveGuardState({
      entryModeConfig,
      resolvedModeConfig: entryModeConfig,
      invalidModeRedirectUrl,
      entryRedirectUrl: String(entryPlan.redirectUrl || "")
    }) || {};

  if (guardAfterEntry.shouldAbort) {
    return {
      kind: "abort",
      shouldAlert: !!guardAfterEntry.shouldAlert,
      alertMessage: String(guardAfterEntry.alertMessage || invalidModeMessage),
      redirectUrl: String(guardAfterEntry.redirectUrl || invalidModeRedirectUrl)
    };
  }

  const resolvedModeConfig = opts.resolveModeConfig(modeKey, entryModeConfig);
  const guardAfterResolve =
    opts.resolveGuardState({
      entryModeConfig: true,
      resolvedModeConfig: resolvedModeConfig
    }) || {};

  if (guardAfterResolve.shouldAbort) {
    return {
      kind: "abort",
      shouldAlert: false,
      alertMessage: "",
      redirectUrl: String(guardAfterResolve.redirectUrl || DEFAULT_RESOLVED_MODE_REDIRECT_URL)
    };
  }

  return {
    kind: "start",
    modeConfig: resolvedModeConfig,
    challengeId
  };
}
