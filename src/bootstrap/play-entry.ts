import { resolveCatalogModeWithDefault, type ModeCatalogLike } from "./mode-catalog";
import {
  DEFAULT_PLAY_MODE_KEY,
  parsePlayChallengeId,
  parsePlayModeKey
} from "./play-query";

type SearchLike = string | URLSearchParams | null | undefined;

export interface ResolvePlayEntryPlanOptions {
  searchLike?: SearchLike;
  modeCatalog?: ModeCatalogLike | null | undefined;
  defaultModeKey?: string | null | undefined;
  invalidModeRedirectUrl?: string | null | undefined;
}

export interface PlayEntryPlan {
  modeKey: string;
  challengeId: string;
  modeConfig: Record<string, unknown> | null;
  redirectUrl: string | null;
}

function normalizeDefaultModeKey(defaultModeKey: string | null | undefined): string {
  const key = String(defaultModeKey || DEFAULT_PLAY_MODE_KEY).trim();
  return key || DEFAULT_PLAY_MODE_KEY;
}

export function buildInvalidPlayModeRedirectUrl(
  defaultModeKey: string | null | undefined
): string {
  return "play.html?mode_key=" + encodeURIComponent(normalizeDefaultModeKey(defaultModeKey));
}

export function resolvePlayEntryPlan(options: ResolvePlayEntryPlanOptions): PlayEntryPlan {
  const opts = options || {};
  const defaultModeKey = normalizeDefaultModeKey(opts.defaultModeKey);
  const modeKey = parsePlayModeKey(opts.searchLike || "", defaultModeKey);
  const challengeId = parsePlayChallengeId(opts.searchLike || "");
  const modeConfig = resolveCatalogModeWithDefault(
    opts.modeCatalog || null,
    modeKey,
    defaultModeKey
  );
  if (modeConfig) {
    return {
      modeKey,
      challengeId,
      modeConfig,
      redirectUrl: null
    };
  }

  const redirectUrl =
    typeof opts.invalidModeRedirectUrl === "string" && opts.invalidModeRedirectUrl
      ? opts.invalidModeRedirectUrl
      : buildInvalidPlayModeRedirectUrl(defaultModeKey);
  return {
    modeKey,
    challengeId,
    modeConfig: null,
    redirectUrl
  };
}
