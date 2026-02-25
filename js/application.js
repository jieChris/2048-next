var homeRuntimeContractRuntime = window.CoreHomeRuntimeContractRuntime;
if (
  !homeRuntimeContractRuntime ||
  typeof homeRuntimeContractRuntime.resolveHomeRuntimeContracts !== "function"
) {
  throw new Error("CoreHomeRuntimeContractRuntime is required");
}
var homeStartupHostRuntime = window.CoreHomeStartupHostRuntime;
if (
  !homeStartupHostRuntime ||
  typeof homeStartupHostRuntime.resolveHomeStartupFromContext !== "function"
) {
  throw new Error("CoreHomeStartupHostRuntime is required");
}

var runtimeContracts = homeRuntimeContractRuntime.resolveHomeRuntimeContracts(window);
var homeModeRuntime = runtimeContracts.homeModeRuntime;
var undoActionRuntime = runtimeContracts.undoActionRuntime;
var bootstrap = runtimeContracts.bootstrapRuntime;

bootstrap.startGameOnAnimationFrame(function () {
  return homeStartupHostRuntime.resolveHomeStartupFromContext({
    windowLike: typeof window !== "undefined" ? window : null,
    documentLike: typeof document !== "undefined" ? document : null,
    defaultModeKey: "standard_4x4_pow2_no_undo",
    defaultBoardWidth: 4,
    inputManagerCtor: KeyboardInputManager,
    resolveHomeModeSelectionFromContext:
      homeModeRuntime.resolveHomeModeSelectionFromContext
  });
});

function handle_undo() {
  undoActionRuntime.tryTriggerUndo(window.game_manager, -1);
}
