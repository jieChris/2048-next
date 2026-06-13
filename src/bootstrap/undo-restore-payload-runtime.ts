import {
  computeUndoRestorePayload,
  type UndoRestorePayloadInput,
  type UndoRestorePayloadResult
} from "../core/undo-restore-payload";

export type UndoRestorePayloadRuntimeInput = Partial<UndoRestorePayloadInput> | null | undefined;

export interface UndoRestorePayloadRuntime {
  computeUndoRestorePayload: (
    input: UndoRestorePayloadRuntimeInput
  ) => UndoRestorePayloadResult;
}

export interface UndoRestorePayloadRuntimeWindowLike {
  CoreUndoRestorePayloadRuntime?: UndoRestorePayloadRuntime;
}

export interface UndoRestorePayloadRuntimeInstallOptions {
  windowLike?: UndoRestorePayloadRuntimeWindowLike | null | undefined;
}

function normalizeLegacyUndoRestorePayloadInput(
  input: UndoRestorePayloadRuntimeInput
): UndoRestorePayloadInput {
  const opts = input || {};
  return {
    prev: opts.prev,
    fallbackScore: opts.fallbackScore as number
  };
}

export function createUndoRestorePayloadRuntime(): UndoRestorePayloadRuntime {
  return {
    computeUndoRestorePayload: (input) =>
      computeUndoRestorePayload(normalizeLegacyUndoRestorePayloadInput(input))
  };
}

export function installUndoRestorePayloadRuntime(
  options: UndoRestorePayloadRuntimeInstallOptions = {}
): UndoRestorePayloadRuntime | null {
  const windowLike =
    options.windowLike ||
    (typeof window === "undefined"
      ? null
      : (window as unknown as UndoRestorePayloadRuntimeWindowLike));
  if (!windowLike) return null;
  if (!windowLike.CoreUndoRestorePayloadRuntime) {
    windowLike.CoreUndoRestorePayloadRuntime = createUndoRestorePayloadRuntime();
  }
  return windowLike.CoreUndoRestorePayloadRuntime || null;
}
