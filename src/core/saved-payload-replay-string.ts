export interface SavedPayloadReplayStringManagerLike {
  lastReplayStringSavedAt?: unknown;
  rescueReplayString?: unknown;
}

export interface SavedPayloadReplayStringOperations {
  serializeReplay?: (manager: SavedPayloadReplayStringManagerLike) => unknown;
}

export interface SavedPayloadReplayStringRuntime {
  resolveReplayStringForSavedPayload: typeof resolveReplayStringForSavedPayload;
}

export interface SavedPayloadReplayStringWindowLike {
  CoreSavedPayloadReplayStringRuntime?: SavedPayloadReplayStringRuntime;
}

export interface SavedPayloadReplayStringRuntimeInstallOptions {
  windowLike?: SavedPayloadReplayStringWindowLike | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function shouldIncludeReplayStringInSavedPayload(
  manager: SavedPayloadReplayStringManagerLike | null | undefined,
  now: number,
  saveOptions: unknown
): boolean {
  if (!manager) return false;
  if (isRecord(saveOptions) && saveOptions.force) return true;
  const lastSavedAt = Number(manager.lastReplayStringSavedAt);
  if (!Number.isFinite(lastSavedAt) || lastSavedAt <= 0) return true;
  return now - lastSavedAt >= 8000;
}

export function resolveReplayStringForSavedPayload(
  manager: SavedPayloadReplayStringManagerLike | null | undefined,
  now: number,
  saveOptions: unknown,
  operations: SavedPayloadReplayStringOperations = {}
): string {
  if (!shouldIncludeReplayStringInSavedPayload(manager, now, saveOptions)) return "";
  let replayString = "";
  try {
    if (typeof operations.serializeReplay === "function") {
      replayString = String(operations.serializeReplay(manager as SavedPayloadReplayStringManagerLike) || "");
    }
  } catch (_error) {
    replayString = "";
  }
  if (!replayString && manager?.rescueReplayString != null) {
    replayString = String(manager.rescueReplayString || "").trim();
  }
  if (replayString && manager) {
    manager.lastReplayStringSavedAt = now;
  }
  return replayString;
}

export function createSavedPayloadReplayStringRuntime(): SavedPayloadReplayStringRuntime {
  return {
    resolveReplayStringForSavedPayload
  };
}

export function installSavedPayloadReplayStringRuntime(
  options: SavedPayloadReplayStringRuntimeInstallOptions = {}
): SavedPayloadReplayStringRuntime | null {
  const target =
    options.windowLike === undefined
      ? typeof window === "undefined"
        ? null
        : (window as unknown as SavedPayloadReplayStringWindowLike)
      : options.windowLike;
  if (!target) return null;
  if (!target.CoreSavedPayloadReplayStringRuntime) {
    target.CoreSavedPayloadReplayStringRuntime = createSavedPayloadReplayStringRuntime();
  }
  return target.CoreSavedPayloadReplayStringRuntime;
}
