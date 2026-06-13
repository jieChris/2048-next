import {
  computePostUndoRecord,
  type PostUndoRecordInput,
  type PostUndoRecordResult
} from "../core/post-undo-record";

export interface PostUndoRecordRuntime {
  computePostUndoRecord: (input: PostUndoRecordInput) => PostUndoRecordResult;
}

export interface PostUndoRecordRuntimeWindowLike {
  CorePostUndoRecordRuntime?: PostUndoRecordRuntime;
}

export interface PostUndoRecordRuntimeInstallOptions {
  windowLike?: PostUndoRecordRuntimeWindowLike | null | undefined;
}

export function createPostUndoRecordRuntime(): PostUndoRecordRuntime {
  return {
    computePostUndoRecord
  };
}

export function installPostUndoRecordRuntime(
  options: PostUndoRecordRuntimeInstallOptions = {}
): PostUndoRecordRuntime | null {
  const windowLike =
    options.windowLike ||
    (typeof window === "undefined"
      ? null
      : (window as unknown as PostUndoRecordRuntimeWindowLike));
  if (!windowLike) return null;
  if (!windowLike.CorePostUndoRecordRuntime) {
    windowLike.CorePostUndoRecordRuntime = createPostUndoRecordRuntime();
  }
  return windowLike.CorePostUndoRecordRuntime || null;
}
