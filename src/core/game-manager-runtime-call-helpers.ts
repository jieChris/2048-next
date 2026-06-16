export type GameManagerRuntimeCallManagerLike = Record<PropertyKey, unknown>;

export type CoreCallResolver<T = unknown> = (
  manager: GameManagerRuntimeCallManagerLike,
  coreCallResult: unknown
) => T;

interface RuntimeGridLike {
  cells?: unknown;
}

function isRecordLike(value: unknown): value is GameManagerRuntimeCallManagerLike {
  return !!value && (typeof value === "object" || typeof value === "function");
}

function getManagerRecord(manager: unknown): GameManagerRuntimeCallManagerLike | null {
  return isRecordLike(manager) ? manager : null;
}

export function resolveRuntimeCallResult(
  manager: unknown,
  runtimeMethodName: unknown,
  methodName: unknown,
  runtimeArgs: unknown
): unknown | null {
  const managerRecord = getManagerRecord(manager);
  if (!managerRecord) return null;
  if (typeof runtimeMethodName !== "string" || !runtimeMethodName) return null;
  const runtimeMethod = managerRecord[runtimeMethodName];
  if (typeof runtimeMethod !== "function") return null;
  const resolvedArgs = Array.isArray(runtimeArgs) ? runtimeArgs : [];
  return runtimeMethod.call(managerRecord, methodName, resolvedArgs);
}

export function resolveCorePayloadCallWith<T = unknown>(
  manager: unknown,
  runtimeMethodName: unknown,
  methodName: unknown,
  payload: unknown,
  emptyValue: T,
  resolver: CoreCallResolver<T>
): T {
  const managerRecord = getManagerRecord(manager);
  if (!managerRecord) return emptyValue;
  const payloadArg = typeof payload === "undefined" ? {} : payload;
  const coreCallResult = resolveRuntimeCallResult(managerRecord, runtimeMethodName, methodName, [payloadArg]);
  return resolver(managerRecord, coreCallResult);
}

export function resolveCoreArgsCallWith<T = unknown>(
  manager: unknown,
  runtimeMethodName: unknown,
  methodName: unknown,
  runtimeArgs: unknown,
  emptyValue: T,
  resolver: CoreCallResolver<T>
): T {
  const managerRecord = getManagerRecord(manager);
  if (!managerRecord) return emptyValue;
  const coreCallResult = resolveRuntimeCallResult(managerRecord, runtimeMethodName, methodName, runtimeArgs);
  return resolver(managerRecord, coreCallResult);
}

export function callCoreStorageRuntime(
  manager: unknown,
  methodName: unknown,
  payload: unknown,
  includeWindowContext: unknown
): unknown | null {
  const managerRecord = getManagerRecord(manager);
  if (!managerRecord) return null;
  const getWindowLike = managerRecord.getWindowLike;
  const resolvedPayload =
    includeWindowContext === true
      ? Object.assign(
          {
            windowLike: typeof getWindowLike === "function" ? getWindowLike.call(managerRecord) : null
          },
          isRecordLike(payload) ? payload : {}
        )
      : typeof payload === "undefined"
        ? {}
        : payload;
  return resolveRuntimeCallResult(
    managerRecord,
    "callCoreStorageRuntime",
    methodName,
    [resolvedPayload]
  );
}

export function setRuntimeScore(manager: unknown, value: unknown): void {
  const managerRecord = getManagerRecord(manager);
  if (!managerRecord) return;
  const nextScore = Number(value);
  managerRecord.score = Number.isFinite(nextScore) ? nextScore : 0;
}

export function addRuntimeScoreDelta(manager: unknown, delta: unknown): void {
  const managerRecord = getManagerRecord(manager);
  if (!managerRecord) return;
  const numericDelta = Number(delta);
  if (!Number.isFinite(numericDelta) || numericDelta === 0) return;
  const baseScore = Number(managerRecord.score);
  managerRecord.score = (Number.isFinite(baseScore) ? baseScore : 0) + numericDelta;
}

