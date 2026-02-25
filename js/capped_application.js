var simpleRuntimeContractRuntime = window.CoreSimpleRuntimeContractRuntime;
if (
  !simpleRuntimeContractRuntime ||
  typeof simpleRuntimeContractRuntime.resolveSimpleBootstrapRuntime !== "function"
) {
  throw new Error("CoreSimpleRuntimeContractRuntime is required");
}
var simpleStartupRuntime = window.CoreSimpleStartupRuntime;
if (
  !simpleStartupRuntime ||
  typeof simpleStartupRuntime.resolveSimpleStartupPayload !== "function"
) {
  throw new Error("CoreSimpleStartupRuntime is required");
}

var bootstrap = simpleRuntimeContractRuntime.resolveSimpleBootstrapRuntime(window);
bootstrap.startGameOnAnimationFrame(
  simpleStartupRuntime.resolveSimpleStartupPayload({
    modeKey: "capped_4x4_pow2_no_undo",
    fallbackModeKey: "capped_4x4_pow2_no_undo",
    inputManagerCtor: CappedInputManager,
    defaultBoardWidth: 4
  })
);
