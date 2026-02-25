type AnyRecord = Record<string, unknown>;

export interface HomeRuntimeContractWindowLike {
  CoreHomeModeRuntime?: unknown;
  CoreUndoActionRuntime?: unknown;
  LegacyBootstrapRuntime?: unknown;
}

export interface ResolveHomeRuntimeContractsResult {
  homeModeRuntime: AnyRecord;
  undoActionRuntime: AnyRecord;
  bootstrapRuntime: AnyRecord;
}

function hasFunction(target: unknown, key: string): boolean {
  if (!target || typeof target !== "object") return false;
  return typeof (target as AnyRecord)[key] === "function";
}

function requireRuntimeFunctions(
  target: unknown,
  functionNames: string[],
  errorMessage: string
): AnyRecord {
  if (!target || typeof target !== "object") {
    throw new Error(errorMessage);
  }
  for (const functionName of functionNames) {
    if (!hasFunction(target, functionName)) {
      throw new Error(errorMessage);
    }
  }
  return target as AnyRecord;
}

export function resolveHomeRuntimeContracts(
  windowLike: HomeRuntimeContractWindowLike
): ResolveHomeRuntimeContractsResult {
  const source = windowLike || {};
  const homeModeRuntime = requireRuntimeFunctions(
    source.CoreHomeModeRuntime,
    ["resolveHomeModeSelection", "resolveHomeModeSelectionFromContext"],
    "CoreHomeModeRuntime is required"
  );
  const undoActionRuntime = requireRuntimeFunctions(
    source.CoreUndoActionRuntime,
    ["tryTriggerUndo"],
    "CoreUndoActionRuntime is required"
  );
  const bootstrapRuntime = requireRuntimeFunctions(
    source.LegacyBootstrapRuntime,
    ["startGameOnAnimationFrame"],
    "LegacyBootstrapRuntime.startGameOnAnimationFrame is required"
  );

  return {
    homeModeRuntime,
    undoActionRuntime,
    bootstrapRuntime
  };
}
