function GameManager(size, InputManager, Actuator, ScoreManager) {
  this.size         = size; // Size of the grid
  this.width        = size;
  this.height       = size;
  this.inputManager = new InputManager;
  this.scoreManager = new ScoreManager;
  this.actuator     = new Actuator;
  this.timerContainer = document.querySelector(".timer-container") || document.getElementById("timer");
  this.cornerRateEl = null;
  this.cornerIpsEl = null;

  this.startTiles   = 2;
  this.maxTile      = Infinity;
  this.mode = this.detectMode();
  this.modeConfig = null;
  this.ruleset = "pow2";
  this.spawnTable = [{ value: 2, weight: 90 }, { value: 4, weight: 10 }];
  this.rankedBucket = "none";
  this.disableSessionSync = false;
  this.sessionSubmitDone = false;
  this.sessionReplayV3 = null;
  this.timerModuleView = "timer";
  this.timerLeaderboardLoadId = 0;
  this.timerModuleBaseHeight = 0;
  this.timerUpdateIntervalMs = 10;
  this.lastStatsPanelUpdateAt = 0;
  this.pendingMoveInput = null;
  this.moveInputFlushScheduled = false;
  this.lastMoveInputAt = 0;
  this.practiceRestartBoardMatrix = null;
  this.practiceRestartModeConfig = null;

  this.inputManager.on("move", this.handleMoveInput.bind(this));
  this.inputManager.on("restart", this.restart.bind(this));
  this.inputManager.on("keepPlaying", this.keepPlaying.bind(this));

  this.undoStack = [];
  this.initCornerStats();
  this.initStatsPanelUi();
  this.bindGameStatePersistenceEvents();

  this.setup();
}

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
GameManager.DEFAULT_MODE_CONFIG = {
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
GameManager.FALLBACK_MODE_CONFIGS = {
  standard_4x4_pow2_no_undo: GameManager.DEFAULT_MODE_CONFIG,
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
GameManager.LEGACY_MODE_BY_KEY = {
  standard_4x4_pow2_no_undo: "classic",
  classic_4x4_pow2_undo: "classic",
  capped_4x4_pow2_no_undo: "capped",
  practice_legacy: "practice"
};
GameManager.LEGACY_ALIAS_TO_MODE_KEY = {
  classic: "classic_4x4_pow2_undo",
  capped: "capped_4x4_pow2_no_undo",
  practice: "practice_legacy",
  classic_no_undo: "standard_4x4_pow2_no_undo",
  classic_undo_only: "classic_4x4_pow2_undo"
};
GameManager.TIMER_SLOT_IDS = [16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536];

GameManager.prototype.getActionKind = function (action) {
  var getReplayActionKindCore = this.callCoreReplayExecutionRuntime(
    "getReplayActionKind",
    [action]
  );
  return this.resolveCoreStringCallOrFallback(getReplayActionKindCore, function () {
    if (action === -1) return "u";
    if (action >= 0 && action <= 3) return "m";
    if (Array.isArray(action) && action.length > 0) return action[0];
    return "x";
  });
};

GameManager.prototype.encodeReplay128 = function (code) {
  var encodeReplay128Core = this.callCoreReplayCodecRuntime(
    "encodeReplay128",
    [code]
  );
  return this.resolveCoreStringCallOrFallback(encodeReplay128Core, function () {
    if (!Number.isInteger(code) || code < 0 || code >= GameManager.REPLAY128_TOTAL) {
      throw "Invalid replay code";
    }
    if (code < GameManager.REPLAY128_ASCII_COUNT) {
      return String.fromCharCode(GameManager.REPLAY128_ASCII_START + code);
    }
    return String.fromCharCode(
      GameManager.REPLAY128_EXTRA_CODES[code - GameManager.REPLAY128_ASCII_COUNT]
    );
  });
};

GameManager.prototype.decodeReplay128 = function (char) {
  var decodeReplay128Core = this.callCoreReplayCodecRuntime(
    "decodeReplay128",
    [char]
  );
  return this.resolveNormalizedCoreValueOrFallback(decodeReplay128Core, function (coreValue) {
    var token = Number(coreValue);
    return Number.isInteger(token) && token >= 0 && token < GameManager.REPLAY128_TOTAL
      ? token
      : undefined;
  }, function () {
    if (!char || char.length !== 1) throw "Invalid replay char";
    var code = char.charCodeAt(0);
    if (
      code >= GameManager.REPLAY128_ASCII_START &&
      code < GameManager.REPLAY128_ASCII_START + GameManager.REPLAY128_ASCII_COUNT
    ) {
      return code - GameManager.REPLAY128_ASCII_START;
    }
    var extraIndex = GameManager.REPLAY128_EXTRA_CODES.indexOf(code);
    if (extraIndex >= 0) return GameManager.REPLAY128_ASCII_COUNT + extraIndex;
    throw "Invalid replay char";
  });
};

GameManager.prototype.encodeBoardV4 = function (board) {
  var encodeBoardV4Core = this.callCoreReplayCodecRuntime(
    "encodeBoardV4",
    [board]
  );
  return this.resolveCoreStringCallOrFallback(encodeBoardV4Core, function () {
    if (!Array.isArray(board) || board.length !== 4) throw "Invalid initial board";
    var out = "";
    for (var y = 0; y < 4; y++) {
      if (!Array.isArray(board[y]) || board[y].length !== 4) throw "Invalid initial board row";
      for (var x = 0; x < 4; x++) {
        var value = board[y][x];
        if (!Number.isInteger(value) || value < 0) throw "Invalid board tile value";
        var exp = 0;
        if (value > 0) {
          var lg = Math.log(value) / Math.log(2);
          if (Math.floor(lg) !== lg) throw "Board tile is not power of two";
          exp = lg;
        }
        if (exp < 0 || exp >= GameManager.REPLAY128_TOTAL) throw "Board tile exponent too large";
        out += this.encodeReplay128(exp);
      }
    }
    return out;
  });
};

GameManager.prototype.decodeBoardV4 = function (encoded) {
  var decodeBoardV4Core = this.callCoreReplayCodecRuntime(
    "decodeBoardV4",
    [encoded]
  );
  return this.resolveNormalizedCoreValueOrFallback(decodeBoardV4Core, function (coreValue) {
    return Array.isArray(coreValue) ? coreValue : undefined;
  }, function () {
    if (typeof encoded !== "string" || encoded.length !== 16) throw "Invalid encoded board";
    var rows = [];
    var idx = 0;
    for (var y = 0; y < 4; y++) {
      var row = [];
      for (var x = 0; x < 4; x++) {
        var exp = this.decodeReplay128(encoded.charAt(idx++));
        row.push(exp === 0 ? 0 : Math.pow(2, exp));
      }
      rows.push(row);
    }
    return rows;
  });
};

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

GameManager.prototype.runReplayTick = function () {
  var shouldStopReplayAtTickCore = this.callCoreReplayTimerRuntime(
    "shouldStopReplayAtTick",
    [{
      replayIndex: this.replayIndex,
      replayMovesLength: this.replayMoves.length
    }]
  );
  var shouldStopAtTick = this.resolveCoreBooleanCallOrFallback(shouldStopReplayAtTickCore, function () {
    return this.replayIndex >= this.replayMoves.length;
  });
  var replayEndState;
  if (shouldStopAtTick) {
    var computeReplayEndStateCore = this.callCoreReplayFlowRuntime(
      "computeReplayEndState",
      []
    );
    replayEndState = this.resolveCoreObjectCallOrFallback(computeReplayEndStateCore, function () {
      return {
        shouldPause: true,
        replayMode: false
      };
    });
  }
  var planReplayTickBoundaryCore = this.callCoreReplayControlRuntime(
    "planReplayTickBoundary",
    [{
      shouldStopAtTick: shouldStopAtTick,
      replayEndState: replayEndState
    }]
  );
  var tickBoundaryPlan = this.resolveCoreObjectCallOrFallback(planReplayTickBoundaryCore, function () {
    if (!shouldStopAtTick) {
      return {
        shouldStop: false,
        shouldPause: false,
        shouldApplyReplayMode: false,
        replayMode: true
      };
    }
    return {
      shouldStop: true,
      shouldPause: replayEndState && replayEndState.shouldPause !== false,
      shouldApplyReplayMode: true,
      replayMode: replayEndState && replayEndState.replayMode === true
    };
  });
  if (tickBoundaryPlan && tickBoundaryPlan.shouldStop === true) {
    if (tickBoundaryPlan.shouldPause) {
      this.pause();
    }
    if (tickBoundaryPlan.shouldApplyReplayMode) {
      this.replayMode = tickBoundaryPlan.replayMode;
    }
    return false;
  }
  this.executePlannedReplayStep();
  return true;
};

GameManager.prototype.setBoardFromMatrix = function (board) {
  if (!Array.isArray(board) || board.length !== this.height) throw "Invalid board matrix";
  this.grid = new Grid(this.width, this.height);
  for (var y = 0; y < this.height; y++) {
    if (!Array.isArray(board[y]) || board[y].length !== this.width) throw "Invalid board row";
    for (var x = 0; x < this.width; x++) {
      var value = board[y][x];
      if (!Number.isInteger(value) || value < 0) throw "Invalid board value";
      if (this.isBlockedCell(x, y) && value !== 0) throw "Blocked cell must stay empty";
      if (value > 0) {
        this.grid.insertTile(new Tile({ x: x, y: y }, value));
      }
    }
  }
};

GameManager.prototype.cloneBoardMatrix = function (board) {
  var out = [];
  for (var y = 0; y < board.length; y++) {
    out.push(board[y].slice());
  }
  return out;
};

GameManager.prototype.resolveCoreObjectCallOrFallback = function (coreCallResult, fallbackResolver) {
  var coreValue = this.isCoreCallAvailable(coreCallResult)
    ? (coreCallResult.value || {})
    : null;
  if (coreValue) return coreValue;
  if (typeof fallbackResolver === "function") return fallbackResolver.call(this);
  return null;
};

GameManager.prototype.isCoreCallAvailable = function (coreCallResult) {
  return !!(coreCallResult && coreCallResult.available === true);
};

GameManager.prototype.resolveCoreBooleanCallOrFallback = function (coreCallResult, fallbackResolver) {
  var coreValue = this.isCoreCallAvailable(coreCallResult)
    ? !!coreCallResult.value
    : null;
  if (coreValue !== null) return coreValue;
  if (typeof fallbackResolver === "function") return !!fallbackResolver.call(this);
  return null;
};

GameManager.prototype.resolveCoreNumericCallOrFallback = function (coreCallResult, fallbackResolver) {
  var coreValue = this.isCoreCallAvailable(coreCallResult)
    ? (Number(coreCallResult.value) || 0)
    : null;
  if (coreValue !== null) return coreValue;
  if (typeof fallbackResolver === "function") return Number(fallbackResolver.call(this)) || 0;
  return null;
};

GameManager.prototype.resolveCoreStringCallOrFallback = function (coreCallResult, fallbackResolver, allowEmpty) {
  var coreValue = null;
  if (this.isCoreCallAvailable(coreCallResult)) {
    var rawCoreString = coreCallResult.value;
    if (typeof rawCoreString === "string") {
      coreValue = allowEmpty === true ? rawCoreString : (rawCoreString || null);
    }
  }
  if (coreValue !== null) return coreValue;
  if (typeof fallbackResolver === "function") return String(fallbackResolver.call(this));
  return null;
};

GameManager.prototype.resolveNormalizedCoreValueOrUndefined = function (coreCallResult, normalizer) {
  if (!this.isCoreCallAvailable(coreCallResult)) return undefined;
  if (typeof normalizer !== "function") return coreCallResult.value;
  return normalizer.call(this, coreCallResult.value);
};

GameManager.prototype.resolveNormalizedCoreValueOrFallback = function (
  coreCallResult,
  normalizer,
  fallbackResolver
) {
  var normalized = this.resolveNormalizedCoreValueOrUndefined(coreCallResult, normalizer);
  if (typeof normalized !== "undefined" && normalized !== null) return normalized;
  if (typeof fallbackResolver === "function") return fallbackResolver.call(this);
  return normalized;
};

GameManager.prototype.resolveNormalizedCoreValueOrFallbackAllowNull = function (
  coreCallResult,
  normalizer,
  fallbackResolver
) {
  var normalized = this.resolveNormalizedCoreValueOrUndefined(coreCallResult, normalizer);
  if (typeof normalized !== "undefined") return normalized;
  if (typeof fallbackResolver === "function") return fallbackResolver.call(this);
  return normalized;
};

GameManager.prototype.resolveCoreRawCallValueOrUndefined = function (coreCallResult) {
  if (!this.isCoreCallAvailable(coreCallResult)) return undefined;
  return coreCallResult.value;
};

GameManager.prototype.tryHandleCoreRawValue = function (coreCallResult, handler) {
  var coreValue = this.resolveCoreRawCallValueOrUndefined(coreCallResult);
  if (typeof coreValue === "undefined") return false;
  if (typeof handler === "function") {
    handler.call(this, coreValue);
  }
  return true;
};

GameManager.prototype.callCoreRuntimeMethod = function (resolverMethodName, methodName, args) {
  var resolver = this[resolverMethodName];
  if (typeof resolver !== "function") {
    return {
      available: false,
      value: null
    };
  }
  var runtimeMethod = resolver.call(this, methodName);
  if (typeof runtimeMethod !== "function") {
    return {
      available: false,
      value: null
    };
  }
  return {
    available: true,
    value: runtimeMethod.apply(null, Array.isArray(args) ? args : [])
  };
};

GameManager.prototype.isNonArrayObject = function (value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
};

function registerCoreRuntimeCaller(methodName, resolverMethodName) {
  if (typeof methodName !== "string" || !methodName) return;
  if (typeof resolverMethodName !== "string" || !resolverMethodName) return;
  GameManager.prototype[methodName] = function (coreMethodName, args) {
    return this.callCoreRuntimeMethod(resolverMethodName, coreMethodName, args);
  };
}

var GAME_MANAGER_CORE_RUNTIME_ACCESSOR_DEFS = [
  [
    "callCoreStorageRuntime",
    "resolveCoreStorageRuntimeMethod",
    "getCoreGameSettingsStorageRuntime",
    "CoreGameSettingsStorageRuntime"
  ],
  ["callCoreModeRuntime", "resolveCoreModeRuntimeMethod", "getCoreModeRuntime", "CoreModeRuntime"],
  ["callCoreRulesRuntime", "resolveCoreRulesRuntimeMethod", "getCoreRulesRuntime", "CoreRulesRuntime"],
  [
    "callCoreReplayCodecRuntime",
    "resolveCoreReplayCodecRuntimeMethod",
    "getCoreReplayCodecRuntime",
    "CoreReplayCodecRuntime"
  ],
  [
    "callCoreReplayV4ActionsRuntime",
    "resolveCoreReplayV4ActionsRuntimeMethod",
    "getCoreReplayV4ActionsRuntime",
    "CoreReplayV4ActionsRuntime"
  ],
  [
    "callCoreReplayImportRuntime",
    "resolveCoreReplayImportRuntimeMethod",
    "getCoreReplayImportRuntime",
    "CoreReplayImportRuntime"
  ],
  [
    "callCoreReplayExecutionRuntime",
    "resolveCoreReplayExecutionRuntimeMethod",
    "getCoreReplayExecutionRuntime",
    "CoreReplayExecutionRuntime"
  ],
  [
    "callCoreReplayDispatchRuntime",
    "resolveCoreReplayDispatchRuntimeMethod",
    "getCoreReplayDispatchRuntime",
    "CoreReplayDispatchRuntime"
  ],
  [
    "callCoreReplayLifecycleRuntime",
    "resolveCoreReplayLifecycleRuntimeMethod",
    "getCoreReplayLifecycleRuntime",
    "CoreReplayLifecycleRuntime"
  ],
  [
    "callCoreReplayTimerRuntime",
    "resolveCoreReplayTimerRuntimeMethod",
    "getCoreReplayTimerRuntime",
    "CoreReplayTimerRuntime"
  ],
  [
    "callCoreReplayFlowRuntime",
    "resolveCoreReplayFlowRuntimeMethod",
    "getCoreReplayFlowRuntime",
    "CoreReplayFlowRuntime"
  ],
  [
    "callCoreReplayControlRuntime",
    "resolveCoreReplayControlRuntimeMethod",
    "getCoreReplayControlRuntime",
    "CoreReplayControlRuntime"
  ],
  [
    "callCoreReplayLoopRuntime",
    "resolveCoreReplayLoopRuntimeMethod",
    "getCoreReplayLoopRuntime",
    "CoreReplayLoopRuntime"
  ],
  [
    "callCoreReplayLegacyRuntime",
    "resolveCoreReplayLegacyRuntimeMethod",
    "getCoreReplayLegacyRuntime",
    "CoreReplayLegacyRuntime"
  ],
  [
    "callCoreMoveApplyRuntime",
    "resolveCoreMoveApplyRuntimeMethod",
    "getCoreMoveApplyRuntime",
    "CoreMoveApplyRuntime"
  ],
  [
    "callCorePostMoveRecordRuntime",
    "resolveCorePostMoveRecordRuntimeMethod",
    "getCorePostMoveRecordRuntime",
    "CorePostMoveRecordRuntime"
  ],
  [
    "callCorePostUndoRecordRuntime",
    "resolveCorePostUndoRecordRuntimeMethod",
    "getCorePostUndoRecordRuntime",
    "CorePostUndoRecordRuntime"
  ],
  [
    "callCoreUndoRestoreRuntime",
    "resolveCoreUndoRestoreRuntimeMethod",
    "getCoreUndoRestoreRuntime",
    "CoreUndoRestoreRuntime"
  ],
  [
    "callCoreUndoSnapshotRuntime",
    "resolveCoreUndoSnapshotRuntimeMethod",
    "getCoreUndoSnapshotRuntime",
    "CoreUndoSnapshotRuntime"
  ],
  [
    "callCoreUndoStackEntryRuntime",
    "resolveCoreUndoStackEntryRuntimeMethod",
    "getCoreUndoStackEntryRuntime",
    "CoreUndoStackEntryRuntime"
  ],
  [
    "callCoreUndoTileSnapshotRuntime",
    "resolveCoreUndoTileSnapshotRuntimeMethod",
    "getCoreUndoTileSnapshotRuntime",
    "CoreUndoTileSnapshotRuntime"
  ],
  [
    "callCoreUndoTileRestoreRuntime",
    "resolveCoreUndoTileRestoreRuntimeMethod",
    "getCoreUndoTileRestoreRuntime",
    "CoreUndoTileRestoreRuntime"
  ],
  [
    "callCoreUndoRestorePayloadRuntime",
    "resolveCoreUndoRestorePayloadRuntimeMethod",
    "getCoreUndoRestorePayloadRuntime",
    "CoreUndoRestorePayloadRuntime"
  ],
  [
    "callCoreMergeEffectsRuntime",
    "resolveCoreMergeEffectsRuntimeMethod",
    "getCoreMergeEffectsRuntime",
    "CoreMergeEffectsRuntime"
  ],
  [
    "callCoreSpecialRulesRuntime",
    "resolveCoreSpecialRulesRuntimeMethod",
    "getCoreSpecialRulesRuntime",
    "CoreSpecialRulesRuntime"
  ],
  [
    "callCoreGridScanRuntime",
    "resolveCoreGridScanRuntimeMethod",
    "getCoreGridScanRuntime",
    "CoreGridScanRuntime"
  ],
  [
    "callCoreDirectionLockRuntime",
    "resolveCoreDirectionLockRuntimeMethod",
    "getCoreDirectionLockRuntime",
    "CoreDirectionLockRuntime"
  ],
  [
    "callCoreScoringRuntime",
    "resolveCoreScoringRuntimeMethod",
    "getCoreScoringRuntime",
    "CoreScoringRuntime"
  ],
  [
    "callCorePostMoveRuntime",
    "resolveCorePostMoveRuntimeMethod",
    "getCorePostMoveRuntime",
    "CorePostMoveRuntime"
  ],
  [
    "callCorePrettyTimeRuntime",
    "resolveCorePrettyTimeRuntimeMethod",
    "getCorePrettyTimeRuntime",
    "CorePrettyTimeRuntime"
  ],
  [
    "callCoreMovePathRuntime",
    "resolveCoreMovePathRuntimeMethod",
    "getCoreMovePathRuntime",
    "CoreMovePathRuntime"
  ],
  [
    "callCoreMoveScanRuntime",
    "resolveCoreMoveScanRuntimeMethod",
    "getCoreMoveScanRuntime",
    "CoreMoveScanRuntime"
  ],
  [
    "callCoreTimerIntervalRuntime",
    "resolveCoreTimerIntervalRuntimeMethod",
    "getCoreTimerIntervalRuntime",
    "CoreTimerIntervalRuntime"
  ]
];

GameManager.prototype.resolveSavedGameStateStorageKey = function (keyPrefix, modeKey) {
  var resolveSavedGameStateStorageKeyCore = this.callCoreStorageRuntime(
    "resolveSavedGameStateStorageKey",
    [{
      modeKey: modeKey,
      currentModeKey: this.modeKey,
      currentMode: this.mode,
      defaultModeKey: GameManager.DEFAULT_MODE_KEY,
      keyPrefix: typeof keyPrefix === "string" ? keyPrefix : ""
    }]
  );
  return this.resolveCoreStringCallOrFallback(resolveSavedGameStateStorageKeyCore, function () {
    var key = (typeof modeKey === "string" && modeKey)
      ? modeKey
      : (this.modeKey || this.mode || GameManager.DEFAULT_MODE_KEY);
    return (typeof keyPrefix === "string" ? keyPrefix : "") + key;
  });
};

GameManager.prototype.getWebStorageByName = function (name) {
  try {
    return (typeof window !== "undefined" && window[name]) ? window[name] : null;
  } catch (_err) {
    return null;
  }
};

GameManager.prototype.getWindowLike = function () {
  return typeof window !== "undefined" ? window : null;
};

GameManager.prototype.canReadFromStorage = function (storage) {
  return !!(storage && typeof storage.getItem === "function");
};

GameManager.prototype.canWriteToStorage = function (storage) {
  return !!(storage && typeof storage.setItem === "function");
};

GameManager.prototype.resolveWindowMethod = function (methodName) {
  var windowLike = this.getWindowLike();
  if (!windowLike || typeof methodName !== "string" || !methodName) return null;
  var method = windowLike[methodName];
  if (typeof method !== "function") return null;
  return {
    windowLike: windowLike,
    method: method
  };
};

GameManager.prototype.callWindowMethod = function (methodName, args) {
  var resolved = this.resolveWindowMethod(methodName);
  if (!resolved) return false;
  resolved.method.apply(resolved.windowLike, Array.isArray(args) ? args : []);
  return true;
};

GameManager.prototype.resolveWindowNamespaceMethod = function (namespaceName, methodName) {
  var windowLike = this.getWindowLike();
  if (!windowLike) return null;
  if (typeof namespaceName !== "string" || !namespaceName) return null;
  if (typeof methodName !== "string" || !methodName) return null;
  var scope = windowLike[namespaceName];
  if (!scope || (typeof scope !== "object" && typeof scope !== "function")) return null;
  var method = scope[methodName];
  if (typeof method !== "function") return null;
  return {
    windowLike: windowLike,
    scope: scope,
    method: method
  };
};

GameManager.prototype.callWindowNamespaceMethod = function (namespaceName, methodName, args) {
  var resolved = this.resolveWindowNamespaceMethod(namespaceName, methodName);
  if (!resolved) return false;
  resolved.method.apply(resolved.scope, Array.isArray(args) ? args : []);
  return true;
};

GameManager.prototype.requestAnimationFrame = function (callback) {
  if (typeof callback !== "function") return false;
  var raf = this.resolveWindowMethod("requestAnimationFrame");
  if (raf) {
    raf.method.call(raf.windowLike, callback);
    return true;
  }
  callback();
  return false;
};

GameManager.prototype.readLocalStorageFlag = function (key, trueValue) {
  var readStorageFlagFromContextCore = this.callCoreStorageRuntime(
    "readStorageFlagFromContext",
    [{
      windowLike: this.getWindowLike(),
      key: key,
      trueValue: trueValue
    }]
  );
  return this.resolveCoreBooleanCallOrFallback(readStorageFlagFromContextCore, function () {
    var storage = this.getWebStorageByName("localStorage");
    if (!this.canReadFromStorage(storage)) return false;
    var matchValue = typeof trueValue === "string" ? trueValue : "1";
    try {
      return storage.getItem(key) === matchValue;
    } catch (_err) {
      return false;
    }
  });
};

GameManager.prototype.writeLocalStorageFlag = function (key, enabled, trueValue, falseValue) {
  var writeStorageFlagFromContextCore = this.callCoreStorageRuntime(
    "writeStorageFlagFromContext",
    [{
      windowLike: this.getWindowLike(),
      key: key,
      enabled: !!enabled,
      trueValue: trueValue,
      falseValue: falseValue
    }]
  );
  return this.resolveCoreBooleanCallOrFallback(writeStorageFlagFromContextCore, function () {
    var storage = this.getWebStorageByName("localStorage");
    if (!this.canWriteToStorage(storage)) return false;
    var value = enabled
      ? (typeof trueValue === "string" ? trueValue : "1")
      : (typeof falseValue === "string" ? falseValue : "0");
    try {
      storage.setItem(key, value);
      return true;
    } catch (_err) {
      return false;
    }
  });
};

GameManager.prototype.normalizeStorageJsonMapRuntimeValue = function (runtimeMap) {
  return this.isNonArrayObject(runtimeMap) ? runtimeMap : {};
};

GameManager.prototype.parseStorageJsonMapRaw = function (raw) {
  if (!raw) return {};
  var parsed = JSON.parse(raw);
  if (!this.isNonArrayObject(parsed)) return {};
  return parsed;
};

GameManager.prototype.normalizeStorageJsonMapWriteInput = function (map) {
  return this.isNonArrayObject(map) ? map : {};
};

GameManager.prototype.readLocalStorageJsonMap = function (key) {
  var readStorageJsonMapFromContextCore = this.callCoreStorageRuntime(
    "readStorageJsonMapFromContext",
    [{
      windowLike: this.getWindowLike(),
      key: key
    }]
  );
  return this.resolveNormalizedCoreValueOrFallback(
    readStorageJsonMapFromContextCore,
    this.normalizeStorageJsonMapRuntimeValue,
    function () {
      var storage = this.getWebStorageByName("localStorage");
      if (!this.canReadFromStorage(storage)) return {};
      try {
        return this.parseStorageJsonMapRaw(storage.getItem(key));
      } catch (_err) {
        return {};
      }
    }
  );
};

GameManager.prototype.writeLocalStorageJsonMap = function (key, map) {
  var writeStorageJsonMapFromContextCore = this.callCoreStorageRuntime(
    "writeStorageJsonMapFromContext",
    [{
      windowLike: this.getWindowLike(),
      key: key,
      map: map
    }]
  );
  return this.resolveCoreBooleanCallOrFallback(writeStorageJsonMapFromContextCore, function () {
    var storage = this.getWebStorageByName("localStorage");
    if (!this.canWriteToStorage(storage)) return false;
    try {
      storage.setItem(key, JSON.stringify(this.normalizeStorageJsonMapWriteInput(map)));
      return true;
    } catch (_err) {
      return false;
    }
  });
};

GameManager.prototype.serializeLocalStoragePayload = function (payload) {
  var serialized = JSON.stringify(payload);
  return typeof serialized === "string" ? serialized : null;
};

GameManager.prototype.writeLocalStorageJsonPayload = function (key, payload) {
  var writeStorageJsonPayloadFromContextCore = this.callCoreStorageRuntime(
    "writeStorageJsonPayloadFromContext",
    [{
      windowLike: this.getWindowLike(),
      key: key,
      payload: payload
    }]
  );
  return this.resolveCoreBooleanCallOrFallback(writeStorageJsonPayloadFromContextCore, function () {
    var storage = this.getWebStorageByName("localStorage");
    if (!this.canWriteToStorage(storage)) return false;
    var serialized = this.serializeLocalStoragePayload(payload);
    if (typeof serialized !== "string") return false;
    try {
      storage.setItem(key, serialized);
      return true;
    } catch (_err) {
      return false;
    }
  });
};

GameManager.prototype.getSavedGameStateStorages = function () {
  var getSavedGameStateStoragesFromContextCore = this.callCoreStorageRuntime(
    "getSavedGameStateStoragesFromContext",
    [{
      windowLike: this.getWindowLike()
    }]
  );
  var normalizedByCore = this.resolveNormalizedCoreValueOrUndefined(
    getSavedGameStateStoragesFromContextCore,
    function (storagesByCore) {
      return Array.isArray(storagesByCore) ? storagesByCore : null;
    }
  );
  if (normalizedByCore) return normalizedByCore;
  var out = [];
  var localStore = this.getWebStorageByName("localStorage");
  var sessionStore = this.getWebStorageByName("sessionStorage");
  if (localStore) out.push(localStore);
  if (sessionStore && sessionStore !== localStore) out.push(sessionStore);
  return out;
};

GameManager.prototype.readSavedPayloadByKey = function (key) {
  var stores = this.getSavedGameStateStorages();
  var readSavedPayloadByKeyFromStoragesCore = this.callCoreStorageRuntime(
    "readSavedPayloadByKeyFromStorages",
    [{
      storages: Array.isArray(stores) ? stores : [],
      key: key
    }]
  );
  var normalizedByCore = this.resolveNormalizedCoreValueOrUndefined(
    readSavedPayloadByKeyFromStoragesCore,
    function (savedByCore) {
      if (this.isNonArrayObject(savedByCore)) return savedByCore;
      if (savedByCore === null) return null;
      return undefined;
    }
  );
  if (typeof normalizedByCore !== "undefined") return normalizedByCore;
  var targetStores = Array.isArray(stores) ? stores : [];
  var best = null;
  for (var i = 0; i < targetStores.length; i++) {
    var raw = null;
    try {
      raw = targetStores[i].getItem(key);
    } catch (_errRead) {
      raw = null;
    }
    if (!raw) continue;
    var parsed = null;
    try {
      var parsedRaw = JSON.parse(raw);
      parsed = this.isNonArrayObject(parsedRaw) ? parsedRaw : null;
    } catch (_errParse) {
      parsed = null;
    }
    if (!parsed) {
      try {
        targetStores[i].removeItem(key);
      } catch (_errRemove) {}
      continue;
    }
    if (!best) {
      best = parsed;
      continue;
    }
    var bestSavedAt = Number(best.saved_at) || 0;
    var nextSavedAt = Number(parsed.saved_at) || 0;
    best = nextSavedAt >= bestSavedAt ? parsed : best;
  }
  return best;
};

GameManager.prototype.readWindowNameSavedPayload = function (modeKey) {
  var windowLike = this.getWindowLike();
  var readSavedPayloadFromWindowNameCore = this.callCoreStorageRuntime(
    "readSavedPayloadFromWindowName",
    [{
      windowLike: windowLike,
      windowNameKey: GameManager.SAVED_GAME_STATE_WINDOW_NAME_KEY,
      modeKey: modeKey,
      currentModeKey: this.modeKey,
      currentMode: this.mode,
      defaultModeKey: GameManager.DEFAULT_MODE_KEY
    }]
  );
  var normalizedByCore = this.resolveNormalizedCoreValueOrUndefined(
    readSavedPayloadFromWindowNameCore,
    function (payloadByCore) {
      if (this.isNonArrayObject(payloadByCore)) return payloadByCore;
      if (payloadByCore === null) return null;
      return undefined;
    }
  );
  if (typeof normalizedByCore !== "undefined") return normalizedByCore;
  var raw = this.readWindowNameRaw();
  var marker = this.resolveWindowNameSavedPayloadMarker();
  var map = null;
  if (raw && typeof raw === "string") {
    var parts = raw.split("&");
    var lookupMarker = typeof marker === "string" && marker
      ? marker
      : this.resolveWindowNameSavedPayloadMarker();
    var encoded = "";
    for (var i = 0; i < parts.length; i++) {
      if (parts[i].indexOf(lookupMarker) === 0) {
        encoded = parts[i].substring(lookupMarker.length);
        break;
      }
    }
    map = this.decodeWindowNameSavedMapPayload(encoded);
  }
  if (!map || typeof map !== "object") return null;
  var key = (typeof modeKey === "string" && modeKey)
    ? modeKey
    : (this.modeKey || this.mode || GameManager.DEFAULT_MODE_KEY);
  var payload = map[key];
  if (!payload || typeof payload !== "object") return null;
  return payload;
};

GameManager.prototype.readWindowNameRaw = function () {
  var windowLike = this.getWindowLike();
  if (!windowLike) return "";
  try {
    return windowLike && typeof windowLike.name === "string" ? windowLike.name : "";
  } catch (_errName) {
    return "";
  }
};

GameManager.prototype.resolveWindowNameSavedPayloadMarker = function () {
  return GameManager.SAVED_GAME_STATE_WINDOW_NAME_KEY + "=";
};

GameManager.prototype.decodeWindowNameSavedMapPayload = function (encoded) {
  if (!encoded) return null;
  try {
    var map = JSON.parse(decodeURIComponent(encoded));
    if (!map || typeof map !== "object") return null;
    return map;
  } catch (_errParse) {
    return null;
  }
};

GameManager.prototype.writeWindowNameSavedPayload = function (modeKey, payload) {
  var windowLike = this.getWindowLike();
  var writeSavedPayloadToWindowNameCore = this.callCoreStorageRuntime(
    "writeSavedPayloadToWindowName",
    [Object.assign(
      {},
      {
        windowLike: windowLike,
        windowNameKey: GameManager.SAVED_GAME_STATE_WINDOW_NAME_KEY,
        modeKey: modeKey,
        currentModeKey: this.modeKey,
        currentMode: this.mode,
        defaultModeKey: GameManager.DEFAULT_MODE_KEY
      },
      { payload: payload }
    )]
  );
  var normalizedByCore = this.resolveNormalizedCoreValueOrUndefined(
    writeSavedPayloadToWindowNameCore,
    function (writtenByCore) {
      return typeof writtenByCore === "boolean" ? writtenByCore : undefined;
    }
  );
  if (typeof normalizedByCore !== "undefined") return normalizedByCore;
  if (!windowLike) return false;
  var marker = this.resolveWindowNameSavedPayloadMarker();
  var raw = this.readWindowNameRaw();
  var parts = raw ? raw.split("&") : [];
  var kept = [];
  var map = {};
  var lookupMarker = typeof marker === "string" && marker
    ? marker
    : this.resolveWindowNameSavedPayloadMarker();
  for (var i = 0; i < parts.length; i++) {
    var part = parts[i];
    if (typeof part === "string" && part && part.indexOf(lookupMarker) === 0) {
      var encoded = part.substring(lookupMarker.length);
      var parsedMap = this.decodeWindowNameSavedMapPayload(encoded);
      if (this.isNonArrayObject(parsedMap)) map = parsedMap;
      continue;
    }
    if (!part) continue;
    kept.push(part);
  }
  var key = (typeof modeKey === "string" && modeKey)
    ? modeKey
    : (this.modeKey || this.mode || GameManager.DEFAULT_MODE_KEY);
  if (!payload || typeof payload !== "object") {
    delete map[key];
  } else {
    map[key] = payload;
  }
  var encodedMap = null;
  try {
    encodedMap = encodeURIComponent(JSON.stringify(map));
  } catch (_errEncode) {
    return false;
  }
  if (typeof encodedMap !== "string") return false;
  var nextParts = kept.slice();
  nextParts.push(marker + encodedMap);
  var nextWindowName = nextParts.join("&");
  if (typeof nextWindowName !== "string") return false;
  try {
    windowLike.name = nextWindowName;
    return true;
  } catch (_errWrite) {
    return false;
  }
};

GameManager.prototype.resolveWindowPathname = function () {
  var windowLike = this.getWindowLike();
  return (windowLike && windowLike.location && windowLike.location.pathname)
    ? String(windowLike.location.pathname)
    : "";
};

GameManager.prototype.shouldUseSavedGameState = function () {
  var pathname = this.resolveWindowPathname();
  var shouldUseSavedGameStateCore = this.callCoreStorageRuntime(
    "shouldUseSavedGameStateFromContext",
    [{
      hasWindow: !!this.getWindowLike(),
      replayMode: this.replayMode,
      pathname: pathname
    }]
  );
  return this.resolveCoreBooleanCallOrFallback(shouldUseSavedGameStateCore, function () {
    if (!this.getWindowLike()) return false;
    if (this.replayMode) return false;
    return pathname.indexOf("replay.html") === -1;
  });
};

GameManager.prototype.bindGameStatePersistenceEvents = function () {
  var windowLike = this.getWindowLike();
  if (!windowLike) return;
  if (this.savedGameStateBound) return;
  var saveHandler = this.buildGameStatePersistenceSaveHandler();
  this.registerGameStatePersistenceEvents(windowLike, saveHandler);
  this.savedGameStateBound = true;
};

GameManager.prototype.buildGameStatePersistenceSaveHandler = function () {
  var self = this;
  return function () {
    self.saveGameState({ force: true });
  };
};

GameManager.prototype.registerGameStatePersistenceEvents = function (windowLike, saveHandler) {
  windowLike.addEventListener("beforeunload", saveHandler);
  windowLike.addEventListener("pagehide", saveHandler);
};

GameManager.prototype.resolveSavedGameStateStorageKeys = function (modeKey) {
  return [
    this.resolveSavedGameStateStorageKey(GameManager.SAVED_GAME_STATE_KEY_PREFIX, modeKey),
    this.resolveSavedGameStateStorageKey(GameManager.SAVED_GAME_STATE_LITE_KEY_PREFIX, modeKey)
  ];
};

GameManager.prototype.clearSavedGameState = function (modeKey) {
  this.writeWindowNameSavedPayload(modeKey, null);
  if (!this.shouldUseSavedGameState()) return;
  var keys = this.resolveSavedGameStateStorageKeys(modeKey);
  var stores = this.getSavedGameStateStorages();
  var removeKeysFromStoragesCore = this.callCoreStorageRuntime(
    "removeKeysFromStorages",
    [{
      storages: stores,
      keys: keys
    }]
  );
  if (this.resolveCoreBooleanCallOrFallback(removeKeysFromStoragesCore, function () {
    return false;
  })) return;
  for (var i = 0; i < stores.length; i++) {
    for (var k = 0; k < keys.length; k++) {
      try {
        stores[i].removeItem(keys[k]);
      } catch (_err) {}
    }
  }
};

GameManager.prototype.captureTimerFixedRowsState = function () {
  var out = {};
  for (var i = 0; i < GameManager.TIMER_SLOT_IDS.length; i++) {
    var slotId = String(GameManager.TIMER_SLOT_IDS[i]);
    var row = this.getTimerRowEl(slotId);
    var timerEl = document.getElementById("timer" + slotId);
    if (!row || !timerEl) continue;
    out[slotId] = this.captureTimerFixedRowState(row, timerEl);
  }
  return out;
};

GameManager.prototype.captureTimerLegendState = function (legend) {
  if (!legend) {
    return {
      legendText: "",
      legendClass: "",
      legendFontSize: ""
    };
  }
  return {
    legendText: legend.textContent || "",
    legendClass: legend.className || "",
    legendFontSize: legend.style.fontSize || ""
  };
};

GameManager.prototype.captureTimerFixedRowState = function (row, timerEl) {
  var legendState = this.captureTimerLegendState(row.querySelector(".timertile"));
  return {
    display: row.style.display || "",
    visibility: row.style.visibility || "",
    pointerEvents: row.style.pointerEvents || "",
    repeat: row.getAttribute("data-capped-repeat") || "",
    timerText: timerEl.textContent || "",
    legendText: legendState.legendText,
    legendClass: legendState.legendClass,
    legendFontSize: legendState.legendFontSize
  };
};

GameManager.prototype.captureTimerDynamicRowsState = function (containerId) {
  var out = [];
  var container = document.getElementById(containerId);
  if (!container) return out;
  for (var i = 0; i < container.children.length; i++) {
    var row = container.children[i];
    var rowState = this.captureTimerDynamicRowState(row);
    if (!rowState) continue;
    out.push(rowState);
  }
  return out;
};

GameManager.prototype.captureTimerDynamicRowState = function (row) {
  if (!row || !row.classList || !row.classList.contains("timer-row-item")) return null;
  var tiles = row.querySelectorAll(".timertile");
  var legend = tiles.length > 0 ? tiles[0] : null;
  var timer = tiles.length > 1 ? tiles[1] : null;
  return {
    repeat: row.getAttribute("data-capped-repeat") || "",
    label: legend ? (legend.textContent || "") : "",
    labelClass: legend ? (legend.className || "") : "",
    labelFontSize: legend ? (legend.style.fontSize || "") : "",
    time: timer ? (timer.textContent || "") : ""
  };
};

GameManager.prototype.resolveSavedDynamicTimerRowState = function (rowState) {
  return {
    repeat: parseInt(rowState && rowState.repeat, 10),
    labelText: rowState && typeof rowState.label === "string" ? rowState.label : "",
    timeText: rowState && typeof rowState.time === "string" ? rowState.time : "",
    labelClass: rowState && typeof rowState.labelClass === "string" ? rowState.labelClass : "",
    labelFontSize: rowState && typeof rowState.labelFontSize === "string" ? rowState.labelFontSize : ""
  };
};

GameManager.prototype.shouldUseSavedDynamicTimerRepeatStyle = function (repeat, resolvedCappedState) {
  return Number.isFinite(repeat) && repeat >= 2 && resolvedCappedState.isCappedMode;
};

GameManager.prototype.createSavedDynamicTimerLegend = function (rowInfo, resolvedCappedState) {
  var legend = document.createElement("div");
  legend.className = this.getCappedTimerLegendClass(resolvedCappedState.cappedTargetValue);
  legend.style.cssText =
    "color: #f9f6f2; font-size: " +
    this.getCappedTimerFontSize(resolvedCappedState.cappedTargetValue) +
    ";";
  legend.textContent = rowInfo.labelText;
  if (!this.shouldUseSavedDynamicTimerRepeatStyle(rowInfo.repeat, resolvedCappedState) && rowInfo.labelClass) {
    legend.className = rowInfo.labelClass;
  }
  if (rowInfo.labelFontSize) legend.style.fontSize = rowInfo.labelFontSize;
  return legend;
};

GameManager.prototype.createSavedDynamicTimerValue = function (timeText) {
  var valueEl = document.createElement("div");
  valueEl.className = "timertile";
  valueEl.style.cssText = "margin-left:6px; width:187px;";
  valueEl.textContent = timeText;
  return valueEl;
};

GameManager.prototype.appendSavedDynamicTimerRowSpacing = function (rowDiv) {
  rowDiv.appendChild(document.createElement("br"));
  rowDiv.appendChild(document.createElement("br"));
};

GameManager.prototype.createSavedDynamicTimerRow = function (rowState, cappedState) {
  var resolvedCappedState =
    this.resolveProvidedCappedModeState(cappedState);
  var rowInfo = this.resolveSavedDynamicTimerRowState(rowState);

  var rowDiv = document.createElement("div");
  rowDiv.className = "timer-row-item";
  if (Number.isFinite(rowInfo.repeat) && rowInfo.repeat >= 2) {
    rowDiv.setAttribute("data-capped-repeat", String(rowInfo.repeat));
  }
  var legend = this.createSavedDynamicTimerLegend(rowInfo, resolvedCappedState);
  var val = this.createSavedDynamicTimerValue(rowInfo.timeText);

  rowDiv.appendChild(legend);
  rowDiv.appendChild(val);
  this.appendSavedDynamicTimerRowSpacing(rowDiv);
  return rowDiv;
};

GameManager.prototype.normalizeCappedRepeatLegendClasses = function (cappedState) {
  if (typeof document === "undefined") return;
  var resolvedCappedState =
    this.resolveProvidedCappedModeState(cappedState);
  if (!resolvedCappedState.isCappedMode) return;
  var rows = document.querySelectorAll("#timerbox [data-capped-repeat]");
  var legendClass = this.getCappedTimerLegendClass(resolvedCappedState.cappedTargetValue);
  var fontSize = this.getCappedTimerFontSize(resolvedCappedState.cappedTargetValue);
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    if (!row || !row.querySelector) continue;
    var legend = row.querySelector(".timertile");
    if (!legend) continue;
    legend.className = legendClass;
    legend.style.color = "#f9f6f2";
    legend.style.fontSize = fontSize;
  }
  this.callWindowNamespaceMethod("ThemeManager", "syncTimerLegendStyles");
};

GameManager.prototype.resolveRestoredTimerRowStyleValue = function (rowState, key) {
  return rowState && typeof rowState[key] === "string" ? rowState[key] : "";
};

GameManager.prototype.applyRestoredTimerRowStyleState = function (row, rowState) {
  row.style.display = this.resolveRestoredTimerRowStyleValue(rowState, "display");
  row.style.visibility = this.resolveRestoredTimerRowStyleValue(rowState, "visibility");
  row.style.pointerEvents = this.resolveRestoredTimerRowStyleValue(rowState, "pointerEvents");
};

GameManager.prototype.applyRestoredTimerRowRepeatState = function (row, rowState) {
  if (typeof rowState.repeat === "string" && rowState.repeat) row.setAttribute("data-capped-repeat", rowState.repeat);
  else row.removeAttribute("data-capped-repeat");
};

GameManager.prototype.applyRestoredTimerLegendState = function (row, legend, rowState, cappedStateForRestore) {
  if (!legend) return;
  if (row.getAttribute("data-capped-repeat") && cappedStateForRestore.isCappedMode) {
    legend.className = this.getCappedTimerLegendClass(cappedStateForRestore.cappedTargetValue);
  } else if (typeof rowState.legendClass === "string" && rowState.legendClass) {
    legend.className = rowState.legendClass;
  }
  if (typeof rowState.legendText === "string") legend.textContent = rowState.legendText;
  legend.style.fontSize = typeof rowState.legendFontSize === "string" ? rowState.legendFontSize : "";
};

GameManager.prototype.restoreFixedTimerRowState = function (slotId, rowState, cappedStateForRestore) {
  if (!rowState) return;
  var row = this.getTimerRowEl(slotId);
  var timerEl = document.getElementById("timer" + slotId);
  if (!row || !timerEl) return;
  var legend = row.querySelector(".timertile");

  this.applyRestoredTimerRowStyleState(row, rowState);
  this.applyRestoredTimerRowRepeatState(row, rowState);
  timerEl.textContent = typeof rowState.timerText === "string" ? rowState.timerText : "";
  this.applyRestoredTimerLegendState(row, legend, rowState, cappedStateForRestore);
};

GameManager.prototype.restoreFixedTimerRowsFromState = function (saved, cappedStateForRestore) {
  var fixed = saved.timer_fixed_rows;
  if (!(fixed && typeof fixed === "object")) return;
  for (var i = 0; i < GameManager.TIMER_SLOT_IDS.length; i++) {
    var slotId = String(GameManager.TIMER_SLOT_IDS[i]);
    this.restoreFixedTimerRowState(slotId, fixed[slotId], cappedStateForRestore);
  }
};

GameManager.prototype.resolveSavedDynamicTimerRows = function (saved, key) {
  var rows = saved ? saved[key] : null;
  return Array.isArray(rows) ? rows : [];
};

GameManager.prototype.restoreDynamicTimerRowsIntoContainer = function (
  container,
  rows,
  cappedStateForRestore
) {
  if (!container) return;
  container.innerHTML = "";
  for (var i = 0; i < rows.length; i++) {
    container.appendChild(this.createSavedDynamicTimerRow(rows[i], cappedStateForRestore));
  }
};

GameManager.prototype.restoreDynamicTimerRowsFromState = function (saved, cappedStateForRestore) {
  var capped = document.getElementById("capped-timer-container");
  this.restoreDynamicTimerRowsIntoContainer(
    capped,
    this.resolveSavedDynamicTimerRows(saved, "timer_dynamic_rows_capped"),
    cappedStateForRestore
  );
  var overflow = this.getCappedOverflowContainer(cappedStateForRestore);
  this.restoreDynamicTimerRowsIntoContainer(
    overflow,
    this.resolveSavedDynamicTimerRows(saved, "timer_dynamic_rows_overflow"),
    cappedStateForRestore
  );
};

GameManager.prototype.restoreTimerSubRowText = function (elementId, textValue) {
  var element = document.getElementById(elementId);
  if (element && typeof textValue === "string") element.textContent = textValue;
};

GameManager.prototype.restoreTimerSubRowVisibility = function (elementId, visible) {
  var element = document.getElementById(elementId);
  if (element && typeof visible === "boolean") {
    element.style.display = visible ? "block" : "none";
  }
};

GameManager.prototype.restoreTimerSubRowsFromState = function (saved) {
  this.restoreTimerSubRowText("timer8192-sub", saved.timer_sub_8192);
  this.restoreTimerSubRowText("timer16384-sub", saved.timer_sub_16384);
  this.restoreTimerSubRowVisibility("timer32k-sub-container", saved.timer_sub_visible);
};

GameManager.prototype.restoreTimerRowsFromState = function (saved) {
  if (!saved || typeof saved !== "object") return;
  var cappedStateForRestore = this.resolveCappedModeState();
  this.restoreFixedTimerRowsFromState(saved, cappedStateForRestore);
  this.restoreDynamicTimerRowsFromState(saved, cappedStateForRestore);
  this.restoreTimerSubRowsFromState(saved);
  this.normalizeCappedRepeatLegendClasses(cappedStateForRestore);

  this.callWindowMethod("updateTimerScroll");
};

GameManager.prototype.createSavedStateRestorePrecheckResult = function (canRestore, shouldClearSavedState) {
  return {
    canRestore: !!canRestore,
    shouldClearSavedState: !!shouldClearSavedState
  };
};

GameManager.prototype.resolveSavedStateRestorePrecheck = function (saved) {
  if (!saved || typeof saved !== "object") {
    return this.createSavedStateRestorePrecheckResult(false, true);
  }
  if (Number(saved.v) !== GameManager.SAVED_GAME_STATE_VERSION) {
    return this.createSavedStateRestorePrecheckResult(false, true);
  }
  if (!!saved.terminated) {
    return this.createSavedStateRestorePrecheckResult(false, true);
  }
  if (!!(saved.over || (saved.won && !saved.keep_playing)) && saved.mode_key !== "practice_legacy") {
    return this.createSavedStateRestorePrecheckResult(false, true);
  }
  if (saved.mode_key !== this.modeKey) {
    return this.createSavedStateRestorePrecheckResult(false, false);
  }
  if (Number(saved.board_width) !== this.width || Number(saved.board_height) !== this.height) {
    return this.createSavedStateRestorePrecheckResult(false, true);
  }
  if (!!saved.ruleset && saved.ruleset !== this.ruleset) {
    return this.createSavedStateRestorePrecheckResult(false, true);
  }
  if (!Array.isArray(saved.board) || saved.board.length !== this.height) {
    return this.createSavedStateRestorePrecheckResult(false, true);
  }
  return this.createSavedStateRestorePrecheckResult(true, false);
};

GameManager.prototype.applyRestoredSavedOutcomeFields = function (saved) {
  this.score = Number.isInteger(saved.score) && saved.score >= 0 ? saved.score : 0;
  this.over = !!saved.over;
  this.won = !!saved.won;
  this.keepPlaying = !!saved.keep_playing;
};

GameManager.prototype.applyRestoredSavedSeedFields = function (saved) {
  this.initialSeed = Number.isFinite(saved.initial_seed) ? Number(saved.initial_seed) : this.initialSeed;
  this.seed = Number.isFinite(saved.seed) ? Number(saved.seed) : this.initialSeed;
};

GameManager.prototype.applyRestoredSavedHistoryFields = function (saved) {
  this.moveHistory = Array.isArray(saved.move_history) ? saved.move_history.slice() : [];
  this.ipsInputCount = Number.isInteger(saved.ips_input_count) && saved.ips_input_count >= 0
    ? saved.ips_input_count
    : this.moveHistory.length;
  this.undoStack = Array.isArray(saved.undo_stack) ? saved.undo_stack.slice() : [];
};

GameManager.prototype.applyRestoredSavedReplayFields = function (saved) {
  this.replayCompactLog = typeof saved.replay_compact_log === "string" ? saved.replay_compact_log : "";
  this.sessionReplayV3 = saved.session_replay_v3 && typeof saved.session_replay_v3 === "object"
    ? this.clonePlain(saved.session_replay_v3)
    : this.sessionReplayV3;
};

GameManager.prototype.applyRestoredSavedSpawnFields = function (saved) {
  this.spawnValueCounts = saved.spawn_value_counts && typeof saved.spawn_value_counts === "object"
    ? this.clonePlain(saved.spawn_value_counts)
    : {};
  this.spawnTwos = this.spawnValueCounts["2"] || 0;
  this.spawnFours = this.spawnValueCounts["4"] || 0;
};

GameManager.prototype.applyRestoredSavedCappedFields = function (saved) {
  this.reached32k = !!saved.reached_32k;
  this.cappedMilestoneCount = Number.isInteger(saved.capped_milestone_count) ? saved.capped_milestone_count : 0;
  this.capped64Unlocked = saved.capped64_unlocked && typeof saved.capped64_unlocked === "object"
    ? this.clonePlain(saved.capped64_unlocked)
    : this.capped64Unlocked;
};

GameManager.prototype.applyRestoredSavedCounterFields = function (saved) {
  this.comboStreak = Number.isInteger(saved.combo_streak) ? saved.combo_streak : 0;
  this.successfulMoveCount = Number.isInteger(saved.successful_move_count) ? saved.successful_move_count : 0;
  this.undoUsed = Number.isInteger(saved.undo_used) ? saved.undo_used : 0;
};

GameManager.prototype.applyRestoredSavedDirectionLockFields = function (saved) {
  this.lockConsumedAtMoveCount = Number.isInteger(saved.lock_consumed_at_move_count) ? saved.lock_consumed_at_move_count : -1;
  this.lockedDirectionTurn = Number.isInteger(saved.locked_direction_turn) ? saved.locked_direction_turn : null;
  this.lockedDirection = Number.isInteger(saved.locked_direction) ? saved.locked_direction : null;
};

GameManager.prototype.applyRestoredSavedChallengeField = function (saved) {
  this.challengeId = typeof saved.challenge_id === "string" && saved.challenge_id ? saved.challenge_id : null;
};

GameManager.prototype.applyRestoredSavedTimerFields = function (saved) {
  this.hasGameStarted = !!saved.has_game_started;
  this.accumulatedTime = Number.isFinite(saved.duration_ms) && saved.duration_ms >= 0 ? Math.floor(saved.duration_ms) : 0;
  this.time = this.accumulatedTime;
  this.startTime = null;
  this.timerStatus = 0;
};

GameManager.prototype.resetRestoredSavedSessionSubmitState = function () {
  this.sessionSubmitDone = false;
};

GameManager.prototype.applyRestoredSavedStateCoreFields = function (saved) {
  this.applyRestoredSavedOutcomeFields(saved);
  this.applyRestoredSavedSeedFields(saved);
  this.applyRestoredSavedHistoryFields(saved);
  this.applyRestoredSavedReplayFields(saved);
  this.applyRestoredSavedSpawnFields(saved);
  this.applyRestoredSavedCappedFields(saved);
  this.applyRestoredSavedCounterFields(saved);
  this.applyRestoredSavedDirectionLockFields(saved);
  this.applyRestoredSavedChallengeField(saved);
  this.applyRestoredSavedTimerFields(saved);
  this.resetRestoredSavedSessionSubmitState();
};

GameManager.prototype.resolveRestoredInitialBoardMatrix = function (saved) {
  if (Array.isArray(saved.initial_board_matrix) && saved.initial_board_matrix.length === this.height) {
    return this.cloneBoardMatrix(saved.initial_board_matrix);
  }
  return this.getFinalBoardMatrix();
};

GameManager.prototype.resolveRestoredReplayStartBoardMatrix = function (saved) {
  if (Array.isArray(saved.replay_start_board_matrix) && saved.replay_start_board_matrix.length === this.height) {
    return this.cloneBoardMatrix(saved.replay_start_board_matrix);
  }
  return this.cloneBoardMatrix(this.initialBoardMatrix);
};

GameManager.prototype.resolveRestoredPracticeRestartBoardMatrix = function (saved) {
  if (Array.isArray(saved.practice_restart_board_matrix) && saved.practice_restart_board_matrix.length === this.height) {
    return this.cloneBoardMatrix(saved.practice_restart_board_matrix);
  }
  return null;
};

GameManager.prototype.resolveRestoredPracticeRestartModeConfig = function (saved) {
  if (saved.practice_restart_mode_config && typeof saved.practice_restart_mode_config === "object") {
    return this.clonePlain(saved.practice_restart_mode_config);
  }
  return null;
};

GameManager.prototype.applyRestoredSavedBoardSnapshots = function (saved) {
  this.initialBoardMatrix = this.resolveRestoredInitialBoardMatrix(saved);
  this.replayStartBoardMatrix = this.resolveRestoredReplayStartBoardMatrix(saved);
  this.practiceRestartBoardMatrix = this.resolveRestoredPracticeRestartBoardMatrix(saved);
  this.practiceRestartModeConfig = this.resolveRestoredPracticeRestartModeConfig(saved);
};

GameManager.prototype.resolveRestoredTimerModuleView = function (saved) {
  return saved.timer_module_view === "hidden" ? "hidden" : "timer";
};

GameManager.prototype.applyRestoredTimerModuleView = function (saved) {
  this.timerModuleView = this.resolveRestoredTimerModuleView(saved);
};

GameManager.prototype.renderRestoredMainTimerText = function () {
  var timerEl = document.getElementById("timer");
  if (timerEl) timerEl.textContent = this.pretty(this.accumulatedTime);
};

GameManager.prototype.shouldResumeTimerAfterStateRestore = function (saved) {
  return !this.over && !this.won && saved.timer_status === 1;
};

GameManager.prototype.resumeTimerAfterStateRestoreIfNeeded = function (saved) {
  if (!this.shouldResumeTimerAfterStateRestore(saved)) return;
  this.startTimer();
};

GameManager.prototype.applyRestoredSavedTimerUiState = function (saved) {
  this.restoreTimerRowsFromState(saved);
  this.applyRestoredTimerModuleView(saved);
  this.renderRestoredMainTimerText();
  this.resumeTimerAfterStateRestoreIfNeeded(saved);
};

GameManager.prototype.tryApplyRestoredSavedBoard = function (saved) {
  try {
    this.setBoardFromMatrix(saved.board);
    return true;
  } catch (_err) {
    return false;
  }
};

GameManager.prototype.resolveRestorableSavedState = function () {
  var candidates = [
    this.readSavedPayloadByKey(this.resolveSavedGameStateStorageKey(GameManager.SAVED_GAME_STATE_KEY_PREFIX)),
    this.readSavedPayloadByKey(this.resolveSavedGameStateStorageKey(GameManager.SAVED_GAME_STATE_LITE_KEY_PREFIX)),
    this.readWindowNameSavedPayload(this.modeKey)
  ];
  var saved = null;
  for (var i = 0; i < candidates.length; i++) {
    var nextCandidate = candidates[i];
    if (!nextCandidate || typeof nextCandidate !== "object") continue;
    if (!saved || typeof saved !== "object") {
      saved = nextCandidate;
      continue;
    }
    var bestAt = Number(saved.saved_at) || 0;
    var nextAt = Number(nextCandidate.saved_at) || 0;
    // Keep the first candidate when timestamps are equal (full > lite > window).
    // This avoids downgrading to lite/window snapshots that may omit replay history.
    if (nextAt > bestAt) saved = nextCandidate;
  }
  if (!saved) return null;
  var precheck = this.resolveSavedStateRestorePrecheck(saved);
  if (!precheck.canRestore) {
    if (precheck.shouldClearSavedState) this.clearSavedGameState();
    return null;
  }
  return saved;
};

GameManager.prototype.handleFailedSavedBoardRestore = function () {
  this.clearSavedGameState();
  return false;
};

GameManager.prototype.applyRestoredSavedState = function (saved) {
  this.applyRestoredSavedStateCoreFields(saved);
  this.applyRestoredSavedBoardSnapshots(saved);
  this.applyRestoredSavedTimerUiState(saved);
};

GameManager.prototype.tryApplyRestorableSavedState = function (saved) {
  if (!saved) return false;
  if (!this.tryApplyRestoredSavedBoard(saved)) {
    return this.handleFailedSavedBoardRestore();
  }
  this.applyRestoredSavedState(saved);
  return true;
};

GameManager.prototype.tryRestoreSavedGameState = function () {
  if (!this.shouldUseSavedGameState()) return false;
  return this.tryApplyRestorableSavedState(this.resolveRestorableSavedState());
};

GameManager.prototype.saveGameState = function (options) {
  options = options || {};
  var now = Date.now();
  if (!this.shouldUseSavedGameState()) return;
  if (this.isSessionTerminated() && this.modeKey !== "practice_legacy") {
    this.clearSavedGameState();
    return;
  }
  if (this.shouldSkipSaveGameStateByThrottle(options, now)) return;

  var payload = this.buildSavedGameStatePayload(now);
  try {
    var persistResult = this.persistSavedGameStatePayload(payload);
    if (!persistResult) return;
    this.lastSavedGameStateAt = now;
  } catch (_err) {}
};

GameManager.prototype.createSavedGameStatePersistWritesResult = function (persisted, litePersisted) {
  return {
    persisted: !!persisted,
    litePersisted: !!litePersisted
  };
};

GameManager.prototype.persistSavedGameStatePayload = function (payload) {
  var key = this.resolveSavedGameStateStorageKey(GameManager.SAVED_GAME_STATE_KEY_PREFIX);
  var liteKey = this.resolveSavedGameStateStorageKey(GameManager.SAVED_GAME_STATE_LITE_KEY_PREFIX);
  var litePayload = this.buildLiteSavedGameStatePayload(payload);
  this.writeWindowNameSavedPayload(this.modeKey, litePayload);
  var persisted = this.writeSavedGameStatePayload(key, payload);
  if (!persisted) {
    persisted = this.writeSavedGameStatePayload(key, litePayload);
  }
  var litePersisted = this.writeSavedGameStatePayload(liteKey, litePayload);
  var persistWrites = this.createSavedGameStatePersistWritesResult(persisted, litePersisted);
  if (!persistWrites.persisted && !persistWrites.litePersisted) {
    this.clearSavedGameState(this.modeKey);
    var persistedAfterQuotaFallback = this.writeSavedGameStatePayload(key, litePayload);
    var litePersistedAfterQuotaFallback = this.writeSavedGameStatePayload(liteKey, litePayload);
    persistWrites = this.createSavedGameStatePersistWritesResult(
      persistedAfterQuotaFallback,
      litePersistedAfterQuotaFallback
    );
  }
  return !!(persistWrites.persisted || persistWrites.litePersisted);
};

GameManager.prototype.resolveTimerSubStateSnapshot = function () {
  return {
    timer_sub_8192: (document.getElementById("timer8192-sub") || {}).textContent || "",
    timer_sub_16384: (document.getElementById("timer16384-sub") || {}).textContent || "",
    timer_sub_visible: (((document.getElementById("timer32k-sub-container") || {}).style) || {}).display === "block"
  };
};

GameManager.prototype.resolveSavedGameStateReplaySnapshot = function () {
  return {
    move_history: this.moveHistory ? this.moveHistory.slice() : [],
    ips_input_count: Number.isInteger(this.ipsInputCount) && this.ipsInputCount >= 0 ? this.ipsInputCount : 0,
    undo_stack: this.undoStack ? this.safeClonePlain(this.undoStack, []) : [],
    replay_compact_log: this.replayCompactLog || "",
    session_replay_v3: this.sessionReplayV3 ? this.safeClonePlain(this.sessionReplayV3, null) : null
  };
};

GameManager.prototype.resolveSavedGameStateTimerSnapshot = function () {
  return {
    timer_status: this.timerStatus === 1 ? 1 : 0,
    duration_ms: this.getDurationMs(),
    has_game_started: !!this.hasGameStarted
  };
};

GameManager.prototype.buildSavedGameStateBaseReplayPayload = function (replaySnapshot) {
  return {
    move_history: replaySnapshot.move_history,
    ips_input_count: replaySnapshot.ips_input_count,
    undo_stack: replaySnapshot.undo_stack,
    replay_compact_log: replaySnapshot.replay_compact_log,
    session_replay_v3: replaySnapshot.session_replay_v3
  };
};

GameManager.prototype.buildSavedGameStateBaseTimerPayload = function (timerSnapshot) {
  return {
    timer_status: timerSnapshot.timer_status,
    duration_ms: timerSnapshot.duration_ms,
    has_game_started: timerSnapshot.has_game_started
  };
};

GameManager.prototype.buildSavedGameStateBaseCorePayload = function (savedAt) {
  return {
    v: GameManager.SAVED_GAME_STATE_VERSION,
    saved_at: savedAt,
    terminated: false,
    mode_key: this.modeKey,
    board_width: this.width,
    board_height: this.height,
    ruleset: this.ruleset,
    board: this.getFinalBoardMatrix(),
    score: this.score,
    over: this.over,
    won: this.won,
    keep_playing: this.keepPlaying,
    initial_seed: this.initialSeed,
    seed: this.seed,
    spawn_value_counts: this.spawnValueCounts ? this.safeClonePlain(this.spawnValueCounts, {}) : {},
    reached_32k: !!this.reached32k,
    capped_milestone_count: Number.isInteger(this.cappedMilestoneCount) ? this.cappedMilestoneCount : 0,
    capped64_unlocked: this.capped64Unlocked ? this.safeClonePlain(this.capped64Unlocked, null) : null
  };
};

GameManager.prototype.buildSavedGameStateBasePayload = function (savedAt, replaySnapshot, timerSnapshot) {
  return Object.assign(
    this.buildSavedGameStateBaseCorePayload(savedAt),
    this.buildSavedGameStateBaseReplayPayload(replaySnapshot),
    this.buildSavedGameStateBaseTimerPayload(timerSnapshot)
  );
};

GameManager.prototype.resolveSavedBoardRestartSnapshot = function () {
  return {
    initial_board_matrix: this.initialBoardMatrix ? this.cloneBoardMatrix(this.initialBoardMatrix) : this.getFinalBoardMatrix(),
    replay_start_board_matrix: this.replayStartBoardMatrix ? this.cloneBoardMatrix(this.replayStartBoardMatrix) : null,
    practice_restart_board_matrix: this.practiceRestartBoardMatrix ? this.cloneBoardMatrix(this.practiceRestartBoardMatrix) : null,
    practice_restart_mode_config: this.practiceRestartModeConfig ? this.safeClonePlain(this.practiceRestartModeConfig, null) : null
  };
};

GameManager.prototype.resolveSavedDirectionLockSnapshot = function () {
  return {
    lock_consumed_at_move_count: Number.isInteger(this.lockConsumedAtMoveCount) ? this.lockConsumedAtMoveCount : -1,
    locked_direction_turn: Number.isInteger(this.lockedDirectionTurn) ? this.lockedDirectionTurn : null,
    locked_direction: Number.isInteger(this.lockedDirection) ? this.lockedDirection : null
  };
};

GameManager.prototype.buildSavedGameStateExtendedDirectionLockPayload = function (directionLockSnapshot) {
  return {
    lock_consumed_at_move_count: directionLockSnapshot.lock_consumed_at_move_count,
    locked_direction_turn: directionLockSnapshot.locked_direction_turn,
    locked_direction: directionLockSnapshot.locked_direction
  };
};

GameManager.prototype.buildSavedGameStateExtendedBoardSnapshotPayload = function (boardSnapshot) {
  return {
    initial_board_matrix: boardSnapshot.initial_board_matrix,
    replay_start_board_matrix: boardSnapshot.replay_start_board_matrix,
    practice_restart_board_matrix: boardSnapshot.practice_restart_board_matrix,
    practice_restart_mode_config: boardSnapshot.practice_restart_mode_config
  };
};

GameManager.prototype.buildSavedGameStateExtendedTimerPayload = function (timerSubState) {
  return {
    timer_module_view: this.getTimerModuleViewMode ? this.getTimerModuleViewMode() : "timer",
    timer_fixed_rows: this.captureTimerFixedRowsState(),
    timer_dynamic_rows_capped: this.captureTimerDynamicRowsState("capped-timer-container"),
    timer_dynamic_rows_overflow: this.captureTimerDynamicRowsState("capped-timer-overflow-container"),
    timer_sub_8192: timerSubState.timer_sub_8192,
    timer_sub_16384: timerSubState.timer_sub_16384,
    timer_sub_visible: timerSubState.timer_sub_visible
  };
};

GameManager.prototype.buildSavedGameStateExtendedPayload = function (timerSubState) {
  var boardSnapshot = this.resolveSavedBoardRestartSnapshot();
  var directionLockSnapshot = this.resolveSavedDirectionLockSnapshot();
  return Object.assign({
    combo_streak: Number.isInteger(this.comboStreak) ? this.comboStreak : 0,
    successful_move_count: Number.isInteger(this.successfulMoveCount) ? this.successfulMoveCount : 0,
    undo_used: Number.isInteger(this.undoUsed) ? this.undoUsed : 0,
    challenge_id: this.challengeId || null
  },
  this.buildSavedGameStateExtendedDirectionLockPayload(directionLockSnapshot),
  this.buildSavedGameStateExtendedBoardSnapshotPayload(boardSnapshot),
  this.buildSavedGameStateExtendedTimerPayload(timerSubState));
};

GameManager.prototype.buildSavedGameStatePayload = function (savedAt) {
  var timerSubState = this.resolveTimerSubStateSnapshot();
  var replaySnapshot = this.resolveSavedGameStateReplaySnapshot();
  var timerSnapshot = this.resolveSavedGameStateTimerSnapshot();
  var basePayload = this.buildSavedGameStateBasePayload(savedAt, replaySnapshot, timerSnapshot);
  var extendedPayload = this.buildSavedGameStateExtendedPayload(timerSubState);
  return Object.assign(basePayload, extendedPayload);
};

GameManager.prototype.shouldSkipSaveGameStateByThrottle = function (options, now) {
  return !options.force && this.lastSavedGameStateAt && now - this.lastSavedGameStateAt < 150;
};

GameManager.prototype.appendCompactMoveCode = function (rawCode) {
  var appendCompactMoveCodeCore = this.callCoreReplayCodecRuntime(
    "appendCompactMoveCode",
    [{
      log: this.replayCompactLog,
      rawCode: rawCode
    }]
  );
  if (this.tryHandleCoreRawValue(appendCompactMoveCodeCore, function (coreValue) {
    this.replayCompactLog = coreValue;
  })) {
    return;
  }
  if (!Number.isInteger(rawCode) || rawCode < 0 || rawCode > 127) throw "Invalid move code";
  if (rawCode < 127) {
    this.replayCompactLog += this.encodeReplay128(rawCode);
    return;
  }
  this.replayCompactLog += this.encodeReplay128(127) + this.encodeReplay128(0);
};

GameManager.prototype.appendCompactUndo = function () {
  var appendCompactUndoCore = this.callCoreReplayCodecRuntime(
    "appendCompactUndo",
    [this.replayCompactLog]
  );
  if (this.tryHandleCoreRawValue(appendCompactUndoCore, function (coreValue) {
    this.replayCompactLog = coreValue;
  })) {
    return;
  }
  this.replayCompactLog += this.encodeReplay128(127) + this.encodeReplay128(1);
};

GameManager.prototype.appendCompactPracticeAction = function (x, y, value) {
  var appendCompactPracticeActionCore = this.callCoreReplayCodecRuntime(
    "appendCompactPracticeAction",
    [{
      log: this.replayCompactLog,
      width: this.width,
      height: this.height,
      x: x,
      y: y,
      value: value
    }]
  );
  if (this.tryHandleCoreRawValue(appendCompactPracticeActionCore, function (coreValue) {
    this.replayCompactLog = coreValue;
  })) {
    return;
  }
  this.assertCompactPracticeBoardSupported();
  this.assertCompactPracticeCoords(x, y);
  var exp = this.resolveCompactPracticeValueExponent(value);
  var cell = (x << 2) | y;
  this.appendCompactPracticePrefix();
  this.appendCompactPracticeEncodedCellAndExponent(cell, exp);
};

GameManager.prototype.assertCompactPracticeBoardSupported = function () {
  if (this.width !== 4 || this.height !== 4) throw "Compact practice replay only supports 4x4";
};

GameManager.prototype.assertCompactPracticeCoords = function (x, y) {
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || x > 3 || y < 0 || y > 3) {
    throw "Invalid practice coords";
  }
};

