import { createUndoSnapshot } from "../core/undo-snapshot";

export interface UndoSnapshotRuntime {
  createUndoSnapshot: typeof createUndoSnapshot;
}

export interface UndoSnapshotRuntimeWindowLike {
  CoreUndoSnapshotRuntime?: UndoSnapshotRuntime;
}

export interface UndoSnapshotRuntimeInstallOptions {
  windowLike?: UndoSnapshotRuntimeWindowLike | null | undefined;
}

export function createUndoSnapshotRuntime(): UndoSnapshotRuntime {
  return {
    createUndoSnapshot
  };
}

export function installUndoSnapshotRuntime(
  options: UndoSnapshotRuntimeInstallOptions = {}
): UndoSnapshotRuntime | null {
  const windowLike =
    options.windowLike ||
    (typeof window === "undefined" ? null : (window as unknown as UndoSnapshotRuntimeWindowLike));
  if (!windowLike) return null;
  if (!windowLike.CoreUndoSnapshotRuntime) {
    windowLike.CoreUndoSnapshotRuntime = createUndoSnapshotRuntime();
  }
  return windowLike.CoreUndoSnapshotRuntime || null;
}
