(function () {
  var historyPageHostRuntime = window.CoreHistoryPageHostRuntime;
  if (!historyPageHostRuntime || typeof historyPageHostRuntime.applyHistoryPageBootstrap !== "function") {
    throw new Error("CoreHistoryPageHostRuntime is required");
  }

  historyPageHostRuntime.applyHistoryPageBootstrap({
    windowLike: window,
    documentLike: document
  });
})();
