export interface GameManagerUndoRestoredTilesGridLike {
  cells?: unknown[][];
  build?: () => void;
}

export interface GameManagerUndoRestoredTilesManagerLike {
  grid?: GameManagerUndoRestoredTilesGridLike | null;
  width?: unknown;
  height?: unknown;
  score?: number;
  isStoneValue?: (value: unknown) => boolean;
  setRuntimeScore?: (value: unknown) => void;
  writeRuntimeGridCell?: (x: number, y: number, tile: unknown) => boolean;
}

export interface GameManagerUndoRestoredTilesPayloadLike {
  score?: unknown;
  tiles?: unknown;
}

export interface GameManagerUndoRestoredTileLike {
  x?: unknown;
  y?: unknown;
  value?: unknown;
  previousPosition?: {
    x?: unknown;
    y?: unknown;
  } | null;
  isStone?: boolean;
}

export interface GameManagerUndoRestoredTilesOperations {
  createUndoRestoreTile?: (
    manager: GameManagerUndoRestoredTilesManagerLike,
    snapshot: unknown
  ) => GameManagerUndoRestoredTileLike | null | undefined;
  createTile?: (
    position: { x: number; y: number },
    value: unknown
  ) => GameManagerUndoRestoredTileLike;
  setRuntimeScoreForUndo?: (
    manager: GameManagerUndoRestoredTilesManagerLike,
    value: unknown
  ) => void;
  writeRuntimeGridCellForUndo?: (
    manager: GameManagerUndoRestoredTilesManagerLike,
    x: number,
    y: number,
    tile: unknown
  ) => boolean;
}

export interface GameManagerUndoRestoredTilesRuntime {
  applyUndoRestoredTiles: typeof applyUndoRestoredTiles;
}

export interface GameManagerUndoRestoredTilesWindowLike {
  CoreGameManagerUndoRestoredTilesRuntime?: GameManagerUndoRestoredTilesRuntime;
}

export interface GameManagerUndoRestoredTilesRuntimeInstallOptions {
  windowLike?: GameManagerUndoRestoredTilesWindowLike | null;
}

function resolveGridHeight(
  manager: GameManagerUndoRestoredTilesManagerLike,
  gridWidth: number
): number {
  return Number.isInteger(manager.height) && Number(manager.height) > 0
    ? Number(manager.height)
    : Number.isInteger(manager.width) && Number(manager.width) > 0
      ? Number(manager.width)
      : gridWidth;
}

function setRuntimeScoreForUndoFallback(
  manager: GameManagerUndoRestoredTilesManagerLike,
  value: unknown
): void {
  if (typeof manager.setRuntimeScore === "function") {
    manager.setRuntimeScore(value);
    return;
  }
  const next = Number(value);
  manager.score = Number.isFinite(next) ? next : 0;
}

function writeRuntimeGridCellForUndoFallback(
  manager: GameManagerUndoRestoredTilesManagerLike,
  x: number,
  y: number,
  tile: unknown
): boolean {
  if (typeof manager.writeRuntimeGridCell === "function") {
    return manager.writeRuntimeGridCell(x, y, tile);
  }
  if (!(manager.grid && Array.isArray(manager.grid.cells) && Array.isArray(manager.grid.cells[x]))) {
    return false;
  }
  manager.grid.cells[x][y] = tile || null;
  return true;
}

function createTileFallback(
  position: { x: number; y: number },
  value: unknown
): GameManagerUndoRestoredTileLike {
  return {
    x: position.x,
    y: position.y,
    value,
    previousPosition: null
  };
}

export function applyUndoRestoredTiles(
  manager: GameManagerUndoRestoredTilesManagerLike | null | undefined,
  undoPayload: GameManagerUndoRestoredTilesPayloadLike,
  operations: GameManagerUndoRestoredTilesOperations = {}
): void {
  if (!manager) return;
  manager.grid?.build?.();
  const score =
    Number.isFinite(undoPayload.score) && typeof undoPayload.score === "number"
      ? Number(undoPayload.score)
      : 0;
  (operations.setRuntimeScoreForUndo || setRuntimeScoreForUndoFallback)(manager, score);

  const undoTiles = Array.isArray(undoPayload.tiles) ? undoPayload.tiles : [];
  const gridWidth = manager.grid && Array.isArray(manager.grid.cells) ? manager.grid.cells.length : 0;
  const gridHeight = resolveGridHeight(manager, gridWidth);
  for (const undoTile of undoTiles) {
    const restored: GameManagerUndoRestoredTileLike | null | undefined =
      operations.createUndoRestoreTile?.(manager, undoTile);
    const x = Number(restored?.x);
    const y = Number(restored?.y);
    if (!Number.isInteger(x) || !Number.isInteger(y)) continue;
    if (x < 0 || y < 0 || x >= gridWidth || y >= gridHeight) continue;
    if (!manager.grid?.cells?.[x]) continue;
    const tile = (operations.createTile || createTileFallback)(
      { x: Number(restored?.x), y: Number(restored?.y) },
      restored?.value
    );
    if (typeof manager.isStoneValue === "function" && manager.isStoneValue(restored?.value)) {
      tile.isStone = true;
    }
    tile.previousPosition = {
      x: restored?.previousPosition?.x,
      y: restored?.previousPosition?.y
    };
    (operations.writeRuntimeGridCellForUndo || writeRuntimeGridCellForUndoFallback)(
      manager,
      Number(tile.x),
      Number(tile.y),
      tile
    );
  }
}

export function createGameManagerUndoRestoredTilesRuntime(): GameManagerUndoRestoredTilesRuntime {
  return {
    applyUndoRestoredTiles
  };
}

export function installGameManagerUndoRestoredTilesRuntime(
  options: GameManagerUndoRestoredTilesRuntimeInstallOptions = {}
): GameManagerUndoRestoredTilesRuntime | null {
  const target =
    options.windowLike === undefined
      ? typeof window === "undefined"
        ? null
        : (window as unknown as GameManagerUndoRestoredTilesWindowLike)
      : options.windowLike;
  if (!target) return null;
  if (!target.CoreGameManagerUndoRestoredTilesRuntime) {
    target.CoreGameManagerUndoRestoredTilesRuntime = createGameManagerUndoRestoredTilesRuntime();
  }
  return target.CoreGameManagerUndoRestoredTilesRuntime;
}
