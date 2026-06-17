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

export function hasRankedCheckpointLocalMirrorForSetup(
  manager: RankedCheckpointLocalMirrorManagerLike | null | undefined
): boolean {
  if (!manager || manager.rankPolicy !== "ranked") return false;
  const modeKey = resolveModeKey(manager);
  if (!modeKey) return false;
  try {
    const storage = resolveStorage(manager);
    if (!storage || typeof storage.getItem !== "function") return false;
    const raw = storage.getItem(resolveMirrorStorageKey(modeKey));
    return typeof raw === "string" && raw.trim().length > 0;
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
    const raw = storage.getItem(resolveMirrorStorageKey(modeKey));
    if (!(typeof raw === "string" && raw)) return null;
    const parsed = JSON.parse(raw);
    if (!(parsed && typeof parsed === "object" && !Array.isArray(parsed))) return null;
    const storageLike = storage;
    const currentUserId = String(storageLike.getItem?.("2048_auth_userId_v1") || "").trim();
    const ownerUserId = String((parsed as Record<string, unknown>).owner_user_id || "").trim();
    if (currentUserId) {
      if (!ownerUserId || ownerUserId !== currentUserId) return null;
    } else if (ownerUserId) {
      return null;
    }
    const uiState = (parsed as Record<string, unknown>).ui_state;
    if (!uiState || typeof uiState !== "object" || Array.isArray(uiState)) return null;
    const savedState = (uiState as Record<string, unknown>).saved_state;
    if (!(savedState && typeof savedState === "object" && !Array.isArray(savedState))) return null;
    if (String((savedState as Record<string, unknown>).mode_key || "").trim() !== modeKey) return null;
    return savedState;
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
