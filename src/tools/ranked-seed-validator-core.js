export const DEFAULT_MODE_KEY = "standard_4x4_pow2_no_undo";
export const RANKED_DIRECTION_OPTIONS = [
  { code: 0, key: "up", label: "Up" },
  { code: 1, key: "right", label: "Right" },
  { code: 2, key: "down", label: "Down" },
  { code: 3, key: "left", label: "Left" }
];

function fail(message) {
  throw new Error(`[ranked-seed-validator] ${message}`);
}

export function normalizeSeed(rawSeed) {
  const seed = Number(rawSeed);
  if (!Number.isSafeInteger(seed) || seed < 0) {
    fail(`seed must be a non-negative safe integer, received: ${rawSeed}`);
  }
  return seed;
}

export function createEmptyBoard(width, height) {
  return Array.from({ length: height }, () => Array.from({ length: width }, () => 0));
}

export function cloneBoard(board) {
  return board.map((row) => row.slice());
}

export function normalizeSpawnTable(spawnTable, ruleset) {
  if (Array.isArray(spawnTable) && spawnTable.length > 0) {
    const out = [];
    for (const item of spawnTable) {
      const value = Math.floor(Number(item && item.value));
      const weight = Math.floor(Number(item && item.weight));
      if (!Number.isInteger(value) || value <= 0) continue;
      if (!Number.isInteger(weight) || weight <= 0) continue;
      out.push({ value, weight });
    }
    if (out.length > 0) return out;
  }
  return ruleset === "fibonacci"
    ? [{ value: 1, weight: 90 }, { value: 2, weight: 10 }]
    : [{ value: 2, weight: 90 }, { value: 4, weight: 10 }];
}

export function normalizeModeRecord(rawMode) {
  if (!rawMode || typeof rawMode !== "object") fail("mode record is missing");
  const width = Math.floor(Number(rawMode.board_width));
  const height = Math.floor(Number(rawMode.board_height));
  if (!Number.isInteger(width) || width <= 0) fail("mode width is invalid");
  if (!Number.isInteger(height) || height <= 0) fail("mode height is invalid");
  const ruleset = rawMode.ruleset === "fibonacci" ? "fibonacci" : "pow2";
  const maxTile = Math.floor(Number(rawMode.max_tile));
  return {
    key: String(rawMode.key || ""),
    label: String(rawMode.label || ""),
    width,
    height,
    ruleset,
    rankPolicy: String(rawMode.rank_policy || ""),
    maxTile: Number.isInteger(maxTile) && maxTile > 0 ? maxTile : null,
    spawnTable: normalizeSpawnTable(rawMode.spawn_table, ruleset)
  };
}

export function resolveRankedModeFromCatalog(catalog, modeKey = DEFAULT_MODE_KEY) {
  if (!catalog || typeof catalog.getMode !== "function") {
    fail("failed to load mode catalog");
  }
  const rawMode = catalog.getMode(modeKey || DEFAULT_MODE_KEY);
  if (!rawMode) fail(`mode not found: ${modeKey || DEFAULT_MODE_KEY}`);
  const mode = normalizeModeRecord(rawMode);
  if (mode.rankPolicy.toLowerCase() !== "ranked") {
    fail(`mode is not using ranked deterministic spawn logic: ${mode.key}`);
  }
  return mode;
}

export function listRankedModesFromCatalog(catalog) {
  if (!catalog || typeof catalog.listModes !== "function") {
    return [resolveRankedModeFromCatalog(catalog)];
  }
  const rawModes = catalog.listModes();
  if (!Array.isArray(rawModes)) {
    return [resolveRankedModeFromCatalog(catalog)];
  }
  return rawModes
    .map((mode) => normalizeModeRecord(mode))
    .filter((mode) => mode.rankPolicy.toLowerCase() === "ranked");
}

