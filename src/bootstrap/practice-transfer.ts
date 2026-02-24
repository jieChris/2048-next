type JsonLike = Record<string, unknown> | Array<unknown> | string | number | boolean | null;

export interface PracticeTransferManagerLike {
  width?: number | null | undefined;
  height?: number | null | undefined;
  modeConfig?: Record<string, unknown> | null | undefined;
}

export interface PracticeTransferOptions {
  gameModeConfig?: Record<string, unknown> | null | undefined;
  manager?: PracticeTransferManagerLike | null | undefined;
}

export interface PracticeTransferModeConfig {
  key: "practice_legacy";
  label: "练习板（直通）";
  board_width: number;
  board_height: number;
  ruleset: "pow2" | "fibonacci";
  undo_enabled: true;
  spawn_table: Array<{ value: number; weight: number }>;
  ranked_bucket: "none";
  mode_family: string;
  rank_policy: "unranked";
  special_rules: Record<string, unknown>;
  max_tile?: number;
}

export function cloneJsonSafe<T extends JsonLike>(value: T): T | null {
  try {
    return JSON.parse(JSON.stringify(value)) as T;
  } catch (_err) {
    return null;
  }
}

function toPositiveInt(value: unknown, fallback: number): number {
  return Number.isInteger(value) && Number(value) > 0 ? Number(value) : fallback;
}

export function buildPracticeModeConfigFromCurrent(
  options: PracticeTransferOptions
): PracticeTransferModeConfig {
  const manager = options.manager || null;
  const globalConfig = options.gameModeConfig;
  const cfg =
    globalConfig && typeof globalConfig === "object"
      ? globalConfig
      : manager && manager.modeConfig && typeof manager.modeConfig === "object"
        ? manager.modeConfig
        : {};

  const ruleset = cfg.ruleset === "fibonacci" ? "fibonacci" : "pow2";
  const width = toPositiveInt(cfg.board_width, toPositiveInt(manager?.width, 4));
  const height = toPositiveInt(cfg.board_height, toPositiveInt(manager?.height, width));
  const spawnTable =
    Array.isArray(cfg.spawn_table) && cfg.spawn_table.length > 0
      ? cloneJsonSafe(cfg.spawn_table)
      : ruleset === "fibonacci"
        ? [{ value: 1, weight: 90 }, { value: 2, weight: 10 }]
        : [{ value: 2, weight: 90 }, { value: 4, weight: 10 }];
  const modeConfig: PracticeTransferModeConfig = {
    key: "practice_legacy",
    label: "练习板（直通）",
    board_width: width,
    board_height: height,
    ruleset,
    undo_enabled: true,
    spawn_table: Array.isArray(spawnTable) ? spawnTable as Array<{ value: number; weight: number }> : [],
    ranked_bucket: "none",
    mode_family:
      typeof cfg.mode_family === "string" && cfg.mode_family
        ? cfg.mode_family
        : ruleset === "fibonacci"
          ? "fibonacci"
          : "pow2",
    rank_policy: "unranked",
    special_rules:
      (cloneJsonSafe(cfg.special_rules as JsonLike) as Record<string, unknown> | null) || {}
  };

  if (Number.isInteger(cfg.max_tile) && Number(cfg.max_tile) > 0) {
    modeConfig.max_tile = Number(cfg.max_tile);
  }
  return modeConfig;
}
