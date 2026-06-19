export interface SessionReplaySnapshotManagerLike {
  modeKey?: unknown;
  mode?: unknown;
  width?: unknown;
  height?: unknown;
  ruleset?: unknown;
  modeConfig?: { undo_enabled?: unknown } | null;
  modeFamily?: unknown;
  rankPolicy?: unknown;
  specialRules?: unknown;
  challengeId?: unknown;
  initialSeed?: unknown;
  sessionReplayV3?: unknown;
  sessionReplayV1?: unknown;
  clonePlain?: (value: unknown) => unknown;
}

export interface SessionReplaySnapshotRuntime {
  initializeSetupSessionReplaySnapshot: typeof initializeSetupSessionReplaySnapshot;
  resolveReplayV1InitTilesFromBoardMatrix: typeof resolveReplayV1InitTilesFromBoardMatrix;
}

export interface SessionReplaySnapshotWindowLike {
  CoreSessionReplaySnapshotRuntime?: SessionReplaySnapshotRuntime;
}

export interface SessionReplaySnapshotRuntimeInstallOptions {
  windowLike?: SessionReplaySnapshotWindowLike | null;
}

function clonePlainWithManager(manager: SessionReplaySnapshotManagerLike, value: unknown): unknown {
  if (typeof manager.clonePlain === "function") {
    return manager.clonePlain(value);
  }
  return value && typeof value === "object" && !Array.isArray(value) ? { ...value } : {};
}

export interface ReplayV1InitTilesFromBoardMatrixInput {
  board?: unknown;
  width?: unknown;
  height?: unknown;
  ruleset?: unknown;
}

export interface ReplayV1InitTile {
  cellIndex: number;
  valueBit: number;
}

function normalizeDimension(value: unknown): number {
  const normalized = Math.floor(Number(value));
  return Number.isFinite(normalized) && normalized >= 0 ? normalized : -1;
}

function resolveReplayV1TileValueBit(value: unknown, fibonacci: boolean): number | null {
  const numericValue = Number(value);
  if (numericValue === 0) return null;
  if (fibonacci) {
    if (numericValue !== 1 && numericValue !== 2) return -1;
    return numericValue === 2 ? 1 : 0;
  }
  if (numericValue !== 2 && numericValue !== 4) return -1;
  return numericValue === 4 ? 1 : 0;
}

export function resolveReplayModeTagFromModeKey(modeKey: unknown, fallbackMode: unknown): string {
  const key = typeof modeKey === "string" && modeKey ? modeKey : typeof fallbackMode === "string" ? fallbackMode : "";
  if (key && key.indexOf("capped") !== -1) return "capped";
  if (key && key.indexOf("practice") !== -1) return "practice";
  return "classic";
}

export function initializeSetupSessionReplaySnapshot(
  manager: SessionReplaySnapshotManagerLike | null | undefined
): void {
  if (!manager) return;
  manager.sessionReplayV3 = {
    v: 3,
    mode: resolveReplayModeTagFromModeKey(manager.modeKey, manager.mode),
    mode_key: manager.modeKey,
    board_width: manager.width,
    board_height: manager.height,
    ruleset: manager.ruleset,
    undo_enabled: !!manager.modeConfig?.undo_enabled,
    mode_family: manager.modeFamily,
    rank_policy: manager.rankPolicy,
    special_rules_snapshot: clonePlainWithManager(manager, manager.specialRules || {}),
    challenge_id: manager.challengeId,
    seed: manager.initialSeed,
    actions: []
  };
  manager.sessionReplayV1 = {
    v: 1,
    mode_key: manager.modeKey,
    ruleset: manager.ruleset,
    board_width: manager.width,
    board_height: manager.height,
    start_unix_ms: Date.now(),
    challenge_id: manager.challengeId || null,
    seed: manager.initialSeed,
    init_tiles: [],
    records: [],
    last_event_at_ms: Date.now(),
    supported: true
  };
}

export function resolveReplayV1InitTilesFromBoardMatrix(
  input: ReplayV1InitTilesFromBoardMatrixInput
): ReplayV1InitTile[] | null;
export function resolveReplayV1InitTilesFromBoardMatrix(
  board: unknown,
  width: unknown,
  height: unknown,
  ruleset: unknown
): ReplayV1InitTile[] | null;
export function resolveReplayV1InitTilesFromBoardMatrix(
  inputOrBoard: ReplayV1InitTilesFromBoardMatrixInput | unknown,
  widthArg?: unknown,
  heightArg?: unknown,
  rulesetArg?: unknown
): ReplayV1InitTile[] | null {
  const source =
    arguments.length === 1 && inputOrBoard && typeof inputOrBoard === "object" && !Array.isArray(inputOrBoard)
      ? (inputOrBoard as ReplayV1InitTilesFromBoardMatrixInput)
      : { board: inputOrBoard, width: widthArg, height: heightArg, ruleset: rulesetArg };
  const width = normalizeDimension(source.width);
  const height = normalizeDimension(source.height);
  const board = source.board;
  if (!Array.isArray(board) || board.length !== height) return null;
  const fibonacci = String(source.ruleset || "pow2") === "fibonacci";
  const initTiles: ReplayV1InitTile[] = [];
  for (let y = 0; y < height; y += 1) {
    const row = board[y];
    if (!Array.isArray(row) || row.length !== width) return null;
    for (let x = 0; x < width; x += 1) {
      const valueBit = resolveReplayV1TileValueBit(row[x], fibonacci);
      if (valueBit === null) continue;
      if (valueBit < 0) return null;
      initTiles.push({ cellIndex: y * width + x, valueBit });
    }
  }
  return initTiles;
}

export function createSessionReplaySnapshotRuntime(): SessionReplaySnapshotRuntime {
  return {
    initializeSetupSessionReplaySnapshot,
    resolveReplayV1InitTilesFromBoardMatrix
  };
}

export function installSessionReplaySnapshotRuntime(
  options: SessionReplaySnapshotRuntimeInstallOptions = {}
): SessionReplaySnapshotRuntime | null {
  const target =
    options.windowLike === undefined
      ? typeof window === "undefined"
        ? null
        : (window as unknown as SessionReplaySnapshotWindowLike)
      : options.windowLike;
  if (!target) return null;
  if (!target.CoreSessionReplaySnapshotRuntime) {
    target.CoreSessionReplaySnapshotRuntime = createSessionReplaySnapshotRuntime();
  }
  return target.CoreSessionReplaySnapshotRuntime;
}
