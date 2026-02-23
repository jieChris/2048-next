window.requestAnimationFrame(function () {
  var bootstrap = window.LegacyBootstrapRuntime;
  if (!bootstrap || typeof bootstrap.startGame !== "function") {
    throw new Error("LegacyBootstrapRuntime.startGame is required");
  }

  bootstrap.startGame({
    modeKey: "capped_4x4_pow2_no_undo",
    fallbackModeKey: "capped_4x4_pow2_no_undo",
    inputManagerCtor: CappedInputManager,
    defaultBoardWidth: 4
  });
});
