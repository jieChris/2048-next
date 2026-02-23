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

  global.CorePracticeModeRuntime = global.CorePracticeModeRuntime || {};
  global.CorePracticeModeRuntime.parsePracticeRuleset = parsePracticeRuleset;
  global.CorePracticeModeRuntime.buildPracticeModeConfig = buildPracticeModeConfig;
})(typeof window !== "undefined" ? window : undefined);
