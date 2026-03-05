import { resolveCatalogModeWithDefault, type ModeCatalogLike } from "./mode-catalog";
import {
  buildPracticeModeConfig,
  parsePracticeRuleset,
  type PracticeModeConfigLike
} from "./practice-mode";

export const DEFAULT_HOME_MODE_KEY = "standard_4x4_pow2_no_undo";

type SearchLike = string | URLSearchParams | null | undefined;

interface BodyLike {
  getAttribute?(name: string): string | null;
}

interface LocationLike {
  search?: string | null | undefined;
}

export interface HomeModeSelectionOptions {
  dataModeId?: string | null | undefined;
  defaultModeKey?: string | null | undefined;
  searchLike?: SearchLike;
  modeCatalog?: ModeCatalogLike | null | undefined;
}

export interface HomeModeSelectionFromContextOptions {
  bodyLike?: BodyLike | null | undefined;
  locationLike?: LocationLike | null | undefined;
  defaultModeKey?: string | null | undefined;
  modeCatalog?: ModeCatalogLike | null | undefined;
}

export interface HomeModeSelectionResult<T extends PracticeModeConfigLike> {
  modeKey: string;
  modeConfig: T | null;
}

function resolveDataModeIdFromBody(bodyLike: BodyLike | null | undefined): string {
  const body = bodyLike || null;
  if (!body || typeof body.getAttribute !== "function") return "";
  try {
    const value = body.getAttribute("data-mode-id");
    return typeof value === "string" ? value : "";
  } catch (_err) {
    return "";
  }
}

function resolveSearchFromLocation(locationLike: LocationLike | null | undefined): string {
  const location = locationLike || null;
  if (!location) return "";
  try {
    return typeof location.search === "string" ? location.search : "";
  } catch (_err) {
    return "";
  }
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

  if (modeKey === "practice" && modeConfig) {
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

export function resolveHomeModeSelectionFromContext<T extends PracticeModeConfigLike>(
  options: HomeModeSelectionFromContextOptions
): HomeModeSelectionResult<T> {
  const opts = options || {};
  return resolveHomeModeSelection<T>({
    dataModeId: resolveDataModeIdFromBody(opts.bodyLike),
    defaultModeKey: opts.defaultModeKey,
    searchLike: resolveSearchFromLocation(opts.locationLike),
    modeCatalog: opts.modeCatalog
  });
}
