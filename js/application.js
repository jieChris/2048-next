var bootstrap = window.LegacyBootstrapRuntime;
if (!bootstrap || typeof bootstrap.startGameOnAnimationFrame !== "function") {
  throw new Error("LegacyBootstrapRuntime.startGameOnAnimationFrame is required");
}
var practiceModeRuntime = window.CorePracticeModeRuntime;
if (
  !practiceModeRuntime ||
  typeof practiceModeRuntime.parsePracticeRuleset !== "function" ||
  typeof practiceModeRuntime.buildPracticeModeConfig !== "function"
) {
  throw new Error("CorePracticeModeRuntime is required");
}

bootstrap.startGameOnAnimationFrame(function () {
  var modeKey = "standard_4x4_pow2_no_undo";

  if (typeof document !== "undefined" && document.body) {
    modeKey = document.body.getAttribute("data-mode-id") || modeKey;
  }

  if (window.ModeCatalog && typeof window.ModeCatalog.getMode === "function") {
    window.GAME_MODE_CONFIG = window.ModeCatalog.getMode(modeKey) ||
      window.ModeCatalog.getMode("standard_4x4_pow2_no_undo");

    if (modeKey === "practice_legacy" && window.GAME_MODE_CONFIG) {
      window.GAME_MODE_CONFIG = practiceModeRuntime.buildPracticeModeConfig(
        window.GAME_MODE_CONFIG,
        practiceModeRuntime.parsePracticeRuleset(window.location.search || "")
      );
    }
  }

  return {
    modeKey: modeKey,
    modeConfig: window.GAME_MODE_CONFIG,
    inputManagerCtor: KeyboardInputManager,
    defaultBoardWidth: 4
  };
});

function handle_undo() {
  if (window.game_manager && window.game_manager.isUndoInteractionEnabled && window.game_manager.isUndoInteractionEnabled()) {
    window.game_manager.move(-1);
  }
}
