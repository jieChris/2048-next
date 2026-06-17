import {
  isRuntimeAccessorObject,
  registerCoreRuntimeAccessors,
  registerCoreRuntimeCaller,
  registerCoreRuntimeGetter,
  registerCoreRuntimeMethodResolver
} from "../core/game-manager-runtime-accessor-helpers";

export interface GameManagerRuntimeAccessorHelpersRuntime {
  registerCoreRuntimeMethodResolver: typeof registerCoreRuntimeMethodResolver;
  isRuntimeAccessorObject: typeof isRuntimeAccessorObject;
  registerCoreRuntimeGetter: typeof registerCoreRuntimeGetter;
  registerCoreRuntimeCaller: typeof registerCoreRuntimeCaller;
  registerCoreRuntimeAccessors: typeof registerCoreRuntimeAccessors;
}

export type GameManagerRuntimeAccessorHelpersRuntimeWindowLike =
  Partial<GameManagerRuntimeAccessorHelpersRuntime>;

export interface GameManagerRuntimeAccessorHelpersRuntimeInstallOptions {
  windowLike?: GameManagerRuntimeAccessorHelpersRuntimeWindowLike | null | undefined;
}

type RuntimeEntry = {
  [Key in keyof GameManagerRuntimeAccessorHelpersRuntime]: [
    Key,
    GameManagerRuntimeAccessorHelpersRuntime[Key]
  ];
}[keyof GameManagerRuntimeAccessorHelpersRuntime];

function getRuntimeEntries(runtime: GameManagerRuntimeAccessorHelpersRuntime): RuntimeEntry[] {
  return Object.entries(runtime) as RuntimeEntry[];
}

export function createGameManagerRuntimeAccessorHelpersRuntime(): GameManagerRuntimeAccessorHelpersRuntime {
  return {
    registerCoreRuntimeMethodResolver,
    isRuntimeAccessorObject,
    registerCoreRuntimeGetter,
    registerCoreRuntimeCaller,
    registerCoreRuntimeAccessors
  };
}

export function installGameManagerRuntimeAccessorHelpersRuntime(
  options: GameManagerRuntimeAccessorHelpersRuntimeInstallOptions = {}
): GameManagerRuntimeAccessorHelpersRuntime | null {
  const windowLike =
    options.windowLike ||
    (typeof window === "undefined"
      ? null
      : (window as unknown as GameManagerRuntimeAccessorHelpersRuntimeWindowLike));
  if (!windowLike) return null;

  const runtime = createGameManagerRuntimeAccessorHelpersRuntime();
  for (const [name, helper] of getRuntimeEntries(runtime)) {
    if (typeof windowLike[name] !== "function") {
      windowLike[name] = helper as never;
    }
  }

  const installed: Partial<GameManagerRuntimeAccessorHelpersRuntime> = {};
  for (const [name] of getRuntimeEntries(runtime)) {
    installed[name] = windowLike[name] as never;
  }
  return installed as GameManagerRuntimeAccessorHelpersRuntime;
}
