import {
  clonePlain,
  createCoreModeContextPayload,
  createCoreModeDefaultsPayload,
  createUnavailableCoreCallResult,
  hasOwnKey,
  isCoreCallAvailable,
  isNonArrayObject,
  readOptionValue,
  resolveCoreBooleanCallOrFallback,
  resolveCoreNumericCallOrFallback,
  resolveCoreObjectCallOrFallback,
  resolveCoreRawCallValueOrUndefined,
  resolveCoreStringCallOrFallback,
  resolveNormalizedCoreValueOrFallback,
  resolveNormalizedCoreValueOrFallbackAllowNull,
  resolveNormalizedCoreValueOrUndefined,
  safeClonePlain,
  tryHandleCoreRawValue
} from "../core/game-manager-base-helpers";

export interface GameManagerBaseHelpersRuntime {
  isCoreCallAvailable: typeof isCoreCallAvailable;
  resolveCoreObjectCallOrFallback: typeof resolveCoreObjectCallOrFallback;
  resolveCoreBooleanCallOrFallback: typeof resolveCoreBooleanCallOrFallback;
  resolveCoreNumericCallOrFallback: typeof resolveCoreNumericCallOrFallback;
  resolveCoreStringCallOrFallback: typeof resolveCoreStringCallOrFallback;
  resolveNormalizedCoreValueOrUndefined: typeof resolveNormalizedCoreValueOrUndefined;
  resolveNormalizedCoreValueOrFallback: typeof resolveNormalizedCoreValueOrFallback;
  resolveNormalizedCoreValueOrFallbackAllowNull: typeof resolveNormalizedCoreValueOrFallbackAllowNull;
  resolveCoreRawCallValueOrUndefined: typeof resolveCoreRawCallValueOrUndefined;
  tryHandleCoreRawValue: typeof tryHandleCoreRawValue;
  isNonArrayObject: typeof isNonArrayObject;
  createCoreModeDefaultsPayload: typeof createCoreModeDefaultsPayload;
  createCoreModeContextPayload: typeof createCoreModeContextPayload;
  createUnavailableCoreCallResult: typeof createUnavailableCoreCallResult;
  clonePlain: typeof clonePlain;
  safeClonePlain: typeof safeClonePlain;
  hasOwnKey: typeof hasOwnKey;
  readOptionValue: typeof readOptionValue;
}

export type GameManagerBaseHelpersRuntimeWindowLike = Partial<GameManagerBaseHelpersRuntime>;

export interface GameManagerBaseHelpersRuntimeInstallOptions {
  windowLike?: GameManagerBaseHelpersRuntimeWindowLike | null | undefined;
}

type RuntimeEntry = {
  [Key in keyof GameManagerBaseHelpersRuntime]: [Key, GameManagerBaseHelpersRuntime[Key]];
}[keyof GameManagerBaseHelpersRuntime];

function getRuntimeEntries(runtime: GameManagerBaseHelpersRuntime): RuntimeEntry[] {
  return Object.entries(runtime) as RuntimeEntry[];
}

export function createGameManagerBaseHelpersRuntime(): GameManagerBaseHelpersRuntime {
  return {
    isCoreCallAvailable,
    resolveCoreObjectCallOrFallback,
    resolveCoreBooleanCallOrFallback,
    resolveCoreNumericCallOrFallback,
    resolveCoreStringCallOrFallback,
    resolveNormalizedCoreValueOrUndefined,
    resolveNormalizedCoreValueOrFallback,
    resolveNormalizedCoreValueOrFallbackAllowNull,
    resolveCoreRawCallValueOrUndefined,
    tryHandleCoreRawValue,
    isNonArrayObject,
    createCoreModeDefaultsPayload,
    createCoreModeContextPayload,
    createUnavailableCoreCallResult,
    clonePlain,
    safeClonePlain,
    hasOwnKey,
    readOptionValue
  };
}

export function installGameManagerBaseHelpersRuntime(
  options: GameManagerBaseHelpersRuntimeInstallOptions = {}
): GameManagerBaseHelpersRuntime | null {
  const windowLike =
    options.windowLike ||
    (typeof window === "undefined"
      ? null
      : (window as unknown as GameManagerBaseHelpersRuntimeWindowLike));
  if (!windowLike) return null;

  const runtime = createGameManagerBaseHelpersRuntime();
  for (const [name, helper] of getRuntimeEntries(runtime)) {
    if (typeof windowLike[name] !== "function") {
      windowLike[name] = helper as never;
    }
  }

  const installed: Partial<GameManagerBaseHelpersRuntime> = {};
  for (const [name] of getRuntimeEntries(runtime)) {
    installed[name] = windowLike[name] as never;
  }
  return installed as GameManagerBaseHelpersRuntime;
}
