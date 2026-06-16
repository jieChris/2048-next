import {
  callWindowMethod,
  callWindowNamespaceMethod,
  canReadFromStorage,
  canWriteToStorage,
  getWebStorageByName,
  getWindowLike,
  requestAnimationFrameByManager,
  resolveManagerDocumentLike,
  resolveManagerElementById,
  resolveWindowMethod,
  resolveWindowNamespaceMethod
} from "../core/game-manager-env-helpers";

export interface GameManagerEnvHelpersRuntime {
  getWebStorageByName: typeof getWebStorageByName;
  getWindowLike: typeof getWindowLike;
  resolveManagerDocumentLike: typeof resolveManagerDocumentLike;
  resolveManagerElementById: typeof resolveManagerElementById;
  canReadFromStorage: typeof canReadFromStorage;
  canWriteToStorage: typeof canWriteToStorage;
  resolveWindowMethod: typeof resolveWindowMethod;
  callWindowMethod: typeof callWindowMethod;
  resolveWindowNamespaceMethod: typeof resolveWindowNamespaceMethod;
  callWindowNamespaceMethod: typeof callWindowNamespaceMethod;
  requestAnimationFrameByManager: typeof requestAnimationFrameByManager;
}

export type GameManagerEnvHelpersRuntimeWindowLike = Partial<GameManagerEnvHelpersRuntime>;

export interface GameManagerEnvHelpersRuntimeInstallOptions {
  windowLike?: GameManagerEnvHelpersRuntimeWindowLike | null | undefined;
}

type RuntimeEntry = {
  [Key in keyof GameManagerEnvHelpersRuntime]: [Key, GameManagerEnvHelpersRuntime[Key]];
}[keyof GameManagerEnvHelpersRuntime];

function getRuntimeEntries(runtime: GameManagerEnvHelpersRuntime): RuntimeEntry[] {
  return Object.entries(runtime) as RuntimeEntry[];
}

export function createGameManagerEnvHelpersRuntime(): GameManagerEnvHelpersRuntime {
  return {
    getWebStorageByName,
    getWindowLike,
    resolveManagerDocumentLike,
    resolveManagerElementById,
    canReadFromStorage,
    canWriteToStorage,
    resolveWindowMethod,
    callWindowMethod,
    resolveWindowNamespaceMethod,
    callWindowNamespaceMethod,
    requestAnimationFrameByManager
  };
}

export function installGameManagerEnvHelpersRuntime(
  options: GameManagerEnvHelpersRuntimeInstallOptions = {}
): GameManagerEnvHelpersRuntime | null {
  const windowLike =
    options.windowLike ||
    (typeof window === "undefined"
      ? null
      : (window as unknown as GameManagerEnvHelpersRuntimeWindowLike));
  if (!windowLike) return null;

  const runtime = createGameManagerEnvHelpersRuntime();
  for (const [name, helper] of getRuntimeEntries(runtime)) {
    if (typeof windowLike[name] !== "function") {
      windowLike[name] = helper as never;
    }
  }

  const installed: Partial<GameManagerEnvHelpersRuntime> = {};
  for (const [name] of getRuntimeEntries(runtime)) {
    installed[name] = windowLike[name] as never;
  }
  return installed as GameManagerEnvHelpersRuntime;
}
