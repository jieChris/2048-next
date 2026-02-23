export type PracticeRuleset = "pow2" | "fibonacci";

type SearchLike = string | URLSearchParams | null | undefined;

export interface PracticeModeConfigLike {
  ruleset?: string | null | undefined;
  mode_family?: string | null | undefined;
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
