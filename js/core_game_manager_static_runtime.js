function createGameManagerDefaultModeConfig() {
  return {
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
  special_rules: {},
  rank_policy: "ranked"
};
}

function createGameManagerFallbackModeConfigs(defaultModeConfig) {
  return {
  standard_4x4_pow2_no_undo: defaultModeConfig,
  classic_4x4_pow2_undo: {
    key: "classic_4x4_pow2_undo",
    label: "经典版 4x4（可撤回）",
    board_width: 4,
    board_height: 4,
    ruleset: "pow2",
    undo_enabled: true,
    max_tile: null,
    spawn_table: [{ value: 2, weight: 90 }, { value: 4, weight: 10 }],
    ranked_bucket: "classic_undo"
  },
  capped_4x4_pow2_no_undo: {
    key: "capped_4x4_pow2_no_undo",
    label: "4x4（2048，无撤回）",
    board_width: 4,
    board_height: 4,
    ruleset: "pow2",
    undo_enabled: false,
    max_tile: 2048,
    spawn_table: [{ value: 2, weight: 90 }, { value: 4, weight: 10 }],
    ranked_bucket: "capped"
  },
  capped_4x4_pow2_64_no_undo: {
    key: "capped_4x4_pow2_64_no_undo",
    label: "封顶版 4x4（64，无撤回）",
    board_width: 4,
    board_height: 4,
    ruleset: "pow2",
    undo_enabled: false,
    max_tile: 64,
    spawn_table: [{ value: 2, weight: 90 }, { value: 4, weight: 10 }],
    ranked_bucket: "none"
  },
  practice_legacy: {
    key: "practice_legacy",
    label: "练习板（Legacy）",
    board_width: 4,
    board_height: 4,
    ruleset: "pow2",
    undo_enabled: true,
    max_tile: null,
    spawn_table: [{ value: 2, weight: 90 }, { value: 4, weight: 10 }],
    ranked_bucket: "none"
  },
  board_3x3_pow2_undo: {
    key: "board_3x3_pow2_undo",
    label: "3x3（可撤回）",
    board_width: 3,
    board_height: 3,
    ruleset: "pow2",
    undo_enabled: true,
    max_tile: null,
    spawn_table: [{ value: 2, weight: 90 }, { value: 4, weight: 10 }],
    ranked_bucket: "none"
  },
  board_3x3_pow2_no_undo: {
    key: "board_3x3_pow2_no_undo",
    label: "3x3（无撤回）",
    board_width: 3,
    board_height: 3,
    ruleset: "pow2",
    undo_enabled: false,
    max_tile: null,
    spawn_table: [{ value: 2, weight: 90 }, { value: 4, weight: 10 }],
    ranked_bucket: "none"
  },
  board_3x4_pow2_undo: {
    key: "board_3x4_pow2_undo",
    label: "4x3（可撤回）",
    board_width: 4,
    board_height: 3,
    ruleset: "pow2",
    undo_enabled: true,
    max_tile: null,
    spawn_table: [{ value: 2, weight: 90 }, { value: 4, weight: 10 }],
    ranked_bucket: "none"
  },
  board_3x4_pow2_no_undo: {
    key: "board_3x4_pow2_no_undo",
    label: "4x3（无撤回）",
    board_width: 4,
    board_height: 3,
    ruleset: "pow2",
    undo_enabled: false,
    max_tile: null,
    spawn_table: [{ value: 2, weight: 90 }, { value: 4, weight: 10 }],
    ranked_bucket: "none"
  },
  board_2x4_pow2_undo: {
    key: "board_2x4_pow2_undo",
    label: "4x2（可撤回）",
    board_width: 4,
    board_height: 2,
    ruleset: "pow2",
    undo_enabled: true,
    max_tile: null,
    spawn_table: [{ value: 2, weight: 90 }, { value: 4, weight: 10 }],
    ranked_bucket: "none"
  },
  board_2x4_pow2_no_undo: {
    key: "board_2x4_pow2_no_undo",
    label: "4x2（无撤回）",
    board_width: 4,
    board_height: 2,
    ruleset: "pow2",
    undo_enabled: false,
    max_tile: null,
    spawn_table: [{ value: 2, weight: 90 }, { value: 4, weight: 10 }],
    ranked_bucket: "none"
  },
  fib_4x4_undo: {
    key: "fib_4x4_undo",
    label: "Fibonacci 4x4（可撤回）",
    board_width: 4,
    board_height: 4,
    ruleset: "fibonacci",
    undo_enabled: true,
    max_tile: null,
    spawn_table: [{ value: 1, weight: 90 }, { value: 2, weight: 10 }],
    ranked_bucket: "none"
  },
  fib_4x4_no_undo: {
    key: "fib_4x4_no_undo",
    label: "Fibonacci 4x4（无撤回）",
    board_width: 4,
    board_height: 4,
    ruleset: "fibonacci",
    undo_enabled: false,
    max_tile: null,
    spawn_table: [{ value: 1, weight: 90 }, { value: 2, weight: 10 }],
    ranked_bucket: "none"
  },
  fib_3x3_undo: {
    key: "fib_3x3_undo",
    label: "Fibonacci 3x3（可撤回）",
    board_width: 3,
    board_height: 3,
    ruleset: "fibonacci",
    undo_enabled: true,
    max_tile: null,
    spawn_table: [{ value: 1, weight: 90 }, { value: 2, weight: 10 }],
    ranked_bucket: "none"
  },
  fib_3x3_no_undo: {
    key: "fib_3x3_no_undo",
    label: "Fibonacci 3x3（无撤回）",
    board_width: 3,
    board_height: 3,
    ruleset: "fibonacci",
    undo_enabled: false,
    max_tile: null,
    spawn_table: [{ value: 1, weight: 90 }, { value: 2, weight: 10 }],
    ranked_bucket: "none"
  },
  spawn50_3x3_pow2_no_undo: {
    key: "spawn50_3x3_pow2_no_undo",
    label: "3x3 概率 50/50（无撤回）",
    board_width: 3,
    board_height: 3,
    ruleset: "pow2",
    undo_enabled: false,
    max_tile: null,
    spawn_table: [{ value: 2, weight: 50 }, { value: 4, weight: 50 }],
    ranked_bucket: "none"
  }
};
}

