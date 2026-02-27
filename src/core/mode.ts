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

export interface CappedModeStateInput {
  modeKey?: string | null;
  mode?: string | null;
  maxTile?: number | null;
}

export interface CappedTimerPlaceholderRowsInput {
  isCappedMode?: boolean | null;
  cappedTargetValue?: number | null;
  timerSlotIds?: number[] | null;
}

export interface CappedTimerPlaceholderSlotInput {
  repeatCount?: number | null;
  placeholderRowValues?: number[] | null;
}

export interface CappedRowVisibilityPlanInput {
  isCappedMode?: boolean | null;
  isProgressiveCapped64Mode?: boolean | null;
  cappedTargetValue?: number | null;
  timerSlotIds?: number[] | null;
}

export interface TimerRowVisibilityPlanItem {
  value: number;
  visible: boolean;
  keepSpace: boolean;
}

export interface ProgressiveCapped64UnlockInput {
  isProgressiveCapped64Mode?: boolean | null;
  value?: number | null;
  unlockedState?: PlainRecord | null;
}

export interface ProgressiveCapped64UnlockResult {
  nextUnlockedState: Record<string, boolean>;
  unlockedValue: number | null;
}

export interface UndoPolicyInput {
  mode?: string | null;
  modeConfig?: PlainRecord | null;
}

export interface UndoTogglePolicyInput extends UndoPolicyInput {
  hasGameStarted?: boolean | null;
}

export interface LegacyModeResolveInput {
  modeKey?: string | null;
  fallbackModeKey?: string | null;
  mode?: string | null;
  legacyModeByKey?: Record<string, string> | null;
}

