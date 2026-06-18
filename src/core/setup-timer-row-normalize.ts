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
  appendSetupTimerTrailingNodes: typeof appendSetupTimerTrailingNodes;
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

interface SetupTimerTrailingNodeLike {
  nodeType?: unknown;
  nodeValue?: unknown;
  tagName?: unknown;
  nextSibling?: unknown;
}

interface SetupTimerTrailingRowLike {
  appendChild: (node: SetupTimerTrailingNodeLike) => unknown;
}

function isSetupTimerTrailingNode(value: unknown): value is SetupTimerTrailingNodeLike {
  return !!value && typeof value === "object";
}

function isSetupTimerTrailingRow(value: unknown): value is SetupTimerTrailingRowLike {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as { appendChild?: unknown }).appendChild === "function"
  );
}

function isSetupWhitespaceTextNode(node: unknown): node is SetupTimerTrailingNodeLike {
  return (
    isSetupTimerTrailingNode(node) &&
    node.nodeType === 3 &&
    String(node.nodeValue || "").trim() === ""
  );
}

function isSetupBreakNode(node: unknown): node is SetupTimerTrailingNodeLike {
  return (
    isSetupTimerTrailingNode(node) &&
    node.nodeType === 1 &&
    !!node.tagName &&
    String(node.tagName).toLowerCase() === "br"
  );
}

export function appendSetupTimerTrailingNodes(row: unknown, nextAfterTimer: unknown): number {
  if (!isSetupTimerTrailingRow(row)) return 0;
  let cursor = nextAfterTimer;
  let movedBr = 0;
  while (cursor && movedBr < 2) {
    if (isSetupWhitespaceTextNode(cursor)) {
      const whitespaceNode = cursor;
      cursor = cursor.nextSibling;
      row.appendChild(whitespaceNode);
      continue;
    }
    if (!isSetupBreakNode(cursor)) break;
    const brNode = cursor;
    cursor = cursor.nextSibling;
    row.appendChild(brNode);
    movedBr += 1;
  }
  return movedBr;
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
    normalizeLegacyTimerRowsForSetup,
    appendSetupTimerTrailingNodes
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
