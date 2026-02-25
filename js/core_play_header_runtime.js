(function (global) {
  "use strict";

  if (!global) return;

  function compactPlayModeLabel(modeConfig) {
    var raw =
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

  function resolvePlayRulesText(ruleset) {
    return ruleset === "fibonacci" ? "Fib" : "2幂";
  }

  function buildPlayModeIntroText(modeConfig) {
    var modeText = compactPlayModeLabel(modeConfig);
    var boardText = String(String(modeConfig && modeConfig.board_width) + "x" + String(modeConfig && modeConfig.board_height));
    var rulesText = resolvePlayRulesText(modeConfig && modeConfig.ruleset);
    return modeText + "｜" + boardText + "｜" + rulesText;
  }

  function resolvePlayHeaderState(modeConfig) {
    return {
      bodyModeId: String((modeConfig && modeConfig.key) || ""),
      bodyRuleset: String((modeConfig && modeConfig.ruleset) || ""),
      titleText: String((modeConfig && modeConfig.label) || ""),
      introText: buildPlayModeIntroText(modeConfig),
      titleDisplay: "",
      introDisplay: ""
    };
  }

  global.CorePlayHeaderRuntime = global.CorePlayHeaderRuntime || {};
  global.CorePlayHeaderRuntime.compactPlayModeLabel = compactPlayModeLabel;
  global.CorePlayHeaderRuntime.resolvePlayRulesText = resolvePlayRulesText;
  global.CorePlayHeaderRuntime.buildPlayModeIntroText = buildPlayModeIntroText;
  global.CorePlayHeaderRuntime.resolvePlayHeaderState = resolvePlayHeaderState;
})(typeof window !== "undefined" ? window : undefined);
