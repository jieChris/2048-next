export interface LockedDirectionStateInput {
  directionLockRules: unknown;
  successfulMoveCount: number;
  lockConsumedAtMoveCount: number;
  lockedDirectionTurn: number | null;
  lockedDirection: number | null;
  initialSeed: string | number;
  randomFromSeed?: (seed: string) => number;
}

export interface LockedDirectionState {
  lockedDirection: number | null;
  lockedDirectionTurn: number | null;
  activeDirection: number | null;
}

export function getLockedDirectionState(input: LockedDirectionStateInput): LockedDirectionState {
  const rules =
    input.directionLockRules && typeof input.directionLockRules === "object"
      ? (input.directionLockRules as Record<string, unknown>)
      : null;
  const currentLockedDirection = Number.isInteger(input.lockedDirection)
    ? Number(input.lockedDirection)
    : null;
  const currentLockedDirectionTurn = Number.isInteger(input.lockedDirectionTurn)
    ? Number(input.lockedDirectionTurn)
    : null;

  if (!rules) {
    return {
      lockedDirection: currentLockedDirection,
      lockedDirectionTurn: currentLockedDirectionTurn,
      activeDirection: null
    };
  }

  const everyK = Number(rules.every_k_moves);
  const moveCount = Number(input.successfulMoveCount);
  if (!Number.isInteger(everyK) || everyK <= 0) {
    return {
      lockedDirection: currentLockedDirection,
      lockedDirectionTurn: currentLockedDirectionTurn,
      activeDirection: null
    };
  }
  if (!Number.isInteger(moveCount) || moveCount <= 0 || moveCount % everyK !== 0) {
    return {
      lockedDirection: currentLockedDirection,
      lockedDirectionTurn: currentLockedDirectionTurn,
      activeDirection: null
    };
  }
  if (Number(input.lockConsumedAtMoveCount) === moveCount) {
    return {
      lockedDirection: currentLockedDirection,
      lockedDirectionTurn: currentLockedDirectionTurn,
      activeDirection: null
    };
  }

  let lockedDirection = currentLockedDirection;
  let lockedDirectionTurn = currentLockedDirectionTurn;
  if (lockedDirectionTurn !== moveCount) {
    const phase = Math.floor(moveCount / everyK);
    const seed = `${String(input.initialSeed)}:lock:${phase}`;
    const randomValue =
      typeof input.randomFromSeed === "function"
        ? input.randomFromSeed(seed)
        : Math.random();
    lockedDirection = Math.floor(randomValue * 4);
    lockedDirectionTurn = moveCount;
  }

  return {
    lockedDirection,
    lockedDirectionTurn,
    activeDirection: lockedDirection
  };
}
