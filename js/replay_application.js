var simplePageHostRuntime = window.CoreSimplePageHostRuntime;
if (!simplePageHostRuntime || typeof simplePageHostRuntime.applySimplePageBootstrap !== "function") {
  throw new Error("CoreSimplePageHostRuntime is required");
}

simplePageHostRuntime.applySimplePageBootstrap({
  windowLike: window,
  inputManagerCtor: window.ReplayInputManager,
  simplePageDefaults: {
    modeKey: "standard_4x4_pow2_no_undo",
    fallbackModeKey: "standard_4x4_pow2_no_undo",
    disableSessionSync: true,
    defaultBoardWidth: 4
  }
});
