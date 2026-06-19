export interface GameManagerActuatorPayloadStateManager {
  score: unknown;
  over: unknown;
  won: unknown;
  scoreManager: {
    get: () => unknown;
  };
  blockedCellsList?: unknown;
  stoneValueSet?: Record<string, unknown> | null;
  hasOwnKey?: (record: Record<string, unknown>, key: string) => boolean;
}

export interface GameManagerActuatorPayloadStateOperations {
  isGameTerminated: (manager: GameManagerActuatorPayloadStateManager) => unknown;
}

export interface GameManagerActuatorPayloadState {
  score: unknown;
  over: unknown;
  won: unknown;
  bestScore: unknown;
  terminated: unknown;
  blockedCells: unknown;
  stoneValues: number[];
}

export interface GameManagerActuatorPayloadStateRuntime {
  createActuatorPayloadState: typeof createActuatorPayloadState;
}

export interface GameManagerActuatorPayloadStateWindowLike {
  CoreGameManagerActuatorPayloadStateRuntime?: GameManagerActuatorPayloadStateRuntime;
}

export interface GameManagerActuatorPayloadStateRuntimeInstallOptions {
  windowLike?: GameManagerActuatorPayloadStateWindowLike | null;
}

function hasOwnManagerKey(
  manager: GameManagerActuatorPayloadStateManager,
  record: Record<string, unknown>,
  key: string
): boolean {
  if (typeof manager.hasOwnKey === "function") {
    return manager.hasOwnKey(record, key);
  }
  return Object.prototype.hasOwnProperty.call(record, key);
}

function collectActuatorStoneValues(manager: GameManagerActuatorPayloadStateManager): number[] {
  const source = manager.stoneValueSet;
  if (!source || typeof source !== "object") return [];
  const stoneValues: number[] = [];
  for (const key in source) {
    if (!hasOwnManagerKey(manager, source, key)) continue;
    if (source[key] !== true) continue;
    const value = Number(key);
    if (Number.isInteger(value)) stoneValues.push(value);
  }
  return stoneValues;
}

export function createActuatorPayloadState(
  manager: GameManagerActuatorPayloadStateManager,
  operations: GameManagerActuatorPayloadStateOperations
): GameManagerActuatorPayloadState {
  return {
    score: manager.score,
    over: manager.over,
    won: manager.won,
    bestScore: manager.scoreManager.get(),
    terminated: operations.isGameTerminated(manager),
    blockedCells: manager.blockedCellsList || [],
    stoneValues: collectActuatorStoneValues(manager)
  };
}

export function createGameManagerActuatorPayloadStateRuntime(): GameManagerActuatorPayloadStateRuntime {
  return {
    createActuatorPayloadState
  };
}

export function installGameManagerActuatorPayloadStateRuntime(
  options: GameManagerActuatorPayloadStateRuntimeInstallOptions = {}
): GameManagerActuatorPayloadStateRuntime | null {
  const target =
    options.windowLike === undefined
      ? typeof window === "undefined"
        ? null
        : (window as unknown as GameManagerActuatorPayloadStateWindowLike)
      : options.windowLike;
  if (!target) return null;
  if (!target.CoreGameManagerActuatorPayloadStateRuntime) {
    target.CoreGameManagerActuatorPayloadStateRuntime =
      createGameManagerActuatorPayloadStateRuntime();
  }
  return target.CoreGameManagerActuatorPayloadStateRuntime;
}
