(function (global) {
  "use strict";

  if (!global) return;

  function toSearchParams(searchLike) {
    if (searchLike && typeof searchLike.get === "function") {
      return searchLike;
    }
    try {
      return new URLSearchParams(searchLike || "");
    } catch (_err) {
      return new URLSearchParams();
    }
  }

  function parsePracticeRuleset(searchLike) {
    var params = toSearchParams(searchLike);
    var raw = params.get("practice_ruleset");
    return raw === "fibonacci" ? "fibonacci" : "pow2";
  }

  function parsePracticeModeKey(searchLike) {
    var params = toSearchParams(searchLike);
    var raw = params.get("practice_mode_key");
    var key = typeof raw === "string" ? raw.trim() : "";
    return key && key !== "practice" ? key : "";
  }

  function toPositiveInt(value, fallback) {
    return Number.isInteger(value) && Number(value) > 0 ? Number(value) : fallback;
  }

  function isPracticeBoardSizeAllowed(modeConfig) {
    if (!modeConfig || typeof modeConfig !== "object") return true;
    var width = toPositiveInt(modeConfig.board_width, 0);
    var height = toPositiveInt(modeConfig.board_height, 0);
    if (!width || !height) return true;
    return width < 6 || height < 6;
  }

  function cloneModeConfig(modeConfig) {
    try {
      return JSON.parse(JSON.stringify(modeConfig));
    } catch (_err) {
      var out = {};
      for (var key in modeConfig) {
        if (Object.prototype.hasOwnProperty.call(modeConfig, key)) {
          out[key] = modeConfig[key];
        }
      }
      return out;
    }
  }

  function resolvePracticeSpawnTable(sourceTable, ruleset) {
    if (Array.isArray(sourceTable) && sourceTable.length > 0) {
      return cloneModeConfig(sourceTable);
    }
    return ruleset === "fibonacci"
      ? [{ value: 1, weight: 90 }, { value: 2, weight: 10 }]
      : [{ value: 2, weight: 90 }, { value: 4, weight: 10 }];
  }

  function buildPracticeModeConfig(baseConfig, rulesetRaw) {
    var ruleset = rulesetRaw === "fibonacci" ? "fibonacci" : "pow2";
    var cfg = cloneModeConfig(baseConfig || {});

    cfg.ruleset = ruleset;
    cfg.mode_family = ruleset;
    cfg.spawn_table =
      ruleset === "fibonacci"
        ? [{ value: 1, weight: 90 }, { value: 2, weight: 10 }]
        : [{ value: 2, weight: 90 }, { value: 4, weight: 10 }];

    return cfg;
  }

  function buildPracticeModeConfigFromSelection(baseConfig) {
    var source = cloneModeConfig(baseConfig || {});
    var ruleset = source.ruleset === "fibonacci" ? "fibonacci" : "pow2";
    var boardWidth = toPositiveInt(source.board_width, 4);
    var boardHeight = toPositiveInt(source.board_height, boardWidth);
    var specialRules =
      source.special_rules && typeof source.special_rules === "object" && !Array.isArray(source.special_rules)
        ? cloneModeConfig(source.special_rules)
        : {};
    source.key = "practice";
    source.label = "练习板（直通）";
    source.board_width = boardWidth;
    source.board_height = boardHeight;
    source.ruleset = ruleset;
    source.undo_enabled = true;
    source.spawn_table = resolvePracticeSpawnTable(source.spawn_table, ruleset);
    source.ranked_bucket = "none";
    source.mode_family =
      typeof source.mode_family === "string" && source.mode_family
        ? source.mode_family
        : (ruleset === "fibonacci" ? "fibonacci" : "pow2");
    source.rank_policy = "unranked";
    source.special_rules = specialRules;
    if (Number.isInteger(source.max_tile) && Number(source.max_tile) > 0) {
      source.max_tile = Number(source.max_tile);
      source.special_rules.enforce_max_tile = true;
    } else {
      delete source.max_tile;
    }
    return source;
  }

  global.CorePracticeModeRuntime = global.CorePracticeModeRuntime || {};
  global.CorePracticeModeRuntime.parsePracticeRuleset = parsePracticeRuleset;
  global.CorePracticeModeRuntime.parsePracticeModeKey = parsePracticeModeKey;
  global.CorePracticeModeRuntime.isPracticeBoardSizeAllowed =
    isPracticeBoardSizeAllowed;
  global.CorePracticeModeRuntime.buildPracticeModeConfig = buildPracticeModeConfig;
  global.CorePracticeModeRuntime.buildPracticeModeConfigFromSelection =
    buildPracticeModeConfigFromSelection;
})(typeof window !== "undefined" ? window : undefined);
