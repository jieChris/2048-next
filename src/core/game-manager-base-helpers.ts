export interface CoreCallResultLike<T = unknown> {
  available?: unknown;
  value?: T;
}

export type CoreFallbackResolver<T = unknown> = (this: CoreBaseHelperManagerLike) => T;
export type CoreValueNormalizer<T = unknown> = (this: CoreBaseHelperManagerLike, value: unknown) => T;
export type CoreRawValueHandler = (this: CoreBaseHelperManagerLike, value: unknown) => void;

export interface CoreBaseHelperManagerLike {
  isCoreCallAvailable?: (coreCallResult: unknown) => boolean;
  resolveNormalizedCoreValueOrUndefined?: (
    coreCallResult: unknown,
    normalizer?: unknown
  ) => unknown;
  clonePlain?: (value: unknown) => unknown;
  hasOwnKey?: (target: unknown, key: PropertyKey) => boolean;
}

function isRecordLike(value: unknown): value is Record<PropertyKey, unknown> {
  return !!value && (typeof value === "object" || typeof value === "function");
}

function isCoreHelperRecordObject(value: unknown): value is Record<PropertyKey, unknown> {
  return !!value && typeof value === "object";
}

function resolveIsCoreCallAvailable(manager: CoreBaseHelperManagerLike, coreCallResult: unknown): boolean {
  if (typeof manager.isCoreCallAvailable === "function") {
    return manager.isCoreCallAvailable(coreCallResult);
  }
  return isCoreCallAvailable(coreCallResult);
}

export function isCoreCallAvailable(coreCallResult: unknown): boolean {
  return !!(isRecordLike(coreCallResult) && coreCallResult.available === true);
}

export function resolveCoreObjectCallOrFallback<T = unknown>(
  manager: CoreBaseHelperManagerLike | null | undefined,
  coreCallResult: CoreCallResultLike<T> | null | undefined,
  fallbackResolver?: CoreFallbackResolver<T | null> | null
): T | Record<string, never> | null {
  if (!manager) return null;
  const coreValue = resolveIsCoreCallAvailable(manager, coreCallResult)
    ? (coreCallResult?.value || {})
    : null;
  if (coreValue) return coreValue as T | Record<string, never>;
  if (typeof fallbackResolver === "function") return fallbackResolver.call(manager);
  return null;
}

export function resolveCoreBooleanCallOrFallback(
  manager: CoreBaseHelperManagerLike | null | undefined,
  coreCallResult: CoreCallResultLike | null | undefined,
  fallbackResolver?: CoreFallbackResolver<unknown> | null
): boolean | null {
  if (!manager) return null;
  const coreValue = resolveIsCoreCallAvailable(manager, coreCallResult)
    ? !!coreCallResult?.value
    : null;
  if (coreValue !== null) return coreValue;
  if (typeof fallbackResolver === "function") return !!fallbackResolver.call(manager);
  return null;
}

export function resolveCoreNumericCallOrFallback(
  manager: CoreBaseHelperManagerLike | null | undefined,
  coreCallResult: CoreCallResultLike | null | undefined,
  fallbackResolver?: CoreFallbackResolver<unknown> | null
): number | null {
  if (!manager) return null;
  const coreValue = resolveIsCoreCallAvailable(manager, coreCallResult)
    ? (Number(coreCallResult?.value) || 0)
    : null;
  if (coreValue !== null) return coreValue;
  if (typeof fallbackResolver === "function") return Number(fallbackResolver.call(manager)) || 0;
  return null;
}

export function resolveCoreStringCallOrFallback(
  manager: CoreBaseHelperManagerLike | null | undefined,
  coreCallResult: CoreCallResultLike | null | undefined,
  fallbackResolver?: CoreFallbackResolver<unknown> | null,
  allowEmpty?: boolean
): string | null {
  if (!manager) return null;
  let coreValue: string | null = null;
  if (resolveIsCoreCallAvailable(manager, coreCallResult)) {
    const rawCoreString = coreCallResult?.value;
    if (typeof rawCoreString === "string") {
      coreValue = allowEmpty === true ? rawCoreString : rawCoreString || null;
    }
  }
  if (coreValue !== null) return coreValue;
  if (typeof fallbackResolver === "function") return String(fallbackResolver.call(manager));
  return null;
}

