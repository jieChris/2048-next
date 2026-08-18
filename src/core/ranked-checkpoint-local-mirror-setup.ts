export interface RankedCheckpointLocalMirrorManagerLike {
  rankPolicy?: string;
  modeKey?: unknown;
  mode?: unknown;
  getWindowLike?: () => RankedCheckpointLocalMirrorWindowLike | null;
}

export interface RankedCheckpointLocalMirrorStorageLike {
  getItem?: (key: string) => string | null;
}

export interface RankedCheckpointLocalMirrorWindowLike {
  localStorage?: RankedCheckpointLocalMirrorStorageLike | null;
  CoreRankedCheckpointLocalMirrorSetupRuntime?: RankedCheckpointLocalMirrorSetupRuntime;
}

export interface RankedCheckpointLocalMirrorSetupRuntime {
  hasRankedCheckpointLocalMirrorForSetup: typeof hasRankedCheckpointLocalMirrorForSetup;
  readRankedCheckpointLocalMirrorSavedStateForSetup: typeof readRankedCheckpointLocalMirrorSavedStateForSetup;
}

export interface RankedCheckpointLocalMirrorSetupRuntimeInstallOptions {
  windowLike?: RankedCheckpointLocalMirrorWindowLike | null;
}

const SAVED_STATE_KEY_PREFIX = "savedGameStateByMode:v1:";
const SAVED_STATE_LITE_KEY_PREFIX = "savedGameStateLiteByMode:v1:";
const AUTH_USER_ID_KEY = "2048_auth_userId_v1";

type RecordLike = Record<string, unknown>;

function resolveModeKey(manager: RankedCheckpointLocalMirrorManagerLike | null | undefined): string {
  if (!manager) return "";
  if (typeof manager.modeKey === "string" && manager.modeKey) return manager.modeKey;
  if (typeof manager.mode === "string" && manager.mode) return manager.mode;
  return "";
}

function resolveWindowLike(
  manager: RankedCheckpointLocalMirrorManagerLike | null | undefined
): RankedCheckpointLocalMirrorWindowLike | null {
  return manager && typeof manager.getWindowLike === "function" ? manager.getWindowLike() : null;
}

function resolveStorage(
  manager: RankedCheckpointLocalMirrorManagerLike | null | undefined
): RankedCheckpointLocalMirrorStorageLike | null {
  const windowLike = resolveWindowLike(manager);
  return windowLike && windowLike.localStorage ? windowLike.localStorage : null;
}

function resolveMirrorStorageKey(modeKey: string): string {
  return `ranked_checkpoint_local_mirror:v1:${modeKey}`;
}

function asRecord(value: unknown): RecordLike | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as RecordLike) : null;
}

function readRecord(storage: RankedCheckpointLocalMirrorStorageLike, key: string): RecordLike | null {
  try {
    const raw = storage.getItem?.(key);
    if (!raw) return null;
    return asRecord(JSON.parse(raw));
  } catch (_error) {
    return null;
  }
}

