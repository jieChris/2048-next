window.requestAnimationFrame(function () {
  function attachLegacyEngineBridge(modeKey, modeConfig, manager) {
    var bridgeApi = window.LegacyBridge;
    if (bridgeApi && typeof bridgeApi.attachLegacyEngineToWindow === "function") {
      return bridgeApi.attachLegacyEngineToWindow(manager, modeKey, modeConfig);
    }
    window.__legacyEngine = {
      manager: manager || null,
      modeKey: modeKey || "",
      modeConfig: modeConfig || null
    };
    return window.__legacyEngine;
  }

  function startGameWithBootstrap(modeKey, modeConfig) {
    var bootstrap = window.LegacyBootstrapRuntime;
    if (bootstrap && typeof bootstrap.startGame === "function") {
      return bootstrap.startGame({
        modeKey: modeKey,
        modeConfig: modeConfig,
        inputManagerCtor: CappedInputManager,
        defaultBoardWidth: 4
      });
    }

    var boardWidth = modeConfig && modeConfig.board_width ? modeConfig.board_width : 4;
    var gm = new GameManager(boardWidth, CappedInputManager, HTMLActuator, LocalScoreManager);
    window.game_manager = gm;
    attachLegacyEngineBridge(modeKey, modeConfig, window.game_manager);
    return window.game_manager;
  }

  if (window.ModeCatalog && typeof window.ModeCatalog.getMode === "function") {
    window.GAME_MODE_CONFIG = window.ModeCatalog.getMode("capped_4x4_pow2_no_undo");
  }

  startGameWithBootstrap(
    (window.GAME_MODE_CONFIG && window.GAME_MODE_CONFIG.key) || "capped_4x4_pow2_no_undo",
    window.GAME_MODE_CONFIG
  );
});
