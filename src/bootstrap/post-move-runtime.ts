import { computePostMoveLifecycle } from "../core/post-move";

export interface PostMoveRuntime {
  computePostMoveLifecycle: typeof computePostMoveLifecycle;
}

export interface PostMoveRuntimeWindowLike {
  CorePostMoveRuntime?: PostMoveRuntime;
}

export interface PostMoveRuntimeInstallOptions {
  windowLike?: PostMoveRuntimeWindowLike | null | undefined;
}

export function createPostMoveRuntime(): PostMoveRuntime {
  return {
    computePostMoveLifecycle
  };
}

export function installPostMoveRuntime(
  options: PostMoveRuntimeInstallOptions = {}
): PostMoveRuntime | null {
  const windowLike =
    options.windowLike ||
    (typeof window === "undefined" ? null : (window as unknown as PostMoveRuntimeWindowLike));
  if (!windowLike) return null;
  if (!windowLike.CorePostMoveRuntime) {
    windowLike.CorePostMoveRuntime = createPostMoveRuntime();
  }
  return windowLike.CorePostMoveRuntime || null;
}
