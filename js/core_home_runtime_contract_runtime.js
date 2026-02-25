(function (global) {
  "use strict";

  if (!global) return;

  function hasFunction(target, key) {
    if (!target || typeof target !== "object") return false;
    return typeof target[key] === "function";
  }

  function requireRuntimeFunctions(target, functionNames, errorMessage) {
    if (!target || typeof target !== "object") {
      throw new Error(errorMessage);
    }
    for (var i = 0; i < functionNames.length; i += 1) {
      if (!hasFunction(target, functionNames[i])) {
        throw new Error(errorMessage);
      }
    }
    return target;
  }

  function resolveHomeRuntimeContracts(windowLike) {
    var source = windowLike || {};
    var homeModeRuntime = requireRuntimeFunctions(
      source.CoreHomeModeRuntime,
      ["resolveHomeModeSelection", "resolveHomeModeSelectionFromContext"],
      "CoreHomeModeRuntime is required"
    );
    var undoActionRuntime = requireRuntimeFunctions(
      source.CoreUndoActionRuntime,
      ["tryTriggerUndo"],
      "CoreUndoActionRuntime is required"
    );
    var bootstrapRuntime = requireRuntimeFunctions(
      source.LegacyBootstrapRuntime,
      ["startGameOnAnimationFrame"],
      "LegacyBootstrapRuntime.startGameOnAnimationFrame is required"
    );

    return {
      homeModeRuntime: homeModeRuntime,
      undoActionRuntime: undoActionRuntime,
      bootstrapRuntime: bootstrapRuntime
    };
  }

  global.CoreHomeRuntimeContractRuntime = global.CoreHomeRuntimeContractRuntime || {};
  global.CoreHomeRuntimeContractRuntime.resolveHomeRuntimeContracts = resolveHomeRuntimeContracts;
})(typeof window !== "undefined" ? window : undefined);