GameManager.prototype.assertCompactPracticeValue = function (value) {
  if (!Number.isInteger(value) || value < 0) throw "Invalid practice value";
};

GameManager.prototype.resolveCompactPracticeValueExponent = function (value) {
  this.assertCompactPracticeValue(value);
  if (value === 0) return 0;
  var lg = Math.log(value) / Math.log(2);
  if (Math.floor(lg) !== lg) throw "Practice value must be power of two";
  if (lg < 0 || lg > 127) throw "Practice value exponent too large";
  return lg;
};

GameManager.prototype.appendCompactPracticePrefix = function () {
  this.replayCompactLog += this.encodeReplay128(127) + this.encodeReplay128(2);
};

GameManager.prototype.appendCompactPracticeEncodedCellAndExponent = function (cell, exp) {
  this.replayCompactLog += this.encodeReplay128(cell) + this.encodeReplay128(exp);
};

GameManager.prototype.resolveDetectedModeBodyModeAttr = function () {
  if (typeof document === "undefined" || !document.body) return "";
  return document.body.getAttribute("data-mode-id") || "";
};

GameManager.prototype.detectModeFromPathname = function (path) {
  if (path.indexOf("undo_2048") !== -1) return "classic_4x4_pow2_undo";
  if (path.indexOf("Practice_board") !== -1) return "practice_legacy";
  if (path.indexOf("capped_2048") !== -1) return "capped_4x4_pow2_no_undo";
  if (path === "/" || /\/$/.test(path) || path.indexOf("/index.html") !== -1 || path.indexOf("index.html") !== -1) {
    return "standard_4x4_pow2_no_undo";
  }
  return "classic_4x4_pow2_undo";
};

