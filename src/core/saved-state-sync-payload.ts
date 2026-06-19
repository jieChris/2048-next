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
  parseSavedStateSyncEventPayload: typeof parseSavedStateSyncEventPayload;
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

function normalizeRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function resolveSavedAt(saved: Record<string, unknown> | null): number {
  const value = Number(saved?.saved_at);
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.floor(value);
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

export function parseSavedStateSyncEventPayload(raw: unknown): {
  sourceClientId: string;
  savedAt: number;
  state: Record<string, unknown>;
} | null {
  if (typeof raw !== "string" || !raw) return null;
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(raw);
  } catch (_err) {
    return null;
  }
  const payload = normalizeRecord(parsed);
  if (!payload) return null;
  const state = normalizeRecord(payload.state);
  if (!state) return null;
  let savedAt = resolveSavedAt(state);
  if (!(savedAt > 0)) savedAt = resolveSavedAt(payload);
  if (!(savedAt > 0)) return null;
  return {
    sourceClientId: typeof payload.source_client_id === "string" ? payload.source_client_id : "",
    savedAt,
    state
  };
}

export function createSavedStateSyncPayloadRuntime(): SavedStateSyncPayloadRuntime {
  return {
    buildSavedStateSyncTrimPayload,
    parseSavedStateSyncEventPayload
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
