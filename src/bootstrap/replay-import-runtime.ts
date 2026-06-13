import {
  parseReplayImportEnvelope,
  type ParseReplayImportEnvelopeInput,
  type ReplayImportEnvelope
} from "../core/replay-import";

export interface ReplayImportRuntime {
  parseReplayImportEnvelope: (input: ParseReplayImportEnvelopeInput) => ReplayImportEnvelope;
}

export interface ReplayImportRuntimeWindowLike {
  CoreReplayImportRuntime?: ReplayImportRuntime;
}

export interface ReplayImportRuntimeInstallOptions {
  windowLike?: ReplayImportRuntimeWindowLike | null | undefined;
}

export function createReplayImportRuntime(): ReplayImportRuntime {
  return {
    parseReplayImportEnvelope
  };
}

export function installReplayImportRuntime(
  options: ReplayImportRuntimeInstallOptions = {}
): ReplayImportRuntime | null {
  const windowLike =
    options.windowLike ||
    (typeof window === "undefined"
      ? null
      : (window as unknown as ReplayImportRuntimeWindowLike));
  if (!windowLike) return null;
  if (!windowLike.CoreReplayImportRuntime) {
    windowLike.CoreReplayImportRuntime = createReplayImportRuntime();
  }
  return windowLike.CoreReplayImportRuntime || null;
}
