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

function createFallbackPow2SpawnTableDefault() {
  return [{ value: 2, weight: 90 }, { value: 4, weight: 10 }];
}

function createFallbackFibSpawnTableDefault() {
  return [{ value: 1, weight: 90 }, { value: 2, weight: 10 }];
}

function createFallbackModeConfigEntry(key, label, boardWidth, boardHeight, ruleset, undoEnabled, maxTile, spawnTable, rankedBucket) {
  return {
    key: key, label: label, board_width: boardWidth, board_height: boardHeight, ruleset: ruleset,
    undo_enabled: undoEnabled, max_tile: maxTile, spawn_table: spawnTable, ranked_bucket: rankedBucket
  };
}

function createFallbackPow2ModeConfig(key, label, boardWidth, boardHeight, undoEnabled, maxTile, rankedBucket, spawnTable) {
  return createFallbackModeConfigEntry(
    key,
    label,
    boardWidth,
    boardHeight,
    "pow2",
    undoEnabled,
    maxTile,
    Array.isArray(spawnTable) ? spawnTable : createFallbackPow2SpawnTableDefault(),
    rankedBucket
  );
}

function createFallbackFibModeConfig(key, label, boardWidth, boardHeight, undoEnabled, maxTile, rankedBucket, spawnTable) {
  return createFallbackModeConfigEntry(
    key,
    label,
    boardWidth,
    boardHeight,
    "fibonacci",
    undoEnabled,
    maxTile,
    Array.isArray(spawnTable) ? spawnTable : createFallbackFibSpawnTableDefault(),
    rankedBucket
  );
}

function createFallbackClassicUndoModeConfig() {
  return createFallbackPow2ModeConfig(
    "classic_4x4_pow2_undo",
    "经典版 4x4（可撤回）",
    4,
    4,
    true,
    null,
    "classic_undo"
  );
}

function createFallbackCapped2048NoUndoModeConfig() {
  return createFallbackPow2ModeConfig(
    "capped_4x4_pow2_no_undo",
    "4x4（2048，无撤回）",
    4,
    4,
    false,
    2048,
    "capped"
  );
}

function createFallbackCapped64NoUndoModeConfig() {
  return createFallbackPow2ModeConfig(
    "capped_4x4_pow2_64_no_undo",
    "封顶版 4x4（64，无撤回）",
    4,
    4,
    false,
    64,
    "none"
  );
}

function createFallbackPracticeModeConfig() {
  return createFallbackPow2ModeConfig(
    "practice",
    "练习板（直通）",
    4,
    4,
    true,
    null,
    "none"
  );
}

function createFallbackPow2StandardCoreModeConfigs(defaultModeConfig) {
  return {
    standard_4x4_pow2_no_undo: defaultModeConfig
  };
}

function createFallbackPow2ClassicCoreModeConfigs() {
  return {
    classic_4x4_pow2_undo: createFallbackClassicUndoModeConfig()
  };
}

function createFallbackPow2CappedCoreModeConfigs() {
  return {
    capped_4x4_pow2_no_undo: createFallbackCapped2048NoUndoModeConfig(),
    capped_4x4_pow2_64_no_undo: createFallbackCapped64NoUndoModeConfig()
  };
}

function createFallbackPow2PracticeCoreModeConfigs() {
  return {
    practice: createFallbackPracticeModeConfig()
  };
}

function createGameManagerFallbackPow2CoreModeConfigs(defaultModeConfig) {
  var configs = createFallbackPow2StandardCoreModeConfigs(defaultModeConfig);
  mergeFallbackModeConfigMaps(configs, createFallbackPow2ClassicCoreModeConfigs());
  mergeFallbackModeConfigMaps(configs, createFallbackPow2CappedCoreModeConfigs());
  mergeFallbackModeConfigMaps(configs, createFallbackPow2PracticeCoreModeConfigs());
  return configs;
}

function createFallbackPow2BoardModeConfig(key, label, boardWidth, boardHeight, undoEnabled) {
  return createFallbackPow2ModeConfig(key, label, boardWidth, boardHeight, undoEnabled, null, "none");
}

function createGameManagerFallbackPow2Board3x3ModeConfigs() {
  return {
    board_3x3_pow2_undo: createFallbackPow2BoardModeConfig("board_3x3_pow2_undo", "3x3（可撤回）", 3, 3, true),
    board_3x3_pow2_no_undo: createFallbackPow2BoardModeConfig("board_3x3_pow2_no_undo", "3x3（无撤回）", 3, 3, false)
  };
}

function createGameManagerFallbackPow2Board4x3ModeConfigs() {
  return {
    board_3x4_pow2_undo: createFallbackPow2BoardModeConfig("board_3x4_pow2_undo", "4x3（可撤回）", 4, 3, true),
    board_3x4_pow2_no_undo: createFallbackPow2BoardModeConfig("board_3x4_pow2_no_undo", "4x3（无撤回）", 4, 3, false)
  };
}

function createGameManagerFallbackPow2Board4x2ModeConfigs() {
  return {
    board_2x4_pow2_undo: createFallbackPow2BoardModeConfig("board_2x4_pow2_undo", "4x2（可撤回）", 4, 2, true),
    board_2x4_pow2_no_undo: createFallbackPow2BoardModeConfig("board_2x4_pow2_no_undo", "4x2（无撤回）", 4, 2, false)
  };
}

function createGameManagerFallbackPow2BoardModeConfigs() {
  var configs = createGameManagerFallbackPow2Board3x3ModeConfigs();
  mergeFallbackModeConfigMaps(configs, createGameManagerFallbackPow2Board4x3ModeConfigs());
  mergeFallbackModeConfigMaps(configs, createGameManagerFallbackPow2Board4x2ModeConfigs());
  return configs;
}

