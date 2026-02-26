var homePageHostRuntime = window.CoreHomePageHostRuntime;
if (
  !homePageHostRuntime ||
  typeof homePageHostRuntime.applyHomePageBootstrap !== "function" ||
  typeof homePageHostRuntime.applyHomePageUndo !== "function"
) {
  throw new Error("CoreHomePageHostRuntime is required");
}

homePageHostRuntime.applyHomePageBootstrap({
  windowLike: window,
  documentLike: document,
  inputManagerCtor: window.KeyboardInputManager
});

function handle_undo() {
  homePageHostRuntime.applyHomePageUndo({
    windowLike: window
  });
}
