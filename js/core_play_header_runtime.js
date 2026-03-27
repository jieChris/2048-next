(function (global) {
  "use strict";

  if (!global) return;

  function resolvePlayHeaderLang() {
    var globalLike = typeof global !== "undefined" ? global : null;
    var lang = "";
    try {
      lang = String(
        globalLike && globalLike.UII18N && typeof globalLike.UII18N.getLanguage === "function"
          ? globalLike.UII18N.getLanguage()
          : ""
      )
        .trim()
        .toLowerCase();
    } catch (_err) {}
    return lang.indexOf("en") === 0 ? "en" : "zh";
  }

  function localizeFallbackModeLabel(raw, lang) {
    if (lang === "en") return String(raw || "");
    return String(raw || "")
      .replace(/Diagonal/gi, "斜向")
      .replace(/Fibonacci/gi, "斐波那契")
      .replace(/Standard/gi, "标准版")
      .replace(/Classic/gi, "经典版")
      .replace(/Capped/gi, "封顶版")
      .replace(/Practice Board/gi, "练习板")
      .replace(/No Undo/gi, "无撤回")
      .replace(/\bUndo\b/gi, "可撤回");
  }

  function resolvePlayModeTitle(modeConfig) {
    var key = String((modeConfig && modeConfig.key) || "").trim();
    var lang = resolvePlayHeaderLang();
    var configuredLabel = String((modeConfig && modeConfig.label) || "").trim();
    if (configuredLabel) return localizeFallbackModeLabel(configuredLabel, lang);
    var modeCatalog =
      global && global.ModeCatalog && typeof global.ModeCatalog.getMode === "function"
        ? global.ModeCatalog
        : null;
    if (modeCatalog && key) {
      var mode = modeCatalog.getMode(key);
      if (mode && typeof mode.label === "string" && mode.label) return mode.label;
    }
    return localizeFallbackModeLabel((modeConfig && modeConfig.label) || "", lang);
  }

  function formatPlayCustomFourRate(rate) {
    return Number(rate).toFixed(2).replace(/\.?0+$/, "");
  }

  function resolvePlayCustomFourRate(modeConfig) {
    var specialRules = modeConfig && modeConfig.special_rules;
    if (!specialRules || typeof specialRules !== "object") return null;
    var rawRate = specialRules.custom_spawn_four_rate;
    var parsedRate = Number(rawRate);
    if (!Number.isFinite(parsedRate)) return null;
    if (parsedRate < 0 || parsedRate > 100) return null;
    return Math.round(parsedRate * 100) / 100;
  }

  function resolvePlayCustomFourRateSuffix(modeConfig, lang) {
    var customFourRate = resolvePlayCustomFourRate(modeConfig);
    if (customFourRate === null) return "";
    var rateText = formatPlayCustomFourRate(customFourRate);
    return lang === "en" ? "(4-Rate " + rateText + "%)" : "（4率" + rateText + "%）";
  }

  function compactPlayModeLabel(modeConfig) {
    var lang = resolvePlayHeaderLang();
    var raw = resolvePlayModeTitle(modeConfig);
    var output = String(raw)
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
    var hasCustomRateText = /(4率|4-Rate)\s*\d/i.test(output);
    if (!hasCustomRateText) {
      var suffix = resolvePlayCustomFourRateSuffix(modeConfig, lang);
      if (suffix) output += suffix;
    }
    return output;
  }

  function resolvePlayRulesText(ruleset) {
    var lang = resolvePlayHeaderLang();
    if (ruleset === "fibonacci") return "Fib";
    return lang === "en" ? "Pow2" : "2幂";
  }

  function buildPlayModeIntroText(modeConfig) {
    var modeText = compactPlayModeLabel(modeConfig);
    var boardText = String(
      String(modeConfig && modeConfig.board_width) + "x" + String(modeConfig && modeConfig.board_height)
    );
    var rulesText = resolvePlayRulesText(modeConfig && modeConfig.ruleset);
    return modeText + "｜" + boardText + "｜" + rulesText;
  }

  function resolvePlayHeaderState(modeConfig) {
    var titleText = resolvePlayModeTitle(modeConfig);
    return {
      bodyModeId: String((modeConfig && modeConfig.key) || ""),
      bodyRuleset: String((modeConfig && modeConfig.ruleset) || ""),
      titleText: titleText,
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
