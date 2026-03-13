import { safeClonePlain, type PlainRecord } from "./mode";

export interface CellPoint {
  x: number;
  y: number;
}

export interface ItemModeRules {
  enabled: boolean;
  grantEveryMoves: number;
  maxPerItem: number;
}

export interface SpecialRulesState {
  blockedCellSet: Record<string, true>;
  blockedCellsList: CellPoint[];
  stoneCellsList: CellPoint[];
  undoLimit: number | null;
  comboMultiplier: number;
  directionLockRules: unknown | null;
  movementDirections: number[];
  moveTimeoutMs: number | null;
  itemModeRules: ItemModeRules | null;
}

function normalizePointList(rawList: unknown, width: number, height: number): CellPoint[] {
  const source = Array.isArray(rawList) ? rawList : [];
  const out: CellPoint[] = [];
  for (let i = 0; i < source.length; i++) {
    const item = source[i];
    let rawX: unknown;
    let rawY: unknown;
    if (Array.isArray(item) && item.length >= 2) {
      rawX = item[0];
      rawY = item[1];
    } else if (item && typeof item === "object") {
      rawX = (item as { x?: unknown }).x;
      rawY = (item as { y?: unknown }).y;
    }
    const x = Number(rawX);
    const y = Number(rawY);
    if (!Number.isInteger(x) || !Number.isInteger(y)) continue;
    if (x < 0 || x >= width || y < 0 || y >= height) continue;
    out.push({ x, y });
  }
  return out;
}

function normalizeMovementDirections(
  movementDirectionsRaw: unknown,
  allowDiagonalRaw: unknown
): number[] {
  const out: number[] = [];
  if (Array.isArray(movementDirectionsRaw)) {
    for (let i = 0; i < movementDirectionsRaw.length; i++) {
      const dir = Number(movementDirectionsRaw[i]);
      if (!Number.isInteger(dir) || dir < 0 || dir > 7) continue;
      if (out.indexOf(dir) !== -1) continue;
      out.push(dir);
    }
  }
  if (out.length > 0) return out;
  if (allowDiagonalRaw === true) return [0, 1, 2, 3, 4, 5, 6, 7];
  return [0, 1, 2, 3];
}

function normalizeMoveTimeoutMs(rawValue: unknown): number | null {
  const timeoutMs = Number(rawValue);
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) return null;
  return timeoutMs;
}

function normalizeItemModeRules(rawValue: unknown): ItemModeRules | null {
  if (!rawValue || typeof rawValue !== "object" || Array.isArray(rawValue)) return null;
  const source = rawValue as Record<string, unknown>;
  if (source.enabled === false) return null;
  const grantEveryMoves =
    Number.isInteger(source.grant_every_moves) && Number(source.grant_every_moves) > 0
      ? Number(source.grant_every_moves)
      : 6;
  const maxPerItem =
    Number.isInteger(source.max_per_item) && Number(source.max_per_item) > 0
      ? Number(source.max_per_item)
      : 3;

  return {
    enabled: true,
    grantEveryMoves,
    maxPerItem
  };
}

export function computeSpecialRulesState(
  rules: PlainRecord | null | undefined,
  width: number,
  height: number
): SpecialRulesState {
  const source = rules && typeof rules === "object" ? rules : {};
  const blockedCellsList = normalizePointList(source.blocked_cells, width, height);
  const blockedCellSet: Record<string, true> = {};
  for (let i = 0; i < blockedCellsList.length; i++) {
    const cell = blockedCellsList[i];
    blockedCellSet[`${cell.x}:${cell.y}`] = true;
  }
  const stoneCellsList = normalizePointList(source.stone_tiles, width, height);

  const undoLimit =
    Number.isInteger(source.undo_limit) && Number(source.undo_limit) >= 0
      ? Number(source.undo_limit)
      : null;
  const comboMultiplier =
    Number.isFinite(source.combo_multiplier) && Number(source.combo_multiplier) > 1
      ? Number(source.combo_multiplier)
      : 1;

  const directionLockRules =
    source.direction_lock && typeof source.direction_lock === "object"
      ? safeClonePlain(source.direction_lock, null)
      : null;
  const movementDirections = normalizeMovementDirections(
    source.movement_directions,
    source.allow_diagonal_moves
  );
  const moveTimeoutMs = normalizeMoveTimeoutMs(source.move_timeout_ms);
  const itemModeRules = normalizeItemModeRules(source.item_mode);

  return {
    blockedCellSet,
    blockedCellsList,
    stoneCellsList,
    undoLimit,
    comboMultiplier,
    directionLockRules,
    movementDirections,
    moveTimeoutMs,
    itemModeRules
  };
}