GameManager.prototype.detectMode = function () {
  var bodyMode = this.resolveDetectedModeBodyModeAttr();
  var pathname = this.resolveWindowPathname();
  var resolveDetectedModeCore = this.callCoreModeRuntime(
    "resolveDetectedMode",
    [{
      existingMode: this.mode,
      bodyMode: bodyMode,
      pathname: pathname,
      defaultModeKey: GameManager.DEFAULT_MODE_KEY
    }]
  );
  return this.resolveCoreStringCallOrFallback(resolveDetectedModeCore, function () {
    if (this.mode) return this.mode;
    var bodyMode = this.resolveDetectedModeBodyModeAttr() || null;
    if (bodyMode) return bodyMode;
    var pathname = this.resolveWindowPathname();
    if (!pathname) return GameManager.DEFAULT_MODE_KEY;
    return this.detectModeFromPathname(pathname);
  });
};

GameManager.prototype.clonePlain = function (value) {
  return JSON.parse(JSON.stringify(value));
};

GameManager.prototype.safeClonePlain = function (value, fallback) {
  try {
    return this.clonePlain(value);
  } catch (_err) {
    return fallback;
  }
};

GameManager.prototype.serializeSavedGameStatePayload = function (payloadObj) {
  try {
    return JSON.stringify(payloadObj);
  } catch (_errJson) {
    return null;
  }
};

GameManager.prototype.writeSerializedSavedPayloadToStorages = function (stores, key, serializedPayload) {
  if (!stores || stores.length === 0) return false;
  if (typeof serializedPayload !== "string") return false;
  for (var i = 0; i < stores.length; i++) {
    try {
      stores[i].setItem(key, serializedPayload);
      return true;
    } catch (_errStore) {}
  }
  return false;
};

GameManager.prototype.normalizeWriteSavedPayloadToStoragesCoreValue = function (persistedByCore) {
  if (typeof persistedByCore === "boolean") return persistedByCore;
  return undefined;
};

GameManager.prototype.writeSavedGameStatePayload = function (key, payloadObj) {
  var stores = this.getSavedGameStateStorages();
  var writeSavedPayloadToStoragesCore = this.callCoreStorageRuntime(
    "writeSavedPayloadToStorages",
    [{
      storages: stores,
      key: key,
      payload: payloadObj
    }]
  );
  var normalizedByCore = this.resolveNormalizedCoreValueOrUndefined(
    writeSavedPayloadToStoragesCore,
    this.normalizeWriteSavedPayloadToStoragesCoreValue
  );
  if (typeof normalizedByCore !== "undefined") return normalizedByCore;
  var serialized = this.serializeSavedGameStatePayload(payloadObj);
  return this.writeSerializedSavedPayloadToStorages(stores, key, serialized);
};

GameManager.prototype.resolveLiteSavedInitialBoardMatrix = function (payload) {
  if (Array.isArray(payload.initial_board_matrix)) {
    return this.cloneBoardMatrix(payload.initial_board_matrix);
  }
  return this.initialBoardMatrix ? this.cloneBoardMatrix(this.initialBoardMatrix) : this.getFinalBoardMatrix();
};

GameManager.prototype.resolveLiteSavedReplayStartBoardMatrix = function (payload) {
  if (Array.isArray(payload.replay_start_board_matrix)) {
    return this.cloneBoardMatrix(payload.replay_start_board_matrix);
  }
  return this.replayStartBoardMatrix ? this.cloneBoardMatrix(this.replayStartBoardMatrix) : null;
};

GameManager.prototype.resolveLiteSavedPracticeRestartBoardMatrix = function (payload) {
  if (Array.isArray(payload.practice_restart_board_matrix)) {
    return this.cloneBoardMatrix(payload.practice_restart_board_matrix);
  }
  return this.practiceRestartBoardMatrix ? this.cloneBoardMatrix(this.practiceRestartBoardMatrix) : null;
};

GameManager.prototype.resolveLiteSavedPracticeRestartModeConfig = function (payload) {
  if (payload.practice_restart_mode_config) {
    return this.safeClonePlain(payload.practice_restart_mode_config, null);
  }
  return this.practiceRestartModeConfig ? this.safeClonePlain(this.practiceRestartModeConfig, null) : null;
};

GameManager.prototype.buildLiteSavedGameStatePayload = function (payload) {
  var buildLiteSavedGameStatePayloadCore = this.callCoreStorageRuntime(
    "buildLiteSavedGameStatePayload",
    [{
      payload: payload,
      savedStateVersion: GameManager.SAVED_GAME_STATE_VERSION,
      modeKey: this.modeKey,
      width: this.width,
      height: this.height,
      ruleset: this.ruleset,
      score: this.score,
      initialSeed: this.initialSeed,
      seed: this.seed,
      durationMs: this.getDurationMs(),
      finalBoardMatrix: this.getFinalBoardMatrix(),
      initialBoardMatrix: this.initialBoardMatrix,
      replayStartBoardMatrix: this.replayStartBoardMatrix,
      practiceRestartBoardMatrix: this.practiceRestartBoardMatrix,
      practiceRestartModeConfig: this.practiceRestartModeConfig
    }]
  );
  var normalizedByCore = this.resolveNormalizedCoreValueOrUndefined(
    buildLiteSavedGameStatePayloadCore,
    function (litePayloadByCore) {
      return this.isNonArrayObject(litePayloadByCore) ? litePayloadByCore : null;
    }
  );
  if (normalizedByCore) return normalizedByCore;

  if (!payload || typeof payload !== "object") return null;
  return Object.assign(
    {},
    {
      v: GameManager.SAVED_GAME_STATE_VERSION,
      saved_at: Number(payload.saved_at) || Date.now(),
      terminated: false,
      mode_key: payload.mode_key || this.modeKey,
      board_width: Number(payload.board_width) || this.width,
      board_height: Number(payload.board_height) || this.height,
      ruleset: payload.ruleset || this.ruleset
    },
    {
      reached_32k: !!payload.reached_32k,
      capped_milestone_count: Number.isInteger(payload.capped_milestone_count) ? payload.capped_milestone_count : 0,
      capped64_unlocked: null,
      combo_streak: Number.isInteger(payload.combo_streak) ? payload.combo_streak : 0,
      successful_move_count: Number.isInteger(payload.successful_move_count) ? payload.successful_move_count : 0,
      undo_used: Number.isInteger(payload.undo_used) ? payload.undo_used : 0,
      lock_consumed_at_move_count: Number.isInteger(payload.lock_consumed_at_move_count) ? payload.lock_consumed_at_move_count : -1,
      locked_direction_turn: Number.isInteger(payload.locked_direction_turn) ? payload.locked_direction_turn : null,
      locked_direction: Number.isInteger(payload.locked_direction) ? payload.locked_direction : null,
      challenge_id: payload.challenge_id || null
    },
    {
      initial_board_matrix: this.resolveLiteSavedInitialBoardMatrix(payload),
      replay_start_board_matrix: this.resolveLiteSavedReplayStartBoardMatrix(payload),
      practice_restart_board_matrix: this.resolveLiteSavedPracticeRestartBoardMatrix(payload),
      practice_restart_mode_config: this.resolveLiteSavedPracticeRestartModeConfig(payload)
    },
    {
      move_history: [],
      undo_stack: [],
      replay_compact_log: "",
      session_replay_v3: null,
      spawn_value_counts: {}
    }
  );
};

GameManager.prototype.getModeConfigFromCatalog = function (modeKey) {
  var modeCatalogGetMode = this.resolveWindowNamespaceMethod("ModeCatalog", "getMode");
  var catalogGetMode = modeCatalogGetMode
    ? function (requestedModeId) {
        return modeCatalogGetMode.method.call(modeCatalogGetMode.scope, requestedModeId);
      }
    : null;

  var resolveModeCatalogConfigCore = this.callCoreModeRuntime(
    "resolveModeCatalogConfig",
    [{
      modeId: modeKey,
      catalogGetMode: catalogGetMode,
      fallbackModeConfigs: GameManager.FALLBACK_MODE_CONFIGS
    }]
  );
  return this.resolveNormalizedCoreValueOrFallbackAllowNull(resolveModeCatalogConfigCore, function (coreValue) {
    if (coreValue === null) return null;
    return this.isNonArrayObject(coreValue) ? coreValue : undefined;
  }, function () {
    if (catalogGetMode) {
      return catalogGetMode(modeKey);
    }
    if (GameManager.FALLBACK_MODE_CONFIGS[modeKey]) {
      return this.clonePlain(GameManager.FALLBACK_MODE_CONFIGS[modeKey]);
    }
    return null;
  });
};

GameManager.prototype.getCoreRuntimeByName = function (runtimeName) {
  var windowLike = this.getWindowLike();
  if (!windowLike || typeof windowLike !== "object") return null;
  if (!(typeof runtimeName === "string" && runtimeName)) return null;
  var core = windowLike[runtimeName];
  return core && typeof core === "object" ? core : null;
};

GameManager.prototype.wrapCoreRuntimeMethod = function (runtime, methodName) {
  if (!runtime || typeof runtime !== "object") return null;
  var runtimeMethod = runtime[methodName];
  if (typeof runtimeMethod !== "function") return null;
  return function () {
    return runtimeMethod.apply(runtime, arguments);
  };
};

GameManager.prototype.resolveCoreRuntimeMethod = function (runtimeGetterName, methodName) {
  if (!(typeof runtimeGetterName === "string" && runtimeGetterName)) return null;
  if (!(typeof methodName === "string" && methodName)) return null;
  var runtimeGetter = this[runtimeGetterName];
  if (typeof runtimeGetter !== "function") return null;
  var runtime = runtimeGetter.call(this);
  return this.wrapCoreRuntimeMethod(runtime, methodName);
};

function registerCoreRuntimeMethodResolver(methodName, runtimeGetterName) {
  GameManager.prototype[methodName] = function (coreMethodName) {
    return this.resolveCoreRuntimeMethod(runtimeGetterName, coreMethodName);
  };
}

function registerCoreRuntimeGetter(methodName, runtimeName) {
  GameManager.prototype[methodName] = function () {
    return this.getCoreRuntimeByName(runtimeName);
  };
}

function isValidCoreRuntimeAccessorDef(accessorDef) {
  return !!(Array.isArray(accessorDef) && accessorDef.length >= 4);
}

function registerCoreRuntimeAccessors(accessorDefs) {
  if (!Array.isArray(accessorDefs)) return;
  for (var index = 0; index < accessorDefs.length; index++) {
    var accessorDef = accessorDefs[index];
    if (!isValidCoreRuntimeAccessorDef(accessorDef)) continue;
    var callerMethodName = accessorDef[0];
    var resolverMethodName = accessorDef[1];
    var getterMethodName = accessorDef[2];
    var runtimeName = accessorDef[3];
    registerCoreRuntimeGetter(getterMethodName, runtimeName);
    registerCoreRuntimeMethodResolver(resolverMethodName, getterMethodName);
    registerCoreRuntimeCaller(callerMethodName, resolverMethodName);
  }
}

registerCoreRuntimeAccessors(GAME_MANAGER_CORE_RUNTIME_ACCESSOR_DEFS);

GameManager.prototype.resolveModePolicyContext = function (mode) {
  var targetMode = mode || this.mode;
  return {
    targetMode: targetMode,
    modeConfig: this.resolveModeConfig(targetMode)
  };
};

GameManager.prototype.hasOwnKey = function (target, key) {
  if (!target || (typeof target !== "object" && typeof target !== "function")) return false;
  return Object.prototype.hasOwnProperty.call(target, key);
};

GameManager.prototype.readOptionValue = function (options, key, fallbackValue) {
  if (!options || typeof options !== "object") return fallbackValue;
  return this.hasOwnKey(options, key) ? options[key] : fallbackValue;
};

GameManager.prototype.resolveUndoPolicyOptionSnapshot = function (options) {
  var source = options;
  return {
    hasGameStarted: !!this.readOptionValue(source, "hasGameStarted", !!this.hasGameStarted),
    replayMode: !!this.readOptionValue(source, "replayMode", !!this.replayMode),
    undoLimit: this.readOptionValue(source, "undoLimit", this.undoLimit),
    undoUsed: this.readOptionValue(source, "undoUsed", this.undoUsed),
    undoEnabled: this.readOptionValue(source, "undoEnabled", this.undoEnabled)
  };
};

GameManager.prototype.resolveUndoPolicyStateForMode = function (mode, options) {
  var context = this.resolveModePolicyContext(mode);
  var optionsSnapshot = this.resolveUndoPolicyOptionSnapshot(options);

  var resolveUndoPolicyStateCore = this.callCoreModeRuntime(
    "resolveUndoPolicyState",
    [{
      mode: context.targetMode,
      modeConfig: context.modeConfig,
      hasGameStarted: optionsSnapshot.hasGameStarted,
      replayMode: optionsSnapshot.replayMode,
      undoLimit: optionsSnapshot.undoLimit,
      undoUsed: optionsSnapshot.undoUsed,
      undoEnabled: optionsSnapshot.undoEnabled
    }]
  );
  var undoPolicyStateByCore = this.resolveNormalizedCoreValueOrUndefined(
    resolveUndoPolicyStateCore,
    function (computed) {
      return computed && typeof computed === "object" ? computed : null;
    }
  );
  if (typeof undoPolicyStateByCore !== "undefined") {
    var normalizedCore = undoPolicyStateByCore;
    if (normalizedCore) return normalizedCore;
  }

  var modeCfg = context.modeConfig || null;
  var forcedUndoSetting = null;
  if (modeCfg && typeof modeCfg.undo_enabled === "boolean") {
    forcedUndoSetting = modeCfg.undo_enabled;
  } else {
    var modeId = (context.targetMode || "").toLowerCase();
    if (modeId === "capped" || modeId.indexOf("capped") !== -1) forcedUndoSetting = false;
    else if (modeId.indexOf("no_undo") !== -1 || modeId.indexOf("no-undo") !== -1) forcedUndoSetting = false;
    else if (modeId.indexOf("undo_only") !== -1 || modeId.indexOf("undo-only") !== -1) forcedUndoSetting = true;
  }
  var rawFallbackInput = {
    forcedUndoSetting: forcedUndoSetting,
    hasGameStarted: optionsSnapshot.hasGameStarted,
    replayMode: optionsSnapshot.replayMode,
    undoLimit: optionsSnapshot.undoLimit,
    undoUsed: optionsSnapshot.undoUsed,
    undoEnabled: optionsSnapshot.undoEnabled
  };
  var fallbackInput = {
    forcedUndoSetting: rawFallbackInput.forcedUndoSetting,
    hasGameStarted: !!rawFallbackInput.hasGameStarted,
    replayMode: !!rawFallbackInput.replayMode,
    undoLimit: rawFallbackInput.undoLimit,
    undoUsed: rawFallbackInput.undoUsed,
    undoEnabled: !!rawFallbackInput.undoEnabled
  };
  var isUndoAllowedByMode = fallbackInput.forcedUndoSetting !== false;
  var isUndoSettingFixedForMode = fallbackInput.forcedUndoSetting !== null;
  var canToggleUndoSetting =
    isUndoAllowedByMode &&
    !isUndoSettingFixedForMode &&
    !fallbackInput.hasGameStarted;
  var isUndoInteractionEnabled =
    !fallbackInput.replayMode &&
    !(fallbackInput.undoLimit !== null && Number(fallbackInput.undoUsed) >= Number(fallbackInput.undoLimit)) &&
    !!(fallbackInput.undoEnabled && isUndoAllowedByMode);
  return {
    forcedUndoSetting: fallbackInput.forcedUndoSetting,
    isUndoAllowedByMode: isUndoAllowedByMode,
    isUndoSettingFixedForMode: isUndoSettingFixedForMode,
    canToggleUndoSetting: canToggleUndoSetting,
    isUndoInteractionEnabled: isUndoInteractionEnabled
  };
};

GameManager.prototype.resolveLegacyAdapterBridgePayloadFromWindow = function () {
  var windowLike = this.getWindowLike();
  if (!windowLike || typeof windowLike !== "object") return null;
  var payload = windowLike.__legacyEngine;
  return payload && typeof payload === "object" ? payload : null;
};

GameManager.prototype.isValidLegacyAdapterBridgePayload = function (payload) {
  if (!payload || typeof payload !== "object") return false;
  return payload.manager === this;
};

GameManager.prototype.getLegacyAdapterBridge = function () {
  var payload = this.resolveLegacyAdapterBridgePayloadFromWindow();
  return this.isValidLegacyAdapterBridgePayload(payload) ? payload : null;
};

GameManager.prototype.resolveLegacyAdapterBridgeMethod = function (methodName) {
  var bridge = this.getLegacyAdapterBridge();
  if (!bridge || typeof methodName !== "string" || !methodName) return null;
  var method = bridge[methodName];
  if (typeof method !== "function") return null;
  return {
    bridge: bridge,
    method: method
  };
};

GameManager.prototype.getAdapterSessionParitySnapshot = function (readerMethodName, cacheFieldName) {
  var readerBridgeEntry = this.resolveLegacyAdapterBridgeMethod(readerMethodName);
  var bridge = readerBridgeEntry ? readerBridgeEntry.bridge : this.getLegacyAdapterBridge();
  if (!bridge) return null;
  if (readerBridgeEntry) {
    var snapshot = readerBridgeEntry.method.call(readerBridgeEntry.bridge);
    if (!snapshot || typeof snapshot !== "object") return null;
    var clonedSnapshot = this.safeClonePlain(snapshot, null);
    if (clonedSnapshot) {
      readerBridgeEntry.bridge[cacheFieldName] = clonedSnapshot;
    }
    return clonedSnapshot;
  }
  if (bridge[cacheFieldName] && typeof bridge[cacheFieldName] === "object") {
    return this.safeClonePlain(bridge[cacheFieldName], null);
  }
  return null;
};

GameManager.prototype.publishAdapterMoveResult = function (meta) {
  var emitMoveResultBridge = this.resolveLegacyAdapterBridgeMethod("emitMoveResult");
  if (!emitMoveResultBridge) return false;
  var bridge = emitMoveResultBridge.bridge;
  var timestamp = Date.now();
  var input = meta && typeof meta === "object" ? meta : {};
  var modeKey = typeof bridge.modeKey === "string" && bridge.modeKey
    ? bridge.modeKey
    : (this.modeKey || this.mode || "");
  var adapterMode = typeof bridge.adapterMode === "string" && bridge.adapterMode
    ? bridge.adapterMode
    : "legacy-bridge";
  var detail = {
    reason: typeof input.reason === "string" && input.reason ? input.reason : "move",
    direction: Number.isInteger(input.direction) ? input.direction : null,
    moved: input.moved === true,
    modeKey: modeKey,
    adapterMode: adapterMode,
    score: Number.isFinite(this.score) ? Number(this.score) : 0,
    over: !!this.over,
    won: !!this.won,
    replayMode: !!this.replayMode,
    successfulMoveCount:
      Number.isInteger(this.successfulMoveCount) && this.successfulMoveCount >= 0
        ? this.successfulMoveCount
        : 0,
    undoUsed: Number.isInteger(this.undoUsed) && this.undoUsed >= 0 ? this.undoUsed : 0,
    undoDepth: Array.isArray(this.undoStack) ? this.undoStack.length : 0,
    at: timestamp
  };
  emitMoveResultBridge.method.call(bridge, detail);

  var syncAdapterSnapshotBridge = this.resolveLegacyAdapterBridgeMethod("syncAdapterSnapshot");
  if (syncAdapterSnapshotBridge) {
    var snapshot = {
      adapterMode: adapterMode,
      modeKey: modeKey || "unknown",
      updatedAt: timestamp,
      lastMoveResult: detail
    };
    syncAdapterSnapshotBridge.method.call(bridge, snapshot);
    bridge.adapterSnapshot = snapshot;
  }

  var readAdapterParityReportBridge = this.resolveLegacyAdapterBridgeMethod("readAdapterParityReport");
  if (readAdapterParityReportBridge) {
    bridge.adapterParityReport = readAdapterParityReportBridge.method.call(bridge);
    var writeStoredAdapterParityReportBridge = this.resolveLegacyAdapterBridgeMethod("writeStoredAdapterParityReport");
    if (
      bridge.adapterParityReport &&
      writeStoredAdapterParityReportBridge
    ) {
      writeStoredAdapterParityReportBridge.method.call(
        bridge,
        bridge.adapterParityReport,
        bridge.adapterMode
      );
    }
  }

  var readAdapterParityABDiffBridge = this.resolveLegacyAdapterBridgeMethod("readAdapterParityABDiff");
  if (readAdapterParityABDiffBridge) {
    bridge.adapterParityABDiff = readAdapterParityABDiffBridge.method.call(bridge);
  }
  return true;
};

GameManager.prototype.planTileInteraction = function (cell, positions, next, mergedValue) {
  var planTileInteractionCore = this.callCoreMoveApplyRuntime(
    "planTileInteraction",
    [{
      cell: cell,
      farthest: positions && positions.farthest ? positions.farthest : { x: 0, y: 0 },
      next: positions && positions.next ? positions.next : { x: 0, y: 0 },
      hasNextTile: !!next,
      nextMergedFrom: !!(next && next.mergedFrom),
      mergedValue: mergedValue
    }]
  );
  return this.resolveNormalizedCoreValueOrFallback(
    planTileInteractionCore,
    function (coreValue) {
      var computed = coreValue || {};
      var mergeKind = computed.kind === "merge";
      var fallbackTarget = mergeKind ? positions.next : positions.farthest;
      var target = computed.target && Number.isInteger(computed.target.x) && Number.isInteger(computed.target.y)
        ? computed.target
        : fallbackTarget;
      return {
        kind: mergeKind ? "merge" : "move",
        target: target,
        moved: typeof computed.moved === "boolean"
          ? computed.moved
          : !this.positionsEqual(cell, target)
      };
    },
    function () {
      var shouldMerge = !!next && !next.mergedFrom && Number.isInteger(mergedValue) && mergedValue > 0;
      var targetLegacy = shouldMerge ? positions.next : positions.farthest;
      return {
        kind: shouldMerge ? "merge" : "move",
        target: targetLegacy,
        moved: !this.positionsEqual(cell, targetLegacy)
      };
    }
  );
};

GameManager.prototype.computePostMoveRecord = function (direction) {
  var computePostMoveRecordCore = this.callCorePostMoveRecordRuntime(
    "computePostMoveRecord",
    [{
      replayMode: !!this.replayMode,
      direction: direction,
      lastSpawn: this.lastSpawn ? {
        x: this.lastSpawn.x,
        y: this.lastSpawn.y,
        value: this.lastSpawn.value
      } : null,
      width: this.width,
      height: this.height,
      isFibonacciMode: this.isFibonacciMode(),
      hasSessionReplayV3: !!this.sessionReplayV3
    }]
  );
  return this.resolveCoreObjectCallOrFallback(computePostMoveRecordCore, function () {
    if (this.replayMode) {
      return {
        shouldRecordMoveHistory: false,
        compactMoveCode: null,
        shouldPushSessionAction: false,
        sessionAction: null,
        shouldResetLastSpawn: false
      };
    }
    var compactMoveCode = null;
    if (
      this.lastSpawn &&
      this.width === 4 &&
      this.height === 4 &&
      !this.isFibonacciMode() &&
      (this.lastSpawn.value === 2 || this.lastSpawn.value === 4)
    ) {
      var valBit = this.lastSpawn.value === 4 ? 1 : 0;
      var posIdx = this.lastSpawn.x + this.lastSpawn.y * 4;
      compactMoveCode = (direction << 5) | (valBit << 4) | posIdx;
    }
    var shouldPushSessionAction = !!this.sessionReplayV3;
    return {
      shouldRecordMoveHistory: true,
      compactMoveCode: compactMoveCode,
      shouldPushSessionAction: shouldPushSessionAction,
      sessionAction: shouldPushSessionAction ? ["m", direction] : null,
      shouldResetLastSpawn: true
    };
  });
};

