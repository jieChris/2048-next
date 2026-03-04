type AnyRecord = Record<string, unknown>;

export interface SimpleRuntimeContractWindowLike {
  CoreBootstrapRuntime?: unknown;
  LegacyBootstrapRuntime?: unknown;
}

function hasFunction(target: unknown, key: string): boolean {
  if (!target || typeof target !== "object") return false;
  return typeof (target as AnyRecord)[key] === "function";
}

export function resolveSimpleBootstrapRuntime(
  windowLike: SimpleRuntimeContractWindowLike
): AnyRecord {
  const source = windowLike || {};
  const runtime = source.CoreBootstrapRuntime || source.LegacyBootstrapRuntime;
  if (!runtime || typeof runtime !== "object" || !hasFunction(runtime, "startGameOnAnimationFrame")) {
    throw new Error("CoreBootstrapRuntime.startGameOnAnimationFrame is required");
  }
  return runtime as AnyRecord;
}
