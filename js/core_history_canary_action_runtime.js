(function (global) {
  "use strict";

  if (!global) return;

  function asRuntime(value) {
    if (!value || typeof value !== "object") return null;
    return value;
  }

  function asActionPlan(value) {
    if (!value || typeof value !== "object") return null;
    return value;
  }

  function asStorageWriter(value) {
    return typeof value === "function" ? value : null;
  }

  function asStorageKey(value) {
    return typeof value === "string" ? value : "";
  }

  function writeDefaultMode(runtime, storageWriter, storageKey, mode) {
    if (runtime && typeof runtime.setStoredAdapterDefaultMode === "function") {
      return runtime.setStoredAdapterDefaultMode(mode);
    }
    if (!storageWriter) return false;
    return storageWriter(storageKey, mode || null);
  }

  function clearDefaultMode(runtime, storageWriter, storageKey) {
    if (runtime && typeof runtime.clearStoredAdapterDefaultMode === "function") {
      return runtime.clearStoredAdapterDefaultMode();
    }
    if (!storageWriter) return false;
    return storageWriter(storageKey, null);
  }

  function writeForceLegacy(runtime, storageWriter, storageKey, enabled) {
    if (runtime && typeof runtime.setStoredForceLegacy === "function") {
      return runtime.setStoredForceLegacy(enabled);
    }
    if (!storageWriter) return false;
    return storageWriter(storageKey, enabled ? "1" : null);
  }

  function applyHistoryCanaryPolicyAction(input) {
    var payload = input && typeof input === "object" ? input : null;
    var actionPlan = asActionPlan(payload && payload.actionPlan);
    if (!actionPlan || actionPlan.isSupported !== true) return false;

    var runtime = asRuntime(payload && payload.runtime);
    var storageWriter = asStorageWriter(payload && payload.writeStorageValue);
    var defaultModeStorageKey = asStorageKey(payload && payload.defaultModeStorageKey);
    var forceLegacyStorageKey = asStorageKey(payload && payload.forceLegacyStorageKey);

    var success = true;
    if (actionPlan.defaultMode === null) {
      success = clearDefaultMode(runtime, storageWriter, defaultModeStorageKey);
    } else if (typeof actionPlan.defaultMode === "string") {
      success = writeDefaultMode(runtime, storageWriter, defaultModeStorageKey, actionPlan.defaultMode);
    }

    if (success && typeof actionPlan.forceLegacy === "boolean") {
      success = writeForceLegacy(runtime, storageWriter, forceLegacyStorageKey, actionPlan.forceLegacy);
    }

    return success;
  }

  function resolveHistoryCanaryPolicyUpdateFailureNotice() {
    return "策略更新失败：请检查浏览器本地存储权限";
  }

  function resolveHistoryCanaryPolicyApplyFeedbackState(input) {
    var payload = input && typeof input === "object" ? input : null;
    var ok = payload && payload.ok === true;
    if (ok) {
      return {
        shouldReload: true,
        reloadResetPage: false,
        statusText: String((payload && payload.successNotice) || ""),
        isError: false
      };
    }

    return {
      shouldReload: false,
      reloadResetPage: false,
      statusText: String(
        (payload && payload.failureNotice) || resolveHistoryCanaryPolicyUpdateFailureNotice()
      ),
      isError: true
    };
  }

  global.CoreHistoryCanaryActionRuntime = global.CoreHistoryCanaryActionRuntime || {};
  global.CoreHistoryCanaryActionRuntime.applyHistoryCanaryPolicyAction = applyHistoryCanaryPolicyAction;
  global.CoreHistoryCanaryActionRuntime.resolveHistoryCanaryPolicyUpdateFailureNotice =
    resolveHistoryCanaryPolicyUpdateFailureNotice;
  global.CoreHistoryCanaryActionRuntime.resolveHistoryCanaryPolicyApplyFeedbackState =
    resolveHistoryCanaryPolicyApplyFeedbackState;
})(typeof window !== "undefined" ? window : undefined);
