export interface SetupTimerRowNormalizeInput {
  manager: unknown;
  timerSlotIds: unknown[];
}

export interface SetupTimerRowNormalizeOperations {
  resolveTimerBox: (manager: unknown) => unknown | null;
  resolveDocumentLike: (manager: unknown) => { createElement?: unknown } | null;
  resolveExistingRow: (manager: unknown, rowId: string) => unknown | null;
  ensureRowItemClass: (row: unknown) => void;
  createRowForSlot: (manager: unknown, timerBox: unknown, documentLike: unknown, slot: number) => void;
}

export interface SetupTimerRowNormalizeRuntime {
  normalizeLegacyTimerRowsForSetup: typeof normalizeLegacyTimerRowsForSetup;
}

export interface SetupTimerRowNormalizeWindowLike {
  CoreSetupTimerRowNormalizeRuntime?: SetupTimerRowNormalizeRuntime;
}

export interface SetupTimerRowNormalizeRuntimeInstallOptions {
  windowLike?: SetupTimerRowNormalizeWindowLike | null;
}

function normalizeSetupTimerSlotValue(slotValue: unknown): number | null {
  const slot = Number(slotValue);
  if (!Number.isInteger(slot) || slot <= 0) return null;
  return slot;
}

function canCreateElement(documentLike: { createElement?: unknown } | null): boolean {
  return !!documentLike && typeof documentLike.createElement === "function";
}

export function normalizeLegacyTimerRowsForSetup(
  input: SetupTimerRowNormalizeInput,
  operations: SetupTimerRowNormalizeOperations
): boolean {
  const timerBox = operations.resolveTimerBox(input.manager);
  if (!timerBox) return true;
  const documentLike = operations.resolveDocumentLike(input.manager);
  if (!canCreateElement(documentLike)) return true;
  for (const slotValue of input.timerSlotIds) {
    const slot = normalizeSetupTimerSlotValue(slotValue);
    if (slot === null) continue;
    const rowId = `timer-row-${String(slot)}`;
    const existingRow = operations.resolveExistingRow(input.manager, rowId);
    if (existingRow) {
      operations.ensureRowItemClass(existingRow);
      continue;
    }
    operations.createRowForSlot(input.manager, timerBox, documentLike, slot);
  }
  return true;
}

export function createSetupTimerRowNormalizeRuntime(): SetupTimerRowNormalizeRuntime {
  return {
    normalizeLegacyTimerRowsForSetup
  };
}

export function installSetupTimerRowNormalizeRuntime(
  options: SetupTimerRowNormalizeRuntimeInstallOptions = {}
): SetupTimerRowNormalizeRuntime | null {
  const target =
    options.windowLike === undefined
      ? typeof window === "undefined"
        ? null
        : (window as unknown as SetupTimerRowNormalizeWindowLike)
      : options.windowLike;
  if (!target) return null;
  if (!target.CoreSetupTimerRowNormalizeRuntime) {
    target.CoreSetupTimerRowNormalizeRuntime = createSetupTimerRowNormalizeRuntime();
  }
  return target.CoreSetupTimerRowNormalizeRuntime;
}