function createGameManagerFallbackPow2VariantModeConfigs() {
  return {
    spawn50_3x3_pow2_no_undo: createFallbackPow2ModeConfig(
      "spawn50_3x3_pow2_no_undo",
      "3x3 概率 50/50（无撤回）",
      3,
      3,
      false,
      null,
      "none",
      [{ value: 2, weight: 50 }, { value: 4, weight: 50 }]
    )
  };
}

function createGameManagerFallbackPow2ModeConfigs(defaultModeConfig) {
  var configs = createGameManagerFallbackPow2CoreModeConfigs(defaultModeConfig);
  mergeFallbackModeConfigMaps(configs, createGameManagerFallbackPow2BoardModeConfigs());
  mergeFallbackModeConfigMaps(configs, createGameManagerFallbackPow2VariantModeConfigs());
  return configs;
}

function createGameManagerFallbackFibModeConfigs() {
  return {
    fib_4x4_undo: createFallbackFibModeConfig("fib_4x4_undo", "Fibonacci 4x4（可撤回）", 4, 4, true, null, "none"),
    fib_4x4_no_undo: createFallbackFibModeConfig("fib_4x4_no_undo", "Fibonacci 4x4（无撤回）", 4, 4, false, null, "none"),
    fib_3x3_undo: createFallbackFibModeConfig("fib_3x3_undo", "Fibonacci 3x3（可撤回）", 3, 3, true, null, "none"),
    fib_3x3_no_undo: createFallbackFibModeConfig("fib_3x3_no_undo", "Fibonacci 3x3（无撤回）", 3, 3, false, null, "none")
  };
}

function mergeFallbackModeConfigMaps(target, source) {
  var result = target || {};
  var extra = source || {};
  for (var key in extra) {
    if (!Object.prototype.hasOwnProperty.call(extra, key)) continue;
    result[key] = extra[key];
  }
  return result;
}

function createGameManagerFallbackModeConfigs(defaultModeConfig) {
  var baseConfigs = createGameManagerFallbackPow2ModeConfigs(defaultModeConfig);
  var fibConfigs = createGameManagerFallbackFibModeConfigs();
  return mergeFallbackModeConfigMaps(baseConfigs, fibConfigs);
}

function createGameManagerTimerSlotIds() {
  return [32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536];

}

function createGameManagerReplay128ExtraCodes() {
  var codes = [];
  var c;
  for (c = 161; c <= 172; c++) codes.push(c);
  // Skip 173 (soft hyphen) because it is visually unstable in copy/paste.
  for (c = 174; c <= 195; c++) codes.push(c);
  return codes;
}

function createGameManagerReplayV4ModeCodeToKey() {
  return {
    S: "standard_4x4_pow2_no_undo",
    C: "classic_4x4_pow2_undo",
    K: "capped_4x4_pow2_no_undo",
    P: "practice"
  };
}

function createGameManagerReplayV4ModeKeyToCode() {
  return {
    standard_4x4_pow2_no_undo: "S",
    classic_4x4_pow2_undo: "C",
    capped_4x4_pow2_no_undo: "K",
    practice: "P"
  };
}

function applyGameManagerReplayStatics() {
  GameManager.REPLAY128_ASCII_START = 33;   // "!"
  GameManager.REPLAY128_ASCII_COUNT = 94;   // "!".."~"
  GameManager.REPLAY128_EXTRA_CODES = createGameManagerReplay128ExtraCodes();
  GameManager.REPLAY128_TOTAL = 128;
  GameManager.REPLAY_V4_PREFIX = "REPLAY_v4C_";
  GameManager.REPLAY_V9_VERSE_PREFIX = "replay_";
  GameManager.REPLAY_V9_RPL_BASE64_PREFIX = "REPLAY_v9RPL_B64_";
  GameManager.REPLAY_V9_RPL_RECORD_BYTES = 25;
  GameManager.REPLAY_V9_RPL_SENTINEL = [0, 88, 666666666, 233333333, 314159265, 987654321];
  GameManager.REPLAY_V4_MODE_CODE_TO_KEY = createGameManagerReplayV4ModeCodeToKey();
  GameManager.REPLAY_V4_MODE_KEY_TO_CODE = createGameManagerReplayV4ModeKeyToCode();
}

function applyGameManagerStorageStatics() {
  GameManager.UNDO_SETTINGS_KEY = "settings_undo_enabled_by_mode_v1";
  GameManager.STATS_PANEL_VISIBLE_KEY = "stats_panel_visible_v1";
  GameManager.TIMER_MODULE_VIEW_SETTINGS_KEY = "settings_timer_module_view_by_mode_v1";
  GameManager.SAVED_GAME_STATE_VERSION = 1;
  GameManager.SAVED_GAME_STATE_KEY_PREFIX = "savedGameStateByMode:v1:";
  GameManager.SAVED_GAME_STATE_LITE_KEY_PREFIX = "savedGameStateLiteByMode:v1:";
  GameManager.SAVED_GAME_STATE_WINDOW_NAME_KEY = "__gm_saved_state_v1__";
}

function applyGameManagerModeStatics() {
  GameManager.DEFAULT_MODE_KEY = "standard_4x4_pow2_no_undo";
  GameManager.DEFAULT_MODE_CONFIG = createGameManagerDefaultModeConfig();
  GameManager.FALLBACK_MODE_CONFIGS = createGameManagerFallbackModeConfigs(GameManager.DEFAULT_MODE_CONFIG);
  GameManager.TIMER_SLOT_IDS = createGameManagerTimerSlotIds();
}

function applyGameManagerStaticConfiguration() {
  applyGameManagerReplayStatics();
  applyGameManagerStorageStatics();
  applyGameManagerModeStatics();
}
