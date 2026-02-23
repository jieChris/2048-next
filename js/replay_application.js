window.requestAnimationFrame(function () {
  var bootstrap = window.LegacyBootstrapRuntime;
  if (!bootstrap || typeof bootstrap.startGame !== "function") {
    throw new Error("LegacyBootstrapRuntime.startGame is required");
  }

  bootstrap.startGame({
    modeKey: "standard_4x4_pow2_no_undo",
    fallbackModeKey: "standard_4x4_pow2_no_undo",
    inputManagerCtor: ReplayInputManager,
    disableSessionSync: true,
    defaultBoardWidth: 4
  });
});
