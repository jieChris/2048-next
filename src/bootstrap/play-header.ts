export interface PlayHeaderModeConfigLike {
  key?: string | null | undefined;
  label?: string | null | undefined;
  board_width?: number | null | undefined;
  board_height?: number | null | undefined;
  max_tile?: number | null | undefined;
  undo_enabled?: boolean | null | undefined;
  ruleset?: string | null | undefined;
  special_rules?: Record<string, unknown> | null | undefined;
}

export interface PlayHeaderState {
  bodyModeId: string;
  bodyRuleset: string;
  titleText: string;
  introText: string;
  titleDisplay: "" | "none";
  introDisplay: "" | "none";
}

function resolvePlayHeaderLang(): "zh" | "en" {
  const globalLike = globalThis as {
    localStorage?: { getItem?: (key: string) => string | null } | null | undefined;
    UII18N?: { getLanguage?: () => string } | null | undefined;
  };
  let lang = String(globalLike.UII18N?.getLanguage?.() || "").trim().toLowerCase();
  if (!lang.startsWith("en") && !lang.startsWith("zh")) {
    try {
      lang = String(globalLike.localStorage?.getItem?.("ui_language_v1") || "").trim().toLowerCase();
    } catch (_err) {}
  }
  return lang.indexOf("en") === 0 ? "en" : "zh";
}

function localizeFallbackModeLabel(raw: string, lang: "zh" | "en"): string {
  if (lang === "en") {
    return String(raw)
      .replace(/斐波那契/gu, "Fibonacci")
      .replace(/标准版/gu, "Standard")
      .replace(/经典版/gu, "Classic")
      .replace(/封顶版|封顶/gu, "Capped")
      .replace(/练习板/gu, "Practice Board")
      .replace(/无撤回/gu, "No Undo")
      .replace(/可撤回/gu, "Undo")
      .replace(/自定义4率/gu, "Custom 4-Rate")
      .replace(/概率/gu, "Spawn")
      .replace(/限次撤回/gu, "Limited Undo")
      .replace(/连击加分/gu, "Combo Scoring")
      .replace(/方向锁/gu, "Direction Lock")
      .replace(/障碍块/gu, "Obstacle Blocks")
      .replace(/道具模式/gu, "Item Mode")
      .replace(/石头模式/gu, "Stone Mode")
      .replace(/限时模式/gu, "Timed")
      .replace(/（/gu, " (")
      .replace(/）/gu, ")")
      .replace(/，/gu, ", ")
      .replace(/次/gu, " Uses")
      .replace(/\s+/g, " ")
      .trim();
  }
  return String(raw)
    .replace(/Diagonal/gi, "斜向")
    .replace(/Fibonacci/gi, "斐波那契")
    .replace(/Standard/gi, "标准版")
    .replace(/Classic/gi, "经典版")
    .replace(/Capped/gi, "封顶版")
    .replace(/Practice Board/gi, "练习板")
    .replace(/No Undo/gi, "无撤回")
    .replace(/\bUndo\b/gi, "可撤回");
}

function resolvePlayModeTitle(modeConfig: PlayHeaderModeConfigLike | null | undefined): string {
  const key = String(modeConfig?.key || "").trim();
  const lang = resolvePlayHeaderLang();
  const configuredLabel = String(modeConfig?.label || "").trim();
  if (configuredLabel) return localizeFallbackModeLabel(configuredLabel, lang);
  const globalLike = globalThis as {
    ModeCatalog?: { getMode?: (modeKey: string) => { label?: string } | null | undefined } | null | undefined;
  };
  if (key && globalLike.ModeCatalog && typeof globalLike.ModeCatalog.getMode === "function") {
    const mode = globalLike.ModeCatalog.getMode(key);
    if (mode && typeof mode.label === "string" && mode.label) return localizeFallbackModeLabel(mode.label, lang);
  }
  return localizeFallbackModeLabel(String(modeConfig?.label || ""), lang);
}

function resolvePlayBoardSizeText(modeConfig: PlayHeaderModeConfigLike | null | undefined): string {
  const widthRaw = Number(modeConfig?.board_width);
  const heightRaw = Number(modeConfig?.board_height);
  const width = Number.isFinite(widthRaw) && widthRaw > 0 ? Math.floor(widthRaw) : 4;
  const height = Number.isFinite(heightRaw) && heightRaw > 0 ? Math.floor(heightRaw) : width;
  return String(width) + "x" + String(height);
}

function resolveNoXTargetFromModeConfig(
  modeConfig: PlayHeaderModeConfigLike | null | undefined
): number | null {
  const specialRules = modeConfig?.special_rules;
  if (!specialRules || typeof specialRules !== "object") return null;
  const rawTarget = (specialRules as Record<string, unknown>).no_x_target;
  const target = Number(rawTarget);
  if (!Number.isInteger(target) || target < 64) return null;
  return target;
}

