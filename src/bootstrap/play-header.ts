export interface PlayHeaderModeConfigLike {
  key?: string | null | undefined;
  label?: string | null | undefined;
  board_width?: number | null | undefined;
  board_height?: number | null | undefined;
  ruleset?: string | null | undefined;
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
    UII18N?: { getLanguage?: () => string } | null | undefined;
  };
  const lang = String(globalLike.UII18N?.getLanguage?.() || "").trim().toLowerCase();
  return lang.indexOf("en") === 0 ? "en" : "zh";
}

function localizeFallbackModeLabel(raw: string, lang: "zh" | "en"): string {
  if (lang === "en") return raw;
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
  const globalLike = globalThis as {
    ModeCatalog?: { getMode?: (modeKey: string) => { label?: string } | null | undefined } | null | undefined;
  };
  if (key && globalLike.ModeCatalog && typeof globalLike.ModeCatalog.getMode === "function") {
    const mode = globalLike.ModeCatalog.getMode(key);
    if (mode && typeof mode.label === "string" && mode.label) return mode.label;
  }
  return localizeFallbackModeLabel(String(modeConfig?.label || ""), lang);
}

export function compactPlayModeLabel(modeConfig: PlayHeaderModeConfigLike | null | undefined): string {
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
  const titleText = resolvePlayModeTitle(modeConfig);
  return {
    bodyModeId: String(modeConfig?.key || ""),
    bodyRuleset: String(modeConfig?.ruleset || ""),
    titleText,
    introText: buildPlayModeIntroText(modeConfig),
    titleDisplay: "",
    introDisplay: ""
  };
}

