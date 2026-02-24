(function (global) {
  "use strict";

  if (!global) return;

  function canTriggerUndo(manager) {
    return !!(
      manager &&
      typeof manager.isUndoInteractionEnabled === "function" &&
      typeof manager.move === "function" &&
      manager.isUndoInteractionEnabled()
    );
  }

  function tryTriggerUndo(manager, direction) {
    var dir = typeof direction === "number" ? direction : -1;
    if (!canTriggerUndo(manager)) return false;
    manager.move(dir);
    return true;
  }

  global.CoreUndoActionRuntime = global.CoreUndoActionRuntime || {};
  global.CoreUndoActionRuntime.canTriggerUndo = canTriggerUndo;
  global.CoreUndoActionRuntime.tryTriggerUndo = tryTriggerUndo;
})(typeof window !== "undefined" ? window : undefined);
