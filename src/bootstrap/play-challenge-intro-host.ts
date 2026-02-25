export interface PlayChallengeIntroHostElementStyleLike {
  display?: string | null | undefined;
  setProperty?: ((name: string, value: string, priority?: string) => void) | null | undefined;
}

export interface PlayChallengeIntroHostElementLike {
  style?: PlayChallengeIntroHostElementStyleLike | null | undefined;
  textContent?: string | null | undefined;
  __modeIntroBound?: boolean | null | undefined;
  addEventListener?: ((type: string, listener: (event: unknown) => void) => void) | null | undefined;
}

export interface PlayChallengeIntroHostDocumentLike {
  getElementById: (id: string) => PlayChallengeIntroHostElementLike | null;
}

export interface PlayChallengeIntroHostModeConfigLike {
  key?: unknown;
}

export interface PlayChallengeIntroHostActionState {
  shouldPreventDefault: boolean;
  shouldApplyDisplay: boolean;
  nextModalDisplay: "flex" | "none";
}

export interface PlayChallengeIntroHostUiState {
  entryDisplay: "inline-flex" | "none";
  modalDisplay: "flex" | "none";
  titleText: string;
  descriptionText: string;
  leaderboardText: string;
  bindIntroClick: boolean;
  bindCloseClick: boolean;
  bindOverlayClick: boolean;
}

export interface ResolvePlayChallengeIntroFromContextOptions {
  modeConfig?: PlayChallengeIntroHostModeConfigLike | null | undefined;
  featureEnabled?: boolean | null | undefined;
  documentLike?: PlayChallengeIntroHostDocumentLike | null | undefined;
  resolveIntroModel: (options: {
    modeKey: string;
    featureEnabled: boolean;
  }) => unknown;
  resolveIntroUiState: (options: {
    introModel: unknown;
    introButtonBound: boolean;
    closeButtonBound: boolean;
    modalBound: boolean;
  }) => PlayChallengeIntroHostUiState;
  resolveIntroActionState: (options: {
    action: string;
    eventTargetIsModal?: boolean;
  }) => PlayChallengeIntroHostActionState;
}

export interface PlayChallengeIntroHostApplyResult {
  applied: boolean;
  hasRequiredElements: boolean;
  bindIntroClick: boolean;
  bindCloseClick: boolean;
  bindOverlayClick: boolean;
}

function applyDisplay(
  target: PlayChallengeIntroHostElementLike,
  displayValue: string,
  useImportant: boolean
): void {
  const style = target && target.style ? target.style : null;
  if (!style) return;
  if (useImportant && typeof style.setProperty === "function") {
    style.setProperty("display", displayValue, "important");
    return;
  }
  style.display = displayValue;
}

export function resolvePlayChallengeIntroFromContext(
  options: ResolvePlayChallengeIntroFromContextOptions
): PlayChallengeIntroHostApplyResult {
  const opts = options;
  const documentLike = opts.documentLike || null;
  if (!documentLike || typeof documentLike.getElementById !== "function") {
    return {
      applied: false,
      hasRequiredElements: false,
      bindIntroClick: false,
      bindCloseClick: false,
      bindOverlayClick: false
    };
  }

  const introBtn = documentLike.getElementById("top-mode-intro-btn");
  const modal = documentLike.getElementById("mode-intro-modal");
  const closeBtn = documentLike.getElementById("mode-intro-close-btn");
  const title = documentLike.getElementById("mode-intro-title");
  const desc = documentLike.getElementById("mode-intro-desc");
  const leaderboard = documentLike.getElementById("mode-intro-leaderboard");
  if (!introBtn || !modal || !closeBtn || !title || !desc) {
    return {
      applied: false,
      hasRequiredElements: false,
      bindIntroClick: false,
      bindCloseClick: false,
      bindOverlayClick: false
    };
  }

  const modeKey = opts.modeConfig && opts.modeConfig.key ? String(opts.modeConfig.key) : "";
  const introModel = opts.resolveIntroModel({
    modeKey,
    featureEnabled: !!opts.featureEnabled
  });
  const introUiState = opts.resolveIntroUiState({
    introModel,
    introButtonBound: !!introBtn.__modeIntroBound,
    closeButtonBound: !!closeBtn.__modeIntroBound,
    modalBound: !!modal.__modeIntroBound
  });

  applyDisplay(introBtn, introUiState.entryDisplay, true);
  applyDisplay(modal, introUiState.modalDisplay, false);
  title.textContent = introUiState.titleText;
  desc.textContent = introUiState.descriptionText;
  if (leaderboard) leaderboard.textContent = introUiState.leaderboardText;

  const openActionState = opts.resolveIntroActionState({
    action: "open"
  });
  const closeActionState = opts.resolveIntroActionState({
    action: "close"
  });

  if (introUiState.bindIntroClick && typeof introBtn.addEventListener === "function") {
    introBtn.__modeIntroBound = true;
    introBtn.addEventListener("click", (event) => {
      if (
        event &&
        openActionState.shouldPreventDefault &&
        typeof (event as { preventDefault?: unknown }).preventDefault === "function"
      ) {
        (event as { preventDefault: () => void }).preventDefault();
      }
      if (openActionState.shouldApplyDisplay) {
        applyDisplay(modal, openActionState.nextModalDisplay, false);
      }
    });
  }

  if (introUiState.bindCloseClick && typeof closeBtn.addEventListener === "function") {
    closeBtn.__modeIntroBound = true;
    closeBtn.addEventListener("click", (event) => {
      if (
        event &&
        closeActionState.shouldPreventDefault &&
        typeof (event as { preventDefault?: unknown }).preventDefault === "function"
      ) {
        (event as { preventDefault: () => void }).preventDefault();
      }
      if (closeActionState.shouldApplyDisplay) {
        applyDisplay(modal, closeActionState.nextModalDisplay, false);
      }
    });
  }

  if (introUiState.bindOverlayClick && typeof modal.addEventListener === "function") {
    modal.__modeIntroBound = true;
    modal.addEventListener("click", (event) => {
      const overlayActionState = opts.resolveIntroActionState({
        action: "overlay-click",
        eventTargetIsModal: !!(event && (event as { target?: unknown }).target === modal)
      });
      if (overlayActionState.shouldApplyDisplay) {
        applyDisplay(modal, overlayActionState.nextModalDisplay, false);
      }
    });
  }

  return {
    applied: true,
    hasRequiredElements: true,
    bindIntroClick: !!introUiState.bindIntroClick,
    bindCloseClick: !!introUiState.bindCloseClick,
    bindOverlayClick: !!introUiState.bindOverlayClick
  };
}
