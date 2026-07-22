(function (global) {
  "use strict";

  if (!global) return;

  var DEFAULT_HOME_MODE_KEY = "standard_4x4_pow2_no_undo";

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

  function parsePracticeRuleset(searchLike) {
    try {
      var params = new URLSearchParams(searchLike || "");
      var raw = params.get("practice_ruleset");
      return raw === "fibonacci" ? "fibonacci" : "pow2";
    } catch (_err) {
      return "pow2";
    }
  }

  function parsePracticeModeKey(searchLike) {
    try {
      var params = new URLSearchParams(searchLike || "");
      var raw = params.get("practice_mode_key");
      var key = typeof raw === "string" ? raw.trim() : "";
      return key && key !== "practice" ? key : "";
    } catch (_err) {
      return "";
    }
  }

  function toPositiveInt(value, fallback) {
    return Number.isInteger(value) && Number(value) > 0 ? Number(value) : fallback;
  }

  function isPracticeBoardSizeAllowed(modeConfig) {
    var practiceRuntime = global.CorePracticeModeRuntime;
    if (
      practiceRuntime &&
      typeof practiceRuntime.isPracticeBoardSizeAllowed === "function"
    ) {
      return practiceRuntime.isPracticeBoardSizeAllowed(modeConfig || null);
    }
    if (!modeConfig || typeof modeConfig !== "object") return true;
    var width = toPositiveInt(modeConfig.board_width, 0);
    var height = toPositiveInt(modeConfig.board_height, 0);
    if (!width || !height) return true;
    return width < 6 || height < 6;
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
    var boardWidth = Number.isInteger(source.board_width) && Number(source.board_width) > 0
      ? Number(source.board_width)
      : 4;
    var boardHeight = Number.isInteger(source.board_height) && Number(source.board_height) > 0
      ? Number(source.board_height)
      : boardWidth;
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
    source.spawn_table =
      Array.isArray(source.spawn_table) && source.spawn_table.length > 0
        ? cloneModeConfig(source.spawn_table)
        : (ruleset === "fibonacci"
          ? [{ value: 1, weight: 90 }, { value: 2, weight: 10 }]
          : [{ value: 2, weight: 90 }, { value: 4, weight: 10 }]);
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

  function resolvePracticeSelectedMode(modeCatalog, searchLike) {
    if (!modeCatalog || typeof modeCatalog.getMode !== "function") return null;
    var practiceRuntime = global.CorePracticeModeRuntime;
    var key =
      practiceRuntime && typeof practiceRuntime.parsePracticeModeKey === "function"
        ? practiceRuntime.parsePracticeModeKey(searchLike)
        : parsePracticeModeKey(searchLike);
    if (!key) return null;
    var mode = modeCatalog.getMode(key) || null;
    return isPracticeBoardSizeAllowed(mode) ? mode : null;
  }

  function resolveCatalogModeWithDefault(catalog, modeKey, defaultModeKey) {
    var runtime = global.CoreModeCatalogRuntime;
    if (runtime && typeof runtime.resolveCatalogModeWithDefault === "function") {
      return runtime.resolveCatalogModeWithDefault(catalog, modeKey, defaultModeKey);
    }
    if (!catalog || typeof catalog.getMode !== "function") return null;
    var key = modeKey && String(modeKey).trim() ? String(modeKey).trim() : defaultModeKey;
    return catalog.getMode(key) || catalog.getMode(defaultModeKey) || null;
  }

  function resolveHomeModeKey(dataModeId, defaultModeKey) {
    var fallback = String(defaultModeKey || DEFAULT_HOME_MODE_KEY);
    var text = String(dataModeId || "").trim();
    return text || fallback;
  }

  function resolveHomeModeSelection(options) {
    var opts = options || {};
    var defaultModeKey = String(opts.defaultModeKey || DEFAULT_HOME_MODE_KEY);
    var modeKey = resolveHomeModeKey(opts.dataModeId, defaultModeKey);

    var modeConfig = resolveCatalogModeWithDefault(
      opts.modeCatalog || null,
      modeKey,
      defaultModeKey
    );

    if (modeKey === "practice" && modeConfig) {
      var practiceRuntime = global.CorePracticeModeRuntime;
      var selectedMode = resolvePracticeSelectedMode(opts.modeCatalog || null, opts.searchLike || "");
      if (selectedMode) {
        if (
          practiceRuntime &&
          typeof practiceRuntime.buildPracticeModeConfigFromSelection === "function"
        ) {
          modeConfig = practiceRuntime.buildPracticeModeConfigFromSelection(selectedMode);
        } else {
          modeConfig = buildPracticeModeConfigFromSelection(selectedMode);
        }
      } else if (
        practiceRuntime &&
        typeof practiceRuntime.parsePracticeRuleset === "function" &&
        typeof practiceRuntime.buildPracticeModeConfig === "function"
      ) {
        modeConfig = practiceRuntime.buildPracticeModeConfig(
          modeConfig,
          practiceRuntime.parsePracticeRuleset(opts.searchLike || "")
        );
      } else {
        modeConfig = buildPracticeModeConfig(
          modeConfig,
          parsePracticeRuleset(opts.searchLike || "")
        );
      }
    }

    return {
      modeKey: modeKey,
      modeConfig: modeConfig || null
    };
  }

  function resolveDataModeIdFromBody(bodyLike) {
    var body = bodyLike || null;
    if (!body || typeof body.getAttribute !== "function") return "";
    try {
      var value = body.getAttribute("data-mode-id");
      return typeof value === "string" ? value : "";
    } catch (_err) {
      return "";
    }
  }

  function resolveSearchFromLocation(locationLike) {
    var location = locationLike || null;
    if (!location) return "";
    try {
      return typeof location.search === "string" ? location.search : "";
    } catch (_err) {
      return "";
    }
  }

  function resolveHomeModeSelectionFromContext(options) {
    var opts = options || {};
    return resolveHomeModeSelection({
      dataModeId: resolveDataModeIdFromBody(opts.bodyLike),
      defaultModeKey: opts.defaultModeKey,
      searchLike: resolveSearchFromLocation(opts.locationLike),
      modeCatalog: opts.modeCatalog
    });
  }

  global.CoreHomeModeRuntime = global.CoreHomeModeRuntime || {};
  global.CoreHomeModeRuntime.DEFAULT_HOME_MODE_KEY = DEFAULT_HOME_MODE_KEY;
  global.CoreHomeModeRuntime.resolveHomeModeKey = resolveHomeModeKey;
  global.CoreHomeModeRuntime.resolveHomeModeSelection = resolveHomeModeSelection;
  global.CoreHomeModeRuntime.resolveHomeModeSelectionFromContext =
    resolveHomeModeSelectionFromContext;
})(typeof window !== "undefined" ? window : undefined);
