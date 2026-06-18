export interface SavedManagerBaseStateTarget {
  over?: unknown;
  won?: unknown;
  keepPlaying?: unknown;
  initialSeed?: unknown;
  seed?: unknown;
  reached32k?: unknown;
  cappedMilestoneCount?: unknown;
  capped64Unlocked?: unknown;
  challengeId?: unknown;
  rankedSessionToken?: unknown;
  hasGameStarted?: unknown;
  sessionSubmitDone?: unknown;
}

export interface SavedManagerBaseStateSource {
  score?: unknown;
  over?: unknown;
  won?: unknown;
  keep_playing?: unknown;
  initial_seed?: unknown;
  seed?: unknown;
  reached_32k?: unknown;
  capped_milestone_count?: unknown;
  capped64_unlocked?: unknown;
  client_record_id?: unknown;
  challenge_id?: unknown;
  ranked_session_token?: unknown;
  has_game_started?: unknown;
}

export interface SavedManagerBaseStateOperations {
  setRuntimeScore: (manager: SavedManagerBaseStateTarget, score: number) => void;
  clonePlain?: (value: unknown) => unknown;
  assignClientRecordId?: (manager: SavedManagerBaseStateTarget, clientRecordId: string) => void;
}

export interface SavedManagerBaseStateRuntime {
  applySavedManagerBaseState: typeof applySavedManagerBaseState;
}

export interface SavedManagerBaseStateWindowLike {
  CoreSavedManagerBaseStateRuntime?: SavedManagerBaseStateRuntime;
}

export interface SavedManagerBaseStateRuntimeInstallOptions {
  windowLike?: SavedManagerBaseStateWindowLike | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function finiteNumberOrFallback(value: unknown, fallback: unknown): unknown {
  return Number.isFinite(value) ? Number(value) : fallback;
}

function integerOrDefault(value: unknown, fallback: number): number {
  return Number.isInteger(value) ? Number(value) : fallback;
}

function nonNegativeIntegerOrDefault(value: unknown, fallback: number): number {
  return Number.isInteger(value) && Number(value) >= 0 ? Number(value) : fallback;
}

export function applySavedManagerBaseState(
  manager: SavedManagerBaseStateTarget | null | undefined,
  saved: SavedManagerBaseStateSource | null | undefined,
  operations: SavedManagerBaseStateOperations
): void {
  if (!manager) return;
  const source = saved || {};
  operations.setRuntimeScore(manager, nonNegativeIntegerOrDefault(source.score, 0));
  manager.over = !!source.over;
  manager.won = !!source.won;
  manager.keepPlaying = !!source.keep_playing;
  manager.initialSeed = finiteNumberOrFallback(source.initial_seed, manager.initialSeed);
  manager.seed = finiteNumberOrFallback(source.seed, manager.initialSeed);
  manager.reached32k = !!source.reached_32k;
  manager.cappedMilestoneCount = integerOrDefault(source.capped_milestone_count, 0);
  if (isRecord(source.capped64_unlocked)) {
    manager.capped64Unlocked = operations.clonePlain
      ? operations.clonePlain(source.capped64_unlocked)
      : source.capped64_unlocked;
  }
  operations.assignClientRecordId?.(
    manager,
    typeof source.client_record_id === "string" ? source.client_record_id : ""
  );
  manager.challengeId = typeof source.challenge_id === "string" && source.challenge_id ? source.challenge_id : null;
  if (typeof source.ranked_session_token === "string") manager.rankedSessionToken = source.ranked_session_token;
  manager.hasGameStarted = !!source.has_game_started;
  manager.sessionSubmitDone = false;
}

export function createSavedManagerBaseStateRuntime(): SavedManagerBaseStateRuntime {
  return {
    applySavedManagerBaseState
  };
}

export function installSavedManagerBaseStateRuntime(
  options: SavedManagerBaseStateRuntimeInstallOptions = {}
): SavedManagerBaseStateRuntime | null {
  const target =
    options.windowLike === undefined
      ? typeof window === "undefined"
        ? null
        : (window as unknown as SavedManagerBaseStateWindowLike)
      : options.windowLike;
  if (!target) return null;
  if (!target.CoreSavedManagerBaseStateRuntime) {
    target.CoreSavedManagerBaseStateRuntime = createSavedManagerBaseStateRuntime();
  }
  return target.CoreSavedManagerBaseStateRuntime;
}
