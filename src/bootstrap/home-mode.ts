import { resolveCatalogModeWithDefault, type ModeCatalogLike } from "./mode-catalog";
import {
  buildPracticeModeConfig,
  parsePracticeRuleset,
  type PracticeModeConfigLike
} from "./practice-mode";

export const DEFAULT_HOME_MODE_KEY = "standard_4x4_pow2_no_undo";

type SearchLike = string | URLSearchParams | null | undefined;

export interface HomeModeSelectionOptions {
  dataModeId?: string | null | undefined;
  defaultModeKey?: string | null | undefined;
  searchLike?: SearchLike;
  modeCatalog?: ModeCatalogLike | null | undefined;
}

export interface HomeModeSelectionResult<T extends PracticeModeConfigLike> {
  modeKey: string;
  modeConfig: T | null;
}

export function resolveHomeModeKey(
  dataModeId: string | null | undefined,
  defaultModeKey: string = DEFAULT_HOME_MODE_KEY
): string {
  const text = String(dataModeId || "").trim();
  return text || defaultModeKey;
}

export function resolveHomeModeSelection<T extends PracticeModeConfigLike>(
  options: HomeModeSelectionOptions
): HomeModeSelectionResult<T> {
  const defaultModeKey = String(options.defaultModeKey || DEFAULT_HOME_MODE_KEY);
  const modeKey = resolveHomeModeKey(options.dataModeId, defaultModeKey);

  let modeConfig = resolveCatalogModeWithDefault(
    options.modeCatalog || null,
    modeKey,
    defaultModeKey
  ) as T | null;

  if (modeKey === "practice_legacy" && modeConfig) {
    modeConfig = buildPracticeModeConfig(
      modeConfig,
      parsePracticeRuleset(options.searchLike || "")
    ) as T;
  }

  return {
    modeKey,
    modeConfig
  };
}