export function resolveNormalizedCoreValueOrUndefined<T = unknown>(
  manager: CoreBaseHelperManagerLike | null | undefined,
  coreCallResult: CoreCallResultLike | null | undefined,
  normalizer?: CoreValueNormalizer<T> | null | unknown
): T | unknown | undefined {
  if (!manager) return undefined;
  if (!resolveIsCoreCallAvailable(manager, coreCallResult)) return undefined;
  if (typeof normalizer !== "function") return coreCallResult?.value;
  return normalizer.call(manager, coreCallResult?.value);
}

function resolveNormalizedCoreValueWithFallbackMode<T = unknown>(
  manager: CoreBaseHelperManagerLike | null | undefined,
  coreCallResult: CoreCallResultLike | null | undefined,
  normalizer?: CoreValueNormalizer<T> | null | unknown,
  fallbackResolver?: CoreFallbackResolver<T> | null,
  allowNull?: boolean
): T | unknown | undefined {
  if (!manager) return undefined;
  const normalized =
    typeof manager.resolveNormalizedCoreValueOrUndefined === "function"
      ? manager.resolveNormalizedCoreValueOrUndefined(coreCallResult, normalizer)
      : resolveNormalizedCoreValueOrUndefined(manager, coreCallResult, normalizer);
  if (allowNull === true) {
    if (typeof normalized !== "undefined") return normalized;
  } else if (typeof normalized !== "undefined" && normalized !== null) {
    return normalized;
  }
  if (typeof fallbackResolver === "function") return fallbackResolver.call(manager);
  return normalized;
}

export function resolveNormalizedCoreValueOrFallback<T = unknown>(
  manager: CoreBaseHelperManagerLike | null | undefined,
  coreCallResult: CoreCallResultLike | null | undefined,
  normalizer?: CoreValueNormalizer<T> | null | unknown,
  fallbackResolver?: CoreFallbackResolver<T> | null
): T | unknown | undefined {
  return resolveNormalizedCoreValueWithFallbackMode(manager, coreCallResult, normalizer, fallbackResolver, false);
}

export function resolveNormalizedCoreValueOrFallbackAllowNull<T = unknown>(
  manager: CoreBaseHelperManagerLike | null | undefined,
  coreCallResult: CoreCallResultLike | null | undefined,
  normalizer?: CoreValueNormalizer<T> | null | unknown,
  fallbackResolver?: CoreFallbackResolver<T> | null
): T | unknown | undefined {
  return resolveNormalizedCoreValueWithFallbackMode(manager, coreCallResult, normalizer, fallbackResolver, true);
}

export function resolveCoreRawCallValueOrUndefined(
  manager: CoreBaseHelperManagerLike | null | undefined,
  coreCallResult: CoreCallResultLike | null | undefined
): unknown {
  if (!manager) return undefined;
  if (!resolveIsCoreCallAvailable(manager, coreCallResult)) return undefined;
  return coreCallResult?.value;
}

export function tryHandleCoreRawValue(
  manager: CoreBaseHelperManagerLike | null | undefined,
  coreCallResult: CoreCallResultLike | null | undefined,
  handler?: CoreRawValueHandler | null
): boolean {
  if (!manager) return false;
  const coreValue = resolveCoreRawCallValueOrUndefined(manager, coreCallResult);
  if (typeof coreValue === "undefined") return false;
  if (typeof handler === "function") {
    handler.call(manager, coreValue);
  }
  return true;
}

export function isNonArrayObject(value: unknown): boolean {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function createUnavailableCoreCallResult(): { available: false; value: null } {
  return {
    available: false,
    value: null
  };
}

export function clonePlain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function safeClonePlain<T>(
  manager: CoreBaseHelperManagerLike | null | undefined,
  value: unknown,
  fallback: T
): T | unknown {
  if (!manager) return fallback;
  try {
    if (typeof manager.clonePlain !== "function") return fallback;
    return manager.clonePlain(value);
  } catch (_err) {
    return fallback;
  }
}

export function hasOwnKey(target: unknown, key: PropertyKey): boolean {
  if (!target || (typeof target !== "object" && typeof target !== "function")) return false;
  return Object.prototype.hasOwnProperty.call(target, key);
}

export function readOptionValue<T>(
  manager: CoreBaseHelperManagerLike | null | undefined,
  options: unknown,
  key: PropertyKey,
  fallbackValue: T
): unknown | T {
  if (!manager) return fallbackValue;
  if (!isCoreHelperRecordObject(options)) return fallbackValue;
  const ownsKey =
    typeof manager.hasOwnKey === "function"
      ? manager.hasOwnKey(options, key)
      : hasOwnKey(options, key);
  return ownsKey ? options[key] : fallbackValue;
}
