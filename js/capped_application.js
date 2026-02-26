var simplePageHostRuntime = window.CoreSimplePageHostRuntime;
if (!simplePageHostRuntime || typeof simplePageHostRuntime.applySimplePageBootstrap !== "function") {
  throw new Error("CoreSimplePageHostRuntime is required");
}

simplePageHostRuntime.applySimplePageBootstrap({
  windowLike: window,
  inputManagerCtor: window.CappedInputManager,
  simplePageDefaults: {
    modeKey: "capped_4x4_pow2_no_undo",
    fallbackModeKey: "capped_4x4_pow2_no_undo",
    defaultBoardWidth: 4
  }
});