GameManager.prototype.computePostUndoRecord = function (direction) {
  var computePostUndoRecordCore = this.callCorePostUndoRecordRuntime(
    "computePostUndoRecord",
    [{
      replayMode: !!this.replayMode,
      direction: direction,
      hasSessionReplayV3: !!this.sessionReplayV3
    }]
  );
  return this.resolveCoreObjectCallOrFallback(computePostUndoRecordCore, function () {
    if (this.replayMode) {
      return {
        shouldRecordMoveHistory: false,
        shouldAppendCompactUndo: false,
        shouldPushSessionAction: false,
        sessionAction: null
      };
    }
    var shouldPushSessionAction = !!this.sessionReplayV3;
    return {
      shouldRecordMoveHistory: true,
      shouldAppendCompactUndo: true,
      shouldPushSessionAction: shouldPushSessionAction,
      sessionAction: shouldPushSessionAction ? ["u"] : null
    };
  });
};

GameManager.prototype.getUndoStateFallbackValues = function () {
  return {
    score: Number.isFinite(this.score) && typeof this.score === "number" ? Number(this.score) : 0,
    comboStreak: Number.isInteger(this.comboStreak) && this.comboStreak >= 0 ? this.comboStreak : 0,
    successfulMoveCount:
      Number.isInteger(this.successfulMoveCount) && this.successfulMoveCount >= 0
        ? this.successfulMoveCount
        : 0,
    lockConsumedAtMoveCount: Number.isInteger(this.lockConsumedAtMoveCount) ? this.lockConsumedAtMoveCount : -1,
    lockedDirectionTurn: Number.isInteger(this.lockedDirectionTurn) ? this.lockedDirectionTurn : null,
    lockedDirection: Number.isInteger(this.lockedDirection) ? this.lockedDirection : null,
    undoUsed: Number.isInteger(this.undoUsed) && this.undoUsed >= 0 ? this.undoUsed : 0
  };
};

GameManager.prototype.computeUndoRestoreState = function (prev) {
  var computeUndoRestoreStateCore = this.callCoreUndoRestoreRuntime(
    "computeUndoRestoreState",
    [{
      prev: prev || {},
      fallbackUndoUsed: this.undoUsed,
      timerStatus: this.timerStatus
    }]
  );
  return this.resolveCoreObjectCallOrFallback(computeUndoRestoreStateCore, function () {
    var source = prev && typeof prev === "object" ? prev : {};
    var fallbackState = this.getUndoStateFallbackValues();
    var undoBase = Number.isInteger(source.undoUsed) && source.undoUsed >= 0
      ? source.undoUsed
      : fallbackState.undoUsed;
    return {
      comboStreak: Number.isInteger(source.comboStreak) && source.comboStreak >= 0 ? source.comboStreak : 0,
      successfulMoveCount:
        Number.isInteger(source.successfulMoveCount) && source.successfulMoveCount >= 0
          ? source.successfulMoveCount
          : 0,
      lockConsumedAtMoveCount: Number.isInteger(source.lockConsumedAtMoveCount) ? source.lockConsumedAtMoveCount : -1,
      lockedDirectionTurn: Number.isInteger(source.lockedDirectionTurn) ? source.lockedDirectionTurn : null,
      lockedDirection: Number.isInteger(source.lockedDirection) ? source.lockedDirection : null,
      undoUsed: undoBase + 1,
      over: false,
      won: false,
      keepPlaying: false,
      shouldClearMessage: true,
      shouldStartTimer: this.timerStatus === 0
    };
  });
};

GameManager.prototype.createUndoSnapshotState = function () {
  var createUndoSnapshotCore = this.callCoreUndoSnapshotRuntime(
    "createUndoSnapshot",
    [{
      score: this.score,
      comboStreak: this.comboStreak,
      successfulMoveCount: this.successfulMoveCount,
      lockConsumedAtMoveCount: this.lockConsumedAtMoveCount,
      lockedDirectionTurn: this.lockedDirectionTurn,
      lockedDirection: this.lockedDirection,
      undoUsed: this.undoUsed
    }]
  );
  var fallbackState = this.getUndoStateFallbackValues();
  var fallback = {
    score: fallbackState.score,
    tiles: [],
    comboStreak: fallbackState.comboStreak,
    successfulMoveCount: fallbackState.successfulMoveCount,
    lockConsumedAtMoveCount: fallbackState.lockConsumedAtMoveCount,
    lockedDirectionTurn: fallbackState.lockedDirectionTurn,
    lockedDirection: fallbackState.lockedDirection,
    undoUsed: fallbackState.undoUsed
  };
  return this.resolveNormalizedCoreValueOrFallback(
    createUndoSnapshotCore,
    function (coreValue) {
      var computed = coreValue || {};
      return {
        score: Number.isFinite(computed.score) ? Number(computed.score) : fallback.score,
        tiles: Array.isArray(computed.tiles) ? computed.tiles : [],
        comboStreak: Number.isInteger(computed.comboStreak) && computed.comboStreak >= 0
          ? computed.comboStreak
          : fallback.comboStreak,
        successfulMoveCount: Number.isInteger(computed.successfulMoveCount) && computed.successfulMoveCount >= 0
          ? computed.successfulMoveCount
          : fallback.successfulMoveCount,
        lockConsumedAtMoveCount: Number.isInteger(computed.lockConsumedAtMoveCount)
          ? computed.lockConsumedAtMoveCount
          : fallback.lockConsumedAtMoveCount,
        lockedDirectionTurn: Number.isInteger(computed.lockedDirectionTurn)
          ? computed.lockedDirectionTurn
          : fallback.lockedDirectionTurn,
        lockedDirection: Number.isInteger(computed.lockedDirection)
          ? computed.lockedDirection
          : fallback.lockedDirection,
        undoUsed: Number.isInteger(computed.undoUsed) && computed.undoUsed >= 0
          ? computed.undoUsed
          : fallback.undoUsed
      };
    },
    function () {
      return fallback;
    }
  );
};

GameManager.prototype.normalizeUndoStackEntry = function (entry) {
  var fallbackState = this.getUndoStateFallbackValues();

  var source = this.isNonArrayObject(entry) ? entry : {};
  var normalizeUndoStackEntryCore = this.callCoreUndoStackEntryRuntime(
    "normalizeUndoStackEntry",
    [{
      entry: source,
      fallbackScore: fallbackState.score,
      fallbackComboStreak: fallbackState.comboStreak,
      fallbackSuccessfulMoveCount: fallbackState.successfulMoveCount,
      fallbackLockConsumedAtMoveCount: fallbackState.lockConsumedAtMoveCount,
      fallbackLockedDirectionTurn: fallbackState.lockedDirectionTurn,
      fallbackLockedDirection: fallbackState.lockedDirection,
      fallbackUndoUsed: fallbackState.undoUsed
    }]
  );
  var sourceByCore = this.resolveNormalizedCoreValueOrUndefined(
    normalizeUndoStackEntryCore,
    function (coreValue) {
      return this.isNonArrayObject(coreValue) ? coreValue : source;
    }
  );
  if (typeof sourceByCore !== "undefined") {
    source = sourceByCore;
  }
  var rawTiles = Array.isArray(source.tiles) ? source.tiles : [];
  var tiles = [];
  for (var i = 0; i < rawTiles.length; i++) {
    var item = rawTiles[i];
    if (!this.isNonArrayObject(item)) continue;
    tiles.push(item);
  }
  return {
    score: Number.isFinite(source.score) && typeof source.score === "number"
      ? Number(source.score)
      : fallbackState.score,
    tiles: tiles,
    comboStreak: Number.isInteger(source.comboStreak) && source.comboStreak >= 0
      ? source.comboStreak
      : fallbackState.comboStreak,
    successfulMoveCount: Number.isInteger(source.successfulMoveCount) && source.successfulMoveCount >= 0
      ? source.successfulMoveCount
      : fallbackState.successfulMoveCount,
    lockConsumedAtMoveCount: Number.isInteger(source.lockConsumedAtMoveCount)
      ? source.lockConsumedAtMoveCount
      : fallbackState.lockConsumedAtMoveCount,
    lockedDirectionTurn: Number.isInteger(source.lockedDirectionTurn)
      ? source.lockedDirectionTurn
      : fallbackState.lockedDirectionTurn,
    lockedDirection: Number.isInteger(source.lockedDirection)
      ? source.lockedDirection
      : fallbackState.lockedDirection,
    undoUsed: Number.isInteger(source.undoUsed) && source.undoUsed >= 0
      ? source.undoUsed
      : fallbackState.undoUsed
  };
};

GameManager.prototype.createUndoTileSnapshot = function (tile, target) {
  var createUndoTileSnapshotCore = this.callCoreUndoTileSnapshotRuntime(
    "createUndoTileSnapshot",
    [{
      tile: {
        x: tile && typeof tile === "object" ? tile.x : null,
        y: tile && typeof tile === "object" ? tile.y : null,
        value: tile && typeof tile === "object" ? tile.value : null
      },
      target: {
        x: target && typeof target === "object" ? target.x : null,
        y: target && typeof target === "object" ? target.y : null
      }
    }]
  );
  var normalizedByCore = this.resolveNormalizedCoreValueOrUndefined(
    createUndoTileSnapshotCore,
    function (computed) {
      if (
        this.isNonArrayObject(computed) &&
        computed.previousPosition &&
        this.isNonArrayObject(computed.previousPosition)
      ) {
        return computed;
      }
      return null;
    }
  );
  if (normalizedByCore) return normalizedByCore;

  if (tile && typeof tile.save === "function") {
    return tile.save(target);
  }
  return {
    x: tile ? tile.x : null,
    y: tile ? tile.y : null,
    value: tile ? tile.value : null,
    previousPosition: {
      x: target ? target.x : null,
      y: target ? target.y : null
    }
  };
};

GameManager.prototype.createUndoRestoreTile = function (snapshot) {
  var source = this.isNonArrayObject(snapshot) ? snapshot : {};
  var previous = this.isNonArrayObject(source.previousPosition) ? source.previousPosition : {};
  var fallback = {
    x: source.x,
    y: source.y,
    value: source.value,
    previousPosition: {
      x: previous.x,
      y: previous.y
    }
  };

  var createUndoRestoreTileCore = this.callCoreUndoTileRestoreRuntime(
    "createUndoRestoreTile",
    [{
      x: source.x,
      y: source.y,
      value: source.value,
      previousPosition: {
        x: previous.x,
        y: previous.y
      }
    }]
  );
  var normalizedByCore = this.resolveNormalizedCoreValueOrUndefined(
    createUndoRestoreTileCore,
    function (computed) {
      if (
        this.isNonArrayObject(computed) &&
        computed.previousPosition &&
        this.isNonArrayObject(computed.previousPosition)
      ) {
        return computed;
      }
      return null;
    }
  );
  if (normalizedByCore) return normalizedByCore;

  return fallback;
};

GameManager.prototype.computeUndoRestorePayload = function (prev) {
  var computeUndoRestorePayloadCore = this.callCoreUndoRestorePayloadRuntime(
    "computeUndoRestorePayload",
    [{
      prev: prev || {},
      fallbackScore: this.score
    }]
  );
  return this.resolveCoreObjectCallOrFallback(computeUndoRestorePayloadCore, function () {
    var source = prev && typeof prev === "object" ? prev : {};
    var score = Number.isFinite(source.score) && typeof source.score === "number"
      ? Number(source.score)
      : (Number.isFinite(this.score) && typeof this.score === "number" ? Number(this.score) : 0);
    var rawTiles = Array.isArray(source.tiles) ? source.tiles : [];
    var tiles = [];
    for (var i = 0; i < rawTiles.length; i++) {
      var item = rawTiles[i];
      if (!this.isNonArrayObject(item)) continue;
      tiles.push(item);
    }
    return {
      score: score,
      tiles: tiles
    };
  });
};

GameManager.prototype.computeMergeEffects = function (mergedValue) {
  var cappedState = this.resolveCappedModeState();
  var computeMergeEffectsCore = this.callCoreMergeEffectsRuntime(
    "computeMergeEffects",
    [{
      mergedValue: mergedValue,
      isCappedMode: !!cappedState.isCappedMode,
      cappedTargetValue: cappedState.cappedTargetValue,
      reached32k: !!this.reached32k
    }]
  );
  return this.resolveCoreObjectCallOrFallback(computeMergeEffectsCore, function () {
    var value = Number(mergedValue);
    var cappedTarget = Number(cappedState.cappedTargetValue);
    var cappedMode = !!cappedState.isCappedMode;
    var hasCappedTarget = Number.isFinite(cappedTarget) && cappedTarget > 0;
    var reached32k = !!this.reached32k;
    var result = {
      shouldRecordCappedMilestone: false,
      shouldSetWon: false,
      shouldSetReached32k: false,
      timerIdsToStamp: [],
      showSubTimerContainer: false,
      hideTimerRows: []
    };

    if (!Number.isInteger(value) || value <= 0) return result;
    if (cappedMode && hasCappedTarget && value === cappedTarget) {
      result.shouldRecordCappedMilestone = true;
    } else if (!cappedMode && value === 2048) {
      result.shouldSetWon = true;
    }
    if (value === 8192) {
      result.timerIdsToStamp.push(reached32k ? "timer8192-sub" : "timer8192");
    }
    if (value === 16384) {
      result.timerIdsToStamp.push(reached32k ? "timer16384-sub" : "timer16384");
    }
    if (value === 32768) {
      result.shouldSetReached32k = true;
      result.timerIdsToStamp.push("timer32768");
      result.showSubTimerContainer = true;
      result.hideTimerRows = [16, 32];
    }
    return result;
  });
};

GameManager.prototype.normalizeSpawnTable = function (spawnTable, ruleset) {
  var normalizeSpawnTableCore = this.callCoreRulesRuntime(
    "normalizeSpawnTable",
    [spawnTable, ruleset]
  );
  return this.resolveNormalizedCoreValueOrFallback(normalizeSpawnTableCore, function (coreValue) {
    return Array.isArray(coreValue) ? coreValue : undefined;
  }, function () {
    var normalizedFallbackItems = [];
    if (Array.isArray(spawnTable) && spawnTable.length > 0) {
      for (var i = 0; i < spawnTable.length; i++) {
        var item = spawnTable[i];
        if (!item || !Number.isInteger(item.value) || item.value <= 0) continue;
        if (!(Number.isFinite(item.weight) && item.weight > 0)) continue;
        normalizedFallbackItems.push({ value: item.value, weight: Number(item.weight) });
      }
    }
    if (normalizedFallbackItems.length > 0) return normalizedFallbackItems;
    if (ruleset === "fibonacci") {
      return [{ value: 1, weight: 90 }, { value: 2, weight: 10 }];
    }
    return [{ value: 2, weight: 90 }, { value: 4, weight: 10 }];
  });
};

GameManager.prototype.getTheoreticalMaxTile = function (width, height, ruleset) {
  var getTheoreticalMaxTileCore = this.callCoreRulesRuntime(
    "getTheoreticalMaxTile",
    [width, height, ruleset]
  );
  return this.resolveNormalizedCoreValueOrFallbackAllowNull(getTheoreticalMaxTileCore, function (coreValue) {
    if (coreValue === null) return null;
    var tileValue = Number(coreValue);
    return Number.isInteger(tileValue) && tileValue > 0 ? tileValue : undefined;
  }, function () {
    var w = Number(width);
    var h = Number(height);
    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null;
    var cells = Math.floor(w) * Math.floor(h);
    cells = Number.isInteger(cells) && cells > 0 ? cells : null;
    if (cells === null) return null;
    if (ruleset === "fibonacci") {
      // Fibonacci 4x4 theoretical max: 4181.
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
    // Pow2 4x4 theoretical max: 131072.
    return Math.pow(2, cells + 1);
  });
};

GameManager.prototype.normalizeModeConfig = function (modeKey, rawConfig) {
  var normalizeModeConfigCore = this.callCoreModeRuntime(
    "normalizeModeConfig",
    [{
      modeKey: modeKey,
      rawConfig: rawConfig,
      defaultModeKey: GameManager.DEFAULT_MODE_KEY,
      defaultModeConfig: GameManager.DEFAULT_MODE_CONFIG,
      normalizeSpawnTable: this.normalizeSpawnTable.bind(this),
      getTheoreticalMaxTile: this.getTheoreticalMaxTile.bind(this),
      normalizeSpecialRules: this.normalizeSpecialRules.bind(this)
    }]
  );
  return this.resolveNormalizedCoreValueOrFallback(normalizeModeConfigCore, function (coreValue) {
    return this.isNonArrayObject(coreValue) ? coreValue : undefined;
  }, function () {
    var cfg = rawConfig ? this.clonePlain(rawConfig) : this.clonePlain(GameManager.DEFAULT_MODE_CONFIG);
    cfg.key = cfg.key || modeKey || GameManager.DEFAULT_MODE_KEY;
    cfg.board_width = Number.isInteger(cfg.board_width) && cfg.board_width > 0 ? cfg.board_width : 4;
    cfg.board_height = Number.isInteger(cfg.board_height) && cfg.board_height > 0 ? cfg.board_height : cfg.board_width;
    cfg.ruleset = cfg.ruleset === "fibonacci" ? "fibonacci" : "pow2";
    cfg.special_rules = this.normalizeSpecialRules(cfg.special_rules);
    cfg.undo_enabled = !!cfg.undo_enabled;

    var hasNumericMaxTile = Number.isInteger(cfg.max_tile) && cfg.max_tile > 0;
    var isCappedKey = typeof cfg.key === "string" && cfg.key.indexOf("capped") !== -1;
    var forceMaxTile = !!cfg.special_rules.enforce_max_tile;
    if (cfg.ruleset === "fibonacci") {
      // Fibonacci modes are uncapped by default; only explicit capped modes should enforce max_tile.
      cfg.max_tile = (hasNumericMaxTile && (isCappedKey || forceMaxTile)) ? cfg.max_tile : null;
    } else if (hasNumericMaxTile) {
      cfg.max_tile = cfg.max_tile;
    } else {
      cfg.max_tile = this.getTheoreticalMaxTile(cfg.board_width, cfg.board_height, cfg.ruleset);
    }

    var customFourRate = Number(cfg.special_rules.custom_spawn_four_rate);
    if (cfg.ruleset === "pow2" && Number.isFinite(customFourRate)) {
      if (customFourRate < 0) customFourRate = 0;
      if (customFourRate > 100) customFourRate = 100;
      customFourRate = Math.round(customFourRate * 100) / 100;
      var twoRate = Math.round((100 - customFourRate) * 100) / 100;
      var strictTable = [];
      if (twoRate > 0) strictTable.push({ value: 2, weight: twoRate });
      if (customFourRate > 0) strictTable.push({ value: 4, weight: customFourRate });
      if (!strictTable.length) strictTable.push({ value: 2, weight: 100 });
      cfg.spawn_table = strictTable;
      cfg.special_rules.custom_spawn_four_rate = customFourRate;
    } else {
      cfg.spawn_table = this.normalizeSpawnTable(cfg.spawn_table, cfg.ruleset);
    }

    cfg.ranked_bucket = cfg.ranked_bucket || "none";
    cfg.mode_family = cfg.mode_family || (cfg.ruleset === "fibonacci" ? "fibonacci" : "pow2");
    cfg.rank_policy = cfg.rank_policy || (cfg.ranked_bucket !== "none" ? "ranked" : "unranked");
    return cfg;
  });
};

GameManager.prototype.resolveModeConfig = function (modeId) {
  var id = modeId || GameManager.DEFAULT_MODE_KEY;
  var resolveModeConfigFromCatalogCore = this.callCoreModeRuntime(
    "resolveModeConfigFromCatalog",
    [{
      modeId: id,
      defaultModeKey: GameManager.DEFAULT_MODE_KEY,
      getModeConfig: this.getModeConfigFromCatalog.bind(this),
      legacyAliasToModeKey: GameManager.LEGACY_ALIAS_TO_MODE_KEY
    }]
  );
  return this.resolveNormalizedCoreValueOrFallback(
    resolveModeConfigFromCatalogCore,
    function (coreValue) {
      var resolvedByCore = coreValue || {};
      var normalizedModeId =
        typeof resolvedByCore.resolvedModeId === "string" && resolvedByCore.resolvedModeId
          ? resolvedByCore.resolvedModeId
          : GameManager.DEFAULT_MODE_KEY;
      var rawConfig = resolvedByCore.modeConfig;
      if (rawConfig && typeof rawConfig === "object" && !Array.isArray(rawConfig)) {
        return this.normalizeModeConfig(normalizedModeId, rawConfig);
      }
      return this.normalizeModeConfig(GameManager.DEFAULT_MODE_KEY, GameManager.DEFAULT_MODE_CONFIG);
    },
    function () {
      var byCatalogRaw = this.getModeConfigFromCatalog(id);
      if (byCatalogRaw) return this.normalizeModeConfig(id, byCatalogRaw);
      var mapped = GameManager.LEGACY_ALIAS_TO_MODE_KEY[id] || id;
      if (mapped && mapped !== id) {
        var mappedRaw = this.getModeConfigFromCatalog(mapped);
        if (mappedRaw) return this.normalizeModeConfig(mapped, mappedRaw);
      }
      return this.normalizeModeConfig(GameManager.DEFAULT_MODE_KEY, GameManager.DEFAULT_MODE_CONFIG);
    }
  );
};

GameManager.prototype.syncModeKeyToScoreManager = function (modeKey) {
  if (!this.scoreManager || typeof this.scoreManager.setModeKey !== "function") return;
  this.scoreManager.setModeKey(modeKey);
};

GameManager.prototype.applyModeConfig = function (modeConfig) {
  var cfg = this.normalizeModeConfig(modeConfig && modeConfig.key, modeConfig);
  this.modeConfig = cfg;
  this.mode = cfg.key;
  this.modeKey = cfg.key;
  this.width = cfg.board_width;
  this.height = cfg.board_height;
  this.size = this.width;
  this.ruleset = cfg.ruleset;
  this.maxTile = cfg.max_tile || Infinity;
  this.spawnTable = this.normalizeSpawnTable(cfg.spawn_table, cfg.ruleset);
  this.specialRules = this.normalizeSpecialRules(cfg.special_rules);
  this.rankedBucket = cfg.ranked_bucket || "none";
  this.modeFamily = cfg.mode_family || (cfg.ruleset === "fibonacci" ? "fibonacci" : "pow2");
  this.rankPolicy = cfg.rank_policy || (this.rankedBucket !== "none" ? "ranked" : "unranked");
  this.applySpecialRulesState();
  this.syncModeKeyToScoreManager(cfg.key);
  if (typeof document !== "undefined" && document.body) {
    document.body.setAttribute("data-mode-id", cfg.key);
    document.body.setAttribute("data-ruleset", cfg.ruleset);
    document.body.setAttribute("data-mode-family", this.modeFamily);
    document.body.setAttribute("data-rank-policy", this.rankPolicy);
  }
};

GameManager.prototype.normalizeSpecialRules = function (rules) {
  var normalizeSpecialRulesCore = this.callCoreModeRuntime(
    "normalizeSpecialRules",
    [rules]
  );
  return this.resolveNormalizedCoreValueOrFallback(normalizeSpecialRulesCore, function (coreValue) {
    return this.isNonArrayObject(coreValue) ? coreValue : undefined;
  }, function () {
    if (!rules || typeof rules !== "object" || Array.isArray(rules)) return {};
    return this.clonePlain(rules);
  });
};

GameManager.prototype.applySpecialRulesState = function () {
  var computeSpecialRulesStateCore = this.callCoreSpecialRulesRuntime(
    "computeSpecialRulesState",
    [
      this.specialRules || {},
      this.width,
      this.height,
      this.clonePlain.bind(this)
    ]
  );
  if (this.tryHandleCoreRawValue(computeSpecialRulesStateCore, function (coreValue) {
    var state = coreValue && typeof coreValue === "object" ? coreValue : {};
    this.blockedCellSet = state.blockedCellSet && typeof state.blockedCellSet === "object"
      ? state.blockedCellSet
      : {};
    this.blockedCellsList = Array.isArray(state.blockedCellsList) ? state.blockedCellsList : [];
    this.undoLimit = (Number.isInteger(state.undoLimit) && state.undoLimit >= 0)
      ? state.undoLimit
      : null;
    this.comboMultiplier = (Number.isFinite(state.comboMultiplier) && state.comboMultiplier > 1)
      ? Number(state.comboMultiplier)
      : 1;
    this.directionLockRules = state.directionLockRules || null;
  })) {
    return;
  }

  var rules = this.specialRules || {};
  var blockedRaw = Array.isArray(rules.blocked_cells) ? rules.blocked_cells : [];
  this.blockedCellSet = {};
  this.blockedCellsList = [];
  for (var i = 0; i < blockedRaw.length; i++) {
    var item = blockedRaw[i];
    var x = null;
    var y = null;
    if (Array.isArray(item) && item.length >= 2) {
      x = Number(item[0]);
      y = Number(item[1]);
    } else if (item && typeof item === "object") {
      x = Number(item.x);
      y = Number(item.y);
    }
    if (!Number.isInteger(x) || !Number.isInteger(y)) continue;
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) continue;
    this.blockedCellSet[x + ":" + y] = true;
    this.blockedCellsList.push({ x: x, y: y });
  }
  this.undoLimit = Number.isInteger(rules.undo_limit) && rules.undo_limit >= 0 ? rules.undo_limit : null;
  this.comboMultiplier = Number.isFinite(rules.combo_multiplier) && rules.combo_multiplier > 1
    ? Number(rules.combo_multiplier)
    : 1;
  this.directionLockRules = rules.direction_lock && typeof rules.direction_lock === "object"
    ? this.clonePlain(rules.direction_lock)
    : null;
};

GameManager.prototype.isBlockedCell = function (x, y) {
  return !!(this.blockedCellSet && this.blockedCellSet[x + ":" + y]);
};

GameManager.prototype.getGridCellAvailableFn = function () {
  if (this.grid && typeof this.grid.cellAvailable === "function") {
    return this.grid.cellAvailable.bind(this.grid);
  }
  return function () { return false; };
};

GameManager.prototype.getAvailableCells = function () {
  var gridCellAvailable = this.getGridCellAvailableFn();
  var getAvailableCellsCore = this.callCoreGridScanRuntime(
    "getAvailableCells",
    [
      this.width,
      this.height,
      this.isBlockedCell.bind(this),
      gridCellAvailable
    ]
  );
  return this.resolveNormalizedCoreValueOrFallback(getAvailableCellsCore, function (coreValue) {
    return Array.isArray(coreValue) ? coreValue : undefined;
  }, function () {
    var out = [];
    for (var x = 0; x < this.width; x++) {
      for (var y = 0; y < this.height; y++) {
        if (this.isBlockedCell(x, y)) continue;
        if (gridCellAvailable({ x: x, y: y })) out.push({ x: x, y: y });
      }
    }
    return out;
  });
};

GameManager.prototype.getLockedDirection = function () {
  var getLockedDirectionStateCore = this.callCoreDirectionLockRuntime(
    "getLockedDirectionState",
    [{
      directionLockRules: this.directionLockRules,
      successfulMoveCount: this.successfulMoveCount,
      lockConsumedAtMoveCount: this.lockConsumedAtMoveCount,
      lockedDirectionTurn: this.lockedDirectionTurn,
      lockedDirection: this.lockedDirection,
      initialSeed: this.initialSeed
    }, function (seed) {
      var rng = new Math.seedrandom(seed);
      return rng();
    }]
  );
  var lockedDirectionStateByCore = this.resolveCoreRawCallValueOrUndefined(getLockedDirectionStateCore);
  if (typeof lockedDirectionStateByCore !== "undefined") {
    var state = lockedDirectionStateByCore && typeof lockedDirectionStateByCore === "object"
      ? lockedDirectionStateByCore
      : {};
    if (Number.isInteger(state.lockedDirection)) {
      this.lockedDirection = state.lockedDirection;
    }
    if (Number.isInteger(state.lockedDirectionTurn)) {
      this.lockedDirectionTurn = state.lockedDirectionTurn;
    }
    return Number.isInteger(state.activeDirection) ? state.activeDirection : null;
  }
  var rules = this.directionLockRules;
  var everyK = null;
  if (rules) {
    var everyKRaw = Number(rules.every_k_moves);
    everyK = Number.isInteger(everyKRaw) && everyKRaw > 0 ? everyKRaw : null;
  }
  if (!Number.isInteger(everyK) || everyK <= 0) return null;
  if (this.successfulMoveCount <= 0 || this.successfulMoveCount % everyK !== 0) return null;
  if (this.lockConsumedAtMoveCount === this.successfulMoveCount) return null;
  if (this.lockedDirectionTurn !== this.successfulMoveCount) {
    var phase = Math.floor(this.successfulMoveCount / everyK);
    var rng = new Math.seedrandom(String(this.initialSeed) + ":lock:" + phase);
    this.lockedDirection = Math.floor(rng() * 4);
    this.lockedDirectionTurn = this.successfulMoveCount;
  }
  return this.lockedDirection;
};

GameManager.prototype.getLegacyModeFromModeKey = function (modeKey) {
  var resolveLegacyModeFromModeKeyCore = this.callCoreModeRuntime(
    "resolveLegacyModeFromModeKey",
    [{
      modeKey: modeKey,
      fallbackModeKey: this.modeKey,
      mode: this.mode,
      legacyModeByKey: GameManager.LEGACY_MODE_BY_KEY
    }]
  );
  return this.resolveCoreStringCallOrFallback(resolveLegacyModeFromModeKeyCore, function () {
    var key = modeKey || this.modeKey || this.mode;
    if (GameManager.LEGACY_MODE_BY_KEY[key]) return GameManager.LEGACY_MODE_BY_KEY[key];
    if (key && key.indexOf("capped") !== -1) return "capped";
    if (key && key.indexOf("practice") !== -1) return "practice";
    return "classic";
  });
};

GameManager.prototype.getSpawnTableTotalWeight = function (table) {
  var totalWeight = 0;
  for (var i = 0; i < table.length; i++) {
    totalWeight += table[i].weight;
  }
  return totalWeight;
};

GameManager.prototype.pickSpawnValueFromWeightedTable = function (table, totalWeight, randomSource) {
  var pick = randomSource() * totalWeight;
  var running = 0;
  for (var i = 0; i < table.length; i++) {
    running += table[i].weight;
    if (pick <= running) return table[i].value;
  }
  return table[table.length - 1].value;
};

GameManager.prototype.pickSpawnValue = function () {
  var pickSpawnValueCore = this.callCoreRulesRuntime(
    "pickSpawnValue",
    [this.spawnTable || [], Math.random]
  );
  return this.resolveNormalizedCoreValueOrFallback(pickSpawnValueCore, function (coreValue) {
    var value = Number(coreValue);
    return Number.isInteger(value) && value > 0 ? value : undefined;
  }, function () {
    var table = this.spawnTable || [];
    if (!table.length) return 2;
    var totalWeight = this.getSpawnTableTotalWeight(table);
    if (totalWeight <= 0) return table[0].value;
    return this.pickSpawnValueFromWeightedTable(table, totalWeight, Math.random);
  });
};

GameManager.prototype.isFibonacciMode = function () {
  return this.ruleset === "fibonacci";
};

GameManager.prototype.nextFibonacci = function (value) {
  var nextFibonacciCore = this.callCoreRulesRuntime("nextFibonacci", [value]);
  return this.resolveNormalizedCoreValueOrFallbackAllowNull(nextFibonacciCore, function (coreValue) {
    if (coreValue === null) return null;
    var nextValue = Number(coreValue);
    return Number.isInteger(nextValue) && nextValue > 0 ? nextValue : undefined;
  }, function () {
    if (value <= 0) return 1;
    if (value === 1) return 2;
    var a = 1;
    var b = 2;
    while (b < value) {
      var n = a + b;
      a = b;
      b = n;
    }
    return b === value ? a + b : null;
  });
};

