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
    modeKey: "standard_4x4_pow2_no_undo",
    fallbackModeKey: "standard_4x4_pow2_no_undo",
    inputManagerCtor: ReplayInputManager,
    disableSessionSync: true,
    defaultBoardWidth: 4
  })
);
