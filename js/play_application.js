(function () {
  var playPageHostRuntime = window.CorePlayPageHostRuntime;
  if (!playPageHostRuntime || typeof playPageHostRuntime.applyPlayPageBootstrap !== "function") {
    throw new Error("CorePlayPageHostRuntime is required");
  }

  playPageHostRuntime.applyPlayPageBootstrap({
    windowLike: window,
    inputManagerCtor: window.KeyboardInputManager
  });
})();