GameManager.prototype.getMergedValue = function (a, b) {
  var getMergedValueCore = this.callCoreRulesRuntime(
    "getMergedValue",
    [
      a,
      b,
      this.isFibonacciMode() ? "fibonacci" : "pow2",
      this.maxTile
    ]
  );
  return this.resolveNormalizedCoreValueOrFallbackAllowNull(getMergedValueCore, function (coreValue) {
    if (coreValue === null) return null;
    var mergedValue = Number(coreValue);
    return Number.isInteger(mergedValue) && mergedValue > 0 ? mergedValue : undefined;
  }, function () {
    if (!Number.isInteger(a) || !Number.isInteger(b) || a <= 0 || b <= 0) return null;
    if (!this.isFibonacciMode()) {
      if (a !== b) return null;
      var mergedPow2 = a * 2;
      if (mergedPow2 > this.maxTile) return null;
      return mergedPow2;
    }
    if (a === 1 && b === 1) {
      if (2 > this.maxTile) return null;
      return 2;
    }
    var low = Math.min(a, b);
    var high = Math.max(a, b);
    var next = this.nextFibonacci(low);
    if (next !== high) return null;
    var mergedFibonacci = low + high;
    if (mergedFibonacci > this.maxTile) return null;
    return mergedFibonacci;
  });
};

GameManager.prototype.getTimerMilestoneValues = function () {
  var getTimerMilestoneValuesCore = this.callCoreRulesRuntime(
    "getTimerMilestoneValues",
    [
      this.isFibonacciMode() ? "fibonacci" : "pow2",
      GameManager.TIMER_SLOT_IDS
    ]
  );
  return this.resolveNormalizedCoreValueOrFallback(getTimerMilestoneValuesCore, function (coreValue) {
    return Array.isArray(coreValue) ? coreValue : undefined;
  }, function () {
    if (this.isFibonacciMode()) {
      // 13 slots mapped to Fibonacci milestones.
      return [13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584, 4181];
    }
    return GameManager.TIMER_SLOT_IDS.slice();
  });
};

GameManager.prototype.configureTimerMilestones = function () {
  this.timerMilestones = this.getTimerMilestoneValues();
  var getTimerMilestoneSlotByValueCore = this.callCoreRulesRuntime(
    "getTimerMilestoneSlotByValue",
    [
      this.timerMilestones,
      GameManager.TIMER_SLOT_IDS
    ]
  );
  this.timerMilestoneSlotByValue = this.resolveNormalizedCoreValueOrFallback(
    getTimerMilestoneSlotByValueCore,
    function (coreValue) {
      return this.isNonArrayObject(coreValue) ? coreValue : undefined;
    },
    function () {
      var map = {};
      for (var i = 0; i < GameManager.TIMER_SLOT_IDS.length; i++) {
        var slotId = String(GameManager.TIMER_SLOT_IDS[i]);
        var milestone = this.timerMilestones[i];
        if (Number.isInteger(milestone) && milestone > 0) {
          map[String(milestone)] = slotId;
        }
      }
      return map;
    }
  );
  this.updateTimerLegendLabels();
};

GameManager.prototype.updateTimerLegendLabelForSlot = function (slotId, label) {
  var nodes = document.querySelectorAll(".timer-legend-" + slotId);
  for (var i = 0; i < nodes.length; i++) {
    nodes[i].textContent = label;
  }
};

GameManager.prototype.updateTimerLegendLabels = function () {
  if (typeof document === "undefined") return;
  var milestones = this.timerMilestones || this.getTimerMilestoneValues();
  for (var i = 0; i < GameManager.TIMER_SLOT_IDS.length; i++) {
    var slotId = String(GameManager.TIMER_SLOT_IDS[i]);
    var label = String(milestones[i]);
    this.updateTimerLegendLabelForSlot(slotId, label);
  }
  this.callWindowNamespaceMethod("ThemeManager", "syncTimerLegendStyles");
};

GameManager.prototype.writeTimerSlotValueIfEmpty = function (slotId, timeStr) {
  var el = document.getElementById("timer" + slotId);
  if (el && el.textContent === "") {
    el.textContent = timeStr;
  }
};

GameManager.prototype.recordTimerMilestone = function (value, timeStr) {
  if (!Number.isInteger(value) || value <= 0) return;
  this.unlockProgressiveCapped64Row(value);
  var slotId = this.timerMilestoneSlotByValue ? this.timerMilestoneSlotByValue[String(value)] : null;
  if (!slotId) return;
  this.writeTimerSlotValueIfEmpty(slotId, timeStr);
};

GameManager.prototype.cloneResolvedCappedModeState = function (state) {
  var source = state && typeof state === "object" ? state : {};
  return {
    isCappedMode: !!source.isCappedMode,
    cappedTargetValue:
      Number.isFinite(source.cappedTargetValue) && Number(source.cappedTargetValue) > 0
        ? Number(source.cappedTargetValue)
        : null,
    isProgressiveCapped64Mode: !!source.isProgressiveCapped64Mode
  };
};

GameManager.prototype.readCachedCappedModeState = function () {
  var cache = this.__resolvedCappedModeStateCache;
  if (
    !cache ||
    cache.modeKey !== this.modeKey ||
    cache.mode !== this.mode ||
    cache.maxTile !== this.maxTile ||
    !cache.state ||
    typeof cache.state !== "object"
  ) {
    return null;
  }
  return this.cloneResolvedCappedModeState(cache.state);
};

GameManager.prototype.writeCachedCappedModeState = function (state) {
  this.__resolvedCappedModeStateCache = {
    modeKey: this.modeKey,
    mode: this.mode,
    maxTile: this.maxTile,
    state: this.cloneResolvedCappedModeState(state)
  };
};

GameManager.prototype.resolveCappedModeStateCorePayload = function () {
  return {
    modeKey: this.modeKey,
    mode: this.mode,
    maxTile: this.maxTile
  };
};

GameManager.prototype.resolveCappedModeState = function () {
  var cachedState = this.readCachedCappedModeState();
  if (cachedState) return cachedState;

  var resolveCappedModeStateCore = this.callCoreModeRuntime(
    "resolveCappedModeState",
    [this.resolveCappedModeStateCorePayload()]
  );
  var resolvedState = this.resolveNormalizedCoreValueOrFallback(
    resolveCappedModeStateCore,
    function (coreValue) {
      return this.cloneResolvedCappedModeState(coreValue || {});
    },
    function () {
      var key = String(this.modeKey || this.mode || "");
      var maxTile = Number(this.maxTile);
      var isCappedModeFallback = key.indexOf("capped") !== -1 && Number.isFinite(maxTile) && maxTile > 0;
      return {
        isCappedMode: isCappedModeFallback,
        cappedTargetValue: isCappedModeFallback ? Number(maxTile) : null,
        // Disable progressive hidden timer rows for 64-capped mode.
        isProgressiveCapped64Mode: false
      };
    }
  );
  this.writeCachedCappedModeState(resolvedState);
  return this.cloneResolvedCappedModeState(resolvedState);
};

GameManager.prototype.resolveProvidedCappedModeState = function (cappedState) {
  if (cappedState && typeof cappedState === "object") return cappedState;
  return this.resolveCappedModeState();
};

GameManager.prototype.isCappedMode = function () {
  return this.resolveCappedModeState().isCappedMode;
};

GameManager.prototype.getCappedTargetValue = function () {
  return this.resolveCappedModeState().cappedTargetValue;
};

GameManager.prototype.isProgressiveCapped64Mode = function () {
  return this.resolveCappedModeState().isProgressiveCapped64Mode;
};

GameManager.prototype.getTimerRowEl = function (value) {
  return document.getElementById("timer-row-" + String(value));
};

GameManager.prototype.setTimerRowVisibleState = function (value, visible, keepSpace) {
  var row = this.getTimerRowEl(value);
  if (!row) return;
  row.style.display = "block";
  if (visible) {
    row.style.visibility = "visible";
    row.style.pointerEvents = "";
  } else if (keepSpace) {
    row.style.visibility = "hidden";
    row.style.pointerEvents = "none";
  } else {
    row.style.display = "none";
    row.style.visibility = "";
    row.style.pointerEvents = "";
  }
};

GameManager.prototype.setCapped64RowVisible = function (value, visible) {
  this.setTimerRowVisibleState(value, visible, true);
};

GameManager.prototype.resolveProgressiveCapped64UnlockedState = function (unlockedState) {
  var createProgressiveCapped64UnlockedStateCore = this.callCoreModeRuntime(
    "createProgressiveCapped64UnlockedState",
    [unlockedState]
  );
  return this.resolveNormalizedCoreValueOrFallback(
    createProgressiveCapped64UnlockedStateCore,
    function (coreValue) {
      return coreValue && typeof coreValue === "object" ? coreValue : null;
    },
    function () {
      var base = { "16": false, "32": false, "64": false };
      if (!unlockedState || typeof unlockedState !== "object") return base;
      if (unlockedState["16"] === true) base["16"] = true;
      if (unlockedState["32"] === true) base["32"] = true;
      if (unlockedState["64"] === true) base["64"] = true;
      return base;
    }
  );
};

GameManager.prototype.resetProgressiveCapped64Rows = function () {
  this.capped64Unlocked = this.resolveProgressiveCapped64UnlockedState(this.capped64Unlocked);
  var values = [16, 32, 64];
  for (var i = 0; i < values.length; i++) {
    this.setCapped64RowVisible(values[i], false);
  }
};

GameManager.prototype.resolveProgressiveCapped64UnlockCoreInput = function (
  isProgressiveCapped64Mode,
  value,
  unlockedState
) {
  return {
    isProgressiveCapped64Mode: isProgressiveCapped64Mode,
    value: value,
    unlockedState: unlockedState
  };
};

GameManager.prototype.isProgressiveCapped64UnlockValue = function (value) {
  return value === 16 || value === 32 || value === 64;
};

GameManager.prototype.applyProgressiveCapped64UnlockCoreResult = function (resolved, unlockedState) {
  if (resolved.nextUnlockedState && typeof resolved.nextUnlockedState === "object") {
    this.capped64Unlocked = resolved.nextUnlockedState;
  } else {
    this.capped64Unlocked = unlockedState;
  }
  var unlockedValue = Number(resolved.unlockedValue);
  if (this.isProgressiveCapped64UnlockValue(unlockedValue)) {
    this.setCapped64RowVisible(unlockedValue, true);
  }
};

GameManager.prototype.unlockProgressiveCapped64Row = function (value) {
  var unlockedState = this.resolveProgressiveCapped64UnlockedState(this.capped64Unlocked);
  var cappedState = this.resolveCappedModeState();
  var isProgressiveCapped64Mode = !!cappedState.isProgressiveCapped64Mode;
  var resolveProgressiveCapped64UnlockCore = this.callCoreModeRuntime(
    "resolveProgressiveCapped64Unlock",
    [this.resolveProgressiveCapped64UnlockCoreInput(isProgressiveCapped64Mode, value, unlockedState)]
  );
  if (this.tryHandleCoreRawValue(resolveProgressiveCapped64UnlockCore, function (coreValue) {
    var resolved = coreValue || {};
    this.applyProgressiveCapped64UnlockCoreResult(resolved, unlockedState);
  })) {
    return;
  }

  if (!isProgressiveCapped64Mode) return;
  if (!this.isProgressiveCapped64UnlockValue(value)) return;
  if (unlockedState[String(value)]) return;
  unlockedState[String(value)] = true;
  this.capped64Unlocked = unlockedState;
  this.setCapped64RowVisible(value, true);
};

GameManager.prototype.repositionCappedTimerContainer = function () {
  var container = document.getElementById("capped-timer-container");
  if (!container) return;
  var cappedState = this.resolveCappedModeState();
  var anchorTarget = cappedState.cappedTargetValue || 2048;
  var anchorRow = this.getTimerRowEl(anchorTarget);
  if (!anchorRow || !anchorRow.parentNode) return;
  var parent = anchorRow.parentNode;
  if (container.parentNode === parent && anchorRow.nextSibling === container) return;
  parent.insertBefore(container, anchorRow.nextSibling);
};

GameManager.prototype.applyCappedRowVisibilityPlan = function (plan) {
  if (!Array.isArray(plan) || plan.length <= 0) return false;
  for (var p = 0; p < plan.length; p++) {
    var item = plan[p];
    if (!item || !Number.isInteger(item.value) || item.value <= 0) continue;
    this.setTimerRowVisibleState(item.value, !!item.visible, !!item.keepSpace);
  }
  return true;
};

GameManager.prototype.setAllTimerRowsVisibleState = function (visible, keepSpace) {
  for (var i = 0; i < GameManager.TIMER_SLOT_IDS.length; i++) {
    this.setTimerRowVisibleState(GameManager.TIMER_SLOT_IDS[i], visible, keepSpace);
  }
};

GameManager.prototype.shouldResetProgressiveRowsAfterPlan = function (cappedState) {
  return !!(cappedState.isCappedMode && cappedState.isProgressiveCapped64Mode);
};

GameManager.prototype.applyCappedRowVisibilityFallbackByState = function (cappedState) {
  if (!cappedState.isCappedMode) {
    this.setAllTimerRowsVisibleState(true, false);
    return;
  }
  if (cappedState.isProgressiveCapped64Mode) {
    this.setAllTimerRowsVisibleState(false, true);
    this.resetProgressiveCapped64Rows();
    return;
  }
  for (var i = 0; i < GameManager.TIMER_SLOT_IDS.length; i++) {
    var value = GameManager.TIMER_SLOT_IDS[i];
    this.setTimerRowVisibleState(value, value <= cappedState.cappedTargetValue, true);
  }
};

GameManager.prototype.applyCappedRowVisibility = function () {
  var cappedState = this.resolveCappedModeState();
  var resolveCappedRowVisibilityPlanCore = this.callCoreModeRuntime(
    "resolveCappedRowVisibilityPlan",
    [{
      isCappedMode: cappedState.isCappedMode,
      isProgressiveCapped64Mode: cappedState.isProgressiveCapped64Mode,
      cappedTargetValue: cappedState.cappedTargetValue,
      timerSlotIds: GameManager.TIMER_SLOT_IDS
    }]
  );
  var appliedByCore = this.resolveNormalizedCoreValueOrFallback(
    resolveCappedRowVisibilityPlanCore,
    function (coreValue) {
      if (!this.applyCappedRowVisibilityPlan(coreValue)) return false;
      if (this.shouldResetProgressiveRowsAfterPlan(cappedState)) {
        this.resetProgressiveCapped64Rows();
      }
      return true;
    },
    function () {
      return false;
    }
  );
  if (appliedByCore) {
    return;
  }
  this.applyCappedRowVisibilityFallbackByState(cappedState);
};

GameManager.prototype.resetCappedDynamicTimers = function () {
  var cappedState = this.resolveCappedModeState();
  this.cappedMilestoneCount = 0;
  var cappedContainer = document.getElementById("capped-timer-container");
  if (cappedContainer) cappedContainer.innerHTML = "";
  var overflowContainer = document.getElementById("capped-timer-overflow-container");
  if (overflowContainer) overflowContainer.innerHTML = "";
  this.resetCappedPlaceholderRows(cappedState);
  this.getCappedOverflowContainer(cappedState);
  this.callWindowMethod("cappedTimerReset");
};

GameManager.prototype.resolveCappedTargetValueOrNull = function (cappedTargetValue) {
  var targetValue = Number(cappedTargetValue);
  if (Number.isFinite(targetValue) && targetValue > 0) return targetValue;
  var cappedState = this.resolveCappedModeState();
  targetValue = Number(cappedState.cappedTargetValue);
  if (Number.isFinite(targetValue) && targetValue > 0) return targetValue;
  return null;
};

GameManager.prototype.getCappedTimerLegendClass = function (cappedTargetValue) {
  var targetValue = this.resolveCappedTargetValueOrNull(cappedTargetValue);
  var resolveCappedTimerLegendClassCore = this.callCoreModeRuntime(
    "resolveCappedTimerLegendClass",
    [{
      timerMilestoneSlotByValue: this.timerMilestoneSlotByValue,
      cappedTargetValue: targetValue
    }]
  );
  return this.resolveCoreStringCallOrFallback(resolveCappedTimerLegendClassCore, function () {
    var slotId = this.timerMilestoneSlotByValue
      ? this.timerMilestoneSlotByValue[String(targetValue)]
      : null;
    return slotId ? ("timertile timer-legend-" + slotId) : "timertile";
  });
};

GameManager.prototype.getCappedTimerFontSize = function (cappedTargetValue) {
  var targetValue = this.resolveCappedTargetValueOrNull(cappedTargetValue);
  if (targetValue === null) {
    targetValue = 2048;
  }
  var resolveCappedTimerLegendFontSizeCore = this.callCoreModeRuntime(
    "resolveCappedTimerLegendFontSize",
    [targetValue]
  );
  return this.resolveCoreStringCallOrFallback(resolveCappedTimerLegendFontSizeCore, function () {
    var cap = targetValue;
    if (cap >= 8192) return "13px";
    if (cap >= 1024) return "14px";
    if (cap >= 128) return "18px";
    return "22px";
  });
};

GameManager.prototype.getCappedRepeatLabel = function (repeatCount) {
  var formatCappedRepeatLabelCore = this.callCoreModeRuntime(
    "formatCappedRepeatLabel",
    [repeatCount]
  );
  return this.resolveCoreStringCallOrFallback(formatCappedRepeatLabelCore, function () {
    return "x" + String(repeatCount);
  }, true);
};

GameManager.prototype.normalizeCappedPlaceholderRowValuesFromCore = function (coreValues) {
  if (!Array.isArray(coreValues)) return null;
  var normalized = [];
  for (var c = 0; c < coreValues.length; c++) {
    var coreValue = Number(coreValues[c]);
    if (!Number.isInteger(coreValue) || coreValue <= 0) continue;
    normalized.push(coreValue);
  }
  return normalized;
};

GameManager.prototype.getCappedPlaceholderRowValues = function (cappedState) {
  var resolvedCappedState =
    this.resolveProvidedCappedModeState(cappedState);
  var resolveCappedPlaceholderRowValuesCore = this.callCoreModeRuntime(
    "resolveCappedPlaceholderRowValues",
    [{
      isCappedMode: resolvedCappedState.isCappedMode,
      cappedTargetValue: resolvedCappedState.cappedTargetValue,
      timerSlotIds: GameManager.TIMER_SLOT_IDS
    }]
  );
  var normalizedByCore = this.resolveNormalizedCoreValueOrUndefined(
    resolveCappedPlaceholderRowValuesCore,
    this.normalizeCappedPlaceholderRowValuesFromCore
  );
  if (normalizedByCore) return normalizedByCore;
  if (!resolvedCappedState.isCappedMode) return [];
  var cap = resolvedCappedState.cappedTargetValue;
  var values = [];
  for (var i = 0; i < GameManager.TIMER_SLOT_IDS.length; i++) {
    var value = GameManager.TIMER_SLOT_IDS[i];
    if (value > cap) values.push(value);
  }
  return values;
};

GameManager.prototype.resetCappedPlaceholderRows = function (cappedState) {
  var resolvedCappedState =
    this.resolveProvidedCappedModeState(cappedState);
  if (!resolvedCappedState.isCappedMode) return;
  var values = this.getCappedPlaceholderRowValues(resolvedCappedState);
  for (var i = 0; i < values.length; i++) {
    var slotId = String(values[i]);
    var row = this.getTimerRowEl(slotId);
    var timerEl = document.getElementById("timer" + slotId);
    if (timerEl) timerEl.textContent = "";
    if (!row) continue;

    var legend = row.querySelector(".timertile");
    if (legend) {
      legend.className = "timertile timer-legend-" + slotId;
      legend.textContent = slotId;
    }
    row.removeAttribute("data-capped-repeat");
  }
};

GameManager.prototype.resolveCappedPlaceholderSlotValue = function (repeatCount, values, coreSlotValue) {
  var slotValue = Number(coreSlotValue);
  if (Number.isInteger(slotValue) && slotValue > 0) return slotValue;
  var placeholderIndex = repeatCount - 2; // x2 => first placeholder row
  if (placeholderIndex < 0 || placeholderIndex >= values.length) return null;
  slotValue = Number(values[placeholderIndex]);
  if (!Number.isInteger(slotValue) || slotValue <= 0) return null;
  return slotValue;
};

GameManager.prototype.applyCappedPlaceholderLegend = function (legend, labelText, cappedTargetValue) {
  if (!legend) return;
  legend.className = this.getCappedTimerLegendClass(cappedTargetValue);
  legend.style.color = "#f9f6f2";
  legend.style.fontSize = this.getCappedTimerFontSize(cappedTargetValue);
  legend.textContent = labelText;
};

GameManager.prototype.fillCappedPlaceholderRowSlot = function (
  slotValue,
  repeatCount,
  labelText,
  timeStr,
  resolvedCappedState
) {
  var slotId = String(slotValue);
  var row = this.getTimerRowEl(slotId);
  var timerEl = document.getElementById("timer" + slotId);
  if (!row || !timerEl) return false;

  this.applyCappedPlaceholderLegend(
    row.querySelector(".timertile"),
    labelText,
    resolvedCappedState.cappedTargetValue
  );
  timerEl.textContent = timeStr;
  row.setAttribute("data-capped-repeat", String(repeatCount));
  this.setTimerRowVisibleState(slotId, true, true);
  this.normalizeCappedRepeatLegendClasses(resolvedCappedState);
  return true;
};

GameManager.prototype.fillCappedPlaceholderRowByRepeat = function (repeatCount, labelText, timeStr, cappedState) {
  var resolvedCappedState =
    this.resolveProvidedCappedModeState(cappedState);
  if (!resolvedCappedState.isCappedMode) return false;
  if (!Number.isInteger(repeatCount) || repeatCount < 2) return false;

  var values = this.getCappedPlaceholderRowValues(resolvedCappedState);
  var resolveCappedPlaceholderSlotByRepeatCountCore = this.callCoreModeRuntime(
    "resolveCappedPlaceholderSlotByRepeatCount",
    [{
      repeatCount: repeatCount,
      placeholderRowValues: values
    }]
  );
  var slotValue = this.resolveCappedPlaceholderSlotValue(
    repeatCount,
    values,
    this.resolveCoreRawCallValueOrUndefined(resolveCappedPlaceholderSlotByRepeatCountCore)
  );
  if (!Number.isInteger(slotValue) || slotValue <= 0) return false;
  return this.fillCappedPlaceholderRowSlot(
    slotValue,
    repeatCount,
    labelText,
    timeStr,
    resolvedCappedState
  );
};

GameManager.prototype.ensureCappedOverflowContainerElement = function () {
  var id = "capped-timer-overflow-container";
  var container = document.getElementById(id);
  if (container) return container;
  container = document.createElement("div");
  container.id = id;
  return container;
};

GameManager.prototype.resolveCappedOverflowAnchor = function (resolvedCappedState) {
  var values = this.getCappedPlaceholderRowValues(resolvedCappedState);
  if (!values.length) return null;
  return this.getTimerRowEl(values[values.length - 1]);
};

GameManager.prototype.mountCappedOverflowContainerAfterAnchor = function (container, anchor) {
  if (!anchor || !anchor.parentNode) return;
  if (container.parentNode !== anchor.parentNode || anchor.nextSibling !== container) {
    anchor.parentNode.insertBefore(container, anchor.nextSibling);
  }
};

GameManager.prototype.getCappedOverflowContainer = function (cappedState) {
  var resolvedCappedState =
    this.resolveProvidedCappedModeState(cappedState);
  if (!resolvedCappedState.isCappedMode) return null;
  var container = this.ensureCappedOverflowContainerElement();
  this.mountCappedOverflowContainerAfterAnchor(container, this.resolveCappedOverflowAnchor(resolvedCappedState));
  return container;
};

GameManager.prototype.resolveCappedMilestoneBaseTimerElement = function (cappedState) {
  var capLabel = String(cappedState.cappedTargetValue || 2048);
  return document.getElementById("timer" + capLabel);
};

GameManager.prototype.tryRecordFirstCappedMilestone = function (milestoneCount, baseTimerEl, timeStr) {
  if (milestoneCount !== 1) return false;
  if (baseTimerEl && baseTimerEl.textContent === "") {
    baseTimerEl.textContent = timeStr;
  }
  return true;
};

GameManager.prototype.buildCappedMilestoneDynamicRowState = function (milestoneCount, labelText, timeStr) {
  return {
    repeat: String(milestoneCount),
    label: labelText,
    time: timeStr
  };
};

GameManager.prototype.appendCappedMilestoneDynamicRow = function (
  container,
  milestoneCount,
  labelText,
  timeStr,
  cappedState
) {
  if (!container) return false;
  var rowDiv = this.createSavedDynamicTimerRow(
    this.buildCappedMilestoneDynamicRowState(milestoneCount, labelText, timeStr),
    cappedState
  );
  container.appendChild(rowDiv);
  this.normalizeCappedRepeatLegendClasses(cappedState);
  return true;
};

GameManager.prototype.finalizeCappedMilestoneRecord = function () {
  this.callWindowMethod("cappedTimerAutoScroll");
};

GameManager.prototype.recordCappedMilestone = function (timeStr) {
  var cappedState = this.resolveCappedModeState();
  if (!cappedState.isCappedMode) return;

  this.cappedMilestoneCount += 1;
  var milestoneCount = this.cappedMilestoneCount;
  var baseTimerEl = this.resolveCappedMilestoneBaseTimerElement(cappedState);
  var container = this.getCappedOverflowContainer(cappedState);

  if (this.tryRecordFirstCappedMilestone(milestoneCount, baseTimerEl, timeStr)) {
    return;
  }

  var nextLabel = this.getCappedRepeatLabel(milestoneCount);

  // Prefer replacing reserved hidden rows so the timer module height stays stable.
  if (this.fillCappedPlaceholderRowByRepeat(milestoneCount, nextLabel, timeStr, cappedState)) {
    this.finalizeCappedMilestoneRecord();
    return;
  }

  if (!this.appendCappedMilestoneDynamicRow(container, milestoneCount, nextLabel, timeStr, cappedState)) return;
  this.finalizeCappedMilestoneRecord();
};

GameManager.prototype.hideStatsElementForCornerMode = function (statsElement) {
  if (!statsElement) return false;
  statsElement.style.visibility = "hidden"; // Preserve layout while moving display to page corner
  return true;
};

GameManager.prototype.ensureCornerStatsElement = function (elementId) {
  var element = document.getElementById(elementId);
  if (element) return element;
  element = document.createElement("div");
  element.id = elementId;
  document.body.appendChild(element);
  return element;
};

GameManager.prototype.applyBaseCornerStatsElementStyle = function (element) {
  element.style.position = "fixed";
  element.style.top = "8px";
  element.style.zIndex = "1000";
  element.style.background = "transparent";
  element.style.color = "#776e65";
  element.style.fontWeight = "bold";
  element.style.fontSize = "27px";
  element.style.pointerEvents = "none";
};

GameManager.prototype.initCornerRateStatsElement = function () {
  this.cornerRateEl = this.ensureCornerStatsElement("corner-stats-4-rate");
  this.applyBaseCornerStatsElementStyle(this.cornerRateEl);
  this.cornerRateEl.style.left = "10px";
  this.cornerRateEl.textContent = "0.00";
};

GameManager.prototype.initCornerIpsStatsElement = function () {
  this.cornerIpsEl = this.ensureCornerStatsElement("corner-stats-ips");
  this.applyBaseCornerStatsElementStyle(this.cornerIpsEl);
  this.cornerIpsEl.style.right = "10px";
  this.cornerIpsEl.textContent = "IPS: 0";
};

GameManager.prototype.initCornerStats = function () {
  var rateEl = document.getElementById("stats-4-rate");
  var ipsEl = document.getElementById("stats-ips");

  if (this.hideStatsElementForCornerMode(rateEl)) this.initCornerRateStatsElement();

  if (this.hideStatsElementForCornerMode(ipsEl)) this.initCornerIpsStatsElement();
};

GameManager.prototype.initStatsPanelUi = function () {
  if (typeof document === "undefined" || !document.body) return;
  var btn = this.ensureStatsPanelToggleButton();
  var exportBtn = document.getElementById("top-export-replay-btn");
  var practiceStatsActions = document.getElementById("practice-stats-actions");
  var topActionHost = practiceStatsActions ||
    (exportBtn && exportBtn.parentNode) ||
    document.querySelector(".heading .top-action-buttons") ||
    document.querySelector(".top-action-buttons");
  if (topActionHost) {
    btn.classList.remove("is-floating");
    if (exportBtn && exportBtn.parentNode === topActionHost) {
      if (btn.parentNode !== topActionHost || btn.nextSibling !== exportBtn) {
        topActionHost.insertBefore(btn, exportBtn);
      }
    } else if (btn.parentNode !== topActionHost) {
      topActionHost.insertBefore(btn, topActionHost.firstChild);
    }
  } else {
    if (btn.parentNode !== document.body) {
      document.body.appendChild(btn);
    }
    btn.classList.add("is-floating");
  }
  var overlay = this.ensureStatsPanelOverlayElement();
  this.bindStatsPanelUiEvents(btn, overlay);
  this.applyStatsPanelInitialVisibility(overlay);
};

GameManager.prototype.ensureStatsPanelToggleButton = function () {
  var btn = document.getElementById("stats-panel-toggle");
  if (!btn) {
    btn = document.createElement("a");
    btn.id = "stats-panel-toggle";
  }
  btn.title = "统计";
  btn.setAttribute("aria-label", "统计");
  if (!btn.querySelector("svg")) {
    btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>';
  }
  btn.className = "top-action-btn stats-panel-toggle";
  return btn;
};

GameManager.prototype.buildStatsPanelOverlayMarkup = function () {
  return (
    "<div class='replay-modal-content stats-panel-content'>" +
    "<h3>统计汇总</h3>" +
    "<div class='stats-panel-row'><span>总步数</span><span id='stats-panel-total'>0</span></div>" +
    "<div class='stats-panel-row'><span>移动步数</span><span id='stats-panel-moves'>0</span></div>" +
    "<div class='stats-panel-row'><span>撤回步数</span><span id='stats-panel-undo'>0</span></div>" +
    "<div class='stats-panel-row'><span id='stats-panel-two-label'>出2数量</span><span id='stats-panel-two'>0</span></div>" +
    "<div class='stats-panel-row'><span id='stats-panel-four-label'>出4数量</span><span id='stats-panel-four'>0</span></div>" +
    "<div class='stats-panel-row'><span id='stats-panel-four-rate-label'>实际出4率</span><span id='stats-panel-four-rate'>0.00</span></div>" +
    "<div class='replay-modal-actions'>" +
    "<button id='stats-panel-close' class='replay-button'>关闭</button>" +
    "</div>" +
    "</div>"
  );
};

GameManager.prototype.ensureStatsPanelOverlayElement = function () {
  var overlay = document.getElementById("stats-panel-overlay");
  if (overlay) return overlay;
  overlay = document.createElement("div");
  overlay.id = "stats-panel-overlay";
  overlay.className = "replay-modal-overlay";
  overlay.style.display = "none";
  overlay.innerHTML = this.buildStatsPanelOverlayMarkup();
  document.body.appendChild(overlay);
  return overlay;
};

GameManager.prototype.bindStatsPanelToggleButtonEvent = function (btn, self) {
  if (btn.__statsBound) return;
  btn.__statsBound = true;
  btn.addEventListener("click", function (event) {
    event.preventDefault();
    self.openStatsPanel();
  });
};

GameManager.prototype.bindStatsPanelCloseButtonEvent = function (self) {
  var closeBtn = document.getElementById("stats-panel-close");
  if (!closeBtn || closeBtn.__statsBound) return;
  closeBtn.__statsBound = true;
  closeBtn.addEventListener("click", function () {
    self.closeStatsPanel();
  });
};

GameManager.prototype.bindStatsPanelOverlayDismissEvent = function (overlay, self) {
  if (overlay.__statsBound) return;
  overlay.__statsBound = true;
  overlay.addEventListener("click", function (e) {
    if (e.target === overlay) self.closeStatsPanel();
  });
};

GameManager.prototype.bindStatsPanelUiEvents = function (btn, overlay) {
  var self = this;
  this.bindStatsPanelToggleButtonEvent(btn, self);
  this.bindStatsPanelCloseButtonEvent(self);
  this.bindStatsPanelOverlayDismissEvent(overlay, self);
};

GameManager.prototype.applyStatsPanelInitialVisibility = function (overlay) {
  var isOpen = this.readLocalStorageFlag(GameManager.STATS_PANEL_VISIBLE_KEY, "1");
  overlay.style.display = isOpen ? "flex" : "none";
};

GameManager.prototype.openStatsPanel = function () {
  var overlay = document.getElementById("stats-panel-overlay");
  if (!overlay) return;
  overlay.style.display = "flex";
  this.updateStatsPanel();
  this.writeLocalStorageFlag(GameManager.STATS_PANEL_VISIBLE_KEY, true, "1", "0");
};

GameManager.prototype.closeStatsPanel = function () {
  var overlay = document.getElementById("stats-panel-overlay");
  if (!overlay) return;
  overlay.style.display = "none";
  this.writeLocalStorageFlag(GameManager.STATS_PANEL_VISIBLE_KEY, false, "1", "0");
};

