export interface PlayPageContextLocationLike {
  search?: string | null | undefined;
  pathname?: string | null | undefined;
  hash?: string | null | undefined;
}

export interface PlayPageContextWindowLike {
  location?: PlayPageContextLocationLike | null | undefined;
}

export interface PlayPageContextDocumentLike {
  body?: unknown;
  getElementById?: (id: string) => unknown;
}

export interface ResolvePlayCustomSpawnModeConfigFromPageContextOptions {
  modeKey: string;
  modeConfig: unknown;
  storageKey: string;
  windowLike?: PlayPageContextWindowLike | null | undefined;
  storageRuntimeLike: unknown;
  playCustomSpawnRuntimeLike: unknown;
  playCustomSpawnHostRuntimeLike: {
    resolvePlayCustomSpawnModeConfigFromContext: (options: {
      modeKey: string;
      modeConfig: unknown;
      searchLike: string;
      pathname: string;
      hash: string;
      storageKey: string;
      windowLike?: PlayPageContextWindowLike | null | undefined;
      storageRuntimeLike: unknown;
      playCustomSpawnRuntimeLike: unknown;
    }) => unknown;
  };
}

export interface ApplyPlayHeaderFromPageContextOptions {
  modeConfig: unknown;
  documentLike?: PlayPageContextDocumentLike | null | undefined;
  playHeaderRuntimeLike: {
    resolvePlayHeaderState: (modeConfig: unknown) => unknown;
  };
  playHeaderHostRuntimeLike: {
    resolvePlayHeaderFromContext: (options: {
      modeConfig: unknown;
      documentLike?: PlayPageContextDocumentLike | null | undefined;
      resolveHeaderState: (modeConfig: unknown) => unknown;
      applyChallengeModeIntro: (modeConfig: unknown) => void;
    }) => unknown;
  };
  playChallengeIntroRuntimeLike: {
    resolvePlayChallengeIntroModel: (options: unknown) => unknown;
  };
  playChallengeIntroUiRuntimeLike: {
    resolvePlayChallengeIntroUiState: (options: unknown) => unknown;
  };
  playChallengeIntroActionRuntimeLike: {
    resolvePlayChallengeIntroActionState: (options: unknown) => unknown;
  };
  playChallengeIntroHostRuntimeLike: {
    resolvePlayChallengeIntroFromContext: (options: {
      modeConfig: unknown;
      featureEnabled: boolean;
      documentLike?: PlayPageContextDocumentLike | null | undefined;
      resolveIntroModel: (options: unknown) => unknown;
      resolveIntroUiState: (options: unknown) => unknown;
      resolveIntroActionState: (options: unknown) => unknown;
    }) => unknown;
  };
}

export function resolvePlayCustomSpawnModeConfigFromPageContext(
  options: ResolvePlayCustomSpawnModeConfigFromPageContextOptions
): unknown {
  const opts = options;
  const windowLike = opts.windowLike || null;
  const locationLike = windowLike && windowLike.location ? windowLike.location : null;
  return opts.playCustomSpawnHostRuntimeLike.resolvePlayCustomSpawnModeConfigFromContext({
    modeKey: opts.modeKey,
    modeConfig: opts.modeConfig,
    searchLike: String((locationLike && locationLike.search) || ""),
    pathname: String((locationLike && locationLike.pathname) || ""),
    hash: String((locationLike && locationLike.hash) || ""),
    storageKey: String(opts.storageKey || ""),
    windowLike,
    storageRuntimeLike: opts.storageRuntimeLike,
    playCustomSpawnRuntimeLike: opts.playCustomSpawnRuntimeLike
  });
}

export function applyPlayHeaderFromPageContext(
  options: ApplyPlayHeaderFromPageContextOptions
): unknown {
  const opts = options;
  const documentLike = opts.documentLike || null;

  return opts.playHeaderHostRuntimeLike.resolvePlayHeaderFromContext({
    modeConfig: opts.modeConfig,
    documentLike,
    resolveHeaderState: opts.playHeaderRuntimeLike.resolvePlayHeaderState,
    applyChallengeModeIntro(modeConfig) {
      opts.playChallengeIntroHostRuntimeLike.resolvePlayChallengeIntroFromContext({
        modeConfig,
        featureEnabled: false,
        documentLike,
        resolveIntroModel: opts.playChallengeIntroRuntimeLike.resolvePlayChallengeIntroModel,
        resolveIntroUiState: opts.playChallengeIntroUiRuntimeLike.resolvePlayChallengeIntroUiState,
        resolveIntroActionState:
          opts.playChallengeIntroActionRuntimeLike.resolvePlayChallengeIntroActionState
      });
    }
  });
}
