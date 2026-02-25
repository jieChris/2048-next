(function (global) {
  "use strict";

  if (!global) return;

  function resolvePlayCustomSpawnModeConfigFromPageContext(options) {
    var opts = options || {};
    var windowLike = opts.windowLike || null;
    var locationLike = windowLike && windowLike.location ? windowLike.location : null;
    return opts.playCustomSpawnHostRuntimeLike.resolvePlayCustomSpawnModeConfigFromContext({
      modeKey: opts.modeKey,
      modeConfig: opts.modeConfig,
      searchLike: String((locationLike && locationLike.search) || ""),
      pathname: String((locationLike && locationLike.pathname) || ""),
      hash: String((locationLike && locationLike.hash) || ""),
      storageKey: String(opts.storageKey || ""),
      windowLike: windowLike,
      storageRuntimeLike: opts.storageRuntimeLike,
      playCustomSpawnRuntimeLike: opts.playCustomSpawnRuntimeLike
    });
  }

  function applyPlayHeaderFromPageContext(options) {
    var opts = options || {};
    var documentLike = opts.documentLike || null;
    return opts.playHeaderHostRuntimeLike.resolvePlayHeaderFromContext({
      modeConfig: opts.modeConfig,
      documentLike: documentLike,
      resolveHeaderState: opts.playHeaderRuntimeLike.resolvePlayHeaderState,
      applyChallengeModeIntro: function (modeConfig) {
        opts.playChallengeIntroHostRuntimeLike.resolvePlayChallengeIntroFromContext({
          modeConfig: modeConfig,
          featureEnabled: false,
          documentLike: documentLike,
          resolveIntroModel: opts.playChallengeIntroRuntimeLike.resolvePlayChallengeIntroModel,
          resolveIntroUiState: opts.playChallengeIntroUiRuntimeLike.resolvePlayChallengeIntroUiState,
          resolveIntroActionState:
            opts.playChallengeIntroActionRuntimeLike.resolvePlayChallengeIntroActionState
        });
      }
    });
  }

  global.CorePlayPageContextRuntime = global.CorePlayPageContextRuntime || {};
  global.CorePlayPageContextRuntime.resolvePlayCustomSpawnModeConfigFromPageContext =
    resolvePlayCustomSpawnModeConfigFromPageContext;
  global.CorePlayPageContextRuntime.applyPlayHeaderFromPageContext =
    applyPlayHeaderFromPageContext;
})(typeof window !== "undefined" ? window : undefined);
