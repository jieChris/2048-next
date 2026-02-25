export const CUSTOM_SPAWN_MODE_KEYS = {
  spawn_custom_4x4_pow2_no_undo: true,
  spawn_custom_4x4_pow2_undo: true
} as const;

export type CustomSpawnModeKey = keyof typeof CUSTOM_SPAWN_MODE_KEYS;

export interface SpawnTableItemLike {
  value?: number | null | undefined;
  weight?: number | null | undefined;
}

export interface CustomSpawnModeConfigLike {
  label?: string | null | undefined;
  spawn_table?: SpawnTableItemLike[] | null | undefined;
  special_rules?: Record<string, unknown> | null | undefined;
}

export interface CustomSpawnModeConfigResolved extends CustomSpawnModeConfigLike {
  spawn_table: Array<{ value: 2 | 4; weight: number }>;
  special_rules: Record<string, unknown>;
  label: string;
}

export function isCustomSpawnModeKey(modeKey: string | null | undefined): boolean {
  if (!modeKey) return false;
  return Boolean(
    CUSTOM_SPAWN_MODE_KEYS[modeKey as CustomSpawnModeKey]
  );
}

export function sanitizeCustomFourRate(raw: unknown): number | null {
  if (raw === null || typeof raw === "undefined") return null;
  const text = String(raw).trim().replace(/%/g, "");
  if (!text) return null;
  const num = Number(text);
  if (!Number.isFinite(num)) return null;
  if (num < 0 || num > 100) return null;
  return Math.round(num * 100) / 100;
}

export function formatRatePercent(rate: number): string {
  const fixed = Number(rate).toFixed(2);
  return fixed.replace(/\.?0+$/, "");
}

export function inferFourRateFromSpawnTable(
  spawnTable: SpawnTableItemLike[] | null | undefined
): number {
  if (!Array.isArray(spawnTable)) return 10;
  let totalWeight = 0;
  let fourWeight = 0;
  for (let i = 0; i < spawnTable.length; i++) {
    const item = spawnTable[i];
    if (!item || !Number.isFinite(item.weight) || Number(item.weight) <= 0) continue;
    totalWeight += Number(item.weight);
    if (Number(item.value) === 4) {
      fourWeight += Number(item.weight);
    }
  }
  if (totalWeight <= 0) return 10;
  return Math.round((fourWeight / totalWeight) * 10000) / 100;
}

function cloneModeConfig<T extends CustomSpawnModeConfigLike>(modeConfig: T): T {
  try {
    return JSON.parse(JSON.stringify(modeConfig)) as T;
  } catch (_err) {
    const out = {} as T;
    for (const key in modeConfig) {
      if (Object.prototype.hasOwnProperty.call(modeConfig, key)) {
        (out as Record<string, unknown>)[key] = (modeConfig as Record<string, unknown>)[key];
      }
    }
    return out;
  }
}

export function applyCustomFourRateToModeConfig<T extends CustomSpawnModeConfigLike>(
  modeConfig: T,
  fourRate: number
): CustomSpawnModeConfigResolved & T {
  const parsedRate = sanitizeCustomFourRate(fourRate);
  if (parsedRate === null) {
    throw new Error("invalid_custom_four_rate");
  }

  const nextConfig = cloneModeConfig(modeConfig) as T & CustomSpawnModeConfigResolved;
  const twoRate = Math.round((100 - parsedRate) * 100) / 100;
  const spawnTable: Array<{ value: 2 | 4; weight: number }> = [];
  if (twoRate > 0) spawnTable.push({ value: 2, weight: twoRate });
  if (parsedRate > 0) spawnTable.push({ value: 4, weight: parsedRate });
  if (!spawnTable.length) spawnTable.push({ value: 2, weight: 100 });

  nextConfig.spawn_table = spawnTable;
  nextConfig.special_rules =
    nextConfig.special_rules && typeof nextConfig.special_rules === "object"
      ? nextConfig.special_rules
      : {};
  nextConfig.special_rules.custom_spawn_four_rate = parsedRate;
  nextConfig.label = String(modeConfig && modeConfig.label ? modeConfig.label : "模式") +
    "（4率 " + formatRatePercent(parsedRate) + "%）";

  return nextConfig;
}
