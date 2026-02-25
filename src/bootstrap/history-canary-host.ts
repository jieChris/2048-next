function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function asFunction<T extends (...args: never[]) => unknown>(value: unknown): T | null {
  return typeof value === "function" ? (value as T) : null;
}

function toRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

export interface HistoryCanaryPanelRenderState {
  panelHtml: string;
}

export interface HistoryCanaryPanelActionFeedbackState {
  shouldReload: boolean;
  reloadResetPage: boolean;
  statusText: string;
  isError: boolean;
}

function createNoopFeedbackState(): HistoryCanaryPanelActionFeedbackState {
  return {
    shouldReload: false,
    reloadResetPage: false,
    statusText: "",
    isError: false
  };
}

function toText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function resolveHistoryCanaryPanelRenderState(input: {
  runtime?: unknown;
  readStorageValue?: unknown;
  adapterModeStorageKey?: unknown;
  defaultModeStorageKey?: unknown;
  forceLegacyStorageKey?: unknown;
  historyCanarySourceRuntime?: unknown;
  historyCanaryPolicyRuntime?: unknown;
  historyCanaryViewRuntime?: unknown;
  historyCanaryPanelRuntime?: unknown;
}): HistoryCanaryPanelRenderState {
  const source = isRecord(input) ? input : {};
  const canarySourceRuntime = toRecord(source.historyCanarySourceRuntime);
  const canaryPolicyRuntime = toRecord(source.historyCanaryPolicyRuntime);
  const canaryViewRuntime = toRecord(source.historyCanaryViewRuntime);
  const canaryPanelRuntime = toRecord(source.historyCanaryPanelRuntime);
  const resolveHistoryCanaryPolicyAndStoredState = asFunction<(payload: unknown) => unknown>(
    canarySourceRuntime.resolveHistoryCanaryPolicyAndStoredState
  );
  const resolveCanaryPolicySnapshot = asFunction<(payload: unknown) => unknown>(
    canaryPolicyRuntime.resolveCanaryPolicySnapshot
  );
  const resolveStoredPolicyKeys = asFunction<(payload: unknown) => unknown>(
    canaryPolicyRuntime.resolveStoredPolicyKeys
  );
  const resolveHistoryCanaryViewState = asFunction<(policy: unknown, stored: unknown) => unknown>(
    canaryViewRuntime.resolveHistoryCanaryViewState
  );
  const resolveHistoryCanaryPanelHtml = asFunction<(viewState: unknown) => unknown>(
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

  const sourceState = toRecord(
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
  const canaryViewState = resolveHistoryCanaryViewState(sourceState.policy, sourceState.stored);
  return {
    panelHtml: toText(resolveHistoryCanaryPanelHtml(canaryViewState))
  };
}

export function applyHistoryCanaryPanelClickAction(input: {
  target?: unknown;
  runtime?: unknown;
  writeStorageValue?: unknown;
  defaultModeStorageKey?: unknown;
  forceLegacyStorageKey?: unknown;
  historyCanaryActionRuntime?: unknown;
  historyCanaryPanelRuntime?: unknown;
  historyCanaryPolicyRuntime?: unknown;
}): HistoryCanaryPanelActionFeedbackState {
  const source = isRecord(input) ? input : {};
  const canaryActionRuntime = toRecord(source.historyCanaryActionRuntime);
  const canaryPanelRuntime = toRecord(source.historyCanaryPanelRuntime);
  const canaryPolicyRuntime = toRecord(source.historyCanaryPolicyRuntime);
  const applyHistoryCanaryPanelAction = asFunction<(payload: unknown) => unknown>(
    canaryActionRuntime.applyHistoryCanaryPanelAction
  );
  const resolveHistoryCanaryActionName = asFunction<(target: unknown) => unknown>(
    canaryPanelRuntime.resolveHistoryCanaryActionName
  );
  const resolveCanaryPolicyActionNotice = asFunction<(actionName: unknown) => unknown>(
    canaryPolicyRuntime.resolveCanaryPolicyActionNotice
  );
  const resolveCanaryPolicyActionPlan = asFunction<(actionName: unknown) => unknown>(
    canaryPolicyRuntime.resolveCanaryPolicyActionPlan
  );
  const resolveHistoryCanaryPolicyUpdateFailureNotice = asFunction<() => unknown>(
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

  const feedbackState = toRecord(
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
