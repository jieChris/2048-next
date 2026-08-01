import type { Ruleset } from "./engine";
import { randomUnitFloat } from "../utils/crypto-random";

export interface SpawnTableItem {
  value: number;
  weight: number;
}

export interface SpawnValueCountMap {
  [key: string]: number | undefined;
}

export interface SpawnStatPair {
  primary: number;
  secondary: number;
}

export interface SpawnValueUpdateResult {
  nextSpawnValueCounts: Record<string, number>;
  spawnTwos: number;
  spawnFours: number;
}

const FIBONACCI_MILESTONES = [13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584, 4181];
const FIRST_TIMER_SLOT_VALUE = 32;
const MAX_SAFE_TIMER_SLOT_VALUE = 4503599627370496;

function getFibonacciTileAtRank(rank: number): number {
  let previous = 1;
  let current = 2;
  for (let currentRank = 3; currentRank <= rank; currentRank++) {
    const next = previous + current;
    previous = current;
    current = next;
  }
  return rank <= 1 ? 1 : current;
}

export function normalizeSpawnTable(
  spawnTable: SpawnTableItem[] | null | undefined,
  ruleset: Ruleset
): SpawnTableItem[] {
  if (Array.isArray(spawnTable) && spawnTable.length > 0) {
    const out: SpawnTableItem[] = [];
    for (let i = 0; i < spawnTable.length; i++) {
      const item = spawnTable[i];
      if (!item || !Number.isInteger(item.value) || item.value <= 0) continue;
      if (!Number.isFinite(item.weight) || item.weight <= 0) continue;
      out.push({ value: item.value, weight: Number(item.weight) });
    }
    if (out.length > 0) return out;
  }
  if (ruleset === "fibonacci") {
    return [{ value: 1, weight: 90 }, { value: 2, weight: 10 }];
  }
  return [{ value: 2, weight: 90 }, { value: 4, weight: 10 }];
}

export function getTheoreticalMaxTile(width: number, height: number, ruleset: Ruleset): number | null {
  const w = Number(width);
  const h = Number(height);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null;
  const cells = Math.floor(w) * Math.floor(h);
  if (!Number.isInteger(cells) || cells <= 0) return null;

  if (ruleset === "fibonacci") {
    return getFibonacciTileAtRank(cells * 2);
  }

  return Math.pow(2, cells + 1);
}

function resolveTimerMaxTile(
  width: number,
  height: number,
  ruleset: Ruleset,
  maxTileOverride?: number | null
): number | null {
  let theoreticalMax = getTheoreticalMaxTile(width, height, ruleset);
  if (ruleset === "fibonacci" && Math.floor(Number(width)) === 4 && Math.floor(Number(height)) === 4) {
    // Product rule: the 4x4 timer stops one Fibonacci milestone before the absolute maximum.
    theoreticalMax = getFibonacciTileAtRank(
      Math.floor(Number(width)) * Math.floor(Number(height)) * 2 - 1
    );
  }
  const override = Number(maxTileOverride);
  if (!Number.isFinite(override) || override <= 0) return theoreticalMax;
  return theoreticalMax === null ? Math.floor(override) : Math.min(theoreticalMax, Math.floor(override));
}