export function parseBoardText(boardText, mode) {
  let parsed;
  try {
    parsed = JSON.parse(boardText);
  } catch (error) {
    fail(`board JSON parse failed: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!Array.isArray(parsed) || parsed.length !== mode.height) {
    fail(`board must contain exactly ${mode.height} rows`);
  }
  return parsed.map((rawRow, rowIndex) => {
    if (!Array.isArray(rawRow) || rawRow.length !== mode.width) {
      fail(`board row ${rowIndex} must contain exactly ${mode.width} cells`);
    }
    return rawRow.map((rawCell, columnIndex) => {
      const value = Math.floor(Number(rawCell) || 0);
      if (!Number.isInteger(value) || value < 0) {
        fail(`board cell (${columnIndex}, ${rowIndex}) is invalid`);
      }
      return value;
    });
  });
}

export function listAvailableCells(board) {
  const available = [];
  const height = Array.isArray(board) ? board.length : 0;
  const width = height > 0 && Array.isArray(board[0]) ? board[0].length : 0;
  for (let x = 0; x < width; x += 1) {
    for (let y = 0; y < height; y += 1) {
      if (Math.floor(Number(board[y][x]) || 0) === 0) {
        available.push({ x, y });
      }
    }
  }
  return available;
}

export function createRankedDeterministicHash(seed, stepCount, channel) {
  const normalizedSeed = normalizeSeed(seed);
  const normalizedStepCount = Math.floor(Number(stepCount));
  if (!Number.isInteger(normalizedStepCount) || normalizedStepCount < 0) {
    fail(`stepCount must be a non-negative integer, received: ${stepCount}`);
  }
  const text = `${Math.floor(normalizedSeed)}|${normalizedStepCount}|${String(channel || "")}`;
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x85ebca6b);
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 0xc2b2ae35);
  hash ^= hash >>> 16;
  return hash >>> 0;
}

export function resolveRankedDeterministicUnitFloat(seed, stepCount, channel) {
  return createRankedDeterministicHash(seed, stepCount, channel) / 0x100000000;
}

export function pickSpawnValueByRoll(mode, roll) {
  const table = normalizeSpawnTable(mode && mode.spawnTable, mode && mode.ruleset);
  let totalWeight = 0;
  for (const item of table) {
    totalWeight += Math.max(0, Math.floor(Number(item && item.weight) || 0));
  }
  if (!(totalWeight > 0)) {
    return mode && mode.ruleset === "fibonacci" ? 1 : 2;
  }
  const cursor = Math.min(Number(roll) || 0, 0.9999999999999999) * totalWeight;
  let running = 0;
  for (const item of table) {
    running += Math.max(0, Math.floor(Number(item && item.weight) || 0));
    if (cursor < running) {
      return Math.floor(Number(item && item.value) || 0) || (mode && mode.ruleset === "fibonacci" ? 1 : 2);
    }
  }
  const fallback = table[table.length - 1];
  return Math.floor(Number(fallback && fallback.value) || 0) || (mode && mode.ruleset === "fibonacci" ? 1 : 2);
}

export function resolveSpawnValueBit(ruleset, value) {
  if (ruleset === "fibonacci") return value === 2 ? 1 : 0;
  return value === 4 ? 1 : 0;
}

export function resolveExpectedRankedSpawn({ board, mode, seed, stepCount }) {
  const normalizedBoard = parseBoardText(JSON.stringify(board), mode);
  const available = listAvailableCells(normalizedBoard);
  if (available.length <= 0) {
    fail("board has no available cells for the next spawn");
  }
  const normalizedStepCount = Math.floor(Number(stepCount));
  if (!Number.isInteger(normalizedStepCount) || normalizedStepCount < 0) {
    fail(`stepCount must be a non-negative integer, received: ${stepCount}`);
  }
  const valueRoll = resolveRankedDeterministicUnitFloat(seed, normalizedStepCount, "spawn:value");
  const cellRoll = resolveRankedDeterministicUnitFloat(seed, normalizedStepCount, "spawn:cell");
  const value = pickSpawnValueByRoll(mode, valueRoll);
  const cell = available[Math.min(available.length - 1, Math.floor(cellRoll * available.length))];
  return {
    stepCount: normalizedStepCount,
    spawnIndex: cell.y * mode.width + cell.x,
    x: cell.x,
    y: cell.y,
    value,
    spawnValueBit: resolveSpawnValueBit(mode.ruleset, value),
    availableCellCount: available.length,
    valueRoll,
    cellRoll
  };
}

export function applyPredictedSpawn(board, spawn) {
  const nextBoard = cloneBoard(board);
  if (!nextBoard[spawn.y] || nextBoard[spawn.y][spawn.x] !== 0) {
    fail(`predicted spawn cell is not empty: (${spawn.x}, ${spawn.y})`);
  }
  nextBoard[spawn.y][spawn.x] = spawn.value;
  return nextBoard;
}

export function createExpectedRankedInitialBoard(mode, seed) {
  let board = createEmptyBoard(mode.width, mode.height);
  const spawns = [];
  for (let stepCount = 0; stepCount < 2; stepCount += 1) {
    const spawn = resolveExpectedRankedSpawn({ board, mode, seed, stepCount });
    board = applyPredictedSpawn(board, spawn);
    spawns.push(spawn);
  }
  return { board, spawns };
}

export function formatBoard(board) {
  const maxWidth = board.reduce((width, row) => {
    return Math.max(
      width,
      ...row.map((value) => String(Math.floor(Number(value) || 0) || ".").length)
    );
  }, 1);
  return board
    .map((row) =>
      row
        .map((value) => {
          const text = Math.floor(Number(value) || 0) === 0 ? "." : String(Math.floor(Number(value) || 0));
          return text.padStart(maxWidth, " ");
        })
        .join(" ")
    )
    .join("\n");
}

function resolveModeMaxTile(mode) {
  const maxTile = Math.floor(Number(mode && mode.maxTile));
  if (Number.isInteger(maxTile) && maxTile > 0) return maxTile;
  return Number.POSITIVE_INFINITY;
}

function isWithinBounds(cell, mode) {
  return !!(
    cell &&
    cell.x >= 0 &&
    cell.x < mode.width &&
    cell.y >= 0 &&
    cell.y < mode.height
  );
}

function getVector(directionCode) {
  switch (Number(directionCode)) {
    case 0:
      return { x: 0, y: -1 };
    case 1:
      return { x: 1, y: 0 };
    case 2:
      return { x: 0, y: 1 };
    case 3:
      return { x: -1, y: 0 };
    default:
      return null;
  }
}

function buildTraversals(mode, vector) {
  const traversals = {
    x: Array.from({ length: mode.width }, (_value, index) => index),
    y: Array.from({ length: mode.height }, (_value, index) => index)
  };
  if (vector.x === 1) traversals.x.reverse();
  if (vector.y === 1) traversals.y.reverse();
  return traversals;
}

function isBlockedCell() {
  return false;
}

function isCellAvailable(board, cell) {
  return isWithinBounds(cell, { width: board[0].length, height: board.length }) && board[cell.y][cell.x] === 0;
}

function findFarthestPosition(board, mode, cell, vector) {
  let previous;
  let current = cell;

  do {
    previous = current;
    current = { x: previous.x + vector.x, y: previous.y + vector.y };
  } while (
    isWithinBounds(current, mode) &&
    !isBlockedCell(current.x, current.y) &&
    isCellAvailable(board, current)
  );

  return {
    farthest: previous,
    next: current
  };
}

function planTileInteraction(cell, farthest, next, hasNextTile, nextMergedFrom, mergedValue) {
  const shouldMerge =
    !!hasNextTile &&
    !nextMergedFrom &&
    Number.isInteger(mergedValue) &&
    Number(mergedValue) > 0;
  const target = shouldMerge ? next : farthest;
  return {
    kind: shouldMerge ? "merge" : "move",
    target: {
      x: Number.isInteger(target.x) ? Number(target.x) : 0,
      y: Number.isInteger(target.y) ? Number(target.y) : 0
    },
    moved: target.x !== Number(cell.x) || target.y !== Number(cell.y)
  };
}

function createMergedFlagBoard(mode) {
  return Array.from({ length: mode.height }, () => Array.from({ length: mode.width }, () => false));
}

function nextFibonacci(value) {
  if (value <= 0) return 1;
  if (value === 1) return 2;
  let a = 1;
  let b = 2;
  while (b < value) {
    const next = a + b;
    a = b;
    b = next;
  }
  return b === value ? a + b : null;
}

function resolveMergedValue(a, b, mode) {
  const maxTile = resolveModeMaxTile(mode);
  if (mode.ruleset !== "fibonacci") {
    if (a !== b) return null;
    const merged = a * 2;
    if (merged > maxTile) return null;
    return merged;
  }

  if (a === 1 && b === 1) {
    if (2 > maxTile) return null;
    return 2;
  }

  const low = Math.min(a, b);
  const high = Math.max(a, b);
  const next = nextFibonacci(low);
  if (next !== high) return null;
  const merged = low + high;
  if (merged > maxTile) return null;
  return merged;
}

function resolveDirectionOption(directionCode) {
  const match = RANKED_DIRECTION_OPTIONS.find((option) => option.code === Number(directionCode));
  if (!match) fail(`unsupported direction code: ${directionCode}`);
  return match;
}

export function simulateMove(board, mode, directionCode) {
  const normalizedBoard = parseBoardText(JSON.stringify(board), mode);
  const direction = resolveDirectionOption(directionCode);
  const vector = getVector(direction.code);
  if (!vector) fail(`unsupported direction code: ${directionCode}`);
  const traversals = buildTraversals(mode, vector);
  const nextBoard = cloneBoard(normalizedBoard);
  const mergedFlags = createMergedFlagBoard(mode);
  let moved = false;
  let scoreDelta = 0;

  for (const x of traversals.x) {
    for (const y of traversals.y) {
      const cell = { x, y };
      const value = nextBoard[y][x];
      if (!Number.isInteger(value) || value <= 0) continue;

      const positions = findFarthestPosition(nextBoard, mode, cell, vector);
      const nextCell = positions.next;
      const hasNextTile = isWithinBounds(nextCell, mode) && nextBoard[nextCell.y][nextCell.x] > 0;
      const nextValue = hasNextTile ? nextBoard[nextCell.y][nextCell.x] : null;
      const mergedValue = hasNextTile ? resolveMergedValue(value, nextValue, mode) : null;
      const interaction = planTileInteraction(
        cell,
        positions.farthest,
        nextCell,
        hasNextTile,
        hasNextTile ? mergedFlags[nextCell.y][nextCell.x] === true : false,
        mergedValue
      );

      if (interaction.kind === "merge" && hasNextTile && mergedValue !== null) {
        nextBoard[cell.y][cell.x] = 0;
        nextBoard[nextCell.y][nextCell.x] = mergedValue;
        mergedFlags[nextCell.y][nextCell.x] = true;
        scoreDelta += mergedValue;
        moved = interaction.moved || moved;
        continue;
      }

      if (interaction.moved) {
        nextBoard[cell.y][cell.x] = 0;
        nextBoard[interaction.target.y][interaction.target.x] = value;
        moved = true;
      }
    }
  }

  return {
    directionCode: direction.code,
    directionKey: direction.key,
    directionLabel: direction.label,
    moved,
    scoreDelta,
    boardAfterMove: moved ? nextBoard : normalizedBoard
  };
}

export function predictRankedDirectionOutcome({ board, mode, seed, stepCount, directionCode }) {
  const move = simulateMove(board, mode, directionCode);
  if (!move.moved) {
    return {
      ...move,
      prediction: null,
      boardAfterSpawn: move.boardAfterMove
    };
  }
  const prediction = resolveExpectedRankedSpawn({
    board: move.boardAfterMove,
    mode,
    seed,
    stepCount
  });
  return {
    ...move,
    prediction,
    boardAfterSpawn: applyPredictedSpawn(move.boardAfterMove, prediction)
  };
}

export function predictAllRankedDirections({ board, mode, seed, stepCount }) {
  return RANKED_DIRECTION_OPTIONS.map((direction) =>
    predictRankedDirectionOutcome({
      board,
      mode,
      seed,
      stepCount,
      directionCode: direction.code
    })
  );
}
