import { computePostMoveRecord } from "../core/post-move-record";

export interface PostMoveRecordRuntime {
  computePostMoveRecord: typeof computePostMoveRecord;
}

export interface PostMoveRecordRuntimeWindowLike {
  CorePostMoveRecordRuntime?: PostMoveRecordRuntime;
}

export interface PostMoveRecordRuntimeInstallOptions {
  windowLike?: PostMoveRecordRuntimeWindowLike | null | undefined;
}

export function createPostMoveRecordRuntime(): PostMoveRecordRuntime {
  return {
    computePostMoveRecord
  };
}

export function installPostMoveRecordRuntime(
  options: PostMoveRecordRuntimeInstallOptions = {}
): PostMoveRecordRuntime | null {
  const windowLike =
    options.windowLike ||
    (typeof window === "undefined" ? null : (window as unknown as PostMoveRecordRuntimeWindowLike));
  if (!windowLike) return null;
  if (!windowLike.CorePostMoveRecordRuntime) {
    windowLike.CorePostMoveRecordRuntime = createPostMoveRecordRuntime();
  }
  return windowLike.CorePostMoveRecordRuntime || null;
}
