function resolveRuntimeCallResult(manager, runtimeMethodName, methodName, runtimeArgs) {
  if (!manager) return null;
  if (typeof runtimeMethodName !== "string" || !runtimeMethodName) return null;
  var runtimeMethod = manager[runtimeMethodName];
  if (typeof runtimeMethod !== "function") return null;
  var resolvedArgs = Array.isArray(runtimeArgs) ? runtimeArgs : [];
  return runtimeMethod.call(manager, methodName, resolvedArgs);
}

function resolveCorePayloadCallWith(
  manager,
  runtimeMethodName,
  methodName,
  payload,
  emptyValue,
  resolver
) {
  if (!manager) return emptyValue;
  var payloadArg = typeof payload === "undefined" ? {} : payload;
  var coreCallResult = resolveRuntimeCallResult(manager, runtimeMethodName, methodName, [payloadArg]);
  return resolver(manager, coreCallResult);
}

function resolveCoreArgsCallWith(
  manager,
  runtimeMethodName,
  methodName,
  runtimeArgs,
  emptyValue,
  resolver
) {
  if (!manager) return emptyValue;
  var coreCallResult = resolveRuntimeCallResult(manager, runtimeMethodName, methodName, runtimeArgs);
  return resolver(manager, coreCallResult);
}

function callCoreStorageRuntime(manager, methodName, payload, includeWindowContext) {
  if (!manager) return null;
  var resolvedPayload =
    includeWindowContext === true
      ? Object.assign({ windowLike: manager ? manager.getWindowLike() : null }, payload || {})
      : typeof payload === "undefined"
        ? {}
        : payload;
  return resolveRuntimeCallResult(
    manager,
    "callCoreStorageRuntime",
    methodName,
    [resolvedPayload]
  );
}

function setRuntimeScore(manager, value) {
  if (!manager) return;
  var nextScore = Number(value);
  manager.score = Number.isFinite(nextScore) ? nextScore : 0;
}

function addRuntimeScoreDelta(manager, delta) {
  if (!manager) return;
  var numericDelta = Number(delta);
  if (!Number.isFinite(numericDelta) || numericDelta === 0) return;
  var baseScore = Number(manager.score);
  manager.score = (Number.isFinite(baseScore) ? baseScore : 0) + numericDelta;
}

function setRuntimeReplayIndex(manager, value) {
  if (!manager) return;
  var nextIndex = Number(value);
  manager.replayIndex = Number.isInteger(nextIndex) && nextIndex >= 0 ? nextIndex : 0;
}

function setRuntimeGrid(manager, grid) {
  if (!manager) return;
  manager.grid = grid || null;
}

function setRuntimeUndoStack(manager, nextUndoStack) {
  if (!manager) return;
  manager.undoStack = Array.isArray(nextUndoStack) ? nextUndoStack : [];
}

function setRuntimeRedoStack(manager, nextRedoStack) {
  if (!manager) return;
  manager.redoStack = Array.isArray(nextRedoStack) ? nextRedoStack : [];
}

function pushRuntimeUndoStackEntry(manager, entry) {
  if (!manager) return;
  if (!Array.isArray(manager.undoStack)) manager.undoStack = [];
  manager.undoStack.push(entry);
}

function clearRuntimeRedoStack(manager) {
  if (!manager) return;
  manager.redoStack = [];
}

function writeRuntimeGridCell(manager, x, y, tile) {
  if (!(manager && manager.grid && Array.isArray(manager.grid.cells))) return false;
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0) return false;
  if (!Array.isArray(manager.grid.cells[x])) return false;
  manager.grid.cells[x][y] = tile || null;
  return true;
}

function clearRuntimeGridCell(manager, x, y) {
  return writeRuntimeGridCell(manager, x, y, null);
}
