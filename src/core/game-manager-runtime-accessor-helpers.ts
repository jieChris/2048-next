export type GameManagerRuntimeAccessorPrototypeLike = Record<PropertyKey, unknown>;

export interface GameManagerRuntimeAccessorOptions {
  gameManagerPrototype?: GameManagerRuntimeAccessorPrototypeLike | null | undefined;
  createUnavailableCoreCallResult?: (() => unknown) | null | undefined;
}

type RuntimeAccessorGlobalLike = {
  GameManager?: {
    prototype?: GameManagerRuntimeAccessorPrototypeLike;
  };
  createUnavailableCoreCallResult?: () => unknown;
};

function getRuntimeAccessorGlobal(): RuntimeAccessorGlobalLike | null {
  return typeof globalThis === "undefined"
    ? null
    : (globalThis as unknown as RuntimeAccessorGlobalLike);
}

function resolveGameManagerPrototype(
  options: GameManagerRuntimeAccessorOptions | null | undefined
): GameManagerRuntimeAccessorPrototypeLike | null {
  if (options && options.gameManagerPrototype) return options.gameManagerPrototype;
  return getRuntimeAccessorGlobal()?.GameManager?.prototype || null;
}

function createDefaultUnavailableCoreCallResult(): { available: false; value: null } {
  return {
    available: false,
    value: null
  };
}

function resolveUnavailableCoreCallResultFactory(
  options: GameManagerRuntimeAccessorOptions | null | undefined
): () => unknown {
  if (options && typeof options.createUnavailableCoreCallResult === "function") {
    return options.createUnavailableCoreCallResult;
  }
  const globalFactory = getRuntimeAccessorGlobal()?.createUnavailableCoreCallResult;
  return typeof globalFactory === "function"
    ? globalFactory
    : createDefaultUnavailableCoreCallResult;
}

export function isRuntimeAccessorObject(value: unknown): boolean {
  return !!(value && typeof value === "object");
}

export function registerCoreRuntimeMethodResolver(
  methodName: unknown,
  runtimeGetterName: unknown,
  options: GameManagerRuntimeAccessorOptions = {}
): void {
  const prototype = resolveGameManagerPrototype(options);
  if (!prototype || typeof methodName !== "string" || !methodName) return;
  prototype[methodName] = function resolveCoreRuntimeMethod(this: GameManagerRuntimeAccessorPrototypeLike, coreMethodName: unknown) {
    if (!(typeof runtimeGetterName === "string" && runtimeGetterName)) return null;
    if (!(typeof coreMethodName === "string" && coreMethodName)) return null;
    const runtimeGetter = this[runtimeGetterName];
    if (typeof runtimeGetter !== "function") return null;
    const runtime = runtimeGetter.call(this);
    if (!isRuntimeAccessorObject(runtime)) return null;
    const runtimeRecord = runtime as Record<PropertyKey, unknown>;
    const runtimeMethod = runtimeRecord[coreMethodName];
    if (typeof runtimeMethod !== "function") return null;
    return (...args: unknown[]) => runtimeMethod.apply(runtimeRecord, args);
  };
}

export function registerCoreRuntimeGetter(
  methodName: unknown,
  runtimeName: unknown,
  options: GameManagerRuntimeAccessorOptions = {}
): void {
  const prototype = resolveGameManagerPrototype(options);
  if (!prototype || typeof methodName !== "string" || !methodName) return;
  prototype[methodName] = function getCoreRuntime(this: GameManagerRuntimeAccessorPrototypeLike) {
    const getWindowLike = this.getWindowLike;
    const windowLike = typeof getWindowLike === "function" ? getWindowLike.call(this) : null;
    if (!isRuntimeAccessorObject(windowLike)) return null;
    if (!(typeof runtimeName === "string" && runtimeName)) return null;
    const runtime = (windowLike as Record<PropertyKey, unknown>)[runtimeName];
    return isRuntimeAccessorObject(runtime) ? runtime : null;
  };
}

export function registerCoreRuntimeCaller(
  methodName: unknown,
  resolverMethodName: unknown,
  options: GameManagerRuntimeAccessorOptions = {}
): void {
  if (typeof methodName !== "string" || !methodName) return;
  if (typeof resolverMethodName !== "string" || !resolverMethodName) return;
  const prototype = resolveGameManagerPrototype(options);
  if (!prototype) return;
  const createUnavailable = resolveUnavailableCoreCallResultFactory(options);
  prototype[methodName] = function callCoreRuntime(
    this: GameManagerRuntimeAccessorPrototypeLike,
    coreMethodName: unknown,
    args: unknown
  ) {
    const resolver = this[resolverMethodName];
    if (typeof resolver !== "function") {
      return createUnavailable();
    }
    const runtimeMethod = resolver.call(this, coreMethodName);
    if (typeof runtimeMethod !== "function") {
      return createUnavailable();
    }
    return {
      available: true,
      value: runtimeMethod.apply(null, Array.isArray(args) ? args : [])
    };
  };
}

export function registerCoreRuntimeAccessors(
  accessorDefs: unknown,
  options: GameManagerRuntimeAccessorOptions = {}
): void {
  if (!Array.isArray(accessorDefs)) return;
  for (let index = 0; index < accessorDefs.length; index += 1) {
    const accessorDef = accessorDefs[index];
    if (!(Array.isArray(accessorDef) && accessorDef.length >= 4)) continue;
    const callerMethodName = accessorDef[0];
    const resolverMethodName = accessorDef[1];
    const getterMethodName = accessorDef[2];
    const runtimeName = accessorDef[3];
    registerCoreRuntimeGetter(getterMethodName, runtimeName, options);
    registerCoreRuntimeMethodResolver(resolverMethodName, getterMethodName, options);
    registerCoreRuntimeCaller(callerMethodName, resolverMethodName, options);
  }
}
