export interface PlayHeaderHostModeConfigLike {
  [key: string]: unknown;
}

export interface PlayHeaderHostStateLike {
  bodyModeId?: string | null | undefined;
  bodyRuleset?: string | null | undefined;
  titleText?: string | null | undefined;
  introText?: string | null | undefined;
  titleDisplay?: string | null | undefined;
  introDisplay?: string | null | undefined;
}

export interface PlayHeaderHostElementStyleLike {
  display?: string | null | undefined;
}

export interface PlayHeaderHostElementLike {
  style?: PlayHeaderHostElementStyleLike | null | undefined;
  textContent?: string | null | undefined;
}

export interface PlayHeaderHostBodyLike {
  setAttribute?: ((name: string, value: string) => void) | null | undefined;
}

export interface PlayHeaderHostDocumentLike {
  body?: PlayHeaderHostBodyLike | null | undefined;
  getElementById: (id: string) => PlayHeaderHostElementLike | null;
}

export interface ResolvePlayHeaderFromContextOptions {
  modeConfig?: PlayHeaderHostModeConfigLike | null | undefined;
  documentLike?: PlayHeaderHostDocumentLike | null | undefined;
  resolveHeaderState: (modeConfig: PlayHeaderHostModeConfigLike | null | undefined) => PlayHeaderHostStateLike;
  applyChallengeModeIntro?: ((modeConfig: PlayHeaderHostModeConfigLike | null | undefined) => void) | null | undefined;
}

export interface PlayHeaderHostApplyResult {
  applied: boolean;
  hasBody: boolean;
  hasTitle: boolean;
  hasIntro: boolean;
  challengeIntroApplied: boolean;
}

export function resolvePlayHeaderFromContext(
  options: ResolvePlayHeaderFromContextOptions
): PlayHeaderHostApplyResult {
  const opts = options;
  const documentLike = opts.documentLike || null;
  if (!documentLike || typeof documentLike.getElementById !== "function") {
    return {
      applied: false,
      hasBody: false,
      hasTitle: false,
      hasIntro: false,
      challengeIntroApplied: false
    };
  }

  const body = documentLike.body || null;
  const title = documentLike.getElementById("play-mode-title");
  const intro = documentLike.getElementById("play-mode-intro");
  const headerState = opts.resolveHeaderState(opts.modeConfig || null);

  if (body && typeof body.setAttribute === "function") {
    body.setAttribute("data-mode-id", String(headerState.bodyModeId || ""));
    body.setAttribute("data-ruleset", String(headerState.bodyRuleset || ""));
  }

  if (title) {
    title.textContent = String(headerState.titleText || "");
    if (title.style) {
      title.style.display = String(headerState.titleDisplay || "");
    }
  }

  if (intro) {
    intro.textContent = String(headerState.introText || "");
    if (intro.style) {
      intro.style.display = String(headerState.introDisplay || "");
    }
  }

  let challengeIntroApplied = false;
  if (typeof opts.applyChallengeModeIntro === "function") {
    opts.applyChallengeModeIntro(opts.modeConfig || null);
    challengeIntroApplied = true;
  }

  return {
    applied: true,
    hasBody: !!(body && typeof body.setAttribute === "function"),
    hasTitle: !!title,
    hasIntro: !!intro,
    challengeIntroApplied
  };
}
