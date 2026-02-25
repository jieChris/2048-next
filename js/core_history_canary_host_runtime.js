(function (global) {
  "use strict";

  if (!global) return;

  function isRecord(value) {
    return !!value && typeof value === "object";
  }

  function asFunction(value) {
    return typeof value === "function" ? value : null;
  }

  function toRecord(value) {
    return isRecord(value) ? value : {};
  }

  function toText(value) {
    return typeof value === "string" ? value : "";
  }

  function createNoopFeedbackState() {
    return {
      shouldReload: false,
      reloadResetPage: false,
      statusText: "",
      isError: false
    };
  }

  function resolveHistoryCanaryPanelRenderState(input) {
    var source = isRecord(input) ? input : {};
    var canarySourceRuntime = toRecord(source.historyCanarySourceRuntime);
    var canaryPolicyRuntime = toRecord(source.historyCanaryPolicyRuntime);
    var canaryViewRuntime = toRecord(source.historyCanaryViewRuntime);
    var canaryPanelRuntime = toRecord(source.historyCanaryPanelRuntime);
    var resolveHistoryCanaryPolicyAndStoredState = asFunction(
      canarySourceRuntime.resolveHistoryCanaryPolicyAndStoredState
    );
    var resolveCanaryPolicySnapshot = asFunction(
      canaryPolicyRuntime.resolveCanaryPolicySnapshot
    );
    var resolveStoredPolicyKeys = asFunction(canaryPolicyRuntime.resolveStoredPolicyKeys);
    var resolveHistoryCanaryViewState = asFunction(
      canaryViewRuntime.resolveHistoryCanaryViewState
    );
    var resolveHistoryCanaryPanelHtml = asFunction(
      canaryPanelRuntime.resolveHistoryCanaryPanelHtml
    );
    if (
      !resolveHistoryCanaryPolicyAndStoredState ||
      !resolveCanaryPolicySnapshot ||
      !resolveStoredPolicyKeys ||
      !resolveHistoryCanaryViewState ||
      !resolveHistoryCanaryPanelHtml
    ) {
      return { panelHtml: "" };
    }

    var sourceState = toRecord(
      resolveHistoryCanaryPolicyAndStoredState({
        runtime: source.runtime,
        readStorageValue: source.readStorageValue,
        adapterModeStorageKey: source.adapterModeStorageKey,
        defaultModeStorageKey: source.defaultModeStorageKey,
        forceLegacyStorageKey: source.forceLegacyStorageKey,
        resolvePolicySnapshot: resolveCanaryPolicySnapshot,
        resolveStoredPolicy: resolveStoredPolicyKeys
      })
    );
    var canaryViewState = resolveHistoryCanaryViewState(sourceState.policy, sourceState.stored);
    return {
      panelHtml: toText(resolveHistoryCanaryPanelHtml(canaryViewState))
    };
  }

  function applyHistoryCanaryPanelClickAction(input) {
    var source = isRecord(input) ? input : {};
    var canaryActionRuntime = toRecord(source.historyCanaryActionRuntime);
    var canaryPanelRuntime = toRecord(source.historyCanaryPanelRuntime);
    var canaryPolicyRuntime = toRecord(source.historyCanaryPolicyRuntime);
    var applyHistoryCanaryPanelAction = asFunction(canaryActionRuntime.applyHistoryCanaryPanelAction);
    var resolveHistoryCanaryActionName = asFunction(
      canaryPanelRuntime.resolveHistoryCanaryActionName
    );
    var resolveCanaryPolicyActionNotice = asFunction(
      canaryPolicyRuntime.resolveCanaryPolicyActionNotice
    );
    var resolveCanaryPolicyActionPlan = asFunction(
      canaryPolicyRuntime.resolveCanaryPolicyActionPlan
    );
    var resolveHistoryCanaryPolicyUpdateFailureNotice = asFunction(
      canaryActionRuntime.resolveHistoryCanaryPolicyUpdateFailureNotice
    );
    if (
      !applyHistoryCanaryPanelAction ||
      !resolveHistoryCanaryActionName ||
      !resolveCanaryPolicyActionNotice ||
      !resolveCanaryPolicyActionPlan
    ) {
      return createNoopFeedbackState();
    }

    var feedbackState = toRecord(
      applyHistoryCanaryPanelAction({
        target: source.target,
        resolveActionName: resolveHistoryCanaryActionName,
        resolveActionNotice: resolveCanaryPolicyActionNotice,
        resolveActionPlan: resolveCanaryPolicyActionPlan,
        runtime: source.runtime,
        writeStorageValue: source.writeStorageValue,
        defaultModeStorageKey: source.defaultModeStorageKey,
        forceLegacyStorageKey: source.forceLegacyStorageKey,
        failureNotice: resolveHistoryCanaryPolicyUpdateFailureNotice
          ? resolveHistoryCanaryPolicyUpdateFailureNotice()
          : ""
      })
    );
    return {
      shouldReload: feedbackState.shouldReload === true,
      reloadResetPage: feedbackState.reloadResetPage === true,
      statusText: toText(feedbackState.statusText),
      isError: feedbackState.isError === true
    };
  }

  global.CoreHistoryCanaryHostRuntime = global.CoreHistoryCanaryHostRuntime || {};
  global.CoreHistoryCanaryHostRuntime.resolveHistoryCanaryPanelRenderState =
    resolveHistoryCanaryPanelRenderState;
  global.CoreHistoryCanaryHostRuntime.applyHistoryCanaryPanelClickAction =
    applyHistoryCanaryPanelClickAction;
})(typeof window !== "undefined" ? window : undefined);
