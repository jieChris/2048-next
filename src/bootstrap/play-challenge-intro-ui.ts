export interface PlayChallengeIntroModelLike {
  entryDisplay?: string | null | undefined;
  modalDisplay?: string | null | undefined;
  title?: string | null | undefined;
  description?: string | null | undefined;
  leaderboardText?: string | null | undefined;
  bindEvents?: boolean | null | undefined;
}

export interface ResolvePlayChallengeIntroUiStateOptions {
  introModel?: PlayChallengeIntroModelLike | null | undefined;
  introButtonBound?: boolean | null | undefined;
  closeButtonBound?: boolean | null | undefined;
  modalBound?: boolean | null | undefined;
}

export interface PlayChallengeIntroUiState {
  entryDisplay: "inline-flex" | "none";
  modalDisplay: "flex" | "none";
  titleText: string;
  descriptionText: string;
  leaderboardText: string;
  bindIntroClick: boolean;
  bindCloseClick: boolean;
  bindOverlayClick: boolean;
}

export function resolvePlayChallengeIntroUiState(
  options: ResolvePlayChallengeIntroUiStateOptions
): PlayChallengeIntroUiState {
  const opts = options || {};
  const model = opts.introModel || {};
  const bindEvents = !!model.bindEvents;

  return {
    entryDisplay: model.entryDisplay === "inline-flex" ? "inline-flex" : "none",
    modalDisplay: model.modalDisplay === "flex" ? "flex" : "none",
    titleText: String(model.title || ""),
    descriptionText: String(model.description || ""),
    leaderboardText: String(model.leaderboardText || ""),
    bindIntroClick: bindEvents && !opts.introButtonBound,
    bindCloseClick: bindEvents && !opts.closeButtonBound,
    bindOverlayClick: bindEvents && !opts.modalBound
  };
}
