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

  function resolvePlayBoardSizeText(modeConfig) {
    var widthRaw = Number(modeConfig && modeConfig.board_width);
    var heightRaw = Number(modeConfig && modeConfig.board_height);
    var width = Number.isFinite(widthRaw) && widthRaw > 0 ? Math.floor(widthRaw) : 4;
    var height = Number.isFinite(heightRaw) && heightRaw > 0 ? Math.floor(heightRaw) : width;
    return String(width) + "x" + String(height);
  }

  function resolveNoXTargetFromModeConfig(modeConfig) {
    var specialRules = modeConfig && modeConfig.special_rules;
    if (!specialRules || typeof specialRules !== "object") return null;
    var rawTarget = specialRules.no_x_target;
    var target = Number(rawTarget);
    if (!Number.isInteger(target) || target < 64) return null;
    return target;
  }

  function formatNoXTargetLabel(target) {
    if (target < 1024) return String(target);
    if (target % 1024 === 0) return String(Math.round(target / 1024)).toUpperCase() + "K";
    return String(target);
  }

  function resolveNoXDisplayLabel(modeConfig) {
    var key = String((modeConfig && modeConfig.key) || "").trim().toLowerCase();
    var specialRules = modeConfig && modeConfig.special_rules;
    var isNoXMode =
      key.indexOf("nox_") >= 0 ||
      key.indexOf("no_x") >= 0 ||
      !!(
        specialRules &&
        typeof specialRules === "object" &&
        specialRules.no_x_enabled === true
      );
    if (!isNoXMode) return null;
    var target = resolveNoXTargetFromModeConfig(modeConfig);
    if (target === null) return "NO-X";
    return "NO-" + formatNoXTargetLabel(target);
  }

  function resolvePlayModeUndoState(modeConfig) {
    var undoEnabled = modeConfig && modeConfig.undo_enabled;
    if (typeof undoEnabled === "boolean") return undoEnabled ? "undo" : "no_undo";

    var key = String((modeConfig && modeConfig.key) || "").trim().toLowerCase();
    if (key.indexOf("_no_undo") >= 0) return "no_undo";
    if (key.indexOf("_undo") >= 0) return "undo";

    var label = String((modeConfig && modeConfig.label) || "");
    if (/可撤回|\(Undo\)/i.test(label)) return "undo";
    if (/无撤回|\(No Undo\)/i.test(label)) return "no_undo";
    return null;
  }

  function appendUndoSuffix(base, lang, undoState) {
    if (undoState === "undo") return base + (lang === "en" ? " (Undo)" : "（可撤回）");
    return base;
  }

  function resolvePlayModeBoardTitle(modeConfig) {
    var lang = resolvePlayHeaderLang();
    var key = String((modeConfig && modeConfig.key) || "").trim().toLowerCase();
    var sizeText = resolvePlayBoardSizeText(modeConfig);
    var undoState = resolvePlayModeUndoState(modeConfig);
    var noXLabel = resolveNoXDisplayLabel(modeConfig);
    if (noXLabel) return noXLabel;
    var specialRules = modeConfig && modeConfig.special_rules;
    var allowDiagonalMoves =
      !!specialRules &&
      typeof specialRules === "object" &&
      specialRules.allow_diagonal_moves === true;

    if (key.indexOf("diag_") === 0 || allowDiagonalMoves) {
      return appendUndoSuffix(lang === "en" ? "Diagonal " + sizeText : "八方向" + sizeText, lang, undoState);
    }

    if (key.indexOf("fib_") === 0 || String((modeConfig && modeConfig.ruleset) || "").toLowerCase() === "fibonacci") {
      return appendUndoSuffix(lang === "en" ? "Fibonacci " + sizeText : "斐波那契" + sizeText, lang, undoState);
    }

    if (key.indexOf("capped_") === 0) {
      var maxTileRaw = Number(modeConfig && modeConfig.max_tile);
      var maxTile = Number.isFinite(maxTileRaw) && maxTileRaw > 0 ? Math.floor(maxTileRaw) : null;
      var base = lang === "en"
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
    var noXLabel = resolveNoXDisplayLabel(modeConfig);
    if (noXLabel) return noXLabel;
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
    var titleText = resolvePlayModeBoardTitle(modeConfig) || resolvePlayModeTitle(modeConfig);
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
