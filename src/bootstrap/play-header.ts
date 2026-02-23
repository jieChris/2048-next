export interface PlayHeaderModeConfigLike {
  key?: string | null | undefined;
  label?: string | null | undefined;
  board_width?: number | null | undefined;
  board_height?: number | null | undefined;
  ruleset?: string | null | undefined;
}

export function compactPlayModeLabel(modeConfig: PlayHeaderModeConfigLike | null | undefined): string {
  const raw =
    modeConfig && (modeConfig.label || modeConfig.key)
      ? (modeConfig.label || modeConfig.key)
      : "模式";

  return String(raw)
    .replace(/（可撤回）|（无撤回）/g, "")
    .replace(/标准版/g, "标准")
    .replace(/经典版/g, "经典")
    .replace(/封顶版/g, "封顶")
    .replace(/Fibonacci/gi, "Fib")
    .replace(/（Legacy）/g, "")
    .replace(/\s+/g, "");
}

export function resolvePlayRulesText(ruleset: string | null | undefined): string {
  return ruleset === "fibonacci" ? "Fib" : "2幂";
}

export function buildPlayModeIntroText(modeConfig: PlayHeaderModeConfigLike | null | undefined): string {
  const modeText = compactPlayModeLabel(modeConfig);
  const boardText = String(
    String(modeConfig?.board_width) + "x" + String(modeConfig?.board_height)
  );
  const rulesText = resolvePlayRulesText(modeConfig?.ruleset || "");
  return modeText + "｜" + boardText + "｜" + rulesText;
}
