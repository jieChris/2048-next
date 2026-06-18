export interface SavedStateSyncPayloadSource {
  ipsInputCount?: unknown;
}

export interface SavedStateSyncTrimPayload {
  move_history: unknown[];
  undo_stack: unknown[];
  redo_stack: unknown[];
  replay_compact_log: string;
  session_replay_v3: null;
  replay_string: string;
  ips_input_count: number;
}

export interface SavedStateSyncPayloadRuntime {
  buildSavedStateSyncTrimPayload: typeof buildSavedStateSyncTrimPayload;
}

export interface SavedStateSyncPayloadWindowLike {
  CoreSavedStateSyncPayloadRuntime?: SavedStateSyncPayloadRuntime;
}

export interface SavedStateSyncPayloadRuntimeInstallOptions {
  windowLike?: SavedStateSyncPayloadWindowLike | null;
}

function normalizeIpsInputCount(value: unknown): number {
  return Number.isInteger(value) && Number(value) >= 0 ? Number(value) : 0;
}

export function buildSavedStateSyncTrimPayload(
  source: SavedStateSyncPayloadSource | null | undefined
): SavedStateSyncTrimPayload {
  return {
    move_history: [],
    undo_stack: [],
    redo_stack: [],
    replay_compact_log: "",
    session_replay_v3: null,
    replay_string: "",
    ips_input_count: normalizeIpsInputCount(source?.ipsInputCount)
  };
}

export function createSavedStateSyncPayloadRuntime(): SavedStateSyncPayloadRuntime {
  return {
    buildSavedStateSyncTrimPayload
  };
}

export function installSavedStateSyncPayloadRuntime(
  options: SavedStateSyncPayloadRuntimeInstallOptions = {}
): SavedStateSyncPayloadRuntime | null {
  const target =
    options.windowLike === undefined
      ? typeof window === "undefined"
        ? null
        : (window as unknown as SavedStateSyncPayloadWindowLike)
      : options.windowLike;
  if (!target) return null;
  if (!target.CoreSavedStateSyncPayloadRuntime) {
    target.CoreSavedStateSyncPayloadRuntime = createSavedStateSyncPayloadRuntime();
  }
  return target.CoreSavedStateSyncPayloadRuntime;
}
