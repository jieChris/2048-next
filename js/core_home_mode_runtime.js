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

    if (modeKey === "practice_legacy" && modeConfig) {
      var practiceRuntime = global.CorePracticeModeRuntime;
      if (
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

  global.CoreHomeModeRuntime = global.CoreHomeModeRuntime || {};
  global.CoreHomeModeRuntime.DEFAULT_HOME_MODE_KEY = DEFAULT_HOME_MODE_KEY;
  global.CoreHomeModeRuntime.resolveHomeModeKey = resolveHomeModeKey;
  global.CoreHomeModeRuntime.resolveHomeModeSelection = resolveHomeModeSelection;
})(typeof window !== "undefined" ? window : undefined);
