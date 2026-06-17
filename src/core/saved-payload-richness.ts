const RICHNESS_KEYS = [
  "move_history",
  "replay_compact_log",
  "session_replay_v1",
  "session_replay_v3",
  "spawn_value_counts",
  "replay_string",
  "timer_fixed_rows",
  "timer_dynamic_rows_capped",
  "timer_dynamic_rows_overflow",
  "timer_secondary_rows",
  "timer_secondary_expanded_parents",
  "timer_sub_8192",
  "timer_sub_16384",
  "timer_sub_visible"
] as const;

export interface SavedPayloadRichnessRuntime {
  resolveSavedPayloadRichnessScore: typeof resolveSavedPayloadRichnessScore;
}

export interface SavedPayloadRichnessWindowLike {
  CoreSavedPayloadRichnessRuntime?: SavedPayloadRichnessRuntime;
}

export interface SavedPayloadRichnessRuntimeInstallOptions {
  windowLike?: SavedPayloadRichnessWindowLike | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isRichnessValuePresent(value: unknown): boolean {
  if (typeof value === "string") return !!value.trim();
  if (Array.isArray(value)) return value.length > 0;
  if (isRecord(value)) return Object.keys(value).length > 0;
  return typeof value !== "undefined" && value !== null;
}

export function resolveSavedPayloadRichnessScore(payload: unknown): number {
  if (!isRecord(payload)) return -1;
  let score = 0;
  for (const key of RICHNESS_KEYS) {
    if (isRichnessValuePresent(payload[key])) score += 1;
  }
  return score;
}

export function createSavedPayloadRichnessRuntime(): SavedPayloadRichnessRuntime {
  return {
    resolveSavedPayloadRichnessScore
  };
}

export function installSavedPayloadRichnessRuntime(
  options: SavedPayloadRichnessRuntimeInstallOptions = {}
): SavedPayloadRichnessRuntime | null {
  const target =
    options.windowLike === undefined
      ? typeof window === "undefined"
        ? null
        : (window as unknown as SavedPayloadRichnessWindowLike)
      : options.windowLike;
  if (!target) return null;
  if (!target.CoreSavedPayloadRichnessRuntime) {
    target.CoreSavedPayloadRichnessRuntime = createSavedPayloadRichnessRuntime();
  }
  return target.CoreSavedPayloadRichnessRuntime;
}