GameManager.prototype.isTimerLeaderboardAvailableByMode = function (mode) {
  var isTimerLeaderboardAvailableByModeCore = this.callCoreModeRuntime(
    "isTimerLeaderboardAvailableByMode",
    [mode]
  );
  return this.resolveCoreBooleanCallOrFallback(isTimerLeaderboardAvailableByModeCore, function () {
    void mode;
    return true;
  });
};

GameManager.prototype.isTimerLeaderboardAvailable = function () {
  return true;
};

GameManager.prototype.getTimerModuleViewMode = function () {
  var normalizeTimerModuleViewModeCore = this.callCoreStorageRuntime(
    "normalizeTimerModuleViewMode",
    [this.timerModuleView]
  );
  return this.resolveCoreStringCallOrFallback(normalizeTimerModuleViewModeCore, function () {
    return this.timerModuleView === "hidden" ? "hidden" : "timer";
  });
};

GameManager.prototype.loadTimerModuleViewForMode = function (mode) {
  var map = this.readLocalStorageJsonMap(GameManager.TIMER_MODULE_VIEW_SETTINGS_KEY);
  var readTimerModuleViewForModeFromMapCore = this.callCoreStorageRuntime(
    "readTimerModuleViewForModeFromMap",
    [{
      map: map,
      mode: mode
    }]
  );
  return this.resolveCoreStringCallOrFallback(readTimerModuleViewForModeFromMapCore, function () {
    var value = map[mode];
    return value === "hidden" ? "hidden" : "timer";
  });
};

GameManager.prototype.persistTimerModuleViewForMode = function (mode, view) {
  var map = this.readLocalStorageJsonMap(GameManager.TIMER_MODULE_VIEW_SETTINGS_KEY);
  var writeTimerModuleViewForModeToMapCore = this.callCoreStorageRuntime(
    "writeTimerModuleViewForModeToMap",
    [{
      map: map,
      mode: mode,
      view: view
    }]
  );
  if (this.tryHandleCoreRawValue(writeTimerModuleViewForModeToMapCore, function (coreValue) {
    map = coreValue;
  })) {
    // map is assigned in handler
  } else {
    map[mode] = view === "hidden" ? "hidden" : "timer";
  }
  this.writeLocalStorageJsonMap(GameManager.TIMER_MODULE_VIEW_SETTINGS_KEY, map);
};

GameManager.prototype.notifyTimerModuleSettingsStateChanged = function () {
  this.callWindowMethod("syncTimerModuleSettingsUI");
};

GameManager.prototype.captureTimerModuleBaseHeight = function () {
  var timerBox = document.getElementById("timerbox");
  if (!timerBox) return;
  var h = Math.max(timerBox.offsetHeight || 0, timerBox.scrollHeight || 0);
  if (h > 0) {
    this.timerModuleBaseHeight = Math.max(this.timerModuleBaseHeight || 0, h);
  }
};

GameManager.prototype.applyTimerModuleView = function (view, skipPersist) {
  var timerBox = document.getElementById("timerbox");
  if (!timerBox) return;
  this.captureTimerModuleBaseHeight();
  var next = view === "hidden" ? "hidden" : "timer";
  this.timerModuleView = next;
  if (next === "hidden") timerBox.classList.add("timerbox-hidden-mode");
  else timerBox.classList.remove("timerbox-hidden-mode");
  if (this.timerModuleBaseHeight > 0) {
    timerBox.style.minHeight = this.timerModuleBaseHeight + "px";
  }

  if (!skipPersist) {
    this.persistTimerModuleViewForMode(this.mode, next);
  }
  this.notifyTimerModuleSettingsStateChanged();
};

GameManager.prototype.setTimerModuleViewMode = function (view, skipPersist) {
  this.applyTimerModuleView(view, !!skipPersist);
};

GameManager.prototype.readUndoPolicyFieldForMode = function (mode, fieldName, fallbackValue) {
  var state = this.resolveUndoPolicyStateForMode(mode);
  if (!state || typeof state !== "object") return fallbackValue;
  return this.hasOwnKey(state, fieldName) ? state[fieldName] : fallbackValue;
};

GameManager.prototype.getForcedUndoSettingForMode = function (mode) {
  var forced = this.readUndoPolicyFieldForMode(mode, "forcedUndoSetting", null);
  if (forced === true) return true;
  if (forced === false) return false;
  return null;
};

GameManager.prototype.isUndoAllowedByMode = function (mode) {
  return !!this.readUndoPolicyFieldForMode(mode, "isUndoAllowedByMode", false);
};

GameManager.prototype.isUndoSettingFixedForMode = function (mode) {
  return !!this.readUndoPolicyFieldForMode(mode, "isUndoSettingFixedForMode", false);
};

GameManager.prototype.resolveUndoPolicyStateForCurrentSessionMode = function (mode) {
  return this.resolveUndoPolicyStateForMode(mode, {
    hasGameStarted: !!this.hasGameStarted
  });
};

GameManager.prototype.canToggleUndoSetting = function (mode) {
  var state = this.resolveUndoPolicyStateForCurrentSessionMode(mode);
  return !!(state && state.canToggleUndoSetting);
};

GameManager.prototype.notifyUndoSettingsStateChanged = function () {
  this.callWindowMethod("syncUndoSettingsUI");
};

GameManager.prototype.loadUndoSettingForMode = function (mode) {
  var state = this.resolveUndoPolicyStateForCurrentSessionMode(mode);
  var forced = state ? state.forcedUndoSetting : null;
  if (forced !== null) return forced;
  if (!(state && state.isUndoAllowedByMode)) return false;
  var map = this.readLocalStorageJsonMap(GameManager.UNDO_SETTINGS_KEY);
  var readUndoEnabledForModeFromMapCore = this.callCoreStorageRuntime(
    "readUndoEnabledForModeFromMap",
    [{
      map: map,
      mode: mode,
      fallbackEnabled: true
    }]
  );
  return this.resolveCoreBooleanCallOrFallback(readUndoEnabledForModeFromMapCore, function () {
    if (this.hasOwnKey(map, mode)) return !!map[mode];
    return true;
  });
};

GameManager.prototype.applyUndoSettingForMode = function (mode, skipPersist, forceChange) {
  var nextEnabled = this.loadUndoSettingForMode(mode);
  this.setUndoEnabled(nextEnabled, !!skipPersist, !!forceChange);
  return !!this.undoEnabled;
};

GameManager.prototype.persistUndoSettingForMode = function (mode, enabled, resolvedState) {
  var state = (resolvedState && typeof resolvedState === "object")
    ? resolvedState
    : this.resolveUndoPolicyStateForCurrentSessionMode(mode);
  if (state && state.isUndoSettingFixedForMode) return;
  if (!(state && state.isUndoAllowedByMode)) return;
  var map = this.readLocalStorageJsonMap(GameManager.UNDO_SETTINGS_KEY);
  var writeUndoEnabledForModeToMapCore = this.callCoreStorageRuntime(
    "writeUndoEnabledForModeToMap",
    [{
      map: map,
      mode: mode,
      enabled: enabled
    }]
  );
  map = this.resolveNormalizedCoreValueOrFallback(writeUndoEnabledForModeToMapCore, function (coreValue) {
    return this.isNonArrayObject(coreValue) ? coreValue : undefined;
  }, function () {
    map[mode] = !!enabled;
    return map;
  });
  this.writeLocalStorageJsonMap(GameManager.UNDO_SETTINGS_KEY, map);
};

GameManager.prototype.resolveUndoEnabledFromForcedSetting = function (forcedSetting, fallbackEnabled) {
  if (forcedSetting !== null) return forcedSetting;
  return !!fallbackEnabled;
};

GameManager.prototype.shouldApplyUndoEnabledToggle = function (forceChange, state) {
  return !!(forceChange || (state && state.canToggleUndoSetting));
};

GameManager.prototype.setUndoEnabled = function (enabled, skipPersist, forceChange) {
  var state = this.resolveUndoPolicyStateForMode(this.mode);
  var forced = state ? state.forcedUndoSetting : null;
  if (forced !== null) {
    this.undoEnabled = this.resolveUndoEnabledFromForcedSetting(forced, enabled);
  } else if (this.shouldApplyUndoEnabledToggle(forceChange, state)) {
    this.undoEnabled = !!enabled;
    if (!skipPersist) {
      this.persistUndoSettingForMode(this.mode, this.undoEnabled, state);
    }
  }
  this.updateUndoUiState(this.resolveUndoPolicyStateForMode(this.mode, {
    undoEnabled: this.undoEnabled
  }));
  this.notifyUndoSettingsStateChanged();
};

GameManager.prototype.isUndoInteractionEnabled = function () {
  var state = this.resolveUndoPolicyStateForMode(this.mode);
  return !!(state && state.isUndoInteractionEnabled);
};

GameManager.prototype.updateUndoUiState = function (resolvedState) {
  var state = (resolvedState && typeof resolvedState === "object")
    ? resolvedState
    : this.resolveUndoPolicyStateForMode(this.mode);
  var canUndo = !!(state && state.isUndoInteractionEnabled);
  var modeUndoCapable = !!(state && state.isUndoAllowedByMode);
  var undoLink = document.getElementById("undo-link");
  if (undoLink) {
    undoLink.style.display = modeUndoCapable ? "" : "none";
    if (modeUndoCapable) {
      undoLink.style.pointerEvents = canUndo ? "" : "none";
      undoLink.style.opacity = canUndo ? "" : "0.45";
    }
  }
  var undoBtn = document.getElementById("undo-btn-gameover");
  if (undoBtn) undoBtn.style.display = canUndo ? "inline-block" : "none";
  var practiceUndoBtn = document.getElementById("practice-mobile-undo-btn");
  if (practiceUndoBtn) {
    practiceUndoBtn.style.pointerEvents = canUndo ? "" : "none";
    practiceUndoBtn.style.opacity = canUndo ? "" : "0.45";
    practiceUndoBtn.setAttribute("aria-disabled", canUndo ? "false" : "true");
  }
  this.callWindowMethod("syncMobileUndoTopButtonAvailability");
};

GameManager.prototype.ensureSpawnValueCounts = function () {
  if (!this.spawnValueCounts) this.spawnValueCounts = {};
};

GameManager.prototype.updateLegacySpawnCountFieldsFromCounts = function () {
  this.spawnTwos = this.spawnValueCounts["2"] || 0;
  this.spawnFours = this.spawnValueCounts["4"] || 0;
};

GameManager.prototype.applySpawnValueCountCoreResult = function (next) {
  if (next.nextSpawnValueCounts && typeof next.nextSpawnValueCounts === "object") {
    this.spawnValueCounts = next.nextSpawnValueCounts;
  } else {
    this.ensureSpawnValueCounts();
  }
  this.spawnTwos = Number(next.spawnTwos) || 0;
  this.spawnFours = Number(next.spawnFours) || 0;
};

GameManager.prototype.recordSpawnValue = function (value) {
  var applySpawnValueCountCore = this.callCoreRulesRuntime(
    "applySpawnValueCount",
    [this.spawnValueCounts, value]
  );
  if (this.tryHandleCoreRawValue(applySpawnValueCountCore, function (coreValue) {
    this.applySpawnValueCountCoreResult(coreValue || {});
  })) {
    this.refreshSpawnRateDisplay();
    return;
  }
  this.ensureSpawnValueCounts();
  var key = String(value);
  this.spawnValueCounts[key] = (this.spawnValueCounts[key] || 0) + 1;
  // Keep legacy fields for compatibility with existing UI hooks.
  this.updateLegacySpawnCountFieldsFromCounts();
  this.refreshSpawnRateDisplay();
};

GameManager.prototype.buildSpawnStatPair = function (primary, secondary) {
  return {
    primary: primary,
    secondary: secondary
  };
};

GameManager.prototype.normalizeSpawnStatPairCoreValue = function (corePair) {
  var normalizedCorePair = corePair && typeof corePair === "object" ? corePair : {};
  var corePrimary = Number(normalizedCorePair.primary);
  var coreSecondary = Number(normalizedCorePair.secondary);
  if (
    Number.isInteger(corePrimary) &&
    corePrimary > 0 &&
    Number.isInteger(coreSecondary) &&
    coreSecondary > 0
  ) {
    return this.buildSpawnStatPair(corePrimary, coreSecondary);
  }
  return null;
};

GameManager.prototype.collectUniqueSpawnValuesFromTable = function (spawnTable) {
  var table = Array.isArray(spawnTable) ? spawnTable : [];
  var values = [];
  for (var i = 0; i < table.length; i++) {
    var item = table[i];
    if (!item || !Number.isInteger(Number(item.value)) || Number(item.value) <= 0) continue;
    var value = Number(item.value);
    if (values.indexOf(value) === -1) values.push(value);
  }
  values.sort(function (a, b) { return a - b; });
  return values;
};

GameManager.prototype.resolveSpawnStatPairFromValues = function (values) {
  var primary = values.length > 0 ? values[0] : 2;
  var secondary = values.length > 1 ? values[1] : primary;
  return this.buildSpawnStatPair(primary, secondary);
};

GameManager.prototype.getSpawnStatPair = function () {
  var getSpawnStatPairCore = this.callCoreRulesRuntime(
    "getSpawnStatPair",
    [this.spawnTable || []]
  );
  return this.resolveNormalizedCoreValueOrFallback(
    getSpawnStatPairCore,
    this.normalizeSpawnStatPairCoreValue,
    function () {
      return this.resolveSpawnStatPairFromValues(this.collectUniqueSpawnValuesFromTable(this.spawnTable));
    }
  );
};

GameManager.prototype.getSpawnCount = function (value) {
  var getSpawnCountCore = this.callCoreRulesRuntime(
    "getSpawnCount",
    [this.spawnValueCounts, value]
  );
  return this.resolveCoreNumericCallOrFallback(getSpawnCountCore, function () {
    if (!this.spawnValueCounts) return 0;
    return this.spawnValueCounts[String(value)] || 0;
  });
};

GameManager.prototype.getTotalSpawnCount = function () {
  var getTotalSpawnCountCore = this.callCoreRulesRuntime(
    "getTotalSpawnCount",
    [this.spawnValueCounts]
  );
  return this.resolveCoreNumericCallOrFallback(getTotalSpawnCountCore, function () {
    if (!this.spawnValueCounts) return 0;
    var total = 0;
    for (var k in this.spawnValueCounts) {
      if (this.hasOwnKey(this.spawnValueCounts, k)) {
        total += this.spawnValueCounts[k] || 0;
      }
    }
    return total;
  });
};

GameManager.prototype.refreshSpawnRateDisplay = function () {
  // Top-left rate: current observed secondary spawn rate.
  // pow2 => 出4率, fibonacci => 出2率
  var text = this.getActualSecondaryRate();
  var rateEl = document.getElementById("stats-4-rate");
  if (rateEl) rateEl.textContent = text;
  if (this.cornerRateEl) this.cornerRateEl.textContent = text;
};

GameManager.prototype.getActualSecondaryRate = function () {
  var getActualSecondaryRateTextCore = this.callCoreRulesRuntime(
    "getActualSecondaryRateText",
    [
      this.spawnValueCounts,
      this.spawnTable || []
    ]
  );
  return this.resolveCoreStringCallOrFallback(getActualSecondaryRateTextCore, function () {
    var pair = this.getSpawnStatPair();
    var total = this.getTotalSpawnCount();
    if (total <= 0) return "0.00";
    return ((this.getSpawnCount(pair.secondary) / total) * 100).toFixed(2);
  });
};

GameManager.prototype.getActualFourRate = function () {
  // Keep old method name for compatibility.
  return this.getActualSecondaryRate();
};

GameManager.prototype.updateStatsPanelLabels = function () {
  var pair = this.getSpawnStatPair();
  var twoLabel = document.getElementById("stats-panel-two-label");
  if (twoLabel) twoLabel.textContent = "出" + pair.primary + "数量";
  var fourLabel = document.getElementById("stats-panel-four-label");
  if (fourLabel) fourLabel.textContent = "出" + pair.secondary + "数量";
  var rateLabel = document.getElementById("stats-panel-four-rate-label");
  if (rateLabel) rateLabel.textContent = "实际出" + pair.secondary + "率";
};

GameManager.prototype.resolveStatsPanelStepValues = function (totalSteps, moveSteps, undoSteps) {
  var fallback = this.computeStepStats();
  return {
    totalSteps: typeof totalSteps === "undefined" ? fallback.totalSteps : totalSteps,
    moveSteps: typeof moveSteps === "undefined" ? fallback.moveSteps : moveSteps,
    undoSteps: typeof undoSteps === "undefined" ? fallback.undoSteps : undoSteps
  };
};

GameManager.prototype.setStatsPanelFieldText = function (fieldId, value) {
  var element = document.getElementById(fieldId);
  if (element) element.textContent = String(value);
};

GameManager.prototype.updateStatsPanelStepTexts = function (stepValues) {
  this.setStatsPanelFieldText("stats-panel-total", stepValues.totalSteps);
  this.setStatsPanelFieldText("stats-panel-moves", stepValues.moveSteps);
  this.setStatsPanelFieldText("stats-panel-undo", stepValues.undoSteps);
};

GameManager.prototype.updateStatsPanelSpawnTexts = function (pair) {
  this.setStatsPanelFieldText("stats-panel-two", this.getSpawnCount(pair.primary));
  this.setStatsPanelFieldText("stats-panel-four", this.getSpawnCount(pair.secondary));
  var rateEl = document.getElementById("stats-panel-four-rate");
  if (rateEl) rateEl.textContent = this.getActualSecondaryRate();
};

GameManager.prototype.updateStatsPanel = function (totalSteps, moveSteps, undoSteps) {
  var stepValues = this.resolveStatsPanelStepValues(totalSteps, moveSteps, undoSteps);
  this.updateStatsPanelLabels();

  var pair = this.getSpawnStatPair();
  this.updateStatsPanelStepTexts(stepValues);
  this.updateStatsPanelSpawnTexts(pair);
};

GameManager.prototype.resolveStepStatsSource = function () {
  return {
    limit: this.replayMode ? this.replayIndex : this.moveHistory.length,
    actions: this.replayMode ? this.replayMoves : this.moveHistory
  };
};

GameManager.prototype.normalizeCoreStepStats = function (coreStats) {
  var raw = coreStats && typeof coreStats === "object" ? coreStats : {};
  var coreTotal = Number(raw.totalSteps);
  var coreMoves = Number(raw.moveSteps);
  var coreUndo = Number(raw.undoSteps);
  if (
    Number.isFinite(coreTotal) &&
    Number.isFinite(coreMoves) &&
    Number.isFinite(coreUndo)
  ) {
    return {
      totalSteps: coreTotal,
      moveSteps: coreMoves,
      undoSteps: coreUndo
    };
  }
  return null;
};

GameManager.prototype.tryResolveStepStatsFromCore = function (actions, limit) {
  var computeReplayStepStatsCore = this.callCoreReplayExecutionRuntime(
    "computeReplayStepStats",
    [{
      actions: actions,
      limit: limit
    }]
  );
  return this.resolveNormalizedCoreValueOrFallback(
    computeReplayStepStatsCore,
    function (coreValue) {
      return this.normalizeCoreStepStats(coreValue || {});
    },
    function () {
      return null;
    }
  );
};

GameManager.prototype.calculateNetMoveSteps = function (actions, limit) {
  if (!actions) return 0;
  var count = 0;
  for (var i = 0; i < limit; i++) {
    var kind = this.getActionKind(actions[i]);
    if (kind === "u") {
      if (count > 0) count--;
    } else if (kind === "m") {
      count++;
    }
  }
  return count;
};

GameManager.prototype.countUndoSteps = function (actions, limit) {
  if (!actions) return 0;
  var undoSteps = 0;
  for (var i = 0; i < limit; i++) {
    if (this.getActionKind(actions[i]) === "u") undoSteps++;
  }
  return undoSteps;
};

GameManager.prototype.computeStepStats = function () {
  var stepStatsSource = this.resolveStepStatsSource();
  var limit = stepStatsSource.limit;
  var src = stepStatsSource.actions;
  var coreStats = this.tryResolveStepStatsFromCore(src, limit);
  if (coreStats) return coreStats;
  return {
    totalSteps: src ? limit : 0,
    moveSteps: this.calculateNetMoveSteps(src, limit),
    undoSteps: this.countUndoSteps(src, limit)
  };
};

GameManager.prototype.getIpsInputCount = function () {
  var resolveIpsInputCountCore = this.callCoreReplayExecutionRuntime(
    "resolveIpsInputCount",
    [{
      replayMode: this.replayMode,
      replayIndex: this.replayIndex,
      ipsInputCount: this.ipsInputCount
    }]
  );
  return this.resolveCoreNumericCallOrFallback(resolveIpsInputCountCore, function () {
    if (this.replayMode) return Number.isInteger(this.replayIndex) && this.replayIndex > 0 ? this.replayIndex : 0;
    return Number.isInteger(this.ipsInputCount) && this.ipsInputCount >= 0 ? this.ipsInputCount : 0;
  });
};

GameManager.prototype.applyResolvedNextIpsInputCount = function (resolved) {
  if (!resolved || !resolved.shouldRecord) return false;
  var nextIps = Number(resolved.nextIpsInputCount);
  this.ipsInputCount = Number.isInteger(nextIps) && nextIps >= 0 ? nextIps : 0;
  return true;
};

GameManager.prototype.recordIpsInput = function () {
  var resolveNextIpsInputCountCore = this.callCoreReplayExecutionRuntime(
    "resolveNextIpsInputCount",
    [{
      replayMode: this.replayMode,
      replayIndex: this.replayIndex,
      ipsInputCount: this.ipsInputCount
    }]
  );
  if (this.tryHandleCoreRawValue(resolveNextIpsInputCountCore, function (coreValue) {
    this.applyResolvedNextIpsInputCount(coreValue || {});
  })) {
    return;
  }
  if (this.replayMode) return;
  if (!Number.isInteger(this.ipsInputCount) || this.ipsInputCount < 0) this.ipsInputCount = 0;
  this.ipsInputCount += 1;
};

GameManager.prototype.getIpsDisplayTargets = function () {
  return {
    statsIpsEl: document.getElementById("stats-ips"),
    cornerIpsEl: this.cornerIpsEl
  };
};

GameManager.prototype.resolveIpsDisplayDurationMs = function (durationMs) {
  var ms = Number(durationMs);
  if (!Number.isFinite(ms) || ms < 0) ms = this.getDurationMs();
  return ms;
};

GameManager.prototype.tryResolveIpsDisplayTextFromCore = function (durationMs, ipsInputCount) {
  var resolveIpsDisplayTextCore = this.callCoreReplayExecutionRuntime(
    "resolveIpsDisplayText",
    [{
      durationMs: durationMs,
      ipsInputCount: ipsInputCount
    }]
  );
  return this.resolveNormalizedCoreValueOrFallback(
    resolveIpsDisplayTextCore,
    function (coreValue) {
      var coreDisplay = coreValue || {};
      return typeof coreDisplay.ipsText === "string" && coreDisplay.ipsText ? coreDisplay.ipsText : "";
    },
    function () {
      return "";
    }
  );
};

GameManager.prototype.buildFallbackIpsDisplayText = function (durationMs, ipsInputCount) {
  var seconds = durationMs / 1000;
  var avgIps = 0;
  if (seconds > 0) {
    avgIps = (ipsInputCount / seconds).toFixed(2);
  }
  return "IPS: " + avgIps;
};

GameManager.prototype.applyIpsDisplayText = function (ipsText, displayTargets) {
  if (displayTargets.statsIpsEl) displayTargets.statsIpsEl.textContent = ipsText;
  if (displayTargets.cornerIpsEl) displayTargets.cornerIpsEl.textContent = ipsText;
};

GameManager.prototype.refreshIpsDisplay = function (durationMs) {
  var displayTargets = this.getIpsDisplayTargets();
  if (!displayTargets.statsIpsEl && !displayTargets.cornerIpsEl) return;
  var ms = this.resolveIpsDisplayDurationMs(durationMs);
  var ipsInputCount = this.getIpsInputCount();
  var ipsText = this.tryResolveIpsDisplayTextFromCore(ms, ipsInputCount);
  if (!ipsText) {
    ipsText = this.buildFallbackIpsDisplayText(ms, ipsInputCount);
  }
  this.applyIpsDisplayText(ipsText, displayTargets);
};

// Restart the game
GameManager.prototype.restart = function () {
  if (confirm("是否确认开始新游戏?")) {
      this.actuator.continue();
      this.undoStack = [];
      this.clearSavedGameState(this.modeKey);
      if (this.modeKey === "practice_legacy" && this.practiceRestartBoardMatrix) {
        this.restartWithBoard(
          this.practiceRestartBoardMatrix,
          this.practiceRestartModeConfig || this.modeConfig,
          { preservePracticeRestartBase: true }
        );
        this.isTestMode = true;
        return;
      }
      this.setup(undefined, { disableStateRestore: true });
  }
};

GameManager.prototype.restartWithSeed = function (seed, modeConfig) {
  this.actuator.continue();
  this.setup(seed, { modeConfig: modeConfig, disableStateRestore: true }); // Force setup with specific seed
};

GameManager.prototype.setPracticeRestartBase = function (board, modeConfig) {
  if (!Array.isArray(board) || board.length !== this.height) return;
  this.practiceRestartBoardMatrix = this.cloneBoardMatrix(board);
  this.practiceRestartModeConfig = modeConfig ? this.clonePlain(modeConfig) : this.clonePlain(this.modeConfig);
};

GameManager.prototype.resolveRestartWithBoardSeed = function (options) {
  var asReplay = !!(options && options.asReplay);
  return asReplay ? 0 : undefined;
};

GameManager.prototype.shouldSetPracticeRestartBaseOnBoardRestart = function (options) {
  if (this.modeKey !== "practice_legacy") return false;
  return !!(options && (options.setPracticeRestartBase || options.preservePracticeRestartBase));
};

GameManager.prototype.applyRestartWithBoardSnapshots = function () {
  this.initialBoardMatrix = this.getFinalBoardMatrix();
  this.replayStartBoardMatrix = this.cloneBoardMatrix(this.initialBoardMatrix);
};

GameManager.prototype.trySetPracticeRestartBaseOnBoardRestart = function (options, modeConfig) {
  if (!this.shouldSetPracticeRestartBaseOnBoardRestart(options)) return;
  this.setPracticeRestartBase(this.initialBoardMatrix, modeConfig || this.modeConfig);
};

GameManager.prototype.restartWithBoard = function (board, modeConfig, options) {
  options = options || {};
  this.actuator.continue();
  // Non-replay board restores must keep undo enabled; replay restores keep replay mode.
  var setupSeed = this.resolveRestartWithBoardSeed(options);
  this.setup(setupSeed, { skipStartTiles: true, modeConfig: modeConfig, disableStateRestore: true });
  this.setBoardFromMatrix(board);
  this.applyRestartWithBoardSnapshots();
  this.trySetPracticeRestartBaseOnBoardRestart(options, modeConfig);
  this.actuate();
};

GameManager.prototype.restartReplaySession = function (payload, modeConfig, useBoardRestart) {
  if (useBoardRestart) {
    this.restartWithBoard(payload, modeConfig, { asReplay: true });
    return;
  }
  this.restartWithSeed(payload, modeConfig);
};

// Keep playing after winning
GameManager.prototype.keepPlaying = function () {
  this.keepPlaying = true;
  this.actuator.continue();
};

GameManager.prototype.clearTransientTileVisualState = function () {
  if (!this.grid || typeof this.grid.eachCell !== "function") return;
  this.grid.eachCell(function (_x, _y, tile) {
    if (!tile) return;
    tile.previousPosition = null;
    tile.mergedFrom = null;
  });
};

GameManager.prototype.resolveIsGameTerminatedValue = function () {
  var isGameTerminatedStateCore = this.callCoreModeRuntime(
    "isGameTerminatedState",
    [{
      over: this.over,
      won: this.won,
      keepPlaying: this.keepPlaying
    }]
  );
  return this.resolveCoreBooleanCallOrFallback(isGameTerminatedStateCore, function () {
    return !!this.over || (!!this.won && !this.keepPlaying);
  });
};

GameManager.prototype.applyGameTerminationState = function () {
  this.stopTimer();
  this.timerEnd = Date.now();
};

GameManager.prototype.isGameTerminated = function () {
  var terminated = this.resolveIsGameTerminatedValue();
  if (!terminated) return false;
  this.applyGameTerminationState();
  return true;
};

GameManager.prototype.resetSetupReplayCollections = function () {
  this.moveHistory = [];
  this.replayCompactLog = "";
  this.initialBoardMatrix = null;
  this.replayStartBoardMatrix = null;
};

GameManager.prototype.applySetupSessionSyncDefaults = function (hasInputSeed) {
  if (!hasInputSeed) {
    this.disableSessionSync = false;
  }
  this.sessionSubmitDone = false;
};

GameManager.prototype.assignSetupInitialSeed = function (hasInputSeed, inputSeed) {
  this.initialSeed = hasInputSeed ? inputSeed : Math.random();
  this.seed = this.initialSeed;
};

GameManager.prototype.applySetupReplayModeFromInputSeed = function (hasInputSeed) {
  // If seed is provided externally, we might be in replay mode (or just restoring)
  this.replayMode = hasInputSeed;
};

GameManager.prototype.initializeSetupReplayState = function (inputSeed) {
  var hasInputSeed = typeof inputSeed !== "undefined";
  if (hasInputSeed) {
    this.replayIndex = 0;
  }
  this.assignSetupInitialSeed(hasInputSeed, inputSeed);
  this.resetSetupReplayCollections();
  this.applySetupReplayModeFromInputSeed(hasInputSeed);
  this.applySetupSessionSyncDefaults(hasInputSeed);
  return hasInputSeed;
};

GameManager.prototype.resetSetupRuntimeTileFlags = function () {
  this.lastSpawn = null;
  this.forcedSpawn = null;
  this.reached32k = false;
  this.isTestMode = false;
  this.cappedMilestoneCount = 0;
};

GameManager.prototype.resetSetupRuntimeTimerState = function () {
  this.timerStatus = 0;
  this.startTime = null;
  this.timerID = null;
  this.time = 0;
  this.accumulatedTime = 0;
  this.pendingMoveInput = null;
  this.moveInputFlushScheduled = false;
  this.lastMoveInputAt = 0;
  this.sessionStartedAt = Date.now();
  this.hasGameStarted = false;
  this.configureTimerMilestones();
};

GameManager.prototype.resetSetupRuntimeMoveAndUndoState = function () {
  this.comboStreak = 0;
  this.successfulMoveCount = 0;
  this.ipsInputCount = 0;
  this.undoUsed = 0;
  this.lockConsumedAtMoveCount = -1;
  this.lockedDirectionTurn = null;
  this.lockedDirection = null;
};

GameManager.prototype.initializeSetupRuntimeState = function () {
  this.resetSetupRuntimeTileFlags();
  this.resetSetupRuntimeTimerState();
  this.resetSetupRuntimeMoveAndUndoState();
};

GameManager.prototype.resetSetupSpawnValueCounters = function () {
  this.spawnValueCounts = {};
  this.spawnTwos = 0;
  this.spawnFours = 0;
};

GameManager.prototype.initializeSetupSpawnAndPreferences = function () {
  this.resetSetupSpawnValueCounters();
  this.undoEnabled = this.loadUndoSettingForMode(this.mode);
  var preferredTimerModuleView = this.loadTimerModuleViewForMode(this.mode);
  if (this.ipsInterval) clearInterval(this.ipsInterval);
  return preferredTimerModuleView;
};

GameManager.prototype.hideLegacyStatsUi = function () {
  var legacyTotalEl = document.getElementById("stats-total");
  if (legacyTotalEl) legacyTotalEl.style.visibility = "hidden";
  var legacyMovesEl = document.getElementById("stats-moves");
  if (legacyMovesEl) legacyMovesEl.style.visibility = "hidden";
  var legacyUndoEl = document.getElementById("stats-undo");
  if (legacyUndoEl) legacyUndoEl.style.visibility = "hidden";
};

GameManager.prototype.resetSetupMainTimerDisplay = function () {
  var timerEl = document.getElementById("timer");
  if (timerEl) timerEl.textContent = this.pretty(0);
};

GameManager.prototype.resetSetupFixedTimerSlotDisplays = function () {
  var timerSlots = GameManager.TIMER_SLOT_IDS;
  timerSlots.forEach(function (slotId) {
    var el = document.getElementById("timer" + slotId);
    if (el) el.textContent = "";
  });
};

