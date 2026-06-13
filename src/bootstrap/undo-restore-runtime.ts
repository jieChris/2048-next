import {
  computeUndoRestoreState,
  type UndoRestoreInput,
  type UndoRestoreResult
} from "../core/undo-restore";

export type UndoRestoreRuntimeInput = Partial<UndoRestoreInput> | null | undefined;

export interface UndoRestoreRuntime {
  computeUndoRestoreState: (input: UndoRestoreRuntimeInput) => UndoRestoreResult;
}

export interface UndoRestoreRuntimeWindowLike {
  CoreUndoRestoreRuntime?: UndoRestoreRuntime;
  CoreEngineFacade?: Partial<UndoRestoreEngineFacade>;
}

interface UndoRestoreEngineFacade {
  computeUndoRestoreState: (input: UndoRestoreInput) => UndoRestoreResult;
}

export interface UndoRestoreRuntimeInstallOptions {
  windowLike?: UndoRestoreRuntimeWindowLike | null | undefined;
}

function normalizeLegacyUndoRestoreInput(input: UndoRestoreRuntimeInput): UndoRestoreInput {
  const opts = input || {};
  return {
    prev: opts.prev,
    fallbackUndoUsed: opts.fallbackUndoUsed as number,
    timerStatus: opts.timerStatus as number
  };
}

function resolveEngineUndoFacade(
  windowLike?: UndoRestoreRuntimeWindowLike | null
): UndoRestoreEngineFacade | null {
  const facade = windowLike?.CoreEngineFacade;
  if (!facade || typeof facade !== "object") return null;
  if (typeof facade.computeUndoRestoreState !== "function") return null;
  return { computeUndoRestoreState: facade.computeUndoRestoreState };
}

export function createUndoRestoreRuntime(
  windowLike?: UndoRestoreRuntimeWindowLike | null
): UndoRestoreRuntime {
  return {
    computeUndoRestoreState: (input) => {
      const normalizedInput = normalizeLegacyUndoRestoreInput(input);
      const facade = resolveEngineUndoFacade(windowLike);
      if (facade) {
        try {
          return facade.computeUndoRestoreState({
            prev: normalizedInput.prev,
            fallbackUndoUsed: normalizedInput.fallbackUndoUsed,
            timerStatus: normalizedInput.timerStatus
          });
        } catch (_err) {}
      }
      return computeUndoRestoreState(normalizedInput);
    }
  };
}

export function installUndoRestoreRuntime(
  options: UndoRestoreRuntimeInstallOptions = {}
): UndoRestoreRuntime | null {
  const windowLike =
    options.windowLike ||
    (typeof window === "undefined" ? null : (window as unknown as UndoRestoreRuntimeWindowLike));
  if (!windowLike) return null;
  if (!windowLike.CoreUndoRestoreRuntime) {
    windowLike.CoreUndoRestoreRuntime = createUndoRestoreRuntime(windowLike);
  }
  return windowLike.CoreUndoRestoreRuntime || null;
}