function formatNoXTargetLabel(target: number): string {
  if (target < 1024) return String(target);
  if (target % 1024 === 0) return String(Math.round(target / 1024)).toUpperCase() + "K";
  return String(target);
}

function resolveNoXDisplayLabel(
  modeConfig: PlayHeaderModeConfigLike | null | undefined
): string | null {
  const key = String(modeConfig?.key || "").trim().toLowerCase();
  const specialRules = modeConfig?.special_rules;
  const isNoXMode =
    key.indexOf("nox_") >= 0 ||
    key.indexOf("no_x") >= 0 ||
    !!(
      specialRules &&
      typeof specialRules === "object" &&
      (specialRules as Record<string, unknown>).no_x_enabled === true
    );
  if (!isNoXMode) return null;
  const target = resolveNoXTargetFromModeConfig(modeConfig);
  if (target === null) return "NO-X";
  return "NO-" + formatNoXTargetLabel(target);
}

function resolvePlayModeUndoState(
  modeConfig: PlayHeaderModeConfigLike | null | undefined
): "undo" | "no_undo" | null {
  const undoEnabled = modeConfig?.undo_enabled;
  if (typeof undoEnabled === "boolean") return undoEnabled ? "undo" : "no_undo";

  const key = String(modeConfig?.key || "").trim().toLowerCase();
  if (key.indexOf("_no_undo") >= 0) return "no_undo";
  if (key.indexOf("_undo") >= 0) return "undo";

  const label = String(modeConfig?.label || "");
  if (/可撤回|\(Undo\)/i.test(label)) return "undo";
  if (/无撤回|\(No Undo\)/i.test(label)) return "no_undo";
  return null;
}

function appendUndoSuffix(base: string, lang: "zh" | "en", undoState: "undo" | "no_undo" | null): string {
  if (undoState === "undo") return base + (lang === "en" ? " (Undo)" : "（可撤回）");
  return base;
}

function resolvePlayModeBoardTitle(modeConfig: PlayHeaderModeConfigLike | null | undefined): string {
  const lang = resolvePlayHeaderLang();
  const key = String(modeConfig?.key || "").trim().toLowerCase();
  const sizeText = resolvePlayBoardSizeText(modeConfig);
  const undoState = resolvePlayModeUndoState(modeConfig);
  const noXLabel = resolveNoXDisplayLabel(modeConfig);
  if (noXLabel) return noXLabel;
  const specialRules = modeConfig?.special_rules;
  const allowDiagonalMoves =
    !!specialRules &&
    typeof specialRules === "object" &&
    (specialRules as Record<string, unknown>).allow_diagonal_moves === true;

  if (key.indexOf("diag_") === 0 || allowDiagonalMoves) {
    return appendUndoSuffix(lang === "en" ? "Diagonal " + sizeText : "八方向" + sizeText, lang, undoState);
  }

  if (key.indexOf("fib_") === 0 || String(modeConfig?.ruleset || "").toLowerCase() === "fibonacci") {
    return appendUndoSuffix(lang === "en" ? "Fibonacci " + sizeText : "斐波那契" + sizeText, lang, undoState);
  }

  if (key.indexOf("capped_") === 0) {
    const maxTileRaw = Number(modeConfig?.max_tile);
    const maxTile = Number.isFinite(maxTileRaw) && maxTileRaw > 0 ? Math.floor(maxTileRaw) : null;
    const base = lang === "en"
      ? maxTile === null
        ? "Capped " + sizeText
        : "Capped " + sizeText + " (" + String(maxTile) + ")"
      : maxTile === null
        ? "封顶" + sizeText
        : "封顶" + sizeText + "（" + String(maxTile) + "）";
    return appendUndoSuffix(base, lang, undoState);
  }

  if (key.indexOf("spawn_custom_") === 0) {
    return appendUndoSuffix(lang === "en" ? "Custom 4-Rate " + sizeText : "自定义4率" + sizeText, lang, undoState);
  }

  if (key.indexOf("spawn95_") === 0 || key.indexOf("spawn80_") === 0 || key.indexOf("spawn50_") === 0) {
    return appendUndoSuffix(lang === "en" ? "Spawn Variant " + sizeText : "概率变种" + sizeText, lang, undoState);
  }

  if (key.indexOf("limit3_") === 0 || key.indexOf("limit5_") === 0) {
    return appendUndoSuffix(lang === "en" ? "Limited Undo " + sizeText : "限次撤回" + sizeText, lang, undoState);
  }

  if (key.indexOf("combo_") === 0) {
    return appendUndoSuffix(lang === "en" ? "Combo " + sizeText : "连击加分" + sizeText, lang, undoState);
  }

  if (key.indexOf("dirlock") === 0) {
    return appendUndoSuffix(lang === "en" ? "Direction Lock " + sizeText : "方向锁" + sizeText, lang, undoState);
  }

  if (key.indexOf("obstacle_") === 0) {
    return appendUndoSuffix(lang === "en" ? "Obstacle " + sizeText : "障碍块" + sizeText, lang, undoState);
  }

  if (key.indexOf("stone_") === 0) {
    return appendUndoSuffix(lang === "en" ? "Stone Mode " + sizeText : "石头模式" + sizeText, lang, undoState);
  }

  if (key.indexOf("item_") === 0) {
    return appendUndoSuffix(lang === "en" ? "Item Mode " + sizeText : "道具模式" + sizeText, lang, undoState);
  }

  if (key.indexOf("timed") === 0) {
    return appendUndoSuffix(lang === "en" ? "Timed " + sizeText : "限时模式" + sizeText, lang, undoState);
  }

  if (key === "practice") {
    return lang === "en" ? "Practice Board" : "练习板";
  }

  return appendUndoSuffix(sizeText, lang, undoState);
}

