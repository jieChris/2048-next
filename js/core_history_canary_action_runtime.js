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

  function asActionPlanResolver(value) {
    return typeof value === "function" ? value : null;
  }

  function asActionNameResolver(value) {
    return typeof value === "function" ? value : null;
  }

  function asActionNoticeResolver(value) {
    return typeof value === "function" ? value : null;
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

  function applyHistoryCanaryPolicyActionByName(input) {
    var payload = input && typeof input === "object" ? input : null;
    var resolveActionPlan = asActionPlanResolver(payload && payload.resolveActionPlan);
    if (!resolveActionPlan) return false;

    var actionName = String((payload && payload.actionName) || "");
    var actionPlan = resolveActionPlan(actionName);
    return applyHistoryCanaryPolicyAction({
      actionPlan: actionPlan,
      runtime: payload && payload.runtime,
      writeStorageValue: payload && payload.writeStorageValue,
      defaultModeStorageKey: payload && payload.defaultModeStorageKey,
      forceLegacyStorageKey: payload && payload.forceLegacyStorageKey
    });
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

  function applyHistoryCanaryPolicyActionByNameWithFeedback(input) {
    var payload = input && typeof input === "object" ? input : null;
    var ok = applyHistoryCanaryPolicyActionByName({
      actionName: payload && payload.actionName,
      resolveActionPlan: payload && payload.resolveActionPlan,
      runtime: payload && payload.runtime,
      writeStorageValue: payload && payload.writeStorageValue,
      defaultModeStorageKey: payload && payload.defaultModeStorageKey,
      forceLegacyStorageKey: payload && payload.forceLegacyStorageKey
    });
    return resolveHistoryCanaryPolicyApplyFeedbackState({
      ok: ok,
      successNotice: payload && payload.successNotice,
      failureNotice: payload && payload.failureNotice
    });
  }

  function applyHistoryCanaryPanelAction(input) {
    var payload = input && typeof input === "object" ? input : null;
    var resolveActionName = asActionNameResolver(payload && payload.resolveActionName);
    var actionName = resolveActionName ? resolveActionName(payload && payload.target) : "";
    var resolveActionNotice = asActionNoticeResolver(payload && payload.resolveActionNotice);
    var successNotice = resolveActionNotice ? resolveActionNotice(actionName || "") : "";
    return applyHistoryCanaryPolicyActionByNameWithFeedback({
      actionName: actionName || "",
      resolveActionPlan: payload && payload.resolveActionPlan,
      runtime: payload && payload.runtime,
      writeStorageValue: payload && payload.writeStorageValue,
      defaultModeStorageKey: payload && payload.defaultModeStorageKey,
      forceLegacyStorageKey: payload && payload.forceLegacyStorageKey,
      successNotice: successNotice,
      failureNotice: payload && payload.failureNotice
    });
  }

  global.CoreHistoryCanaryActionRuntime = global.CoreHistoryCanaryActionRuntime || {};
  global.CoreHistoryCanaryActionRuntime.applyHistoryCanaryPolicyAction = applyHistoryCanaryPolicyAction;
  global.CoreHistoryCanaryActionRuntime.applyHistoryCanaryPolicyActionByName =
    applyHistoryCanaryPolicyActionByName;
  global.CoreHistoryCanaryActionRuntime.resolveHistoryCanaryPolicyUpdateFailureNotice =
    resolveHistoryCanaryPolicyUpdateFailureNotice;
  global.CoreHistoryCanaryActionRuntime.resolveHistoryCanaryPolicyApplyFeedbackState =
    resolveHistoryCanaryPolicyApplyFeedbackState;
  global.CoreHistoryCanaryActionRuntime.applyHistoryCanaryPolicyActionByNameWithFeedback =
    applyHistoryCanaryPolicyActionByNameWithFeedback;
  global.CoreHistoryCanaryActionRuntime.applyHistoryCanaryPanelAction =
    applyHistoryCanaryPanelAction;
})(typeof window !== "undefined" ? window : undefined);
