export interface SessionReplaySnapshotManagerLike {
  modeKey?: unknown;
  mode?: unknown;
  width?: unknown;
  height?: unknown;
  ruleset?: unknown;
  modeConfig?: { undo_enabled?: unknown } | null;
  modeFamily?: unknown;
  rankPolicy?: unknown;
  specialRules?: unknown;
  challengeId?: unknown;
  initialSeed?: unknown;
  sessionReplayV3?: unknown;
  sessionReplayV1?: unknown;
  clonePlain?: (value: unknown) => unknown;
}

export interface SessionReplaySnapshotRuntime {
  initializeSetupSessionReplaySnapshot: typeof initializeSetupSessionReplaySnapshot;
}

export interface SessionReplaySnapshotWindowLike {
  CoreSessionReplaySnapshotRuntime?: SessionReplaySnapshotRuntime;
}

export interface SessionReplaySnapshotRuntimeInstallOptions {
  windowLike?: SessionReplaySnapshotWindowLike | null;
}

function clonePlainWithManager(manager: SessionReplaySnapshotManagerLike, value: unknown): unknown {
  if (typeof manager.clonePlain === "function") {
    return manager.clonePlain(value);
  }
  return value && typeof value === "object" && !Array.isArray(value) ? { ...value } : {};
}

export function resolveReplayModeTagFromModeKey(modeKey: unknown, fallbackMode: unknown): string {
  const key = typeof modeKey === "string" && modeKey ? modeKey : typeof fallbackMode === "string" ? fallbackMode : "";
  if (key && key.indexOf("capped") !== -1) return "capped";
  if (key && key.indexOf("practice") !== -1) return "practice";
  return "classic";
}

export function initializeSetupSessionReplaySnapshot(
  manager: SessionReplaySnapshotManagerLike | null | undefined
): void {
  if (!manager) return;
  manager.sessionReplayV3 = {
    v: 3,
    mode: resolveReplayModeTagFromModeKey(manager.modeKey, manager.mode),
    mode_key: manager.modeKey,
    board_width: manager.width,
    board_height: manager.height,
    ruleset: manager.ruleset,
    undo_enabled: !!manager.modeConfig?.undo_enabled,
    mode_family: manager.modeFamily,
    rank_policy: manager.rankPolicy,
    special_rules_snapshot: clonePlainWithManager(manager, manager.specialRules || {}),
    challenge_id: manager.challengeId,
    seed: manager.initialSeed,
    actions: []
  };
  manager.sessionReplayV1 = {
    v: 1,
    mode_key: manager.modeKey,
    ruleset: manager.ruleset,
    board_width: manager.width,
    board_height: manager.height,
    start_unix_ms: Date.now(),
    challenge_id: manager.challengeId || null,
    seed: manager.initialSeed,
    init_tiles: [],
    records: [],
    last_event_at_ms: Date.now(),
    supported: true
  };
}

export function createSessionReplaySnapshotRuntime(): SessionReplaySnapshotRuntime {
  return {
    initializeSetupSessionReplaySnapshot
  };
}

export function installSessionReplaySnapshotRuntime(
  options: SessionReplaySnapshotRuntimeInstallOptions = {}
): SessionReplaySnapshotRuntime | null {
  const target =
    options.windowLike === undefined
      ? typeof window === "undefined"
        ? null
        : (window as unknown as SessionReplaySnapshotWindowLike)
      : options.windowLike;
  if (!target) return null;
  if (!target.CoreSessionReplaySnapshotRuntime) {
    target.CoreSessionReplaySnapshotRuntime = createSessionReplaySnapshotRuntime();
  }
  return target.CoreSessionReplaySnapshotRuntime;
}
