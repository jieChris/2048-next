(function () {
  var MODES = [];

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function resolveUiLanguage() {
    var lang = "";
    try {
      if (global.UII18N && typeof global.UII18N.getLanguage === "function") {
        lang = String(global.UII18N.getLanguage() || "").trim().toLowerCase();
      }
    } catch (_err) {}
    if (lang.indexOf("en") === 0) return "en";
    if (lang.indexOf("zh") === 0) return "zh";

    try {
      var storage = global.localStorage;
      if (storage && typeof storage.getItem === "function") {
        lang = String(storage.getItem("ui_language_v1") || "").trim().toLowerCase();
        if (lang.indexOf("en") === 0) return "en";
        if (lang.indexOf("zh") === 0) return "zh";
      }
    } catch (_err2) {}

    try {
      var root = global.document && global.document.documentElement;
      if (root) {
        lang = String(root.getAttribute("data-ui-lang") || root.getAttribute("lang") || "")
          .trim()
          .toLowerCase();
        if (lang.indexOf("en") === 0) return "en";
      }
    } catch (_err3) {}

    return "zh";
  }

  function resolveModeSizeText(mode) {
    var width = Number(mode && mode.board_width);
    var height = Number(mode && mode.board_height);
    if (!Number.isFinite(width) || width <= 0) width = 4;
    if (!Number.isFinite(height) || height <= 0) height = width;
    return Math.floor(width) + "x" + Math.floor(height);
  }

  function resolveLocalizedModeLabel(mode, lang) {
    var key = String(mode && mode.key ? mode.key : "");
    var sizeText = resolveModeSizeText(mode);
    var isEn = lang === "en";

    if (key.indexOf("board_") === 0 && key.indexOf("_pow2") !== -1) {
      return sizeText;
    }

    if (key === "standard_4x4_pow2_no_undo") {
      return isEn ? "Standard 4x4 (No Undo)" : "标准版 4x4（无撤回）";
    }
    if (key === "classic_4x4_pow2_undo") {
      return isEn ? "Classic 4x4 (Undo)" : "经典版 4x4（可撤回）";
    }
    if (key === "capped_4x4_pow2_no_undo") {
      return isEn ? "Capped 4x4 (2048, No Undo)" : "4x4（2048，无撤回）";
    }
    if (key === "capped_4x4_pow2_1024_no_undo") {
      return isEn ? "Capped 4x4 (1024, No Undo)" : "封顶版 4x4（1024，无撤回）";
    }
    if (key === "capped_4x4_pow2_64_no_undo") {
      return isEn ? "Capped 4x4 (64, No Undo)" : "封顶版 4x4（64，无撤回）";
    }
    if (key === "capped_4x4_pow2_4096_no_undo") {
      return isEn ? "Capped 4x4 (4096, No Undo)" : "封顶版 4x4（4096，无撤回）";
    }
    if (key.indexOf("fib_") === 0) {
      return isEn ? "Fibonacci " + sizeText : "斐波那契 " + sizeText;
    }
    if (key === "spawn_custom_4x4_pow2") {
      return isEn ? "4x4 Custom 4 Spawn Rate" : "4x4 自定义4率";
    }
    if (key === "spawn95_4x4_pow2") {
      return isEn ? "4x4 Spawn 95/5" : "4x4 概率 95/5";
    }
    if (key === "spawn80_4x4_pow2") {
      return isEn ? "4x4 Spawn 80/20" : "4x4 概率 80/20";
    }
    if (key === "spawn50_3x3_pow2_no_undo") {
      return isEn ? "3x3 Spawn 50/50 (No Undo)" : "3x3 概率 50/50（无撤回）";
    }
    if (key === "limit3_4x4_pow2") {
      return isEn ? "Limited Undo 4x4 (3 Uses)" : "限次撤回 4x4（3次）";
    }
    if (key === "limit5_4x4_pow2") {
      return isEn ? "Limited Undo 4x4 (5 Uses)" : "限次撤回 4x4（5次）";
    }
    if (key === "combo_4x4_pow2") {
      return isEn ? "Combo Bonus 4x4" : "连击加分 4x4";
    }
    if (key === "dirlock5_4x4_pow2_no_undo") {
      return isEn ? "Direction Lock 4x4 (Lock 1 Direction Every 5 Moves)" : "方向锁 4x4（每5步锁1方向）";
    }
    if (key === "obstacle_4x4_pow2_no_undo") {
      return isEn ? "Obstacle 4x4 (No Undo)" : "障碍块 4x4（无撤回）";
    }
    if (key.indexOf("diag_") === 0) {
      return isEn ? "Diagonal " + sizeText : "斜向 " + sizeText;
    }
    if (key === "item_4x4_pow2_no_undo") {
      return isEn ? "Item Mode 4x4" : "道具模式 4x4";
    }
    if (key === "stone_4x4_pow2_no_undo") {
      return isEn ? "Stone Mode 4x4" : "石头模式 4x4";
    }
    if (key === "timed5s_4x4_pow2_no_undo") {
      return isEn ? "Timed 5s 4x4" : "限时 5 秒 4x4";
    }
    if (key === "practice") {
      return isEn ? "Practice Board (Direct)" : "练习板（直通）";
    }

    return String(mode && mode.label ? mode.label : "");
  }

  function getTheoreticalMaxTile(width, height, ruleset) {
    var w = Number(width);
    var h = Number(height);
    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null;
    var cells = Math.floor(w) * Math.floor(h);
    if (!Number.isInteger(cells) || cells <= 0) return null;

    if (ruleset === "fibonacci") {
      // Fibonacci board uses 1,2 starts; 4x4 theoretical top is 4181.
      var targetIndex = cells + 2;
      var a = 1;
      var b = 2;
      if (targetIndex <= 1) return 1;
      if (targetIndex === 2) return 2;
      for (var i = 3; i <= targetIndex; i++) {
        var next = a + b;
        a = b;
        b = next;
      }
      return b;
    }

    // Pow2 board theoretical top follows 2^(cells + 1). 4x4 => 131072.
    return Math.pow(2, cells + 1);
  }

  function createMode(options) {
    var ruleset = options.ruleset === "fibonacci" ? "fibonacci" : "pow2";
    var explicitMaxTile = Number.isInteger(options.max_tile) && options.max_tile > 0
      ? options.max_tile
      : null;
    var isCappedKey = typeof options.key === "string" && options.key.indexOf("capped") !== -1;
    var specialRules = clone(options.special_rules || {});
    var forceMaxTile = !!(specialRules && specialRules.enforce_max_tile);
    var defaultMaxTile = (isCappedKey || forceMaxTile) ? explicitMaxTile : null;
    return {
      key: options.key,
      label: options.label,
      board_width: options.board_width,
      board_height: options.board_height,
      ruleset: ruleset,
      undo_enabled: !!options.undo_enabled,
      max_tile: defaultMaxTile,
      spawn_table: clone(options.spawn_table || (ruleset === "fibonacci"
        ? [{ value: 1, weight: 90 }, { value: 2, weight: 10 }]
        : [{ value: 2, weight: 90 }, { value: 4, weight: 10 }])),
      ranked_bucket: options.ranked_bucket || "none",
      mode_family: options.mode_family || (ruleset === "fibonacci" ? "fibonacci" : "pow2"),
      special_rules: specialRules,
      rank_policy: options.rank_policy || (options.ranked_bucket && options.ranked_bucket !== "none" ? "ranked" : "unranked")
    };
  }

  function add(mode) {
    MODES.push(createMode(mode));
  }

  function addPair(base) {
    add({
      key: base.key + "_undo",
      label: base.label + "（可撤回）",
      board_width: base.board_width,
      board_height: base.board_height,
      ruleset: base.ruleset,
      undo_enabled: true,
      max_tile: base.max_tile,
      spawn_table: base.spawn_table,
      ranked_bucket: base.ranked_bucket || "none",
      mode_family: base.mode_family,
      special_rules: base.special_rules,
      rank_policy: base.rank_policy
    });
    add({
      key: base.key + "_no_undo",
      label: base.label + "（无撤回）",
      board_width: base.board_width,
      board_height: base.board_height,
      ruleset: base.ruleset,
      undo_enabled: false,
      max_tile: base.max_tile,
      spawn_table: base.spawn_table,
      ranked_bucket: base.ranked_bucket || "none",
      mode_family: base.mode_family,
      special_rules: base.special_rules,
      rank_policy: base.rank_policy
    });
  }

  add({
    key: "standard_4x4_pow2_no_undo",
    label: "标准版 4x4（无撤回）",
    board_width: 4,
    board_height: 4,
    ruleset: "pow2",
    undo_enabled: false,
    max_tile: null,
    spawn_table: [{ value: 2, weight: 90 }, { value: 4, weight: 10 }],
    ranked_bucket: "standard",
    mode_family: "pow2",
    rank_policy: "ranked"
  });

  add({
    key: "classic_4x4_pow2_undo",
    label: "经典版 4x4（可撤回）",
    board_width: 4,
    board_height: 4,
    ruleset: "pow2",
    undo_enabled: true,
    max_tile: null,
    spawn_table: [{ value: 2, weight: 90 }, { value: 4, weight: 10 }],
    ranked_bucket: "classic_undo",
    mode_family: "pow2",
    rank_policy: "ranked"
  });

  add({
    key: "capped_4x4_pow2_no_undo",
    label: "4x4（2048，无撤回）",
    board_width: 4,
    board_height: 4,
    ruleset: "pow2",
    undo_enabled: false,
    max_tile: 2048,
    spawn_table: [{ value: 2, weight: 90 }, { value: 4, weight: 10 }],
    ranked_bucket: "capped",
    mode_family: "pow2",
    rank_policy: "ranked"
  });

  addPair({
    key: "board_3x3_pow2",
    label: "3x3",
    board_width: 3,
    board_height: 3,
    ruleset: "pow2",
    spawn_table: [{ value: 2, weight: 90 }, { value: 4, weight: 10 }],
    mode_family: "pow2",
    rank_policy: "unranked"
  });

  // Keep existing keys for compatibility (3x4 key means board 4x3).
  addPair({
    key: "board_3x4_pow2",
    label: "4x3",
    board_width: 4,
    board_height: 3,
    ruleset: "pow2",
    spawn_table: [{ value: 2, weight: 90 }, { value: 4, weight: 10 }],
    mode_family: "pow2",
    rank_policy: "unranked"
  });

  // Keep existing keys for compatibility (2x4 key means board 4x2).
  addPair({
    key: "board_2x4_pow2",
    label: "4x2",
    board_width: 4,
    board_height: 2,
    ruleset: "pow2",
    spawn_table: [{ value: 2, weight: 90 }, { value: 4, weight: 10 }],
    mode_family: "pow2",
    rank_policy: "unranked"
  });

  addPair({
    key: "fib_4x4",
    label: "Fibonacci 4x4",
    board_width: 4,
    board_height: 4,
    ruleset: "fibonacci",
    spawn_table: [{ value: 1, weight: 90 }, { value: 2, weight: 10 }],
    mode_family: "fibonacci",
    rank_policy: "unranked"
  });

  addPair({
    key: "fib_3x3",
    label: "Fibonacci 3x3",
    board_width: 3,
    board_height: 3,
    ruleset: "fibonacci",
    spawn_table: [{ value: 1, weight: 90 }, { value: 2, weight: 10 }],
    mode_family: "fibonacci",
    rank_policy: "unranked"
  });

  // Phase 1: size ladder 5x5..10x10 (pow2)
  for (var size = 5; size <= 10; size++) {
    addPair({
      key: "board_" + size + "x" + size + "_pow2",
      label: size + "x" + size,
      board_width: size,
      board_height: size,
      ruleset: "pow2",
      spawn_table: [{ value: 2, weight: 90 }, { value: 4, weight: 10 }],
      mode_family: "pow2",
      rank_policy: "unranked"
    });
  }

  // Phase 1: Fibonacci 4x3 / 4x2
  addPair({
    key: "fib_4x3",
    label: "Fibonacci 4x3",
    board_width: 4,
    board_height: 3,
    ruleset: "fibonacci",
    spawn_table: [{ value: 1, weight: 90 }, { value: 2, weight: 10 }],
    mode_family: "fibonacci",
    rank_policy: "unranked"
  });

  addPair({
    key: "fib_4x2",
    label: "Fibonacci 4x2",
    board_width: 4,
    board_height: 2,
    ruleset: "fibonacci",
    spawn_table: [{ value: 1, weight: 90 }, { value: 2, weight: 10 }],
    mode_family: "fibonacci",
    rank_policy: "unranked"
  });

  // Phase 1: extra capped variants
  add({
    key: "capped_4x4_pow2_1024_no_undo",
    label: "封顶版 4x4（1024，无撤回）",
    board_width: 4,
    board_height: 4,
    ruleset: "pow2",
    undo_enabled: false,
    max_tile: 1024,
    spawn_table: [{ value: 2, weight: 90 }, { value: 4, weight: 10 }],
    ranked_bucket: "none",
    mode_family: "pow2",
    rank_policy: "unranked"
  });

  add({
    key: "capped_4x4_pow2_64_no_undo",
    label: "封顶版 4x4（64，无撤回）",
    board_width: 4,
    board_height: 4,
    ruleset: "pow2",
    undo_enabled: false,
    max_tile: 64,
    spawn_table: [{ value: 2, weight: 90 }, { value: 4, weight: 10 }],
    ranked_bucket: "none",
    mode_family: "pow2",
    rank_policy: "unranked"
  });

  add({
    key: "capped_4x4_pow2_4096_no_undo",
    label: "封顶版 4x4（4096，无撤回）",
    board_width: 4,
    board_height: 4,
    ruleset: "pow2",
    undo_enabled: false,
    max_tile: 4096,
    spawn_table: [{ value: 2, weight: 90 }, { value: 4, weight: 10 }],
    ranked_bucket: "none",
    mode_family: "pow2",
    rank_policy: "unranked"
  });

  addPair({
    key: "spawn_custom_4x4_pow2",
    label: "4x4 自定义4率",
    board_width: 4,
    board_height: 4,
    ruleset: "pow2",
    spawn_table: [{ value: 2, weight: 90 }, { value: 4, weight: 10 }],
    mode_family: "pow2",
    rank_policy: "unranked"
  });

  // Phase 1: spawn probabilities
  addPair({
    key: "spawn95_4x4_pow2",
    label: "4x4 概率 95/5",
    board_width: 4,
    board_height: 4,
    ruleset: "pow2",
    spawn_table: [{ value: 2, weight: 95 }, { value: 4, weight: 5 }],
    mode_family: "pow2",
    rank_policy: "unranked"
  });

  addPair({
    key: "spawn80_4x4_pow2",
    label: "4x4 概率 80/20",
    board_width: 4,
    board_height: 4,
    ruleset: "pow2",
    spawn_table: [{ value: 2, weight: 80 }, { value: 4, weight: 20 }],
    mode_family: "pow2",
    rank_policy: "unranked"
  });

  add({
    key: "spawn50_3x3_pow2_no_undo",
    label: "3x3 概率 50/50（无撤回）",
    board_width: 3,
    board_height: 3,
    ruleset: "pow2",
    undo_enabled: false,
    spawn_table: [{ value: 2, weight: 50 }, { value: 4, weight: 50 }],
    ranked_bucket: "none",
    mode_family: "pow2",
    rank_policy: "unranked"
  });

  // Phase 2: lightweight rule variants
  addPair({
    key: "limit3_4x4_pow2",
    label: "限次撤回 4x4（3次）",
    board_width: 4,
    board_height: 4,
    ruleset: "pow2",
    spawn_table: [{ value: 2, weight: 90 }, { value: 4, weight: 10 }],
    ranked_bucket: "none",
    mode_family: "pow2",
    special_rules: { undo_limit: 3 },
    rank_policy: "unranked"
  });

  addPair({
    key: "limit5_4x4_pow2",
    label: "限次撤回 4x4（5次）",
    board_width: 4,
    board_height: 4,
    ruleset: "pow2",
    spawn_table: [{ value: 2, weight: 90 }, { value: 4, weight: 10 }],
    ranked_bucket: "none",
    mode_family: "pow2",
    special_rules: { undo_limit: 5 },
    rank_policy: "unranked"
  });

  addPair({
    key: "combo_4x4_pow2",
    label: "连击加分 4x4",
    board_width: 4,
    board_height: 4,
    ruleset: "pow2",
    spawn_table: [{ value: 2, weight: 90 }, { value: 4, weight: 10 }],
    ranked_bucket: "none",
    mode_family: "combo",
    special_rules: { combo_multiplier: 1.25 },
    rank_policy: "unranked"
  });

  add({
    key: "dirlock5_4x4_pow2_no_undo",
    label: "方向锁 4x4（每5步锁1方向）",
    board_width: 4,
    board_height: 4,
    ruleset: "pow2",
    undo_enabled: false,
    spawn_table: [{ value: 2, weight: 90 }, { value: 4, weight: 10 }],
    ranked_bucket: "none",
    mode_family: "pow2",
    special_rules: { direction_lock: { every_k_moves: 5 } },
    rank_policy: "unranked"
  });

  add({
    key: "obstacle_4x4_pow2_no_undo",
    label: "障碍块 4x4（无撤回）",
    board_width: 4,
    board_height: 4,
    ruleset: "pow2",
    undo_enabled: false,
    spawn_table: [{ value: 2, weight: 90 }, { value: 4, weight: 10 }],
    ranked_bucket: "none",
    mode_family: "obstacle",
    special_rules: { blocked_cells: [[1, 1], [2, 2]] },
    rank_policy: "unranked"
  });

  add({
    key: "diag_3x3_pow2_no_undo",
    label: "Diagonal 3x3",
    board_width: 3,
    board_height: 3,
    ruleset: "pow2",
    undo_enabled: false,
    spawn_table: [{ value: 2, weight: 90 }, { value: 4, weight: 10 }],
    ranked_bucket: "none",
    mode_family: "pow2",
    special_rules: { allow_diagonal_moves: true },
    rank_policy: "unranked"
  });

  add({
    key: "diag_4x4_pow2_no_undo",
    label: "Diagonal 4x4",
    board_width: 4,
    board_height: 4,
    ruleset: "pow2",
    undo_enabled: false,
    spawn_table: [{ value: 2, weight: 90 }, { value: 4, weight: 10 }],
    ranked_bucket: "none",
    mode_family: "pow2",
    special_rules: { allow_diagonal_moves: true },
    rank_policy: "unranked"
  });

  add({
    key: "diag_3x4_pow2_no_undo",
    label: "Diagonal 4x3",
    board_width: 4,
    board_height: 3,
    ruleset: "pow2",
    undo_enabled: false,
    spawn_table: [{ value: 2, weight: 90 }, { value: 4, weight: 10 }],
    ranked_bucket: "none",
    mode_family: "pow2",
    special_rules: { allow_diagonal_moves: true },
    rank_policy: "unranked"
  });

  add({
    key: "diag_2x4_pow2_no_undo",
    label: "Diagonal 4x2",
    board_width: 4,
    board_height: 2,
    ruleset: "pow2",
    undo_enabled: false,
    spawn_table: [{ value: 2, weight: 90 }, { value: 4, weight: 10 }],
    ranked_bucket: "none",
    mode_family: "pow2",
    special_rules: { allow_diagonal_moves: true },
    rank_policy: "unranked"
  });

  add({
    key: "item_4x4_pow2_no_undo",
    label: "Item Mode 4x4",
    board_width: 4,
    board_height: 4,
    ruleset: "pow2",
    undo_enabled: false,
    spawn_table: [{ value: 2, weight: 90 }, { value: 4, weight: 10 }],
    ranked_bucket: "none",
    mode_family: "item",
    special_rules: { item_mode: { enabled: true, grant_every_moves: 6, max_per_item: 3 } },
    rank_policy: "unranked"
  });

  add({
    key: "stone_4x4_pow2_no_undo",
    label: "Stone Mode 4x4",
    board_width: 4,
    board_height: 4,
    ruleset: "pow2",
    undo_enabled: false,
    spawn_table: [{ value: 2, weight: 90 }, { value: 4, weight: 10 }],
    ranked_bucket: "none",
    mode_family: "stone",
    special_rules: { stone_tiles: [[1, 1], [2, 2]] },
    rank_policy: "unranked"
  });

  add({
    key: "timed5s_4x4_pow2_no_undo",
    label: "Timed 5s 4x4",
    board_width: 4,
    board_height: 4,
    ruleset: "pow2",
    undo_enabled: false,
    spawn_table: [{ value: 2, weight: 90 }, { value: 4, weight: 10 }],
    ranked_bucket: "none",
    mode_family: "timed",
    special_rules: { move_timeout_ms: 5000 },
    rank_policy: "unranked"
  });

  add({
    key: "practice",
    label: "练习板（直通）",
    board_width: 4,
    board_height: 4,
    ruleset: "pow2",
    undo_enabled: true,
    max_tile: null,
    spawn_table: [{ value: 2, weight: 90 }, { value: 4, weight: 10 }],
    ranked_bucket: "none",
    mode_family: "pow2",
    rank_policy: "unranked"
  });

  var INDEX = {};
  for (var i = 0; i < MODES.length; i++) {
    INDEX[MODES[i].key] = MODES[i];
  }

  function getMode(key) {
    if (!INDEX[key]) return null;
    var mode = clone(INDEX[key]);
    mode.label = resolveLocalizedModeLabel(mode, resolveUiLanguage());
    return mode;
  }

  function listModes() {
    var out = [];
    var lang = resolveUiLanguage();
    for (var i = 0; i < MODES.length; i++) {
      var mode = clone(MODES[i]);
      mode.label = resolveLocalizedModeLabel(mode, lang);
      out.push(mode);
    }
    return out;
  }

  var api = {
    getMode: getMode,
    listModes: listModes,
    MODES: MODES
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  if (typeof window !== "undefined") {
    window.ModeCatalog = api;
  }
})();
