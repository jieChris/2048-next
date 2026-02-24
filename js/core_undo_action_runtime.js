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

  function resolveUndoModeId(input) {
    var modeIdRaw = input && input.modeId;
    if (typeof modeIdRaw === "string" && modeIdRaw.trim()) {
      return modeIdRaw.trim().toLowerCase();
    }

    var managerMode = input && input.manager && input.manager.mode;
    if (typeof managerMode === "string" && managerMode.trim()) {
      return managerMode.trim().toLowerCase();
    }

    var configMode = input && input.globalModeConfig && input.globalModeConfig.key;
    if (typeof configMode === "string" && configMode.trim()) {
      return configMode.trim().toLowerCase();
    }

    return "";
  }

  function isUndoCapableMode(input) {
    var modeId = resolveUndoModeId(input || {});
    var manager = input && input.manager ? input.manager : null;

    if (modeId) {
      if (modeId.indexOf("no_undo") !== -1 || modeId.indexOf("no-undo") !== -1) return false;
      if (modeId === "capped" || modeId.indexOf("capped") !== -1) return false;
      if (modeId.indexOf("undo_only") !== -1 || modeId.indexOf("undo-only") !== -1) return true;
    }

    var managerExplicitUndo =
      manager &&
      manager.modeConfig &&
      typeof manager.modeConfig.undo_enabled === "boolean"
        ? manager.modeConfig.undo_enabled
        : null;
    if (typeof managerExplicitUndo === "boolean") return managerExplicitUndo;

    var globalExplicitUndo =
      input &&
      input.globalModeConfig &&
      typeof input.globalModeConfig.undo_enabled === "boolean"
        ? input.globalModeConfig.undo_enabled
        : null;
    if (typeof globalExplicitUndo === "boolean") return globalExplicitUndo;

    if (!manager) return false;
    try {
      if (typeof manager.isUndoAllowedByMode === "function") {
        return !!manager.isUndoAllowedByMode(modeId || String(manager.mode || ""));
      }
    } catch (_err) {}

    return !!manager.undoEnabled;
  }

  function isUndoInteractionEnabled(manager) {
    return !!(
      manager &&
      typeof manager.isUndoInteractionEnabled === "function" &&
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
  global.CoreUndoActionRuntime.resolveUndoModeId = resolveUndoModeId;
  global.CoreUndoActionRuntime.isUndoCapableMode = isUndoCapableMode;
  global.CoreUndoActionRuntime.isUndoInteractionEnabled = isUndoInteractionEnabled;
  global.CoreUndoActionRuntime.tryTriggerUndo = tryTriggerUndo;
})(typeof window !== "undefined" ? window : undefined);