function resolveSavedAt(record: RecordLike | null): number {
  const value = Number(record?.saved_at);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

function resolveSessionIdentity(record: RecordLike | null): string | null {
  if (!record) return null;
  const token = String(record.ranked_session_token || "").trim();
  const challenge = String(record.challenge_id || "").trim();
  const seed = Number(record.initial_seed);
  if (!token || !challenge || !Number.isSafeInteger(seed) || seed < 0) return null;
  return `${token}\u0000${challenge}\u0000${seed}`;
}

function isSameSession(left: RecordLike | null, right: RecordLike | null): boolean {
  const leftIdentity = resolveSessionIdentity(left);
  const rightIdentity = resolveSessionIdentity(right);
  return leftIdentity === rightIdentity;
}

function resolveMirrorSavedState(record: RecordLike): RecordLike | null {
  return asRecord(asRecord(record.ui_state)?.saved_state);
}

function hasNewerOrdinarySavedState(
  storage: RankedCheckpointLocalMirrorStorageLike,
  modeKey: string,
  mirrorRecord: RecordLike,
  mirrorSavedState: RecordLike | null
): boolean {
  const mirrorAt = Math.max(resolveSavedAt(mirrorRecord), resolveSavedAt(mirrorSavedState));
  const mirrorIdentitySource = mirrorSavedState || mirrorRecord;
  for (const key of [
    `${SAVED_STATE_KEY_PREFIX}${modeKey}`,
    `${SAVED_STATE_LITE_KEY_PREFIX}${modeKey}`
  ]) {
    const candidate = readRecord(storage, key);
    if (!candidate || String(candidate.mode_key || "").trim() !== modeKey) continue;
    if (!isSameSession(mirrorIdentitySource, candidate)) continue;
    const candidateAt = resolveSavedAt(candidate);
    if (candidateAt > 0 && candidateAt >= mirrorAt) return true;
  }
  return false;
}

function readUsableMirrorRecord(
  storage: RankedCheckpointLocalMirrorStorageLike,
  modeKey: string
): { record: RecordLike; savedState: RecordLike | null } | null {
  const record = readRecord(storage, resolveMirrorStorageKey(modeKey));
  if (!record) return null;
  const savedState = resolveMirrorSavedState(record);
  const recordModeKey = String(record.mode_key || savedState?.mode_key || "").trim();
  if (recordModeKey !== modeKey) return null;

  const currentUserId = String(storage.getItem?.(AUTH_USER_ID_KEY) || "").trim();
  const ownerUserId = String(record.owner_user_id || "").trim();
  if (currentUserId ? !ownerUserId || ownerUserId !== currentUserId : !!ownerUserId) return null;
  if (hasNewerOrdinarySavedState(storage, modeKey, record, savedState)) return null;
  return { record, savedState };
}

export function hasRankedCheckpointLocalMirrorForSetup(
  manager: RankedCheckpointLocalMirrorManagerLike | null | undefined
): boolean {
  if (!manager || manager.rankPolicy !== "ranked") return false;
  const modeKey = resolveModeKey(manager);
  if (!modeKey) return false;
  try {
    const storage = resolveStorage(manager);
    if (!storage || typeof storage.getItem !== "function") return false;
    return !!readUsableMirrorRecord(storage, modeKey);
  } catch (_error) {
    return false;
  }
}

export function readRankedCheckpointLocalMirrorSavedStateForSetup(
  manager: RankedCheckpointLocalMirrorManagerLike | null | undefined
): unknown | null {
  if (!manager || manager.rankPolicy !== "ranked") return null;
  const modeKey = resolveModeKey(manager);
  if (!modeKey) return null;
  try {
    const storage = resolveStorage(manager);
    if (!storage || typeof storage.getItem !== "function") return null;
    return readUsableMirrorRecord(storage, modeKey)?.savedState || null;
  } catch (_error) {
    return null;
  }
}

export function createRankedCheckpointLocalMirrorSetupRuntime(): RankedCheckpointLocalMirrorSetupRuntime {
  return {
    hasRankedCheckpointLocalMirrorForSetup,
    readRankedCheckpointLocalMirrorSavedStateForSetup
  };
}

export function installRankedCheckpointLocalMirrorSetupRuntime(
  options: RankedCheckpointLocalMirrorSetupRuntimeInstallOptions = {}
): RankedCheckpointLocalMirrorSetupRuntime | null {
  const target =
    options.windowLike === undefined
      ? typeof window === "undefined"
        ? null
        : (window as unknown as RankedCheckpointLocalMirrorWindowLike)
      : options.windowLike;
  if (!target) return null;
  if (!target.CoreRankedCheckpointLocalMirrorSetupRuntime) {
    target.CoreRankedCheckpointLocalMirrorSetupRuntime = createRankedCheckpointLocalMirrorSetupRuntime();
  }
  return target.CoreRankedCheckpointLocalMirrorSetupRuntime;
}
