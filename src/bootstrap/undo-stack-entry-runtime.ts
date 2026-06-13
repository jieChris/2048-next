import {
  normalizeUndoStackEntry,
  type UndoStackEntryInput,
  type UndoStackEntryResult
} from "../core/undo-stack-entry";

export type UndoStackEntryRuntimeInput = Partial<UndoStackEntryInput> | null | undefined;

export interface UndoStackEntryRuntime {
  normalizeUndoStackEntry: (input: UndoStackEntryRuntimeInput) => UndoStackEntryResult;
}

export interface UndoStackEntryRuntimeWindowLike {
  CoreUndoStackEntryRuntime?: UndoStackEntryRuntime;
}

export interface UndoStackEntryRuntimeInstallOptions {
  windowLike?: UndoStackEntryRuntimeWindowLike | null | undefined;
}

function normalizeLegacyUndoStackEntryInput(input: UndoStackEntryRuntimeInput): UndoStackEntryInput {
  const opts = input || {};
  return {
    entry: opts.entry,
    fallbackScore: opts.fallbackScore as number,
    fallbackComboStreak: opts.fallbackComboStreak as number,
    fallbackSuccessfulMoveCount: opts.fallbackSuccessfulMoveCount as number,
    fallbackLockConsumedAtMoveCount: opts.fallbackLockConsumedAtMoveCount as number,
    fallbackLockedDirectionTurn: opts.fallbackLockedDirectionTurn as number | null,
    fallbackLockedDirection: opts.fallbackLockedDirection as number | null,
    fallbackUndoUsed: opts.fallbackUndoUsed as number
  };
}

export function createUndoStackEntryRuntime(): UndoStackEntryRuntime {
  return {
    normalizeUndoStackEntry: (input) =>
      normalizeUndoStackEntry(normalizeLegacyUndoStackEntryInput(input))
  };
}

export function installUndoStackEntryRuntime(
  options: UndoStackEntryRuntimeInstallOptions = {}
): UndoStackEntryRuntime | null {
  const windowLike =
    options.windowLike ||
    (typeof window === "undefined"
      ? null
      : (window as unknown as UndoStackEntryRuntimeWindowLike));
  if (!windowLike) return null;
  if (!windowLike.CoreUndoStackEntryRuntime) {
    windowLike.CoreUndoStackEntryRuntime = createUndoStackEntryRuntime();
  }
  return windowLike.CoreUndoStackEntryRuntime || null;
}
