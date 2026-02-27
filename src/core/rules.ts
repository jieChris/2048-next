import type { Ruleset } from "./engine";

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
    const targetIndex = cells + 2;
    let a = 1;
    let b = 2;
    if (targetIndex <= 1) return 1;
    if (targetIndex === 2) return 2;
    for (let i = 3; i <= targetIndex; i++) {
      const next = a + b;
      a = b;
      b = next;
    }
    return b;
  }

  return Math.pow(2, cells + 1);
}

export function pickSpawnValue(
  spawnTable: SpawnTableItem[] | null | undefined,
  random: () => number = Math.random
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

export function getTimerMilestoneValues(ruleset: Ruleset, timerSlotIds: number[]): number[] {
  if (ruleset === "fibonacci") {
    return FIBONACCI_MILESTONES.slice();
  }
  return timerSlotIds.slice();
}
