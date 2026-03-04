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

  function hasField(target, key) {
    return !!target && typeof target === "object" && key in target;
  }

  function asArrayLike(value) {
    if (Array.isArray(value)) return value;
    if (!value || typeof value !== "object") return [];
    var lengthValue = Number(value.length);
    var length = Number.isFinite(lengthValue) && lengthValue > 0 ? Math.floor(lengthValue) : 0;
    var result = [];
    for (var i = 0; i < length; i += 1) {
      result.push(value[i]);
    }
    return result;
  }

  function bindListener(element, eventName, handler) {
    var addEventListener = asFunction(toRecord(element).addEventListener);
    if (!addEventListener) return false;
    addEventListener.call(element, eventName, handler);
    return true;
  }

  function queryAllNodes(node, selector) {
    var querySelectorAll = asFunction(toRecord(node).querySelectorAll);
    if (!querySelectorAll) return [];
    return asArrayLike(querySelectorAll.call(node, selector));
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

  function applyHistoryCanaryPanelRender(input) {
    var source = isRecord(input) ? input : {};
    var panelElement = toRecord(source.panelElement);
    if (!hasField(panelElement, "innerHTML")) {
      return {
        didRender: false,
        boundButtonCount: 0
      };
    }

    var panelState = resolveHistoryCanaryPanelRenderState({
      runtime: source.runtime,
      readStorageValue: source.readStorageValue,
      adapterModeStorageKey: source.adapterModeStorageKey,
      defaultModeStorageKey: source.defaultModeStorageKey,
      forceLegacyStorageKey: source.forceLegacyStorageKey,
      historyCanarySourceRuntime: source.historyCanarySourceRuntime,
      historyCanaryPolicyRuntime: source.historyCanaryPolicyRuntime,
      historyCanaryViewRuntime: source.historyCanaryViewRuntime,
      historyCanaryPanelRuntime: source.historyCanaryPanelRuntime
    });
    panelElement.innerHTML = panelState.panelHtml;

    var loadHistory = asFunction(source.loadHistory);
    var setStatus = asFunction(source.setStatus);

    var boundButtonCount = 0;
    var buttons = queryAllNodes(panelElement, ".history-canary-action-btn");
    for (var i = 0; i < buttons.length; i += 1) {
      var button = buttons[i];
      if (
        bindListener(button, "click", function (boundButton) {
          return function (event) {
            var eventRecord = toRecord(event);
            var feedbackState = applyHistoryCanaryPanelClickAction({
              target: eventRecord.currentTarget || boundButton,
              runtime: source.runtime,
              writeStorageValue: source.writeStorageValue,
              defaultModeStorageKey: source.defaultModeStorageKey,
              forceLegacyStorageKey: source.forceLegacyStorageKey,
              historyCanaryActionRuntime: source.historyCanaryActionRuntime,
              historyCanaryPanelRuntime: source.historyCanaryPanelRuntime,
              historyCanaryPolicyRuntime: source.historyCanaryPolicyRuntime
            });
            if (loadHistory && feedbackState.shouldReload) {
              loadHistory(feedbackState.reloadResetPage);
            }
            if (setStatus && (feedbackState.statusText || feedbackState.isError)) {
              setStatus(feedbackState.statusText, feedbackState.isError);
            }
          };
        }(button))
      ) {
        boundButtonCount += 1;
      }
    }

    return {
      didRender: true,
      boundButtonCount: boundButtonCount
    };
  }

  global.CoreHistoryCanaryHostRuntime = global.CoreHistoryCanaryHostRuntime || {};
  global.CoreHistoryCanaryHostRuntime.resolveHistoryCanaryPanelRenderState =
    resolveHistoryCanaryPanelRenderState;
  global.CoreHistoryCanaryHostRuntime.applyHistoryCanaryPanelClickAction =
    applyHistoryCanaryPanelClickAction;
  global.CoreHistoryCanaryHostRuntime.applyHistoryCanaryPanelRender =
    applyHistoryCanaryPanelRender;
})(typeof window !== "undefined" ? window : undefined);
