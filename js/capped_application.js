var bootstrap = window.LegacyBootstrapRuntime;
if (!bootstrap || typeof bootstrap.startGameOnAnimationFrame !== "function") {
  throw new Error("LegacyBootstrapRuntime.startGameOnAnimationFrame is required");
}

bootstrap.startGameOnAnimationFrame({
  modeKey: "capped_4x4_pow2_no_undo",
  fallbackModeKey: "capped_4x4_pow2_no_undo",
  inputManagerCtor: CappedInputManager,
  defaultBoardWidth: 4
});
