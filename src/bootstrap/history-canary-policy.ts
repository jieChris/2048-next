type AnyRecord = Record<string, unknown>;

export type HistoryAdapterMode = "core-adapter" | "legacy-bridge";

export interface CanaryPolicySnapshot {
  effectiveMode: HistoryAdapterMode;
  modeSource: string;
  forceLegacyEnabled: boolean;
  forceLegacySource: string | null;
  explicitMode: HistoryAdapterMode | null;
  globalMode: HistoryAdapterMode | null;
  queryMode: HistoryAdapterMode | null;
  storageMode: HistoryAdapterMode | null;
  defaultMode: HistoryAdapterMode | null;
}

export interface StoredPolicyKeys {
  adapterMode: string | null;
  defaultMode: string | null;
  forceLegacy: string | null;
}

export interface ResolveCanaryPolicySnapshotOptions {
  runtimePolicy?: unknown;
  defaultModeRaw?: unknown;
  forceLegacyRaw?: unknown;
}

export interface ResolveStoredPolicyKeysOptions {
  runtimeStoredKeys?: unknown;
  adapterModeRaw?: unknown;
  defaultModeRaw?: unknown;
  forceLegacyRaw?: unknown;
}

export interface CanaryPolicyActionPlan {
  isSupported: boolean;
  defaultMode: HistoryAdapterMode | null | undefined;
  forceLegacy: boolean | undefined;
}

function isPlainObject(value: unknown): value is AnyRecord {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function readStringOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function normalizeAdapterMode(raw: unknown): HistoryAdapterMode | null {
  if (raw === "core" || raw === "core-adapter") return "core-adapter";
  if (raw === "legacy" || raw === "legacy-bridge") return "legacy-bridge";
  return null;
}

function normalizeForceLegacyFlag(raw: unknown): boolean {
  if (raw === true || raw === 1) return true;
  if (typeof raw !== "string") return false;
  const normalized = raw.trim().toLowerCase();
  if (!normalized) return false;
  return (
    normalized === "1" ||
    normalized === "true" ||
    normalized === "yes" ||
    normalized === "on" ||
    normalized === "legacy" ||
    normalized === "legacy-bridge"
  );
}

function sanitizePolicySnapshot(policy: AnyRecord): CanaryPolicySnapshot {
  return {
    effectiveMode: normalizeAdapterMode(policy.effectiveMode) || "legacy-bridge",
    modeSource: typeof policy.modeSource === "string" ? policy.modeSource : "fallback",
    forceLegacyEnabled: Boolean(policy.forceLegacyEnabled),
    forceLegacySource: typeof policy.forceLegacySource === "string" ? policy.forceLegacySource : null,
    explicitMode: normalizeAdapterMode(policy.explicitMode),
    globalMode: normalizeAdapterMode(policy.globalMode),
    queryMode: normalizeAdapterMode(policy.queryMode),
    storageMode: normalizeAdapterMode(policy.storageMode),
    defaultMode: normalizeAdapterMode(policy.defaultMode)
  };
}

export function resolveCanaryPolicySnapshot(
  options: ResolveCanaryPolicySnapshotOptions
): CanaryPolicySnapshot {
  const opts = options || {};
  if (isPlainObject(opts.runtimePolicy)) {
    return sanitizePolicySnapshot(opts.runtimePolicy);
  }

  const defaultMode = normalizeAdapterMode(opts.defaultModeRaw);
  const forceLegacy = normalizeForceLegacyFlag(opts.forceLegacyRaw);
  if (forceLegacy) {
    return {
      effectiveMode: "legacy-bridge",
      modeSource: "force-legacy",
      forceLegacyEnabled: true,
      forceLegacySource: "storage",
      explicitMode: null,
      globalMode: null,
      queryMode: null,
      storageMode: null,
      defaultMode
    };
  }
  if (defaultMode) {
    return {
      effectiveMode: defaultMode,
      modeSource: "default",
      forceLegacyEnabled: false,
      forceLegacySource: null,
      explicitMode: null,
      globalMode: null,
      queryMode: null,
      storageMode: null,
      defaultMode
    };
  }
  return {
    effectiveMode: "legacy-bridge",
    modeSource: "fallback",
    forceLegacyEnabled: false,
    forceLegacySource: null,
    explicitMode: null,
    globalMode: null,
    queryMode: null,
    storageMode: null,
    defaultMode: null
  };
}

export function resolveStoredPolicyKeys(options: ResolveStoredPolicyKeysOptions): StoredPolicyKeys {
  const opts = options || {};
  if (isPlainObject(opts.runtimeStoredKeys)) {
    return {
      adapterMode: readStringOrNull(opts.runtimeStoredKeys.adapterMode),
      defaultMode: readStringOrNull(opts.runtimeStoredKeys.defaultMode),
      forceLegacy: readStringOrNull(opts.runtimeStoredKeys.forceLegacy)
    };
  }
  return {
    adapterMode: readStringOrNull(opts.adapterModeRaw),
    defaultMode: readStringOrNull(opts.defaultModeRaw),
    forceLegacy: readStringOrNull(opts.forceLegacyRaw)
  };
}

export function resolveCanaryPolicyActionPlan(actionName: string): CanaryPolicyActionPlan {
  const action = String(actionName || "");
  if (action === "apply_canary") {
    return {
      isSupported: true,
      defaultMode: "core-adapter",
      forceLegacy: false
    };
  }
  if (action === "emergency_rollback") {
    return {
      isSupported: true,
      defaultMode: undefined,
      forceLegacy: true
    };
  }
  if (action === "resume_canary") {
    return {
      isSupported: true,
      defaultMode: undefined,
      forceLegacy: false
    };
  }
  if (action === "reset_policy") {
    return {
      isSupported: true,
      defaultMode: null,
      forceLegacy: false
    };
  }
  return {
    isSupported: false,
    defaultMode: undefined,
    forceLegacy: undefined
  };
}

export function resolveCanaryPolicyActionNotice(actionName: string): string {
  const action = String(actionName || "");
  if (action === "apply_canary") {
    return "已设置默认 core-adapter，并清除强制回滚";
  }
  if (action === "emergency_rollback") {
    return "已开启强制回滚：legacy-bridge";
  }
  if (action === "resume_canary") {
    return "已解除强制回滚，恢复默认策略";
  }
  if (action === "reset_policy") {
    return "已重置策略到基线（无默认 core、无强制回滚）";
  }
  return "策略已更新";
}