function createGameManagerLegacyModeByKey() {
  return {
  standard_4x4_pow2_no_undo: "classic",
  classic_4x4_pow2_undo: "classic",
  capped_4x4_pow2_no_undo: "capped",
  practice_legacy: "practice"
};
}

function createGameManagerLegacyAliasToModeKey() {
  return {
  classic: "classic_4x4_pow2_undo",
  capped: "capped_4x4_pow2_no_undo",
  practice: "practice_legacy",
  classic_no_undo: "standard_4x4_pow2_no_undo",
  classic_undo_only: "classic_4x4_pow2_undo"
};
}

function createGameManagerTimerSlotIds() {
  return [16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536];

}

function applyGameManagerStaticConfiguration() {
  GameManager.REPLAY128_ASCII_START = 33;   // "!"
  GameManager.REPLAY128_ASCII_COUNT = 94;   // "!".."~"
  GameManager.REPLAY128_EXTRA_CODES = (function () {
    var codes = [];
    var c;
    for (c = 161; c <= 172; c++) codes.push(c);
    // Skip 173 (soft hyphen) because it is visually unstable in copy/paste.
    for (c = 174; c <= 195; c++) codes.push(c);
    return codes;
  })();
  GameManager.REPLAY128_TOTAL = 128;
  GameManager.REPLAY_V4_PREFIX = "REPLAY_v4C_";
  GameManager.UNDO_SETTINGS_KEY = "settings_undo_enabled_by_mode_v1";
  GameManager.STATS_PANEL_VISIBLE_KEY = "stats_panel_visible_v1";
  GameManager.TIMER_MODULE_VIEW_SETTINGS_KEY = "settings_timer_module_view_by_mode_v1";
  GameManager.SAVED_GAME_STATE_VERSION = 1;
  GameManager.SAVED_GAME_STATE_KEY_PREFIX = "savedGameStateByMode:v1:";
  GameManager.SAVED_GAME_STATE_LITE_KEY_PREFIX = "savedGameStateLiteByMode:v1:";
  GameManager.SAVED_GAME_STATE_WINDOW_NAME_KEY = "__gm_saved_state_v1__";
  GameManager.DEFAULT_MODE_KEY = "standard_4x4_pow2_no_undo";
  GameManager.DEFAULT_MODE_CONFIG = createGameManagerDefaultModeConfig();
  GameManager.FALLBACK_MODE_CONFIGS = createGameManagerFallbackModeConfigs(GameManager.DEFAULT_MODE_CONFIG);
  GameManager.LEGACY_MODE_BY_KEY = createGameManagerLegacyModeByKey();
  GameManager.LEGACY_ALIAS_TO_MODE_KEY = createGameManagerLegacyAliasToModeKey();
  GameManager.TIMER_SLOT_IDS = createGameManagerTimerSlotIds();
  GameManager.REPLAY_V4_MODE_CODE_TO_KEY = {
    S: "standard_4x4_pow2_no_undo",
    C: "classic_4x4_pow2_undo",
    K: "capped_4x4_pow2_no_undo",
    P: "practice_legacy"
  };
  GameManager.REPLAY_V4_MODE_KEY_TO_CODE = {
    standard_4x4_pow2_no_undo: "S",
    classic_4x4_pow2_undo: "C",
    capped_4x4_pow2_no_undo: "K",
    practice_legacy: "P"
  };
  GameManager.LEGACY_REPLAY_V1_PREFIX = "REPLAY_v1_";
  GameManager.LEGACY_REPLAY_V2_PREFIX = "REPLAY_v2_";
  GameManager.LEGACY_REPLAY_V2S_PREFIX = "REPLAY_v2S_";
  GameManager.LEGACY_REPLAY_V1_REVERSE_MAPPING = { U: 0, R: 1, D: 2, L: 3, Z: -1 };
}