export function setRuntimeReplayIndex(manager: unknown, value: unknown): void {
  const managerRecord = getManagerRecord(manager);
  if (!managerRecord) return;
  const nextIndex = Number(value);
  managerRecord.replayIndex = Number.isInteger(nextIndex) && nextIndex >= 0 ? nextIndex : 0;
}

export function setRuntimeReplayMoves(manager: unknown, replayMoves: unknown): void {
  const managerRecord = getManagerRecord(manager);
  if (!managerRecord) return;
  managerRecord.replayMoves = Array.isArray(replayMoves) ? replayMoves : [];
}

export function setRuntimeReplaySpawns(manager: unknown, replaySpawns: unknown): void {
  const managerRecord = getManagerRecord(manager);
  if (!managerRecord) return;
  managerRecord.replaySpawns = replaySpawns;
}

export function setRuntimeReplayMovesV2(manager: unknown, replayMovesV2: unknown): void {
  const managerRecord = getManagerRecord(manager);
  if (!managerRecord) return;
  managerRecord.replayMovesV2 = replayMovesV2;
}

export function setRuntimeUndoEnabled(manager: unknown, undoEnabled: unknown): void {
  const managerRecord = getManagerRecord(manager);
  if (!managerRecord) return;
  managerRecord.undoEnabled = undoEnabled;
}

export function setRuntimeDisableSessionSync(manager: unknown, disableSessionSync: unknown): void {
  const managerRecord = getManagerRecord(manager);
  if (!managerRecord) return;
  managerRecord.disableSessionSync = disableSessionSync;
}

export function setRuntimeReplayDelay(manager: unknown, replayDelay: unknown): void {
  const managerRecord = getManagerRecord(manager);
  if (!managerRecord) return;
  managerRecord.replayDelay = replayDelay;
}

export function setRuntimeGrid(manager: unknown, grid: unknown): void {
  const managerRecord = getManagerRecord(manager);
  if (!managerRecord) return;
  managerRecord.grid = grid || null;
}

export function setRuntimeUndoStack(manager: unknown, nextUndoStack: unknown): void {
  const managerRecord = getManagerRecord(manager);
  if (!managerRecord) return;
  managerRecord.undoStack = Array.isArray(nextUndoStack) ? nextUndoStack : [];
}

export function setRuntimeRedoStack(manager: unknown, nextRedoStack: unknown): void {
  const managerRecord = getManagerRecord(manager);
  if (!managerRecord) return;
  managerRecord.redoStack = Array.isArray(nextRedoStack) ? nextRedoStack : [];
}

export function pushRuntimeUndoStackEntry(manager: unknown, entry: unknown): void {
  const managerRecord = getManagerRecord(manager);
  if (!managerRecord) return;
  if (!Array.isArray(managerRecord.undoStack)) managerRecord.undoStack = [];
  const undoStack = managerRecord.undoStack;
  if (Array.isArray(undoStack)) undoStack.push(entry);
}

export function clearRuntimeRedoStack(manager: unknown): void {
  const managerRecord = getManagerRecord(manager);
  if (!managerRecord) return;
  managerRecord.redoStack = [];
}

export function writeRuntimeGridCell(manager: unknown, x: unknown, y: unknown, tile: unknown): boolean {
  const managerRecord = getManagerRecord(manager);
  const grid = managerRecord?.grid as RuntimeGridLike | null | undefined;
  const cells = grid?.cells;
  if (!(managerRecord && grid && Array.isArray(cells))) return false;
  if (typeof x !== "number" || typeof y !== "number") return false;
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0) return false;
  const row = cells[x];
  if (!Array.isArray(row)) return false;
  row[y] = tile || null;
  return true;
}

export function clearRuntimeGridCell(manager: unknown, x: unknown, y: unknown): boolean {
  return writeRuntimeGridCell(manager, x, y, null);
}
