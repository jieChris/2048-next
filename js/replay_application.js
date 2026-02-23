var bootstrap = window.LegacyBootstrapRuntime;
if (!bootstrap || typeof bootstrap.startGameOnAnimationFrame !== "function") {
  throw new Error("LegacyBootstrapRuntime.startGameOnAnimationFrame is required");
}

bootstrap.startGameOnAnimationFrame({
  modeKey: "standard_4x4_pow2_no_undo",
  fallbackModeKey: "standard_4x4_pow2_no_undo",
  inputManagerCtor: ReplayInputManager,
  disableSessionSync: true,
  defaultBoardWidth: 4
});
