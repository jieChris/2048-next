export interface GameManagerInputEventsInputManagerLike {
  on?: (eventName: string, callback: (payload?: unknown) => void) => void;
}

export interface GameManagerInputEventsManagerLike {
  inputManager?: GameManagerInputEventsInputManagerLike | null;
  useItem?: (itemKey: unknown) => void;
  restart?: () => void;
  keepPlaying?: unknown;
  actuator?: {
    continue?: () => void;
  } | null;
}

export interface GameManagerInputEventsOperations {
  handleMoveInput?: (manager: GameManagerInputEventsManagerLike, direction: unknown) => void;
}

export interface GameManagerInputEventsRuntime {
  bindGameManagerInputEvents: typeof bindGameManagerInputEvents;
}

export interface GameManagerInputEventsRuntimeWindowLike {
  CoreGameManagerInputEventsRuntime?: GameManagerInputEventsRuntime;
}

export interface GameManagerInputEventsRuntimeInstallOptions {
  windowLike?: GameManagerInputEventsRuntimeWindowLike | null;
}

function resolvePrototypeKeepPlayingHandler(
  manager: GameManagerInputEventsManagerLike
): ((this: GameManagerInputEventsManagerLike) => void) | null {
  try {
    const handler = Object.getPrototypeOf(manager)?.keepPlaying;
    return typeof handler === "function" ? handler : null;
  } catch (_err) {
    return null;
  }
}

function handleKeepPlaying(manager: GameManagerInputEventsManagerLike): void {
  const keepPlayingHandler = resolvePrototypeKeepPlayingHandler(manager);
  if (keepPlayingHandler) {
    keepPlayingHandler.call(manager);
    return;
  }
  manager.keepPlaying = true;
  manager.actuator?.continue?.();
}

export function bindGameManagerInputEvents(
  manager: GameManagerInputEventsManagerLike | null | undefined,
  operations: GameManagerInputEventsOperations = {}
): void {
  if (!manager || !manager.inputManager || typeof manager.inputManager.on !== "function") return;
  manager.inputManager.on("move", (direction) => {
    operations.handleMoveInput?.(manager, direction);
  });
  manager.inputManager.on("item", (itemKey) => {
    manager.useItem?.(itemKey);
  });
  manager.inputManager.on("restart", () => {
    manager.restart?.();
  });
  manager.inputManager.on("keepPlaying", () => {
    handleKeepPlaying(manager);
  });
}

export function createGameManagerInputEventsRuntime(): GameManagerInputEventsRuntime {
  return {
    bindGameManagerInputEvents
  };
}

export function installGameManagerInputEventsRuntime(
  options: GameManagerInputEventsRuntimeInstallOptions = {}
): GameManagerInputEventsRuntime | null {
  const target =
    options.windowLike === undefined
      ? typeof window === "undefined"
        ? null
        : (window as unknown as GameManagerInputEventsRuntimeWindowLike)
      : options.windowLike;
  if (!target) return null;
  if (!target.CoreGameManagerInputEventsRuntime) {
    target.CoreGameManagerInputEventsRuntime = createGameManagerInputEventsRuntime();
  }
  return target.CoreGameManagerInputEventsRuntime;
}
