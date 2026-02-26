function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function toRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function asFunction<T extends (...args: never[]) => unknown>(value: unknown): T | null {
  return typeof value === "function" ? (value as T) : null;
}

function resolveStorageByName(input: {
  storageRuntime?: unknown;
  windowLike?: unknown;
  storageName?: unknown;
}): unknown {
  const source = toRecord(input);
  const storageRuntime = toRecord(source.storageRuntime);
  const resolveStorage = asFunction<(payload: unknown) => unknown>(
    storageRuntime.resolveStorageByName
  );
  if (!resolveStorage) return null;
  return resolveStorage({
    windowLike: source.windowLike || null,
    storageName: source.storageName
  });
}

export interface ApplyPracticeTransferPageActionResult {
  didInvokeHost: boolean;
  localStorageResolved: boolean;
  sessionStorageResolved: boolean;
  transferResult: unknown;
}

export function applyPracticeTransferPageAction(input: {
  practiceTransferHostRuntime?: unknown;
  practiceTransferRuntime?: unknown;
  storageRuntime?: unknown;
  manager?: unknown;
  gameModeConfig?: unknown;
  guideShownKey?: unknown;
  guideSeenFlag?: unknown;
  localStorageKey?: unknown;
  sessionStorageKey?: unknown;
  documentLike?: unknown;
  windowLike?: unknown;
  alertLike?: unknown;
}): ApplyPracticeTransferPageActionResult {
  const source = toRecord(input);
  const hostRuntime = toRecord(source.practiceTransferHostRuntime);
  const applyTransfer = asFunction<(payload: unknown) => unknown>(
    hostRuntime.applyPracticeTransferFromCurrent
  );
  if (!applyTransfer) {
    return {
      didInvokeHost: false,
      localStorageResolved: false,
      sessionStorageResolved: false,
      transferResult: null
    };
  }

  const windowLike = source.windowLike || null;
  const localStorageLike = resolveStorageByName({
    storageRuntime: source.storageRuntime,
    windowLike,
    storageName: "localStorage"
  });
  const sessionStorageLike = resolveStorageByName({
    storageRuntime: source.storageRuntime,
    windowLike,
    storageName: "sessionStorage"
  });

  const transferResult = applyTransfer({
    manager: source.manager || null,
    gameModeConfig:
      source.gameModeConfig && typeof source.gameModeConfig === "object"
        ? source.gameModeConfig
        : null,
    practiceTransferRuntime: source.practiceTransferRuntime || null,
    localStorageLike,
    sessionStorageLike,
    guideShownKey: source.guideShownKey,
    guideSeenFlag: source.guideSeenFlag,
    localStorageKey: source.localStorageKey,
    sessionStorageKey: source.sessionStorageKey,
    documentLike: source.documentLike || null,
    windowLike,
    alertLike: source.alertLike
  });

  return {
    didInvokeHost: true,
    localStorageResolved: !!localStorageLike,
    sessionStorageResolved: !!sessionStorageLike,
    transferResult: transferResult || null
  };
}