export interface ModeCatalogAliasResolveInput {
  modeId?: string | null;
  defaultModeKey: string;
  legacyAliasToModeKey?: Record<string, string> | null;
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

function toModeId(mode: unknown): string {
  if (typeof mode !== "string") return "";
  const value = mode.trim().toLowerCase();
  return value || "";
}

export function isCappedModeState(input: CappedModeStateInput): boolean {
  const key = String(input.modeKey || input.mode || "");
  const maxTile = Number(input.maxTile);
  return key.indexOf("capped") !== -1 && Number.isFinite(maxTile) && maxTile > 0;
}

export function getCappedTargetValue(input: CappedModeStateInput): number | null {
  return isCappedModeState(input) ? Number(input.maxTile) : null;
}

export function isProgressiveCapped64Mode(_input?: CappedModeStateInput): boolean {
  return false;
}

export function resolveCappedTimerLegendFontSize(cappedTargetValue?: number | null): string {
  const cap = Number(cappedTargetValue);
  const resolvedCap = Number.isFinite(cap) && cap > 0 ? cap : 2048;
  if (resolvedCap >= 8192) return "13px";
  if (resolvedCap >= 1024) return "14px";
  if (resolvedCap >= 128) return "18px";
  return "22px";
}

export function resolveCappedPlaceholderRowValues(input: CappedTimerPlaceholderRowsInput): number[] {
  if (!input.isCappedMode) return [];
  const cap = Number(input.cappedTargetValue);
  if (!Number.isFinite(cap) || cap <= 0) return [];

  const timerSlotIds = Array.isArray(input.timerSlotIds) ? input.timerSlotIds : [];
  const values: number[] = [];
  for (let i = 0; i < timerSlotIds.length; i++) {
    const slotId = Number(timerSlotIds[i]);
    if (!Number.isInteger(slotId) || slotId <= 0) continue;
    if (slotId > cap) values.push(slotId);
  }
  return values;
}

export function resolveCappedPlaceholderSlotByRepeatCount(
  input: CappedTimerPlaceholderSlotInput
): number | null {
  const repeatCount = Number(input.repeatCount);
  if (!Number.isInteger(repeatCount) || repeatCount < 2) return null;

  const values = Array.isArray(input.placeholderRowValues) ? input.placeholderRowValues : [];
  const placeholderIndex = repeatCount - 2; // x2 => first placeholder row
  if (placeholderIndex < 0 || placeholderIndex >= values.length) return null;

  const slotId = Number(values[placeholderIndex]);
  if (!Number.isInteger(slotId) || slotId <= 0) return null;
  return slotId;
}

export function resolveCappedRowVisibilityPlan(
  input: CappedRowVisibilityPlanInput
): TimerRowVisibilityPlanItem[] {
  const timerSlotIds = Array.isArray(input.timerSlotIds) ? input.timerSlotIds : [];
  const values: number[] = [];
  for (let i = 0; i < timerSlotIds.length; i++) {
    const slotId = Number(timerSlotIds[i]);
    if (!Number.isInteger(slotId) || slotId <= 0) continue;
    values.push(slotId);
  }

  if (!input.isCappedMode) {
    return values.map((value) => ({ value, visible: true, keepSpace: false }));
  }

  if (input.isProgressiveCapped64Mode) {
    return values.map((value) => ({ value, visible: false, keepSpace: true }));
  }

  const cap = Number(input.cappedTargetValue);
  const resolvedCap = Number.isFinite(cap) ? cap : 0;
  return values.map((value) => ({
    value,
    visible: value <= resolvedCap,
    keepSpace: true
  }));
}

export function createProgressiveCapped64UnlockedState(
  unlockedState?: PlainRecord | null
): Record<string, boolean> {
  const base: Record<string, boolean> = { "16": false, "32": false, "64": false };
  if (!unlockedState || typeof unlockedState !== "object") return base;
  if (unlockedState["16"] === true) base["16"] = true;
  if (unlockedState["32"] === true) base["32"] = true;
  if (unlockedState["64"] === true) base["64"] = true;
  return base;
}

export function resolveProgressiveCapped64Unlock(
  input: ProgressiveCapped64UnlockInput
): ProgressiveCapped64UnlockResult {
  const nextUnlockedState = createProgressiveCapped64UnlockedState(input.unlockedState);
  if (!input.isProgressiveCapped64Mode) {
    return { nextUnlockedState, unlockedValue: null };
  }

  const value = Number(input.value);
  if (value !== 16 && value !== 32 && value !== 64) {
    return { nextUnlockedState, unlockedValue: null };
  }
  const key = String(value);
  if (nextUnlockedState[key]) {
    return { nextUnlockedState, unlockedValue: null };
  }
  nextUnlockedState[key] = true;
  return { nextUnlockedState, unlockedValue: value };
}

export function getForcedUndoSetting(input: UndoPolicyInput): boolean | null {
  const modeCfg = input.modeConfig || null;
  if (modeCfg && typeof modeCfg.undo_enabled === "boolean") {
    return modeCfg.undo_enabled;
  }

  const modeId = toModeId(input.mode);
  if (!modeId) return null;
  if (modeId === "capped" || modeId.indexOf("capped") !== -1) return false;
  if (modeId.indexOf("no_undo") !== -1 || modeId.indexOf("no-undo") !== -1) return false;
  if (modeId.indexOf("undo_only") !== -1 || modeId.indexOf("undo-only") !== -1) return true;
  return null;
}

export function isUndoAllowedByMode(input: UndoPolicyInput): boolean {
  return getForcedUndoSetting(input) !== false;
}

export function isUndoSettingFixedForMode(input: UndoPolicyInput): boolean {
  return getForcedUndoSetting(input) !== null;
}

export function canToggleUndoSetting(input: UndoTogglePolicyInput): boolean {
  if (!isUndoAllowedByMode(input)) return false;
  if (isUndoSettingFixedForMode(input)) return false;
  return !input.hasGameStarted;
}

export function isTimerLeaderboardAvailableByMode(_mode?: string | null): boolean {
  return true;
}

export function resolveLegacyModeFromModeKey(input: LegacyModeResolveInput): string {
  const key = input.modeKey || input.fallbackModeKey || input.mode || "";
  const legacyModeByKey = input.legacyModeByKey || null;
  if (legacyModeByKey && typeof legacyModeByKey[key] === "string") {
    return legacyModeByKey[key] || "classic";
  }
  if (key && key.indexOf("capped") !== -1) return "capped";
  if (key && key.indexOf("practice") !== -1) return "practice";
  return "classic";
}

export function resolveModeCatalogAlias(input: ModeCatalogAliasResolveInput): string {
  const id = input.modeId || input.defaultModeKey;
  const legacyAliasToModeKey = input.legacyAliasToModeKey || null;
  if (
    legacyAliasToModeKey &&
    Object.prototype.hasOwnProperty.call(legacyAliasToModeKey, id) &&
    typeof legacyAliasToModeKey[id] === "string" &&
    legacyAliasToModeKey[id]
  ) {
    return legacyAliasToModeKey[id];
  }
  return id;
}
