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

export function resolveSimplePageDefaults(input?: unknown): Record<string, unknown> {
  const source = toRecord(input);
  const modeKey =
    typeof source.modeKey === "string" ? source.modeKey : "standard_4x4_pow2_no_undo";
  return {
    modeKey,
    fallbackModeKey: typeof source.fallbackModeKey === "string" ? source.fallbackModeKey : modeKey,
    defaultBoardWidth: typeof source.defaultBoardWidth === "number" ? source.defaultBoardWidth : 4,
    disableSessionSync: source.disableSessionSync === true
  };
}

export function resolveSimplePageRuntimes(input: {
  windowLike?: unknown;
  simpleRuntimeContractRuntime?: unknown;
  simpleStartupRuntime?: unknown;
}): Record<string, unknown> {
  const source = toRecord(input);
  const windowLike = toRecord(source.windowLike);
  const simpleRuntimeContractRuntime = toRecord(
    source.simpleRuntimeContractRuntime || windowLike.CoreSimpleRuntimeContractRuntime
  );
  const simpleStartupRuntime = toRecord(source.simpleStartupRuntime || windowLike.CoreSimpleStartupRuntime);
  const resolveSimpleBootstrapRuntime = asFunction<(windowLike: unknown) => unknown>(
    simpleRuntimeContractRuntime.resolveSimpleBootstrapRuntime
  );
  if (!resolveSimpleBootstrapRuntime) {
    throw new Error("CoreSimpleRuntimeContractRuntime is required");
  }

  const resolveSimpleStartupPayload = asFunction<(payload: unknown) => unknown>(
    simpleStartupRuntime.resolveSimpleStartupPayload
  );
  if (!resolveSimpleStartupPayload) {
    throw new Error("CoreSimpleStartupRuntime is required");
  }

  return {
    bootstrapRuntime: toRecord(resolveSimpleBootstrapRuntime(windowLike)),
    simpleStartupRuntime: {
      resolveSimpleStartupPayload
    }
  };
}

export function applySimplePageBootstrap(input: {
  windowLike?: unknown;
  inputManagerCtor?: unknown;
  simplePageDefaults?: unknown;
  simpleRuntimes?: unknown;
  simpleRuntimeContractRuntime?: unknown;
  simpleStartupRuntime?: unknown;
}): Record<string, unknown> {
  const source = toRecord(input);
  const windowLike = toRecord(source.windowLike);
  const sourceDefaults = toRecord(source.simplePageDefaults);
  const simplePageDefaults = hasOwnKeys(sourceDefaults)
    ? sourceDefaults
    : resolveSimplePageDefaults();
  const sourceSimpleRuntimes = toRecord(source.simpleRuntimes);
  const simpleRuntimes = hasOwnKeys(sourceSimpleRuntimes)
    ? sourceSimpleRuntimes
    : resolveSimplePageRuntimes({
        windowLike,
        simpleRuntimeContractRuntime: source.simpleRuntimeContractRuntime,
        simpleStartupRuntime: source.simpleStartupRuntime
      });

  const bootstrapRuntime = toRecord(simpleRuntimes.bootstrapRuntime);
  const simpleStartupRuntime = toRecord(simpleRuntimes.simpleStartupRuntime);
  const startGameOnAnimationFrame = asFunction<(payload: unknown) => unknown>(
    bootstrapRuntime.startGameOnAnimationFrame
  );
  if (!startGameOnAnimationFrame) {
    return {
      started: false,
      missingBootstrapRuntime: true
    };
  }

  const resolveSimpleStartupPayload = asFunction<(payload: unknown) => unknown>(
    simpleStartupRuntime.resolveSimpleStartupPayload
  );
  if (!resolveSimpleStartupPayload) {
    return {
      started: false,
      missingStartupRuntime: true
    };
  }

  const inputManagerCtor = source.inputManagerCtor || windowLike.KeyboardInputManager;
  const startupPayloadInput: Record<string, unknown> = {
    modeKey: simplePageDefaults.modeKey,
    fallbackModeKey: simplePageDefaults.fallbackModeKey,
    inputManagerCtor,
    defaultBoardWidth: simplePageDefaults.defaultBoardWidth
  };
  if (simplePageDefaults.disableSessionSync === true) {
    startupPayloadInput.disableSessionSync = true;
  }

  const startupPayload = resolveSimpleStartupPayload(startupPayloadInput);
  const startupResult = startGameOnAnimationFrame(startupPayload);
  return {
    started: true,
    startupResult
  };
}
