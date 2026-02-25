interface LegacyAdapterRuntimeLike {
  setStoredAdapterDefaultMode?: (mode: unknown) => boolean;
  clearStoredAdapterDefaultMode?: () => boolean;
  setStoredForceLegacy?: (enabled: boolean) => boolean;
}

interface HistoryCanaryActionPlanLike {
  isSupported?: unknown;
  defaultMode?: unknown;
  forceLegacy?: unknown;
}

export interface ApplyHistoryCanaryPolicyActionInput {
  actionPlan: unknown;
  runtime: unknown;
  writeStorageValue: unknown;
  defaultModeStorageKey: unknown;
  forceLegacyStorageKey: unknown;
}

export interface ApplyHistoryCanaryPolicyActionByNameInput {
  actionName: unknown;
  resolveActionPlan: unknown;
  runtime: unknown;
  writeStorageValue: unknown;
  defaultModeStorageKey: unknown;
  forceLegacyStorageKey: unknown;
}

export interface HistoryCanaryPolicyApplyFeedbackInput {
  ok: unknown;
  successNotice: unknown;
  failureNotice: unknown;
}

export interface HistoryCanaryPolicyApplyFeedbackState {
  shouldReload: boolean;
  reloadResetPage: boolean;
  statusText: string;
  isError: boolean;
}

function asRuntime(value: unknown): LegacyAdapterRuntimeLike | null {
  if (!value || typeof value !== "object") return null;
  return value as LegacyAdapterRuntimeLike;
}

function asActionPlan(value: unknown): HistoryCanaryActionPlanLike | null {
  if (!value || typeof value !== "object") return null;
  return value as HistoryCanaryActionPlanLike;
}

function asStorageWriter(value: unknown): ((key: string, raw: unknown) => boolean) | null {
  if (typeof value !== "function") return null;
  return value as (key: string, raw: unknown) => boolean;
}

function asStorageKey(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asActionPlanResolver(
  value: unknown
): ((actionName: string) => unknown) | null {
  if (typeof value !== "function") return null;
  return value as (actionName: string) => unknown;
}

function writeDefaultMode(
  runtime: LegacyAdapterRuntimeLike | null,
  storageWriter: ((key: string, raw: unknown) => boolean) | null,
  storageKey: string,
  mode: unknown
): boolean {
  if (runtime && typeof runtime.setStoredAdapterDefaultMode === "function") {
    return runtime.setStoredAdapterDefaultMode(mode);
  }
  if (!storageWriter) return false;
  return storageWriter(storageKey, mode || null);
}

function clearDefaultMode(
  runtime: LegacyAdapterRuntimeLike | null,
  storageWriter: ((key: string, raw: unknown) => boolean) | null,
  storageKey: string
): boolean {
  if (runtime && typeof runtime.clearStoredAdapterDefaultMode === "function") {
    return runtime.clearStoredAdapterDefaultMode();
  }
  if (!storageWriter) return false;
  return storageWriter(storageKey, null);
}

function writeForceLegacy(
  runtime: LegacyAdapterRuntimeLike | null,
  storageWriter: ((key: string, raw: unknown) => boolean) | null,
  storageKey: string,
  enabled: boolean
): boolean {
  if (runtime && typeof runtime.setStoredForceLegacy === "function") {
    return runtime.setStoredForceLegacy(enabled);
  }
  if (!storageWriter) return false;
  return storageWriter(storageKey, enabled ? "1" : null);
}

export function applyHistoryCanaryPolicyAction(input: unknown): boolean {
  const payload = input && typeof input === "object" ? (input as ApplyHistoryCanaryPolicyActionInput) : null;
  const actionPlan = asActionPlan(payload && payload.actionPlan);
  if (!actionPlan || actionPlan.isSupported !== true) return false;

  const runtime = asRuntime(payload && payload.runtime);
  const storageWriter = asStorageWriter(payload && payload.writeStorageValue);
  const defaultModeStorageKey = asStorageKey(payload && payload.defaultModeStorageKey);
  const forceLegacyStorageKey = asStorageKey(payload && payload.forceLegacyStorageKey);

  let success = true;
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

export function applyHistoryCanaryPolicyActionByName(input: unknown): boolean {
  const payload =
    input && typeof input === "object" ? (input as ApplyHistoryCanaryPolicyActionByNameInput) : null;
  const resolveActionPlan = asActionPlanResolver(payload && payload.resolveActionPlan);
  if (!resolveActionPlan) return false;

  const actionName = String((payload && payload.actionName) || "");
  const actionPlan = resolveActionPlan(actionName);
  return applyHistoryCanaryPolicyAction({
    actionPlan,
    runtime: payload && payload.runtime,
    writeStorageValue: payload && payload.writeStorageValue,
    defaultModeStorageKey: payload && payload.defaultModeStorageKey,
    forceLegacyStorageKey: payload && payload.forceLegacyStorageKey
  });
}

export function resolveHistoryCanaryPolicyUpdateFailureNotice(): string {
  return "策略更新失败：请检查浏览器本地存储权限";
}

export function resolveHistoryCanaryPolicyApplyFeedbackState(
  input: unknown
): HistoryCanaryPolicyApplyFeedbackState {
  const payload =
    input && typeof input === "object" ? (input as HistoryCanaryPolicyApplyFeedbackInput) : null;
  const ok = payload && payload.ok === true;
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
