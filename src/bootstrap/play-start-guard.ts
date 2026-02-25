export interface ResolvePlayStartGuardStateOptions {
  entryModeConfig?: unknown;
  resolvedModeConfig?: unknown;
  invalidModeRedirectUrl?: string | null | undefined;
  entryRedirectUrl?: string | null | undefined;
}

export interface PlayStartGuardState {
  shouldAbort: boolean;
  shouldAlert: boolean;
  alertMessage: string;
  redirectUrl: string;
}

const DEFAULT_INVALID_MODE_REDIRECT_URL = "play.html?mode_key=standard_4x4_pow2_no_undo";
const DEFAULT_INVALID_MODE_MESSAGE = "无效模式，已回退到标准模式";
const DEFAULT_RESOLVE_MODE_REDIRECT_URL = "modes.html";

export function resolvePlayStartGuardState(
  options: ResolvePlayStartGuardStateOptions
): PlayStartGuardState {
  const opts = options || {};
  const entryModeConfig = opts.entryModeConfig;
  const resolvedModeConfig = opts.resolvedModeConfig;
  const invalidModeRedirectUrl = String(opts.invalidModeRedirectUrl || "").trim();
  const entryRedirectUrl = String(opts.entryRedirectUrl || "").trim();

  if (!entryModeConfig) {
    return {
      shouldAbort: true,
      shouldAlert: true,
      alertMessage: DEFAULT_INVALID_MODE_MESSAGE,
      redirectUrl:
        entryRedirectUrl || invalidModeRedirectUrl || DEFAULT_INVALID_MODE_REDIRECT_URL
    };
  }

  if (!resolvedModeConfig) {
    return {
      shouldAbort: true,
      shouldAlert: false,
      alertMessage: "",
      redirectUrl: DEFAULT_RESOLVE_MODE_REDIRECT_URL
    };
  }

  return {
    shouldAbort: false,
    shouldAlert: false,
    alertMessage: "",
    redirectUrl: ""
  };
}
