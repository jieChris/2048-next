import { getTheoreticalMaxTile, normalizeSpawnTable, type SpawnTableItem } from "./rules";

import type { Ruleset } from "./engine";

export type PlainRecord = Record<string, unknown>;

export interface ModeConfig extends PlainRecord {
  key: string;
  board_width: number;
  board_height: number;
  ruleset: Ruleset;
  special_rules: PlainRecord;
  undo_enabled: boolean;
  max_tile: number | null;
  spawn_table: SpawnTableItem[];
  ranked_bucket: string;
  mode_family: string;
  rank_policy: string;
}

export interface NormalizeModeConfigInput {
  modeKey?: string | null;
  rawConfig?: PlainRecord | null;
  defaultModeKey: string;
  defaultModeConfig: PlainRecord;
}

export function clonePlain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function safeClonePlain<T>(value: T, fallback: T): T {
  try {
    return clonePlain(value);
  } catch (_err) {
    return fallback;
  }
}

export function normalizeSpecialRules(rules: unknown): PlainRecord {
  if (!rules || typeof rules !== "object" || Array.isArray(rules)) return {};
  return safeClonePlain(rules as PlainRecord, {});
}

export function normalizeModeConfig(input: NormalizeModeConfigInput): ModeConfig {
  const fallbackBase = safeClonePlain(input.defaultModeConfig, {} as PlainRecord);
  const cfg = (
    input.rawConfig
      ? safeClonePlain(input.rawConfig, fallbackBase)
      : fallbackBase
  ) as ModeConfig;

  cfg.key = (cfg.key as unknown as string) || input.modeKey || input.defaultModeKey;
  cfg.board_width =
    Number.isInteger(cfg.board_width) && Number(cfg.board_width) > 0
      ? Number(cfg.board_width)
      : 4;
  cfg.board_height =
    Number.isInteger(cfg.board_height) && Number(cfg.board_height) > 0
      ? Number(cfg.board_height)
      : cfg.board_width;
  cfg.ruleset = cfg.ruleset === "fibonacci" ? "fibonacci" : "pow2";
  cfg.special_rules = normalizeSpecialRules(cfg.special_rules);
  cfg.undo_enabled = !!cfg.undo_enabled;

  const hasNumericMaxTile = Number.isInteger(cfg.max_tile) && Number(cfg.max_tile) > 0;
  const isCappedKey = typeof cfg.key === "string" && cfg.key.indexOf("capped") !== -1;
  const forceMaxTile = !!cfg.special_rules.enforce_max_tile;

  if (cfg.ruleset === "fibonacci") {
    cfg.max_tile = hasNumericMaxTile && (isCappedKey || forceMaxTile) ? Number(cfg.max_tile) : null;
  } else if (hasNumericMaxTile) {
    cfg.max_tile = Number(cfg.max_tile);
  } else {
    cfg.max_tile = getTheoreticalMaxTile(cfg.board_width, cfg.board_height, cfg.ruleset);
  }

  let customFourRate = Number(cfg.special_rules.custom_spawn_four_rate);
  if (cfg.ruleset === "pow2" && Number.isFinite(customFourRate)) {
    if (customFourRate < 0) customFourRate = 0;
    if (customFourRate > 100) customFourRate = 100;
    customFourRate = Math.round(customFourRate * 100) / 100;

    const twoRate = Math.round((100 - customFourRate) * 100) / 100;
    const strictTable: SpawnTableItem[] = [];
    if (twoRate > 0) strictTable.push({ value: 2, weight: twoRate });
    if (customFourRate > 0) strictTable.push({ value: 4, weight: customFourRate });
    if (!strictTable.length) strictTable.push({ value: 2, weight: 100 });

    cfg.spawn_table = strictTable;
    cfg.special_rules.custom_spawn_four_rate = customFourRate;
  } else {
    cfg.spawn_table = normalizeSpawnTable(cfg.spawn_table, cfg.ruleset);
  }

  cfg.ranked_bucket = (cfg.ranked_bucket as string) || "none";
  cfg.mode_family = (cfg.mode_family as string) || (cfg.ruleset === "fibonacci" ? "fibonacci" : "pow2");
  cfg.rank_policy = (cfg.rank_policy as string) || (cfg.ranked_bucket !== "none" ? "ranked" : "unranked");
  return cfg;
}