GameManager.prototype.resetSetupSubTimerDisplays = function () {
  var sub8k = document.getElementById("timer8192-sub");
  if (sub8k) sub8k.textContent = "";
  var sub16k = document.getElementById("timer16384-sub");
  if (sub16k) sub16k.textContent = "";
  var subContainer = document.getElementById("timer32k-sub-container");
  if (subContainer) subContainer.style.display = "none";
};

GameManager.prototype.resetSetupCappedTimerContainers = function () {
  this.repositionCappedTimerContainer();
  this.applyCappedRowVisibility();
  this.resetCappedDynamicTimers();
};

GameManager.prototype.resetSetupTimerDisplays = function () {
  this.resetSetupMainTimerDisplay();
  this.resetSetupFixedTimerSlotDisplays();
  this.resetSetupSubTimerDisplays();
  this.resetSetupCappedTimerContainers();
};

GameManager.prototype.isSetupStateRestoreDisabled = function (options) {
  return !!(options && options.disableStateRestore);
};

GameManager.prototype.shouldRestoreStateOnSetup = function (hasInputSeed, skipStartTiles, options) {
  return !hasInputSeed &&
    !skipStartTiles &&
    !this.isSetupStateRestoreDisabled(options);
};

GameManager.prototype.resolveSetupRestoredFromSavedState = function (hasInputSeed, skipStartTiles, options) {
  if (!this.shouldRestoreStateOnSetup(hasInputSeed, skipStartTiles, options)) return false;
  return this.tryRestoreSavedGameState();
};

GameManager.prototype.applySetupStartTilesState = function (skipStartTiles, restoredFromSavedState) {
  if (!skipStartTiles && !restoredFromSavedState) {
    this.addStartTiles();
  }
  if (!restoredFromSavedState) {
    this.initialBoardMatrix = this.getFinalBoardMatrix();
  }
};

GameManager.prototype.updateSetupStatsPanelForRestoreState = function (restoredFromSavedState) {
  if (restoredFromSavedState) {
    this.updateStatsPanel();
  } else {
    this.updateStatsPanel(0, 0, 0);
  }
};

GameManager.prototype.finalizeSetupUiState = function (preferredTimerModuleView, restoredFromSavedState) {
  this.refreshSpawnRateDisplay();
  this.updateUndoUiState();
  this.notifyUndoSettingsStateChanged();
  this.applyTimerModuleView(preferredTimerModuleView, true);

  this.actuate();
  this.updateSetupStatsPanelForRestoreState(restoredFromSavedState);
};

GameManager.prototype.initializeSetupModeAndGrid = function (options) {
  var detectedMode = this.detectMode();
  var setupOptions = options && typeof options === "object" ? options : {};
  var globalModeConfig = null;
  if (typeof window !== "undefined" && window.GAME_MODE_CONFIG && typeof window.GAME_MODE_CONFIG === "object") {
    try {
      globalModeConfig = this.clonePlain(window.GAME_MODE_CONFIG);
    } catch (_err) {
      globalModeConfig = null;
    }
  }
  var resolvedModeConfig = setupOptions.modeConfig || globalModeConfig || this.resolveModeConfig(detectedMode);
  this.applyModeConfig(resolvedModeConfig);
  if (typeof window !== "undefined") {
    window.GAME_MODE_CONFIG = this.clonePlain(this.modeConfig);
  }
  this.grid = new Grid(this.width, this.height);
};

GameManager.prototype.resetSetupOutcomeState = function () {
  this.score = 0;
  this.over = false;
  this.won = false;
  this.keepPlaying = false;
};

GameManager.prototype.initializeSetupReplayAndRuntime = function (inputSeed, options) {
  var hasInputSeed = this.initializeSetupReplayState(inputSeed);
  this.challengeId =
    (typeof options.challengeId === "string" && options.challengeId)
      ? options.challengeId
      : null;
  if (!this.challengeId && typeof window !== "undefined" && window.GAME_CHALLENGE_CONTEXT && window.GAME_CHALLENGE_CONTEXT.id) {
    this.challengeId = window.GAME_CHALLENGE_CONTEXT.id;
  }
  this.sessionReplayV3 = {
    v: 3,
    mode: this.getLegacyModeFromModeKey(this.modeKey || this.mode),
    mode_key: this.modeKey,
    board_width: this.width,
    board_height: this.height,
    ruleset: this.ruleset,
    undo_enabled: !!this.modeConfig.undo_enabled,
    mode_family: this.modeFamily,
    rank_policy: this.rankPolicy,
    special_rules_snapshot: this.clonePlain(this.specialRules || {}),
    challenge_id: this.challengeId,
    seed: this.initialSeed,
    actions: []
  };
  this.initializeSetupRuntimeState();
  return hasInputSeed;
};

GameManager.prototype.initializeSetupUiShell = function () {
  var preferredTimerModuleView = this.initializeSetupSpawnAndPreferences();
  this.hideLegacyStatsUi();
  this.resetSetupTimerDisplays();
  return preferredTimerModuleView;
};

GameManager.prototype.buildSetupTileInitializationState = function (skipStartTiles, restoredFromSavedState) {
  return {
    skipStartTiles: skipStartTiles,
    restoredFromSavedState: restoredFromSavedState
  };
};

GameManager.prototype.resolveSetupTileInitializationState = function (hasInputSeed, options) {
  var skipStartTiles = !!(options && options.skipStartTiles);
  var restoredFromSavedState = this.resolveSetupRestoredFromSavedState(hasInputSeed, skipStartTiles, options);
  return this.buildSetupTileInitializationState(skipStartTiles, restoredFromSavedState);
};

GameManager.prototype.normalizeSetupOptions = function (options) {
  return options || {};
};

GameManager.prototype.applySetupTileInitializationState = function (hasInputSeed, options, preferredTimerModuleView) {
  var tileInitState = this.resolveSetupTileInitializationState(hasInputSeed, options);
  this.applySetupStartTilesState(tileInitState.skipStartTiles, tileInitState.restoredFromSavedState);
  this.finalizeSetupUiState(preferredTimerModuleView, tileInitState.restoredFromSavedState);
};

// Set up the game
GameManager.prototype.setup = function (inputSeed, options) {
  options = this.normalizeSetupOptions(options);
  this.initializeSetupModeAndGrid(options);
  this.resetSetupOutcomeState();
  
  // Replay logic
  var hasInputSeed = this.initializeSetupReplayAndRuntime(inputSeed, options);
  var preferredTimerModuleView = this.initializeSetupUiShell();

  // Add the initial tiles unless a replay imports an explicit board.
  this.applySetupTileInitializationState(hasInputSeed, options, preferredTimerModuleView);

  // 在线补传链路已移除，历史记录统一保存在本地。
};

// Set up the initial tiles to start the game with
GameManager.prototype.addStartTiles = function () {
  for (var i = 0; i < this.startTiles; i++) {
    this.addRandomTile();
  }
};

GameManager.prototype.tryConsumeForcedSpawnTile = function () {
  if (!this.replayMode || !this.forcedSpawn) return false;
  var forcedSpawn = this.forcedSpawn;
  if (this.grid.cellAvailable(forcedSpawn) && !this.isBlockedCell(forcedSpawn.x, forcedSpawn.y)) {
    var forcedTile = new Tile(forcedSpawn, forcedSpawn.value);
    this.grid.insertTile(forcedTile);
    this.recordSpawnValue(forcedSpawn.value);
    this.forcedSpawn = null;
  }
  return true;
};

GameManager.prototype.seedRandomForSpawn = function (steps) {
  Math.seedrandom(this.seed);
  for (var i = 0; i < steps; i++) {
    Math.random();
  }
};

GameManager.prototype.spawnRandomTileAtAvailableCell = function (available) {
  var value = this.pickSpawnValue();
  var cell = available[Math.floor(Math.random() * available.length)];
  var tile = new Tile(cell, value);
  this.grid.insertTile(tile);
  this.lastSpawn = { x: cell.x, y: cell.y, value: value };
  this.recordSpawnValue(value);
};

// Adds a tile in a random position
GameManager.prototype.addRandomTile = function () {
  if (this.tryConsumeForcedSpawnTile()) return;

  var available = this.getAvailableCells();
  if (!available.length) return;
  this.seedRandomForSpawn(this.replayMode ? this.replayIndex : this.moveHistory.length);
  this.spawnRandomTileAtAvailableCell(available);
};

GameManager.prototype.updateStatsLabelText = function (elementId, label, value) {
  var el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = label + value;
};

// Sends the updated grid to the actuator
GameManager.prototype.actuate = function () {
  if (this.scoreManager.get() < this.score) {
    this.scoreManager.set(this.score);
  }
  this.actuator.actuate(this.grid, {
    score: this.score,
    over: this.over,
    won: this.won,
    bestScore: this.scoreManager.get(),
    terminated: this.isGameTerminated(),
    blockedCells: this.blockedCellsList || []
  });
  var stepStats = this.computeStepStats();
  this.updateStatsLabelText("stats-total", "总步数: ", stepStats.totalSteps);
  this.updateStatsLabelText("stats-moves", "移动步数: ", stepStats.moveSteps);
  this.updateStatsLabelText("stats-undo", "撤回步数: ", stepStats.undoSteps);
  this.updateStatsPanel(stepStats.totalSteps, stepStats.moveSteps, stepStats.undoSteps);
  if (this.timerContainer) {
    var elapsedMs = this.timerStatus === 1
      ? Date.now() - this.startTime.getTime()
      : this.accumulatedTime;
    this.timerContainer.textContent = this.pretty(elapsedMs);
    this.refreshIpsDisplay(elapsedMs);
  }
  if (this.isSessionTerminated() && this.modeKey !== "practice_legacy") {
    this.clearSavedGameState(this.modeKey);
    this.tryAutoSubmitOnGameOver();
    return;
  }
  this.saveGameState();
};

// Save all tile positions and remove merger info
GameManager.prototype.prepareTileForMove = function (tile) {
  tile.mergedFrom = null;
  tile.savePosition();
};

GameManager.prototype.prepareTiles = function () {
  var manager = this;
  this.grid.eachCell(function (x, y, tile) {
    if (tile) manager.prepareTileForMove(tile);
  });
};

GameManager.prototype.getMoveInputThrottleMs = function () {
  var resolveMoveInputThrottleMsCore = this.callCoreTimerIntervalRuntime(
    "resolveMoveInputThrottleMs",
    [
      this.replayMode,
      this.width,
      this.height
    ]
  );
  return this.resolveCoreNumericCallOrFallback(resolveMoveInputThrottleMsCore, function () {
    if (this.replayMode) return 0;
    var area = (this.width || 4) * (this.height || 4);
    if (area >= 100) return 65;
    if (area >= 64) return 45;
    return 0;
  });
};

GameManager.prototype.executeImmediateMoveInput = function (direction, now) {
  this.lastMoveInputAt = now;
  this.move(direction);
};

GameManager.prototype.flushPendingMoveInput = function () {
  this.moveInputFlushScheduled = false;
  var direction = this.pendingMoveInput;
  this.pendingMoveInput = null;
  if (direction === null || typeof direction === "undefined") return;
  var throttleMs = this.getMoveInputThrottleMs();
  if (throttleMs <= 0) {
    this.move(direction);
    return;
  }
  var now = Date.now();
  var wait = throttleMs - (now - this.lastMoveInputAt);
  if (wait <= 0) {
    this.executeImmediateMoveInput(direction, now);
    return;
  }
  var self = this;
  setTimeout(function () {
    var hasPending = !(self.pendingMoveInput === null || typeof self.pendingMoveInput === "undefined");
    if (hasPending) {
      // Newer input exists; next flush will consume latest direction.
      if (self.moveInputFlushScheduled) return;
      self.moveInputFlushScheduled = true;
      self.requestAnimationFrame(function () {
        self.flushPendingMoveInput();
      });
      return;
    }
    self.executeImmediateMoveInput(direction, Date.now());
  }, wait);
};

GameManager.prototype.handleMoveInput = function (direction) {
  if (direction == -1) {
    this.move(direction);
    return;
  }

  var throttleMs = this.getMoveInputThrottleMs();
  if (throttleMs <= 0) {
    this.move(direction);
    return;
  }
  var now = Date.now();
  if ((now - this.lastMoveInputAt) >= throttleMs && !this.moveInputFlushScheduled) {
    this.executeImmediateMoveInput(direction, now);
    return;
  }
  this.pendingMoveInput = direction;
  if (this.moveInputFlushScheduled) return;
  this.moveInputFlushScheduled = true;
  var self = this;
  self.requestAnimationFrame(function () {
    self.flushPendingMoveInput();
  });
};

GameManager.prototype.restoreUndoPayload = function (undoPayload) {
  this.grid.build();
  this.score = Number.isFinite(undoPayload.score) && typeof undoPayload.score === "number"
    ? Number(undoPayload.score)
    : 0;
  var undoTiles = Array.isArray(undoPayload.tiles) ? undoPayload.tiles : [];
  for (var i = 0; i < undoTiles.length; i++) {
    var restored = this.createUndoRestoreTile(undoTiles[i]);
    var tile = new Tile({ x: restored.x, y: restored.y }, restored.value);
    tile.previousPosition = {
      x: restored.previousPosition.x,
      y: restored.previousPosition.y
    };
    this.grid.cells[tile.x][tile.y] = tile;
  }
};

GameManager.prototype.handleUndoMove = function (direction) {
  var canUndoOperation = this.replayMode || this.isUndoInteractionEnabled();
  var hasRemainingUndoBudget = this.undoLimit === null || this.undoUsed < this.undoLimit;
  if (!(canUndoOperation && hasRemainingUndoBudget && this.undoStack.length > 0)) {
    return;
  }

  var prev = this.normalizeUndoStackEntry(this.undoStack.pop());
  var undoPayload = this.computeUndoRestorePayload(prev);
  this.restoreUndoPayload(undoPayload);
  var undoRestore = this.computeUndoRestoreState(prev);
  this.comboStreak = Number.isInteger(undoRestore.comboStreak) && undoRestore.comboStreak >= 0
    ? undoRestore.comboStreak
    : 0;
  this.successfulMoveCount = Number.isInteger(undoRestore.successfulMoveCount) && undoRestore.successfulMoveCount >= 0
    ? undoRestore.successfulMoveCount
    : 0;
  this.lockConsumedAtMoveCount = Number.isInteger(undoRestore.lockConsumedAtMoveCount)
    ? undoRestore.lockConsumedAtMoveCount
    : -1;
  this.lockedDirectionTurn = Number.isInteger(undoRestore.lockedDirectionTurn)
    ? undoRestore.lockedDirectionTurn
    : null;
  this.lockedDirection = Number.isInteger(undoRestore.lockedDirection)
    ? undoRestore.lockedDirection
    : null;
  var defaultUndoUsed = Number.isInteger(this.undoUsed) && this.undoUsed >= 0 ? this.undoUsed : 0;
  this.undoUsed = Number.isInteger(undoRestore.undoUsed) && undoRestore.undoUsed >= 0
    ? undoRestore.undoUsed
    : (defaultUndoUsed + 1);
  this.over = typeof undoRestore.over === "boolean" ? undoRestore.over : false;
  this.won = typeof undoRestore.won === "boolean" ? undoRestore.won : false;
  this.keepPlaying = typeof undoRestore.keepPlaying === "boolean" ? undoRestore.keepPlaying : false;
  if (undoRestore.shouldClearMessage !== false) {
    this.actuator.clearMessage(); // Clear Game Over message if present
  }
  var postUndoRecord = this.computePostUndoRecord(direction);
  if (postUndoRecord.shouldRecordMoveHistory) {
    this.moveHistory.push(direction);
  }
  if (postUndoRecord.shouldAppendCompactUndo) {
    this.appendCompactUndo();
  }
  if (postUndoRecord.shouldPushSessionAction && this.sessionReplayV3) {
    this.sessionReplayV3.actions.push(
      Array.isArray(postUndoRecord.sessionAction) ? postUndoRecord.sessionAction : ["u"]
    );
  }
  this.actuate();
  var shouldStartTimerAfterUndo = typeof undoRestore.shouldStartTimer === "boolean"
    ? undoRestore.shouldStartTimer
    : this.timerStatus === 0;
  if (shouldStartTimerAfterUndo) {
    this.startTimer();
  }
  this.publishAdapterMoveResult({
    reason: "undo",
    direction: direction,
    moved: true
  });
};

GameManager.prototype.applySuccessfulMove = function (direction, scoreBeforeMove, undo) {
  // IPS counts only effective move inputs (invalid directions are excluded).
  this.recordIpsInput();

  var computePostMoveScoreCore = this.callCoreScoringRuntime(
    "computePostMoveScore",
    [{
      scoreBeforeMove: scoreBeforeMove,
      scoreAfterMerge: this.score,
      comboStreak: this.comboStreak,
      comboMultiplier: this.comboMultiplier
    }]
  );
  if (this.tryHandleCoreRawValue(computePostMoveScoreCore, function (coreValue) {
    var scoreResult = coreValue || {};
    if (Number.isFinite(scoreResult.score)) {
      this.score = Number(scoreResult.score);
    }
    if (Number.isInteger(scoreResult.comboStreak) && scoreResult.comboStreak >= 0) {
      this.comboStreak = scoreResult.comboStreak;
    }
  })) {
    // handled by core
  } else {
    var mergeGain = this.score - scoreBeforeMove;
    if (mergeGain > 0) {
      this.comboStreak += 1;
      if (this.comboMultiplier > 1 && this.comboStreak > 1) {
        var comboBonus = Math.floor(mergeGain * (this.comboMultiplier - 1) * (this.comboStreak - 1));
        if (comboBonus > 0) {
          this.score += comboBonus;
        }
      }
    } else {
      this.comboStreak = 0;
    }
  }

  this.addRandomTile();
  var hasMovesAvailable = this.movesAvailable();
  var computePostMoveLifecycleCore = this.callCorePostMoveRuntime(
    "computePostMoveLifecycle",
    [{
      successfulMoveCount: this.successfulMoveCount,
      hasMovesAvailable: hasMovesAvailable,
      timerStatus: this.timerStatus
    }]
  );
  var postMoveLifecycle = this.resolveNormalizedCoreValueOrFallback(
    computePostMoveLifecycleCore,
    function (coreValue) {
      var postMoveResult = coreValue || {};
      if (Number.isInteger(postMoveResult.successfulMoveCount) && postMoveResult.successfulMoveCount >= 0) {
        this.successfulMoveCount = postMoveResult.successfulMoveCount;
      } else {
        this.successfulMoveCount += 1;
      }
      this.over = typeof postMoveResult.over === "boolean" ? postMoveResult.over : !hasMovesAvailable;
      if (postMoveResult.shouldEndTime || this.over) {
        this.stopTimer();
        var endTimerElByCore = document.getElementById("timer");
        if (endTimerElByCore) endTimerElByCore.textContent = this.pretty(this.accumulatedTime);
      }
      return {
        postMoveResult: postMoveResult,
        shouldStartTimer:
          typeof postMoveResult.shouldStartTimer === "boolean"
            ? postMoveResult.shouldStartTimer
            : (this.timerStatus === 0 && !this.over)
      };
    },
    function () {
      this.successfulMoveCount += 1;
      if (!hasMovesAvailable) {
        this.over = true;
        this.stopTimer();
        var endTimerElFallback = document.getElementById("timer");
        if (endTimerElFallback) endTimerElFallback.textContent = this.pretty(this.accumulatedTime);
      }
      return {
        postMoveResult: null,
        shouldStartTimer: this.timerStatus === 0 && !this.over
      };
    }
  );
  this.undoStack.push(this.normalizeUndoStackEntry(undo));
  var postMoveRecord = this.computePostMoveRecord(direction);
  if (postMoveRecord.shouldRecordMoveHistory) {
    this.moveHistory.push(direction);
  }
  if (Number.isInteger(postMoveRecord.compactMoveCode)) {
    this.appendCompactMoveCode(postMoveRecord.compactMoveCode);
  }
  if (postMoveRecord.shouldPushSessionAction && this.sessionReplayV3) {
    this.sessionReplayV3.actions.push(
      Array.isArray(postMoveRecord.sessionAction)
        ? postMoveRecord.sessionAction
        : ["m", direction]
    );
  }
  if (postMoveRecord.shouldResetLastSpawn) {
    this.lastSpawn = null;
  }
  this.actuate();
  if (postMoveLifecycle && postMoveLifecycle.shouldStartTimer) {
    this.startTimer();
  }
  this.publishAdapterMoveResult({
    reason: "move",
    direction: direction,
    moved: true
  });
};

GameManager.prototype.executeDirectionalMove = function (direction) {
  var movePlan = {
    vector: this.getVector(direction),
    scoreBeforeMove: this.score,
    undo: this.createUndoSnapshotState()
  };
  var traversals = this.buildTraversals(movePlan.vector);

  // Save the current tile positions and remove merger information
  this.prepareTiles();

  var moved = false;
  for (var xIndex = 0; xIndex < traversals.x.length; xIndex++) {
    var x = traversals.x[xIndex];
    for (var yIndex = 0; yIndex < traversals.y.length; yIndex++) {
      var y = traversals.y[yIndex];
      var cell = { x: x, y: y };
      if (this.isBlockedCell(cell.x, cell.y)) continue;

      var tile = this.grid.cellContent(cell);
      if (!tile) continue;

      var positions = this.findFarthestPosition(cell, movePlan.vector);
      var next = this.isBlockedCell(positions.next.x, positions.next.y)
        ? null
        : this.grid.cellContent(positions.next);

      var mergedValue = next ? this.getMergedValue(tile.value, next.value) : null;
      var interaction = this.planTileInteraction(cell, positions, next, mergedValue);
      if (interaction.kind === "merge" && next && !next.mergedFrom && mergedValue !== null) {
        // We need to save tile since it will get removed
        movePlan.undo.tiles.push(this.createUndoTileSnapshot(tile, interaction.target));

        var merged = new Tile(interaction.target, mergedValue);
        merged.mergedFrom = [tile, next];

        this.grid.insertTile(merged);
        this.grid.removeTile(tile);

        // Converge the two tiles' positions
        tile.updatePosition(interaction.target);

        // Update the score
        this.score += merged.value;

        var timeStr = this.pretty(this.time);
        this.recordTimerMilestone(merged.value, timeStr);
        var mergeEffects = this.computeMergeEffects(merged.value);
        if (mergeEffects.shouldRecordCappedMilestone) {
          this.recordCappedMilestone(timeStr);
        }
        if (mergeEffects.shouldSetWon) {
          this.won = true;
        }
        if (mergeEffects.shouldSetReached32k) {
          this.reached32k = true;
        }
        var timerIdsToStamp = Array.isArray(mergeEffects.timerIdsToStamp)
          ? mergeEffects.timerIdsToStamp
          : [];
        for (var timerIndex = 0; timerIndex < timerIdsToStamp.length; timerIndex++) {
          var timerId = timerIdsToStamp[timerIndex];
          var timerEl = document.getElementById(timerId);
          if (!timerEl) continue;
          if (timerId === "timer32768") {
            if (timerEl.innerHTML === "") timerEl.textContent = timeStr;
          } else {
            if (timerEl.textContent === "") timerEl.textContent = timeStr;
          }
        }
        if (mergeEffects.showSubTimerContainer) {
          var subContainer = document.getElementById("timer32k-sub-container");
          if (subContainer) subContainer.style.display = "block";
        }
        var hideTimerRows = Array.isArray(mergeEffects.hideTimerRows) ? mergeEffects.hideTimerRows : [];
        for (var hideIndex = 0; hideIndex < hideTimerRows.length; hideIndex++) {
          var rowEl = document.getElementById("timer-row-" + String(hideTimerRows[hideIndex]));
          if (rowEl) rowEl.style.display = "none";
        }
        moved = interaction.moved === true || moved;
        continue;
      }
      movePlan.undo.tiles.push(this.createUndoTileSnapshot(tile, interaction.target));
      this.grid.cells[tile.x][tile.y] = null;
      this.grid.cells[interaction.target.x][interaction.target.y] = tile;
      tile.updatePosition(interaction.target);
      moved = interaction.moved === true || moved;
    }
  }
  if (!moved) return;
  this.applySuccessfulMove(direction, movePlan.scoreBeforeMove, movePlan.undo);
};

// Move tiles on the grid in the specified direction
GameManager.prototype.move = function (direction) {
  // 0: up, 1: right, 2:down, 3: left, -1: undo
  if (direction == -1) {
    this.handleUndoMove(direction);
    return;
  }
  if (this.isGameTerminated()) return; // Don't do anything if the game's over
  var lockedDirection = this.getLockedDirection();
  if (
    lockedDirection !== null &&
    typeof lockedDirection !== "undefined" &&
    Number(direction) === Number(lockedDirection)
  ) {
    this.lockConsumedAtMoveCount = this.successfulMoveCount;
    return;
  }
  this.executeDirectionalMove(direction);
};

GameManager.prototype.getVectorFallbackMap = function () {
  return {
    0: { x: 0,  y: -1 }, // up
    1: { x: 1,  y: 0 },  // right
    2: { x: 0,  y: 1 },  // down
    3: { x: -1, y: 0 }   // left
  };
};

// Get the vector representing the chosen direction
GameManager.prototype.getVector = function (direction) {
  var getVectorCore = this.callCoreMovePathRuntime(
    "getVector",
    [direction]
  );
  return this.resolveNormalizedCoreValueOrFallback(getVectorCore, function (coreValue) {
    if (!this.isNonArrayObject(coreValue)) return undefined;
    var x = Number(coreValue.x);
    var y = Number(coreValue.y);
    if (!Number.isInteger(x) || !Number.isInteger(y)) return undefined;
    return { x: x, y: y };
  }, function () {
    return this.getVectorFallbackMap()[direction];
  });
};

// Build a list of positions to traverse in the right order
GameManager.prototype.buildTraversals = function (vector) {
  var buildTraversalsCore = this.callCoreMovePathRuntime(
    "buildTraversals",
    [this.width, this.height, vector]
  );
  return this.resolveNormalizedCoreValueOrFallback(
    buildTraversalsCore,
    function (runtimeValue) {
      var computed = runtimeValue || {};
      return {
        x: Array.isArray(computed.x) ? computed.x : [],
        y: Array.isArray(computed.y) ? computed.y : []
      };
    },
    function () {
      var axisX = [];
      for (var x = 0; x < this.width; x++) {
        axisX.push(x);
      }
      var axisY = [];
      for (var y = 0; y < this.height; y++) {
        axisY.push(y);
      }
      return {
        x: vector.x === 1 ? axisX.reverse() : axisX,
        y: vector.y === 1 ? axisY.reverse() : axisY
      };
    }
  );
};

GameManager.prototype.findFarthestPosition = function (cell, vector) {
  var findFarthestPositionCore = this.callCoreMovePathRuntime(
    "findFarthestPosition",
    [
      cell,
      vector,
      this.width,
      this.height,
      this.isBlockedCell.bind(this),
      this.getGridCellAvailableFn()
    ]
  );
  var farthestPositionByCore = this.resolveNormalizedCoreValueOrUndefined(
    findFarthestPositionCore,
    function (runtimeValue) {
      var computed = runtimeValue || {};
      if (computed.farthest && computed.next) return computed;
      return null;
    }
  );
  if (typeof farthestPositionByCore !== "undefined") {
    var resolvedByCore = farthestPositionByCore;
    if (resolvedByCore) return resolvedByCore;
  }
  var previous;
  // Progress towards the vector direction until an obstacle is found
  do {
    previous = cell;
    cell = { x: previous.x + vector.x, y: previous.y + vector.y };
  } while (
    this.grid.withinBounds(cell) &&
    !this.isBlockedCell(cell.x, cell.y) &&
    this.grid.cellAvailable(cell)
  );
  return {
    farthest: previous,
    next: cell // Used to check if a merge is required
  };
};

GameManager.prototype.movesAvailable = function () {
  var movesAvailableCore = this.callCoreMoveScanRuntime(
    "movesAvailable",
    [
      this.getAvailableCells().length,
      this.tileMatchesAvailable()
    ]
  );
  return this.resolveCoreBooleanCallOrFallback(movesAvailableCore, function () {
    return this.getAvailableCells().length > 0 || this.tileMatchesAvailable();
  });
};

// Check for available matches between tiles (more expensive check)
GameManager.prototype.tileMatchesAvailable = function () {
  var manager = this;
  var tileMatchesAvailableCore = this.callCoreMoveScanRuntime(
    "tileMatchesAvailable",
    [
      this.width,
      this.height,
      this.isBlockedCell.bind(this),
      function (cell) {
        var tile = manager.grid.cellContent(cell);
        return tile ? tile.value : null;
      },
      function (a, b) {
        return manager.getMergedValue(a, b) !== null;
      }
    ]
  );
  return this.resolveCoreBooleanCallOrFallback(tileMatchesAvailableCore, function () {
    for (var x = 0; x < this.width; x++) {
      for (var y = 0; y < this.height; y++) {
        if (this.isBlockedCell(x, y)) continue;
        var tile = this.grid.cellContent({ x: x, y: y });
        if (!tile) continue;
        for (var direction = 0; direction < 4; direction++) {
          var vector = this.getVector(direction);
          var cell = { x: x + vector.x, y: y + vector.y };
          if (this.isBlockedCell(cell.x, cell.y)) continue;
          var other = this.grid.cellContent(cell);
          if (other && this.getMergedValue(tile.value, other.value) !== null) {
            return true;
          }
        }
      }
    }
    return false;
  });
};

GameManager.prototype.positionsEqual = function (first, second) {
  var positionsEqualCore = this.callCoreMovePathRuntime(
    "positionsEqual",
    [first, second]
  );
  return this.resolveCoreBooleanCallOrFallback(positionsEqualCore, function () {
    return first.x === second.x && first.y === second.y;
  });
};

// Start the timer
GameManager.prototype.startTimer = function() {
  if (this.timerStatus !== 0) return;
  this.timerStatus = 1;
  this.hasGameStarted = true;
  // Convert accumulated time back to a start timestamp relative to now
  this.startTime = new Date(Date.now() - (this.accumulatedTime || 0));
  this.notifyUndoSettingsStateChanged();
  var resolveTimerUpdateIntervalMsCore = this.callCoreTimerIntervalRuntime(
    "resolveTimerUpdateIntervalMs",
    [
      this.width,
      this.height
    ]
  );
  this.timerUpdateIntervalMs = this.resolveCoreNumericCallOrFallback(
    resolveTimerUpdateIntervalMsCore,
    function () {
      var area = (this.width || 4) * (this.height || 4);
      if (area >= 100) return 50;
      if (area >= 64) return 33;
      return 10;
    }
  );
  this.lastStatsPanelUpdateAt = 0;
  var manager = this;
  this.timerID = setInterval(function () {
    manager.updateTimer();
  }, this.timerUpdateIntervalMs);
};

// Update the timer
GameManager.prototype.updateTimer = function() {
  var time = this.startTime ? (Date.now() - this.startTime.getTime()) : null;
  if (time === null) return;
  this.time = time;
  var timerEl = document.getElementById("timer");
  if (timerEl) timerEl.textContent = this.pretty(time);
  this.refreshIpsDisplay(time);
  var overlay = document.getElementById("stats-panel-overlay");
  if (overlay && overlay.style.display !== "none") {
    var shouldRefreshStatsPanel = !this.lastStatsPanelUpdateAt || (time - this.lastStatsPanelUpdateAt) >= 100;
    if (shouldRefreshStatsPanel) {
      this.updateStatsPanel();
      this.lastStatsPanelUpdateAt = time;
    }
  }
};

GameManager.prototype.stopTimer = function() {
  if (this.timerStatus !== 1) return;
  if (!this.startTime || typeof this.startTime.getTime !== "function") {
    this.accumulatedTime = this.accumulatedTime || 0;
  } else {
    this.accumulatedTime = Date.now() - this.startTime.getTime();
  }
  clearInterval(this.timerID);
  this.timerID = null;
  this.timerStatus = 0;
};

GameManager.prototype.pretty = function(time) {
  var formatPrettyTimeCore = this.callCorePrettyTimeRuntime(
    "formatPrettyTime",
    [time]
  );
  return this.resolveCoreStringCallOrFallback(formatPrettyTimeCore, function () {
    if (time < 0) {return "DNF";}
    var bits = time % 1000;
    time = (time - bits) / 1000;
    var secs = time % 60;
    var mins = ((time - secs) / 60) % 60;
    var hours = (time - secs - 60 * mins) / 3600;
    var s = "" + bits;
    if (bits < 10) {s = "0" + s;}
    if (bits < 100) {s = "0" + s;}
    s = secs + "." + s;
    if (secs < 10 && (mins > 0 || hours > 0)) {s = "0" + s;}
    if (mins > 0 || hours > 0) {s = mins + ":" + s;}
    if (mins < 10 && hours > 0) {s = "0" + s;}
    if (hours > 0) {s = hours + ":" + s;}
    return s;
  });
};