function formatPlayCustomFourRate(rate: number): string {
  return Number(rate).toFixed(2).replace(/\.?0+$/, "");
}

function resolvePlayCustomFourRate(modeConfig: PlayHeaderModeConfigLike | null | undefined): number | null {
  const specialRules = modeConfig?.special_rules;
  if (!specialRules || typeof specialRules !== "object") return null;
  const rawRate = (specialRules as Record<string, unknown>).custom_spawn_four_rate;
  const parsedRate = Number(rawRate);
  if (!Number.isFinite(parsedRate)) return null;
  if (parsedRate < 0 || parsedRate > 100) return null;
  return Math.round(parsedRate * 100) / 100;
}

function resolvePlayCustomFourRateSuffix(
  modeConfig: PlayHeaderModeConfigLike | null | undefined,
  lang: "zh" | "en"
): string {
  const customFourRate = resolvePlayCustomFourRate(modeConfig);
  if (customFourRate === null) return "";
  const rateText = formatPlayCustomFourRate(customFourRate);
  return lang === "en" ? "(4-Rate " + rateText + "%)" : "（4率" + rateText + "%）";
}

export function compactPlayModeLabel(modeConfig: PlayHeaderModeConfigLike | null | undefined): string {
  const noXLabel = resolveNoXDisplayLabel(modeConfig);
  if (noXLabel) return noXLabel;
  const lang = resolvePlayHeaderLang();
  const raw = resolvePlayModeTitle(modeConfig);

  let output = String(raw)
    .replace(/\(No Undo\)|\(Undo\)/gi, "")
    .replace(/\((?:无撤回|可撤回)\)/g, "")
    .replace(/（可撤回）|（无撤回）/g, "")
    .replace(/标准版/g, "标准")
    .replace(/经典版/g, "经典")
    .replace(/封顶版/g, "封顶")
    .replace(/（Legacy）/g, "")
    .replace(/\s+/g, "");
  if (lang === "en") {
    output = output.replace(/Fibonacci/gi, "Fib");
  }
  const hasCustomRateText = /(4率|4-Rate)\s*\d/i.test(output);
  if (!hasCustomRateText) {
    const suffix = resolvePlayCustomFourRateSuffix(modeConfig, lang);
    if (suffix) output += suffix;
  }
  return output;
}

export function resolvePlayRulesText(ruleset: string | null | undefined): string {
  const lang = resolvePlayHeaderLang();
  if (ruleset === "fibonacci") return "Fib";
  return lang === "en" ? "Pow2" : "2幂";
}

export function buildPlayModeIntroText(modeConfig: PlayHeaderModeConfigLike | null | undefined): string {
  const modeText = compactPlayModeLabel(modeConfig);
  const boardText = String(
    String(modeConfig?.board_width) + "x" + String(modeConfig?.board_height)
  );
  const rulesText = resolvePlayRulesText(modeConfig?.ruleset || "");
  return modeText + "｜" + boardText + "｜" + rulesText;
}

export function resolvePlayHeaderState(
  modeConfig: PlayHeaderModeConfigLike | null | undefined
): PlayHeaderState {
  const titleText = resolvePlayModeBoardTitle(modeConfig) || resolvePlayModeTitle(modeConfig);
  return {
    bodyModeId: String(modeConfig?.key || ""),
    bodyRuleset: String(modeConfig?.ruleset || ""),
    titleText,
    introText: buildPlayModeIntroText(modeConfig),
    titleDisplay: "",
    introDisplay: ""
  };
}
