import { safeClonePlain, type PlainRecord } from "./mode";

export interface CellPoint {
  x: number;
  y: number;
}

export interface SpecialRulesState {
  blockedCellSet: Record<string, true>;
  blockedCellsList: CellPoint[];
  undoLimit: number | null;
  comboMultiplier: number;
  directionLockRules: unknown | null;
}

export function computeSpecialRulesState(
  rules: PlainRecord | null | undefined,
  width: number,
  height: number
): SpecialRulesState {
  const source = rules && typeof rules === "object" ? rules : {};
  const blockedRaw = Array.isArray(source.blocked_cells) ? source.blocked_cells : [];

  const blockedCellSet: Record<string, true> = {};
  const blockedCellsList: CellPoint[] = [];
  for (let i = 0; i < blockedRaw.length; i++) {
    const item = blockedRaw[i];
    let x: number | null = null;
    let y: number | null = null;
    if (Array.isArray(item) && item.length >= 2) {
      x = Number(item[0]);
      y = Number(item[1]);
    } else if (item && typeof item === "object") {
      x = Number((item as { x?: unknown }).x);
      y = Number((item as { y?: unknown }).y);
    }
    if (!Number.isInteger(x) || !Number.isInteger(y)) continue;
    if (x < 0 || x >= width || y < 0 || y >= height) continue;
    blockedCellSet[`${x}:${y}`] = true;
    blockedCellsList.push({ x, y });
  }

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

  return {
    blockedCellSet,
    blockedCellsList,
    undoLimit,
    comboMultiplier,
    directionLockRules
  };
}
