export type PracticeRuleset = "pow2" | "fibonacci";

type SearchLike = string | URLSearchParams | null | undefined;

export interface PracticeModeConfigLike {
  key?: string | null | undefined;
  label?: string | null | undefined;
  board_width?: number | null | undefined;
  board_height?: number | null | undefined;
  max_tile?: number | null | undefined;
  ruleset?: string | null | undefined;
  mode_family?: string | null | undefined;
  special_rules?: Record<string, unknown> | null | undefined;
  spawn_table?: Array<{ value: number; weight: number }> | null | undefined;
  [key: string]: unknown;
}

function toSearchParams(searchLike: SearchLike): URLSearchParams {
  if (searchLike instanceof URLSearchParams) {
    return searchLike;
  }
  try {
    return new URLSearchParams(searchLike || "");
  } catch (_err) {
    return new URLSearchParams();
  }
}

export function parsePracticeRuleset(searchLike: SearchLike): PracticeRuleset {
  const params = toSearchParams(searchLike);
  const raw = params.get("practice_ruleset");
  return raw === "fibonacci" ? "fibonacci" : "pow2";
}

export function parsePracticeModeKey(searchLike: SearchLike): string {
  const params = toSearchParams(searchLike);
  const raw = params.get("practice_mode_key");
  const key = typeof raw === "string" ? raw.trim() : "";
  return key && key !== "practice" ? key : "";
}

export function buildPracticePlacementCycleValues(
  rulesetRaw: string | null | undefined,
  visibleValues: readonly number[]
): number[] {
  const values = Array.isArray(visibleValues) ? Array.from(visibleValues) : [];
  if (rulesetRaw === "fibonacci" || values.indexOf(0) === -1 || values.indexOf(1) !== -1) {
    return values;
  }
  values.splice(values.indexOf(0) + 1, 0, 1);
  return values;
}

function toPositiveInt(value: unknown, fallback: number): number {
  return Number.isInteger(value) && Number(value) > 0 ? Number(value) : fallback;
}

export function isPracticeBoardSizeAllowed(
  modeConfig: PracticeModeConfigLike | null | undefined
): boolean {
  if (!modeConfig || typeof modeConfig !== "object") return true;
  const width = toPositiveInt(modeConfig.board_width, 0);
  const height = toPositiveInt(modeConfig.board_height, 0);
  if (!width || !height) return true;
  return width < 6 || height < 6;
}

function cloneModeConfig<T extends PracticeModeConfigLike>(modeConfig: T): T {
  try {
    return JSON.parse(JSON.stringify(modeConfig)) as T;
  } catch (_err) {
    const out = {} as T;
    for (const key in modeConfig) {
      if (Object.prototype.hasOwnProperty.call(modeConfig, key)) {
        (out as Record<string, unknown>)[key] = modeConfig[key];
      }
    }
    return out;
  }
}

function resolvePracticeSpawnTable(
  sourceTable: Array<{ value: number; weight: number }> | null | undefined,
  ruleset: PracticeRuleset
): Array<{ value: number; weight: number }> {
  if (Array.isArray(sourceTable) && sourceTable.length > 0) {
    const cloned = cloneModeConfig(sourceTable as unknown as PracticeModeConfigLike) as unknown;
    if (Array.isArray(cloned)) {
      return cloned as Array<{ value: number; weight: number }>;
    }
  }
  return ruleset === "fibonacci"
    ? [{ value: 1, weight: 90 }, { value: 2, weight: 10 }]
    : [{ value: 2, weight: 90 }, { value: 4, weight: 10 }];
}

export function buildPracticeModeConfig<T extends PracticeModeConfigLike>(
  baseConfig: T,
  rulesetRaw: string | null | undefined
): T & {
  ruleset: PracticeRuleset;
  mode_family: PracticeRuleset;
  spawn_table: Array<{ value: 1 | 2 | 4; weight: number }>;
} {
  const ruleset: PracticeRuleset = rulesetRaw === "fibonacci" ? "fibonacci" : "pow2";
  const cfg = cloneModeConfig(baseConfig) as T & {
    ruleset: PracticeRuleset;
    mode_family: PracticeRuleset;
    spawn_table: Array<{ value: 1 | 2 | 4; weight: number }>;
  };

  cfg.ruleset = ruleset;
  cfg.mode_family = ruleset;
  cfg.spawn_table =
    ruleset === "fibonacci"
      ? [{ value: 1, weight: 90 }, { value: 2, weight: 10 }]
      : [{ value: 2, weight: 90 }, { value: 4, weight: 10 }];

  return cfg;
}

