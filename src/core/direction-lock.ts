export interface LockedDirectionStateInput {
  directionLockRules: unknown;
  successfulMoveCount: number;
  lockConsumedAtMoveCount: number;
  lockedDirectionTurn: number | null;
  lockedDirection: number | null;
  initialSeed: string | number;
  availableDirections?: number[] | null;
  randomFromSeed?: (seed: string) => number;
}

export interface LockedDirectionState {
  lockedDirection: number | null;
  lockedDirectionTurn: number | null;
  activeDirection: number | null;
}

function normalizeAvailableDirections(rawDirections?: number[] | null): number[] {
  const source = Array.isArray(rawDirections) ? rawDirections : [];
  const out: number[] = [];
  for (let i = 0; i < source.length; i++) {
    const dir = Number(source[i]);
    if (!Number.isInteger(dir) || dir < 0 || dir > 7) continue;
    if (out.indexOf(dir) !== -1) continue;
    out.push(dir);
  }
  if (out.length > 0) return out;
  return [0, 1, 2, 3];
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
  const availableDirections = normalizeAvailableDirections(input.availableDirections);
  const directionCount = availableDirections.length;
  if (lockedDirectionTurn !== moveCount) {
    const phase = Math.floor(moveCount / everyK);
    const seed = `${String(input.initialSeed)}:lock:${phase}`;
    const randomValue =
      typeof input.randomFromSeed === "function"
        ? input.randomFromSeed(seed)
        : Math.random();
    const dirIndex = Math.floor(randomValue * directionCount);
    lockedDirection = availableDirections[dirIndex] ?? availableDirections[0];
    lockedDirectionTurn = moveCount;
  }

  return {
    lockedDirection,
    lockedDirectionTurn,
    activeDirection: lockedDirection
  };
}