function normalizePositiveIntegerList(values: unknown[] | null | undefined): number[] {
  const out: number[] = [];
  const seen = new Set<number>();
  const list = Array.isArray(values) ? values : [];
  for (const rawValue of list) {
    const value = Number(rawValue);
    if (!Number.isInteger(value) || value <= 0 || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  out.sort((left, right) => left - right);
  return out;
}

function getFibonacciMilestonesUpTo(maxTile: number | null): number[] {
  if (!Number.isFinite(maxTile) || Number(maxTile) <= 0) return FIBONACCI_MILESTONES.slice();
  const out: number[] = [];
  let previous = 1;
  let current = 2;
  while (current <= Number(maxTile)) {
    if (current >= 13) out.push(current);
    const next = previous + current;
    previous = current;
    current = next;
  }
  return out;
}

function getPow2TimerSlotsUpTo(maxTile: number | null): number[] {
  if (!Number.isFinite(maxTile) || Number(maxTile) < FIRST_TIMER_SLOT_VALUE) return [];
  const out: number[] = [];
  let value = FIRST_TIMER_SLOT_VALUE;
  const limit = Math.min(Math.floor(Number(maxTile)), MAX_SAFE_TIMER_SLOT_VALUE);
  while (value <= limit) {
    out.push(value);
    value *= 2;
  }
  return out;
}

export function getTimerSlotIdsForBoard(
  ruleset: Ruleset,
  width: number,
  height: number,
  fallbackTimerSlotIds: number[] = [],
  maxTileOverride?: number | null
): number[] {
  const maxTile = resolveTimerMaxTile(width, height, ruleset, maxTileOverride);
  if (maxTile === null) return normalizePositiveIntegerList(fallbackTimerSlotIds);
  if (ruleset !== "fibonacci") return getPow2TimerSlotsUpTo(maxTile);

  const count = getFibonacciMilestonesUpTo(maxTile).length;
  const slots = getPow2TimerSlotsUpTo(Math.pow(2, count + 4));
  return slots.slice(0, count);
}

export function pickSpawnValue(
  spawnTable: SpawnTableItem[] | null | undefined,
  random: () => number = randomUnitFloat
): number {
  const table = Array.isArray(spawnTable) ? spawnTable : [];
  if (!table.length) return 2;
  let totalWeight = 0;
  for (let i = 0; i < table.length; i++) {
    totalWeight += Number(table[i].weight) || 0;
  }
  if (totalWeight <= 0) return table[0].value;

  const pick = random() * totalWeight;
  let running = 0;
  for (let i = 0; i < table.length; i++) {
    running += Number(table[i].weight) || 0;
    if (pick <= running) return table[i].value;
  }
  return table[table.length - 1].value;
}

export function getSpawnStatPair(
  spawnTable: SpawnTableItem[] | null | undefined
): SpawnStatPair {
  const table = Array.isArray(spawnTable) ? spawnTable : [];
  const values: number[] = [];
  for (let i = 0; i < table.length; i++) {
    const item = table[i];
    const value = Number(item?.value);
    if (!Number.isInteger(value) || value <= 0) continue;
    if (values.indexOf(value) === -1) values.push(value);
  }
  values.sort((a, b) => a - b);
  const primary = values.length > 0 ? values[0] : 2;
  const secondary = values.length > 1 ? values[1] : primary;
  return { primary, secondary };
}

export function getSpawnCount(
  spawnValueCounts: SpawnValueCountMap | null | undefined,
  value: number
): number {
  if (!spawnValueCounts || typeof spawnValueCounts !== "object") return 0;
  return Number(spawnValueCounts[String(value)]) || 0;
}

export function getTotalSpawnCount(
  spawnValueCounts: SpawnValueCountMap | null | undefined
): number {
  if (!spawnValueCounts || typeof spawnValueCounts !== "object") return 0;
  let total = 0;
  for (const key in spawnValueCounts) {
    if (!Object.prototype.hasOwnProperty.call(spawnValueCounts, key)) continue;
    total += Number(spawnValueCounts[key]) || 0;
  }
  return total;
}

export function getActualSecondaryRateText(
  spawnValueCounts: SpawnValueCountMap | null | undefined,
  spawnTable: SpawnTableItem[] | null | undefined
): string {
  const pair = getSpawnStatPair(spawnTable);
  const total = getTotalSpawnCount(spawnValueCounts);
  if (total <= 0) return "0.00";
  const secondaryCount = getSpawnCount(spawnValueCounts, pair.secondary);
  return ((secondaryCount / total) * 100).toFixed(2);
}

export function applySpawnValueCount(
  spawnValueCounts: SpawnValueCountMap | null | undefined,
  value: number
): SpawnValueUpdateResult {
  const nextSpawnValueCounts: Record<string, number> = {};
  if (spawnValueCounts && typeof spawnValueCounts === "object") {
    for (const key in spawnValueCounts) {
      if (!Object.prototype.hasOwnProperty.call(spawnValueCounts, key)) continue;
      nextSpawnValueCounts[key] = Number(spawnValueCounts[key]) || 0;
    }
  }
  const k = String(value);
  nextSpawnValueCounts[k] = (nextSpawnValueCounts[k] || 0) + 1;
  return {
    nextSpawnValueCounts,
    spawnTwos: nextSpawnValueCounts["2"] || 0,
    spawnFours: nextSpawnValueCounts["4"] || 0
  };
}

export function nextFibonacci(value: number): number | null {
  if (value <= 0) return 1;
  if (value === 1) return 2;
  let a = 1;
  let b = 2;
  while (b < value) {
    const n = a + b;
    a = b;
    b = n;
  }
  return b === value ? a + b : null;
}

export function getMergedValue(
  a: number,
  b: number,
  ruleset: Ruleset,
  maxTile: number
): number | null {
  if (!Number.isInteger(a) || !Number.isInteger(b) || a <= 0 || b <= 0) return null;

  if (ruleset !== "fibonacci") {
    if (a !== b) return null;
    const pow2Merged = a * 2;
    if (pow2Merged > maxTile) return null;
    return pow2Merged;
  }

  if (a === 1 && b === 1) {
    if (2 > maxTile) return null;
    return 2;
  }

  const low = Math.min(a, b);
  const high = Math.max(a, b);
  const next = nextFibonacci(low);
  if (next !== high) return null;
  const fibMerged = low + high;
  if (fibMerged > maxTile) return null;
  return fibMerged;
}

export function getTimerMilestoneValues(
  ruleset: Ruleset,
  timerSlotIds: number[],
  width?: number,
  height?: number,
  maxTileOverride?: number | null
): number[] {
  const hasBoardSize =
    typeof width === "number" &&
    typeof height === "number" &&
    Number.isFinite(width) &&
    Number.isFinite(height) &&
    width > 0 &&
    height > 0;
  const maxTile = hasBoardSize
    ? resolveTimerMaxTile(width, height, ruleset, maxTileOverride)
    : null;
  if (ruleset === "fibonacci") {
    return hasBoardSize ? getFibonacciMilestonesUpTo(maxTile) : FIBONACCI_MILESTONES.slice();
  }
  const slots = normalizePositiveIntegerList(timerSlotIds);
  if (!hasBoardSize || maxTile === null) return slots;
  return slots.filter((value) => value <= maxTile);
}

export function getTimerMilestoneSlotByValue(
  timerMilestones: number[],
  timerSlotIds: number[]
): Record<string, string> {
  const slotMap: Record<string, string> = {};
  for (let i = 0; i < timerSlotIds.length; i++) {
    const milestone = timerMilestones[i];
    if (!Number.isInteger(milestone) || milestone <= 0) continue;
    slotMap[String(milestone)] = String(timerSlotIds[i]);
  }
  return slotMap;
}

export interface RulesRuntime {
  normalizeSpawnTable: typeof normalizeSpawnTable;
  getTheoreticalMaxTile: typeof getTheoreticalMaxTile;
  pickSpawnValue: typeof pickSpawnValue;
  getSpawnStatPair: typeof getSpawnStatPair;
  getSpawnCount: typeof getSpawnCount;
  getTotalSpawnCount: typeof getTotalSpawnCount;
  getActualSecondaryRateText: typeof getActualSecondaryRateText;
  applySpawnValueCount: typeof applySpawnValueCount;
  nextFibonacci: typeof nextFibonacci;
  getMergedValue: typeof getMergedValue;
  getTimerSlotIdsForBoard: typeof getTimerSlotIdsForBoard;
  getTimerMilestoneValues: typeof getTimerMilestoneValues;
  getTimerMilestoneSlotByValue: typeof getTimerMilestoneSlotByValue;
}

export interface RulesRuntimeWindowLike {
  CoreRulesRuntime?: RulesRuntime;
}

export interface RulesRuntimeInstallOptions {
  windowLike?: RulesRuntimeWindowLike | null | undefined;
}

export function createRulesRuntime(): RulesRuntime {
  return {
    normalizeSpawnTable,
    getTheoreticalMaxTile,
    pickSpawnValue,
    getSpawnStatPair,
    getSpawnCount,
    getTotalSpawnCount,
    getActualSecondaryRateText,
    applySpawnValueCount,
    nextFibonacci,
    getMergedValue,
    getTimerSlotIdsForBoard,
    getTimerMilestoneValues,
    getTimerMilestoneSlotByValue
  };
}

export function installRulesRuntime(
  options: RulesRuntimeInstallOptions = {}
): RulesRuntime | null {
  const windowLike =
    options.windowLike ||
    (typeof window === "undefined" ? null : (window as unknown as RulesRuntimeWindowLike));
  if (!windowLike) return null;
  if (!windowLike.CoreRulesRuntime) {
    windowLike.CoreRulesRuntime = createRulesRuntime();
  }
  return windowLike.CoreRulesRuntime || null;
}
