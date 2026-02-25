(function (global) {
  "use strict";

  if (!global) return;

  function isPlainObject(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
  }

  function readStringOrNull(value) {
    return typeof value === "string" ? value : null;
  }

  function normalizeAdapterMode(raw) {
    if (raw === "core" || raw === "core-adapter") return "core-adapter";
    if (raw === "legacy" || raw === "legacy-bridge") return "legacy-bridge";
    return null;
  }

  function normalizeForceLegacyFlag(raw) {
    if (raw === true || raw === 1) return true;
    if (typeof raw !== "string") return false;
    var normalized = raw.trim().toLowerCase();
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

  function sanitizePolicySnapshot(policy) {
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

  function resolveCanaryPolicySnapshot(options) {
    var opts = options || {};
    if (isPlainObject(opts.runtimePolicy)) {
      return sanitizePolicySnapshot(opts.runtimePolicy);
    }

    var defaultMode = normalizeAdapterMode(opts.defaultModeRaw);
    var forceLegacy = normalizeForceLegacyFlag(opts.forceLegacyRaw);
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
        defaultMode: defaultMode
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
        defaultMode: defaultMode
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

  function resolveStoredPolicyKeys(options) {
    var opts = options || {};
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

  function resolveCanaryPolicyActionPlan(actionName) {
    var action = String(actionName || "");
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

  function resolveCanaryPolicyActionNotice(actionName) {
    var action = String(actionName || "");
    if (action === "apply_canary") return "已设置默认 core-adapter，并清除强制回滚";
    if (action === "emergency_rollback") return "已开启强制回滚：legacy-bridge";
    if (action === "resume_canary") return "已解除强制回滚，恢复默认策略";
    if (action === "reset_policy") return "已重置策略到基线（无默认 core、无强制回滚）";
    return "策略已更新";
  }

  global.CoreHistoryCanaryPolicyRuntime = global.CoreHistoryCanaryPolicyRuntime || {};
  global.CoreHistoryCanaryPolicyRuntime.resolveCanaryPolicySnapshot = resolveCanaryPolicySnapshot;
  global.CoreHistoryCanaryPolicyRuntime.resolveStoredPolicyKeys = resolveStoredPolicyKeys;
  global.CoreHistoryCanaryPolicyRuntime.resolveCanaryPolicyActionPlan = resolveCanaryPolicyActionPlan;
  global.CoreHistoryCanaryPolicyRuntime.resolveCanaryPolicyActionNotice = resolveCanaryPolicyActionNotice;
})(typeof window !== "undefined" ? window : undefined);
