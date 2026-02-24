import {
  applyCustomFourRateToModeConfig,
  formatRatePercent,
  inferFourRateFromSpawnTable,
  isCustomSpawnModeKey,
  sanitizeCustomFourRate,
  type CustomSpawnModeConfigLike,
  type CustomSpawnModeConfigResolved
} from "./custom-spawn";

export const PLAY_CUSTOM_FOUR_RATE_PARAM = "four_rate";
export const PLAY_CUSTOM_FOUR_RATE_STORAGE_KEY = "custom_spawn_4x4_four_rate_v1";

type SearchLike = string | URLSearchParams | null | undefined;

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

export interface ResolvePlayCustomSpawnModeConfigOptions<T extends CustomSpawnModeConfigLike> {
  modeKey: string | null | undefined;
  modeConfig: T | null | undefined;
  searchLike: SearchLike;
  pathname: string;
  hash?: string | null | undefined;
  readStoredRate: () => unknown;
  writeStoredRate: (rateText: string) => void;
  promptRate: (defaultValueText: string) => string | null;
  alertInvalidInput?: () => void;
  replaceUrl?: (nextUrl: string) => void;
  rateParamName?: string;
}

export interface ResolvePlayCustomSpawnModeConfigResult<T extends CustomSpawnModeConfigLike> {
  modeConfig: T | (T & CustomSpawnModeConfigResolved) | null;
  parsedFourRate: number | null;
  promptedRate: boolean;
}

export function promptCustomFourRate(
  defaultRate: number,
  promptRate: (defaultValueText: string) => string | null,
  alertInvalidInput?: () => void
): number | null {
  const defaultText = formatRatePercent(defaultRate);
  while (true) {
    const raw = promptRate(defaultText);
    if (raw === null) return null;
    const parsed = sanitizeCustomFourRate(raw);
    if (parsed !== null) return parsed;
    if (alertInvalidInput) alertInvalidInput();
  }
}

export function resolvePlayCustomSpawnModeConfig<T extends CustomSpawnModeConfigLike>(
  options: ResolvePlayCustomSpawnModeConfigOptions<T>
): ResolvePlayCustomSpawnModeConfigResult<T> {
  const modeKey = String(options.modeKey || "");
  const modeConfig = options.modeConfig || null;
  if (!modeConfig || !isCustomSpawnModeKey(modeKey)) {
    return {
      modeConfig,
      parsedFourRate: null,
      promptedRate: false
    };
  }

  const rateParamName = options.rateParamName || PLAY_CUSTOM_FOUR_RATE_PARAM;
  const params = toSearchParams(options.searchLike);
  let parsedRate = sanitizeCustomFourRate(params.get(rateParamName));
  let promptedRate = false;

  if (parsedRate === null) {
    let rememberedRate: number | null = null;
    try {
      rememberedRate = sanitizeCustomFourRate(options.readStoredRate());
    } catch (_err) {
      rememberedRate = null;
    }
    const defaultRate =
      rememberedRate !== null
        ? rememberedRate
        : inferFourRateFromSpawnTable(modeConfig.spawn_table || null);
    parsedRate = promptCustomFourRate(defaultRate, options.promptRate, options.alertInvalidInput);
    if (parsedRate === null) {
      return {
        modeConfig: null,
        parsedFourRate: null,
        promptedRate: true
      };
    }
    params.set("mode_key", modeKey);
    params.set(rateParamName, formatRatePercent(parsedRate));
    const nextUrl = options.pathname + "?" + params.toString() + String(options.hash || "");
    if (typeof options.replaceUrl === "function") {
      try {
        options.replaceUrl(nextUrl);
      } catch (_err) {}
    }
    promptedRate = true;
  }

  try {
    options.writeStoredRate(formatRatePercent(parsedRate));
  } catch (_err) {}

  try {
    const nextConfig = applyCustomFourRateToModeConfig(modeConfig, parsedRate);
    return {
      modeConfig: nextConfig,
      parsedFourRate: parsedRate,
      promptedRate
    };
  } catch (_err) {
    return {
      modeConfig: null,
      parsedFourRate: parsedRate,
      promptedRate
    };
  }
}
