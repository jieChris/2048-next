export interface GameManagerEnvWindowLike {
  document?: GameManagerEnvDocumentLike | null;
  [key: PropertyKey]: unknown;
}

export interface GameManagerEnvDocumentLike {
  getElementById?: (elementId: string) => unknown;
}

export interface GameManagerEnvStorageLike {
  getItem?: (key: string) => unknown;
  setItem?: (key: string, value: string) => unknown;
}

export interface GameManagerEnvManagerLike {
  getWindowLike: () => GameManagerEnvWindowLike | null | undefined;
}

export interface ResolvedWindowMethod {
  windowLike: GameManagerEnvWindowLike;
  method: (...args: unknown[]) => unknown;
}

export type GameManagerEnvNamespaceScope = Record<PropertyKey, unknown>;

export interface ResolvedWindowNamespaceMethod extends ResolvedWindowMethod {
  scope: GameManagerEnvNamespaceScope;
}

function getGlobalWindowLike(): GameManagerEnvWindowLike | null {
  return typeof window === "undefined"
    ? null
    : (window as unknown as GameManagerEnvWindowLike);
}

function getGlobalDocumentLike(): GameManagerEnvDocumentLike | null {
  return typeof document === "undefined"
    ? null
    : (document as unknown as GameManagerEnvDocumentLike);
}

function isObjectOrFunction(value: unknown): value is GameManagerEnvNamespaceScope {
  return !!value && (typeof value === "object" || typeof value === "function");
}

export function getWebStorageByName(
  name: string,
  windowLike: GameManagerEnvWindowLike | null | undefined = getGlobalWindowLike()
): unknown | null {
  try {
    return windowLike && windowLike[name] ? windowLike[name] : null;
  } catch (_err) {
    return null;
  }
}

export function getWindowLike(): GameManagerEnvWindowLike | null {
  return getGlobalWindowLike();
}

export function resolveManagerDocumentLike(
  manager: Partial<GameManagerEnvManagerLike> | null | undefined
): GameManagerEnvDocumentLike | null {
  const windowLike =
    manager && typeof manager.getWindowLike === "function"
      ? manager.getWindowLike()
      : getWindowLike();
  return windowLike && windowLike.document
    ? windowLike.document
    : getGlobalDocumentLike();
}

export function resolveManagerElementById(
  manager: Partial<GameManagerEnvManagerLike> | null | undefined,
  elementId: unknown
): unknown | null {
  if (typeof elementId !== "string" || !elementId) return null;
  const documentLike = resolveManagerDocumentLike(manager);
  if (!documentLike || typeof documentLike.getElementById !== "function") return null;
  return documentLike.getElementById(elementId);
}

export function canReadFromStorage(storage: GameManagerEnvStorageLike | null | undefined): boolean {
  return !!(storage && typeof storage.getItem === "function");
}

export function canWriteToStorage(storage: GameManagerEnvStorageLike | null | undefined): boolean {
  return !!(storage && typeof storage.setItem === "function");
}

export function resolveWindowMethod(
  manager: GameManagerEnvManagerLike | null | undefined,
  methodName: unknown
): ResolvedWindowMethod | null {
  if (!manager) return null;
  const windowLike = manager.getWindowLike();
  if (!windowLike || typeof methodName !== "string" || !methodName) return null;
  const method = windowLike[methodName];
  if (typeof method !== "function") return null;
  return {
    windowLike,
    method: method as (...args: unknown[]) => unknown
  };
}

export function callWindowMethod(
  manager: GameManagerEnvManagerLike | null | undefined,
  methodName: unknown,
  args: unknown
): boolean {
  if (!manager) return false;
  const resolved = resolveWindowMethod(manager, methodName);
  if (!resolved) return false;
  resolved.method.apply(resolved.windowLike, Array.isArray(args) ? args : []);
  return true;
}

export function resolveWindowNamespaceMethod(
  manager: GameManagerEnvManagerLike | null | undefined,
  namespaceName: unknown,
  methodName: unknown
): ResolvedWindowNamespaceMethod | null {
  if (!manager) return null;
  const windowLike = manager.getWindowLike();
  if (!windowLike) return null;
  if (typeof namespaceName !== "string" || !namespaceName) return null;
  if (typeof methodName !== "string" || !methodName) return null;
  const scope = windowLike[namespaceName];
  if (!isObjectOrFunction(scope)) return null;
  const method = scope[methodName];
  if (typeof method !== "function") return null;
  return {
    windowLike,
    scope,
    method: method as (...args: unknown[]) => unknown
  };
}

export function callWindowNamespaceMethod(
  manager: GameManagerEnvManagerLike | null | undefined,
  namespaceName: unknown,
  methodName: unknown,
  args: unknown
): boolean {
  if (!manager) return false;
  const resolved = resolveWindowNamespaceMethod(manager, namespaceName, methodName);
  if (!resolved) return false;
  resolved.method.apply(resolved.scope, Array.isArray(args) ? args : []);
  return true;
}

export function requestAnimationFrameByManager(
  manager: GameManagerEnvManagerLike | null | undefined,
  callback: unknown
): boolean {
  if (!manager) return false;
  if (typeof callback !== "function") return false;
  const raf = resolveWindowMethod(manager, "requestAnimationFrame");
  if (raf) {
    raf.method.call(raf.windowLike, callback);
    return true;
  }
  callback();
  return false;
}