export function buildPracticeModeConfigFromSelection<T extends PracticeModeConfigLike>(
  baseConfig: T
): T & {
  key: "practice";
  label: "练习板（直通）";
  board_width: number;
  board_height: number;
  ruleset: PracticeRuleset;
  undo_enabled: true;
  spawn_table: Array<{ value: number; weight: number }>;
  ranked_bucket: "none";
  mode_family: string;
  rank_policy: "unranked";
  special_rules: Record<string, unknown>;
  max_tile?: number;
} {
  const source = cloneModeConfig(baseConfig);
  const ruleset: PracticeRuleset = source.ruleset === "fibonacci" ? "fibonacci" : "pow2";
  const boardWidth = toPositiveInt(source.board_width, 4);
  const boardHeight = toPositiveInt(source.board_height, boardWidth);
  const specialRules =
    source.special_rules && typeof source.special_rules === "object" && !Array.isArray(source.special_rules)
      ? (cloneModeConfig(source.special_rules as PracticeModeConfigLike) as Record<string, unknown>)
      : {};
  const cfg = source as T & {
    key: "practice";
    label: "练习板（直通）";
    board_width: number;
    board_height: number;
    ruleset: PracticeRuleset;
    undo_enabled: true;
    spawn_table: Array<{ value: number; weight: number }>;
    ranked_bucket: "none";
    mode_family: string;
    rank_policy: "unranked";
    special_rules: Record<string, unknown>;
    max_tile?: number;
  };

  cfg.key = "practice";
  cfg.label = "练习板（直通）";
  cfg.board_width = boardWidth;
  cfg.board_height = boardHeight;
  cfg.ruleset = ruleset;
  cfg.undo_enabled = true;
  cfg.spawn_table = resolvePracticeSpawnTable(source.spawn_table, ruleset);
  cfg.ranked_bucket = "none";
  cfg.mode_family =
    typeof source.mode_family === "string" && source.mode_family
      ? source.mode_family
      : (ruleset === "fibonacci" ? "fibonacci" : "pow2");
  cfg.rank_policy = "unranked";
  cfg.special_rules = specialRules;

  if (Number.isInteger(source.max_tile) && Number(source.max_tile) > 0) {
    cfg.max_tile = Number(source.max_tile);
    cfg.special_rules.enforce_max_tile = true;
  } else {
    delete cfg.max_tile;
  }

  return cfg;
}

export interface PracticeModeRuntime {
  parsePracticeRuleset: typeof parsePracticeRuleset;
  parsePracticeModeKey: typeof parsePracticeModeKey;
  buildPracticePlacementCycleValues: typeof buildPracticePlacementCycleValues;
  isPracticeBoardSizeAllowed: typeof isPracticeBoardSizeAllowed;
  buildPracticeModeConfig: typeof buildPracticeModeConfig;
  buildPracticeModeConfigFromSelection: typeof buildPracticeModeConfigFromSelection;
}

export interface PracticeModeRuntimeWindowLike {
  CorePracticeModeRuntime?: PracticeModeRuntime;
}

export interface PracticeModeRuntimeInstallOptions {
  windowLike?: PracticeModeRuntimeWindowLike | null | undefined;
}

export function createPracticeModeRuntime(): PracticeModeRuntime {
  return {
    parsePracticeRuleset,
    parsePracticeModeKey,
    buildPracticePlacementCycleValues,
    isPracticeBoardSizeAllowed,
    buildPracticeModeConfig,
    buildPracticeModeConfigFromSelection
  };
}

export function installPracticeModeRuntime(
  options: PracticeModeRuntimeInstallOptions = {}
): PracticeModeRuntime | null {
  const windowLike =
    options.windowLike ||
    (typeof window === "undefined" ? null : (window as unknown as PracticeModeRuntimeWindowLike));
  if (!windowLike) return null;
  if (!windowLike.CorePracticeModeRuntime) {
    windowLike.CorePracticeModeRuntime = createPracticeModeRuntime();
  }
  return windowLike.CorePracticeModeRuntime || null;
}
