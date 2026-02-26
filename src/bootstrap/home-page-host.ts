function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function toRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function asFunction<T extends (...args: never[]) => unknown>(value: unknown): T | null {
  return typeof value === "function" ? (value as T) : null;
}

function hasOwnKeys(value: Record<string, unknown>): boolean {
  return Object.keys(value).length > 0;
}

export function resolveHomePageDefaults(input?: unknown): Record<string, unknown> {
  const source = toRecord(input);
  return {
    defaultModeKey:
      typeof source.defaultModeKey === "string"
        ? source.defaultModeKey
        : "standard_4x4_pow2_no_undo",
    defaultBoardWidth: typeof source.defaultBoardWidth === "number" ? source.defaultBoardWidth : 4
  };
}

export function resolveHomePageRuntimes(input: {
  windowLike?: unknown;
  homeRuntimeContractRuntime?: unknown;
  homeStartupHostRuntime?: unknown;
}): Record<string, unknown> {
  const source = toRecord(input);
  const windowLike = toRecord(source.windowLike);
  const homeRuntimeContractRuntime = toRecord(
    source.homeRuntimeContractRuntime || windowLike.CoreHomeRuntimeContractRuntime
  );
  const resolveHomeRuntimeContracts = asFunction<(windowLike: unknown) => unknown>(
    homeRuntimeContractRuntime.resolveHomeRuntimeContracts
  );
  if (!resolveHomeRuntimeContracts) {
    throw new Error("CoreHomeRuntimeContractRuntime is required");
  }

  const homeStartupHostRuntime = toRecord(
    source.homeStartupHostRuntime || windowLike.CoreHomeStartupHostRuntime
  );
  const resolveHomeStartupFromContext = asFunction<(payload: unknown) => unknown>(
    homeStartupHostRuntime.resolveHomeStartupFromContext
  );
  if (!resolveHomeStartupFromContext) {
    throw new Error("CoreHomeStartupHostRuntime is required");
  }

  const runtimeContracts = toRecord(resolveHomeRuntimeContracts(windowLike));
  return {
    homeModeRuntime: toRecord(runtimeContracts.homeModeRuntime),
    undoActionRuntime: toRecord(runtimeContracts.undoActionRuntime),
    bootstrapRuntime: toRecord(runtimeContracts.bootstrapRuntime),
    homeStartupHostRuntime: {
      resolveHomeStartupFromContext
    }
  };
}

export function applyHomePageBootstrap(input: {
  windowLike?: unknown;
  documentLike?: unknown;
  inputManagerCtor?: unknown;
  homePageDefaults?: unknown;
  homeRuntimes?: unknown;
  homeRuntimeContractRuntime?: unknown;
  homeStartupHostRuntime?: unknown;
}): Record<string, unknown> {
  const source = toRecord(input);
  const windowLike = toRecord(source.windowLike);
  const documentLike = source.documentLike || windowLike.document;
  const sourceDefaults = toRecord(source.homePageDefaults);
  const homePageDefaults = hasOwnKeys(sourceDefaults) ? sourceDefaults : resolveHomePageDefaults();
  const sourceHomeRuntimes = toRecord(source.homeRuntimes);
  const homeRuntimes = hasOwnKeys(sourceHomeRuntimes)
    ? sourceHomeRuntimes
    : resolveHomePageRuntimes({
        windowLike,
        homeRuntimeContractRuntime: source.homeRuntimeContractRuntime,
        homeStartupHostRuntime: source.homeStartupHostRuntime
      });

  const bootstrapRuntime = toRecord(homeRuntimes.bootstrapRuntime);
  const homeModeRuntime = toRecord(homeRuntimes.homeModeRuntime);
  const homeStartupHostRuntime = toRecord(homeRuntimes.homeStartupHostRuntime);

  const startGameOnAnimationFrame = asFunction<(callback: () => unknown) => unknown>(
    bootstrapRuntime.startGameOnAnimationFrame
  );
  if (!startGameOnAnimationFrame) {
    return {
      started: false,
      missingBootstrapRuntime: true
    };
  }

  const resolveHomeStartupFromContext = asFunction<(payload: unknown) => unknown>(
    homeStartupHostRuntime.resolveHomeStartupFromContext
  );
  if (!resolveHomeStartupFromContext) {
    return {
      started: false,
      missingStartupRuntime: true
    };
  }

  const inputManagerCtor = source.inputManagerCtor || windowLike.KeyboardInputManager;
  const startupResult = startGameOnAnimationFrame(function () {
    return resolveHomeStartupFromContext({
      windowLike,
      documentLike,
      defaultModeKey: homePageDefaults.defaultModeKey,
      defaultBoardWidth: homePageDefaults.defaultBoardWidth,
      inputManagerCtor,
      resolveHomeModeSelectionFromContext: homeModeRuntime.resolveHomeModeSelectionFromContext
    });
  });

  return {
    started: true,
    startupResult
  };
}

export function applyHomePageUndo(input: {
  windowLike?: unknown;
  gameManager?: unknown;
  homeRuntimes?: unknown;
  homeRuntimeContractRuntime?: unknown;
}): Record<string, unknown> {
  const source = toRecord(input);
  const windowLike = toRecord(source.windowLike);
  let undoActionRuntime = toRecord(toRecord(source.homeRuntimes).undoActionRuntime);
  if (!hasOwnKeys(undoActionRuntime)) {
    const homeRuntimeContractRuntime = toRecord(
      source.homeRuntimeContractRuntime || windowLike.CoreHomeRuntimeContractRuntime
    );
    const resolveHomeRuntimeContracts = asFunction<(windowLike: unknown) => unknown>(
      homeRuntimeContractRuntime.resolveHomeRuntimeContracts
    );
    if (!resolveHomeRuntimeContracts) {
      return {
        didUndo: false,
        missingRuntime: true
      };
    }
    const runtimeContracts = toRecord(resolveHomeRuntimeContracts(windowLike));
    undoActionRuntime = toRecord(runtimeContracts.undoActionRuntime);
  }

  const tryTriggerUndo = asFunction<(manager: unknown, delta: unknown) => unknown>(
    undoActionRuntime.tryTriggerUndo
  );
  if (!tryTriggerUndo) {
    return {
      didUndo: false,
      missingUndoRuntime: true
    };
  }

  const gameManager = source.gameManager || windowLike.game_manager;
  const result = tryTriggerUndo(gameManager, -1);
  return {
    didUndo: true,
    result
  };
}
