(function (global) {
  "use strict";

  if (!global) return;

  function planReplayDispatch(input) {
    var opts = input || {};

    if (opts.kind === "m") {
      return {
        method: "move",
        args: [opts.dir]
      };
    }

    if (opts.kind === "u") {
      return {
        method: "move",
        args: [-1]
      };
    }

    if (opts.kind === "p") {
      return {
        method: "insertCustomTile",
        args: [opts.x, opts.y, opts.value]
      };
    }

    throw "Unknown replay action";
  }

  global.CoreReplayDispatchRuntime = global.CoreReplayDispatchRuntime || {};
  global.CoreReplayDispatchRuntime.planReplayDispatch = planReplayDispatch;
})(typeof window !== "undefined" ? window : undefined);
