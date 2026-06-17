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

export interface SpecialRulesRuntime {
  computeSpecialRulesState: typeof computeSpecialRulesState;
  applySpecialRulesStateSnapshot: typeof applySpecialRulesStateSnapshot;
  applySpecialRulesStateFallback: typeof applySpecialRulesStateFallback;
}

export interface SpecialRulesRuntimeWindowLike {
  CoreSpecialRulesRuntime?: SpecialRulesRuntime;
}

export interface SpecialRulesRuntimeInstallOptions {
  windowLike?: SpecialRulesRuntimeWindowLike | null | undefined;
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

function resolvePositiveIntegerRuleValue(
  source: Record<string, unknown>,
  primaryKey: string,
  fallbackKey: string,
  defaultValue: number
): number {
  if (Number.isInteger(source[primaryKey]) && Number(source[primaryKey]) > 0) {
    return Number(source[primaryKey]);
  }
  if (Number.isInteger(source[fallbackKey]) && Number(source[fallbackKey]) > 0) {
    return Number(source[fallbackKey]);
  }
  return defaultValue;
}

function normalizeItemModeRules(rawValue: unknown): ItemModeRules | null {
  if (!rawValue || typeof rawValue !== "object" || Array.isArray(rawValue)) return null;
  const source = rawValue as Record<string, unknown>;
  if (source.enabled === false) return null;
  return {
    enabled: true,
    grantEveryMoves: resolvePositiveIntegerRuleValue(source, "grantEveryMoves", "grant_every_moves", 6),
    maxPerItem: resolvePositiveIntegerRuleValue(source, "maxPerItem", "max_per_item", 3)
  };
}

export interface SpecialRulesManagerLike {
  width?: unknown;
  height?: unknown;
  specialRules?: PlainRecord | null | undefined;
  clonePlain?: (value: unknown) => unknown;
  blockedCellSet?: Record<string, true>;
  blockedCellsList?: CellPoint[];
  stoneCellsList?: CellPoint[];
  stoneValueSet?: Record<string, true>;
  undoLimit?: number | null;
  comboMultiplier?: number;
  directionLockRules?: unknown | null;
  allowedDirections?: number[];
  allowedDirectionSet?: Record<string, true>;
  moveTimeoutMs?: number | null;
  itemModeRules?: ItemModeRules | null;
}

function normalizeRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function cloneManagerPlain(manager: SpecialRulesManagerLike, value: unknown): unknown {
  return typeof manager.clonePlain === "function" ? manager.clonePlain(value) : safeClonePlain(value, null);
}

function resolveStoneMarkerValue(index: number): number {
  return 3 + (Number(index) * 2);
}

function applyStoneStateToManager(manager: SpecialRulesManagerLike, stoneCellsList: unknown): void {
  manager.stoneCellsList = Array.isArray(stoneCellsList) ? stoneCellsList.slice() : [];
  manager.stoneValueSet = {};
  for (let index = 0; index < manager.stoneCellsList.length; index += 1) {
    manager.stoneValueSet[String(resolveStoneMarkerValue(index))] = true;
  }
}

function normalizeMoveDirectionsForManager(rawDirections: unknown): number[] {
  const source = Array.isArray(rawDirections) ? rawDirections : [];
  const out: number[] = [];
  for (let index = 0; index < source.length; index += 1) {
    const dir = Number(source[index]);
    if (!Number.isInteger(dir) || dir < 0 || dir > 7) continue;
    if (out.indexOf(dir) !== -1) continue;
    out.push(dir);
  }
  return out.length > 0 ? out : [0, 1, 2, 3];
}

function applyMoveDirectionsToManager(manager: SpecialRulesManagerLike, rawDirections: unknown): void {
  manager.allowedDirections = normalizeMoveDirectionsForManager(rawDirections);
  manager.allowedDirectionSet = {};
  for (let index = 0; index < manager.allowedDirections.length; index += 1) {
    manager.allowedDirectionSet[String(manager.allowedDirections[index])] = true;
  }
}

function normalizeItemModeRulesForManager(rawRules: unknown): ItemModeRules | null {
  return normalizeItemModeRules(rawRules);
}

export function applySpecialRulesStateSnapshot(
  manager: SpecialRulesManagerLike | null | undefined,
  stateValue: unknown
): void {
  if (!manager) return;
  const state = normalizeRecord(stateValue);
  manager.blockedCellSet = normalizeRecord(state.blockedCellSet) as Record<string, true>;
  manager.blockedCellsList = Array.isArray(state.blockedCellsList) ? state.blockedCellsList as CellPoint[] : [];
  applyStoneStateToManager(manager, normalizePointList(state.stoneCellsList, Number(manager.width), Number(manager.height)));
  manager.undoLimit =
    Number.isInteger(state.undoLimit) && Number(state.undoLimit) >= 0 ? Number(state.undoLimit) : null;
  manager.comboMultiplier =
    Number.isFinite(state.comboMultiplier) && Number(state.comboMultiplier) > 1
      ? Number(state.comboMultiplier)
      : 1;
  manager.directionLockRules = isRecord(state.directionLockRules)
    ? cloneManagerPlain(manager, state.directionLockRules)
    : null;
  applyMoveDirectionsToManager(manager, state.movementDirections);
  manager.moveTimeoutMs =
    Number.isInteger(state.moveTimeoutMs) && Number(state.moveTimeoutMs) > 0
      ? Number(state.moveTimeoutMs)
      : null;
  manager.itemModeRules = normalizeItemModeRulesForManager(state.itemModeRules);
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

export function applySpecialRulesStateFallback(manager: SpecialRulesManagerLike | null | undefined): void {
  if (!manager) return;
  const state = computeSpecialRulesState(
    manager.specialRules || {},
    Number(manager.width),
    Number(manager.height)
  );
  applySpecialRulesStateSnapshot(manager, state);
}

export function createSpecialRulesRuntime(): SpecialRulesRuntime {
  return {
    computeSpecialRulesState,
    applySpecialRulesStateSnapshot,
    applySpecialRulesStateFallback
  };
}

export function installSpecialRulesRuntime(
  options: SpecialRulesRuntimeInstallOptions = {}
): SpecialRulesRuntime | null {
  const windowLike =
    options.windowLike ||
    (typeof window === "undefined" ? null : (window as unknown as SpecialRulesRuntimeWindowLike));
  if (!windowLike) return null;
  if (!windowLike.CoreSpecialRulesRuntime) {
    windowLike.CoreSpecialRulesRuntime = createSpecialRulesRuntime();
  } else {
    const runtime = createSpecialRulesRuntime();
    windowLike.CoreSpecialRulesRuntime.computeSpecialRulesState ||= runtime.computeSpecialRulesState;
    windowLike.CoreSpecialRulesRuntime.applySpecialRulesStateSnapshot ||= runtime.applySpecialRulesStateSnapshot;
    windowLike.CoreSpecialRulesRuntime.applySpecialRulesStateFallback ||= runtime.applySpecialRulesStateFallback;
  }
  return windowLike.CoreSpecialRulesRuntime || null;
}
