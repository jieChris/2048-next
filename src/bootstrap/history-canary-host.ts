function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function asFunction<T extends (...args: never[]) => unknown>(value: unknown): T | null {
  return typeof value === "function" ? (value as T) : null;
}

function toRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function hasField(target: unknown, key: string): boolean {
  return !!target && typeof target === "object" && key in (target as Record<string, unknown>);
}

function asArrayLike(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];
  const lengthValue = Number((value as Record<string, unknown>).length);
  const length = Number.isFinite(lengthValue) && lengthValue > 0 ? Math.floor(lengthValue) : 0;
  const result: unknown[] = [];
  for (let i = 0; i < length; i += 1) {
    result.push((value as Record<string, unknown>)[i]);
  }
  return result;
}

function bindListener(
  element: unknown,
  eventName: string,
  handler: (...args: never[]) => unknown
): boolean {
  const addEventListener = asFunction<(name: string, cb: (...args: never[]) => unknown) => unknown>(
    toRecord(element).addEventListener
  );
  if (!addEventListener) return false;
  (addEventListener as unknown as Function).call(element, eventName, handler);
  return true;
}

function queryAllNodes(node: unknown, selector: string): unknown[] {
  const querySelectorAll = asFunction<(value: string) => unknown>(toRecord(node).querySelectorAll);
  if (!querySelectorAll) return [];
  return asArrayLike((querySelectorAll as unknown as Function).call(node, selector));
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

export interface HistoryCanaryPanelRenderApplyResult {
  didRender: boolean;
  boundButtonCount: number;
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

export function applyHistoryCanaryPanelRender(input: {
  panelElement?: unknown;
  runtime?: unknown;
  readStorageValue?: unknown;
  adapterModeStorageKey?: unknown;
  defaultModeStorageKey?: unknown;
  forceLegacyStorageKey?: unknown;
  historyCanarySourceRuntime?: unknown;
  historyCanaryPolicyRuntime?: unknown;
  historyCanaryViewRuntime?: unknown;
  historyCanaryPanelRuntime?: unknown;
  writeStorageValue?: unknown;
  historyCanaryActionRuntime?: unknown;
  loadHistory?: unknown;
  setStatus?: unknown;
}): HistoryCanaryPanelRenderApplyResult {
  const source = isRecord(input) ? input : {};
  const panelElement = toRecord(source.panelElement);
  if (!hasField(panelElement, "innerHTML")) {
    return {
      didRender: false,
      boundButtonCount: 0
    };
  }

  const panelState = resolveHistoryCanaryPanelRenderState({
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

  const loadHistory = asFunction<(resetPage: unknown) => unknown>(source.loadHistory);
  const setStatus = asFunction<(text: unknown, isError: unknown) => unknown>(source.setStatus);

  let boundButtonCount = 0;
  const buttons = queryAllNodes(panelElement, ".history-canary-action-btn");
  for (let i = 0; i < buttons.length; i += 1) {
    const button = buttons[i];
    if (
      bindListener(button, "click", function (event: unknown) {
        const eventRecord = toRecord(event);
        const feedbackState = applyHistoryCanaryPanelClickAction({
          target: eventRecord.currentTarget || button,
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
        if (setStatus) {
          setStatus(feedbackState.statusText, feedbackState.isError);
        }
      })
    ) {
      boundButtonCount += 1;
    }
  }

  return {
    didRender: true,
    boundButtonCount
  };
}
