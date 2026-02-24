(function (global) {
  "use strict";

  if (!global) return;

  function cloneJsonSafe(value) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (_err) {
      return null;
    }
  }

  function toPositiveInt(value, fallback) {
    return Number.isInteger(value) && Number(value) > 0 ? Number(value) : fallback;
  }

  function buildPracticeModeConfigFromCurrent(options) {
    var opts = options || {};
    var manager = opts.manager || null;
    var globalConfig = opts.gameModeConfig;
    var cfg =
      globalConfig && typeof globalConfig === "object"
        ? globalConfig
        : manager && manager.modeConfig && typeof manager.modeConfig === "object"
          ? manager.modeConfig
          : {};

    var ruleset = cfg.ruleset === "fibonacci" ? "fibonacci" : "pow2";
    var width = toPositiveInt(cfg.board_width, toPositiveInt(manager && manager.width, 4));
    var height = toPositiveInt(cfg.board_height, toPositiveInt(manager && manager.height, width));
    var spawnTable =
      Array.isArray(cfg.spawn_table) && cfg.spawn_table.length > 0
        ? cloneJsonSafe(cfg.spawn_table)
        : ruleset === "fibonacci"
          ? [{ value: 1, weight: 90 }, { value: 2, weight: 10 }]
          : [{ value: 2, weight: 90 }, { value: 4, weight: 10 }];

    var modeConfig = {
      key: "practice_legacy",
      label: "练习板（直通）",
      board_width: width,
      board_height: height,
      ruleset: ruleset,
      undo_enabled: true,
      spawn_table: Array.isArray(spawnTable) ? spawnTable : [],
      ranked_bucket: "none",
      mode_family:
        typeof cfg.mode_family === "string" && cfg.mode_family
          ? cfg.mode_family
          : (ruleset === "fibonacci" ? "fibonacci" : "pow2"),
      rank_policy: "unranked",
      special_rules: cloneJsonSafe(cfg.special_rules) || {}
    };

    if (Number.isInteger(cfg.max_tile) && Number(cfg.max_tile) > 0) {
      modeConfig.max_tile = Number(cfg.max_tile);
    }
    return modeConfig;
  }

  global.CorePracticeTransferRuntime = global.CorePracticeTransferRuntime || {};
  global.CorePracticeTransferRuntime.cloneJsonSafe = cloneJsonSafe;
  global.CorePracticeTransferRuntime.buildPracticeModeConfigFromCurrent =
    buildPracticeModeConfigFromCurrent;
})(typeof window !== "undefined" ? window : undefined);
