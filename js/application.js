var bootstrap = window.LegacyBootstrapRuntime;
if (!bootstrap || typeof bootstrap.startGameOnAnimationFrame !== "function") {
  throw new Error("LegacyBootstrapRuntime.startGameOnAnimationFrame is required");
}
var homeModeRuntime = window.CoreHomeModeRuntime;
if (
  !homeModeRuntime ||
  typeof homeModeRuntime.resolveHomeModeSelection !== "function"
) {
  throw new Error("CoreHomeModeRuntime is required");
}
var undoActionRuntime = window.CoreUndoActionRuntime;
if (
  !undoActionRuntime ||
  typeof undoActionRuntime.tryTriggerUndo !== "function"
) {
  throw new Error("CoreUndoActionRuntime is required");
}

bootstrap.startGameOnAnimationFrame(function () {
  var selection = homeModeRuntime.resolveHomeModeSelection({
    dataModeId:
      typeof document !== "undefined" && document.body
        ? document.body.getAttribute("data-mode-id")
        : null,
    defaultModeKey: "standard_4x4_pow2_no_undo",
    searchLike: window.location.search || "",
    modeCatalog: window.ModeCatalog
  });

  window.GAME_MODE_CONFIG = selection.modeConfig;

  return {
    modeKey: selection.modeKey,
    modeConfig: window.GAME_MODE_CONFIG,
    inputManagerCtor: KeyboardInputManager,
    defaultBoardWidth: 4
  };
});

function handle_undo() {
  undoActionRuntime.tryTriggerUndo(window.game_manager, -1);
}