GameManager.prototype.recordPracticeReplayAction = function (action) {
  if (this.replayMode || !this.sessionReplayV3 || this.modeKey !== "practice_legacy") return;
  this.sessionReplayV3.actions.push(action);
  if (Array.isArray(action) && action[0] === "p") {
    this.appendCompactPracticeAction(action[1], action[2], action[3]);
  }
};

GameManager.prototype.apply32kVisibilityStateForCustomTile = function (value) {
  if (value < 32768) return;
  this.reached32k = true;

  var subContainer = document.getElementById("timer32k-sub-container");
  if (subContainer) subContainer.style.display = "block";

  var timerRow16 = document.getElementById("timer-row-16");
  if (timerRow16) timerRow16.style.display = "none";
  var timerRow32 = document.getElementById("timer-row-32");
  if (timerRow32) timerRow32.style.display = "none";

  if (value === 32768) {
    var timeStr = this.pretty(this.time);
    var timer32k = document.getElementById("timer32768");
    if (timer32k && timer32k.textContent === "") {
      timer32k.textContent = timeStr;
    }
  }
};

// Insert a custom tile (Test Board)
GameManager.prototype.insertCustomTile = function(x, y, value) {
    if (this.isBlockedCell(x, y)) {
        throw "Blocked cell cannot be edited";
    }
    var cell = { x: x, y: y };
    var existingTile = this.grid.cellContent(cell);
    if (existingTile) {
        this.grid.removeTile(existingTile);
    }
    if (value === 0) {
        this.recordPracticeReplayAction(["p", x, y, value]);
        this.clearTransientTileVisualState();
        this.actuate();
        return;
    }
    var tile = new Tile({ x: x, y: y }, value);
    this.grid.insertTile(tile);
    this.invalidateTimers(value);
    this.apply32kVisibilityStateForCustomTile(value);
    this.clearTransientTileVisualState();
    this.actuate();
    this.recordPracticeReplayAction(["p", x, y, value]);
};

GameManager.prototype.applyInvalidatedTimerPlaceholders = function (elementIds) {
    var ids = Array.isArray(elementIds) ? elementIds : [];
    for (var idx = 0; idx < ids.length; idx++) {
        var targetId = ids[idx];
        if (!targetId) continue;
        var targetEl = document.getElementById(String(targetId));
        if (targetEl) targetEl.textContent = "---------";
    }
};

GameManager.prototype.invalidateTimers = function(limit) {
    var resolveInvalidatedTimerElementIdsCore = this.callCoreTimerIntervalRuntime(
        "resolveInvalidatedTimerElementIds",
        [{
            timerMilestones: this.timerMilestones || this.getTimerMilestoneValues(),
            timerSlotIds: GameManager.TIMER_SLOT_IDS,
            limit: limit,
            reached32k: !!this.reached32k,
            isFibonacciMode: this.isFibonacciMode()
        }]
    );
    var invalidatedTimerElementIdsByCore = this.resolveNormalizedCoreValueOrUndefined(
        resolveInvalidatedTimerElementIdsCore,
        function (coreValue) {
            return Array.isArray(coreValue) ? coreValue : [];
        }
    );
    if (typeof invalidatedTimerElementIdsByCore !== "undefined") {
        this.applyInvalidatedTimerPlaceholders(invalidatedTimerElementIdsByCore);
        return;
    }
    var milestones = this.timerMilestones || this.getTimerMilestoneValues();
    var timerSlots = GameManager.TIMER_SLOT_IDS;
    var elementIds = [];
    for (var i = 0; i < timerSlots.length; i++) {
        var milestoneValue = milestones[i];
        var slotId = timerSlots[i];
        if (!(Number.isInteger(milestoneValue) && milestoneValue <= limit)) continue;
        elementIds.push("timer" + slotId);
    }
    this.applyInvalidatedTimerPlaceholders(elementIds);
    if (this.reached32k && !this.isFibonacciMode()) {
        if (8192 <= limit && limit !== 32768) {
            var subTimer8192El = document.getElementById("timer8192-sub");
            if (subTimer8192El) subTimer8192El.textContent = "---------";
        }
        if (16384 <= limit && limit !== 32768) {
            var subTimer16384El = document.getElementById("timer16384-sub");
            if (subTimer16384El) subTimer16384El.textContent = "---------";
        }
    }
};

GameManager.prototype.normalizeFinalBoardMatrixFromCore = function (coreValue) {
  return Array.isArray(coreValue) ? coreValue : null;
};

GameManager.prototype.getFinalBoardMatrix = function () {
  var manager = this;
  var buildBoardMatrixCore = this.callCoreGridScanRuntime(
    "buildBoardMatrix",
    [
      this.width,
      this.height,
      function (x, y) {
        var tile = manager.grid.cellContent({ x: x, y: y });
        return tile ? tile.value : 0;
      }
    ]
  );
  return this.resolveNormalizedCoreValueOrFallback(
    buildBoardMatrixCore,
    this.normalizeFinalBoardMatrixFromCore,
    function () {
      var rows = [];
      for (var y = 0; y < this.height; y++) {
        var row = [];
        for (var x = 0; x < this.width; x++) {
          var tile = this.grid.cellContent({ x: x, y: y });
          row.push(tile ? tile.value : 0);
        }
        rows.push(row);
      }
      return rows;
    }
  );
};

GameManager.prototype.getBestTileValue = function () {
  var getBestTileValueCore = this.callCoreGridScanRuntime("getBestTileValue", [this.getFinalBoardMatrix()]);
  return this.resolveNormalizedCoreValueOrFallback(
    getBestTileValueCore,
    function (rawBestTileValue) {
      var bestValue = Number(rawBestTileValue);
      if (!Number.isFinite(bestValue) || bestValue < 0) return null;
      return bestValue;
    },
    function () {
      var best = 0;
      this.grid.eachCell(function (_x, _y, tile) {
        if (tile && tile.value > best) best = tile.value;
      });
      return best;
    }
  );
};

GameManager.prototype.getDurationMs = function () {
  var nowMs = Date.now();
  var durationCoreInput = {
    timerStatus: this.timerStatus,
    startTimeMs:
      this.startTime && typeof this.startTime.getTime === "function"
        ? this.startTime.getTime()
        : null,
    accumulatedTime: this.accumulatedTime,
    sessionStartedAt: this.sessionStartedAt,
    nowMs: nowMs
  };
  var resolveDurationMsCore = this.callCoreReplayTimerRuntime(
    "resolveDurationMs",
    [durationCoreInput]
  );
  return this.resolveNormalizedCoreValueOrFallback(
    resolveDurationMsCore,
    this.normalizeDurationMs,
    function () {
      var ms;
      if (this.timerStatus === 1 && this.startTime) {
        ms = nowMs - this.startTime.getTime();
      } else {
        ms = this.accumulatedTime || 0;
      }
      if (!Number.isFinite(ms) || ms < 0) {
        ms = nowMs - (this.sessionStartedAt || nowMs);
      }
      return this.normalizeDurationMs(ms);
    }
  );
};

GameManager.prototype.normalizeDurationMs = function (rawMs) {
  var ms = Number(rawMs);
  if (!Number.isFinite(ms)) return null;
  ms = Math.floor(ms);
  return ms < 0 ? 0 : ms;
};

GameManager.prototype.serializeV3 = function () {
  var replay = this.sessionReplayV3 || {
    v: 3,
    mode: this.getLegacyModeFromModeKey(this.modeKey || this.mode),
    mode_key: this.modeKey,
    board_width: this.width,
    board_height: this.height,
    ruleset: this.ruleset,
    undo_enabled: !!this.modeConfig.undo_enabled,
    mode_family: this.modeFamily,
    rank_policy: this.rankPolicy,
    special_rules_snapshot: this.clonePlain(this.specialRules || {}),
    seed: this.initialSeed,
    actions: []
  };
  return {
    v: 3,
    mode: this.getLegacyModeFromModeKey(replay.mode_key || replay.mode || this.modeKey || this.mode),
    mode_key: replay.mode_key || this.modeKey,
    board_width: replay.board_width || this.width,
    board_height: replay.board_height || this.height,
    ruleset: replay.ruleset || this.ruleset,
    undo_enabled: typeof replay.undo_enabled === "boolean" ? replay.undo_enabled : !!this.modeConfig.undo_enabled,
    mode_family: replay.mode_family || this.modeFamily,
    rank_policy: replay.rank_policy || this.rankPolicy,
    special_rules_snapshot: this.clonePlain(replay.special_rules_snapshot || this.specialRules || {}),
    challenge_id: replay.challenge_id || this.challengeId || null,
    seed: replay.seed,
    actions: replay.actions.slice()
  };
};

GameManager.prototype.tryAutoSubmitOnGameOver = function () {
  if (this.sessionSubmitDone) return;
  var skippedReason = null;
  if (this.replayMode) skippedReason = "replay_mode";
  else if (!this.isSessionTerminated()) skippedReason = "not_terminated";
  if (skippedReason) {
    this.writeLocalStorageJsonPayload("last_session_submit_result_v1", {
      at: new Date().toISOString(),
      ok: false,
      skipped: true,
      reason: skippedReason
    });
    return;
  }
  var localHistorySaveRecord = this.resolveWindowNamespaceMethod("LocalHistoryStore", "saveRecord");
  if (!localHistorySaveRecord) {
    this.writeLocalStorageJsonPayload("last_session_submit_result_v1", {
      at: new Date().toISOString(),
      ok: false,
      reason: "local_history_store_missing"
    });
    return;
  }
  this.sessionSubmitDone = true;
  var endedAt = new Date().toISOString();
  var windowLike = this.getWindowLike();
  var adapterParitySnapshot = {
    report: this.getAdapterSessionParitySnapshot("readAdapterParityReport", "adapterParityReport"),
    diff: this.getAdapterSessionParitySnapshot("readAdapterParityABDiff", "adapterParityABDiff")
  };
  var parity = adapterParitySnapshot && typeof adapterParitySnapshot === "object"
    ? adapterParitySnapshot
    : {};
  var payload = {
    mode: this.getLegacyModeFromModeKey(this.modeKey || this.mode),
    mode_key: this.modeKey,
    board_width: this.width,
    board_height: this.height,
    ruleset: this.ruleset,
    undo_enabled: !!this.modeConfig.undo_enabled,
    ranked_bucket: this.rankedBucket,
    mode_family: this.modeFamily,
    rank_policy: this.rankPolicy,
    challenge_id: this.challengeId || null,
    special_rules_snapshot: this.clonePlain(this.specialRules || {}),
    score: this.score,
    best_tile: this.getBestTileValue(),
    duration_ms: this.getDurationMs(),
    final_board: this.getFinalBoardMatrix(),
    ended_at: endedAt,
    replay: this.serializeV3(),
    replay_string: this.serialize(),
    adapter_parity_report_v2: parity.report,
    adapter_parity_ab_diff_v2: parity.diff,
    adapter_parity_report_v1: parity.report,
    adapter_parity_ab_diff_v1: parity.diff,
    client_version: (windowLike && windowLike.GAME_CLIENT_VERSION) || "1.8",
    end_reason: this.over ? "game_over" : "win_stop"
  };
  try {
    var saved = localHistorySaveRecord.method.call(localHistorySaveRecord.scope, payload);
    this.writeLocalStorageJsonPayload("last_session_submit_result_v1",
      {
        at: endedAt,
        ok: true,
        mode_key: payload.mode_key,
        score: payload.score,
        local_saved: true,
        record_id: saved && saved.id ? saved.id : null
      }
    );
  } catch (error) {
    this.writeLocalStorageJsonPayload("last_session_submit_result_v1",
      {
        at: endedAt,
        ok: false,
        mode_key: payload.mode_key,
        score: payload.score,
        error: error && error.message ? error.message : "local_save_failed"
      }
    );
  }
};

GameManager.prototype.isSessionTerminated = function () {
  return !!(this.over || (this.won && !this.keepPlaying));
};

GameManager.prototype.serialize = function () {
  if (this.width !== 4 || this.height !== 4 || this.isFibonacciMode()) {
    return JSON.stringify(this.serializeV3());
  }
  var modeCode = GameManager.REPLAY_V4_MODE_KEY_TO_CODE[this.modeKey] || "C";
  var initialBoard = this.initialBoardMatrix || this.getFinalBoardMatrix();
  var encodedBoard = this.encodeBoardV4(initialBoard);
  return GameManager.REPLAY_V4_PREFIX + modeCode + encodedBoard + (this.replayCompactLog || "");
};

GameManager.prototype.applyReplayImportActions = function (payload) {
  var source = payload && typeof payload === "object" ? payload : {};
  this.replayMoves = Array.isArray(source.replayMoves) ? source.replayMoves : [];
  if (this.hasOwnKey(source, "replaySpawns")) {
    this.replaySpawns = source.replaySpawns;
  }
  if (typeof source.replayMovesV2 === "string") {
    this.replayMovesV2 = source.replayMovesV2;
  }
};

GameManager.prototype.import = function (replayString) {
  try {
    var trimmed = (typeof replayString === "string" ? replayString : JSON.stringify(replayString)).trim();
    var parseReplayImportEnvelopeCore = this.callCoreReplayImportRuntime(
      "parseReplayImportEnvelope",
      [{
        trimmedReplayString: trimmed,
        fallbackModeKey: this.modeKey || this.mode || GameManager.DEFAULT_MODE_KEY,
        v4Prefix: GameManager.REPLAY_V4_PREFIX
      }]
    );
    var parsedEnvelope = this.resolveNormalizedCoreValueOrFallbackAllowNull(parseReplayImportEnvelopeCore, function (coreValue) {
      if (coreValue === null) return null;
      return this.isNonArrayObject(coreValue) ? coreValue : undefined;
    }, function () {
      var jsonEnvelope = null;
      if (trimmed.charAt(0) === "{") {
        var replayObj = JSON.parse(trimmed);
        if (replayObj) {
          if (replayObj.v !== 3) throw "Unsupported JSON replay version";
          var actions = replayObj.actions;
          if (!Array.isArray(actions)) throw "Invalid v3 actions";
          var specialRulesSnapshot =
            replayObj.special_rules_snapshot && typeof replayObj.special_rules_snapshot === "object"
              ? replayObj.special_rules_snapshot
              : null;
          var normalizeOptional = function (raw) {
            return typeof raw === "string" && raw ? raw : null;
          };
          var modeFamily = normalizeOptional(replayObj.mode_family);
          var rankPolicy = normalizeOptional(replayObj.rank_policy);
          var challengeId = normalizeOptional(replayObj.challenge_id);
          var modeKey =
            normalizeOptional(replayObj.mode_key) ||
            normalizeOptional(replayObj.mode) ||
            this.modeKey ||
            this.mode;
          jsonEnvelope = {
            kind: "json-v3",
            modeKey: modeKey,
            actions: actions,
            seed: replayObj.seed,
            specialRulesSnapshot: specialRulesSnapshot,
            modeFamily: modeFamily,
            rankPolicy: rankPolicy,
            challengeId: challengeId
          };
        }
      }
      if (jsonEnvelope) return jsonEnvelope;
      if (trimmed.indexOf(GameManager.REPLAY_V4_PREFIX) !== 0) return null;
      var body = trimmed.substring(GameManager.REPLAY_V4_PREFIX.length);
      if (body.length < 17) throw "Invalid v4C payload";
      var modeCode = body.charAt(0);
      var replayModeIdV4 = GameManager.REPLAY_V4_MODE_CODE_TO_KEY[modeCode] || null;
      if (!replayModeIdV4) throw "Invalid v4C mode";
      return {
        kind: "v4c",
        modeKey: replayModeIdV4,
        initialBoardEncoded: body.substring(1, 17),
        actionsEncoded: body.substring(17)
      };
    });
    if (parsedEnvelope && (parsedEnvelope.kind === "json-v3" || parsedEnvelope.kind === "v4c")) {
      var replayModeConfig = this.resolveModeConfig(parsedEnvelope.modeKey);
      if (parsedEnvelope.kind === "json-v3") {
        var specialRulesSnapshot =
          !parsedEnvelope.specialRulesSnapshot || typeof parsedEnvelope.specialRulesSnapshot !== "object"
            ? null
            : this.clonePlain(parsedEnvelope.specialRulesSnapshot);
        if (specialRulesSnapshot) {
          replayModeConfig.special_rules = specialRulesSnapshot;
        }
        if (typeof parsedEnvelope.modeFamily === "string" && parsedEnvelope.modeFamily) {
          replayModeConfig.mode_family = parsedEnvelope.modeFamily;
        }
        if (typeof parsedEnvelope.rankPolicy === "string" && parsedEnvelope.rankPolicy) {
          replayModeConfig.rank_policy = parsedEnvelope.rankPolicy;
        }
        if (typeof parsedEnvelope.challengeId === "string" && parsedEnvelope.challengeId) {
          this.challengeId = parsedEnvelope.challengeId;
        }
        this.applyReplayImportActions({
          replayMoves: parsedEnvelope.actions,
          replaySpawns: null
        });
        this.disableSessionSync = true;
        this.restartReplaySession(parsedEnvelope.seed, replayModeConfig, false);
      } else {
        var initialBoard = this.decodeBoardV4(parsedEnvelope.initialBoardEncoded);
        var actionsEncoded = parsedEnvelope.actionsEncoded;
        var decodeReplayV4ActionsCore = this.callCoreReplayV4ActionsRuntime(
          "decodeReplayV4Actions",
          [actionsEncoded]
        );
        var decodedV4Actions = this.resolveCoreObjectCallOrFallback(decodeReplayV4ActionsCore, function () {
          var decodeMoveSpawnFromToken = function (token) {
            var dir = (token >> 5) & 3;
            var is4 = (token >> 4) & 1;
            var posIdx = token & 15;
            return {
              action: dir,
              spawn: {
                x: posIdx % 4,
                y: Math.floor(posIdx / 4),
                value: is4 ? 4 : 2
              }
            };
          };
          var replayMoves = [];
          var replaySpawns = [];
          var i = 0;
          while (i < actionsEncoded.length) {
            var token = this.decodeReplay128(actionsEncoded.charAt(i));
            if (token < 127) {
              var decodedToken = decodeMoveSpawnFromToken(token);
              replayMoves.push(decodedToken.action);
              replaySpawns.push(decodedToken.spawn);
              i += 1;
              continue;
            }
            var escapedIndex = i + 1;
            if (escapedIndex >= actionsEncoded.length) throw "Invalid v4C escape";
            var subtype = this.decodeReplay128(actionsEncoded.charAt(escapedIndex));
            if (subtype === 0) {
              var decoded127 = decodeMoveSpawnFromToken(127);
              replayMoves.push(decoded127.action);
              replaySpawns.push(decoded127.spawn);
              i = escapedIndex + 1;
              continue;
            }
            if (subtype === 1) {
              replayMoves.push(-1);
              replaySpawns.push(null);
              i = escapedIndex + 1;
              continue;
            }
            if (subtype === 2) {
              var payloadIndex = escapedIndex + 1;
              if (payloadIndex + 1 >= actionsEncoded.length) throw "Invalid v4C practice action";
              var cell = this.decodeReplay128(actionsEncoded.charAt(payloadIndex));
              var exp = this.decodeReplay128(actionsEncoded.charAt(payloadIndex + 1));
              if (cell < 0 || cell > 15) throw "Invalid v4C practice cell";
              replayMoves.push(["p", (cell >> 2) & 3, cell & 3, exp === 0 ? 0 : Math.pow(2, exp)]);
              replaySpawns.push(null);
              i = payloadIndex + 2;
              continue;
            }
            throw "Unknown v4C escape subtype";
          }
          return {
            replayMoves: replayMoves,
            replaySpawns: replaySpawns
          };
        });
        this.applyReplayImportActions({
          replayMoves: decodedV4Actions ? decodedV4Actions.replayMoves : null,
          replaySpawns: Array.isArray(decodedV4Actions && decodedV4Actions.replaySpawns)
            ? decodedV4Actions.replaySpawns
            : []
        });
        this.disableSessionSync = true;
        this.restartReplaySession(initialBoard, replayModeConfig, true);
      }
      this.applyUndoSettingForMode(this.modeKey, true, true);
      this.replayIndex = 0;
      this.replayDelay = 200;
      this.resume();
    } else {
      var decodeLegacyReplayCore = this.callCoreReplayLegacyRuntime(
        "decodeLegacyReplay",
        [trimmed]
      );
      var decodedLegacy = this.resolveNormalizedCoreValueOrFallback(decodeLegacyReplayCore, function (coreValue) {
        return this.isNonArrayObject(coreValue) ? coreValue : undefined;
      }, function () {
        var decodeLegacyReplayV2Log = function (logString) {
          var replayMoves = [];
          var replaySpawns = [];
          for (var i = 0; i < logString.length; i++) {
            var code = logString.charCodeAt(i) - 33;
            if (code < 0 || code > 128) {
              throw "Invalid replay char at index " + i;
            }
            var entry;
            if (code === 128) {
              entry = {
                move: -1,
                spawn: null
              };
            } else {
              var dir = (code >> 5) & 3;
              var is4 = (code >> 4) & 1;
              var posIdx = code & 15;
              entry = {
                move: dir,
                spawn: {
                  x: posIdx % 4,
                  y: Math.floor(posIdx / 4),
                  value: is4 ? 4 : 2
                }
              };
            }
            replayMoves.push(entry.move);
            replaySpawns.push(entry.spawn);
          }
          return {
            replayMoves: replayMoves,
            replaySpawns: replaySpawns
          };
        };
        if (trimmed.indexOf(GameManager.LEGACY_REPLAY_V1_PREFIX) === 0) {
          var v1Parts = trimmed.split("_");
          var seed = parseFloat(v1Parts[2]);
          var movesString = v1Parts[3];
          var replayMovesV1 = movesString.split("").map(function (char) {
            var val = GameManager.LEGACY_REPLAY_V1_REVERSE_MAPPING[char];
            if (val === undefined) throw "Invalid move char: " + char;
            return val;
          }, this);
          return {
            seed: seed,
            replayMoves: replayMovesV1,
            replaySpawns: null
          };
        }
        if (trimmed.indexOf(GameManager.LEGACY_REPLAY_V2S_PREFIX) === 0) {
          var rest = trimmed.substring(GameManager.LEGACY_REPLAY_V2S_PREFIX.length);
          var seedSep = rest.indexOf("_");
          if (seedSep < 0) throw "Invalid v2S format";
          var seedS = parseFloat(rest.substring(0, seedSep));
          if (isNaN(seedS)) throw "Invalid v2S seed";
          var logStringS = rest.substring(seedSep + 1);
          var decodedLogS = decodeLegacyReplayV2Log(logStringS);
          return {
            seed: seedS,
            replayMovesV2: logStringS,
            replayMoves: decodedLogS.replayMoves,
            replaySpawns: decodedLogS.replaySpawns
          };
        }
        if (trimmed.indexOf(GameManager.LEGACY_REPLAY_V2_PREFIX) !== 0) return null;
        var logString = trimmed.substring(GameManager.LEGACY_REPLAY_V2_PREFIX.length);
        var decodedLog = decodeLegacyReplayV2Log(logString);
        return {
          seed: 0.123,
          replayMovesV2: logString,
          replayMoves: decodedLog.replayMoves,
          replaySpawns: decodedLog.replaySpawns
        };
      });
      if (decodedLegacy) {
        this.applyReplayImportActions({
          replayMovesV2: decodedLegacy.replayMovesV2,
          replayMoves: decodedLegacy.replayMoves,
          replaySpawns: decodedLegacy.replaySpawns
        });
        this.restartWithSeed(decodedLegacy.seed);
        this.replayIndex = 0;
        this.replayDelay = 200;
        this.resume();
      } else {
        throw "Unknown replay version";
      }
    }
    return true;
  } catch (e) {
    alert("导入回放出错: " + e);
    return false;
  }
};

GameManager.prototype.executePlannedReplayStep = function () {
  var planReplayStepExecutionCore = this.callCoreReplayLoopRuntime(
    "planReplayStepExecution",
    [{
      replayMoves: this.replayMoves,
      replaySpawns: this.replaySpawns,
      replayIndex: this.replayIndex
    }]
  );
  var stepExecutionPlan = this.resolveCoreObjectCallOrFallback(planReplayStepExecutionCore, function () {
    var action = this.replayMoves[this.replayIndex];
    var spawnAtIndex = this.replaySpawns ? this.replaySpawns[this.replayIndex] : undefined;
    var planReplayStepCore = this.callCoreReplayLifecycleRuntime(
      "planReplayStep",
      [{
        action: action,
        hasReplaySpawns: !!this.replaySpawns,
        spawnAtIndex: spawnAtIndex
      }]
    );
    var stepPlan = this.resolveCoreObjectCallOrFallback(planReplayStepCore, function () {
      var shouldInjectForcedSpawn = !!this.replaySpawns && !Array.isArray(action);
      return {
        shouldInjectForcedSpawn: shouldInjectForcedSpawn,
        forcedSpawn: shouldInjectForcedSpawn ? spawnAtIndex : undefined
      };
    });
    return {
      action: action,
      shouldInjectForcedSpawn: !!stepPlan.shouldInjectForcedSpawn,
      forcedSpawn: stepPlan.forcedSpawn,
      nextReplayIndex: this.replayIndex + 1
    };
  });
  if (stepExecutionPlan.shouldInjectForcedSpawn) {
    this.forcedSpawn = stepExecutionPlan.forcedSpawn;
  }
  var action = stepExecutionPlan.action;
  var resolveReplayExecutionCore = this.callCoreReplayExecutionRuntime(
    "resolveReplayExecution",
    [action]
  );
  var resolved = this.resolveNormalizedCoreValueOrFallback(resolveReplayExecutionCore, function (coreValue) {
    return this.isNonArrayObject(coreValue) ? coreValue : undefined;
  }, function () {
    var kind = this.getActionKind(action);
    if (kind === "m") {
      return {
        kind: "m",
        dir: Array.isArray(action) ? action[1] : action
      };
    }
    if (kind === "u") return { kind: "u" };
    if (kind === "p") {
      return {
        kind: "p",
        x: action[1],
        y: action[2],
        value: action[3]
      };
    }
    throw "Unknown replay action";
  });
  var planReplayDispatchCore = this.callCoreReplayDispatchRuntime(
    "planReplayDispatch",
    [resolved]
  );
  var dispatchPlan = this.resolveCoreObjectCallOrFallback(planReplayDispatchCore, function () {
    if (resolved.kind === "m") return { method: "move", args: [resolved.dir] };
    if (resolved.kind === "u") return { method: "move", args: [-1] };
    if (resolved.kind === "p") {
      return {
        method: "insertCustomTile",
        args: [resolved.x, resolved.y, resolved.value]
      };
    }
    throw "Unknown replay action";
  });
  var dispatchMethod = dispatchPlan && dispatchPlan.method;
  var args = dispatchPlan && Array.isArray(dispatchPlan.args) ? dispatchPlan.args : [];
  if (dispatchMethod === "move") {
    this.move(args[0]);
  } else if (dispatchMethod === "insertCustomTile") {
    this.insertCustomTile(args[0], args[1], args[2]);
  } else {
    throw "Unknown replay action";
  }
  this.replayIndex = stepExecutionPlan.nextReplayIndex;
};

GameManager.prototype.pause = function () {
    var computeReplayPauseStateCore = this.callCoreReplayTimerRuntime(
      "computeReplayPauseState",
      []
    );
    var state = this.resolveCoreObjectCallOrFallback(computeReplayPauseStateCore, function () {
      return {
        isPaused: true,
        shouldClearInterval: true
      };
    });
    state = this.isNonArrayObject(state) ? state : {};
    this.isPaused = state.isPaused !== false;
    if (state.shouldClearInterval !== false) {
      clearInterval(this.replayInterval);
    }
};

GameManager.prototype.resume = function () {
    var computeReplayResumeStateCore = this.callCoreReplayTimerRuntime(
      "computeReplayResumeState",
      [{
        replayDelay: this.replayDelay
      }]
    );
    var state = this.resolveCoreObjectCallOrFallback(computeReplayResumeStateCore, function () {
      return {
        isPaused: false,
        shouldClearInterval: true,
        delay: this.replayDelay || 200
      };
    });
    state = this.isNonArrayObject(state) ? state : {};
    this.isPaused = !!state.isPaused ? true : false;
    if (state.shouldClearInterval !== false) {
      clearInterval(this.replayInterval);
    }
    var manager = this;
    this.replayInterval = setInterval(function () {
      manager.runReplayTick();
    }, state.delay);
};

GameManager.prototype.setSpeed = function (multiplier) {
    var computeReplaySpeedStateCore = this.callCoreReplayTimerRuntime(
      "computeReplaySpeedState",
      [{
        multiplier: multiplier,
        isPaused: !!this.isPaused,
        baseDelay: 200
      }]
    );
    var state = this.resolveCoreObjectCallOrFallback(computeReplaySpeedStateCore, function () {
      return {
        replayDelay: 200 / multiplier,
        shouldResume: !this.isPaused
      };
    });
    state = this.isNonArrayObject(state) ? state : {};
    this.replayDelay = state.replayDelay;
    if (!state.shouldResume) return;
    this.resume(); // Restart interval with new delay
};

GameManager.prototype.seek = function (targetIndex) {
    var normalizeReplaySeekTargetCore = this.callCoreReplayLifecycleRuntime(
      "normalizeReplaySeekTarget",
      [{
        targetIndex: targetIndex,
        hasReplayMoves: !!this.replayMoves,
        replayMovesLength: this.replayMoves ? this.replayMoves.length : 0
      }]
    );
    targetIndex = this.resolveNormalizedCoreValueOrFallback(normalizeReplaySeekTargetCore, function (coreValue) {
      var resolved = Number(coreValue);
      return Number.isFinite(resolved) ? resolved : undefined;
    }, function () {
      if (targetIndex < 0) targetIndex = 0;
      if (this.replayMoves && targetIndex > this.replayMoves.length) targetIndex = this.replayMoves.length;
      return targetIndex;
    });
    this.pause();
    var planReplaySeekRewindCore = this.callCoreReplayFlowRuntime(
      "planReplaySeekRewind",
      [{
        targetIndex: targetIndex,
        replayIndex: this.replayIndex,
        hasReplayStartBoard: !!this.replayStartBoardMatrix
      }]
    );
    var rewindPlan = this.resolveCoreObjectCallOrFallback(planReplaySeekRewindCore, function () {
      if (!(targetIndex < this.replayIndex)) {
        return {
          shouldRewind: false,
          strategy: "none",
          replayIndexAfterRewind: this.replayIndex
        };
      }
      return {
        shouldRewind: true,
        strategy: this.replayStartBoardMatrix ? "board" : "seed",
        replayIndexAfterRewind: 0
      };
    });
    var normalized = this.isNonArrayObject(rewindPlan) ? rewindPlan : null;
    var planReplaySeekRestartCore = this.callCoreReplayFlowRuntime(
      "planReplaySeekRestart",
      [{
        shouldRewind: !!(normalized && normalized.shouldRewind),
        strategy: normalized ? normalized.strategy : "none",
        replayIndexAfterRewind: normalized ? normalized.replayIndexAfterRewind : this.replayIndex
      }]
    );
    var restartPlan = this.resolveCoreObjectCallOrFallback(planReplaySeekRestartCore, function () {
      var shouldRewind = !!(normalized && normalized.shouldRewind);
      if (!shouldRewind) {
        return {
          shouldRestartWithBoard: false,
          shouldRestartWithSeed: false,
          shouldApplyReplayIndex: false,
          replayIndex: normalized ? normalized.replayIndexAfterRewind : this.replayIndex
        };
      }
      return {
        shouldRestartWithBoard: normalized.strategy === "board",
        shouldRestartWithSeed: normalized.strategy === "seed",
        shouldApplyReplayIndex: true,
        replayIndex: normalized.replayIndexAfterRewind
      };
    });
    if (this.isNonArrayObject(restartPlan)) {
      if (restartPlan.shouldRestartWithBoard) {
        this.restartReplaySession(this.replayStartBoardMatrix, this.modeConfig, true);
      }
      if (restartPlan.shouldRestartWithSeed) {
        this.restartReplaySession(this.initialSeed, this.modeConfig, false);
      }
      if (restartPlan.shouldApplyReplayIndex) {
        this.replayIndex = restartPlan.replayIndex;
      }
    }
    while (this.replayIndex < targetIndex) {
        this.executePlannedReplayStep();
    }
};

GameManager.prototype.step = function (delta) {
    if (!this.replayMoves) return;
    this.seek(this.replayIndex + delta);
};
