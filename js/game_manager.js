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
  var getReplayActionKindCore = this.callCoreReplayExecutionRuntime("getReplayActionKind", [action]);
  if (getReplayActionKindCore.available) return getReplayActionKindCore.value;
  if (action === -1) return "u";
  if (action >= 0 && action <= 3) return "m";
  if (Array.isArray(action) && action.length > 0) return action[0];
  return "x";
};

GameManager.prototype.encodeReplay128 = function (code) {
  var encodeReplay128Core = this.callCoreReplayCodecRuntime("encodeReplay128", [code]);
  if (encodeReplay128Core.available) return encodeReplay128Core.value;

  if (!Number.isInteger(code) || code < 0 || code >= GameManager.REPLAY128_TOTAL) {
    throw "Invalid replay code";
  }
  if (code < GameManager.REPLAY128_ASCII_COUNT) {
    return String.fromCharCode(GameManager.REPLAY128_ASCII_START + code);
  }
  return String.fromCharCode(
    GameManager.REPLAY128_EXTRA_CODES[code - GameManager.REPLAY128_ASCII_COUNT]
  );
};

GameManager.prototype.decodeReplay128 = function (char) {
  var decodeReplay128Core = this.callCoreReplayCodecRuntime("decodeReplay128", [char]);
  if (decodeReplay128Core.available) return decodeReplay128Core.value;

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
};

GameManager.prototype.encodeBoardV4 = function (board) {
  var encodeBoardV4Core = this.callCoreReplayCodecRuntime("encodeBoardV4", [board]);
  if (encodeBoardV4Core.available) return encodeBoardV4Core.value;

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
};

GameManager.prototype.decodeBoardV4 = function (encoded) {
  var decodeBoardV4Core = this.callCoreReplayCodecRuntime("decodeBoardV4", [encoded]);
  if (decodeBoardV4Core.available) return decodeBoardV4Core.value;

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
};

GameManager.prototype.decodeReplayV4MoveSpawnFromToken = function (token) {
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

GameManager.prototype.decodeReplayV4PracticeEscapePayload = function (actionsEncoded, payloadIndex) {
  if (payloadIndex + 1 >= actionsEncoded.length) throw "Invalid v4C practice action";
  var cell = this.decodeReplay128(actionsEncoded.charAt(payloadIndex));
  var exp = this.decodeReplay128(actionsEncoded.charAt(payloadIndex + 1));
  if (cell < 0 || cell > 15) throw "Invalid v4C practice cell";
  return {
    action: ["p", (cell >> 2) & 3, cell & 3, exp === 0 ? 0 : Math.pow(2, exp)],
    spawn: null,
    nextIndex: payloadIndex + 2
  };
};

GameManager.prototype.decodeReplayV4EscapedToken = function (actionsEncoded, escapedIndex) {
  if (escapedIndex >= actionsEncoded.length) throw "Invalid v4C escape";
  var subtype = this.decodeReplay128(actionsEncoded.charAt(escapedIndex));
  if (subtype === 0) {
    var decoded127 = this.decodeReplayV4MoveSpawnFromToken(127);
    return {
      action: decoded127.action,
      spawn: decoded127.spawn,
      nextIndex: escapedIndex + 1
    };
  }
  if (subtype === 1) {
    return {
      action: -1,
      spawn: null,
      nextIndex: escapedIndex + 1
    };
  }
  if (subtype === 2) {
    return this.decodeReplayV4PracticeEscapePayload(actionsEncoded, escapedIndex + 1);
  }
  throw "Unknown v4C escape subtype";
};

GameManager.prototype.decodeReplayV4TokenAt = function (actionsEncoded, index) {
  var token = this.decodeReplay128(actionsEncoded.charAt(index));
  if (token < 127) {
    var decodedToken = this.decodeReplayV4MoveSpawnFromToken(token);
    return {
      action: decodedToken.action,
      spawn: decodedToken.spawn,
      nextIndex: index + 1
    };
  }
  return this.decodeReplayV4EscapedToken(actionsEncoded, index + 1);
};

GameManager.prototype.decodeReplayV4ActionsFallback = function (actionsEncoded) {
  var replayMoves = [];
  var replaySpawns = [];
  var i = 0;
  while (i < actionsEncoded.length) {
    var decodedAction = this.decodeReplayV4TokenAt(actionsEncoded, i);
    replayMoves.push(decodedAction.action);
    replaySpawns.push(decodedAction.spawn);
    i = decodedAction.nextIndex;
  }
  return {
    replayMoves: replayMoves,
    replaySpawns: replaySpawns
  };
};

GameManager.prototype.decodeReplayV4Actions = function (actionsEncoded) {
  var decodeReplayV4ActionsCore = this.callCoreReplayV4ActionsRuntime("decodeReplayV4Actions", [actionsEncoded]);
  if (decodeReplayV4ActionsCore.available) return decodeReplayV4ActionsCore.value || {};
  return this.decodeReplayV4ActionsFallback(actionsEncoded);
};

GameManager.prototype.parseReplayImportEnvelope = function (trimmedReplayString) {
  var parseReplayImportEnvelopeCore = this.callCoreReplayImportRuntime("parseReplayImportEnvelope", [{
      trimmedReplayString: trimmedReplayString,
      fallbackModeKey: this.modeKey || this.mode || GameManager.DEFAULT_MODE_KEY,
      v4Prefix: GameManager.REPLAY_V4_PREFIX
    }]);
  if (parseReplayImportEnvelopeCore.available) return parseReplayImportEnvelopeCore.value;
  return this.parseReplayImportEnvelopeFallback(trimmedReplayString);
};

GameManager.prototype.normalizeOptionalReplayString = function (raw) {
  return typeof raw === "string" && raw ? raw : null;
};

GameManager.prototype.parseJsonReplayImportObject = function (trimmedReplayString) {
  if (trimmedReplayString.charAt(0) !== "{") return null;
  return JSON.parse(trimmedReplayString);
};

GameManager.prototype.resolveValidatedJsonReplayActions = function (replayObj) {
  if (replayObj.v !== 3) throw "Unsupported JSON replay version";
  var actions = replayObj.actions;
  if (!Array.isArray(actions)) throw "Invalid v3 actions";
  return actions;
};

GameManager.prototype.parseJsonReplayImportEnvelope = function (trimmedReplayString) {
  var replayObj = this.parseJsonReplayImportObject(trimmedReplayString);
  if (!replayObj) return null;
  var actions = this.resolveValidatedJsonReplayActions(replayObj);
  var meta = this.resolveJsonReplayEnvelopeMeta(replayObj);
  return {
    kind: "json-v3",
    modeKey: this.resolveJsonReplayEnvelopeModeKey(replayObj),
    actions: actions,
    seed: replayObj.seed,
    specialRulesSnapshot: meta.specialRulesSnapshot,
    modeFamily: meta.modeFamily,
    rankPolicy: meta.rankPolicy,
    challengeId: meta.challengeId
  };
};

GameManager.prototype.resolveJsonReplayEnvelopeModeKey = function (replayObj) {
  return this.normalizeOptionalReplayString(replayObj.mode_key) ||
    this.normalizeOptionalReplayString(replayObj.mode) ||
    this.modeKey ||
    this.mode;
};

GameManager.prototype.resolveJsonReplayEnvelopeMeta = function (replayObj) {
  return {
    specialRulesSnapshot:
      replayObj.special_rules_snapshot && typeof replayObj.special_rules_snapshot === "object"
        ? replayObj.special_rules_snapshot
        : null,
    modeFamily: this.normalizeOptionalReplayString(replayObj.mode_family),
    rankPolicy: this.normalizeOptionalReplayString(replayObj.rank_policy),
    challengeId: this.normalizeOptionalReplayString(replayObj.challenge_id)
  };
};

GameManager.prototype.parseReplayImportEnvelopeFallback = function (trimmedReplayString) {
  var jsonEnvelope = this.parseJsonReplayImportEnvelope(trimmedReplayString);
  if (jsonEnvelope) return jsonEnvelope;
  return this.parseV4ReplayImportEnvelope(trimmedReplayString);
};

GameManager.prototype.parseReplayV4ImportBody = function (trimmedReplayString) {
  if (trimmedReplayString.indexOf(GameManager.REPLAY_V4_PREFIX) !== 0) return null;
  var body = trimmedReplayString.substring(GameManager.REPLAY_V4_PREFIX.length);
  if (body.length < 17) throw "Invalid v4C payload";
  return body;
};

GameManager.prototype.parseV4ReplayImportEnvelope = function (trimmedReplayString) {
  var body = this.parseReplayV4ImportBody(trimmedReplayString);
  if (!body) return null;
  var modeCode = body.charAt(0);
  var replayModeIdV4 = this.resolveReplayModeKeyFromV4Code(modeCode);
  if (!replayModeIdV4) throw "Invalid v4C mode";
  return {
    kind: "v4c",
    modeKey: replayModeIdV4,
    initialBoardEncoded: body.substring(1, 17),
    actionsEncoded: body.substring(17)
  };
};

GameManager.prototype.resolveReplayModeKeyFromV4Code = function (modeCode) {
  if (modeCode === "S") return "standard_4x4_pow2_no_undo";
  if (modeCode === "C") return "classic_4x4_pow2_undo";
  if (modeCode === "K") return "capped_4x4_pow2_no_undo";
  if (modeCode === "P") return "practice_legacy";
  return null;
};

GameManager.prototype.resolveReplayV4ModeCodeFromModeKey = function (modeKey) {
  if (modeKey === "standard_4x4_pow2_no_undo") return "S";
  if (modeKey === "classic_4x4_pow2_undo") return "C";
  if (modeKey === "capped_4x4_pow2_no_undo") return "K";
  if (modeKey === "practice_legacy") return "P";
  return "C";
};

GameManager.prototype.decodeLegacyReplayV2CharCode = function (logString, index) {
  var code = logString.charCodeAt(index) - 33;
  if (code < 0 || code > 128) {
    throw "Invalid replay char at index " + index;
  }
  return code;
};

GameManager.prototype.decodeLegacyReplayV2Entry = function (code) {
  if (code === 128) {
    return {
      move: -1,
      spawn: null
    };
  }
  var dir = (code >> 5) & 3;
  var is4 = (code >> 4) & 1;
  var posIdx = code & 15;
  return {
    move: dir,
    spawn: {
      x: posIdx % 4,
      y: Math.floor(posIdx / 4),
      value: is4 ? 4 : 2
    }
  };
};

GameManager.prototype.decodeLegacyReplayV2Log = function (logString) {
  var replayMoves = [];
  var replaySpawns = [];
  for (var i = 0; i < logString.length; i++) {
    var code = this.decodeLegacyReplayV2CharCode(logString, i);
    var entry = this.decodeLegacyReplayV2Entry(code);
    replayMoves.push(entry.move);
    replaySpawns.push(entry.spawn);
  }
  return {
    replayMoves: replayMoves,
    replaySpawns: replaySpawns
  };
};

GameManager.prototype.decodeLegacyReplayV1Payload = function (trimmedReplayString) {
  if (trimmedReplayString.indexOf("REPLAY_v1_") !== 0) return null;
  var v1Parts = trimmedReplayString.split("_");
  var seed = parseFloat(v1Parts[2]);
  var movesString = v1Parts[3];
  var reverseMapping = { U: 0, R: 1, D: 2, L: 3, Z: -1 };
  var replayMovesV1 = movesString.split("").map(function (char) {
    var val = reverseMapping[char];
    if (val === undefined) throw "Invalid move char: " + char;
    return val;
  });
  return {
    seed: seed,
    replayMoves: replayMovesV1,
    replaySpawns: null
  };
};

GameManager.prototype.decodeLegacyReplayV2SPayload = function (trimmedReplayString) {
  var prefixS = "REPLAY_v2S_";
  if (trimmedReplayString.indexOf(prefixS) !== 0) return null;
  var rest = trimmedReplayString.substring(prefixS.length);
  var seedSep = rest.indexOf("_");
  if (seedSep < 0) throw "Invalid v2S format";
  var seedS = parseFloat(rest.substring(0, seedSep));
  if (isNaN(seedS)) throw "Invalid v2S seed";
  var logString = rest.substring(seedSep + 1);
  var decodedLog = this.decodeLegacyReplayV2Log(logString);
  return {
    seed: seedS,
    replayMovesV2: logString,
    replayMoves: decodedLog.replayMoves,
    replaySpawns: decodedLog.replaySpawns
  };
};

GameManager.prototype.decodeLegacyReplayV2Payload = function (trimmedReplayString) {
  var prefix = "REPLAY_v2_";
  if (trimmedReplayString.indexOf(prefix) !== 0) return null;
  var logString = trimmedReplayString.substring(prefix.length);
  var decodedLog = this.decodeLegacyReplayV2Log(logString);
  return {
    seed: 0.123,
    replayMovesV2: logString,
    replayMoves: decodedLog.replayMoves,
    replaySpawns: decodedLog.replaySpawns
  };
};

GameManager.prototype.decodeLegacyReplayFallback = function (trimmedReplayString) {
  var decodedV1 = this.decodeLegacyReplayV1Payload(trimmedReplayString);
  if (decodedV1) return decodedV1;
  var decodedV2S = this.decodeLegacyReplayV2SPayload(trimmedReplayString);
  if (decodedV2S) return decodedV2S;
  return this.decodeLegacyReplayV2Payload(trimmedReplayString);
};

GameManager.prototype.decodeLegacyReplay = function (trimmedReplayString) {
  var decodeLegacyReplayCore = this.callCoreReplayLegacyRuntime("decodeLegacyReplay", [trimmedReplayString]);
  if (decodeLegacyReplayCore.available) return decodeLegacyReplayCore.value;
  return this.decodeLegacyReplayFallback(trimmedReplayString);
};

GameManager.prototype.resolveReplayExecution = function (action) {
  var resolveReplayExecutionCore = this.callCoreReplayExecutionRuntime("resolveReplayExecution", [action]);
  if (resolveReplayExecutionCore.available) return resolveReplayExecutionCore.value;
  return this.resolveReplayExecutionFallback(action);
};

GameManager.prototype.resolveReplayExecutionFallback = function (action) {
  var kind = this.getActionKind(action);
  if (kind === "m") {
    var dir = Array.isArray(action) ? action[1] : action;
    return { kind: "m", dir: dir };
  }
  if (kind === "u") {
    return { kind: "u" };
  }
  if (kind === "p") {
    return {
      kind: "p",
      x: action[1],
      y: action[2],
      value: action[3]
    };
  }
  throw "Unknown replay action";
};

GameManager.prototype.planReplayDispatch = function (resolvedExecution) {
  var planReplayDispatchCore = this.callCoreReplayDispatchRuntime("planReplayDispatch", [resolvedExecution]);
  if (planReplayDispatchCore.available) return planReplayDispatchCore.value || {};
  return this.planReplayDispatchFallback(resolvedExecution);
};

GameManager.prototype.planReplayDispatchFallback = function (resolvedExecution) {
  if (resolvedExecution.kind === "m") {
    return {
      method: "move",
      args: [resolvedExecution.dir]
    };
  }
  if (resolvedExecution.kind === "u") {
    return {
      method: "move",
      args: [-1]
    };
  }
  if (resolvedExecution.kind === "p") {
    return {
      method: "insertCustomTile",
      args: [resolvedExecution.x, resolvedExecution.y, resolvedExecution.value]
    };
  }
  throw "Unknown replay action";
};

GameManager.prototype.normalizeReplaySeekTarget = function (targetIndex) {
  var normalizeReplaySeekTargetCore = this.callCoreReplayLifecycleRuntime("normalizeReplaySeekTarget", [{
      targetIndex: targetIndex,
      hasReplayMoves: !!this.replayMoves,
      replayMovesLength: this.replayMoves ? this.replayMoves.length : 0
    }]);
  if (normalizeReplaySeekTargetCore.available) return normalizeReplaySeekTargetCore.value;
  return this.normalizeReplaySeekTargetFallback(targetIndex);
};

GameManager.prototype.normalizeReplaySeekTargetFallback = function (targetIndex) {
  if (targetIndex < 0) targetIndex = 0;
  if (this.replayMoves && targetIndex > this.replayMoves.length) targetIndex = this.replayMoves.length;
  return targetIndex;
};

GameManager.prototype.planReplayStep = function (action, spawnAtIndex) {
  var planReplayStepCore = this.callCoreReplayLifecycleRuntime("planReplayStep", [{
      action: action,
      hasReplaySpawns: !!this.replaySpawns,
      spawnAtIndex: spawnAtIndex
    }]);
  if (planReplayStepCore.available) return planReplayStepCore.value || {};
  return this.planReplayStepFallback(action, spawnAtIndex);
};

GameManager.prototype.planReplayStepFallback = function (action, spawnAtIndex) {
  var shouldInjectForcedSpawn = !!this.replaySpawns && !Array.isArray(action);
  return {
    shouldInjectForcedSpawn: shouldInjectForcedSpawn,
    forcedSpawn: shouldInjectForcedSpawn ? spawnAtIndex : undefined
  };
};

GameManager.prototype.planReplayStepExecution = function () {
  var planReplayStepExecutionCore = this.callCoreReplayLoopRuntime("planReplayStepExecution", [{
      replayMoves: this.replayMoves,
      replaySpawns: this.replaySpawns,
      replayIndex: this.replayIndex
    }]);
  if (planReplayStepExecutionCore.available) return planReplayStepExecutionCore.value || {};
  return this.planReplayStepExecutionFallback();
};

GameManager.prototype.planReplayStepExecutionFallback = function () {
  var action = this.replayMoves[this.replayIndex];
  var stepPlan = this.planReplayStep(
    action,
    this.replaySpawns ? this.replaySpawns[this.replayIndex] : undefined
  );
  return {
    action: action,
    shouldInjectForcedSpawn: !!stepPlan.shouldInjectForcedSpawn,
    forcedSpawn: stepPlan.forcedSpawn,
    nextReplayIndex: this.replayIndex + 1
  };
};

GameManager.prototype.computeReplayPauseState = function () {
  var computeReplayPauseStateCore = this.callCoreReplayTimerRuntime("computeReplayPauseState");
  if (computeReplayPauseStateCore.available) return computeReplayPauseStateCore.value || {};
  return this.computeReplayPauseStateFallback();
};

GameManager.prototype.computeReplayPauseStateFallback = function () {
  return {
    isPaused: true,
    shouldClearInterval: true
  };
};

GameManager.prototype.computeReplayResumeState = function () {
  var computeReplayResumeStateCore = this.callCoreReplayTimerRuntime("computeReplayResumeState", [{
      replayDelay: this.replayDelay
    }]);
  if (computeReplayResumeStateCore.available) return computeReplayResumeStateCore.value || {};
  return this.computeReplayResumeStateFallback();
};

GameManager.prototype.computeReplayResumeStateFallback = function () {
  return {
    isPaused: false,
    shouldClearInterval: true,
    delay: this.replayDelay || 200
  };
};

GameManager.prototype.computeReplaySpeedState = function (multiplier) {
  var computeReplaySpeedStateCore = this.callCoreReplayTimerRuntime("computeReplaySpeedState", [{
      multiplier: multiplier,
      isPaused: !!this.isPaused,
      baseDelay: 200
    }]);
  if (computeReplaySpeedStateCore.available) return computeReplaySpeedStateCore.value || {};
  return this.computeReplaySpeedStateFallback(multiplier);
};

GameManager.prototype.computeReplaySpeedStateFallback = function (multiplier) {
  return {
    replayDelay: 200 / multiplier,
    shouldResume: !this.isPaused
  };
};

GameManager.prototype.shouldStopReplayAtTick = function (replayIndex, replayMovesLength) {
  var shouldStopReplayAtTickCore = this.callCoreReplayTimerRuntime("shouldStopReplayAtTick", [{
      replayIndex: replayIndex,
      replayMovesLength: replayMovesLength
    }]);
  if (shouldStopReplayAtTickCore.available) return !!shouldStopReplayAtTickCore.value;
  return this.shouldStopReplayAtTickFallback(replayIndex, replayMovesLength);
};

GameManager.prototype.shouldStopReplayAtTickFallback = function (replayIndex, replayMovesLength) {
  return replayIndex >= replayMovesLength;
};

GameManager.prototype.computeReplayEndState = function () {
  var computeReplayEndStateCore = this.callCoreReplayFlowRuntime("computeReplayEndState");
  if (computeReplayEndStateCore.available) return computeReplayEndStateCore.value || {};
  return this.computeReplayEndStateFallback();
};

GameManager.prototype.computeReplayEndStateFallback = function () {
  return {
    shouldPause: true,
    replayMode: false
  };
};

GameManager.prototype.planReplayTickBoundary = function (shouldStopAtTick, replayEndState) {
  var planReplayTickBoundaryCore = this.callCoreReplayControlRuntime("planReplayTickBoundary", [{
      shouldStopAtTick: shouldStopAtTick,
      replayEndState: replayEndState
    }]);
  if (planReplayTickBoundaryCore.available) return planReplayTickBoundaryCore.value || {};
  return this.planReplayTickBoundaryFallback(shouldStopAtTick, replayEndState);
};

GameManager.prototype.planReplayTickBoundaryFallback = function (shouldStopAtTick, replayEndState) {
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
};

GameManager.prototype.resolveReplayTickBoundaryPlanForCurrentState = function () {
  var shouldStopAtTick = this.shouldStopReplayAtTick(this.replayIndex, this.replayMoves.length);
  return this.planReplayTickBoundary(
    shouldStopAtTick,
    shouldStopAtTick ? this.computeReplayEndState() : undefined
  );
};

GameManager.prototype.applyReplayTickBoundaryPlan = function (tickBoundaryPlan) {
  if (!tickBoundaryPlan || tickBoundaryPlan.shouldStop !== true) return false;
  if (tickBoundaryPlan.shouldPause) {
    this.pause();
  }
  if (tickBoundaryPlan.shouldApplyReplayMode) {
    this.replayMode = tickBoundaryPlan.replayMode;
  }
  return true;
};

GameManager.prototype.runReplayTick = function () {
  if (this.tryStopReplayAtTickBoundary()) return false;
  this.executePlannedReplayStep();
  return true;
};

GameManager.prototype.tryStopReplayAtTickBoundary = function () {
  var tickBoundaryPlan = this.resolveReplayTickBoundaryPlanForCurrentState();
  return this.applyReplayTickBoundaryPlan(tickBoundaryPlan);
};

GameManager.prototype.planReplaySeekRewind = function (targetIndex) {
  var planReplaySeekRewindCore = this.callCoreReplayFlowRuntime("planReplaySeekRewind", [{
      targetIndex: targetIndex,
      replayIndex: this.replayIndex,
      hasReplayStartBoard: !!this.replayStartBoardMatrix
    }]);
  if (planReplaySeekRewindCore.available) return planReplaySeekRewindCore.value || {};
  return this.planReplaySeekRewindFallback(targetIndex);
};

GameManager.prototype.planReplaySeekRewindFallback = function (targetIndex) {
  var shouldRewind = targetIndex < this.replayIndex;
  if (!shouldRewind) {
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
};

GameManager.prototype.resolveReplaySeekRestartCoreInput = function (rewindPlan) {
  return {
    shouldRewind: !!(rewindPlan && rewindPlan.shouldRewind),
    strategy: rewindPlan ? rewindPlan.strategy : "none",
    replayIndexAfterRewind: rewindPlan ? rewindPlan.replayIndexAfterRewind : this.replayIndex
  };
};

GameManager.prototype.planReplaySeekRestart = function (rewindPlan) {
  var planReplaySeekRestartCore = this.callCoreReplayFlowRuntime("planReplaySeekRestart", [
    this.resolveReplaySeekRestartCoreInput(rewindPlan)
  ]);
  if (planReplaySeekRestartCore.available) return planReplaySeekRestartCore.value || {};
  return this.planReplaySeekRestartFallback(rewindPlan);
};

GameManager.prototype.planReplaySeekRestartFallback = function (rewindPlan) {
  var shouldRewind = !!(rewindPlan && rewindPlan.shouldRewind);
  if (!shouldRewind) {
    return {
      shouldRestartWithBoard: false,
      shouldRestartWithSeed: false,
      shouldApplyReplayIndex: false,
      replayIndex: rewindPlan ? rewindPlan.replayIndexAfterRewind : this.replayIndex
    };
  }

  return {
    shouldRestartWithBoard: rewindPlan.strategy === "board",
    shouldRestartWithSeed: rewindPlan.strategy === "seed",
    shouldApplyReplayIndex: true,
    replayIndex: rewindPlan.replayIndexAfterRewind
  };
};

GameManager.prototype.resolveReplaySeekRestartPlanForTarget = function (targetIndex) {
  var rewindPlan = this.planReplaySeekRewind(targetIndex);
  return this.planReplaySeekRestart(rewindPlan);
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

GameManager.prototype.buildUnavailableCoreRuntimeCallResult = function () {
  return {
    available: false,
    value: null
  };
};

GameManager.prototype.normalizeCoreRuntimeCallArgs = function (args) {
  return Array.isArray(args) ? args : [];
};

GameManager.prototype.resolveCoreRuntimeCallerFromResolver = function (resolverMethodName, methodName) {
  var resolver = this[resolverMethodName];
  if (typeof resolver !== "function") return null;
  var runtimeMethod = resolver.call(this, methodName);
  if (typeof runtimeMethod !== "function") return null;
  return runtimeMethod;
};

GameManager.prototype.callCoreRuntimeMethod = function (resolverMethodName, methodName, args) {
  var runtimeMethod = this.resolveCoreRuntimeCallerFromResolver(resolverMethodName, methodName);
  if (typeof runtimeMethod !== "function") return this.buildUnavailableCoreRuntimeCallResult();
  return {
    available: true,
    value: runtimeMethod.apply(null, this.normalizeCoreRuntimeCallArgs(args))
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

var GAME_MANAGER_CORE_RUNTIME_CALLERS = [
  ["callCoreStorageRuntime", "resolveCoreStorageRuntimeMethod"],
  ["callCoreModeRuntime", "resolveCoreModeRuntimeMethod"],
  ["callCoreRulesRuntime", "resolveCoreRulesRuntimeMethod"],
  ["callCoreReplayCodecRuntime", "resolveCoreReplayCodecRuntimeMethod"],
  ["callCoreReplayV4ActionsRuntime", "resolveCoreReplayV4ActionsRuntimeMethod"],
  ["callCoreReplayImportRuntime", "resolveCoreReplayImportRuntimeMethod"],
  ["callCoreReplayExecutionRuntime", "resolveCoreReplayExecutionRuntimeMethod"],
  ["callCoreReplayDispatchRuntime", "resolveCoreReplayDispatchRuntimeMethod"],
  ["callCoreReplayLifecycleRuntime", "resolveCoreReplayLifecycleRuntimeMethod"],
  ["callCoreReplayTimerRuntime", "resolveCoreReplayTimerRuntimeMethod"],
  ["callCoreReplayFlowRuntime", "resolveCoreReplayFlowRuntimeMethod"],
  ["callCoreReplayControlRuntime", "resolveCoreReplayControlRuntimeMethod"],
  ["callCoreReplayLoopRuntime", "resolveCoreReplayLoopRuntimeMethod"],
  ["callCoreReplayLegacyRuntime", "resolveCoreReplayLegacyRuntimeMethod"],
  ["callCoreMoveApplyRuntime", "resolveCoreMoveApplyRuntimeMethod"],
  ["callCorePostMoveRecordRuntime", "resolveCorePostMoveRecordRuntimeMethod"],
  ["callCorePostUndoRecordRuntime", "resolveCorePostUndoRecordRuntimeMethod"],
  ["callCoreUndoRestoreRuntime", "resolveCoreUndoRestoreRuntimeMethod"],
  ["callCoreUndoSnapshotRuntime", "resolveCoreUndoSnapshotRuntimeMethod"],
  ["callCoreUndoStackEntryRuntime", "resolveCoreUndoStackEntryRuntimeMethod"],
  ["callCoreUndoTileSnapshotRuntime", "resolveCoreUndoTileSnapshotRuntimeMethod"],
  ["callCoreUndoTileRestoreRuntime", "resolveCoreUndoTileRestoreRuntimeMethod"],
  ["callCoreUndoRestorePayloadRuntime", "resolveCoreUndoRestorePayloadRuntimeMethod"],
  ["callCoreMergeEffectsRuntime", "resolveCoreMergeEffectsRuntimeMethod"],
  ["callCoreSpecialRulesRuntime", "resolveCoreSpecialRulesRuntimeMethod"],
  ["callCoreGridScanRuntime", "resolveCoreGridScanRuntimeMethod"],
  ["callCoreDirectionLockRuntime", "resolveCoreDirectionLockRuntimeMethod"],
  ["callCoreScoringRuntime", "resolveCoreScoringRuntimeMethod"],
  ["callCorePostMoveRuntime", "resolveCorePostMoveRuntimeMethod"],
  ["callCorePrettyTimeRuntime", "resolveCorePrettyTimeRuntimeMethod"],
  ["callCoreMovePathRuntime", "resolveCoreMovePathRuntimeMethod"],
  ["callCoreMoveScanRuntime", "resolveCoreMoveScanRuntimeMethod"],
  ["callCoreTimerIntervalRuntime", "resolveCoreTimerIntervalRuntimeMethod"]
];

for (
  var gameManagerCoreRuntimeCallerIndex = 0;
  gameManagerCoreRuntimeCallerIndex < GAME_MANAGER_CORE_RUNTIME_CALLERS.length;
  gameManagerCoreRuntimeCallerIndex++
) {
  var gameManagerCoreRuntimeCallerDef = GAME_MANAGER_CORE_RUNTIME_CALLERS[gameManagerCoreRuntimeCallerIndex];
  registerCoreRuntimeCaller(gameManagerCoreRuntimeCallerDef[0], gameManagerCoreRuntimeCallerDef[1]);
}

GameManager.prototype.resolveSavedGameStateStorageKey = function (keyPrefix, modeKey) {
  var resolveSavedGameStateStorageKeyCore = this.callCoreStorageRuntime("resolveSavedGameStateStorageKey", [{
      modeKey: modeKey,
      currentModeKey: this.modeKey,
      currentMode: this.mode,
      defaultModeKey: GameManager.DEFAULT_MODE_KEY,
      keyPrefix: typeof keyPrefix === "string" ? keyPrefix : ""
    }]);
  if (resolveSavedGameStateStorageKeyCore.available) {
    var resolvedKey = resolveSavedGameStateStorageKeyCore.value;
    if (typeof resolvedKey === "string" && resolvedKey) return resolvedKey;
  }

  var key = typeof modeKey === "string" && modeKey ? modeKey : (this.modeKey || this.mode || GameManager.DEFAULT_MODE_KEY);
  return (typeof keyPrefix === "string" ? keyPrefix : "") + key;
};

GameManager.prototype.getSavedGameStateKey = function (modeKey) {
  return this.resolveSavedGameStateStorageKey(GameManager.SAVED_GAME_STATE_KEY_PREFIX, modeKey);
};

GameManager.prototype.getSavedGameStateLiteKey = function (modeKey) {
  return this.resolveSavedGameStateStorageKey(GameManager.SAVED_GAME_STATE_LITE_KEY_PREFIX, modeKey);
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
  var readStorageFlagFromContextCore = this.callCoreStorageRuntime("readStorageFlagFromContext", [{
      windowLike: this.getWindowLike(),
      key: key,
      trueValue: trueValue
    }]);
  if (readStorageFlagFromContextCore.available) return !!readStorageFlagFromContextCore.value;
  var storage = this.getWebStorageByName("localStorage");
  if (!storage || typeof storage.getItem !== "function") return false;
  var matchValue = typeof trueValue === "string" ? trueValue : "1";
  try {
    return storage.getItem(key) === matchValue;
  } catch (_err) {
    return false;
  }
};

GameManager.prototype.writeLocalStorageFlag = function (key, enabled, trueValue, falseValue) {
  var writeStorageFlagFromContextCore = this.callCoreStorageRuntime("writeStorageFlagFromContext", [{
      windowLike: this.getWindowLike(),
      key: key,
      enabled: !!enabled,
      trueValue: trueValue,
      falseValue: falseValue
    }]);
  if (writeStorageFlagFromContextCore.available) return !!writeStorageFlagFromContextCore.value;
  var storage = this.getWebStorageByName("localStorage");
  if (!storage || typeof storage.setItem !== "function") return false;
  var value = enabled ? (typeof trueValue === "string" ? trueValue : "1") : (typeof falseValue === "string" ? falseValue : "0");
  try {
    storage.setItem(key, value);
    return true;
  } catch (_err) {
    return false;
  }
};

GameManager.prototype.readLocalStorageJsonMap = function (key) {
  var readStorageJsonMapFromContextCore = this.callCoreStorageRuntime("readStorageJsonMapFromContext", [{
      windowLike: this.getWindowLike(),
      key: key
    }]);
  if (readStorageJsonMapFromContextCore.available) {
    var runtimeMap = readStorageJsonMapFromContextCore.value;
    if (this.isNonArrayObject(runtimeMap)) {
      return runtimeMap;
    }
    return {};
  }
  var storage = this.getWebStorageByName("localStorage");
  if (!storage || typeof storage.getItem !== "function") return {};
  try {
    var raw = storage.getItem(key);
    if (!raw) return {};
    var parsed = JSON.parse(raw);
    if (!this.isNonArrayObject(parsed)) return {};
    return parsed;
  } catch (_err) {
    return {};
  }
};

GameManager.prototype.writeLocalStorageJsonMap = function (key, map) {
  var writeStorageJsonMapFromContextCore = this.callCoreStorageRuntime("writeStorageJsonMapFromContext", [{
      windowLike: this.getWindowLike(),
      key: key,
      map: map
    }]);
  if (writeStorageJsonMapFromContextCore.available) return !!writeStorageJsonMapFromContextCore.value;
  var storage = this.getWebStorageByName("localStorage");
  if (!storage || typeof storage.setItem !== "function") return false;
  var safeMap = this.isNonArrayObject(map) ? map : {};
  try {
    storage.setItem(key, JSON.stringify(safeMap));
    return true;
  } catch (_err) {
    return false;
  }
};

GameManager.prototype.serializeLocalStoragePayload = function (payload) {
  var serialized = JSON.stringify(payload);
  return typeof serialized === "string" ? serialized : null;
};

GameManager.prototype.writeLocalStorageJsonPayload = function (key, payload) {
  var writeStorageJsonPayloadFromContextCore = this.callCoreStorageRuntime("writeStorageJsonPayloadFromContext", [{
      windowLike: this.getWindowLike(),
      key: key,
      payload: payload
    }]);
  if (writeStorageJsonPayloadFromContextCore.available) return !!writeStorageJsonPayloadFromContextCore.value;
  var storage = this.getWebStorageByName("localStorage");
  if (!storage || typeof storage.setItem !== "function") return false;
  try {
    var serialized = this.serializeLocalStoragePayload(payload);
    if (typeof serialized !== "string") return false;
    storage.setItem(key, serialized);
    return true;
  } catch (_err) {
    return false;
  }
};

GameManager.prototype.buildSavedGameStateStoragesFallback = function () {
  var out = [];
  var localStore = this.getWebStorageByName("localStorage");
  var sessionStore = this.getWebStorageByName("sessionStorage");
  if (localStore) out.push(localStore);
  if (sessionStore && sessionStore !== localStore) out.push(sessionStore);
  return out;
};

GameManager.prototype.getSavedGameStateStorages = function () {
  var getSavedGameStateStoragesFromContextCore = this.callCoreStorageRuntime("getSavedGameStateStoragesFromContext", [{
      windowLike: this.getWindowLike()
    }]);
  if (getSavedGameStateStoragesFromContextCore.available) {
    var storagesByCore = getSavedGameStateStoragesFromContextCore.value;
    if (Array.isArray(storagesByCore)) return storagesByCore;
  }
  return this.buildSavedGameStateStoragesFallback();
};

GameManager.prototype.readSavedPayloadRawFromStore = function (store, key) {
  try {
    return store.getItem(key);
  } catch (_errRead) {
    return null;
  }
};

GameManager.prototype.parseSavedPayloadRaw = function (raw) {
  if (!raw) return null;
  try {
    var parsed = JSON.parse(raw);
    if (!this.isNonArrayObject(parsed)) return null;
    return parsed;
  } catch (_errParse) {
    return null;
  }
};

GameManager.prototype.removeSavedPayloadByKeyFromStore = function (store, key) {
  try {
    store.removeItem(key);
  } catch (_errRemove) {}
};

GameManager.prototype.selectLatestSavedPayload = function (currentBest, nextPayload) {
  var best = this.isNonArrayObject(currentBest) ? currentBest : null;
  var next = this.isNonArrayObject(nextPayload) ? nextPayload : null;
  if (!next) return best;
  if (!best) return next;
  var bestSavedAt = Number(best.saved_at) || 0;
  var nextSavedAt = Number(next.saved_at) || 0;
  return nextSavedAt >= bestSavedAt ? next : best;
};

GameManager.prototype.readSavedPayloadCandidateFromStore = function (store, key) {
  var raw = this.readSavedPayloadRawFromStore(store, key);
  if (!raw) return null;
  var parsed = this.parseSavedPayloadRaw(raw);
  if (parsed) return parsed;
  this.removeSavedPayloadByKeyFromStore(store, key);
  return null;
};

GameManager.prototype.readSavedPayloadByKeyFallback = function (stores, key) {
  var best = null;
  for (var i = 0; i < stores.length; i++) {
    var candidate = this.readSavedPayloadCandidateFromStore(stores[i], key);
    best = this.selectLatestSavedPayload(best, candidate);
  }
  return best;
};

GameManager.prototype.normalizeSavedPayloadByKeyCoreValue = function (savedByCore) {
  if (this.isNonArrayObject(savedByCore)) return savedByCore;
  if (savedByCore === null) return null;
  return undefined;
};

GameManager.prototype.readSavedPayloadByKey = function (key) {
  var stores = this.getSavedGameStateStorages();
  var readSavedPayloadByKeyFromStoragesCore = this.callCoreStorageRuntime("readSavedPayloadByKeyFromStorages", [{
      storages: stores,
      key: key
    }]);
  if (readSavedPayloadByKeyFromStoragesCore.available) {
    var normalizedByCore = this.normalizeSavedPayloadByKeyCoreValue(readSavedPayloadByKeyFromStoragesCore.value);
    if (typeof normalizedByCore !== "undefined") return normalizedByCore;
  }
  return this.readSavedPayloadByKeyFallback(stores, key);
};

GameManager.prototype.normalizeWindowNameSavedPayloadCoreValue = function (payloadByCore) {
  if (this.isNonArrayObject(payloadByCore)) return payloadByCore;
  if (payloadByCore === null) return null;
  return undefined;
};

GameManager.prototype.readWindowNameSavedPayload = function (modeKey) {
  var readSavedPayloadFromWindowNameCore = this.callCoreStorageRuntime("readSavedPayloadFromWindowName", [{
      windowLike: typeof window !== "undefined" ? window : null,
      windowNameKey: GameManager.SAVED_GAME_STATE_WINDOW_NAME_KEY,
      modeKey: modeKey,
      currentModeKey: this.modeKey,
      currentMode: this.mode,
      defaultModeKey: GameManager.DEFAULT_MODE_KEY
    }]);
  if (readSavedPayloadFromWindowNameCore.available) {
    var normalizedByCore = this.normalizeWindowNameSavedPayloadCoreValue(readSavedPayloadFromWindowNameCore.value);
    if (typeof normalizedByCore !== "undefined") return normalizedByCore;
  }
  return this.readWindowNameSavedPayloadFallback(modeKey);
};

GameManager.prototype.readWindowNameRaw = function () {
  if (typeof window === "undefined") return "";
  try {
    return typeof window.name === "string" ? window.name : "";
  } catch (_errName) {
    return "";
  }
};

GameManager.prototype.resolveWindowNameSavedPayloadMarker = function () {
  return GameManager.SAVED_GAME_STATE_WINDOW_NAME_KEY + "=";
};

GameManager.prototype.resolveWindowNameLookupMarker = function (marker) {
  return typeof marker === "string" && marker ? marker : this.resolveWindowNameSavedPayloadMarker();
};

GameManager.prototype.extractWindowNameEncodedMapPart = function (parts, lookupMarker) {
  for (var i = 0; i < parts.length; i++) {
    if (parts[i].indexOf(lookupMarker) === 0) {
      return parts[i].substring(lookupMarker.length);
    }
  }
  return "";
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

GameManager.prototype.resolveWindowNameSavedMap = function (raw, marker) {
  if (!raw || typeof raw !== "string") return null;
  var parts = this.resolveWindowNameParts(raw);
  var lookupMarker = this.resolveWindowNameLookupMarker(marker);
  var encoded = this.extractWindowNameEncodedMapPart(parts, lookupMarker);
  return this.decodeWindowNameSavedMapPayload(encoded);
};

GameManager.prototype.resolveModeKeyForSavedPayload = function (modeKey) {
  var key = typeof modeKey === "string" && modeKey ? modeKey : (this.modeKey || this.mode || GameManager.DEFAULT_MODE_KEY);
  return key;
};

GameManager.prototype.resolveSavedPayloadFromWindowNameMap = function (map, modeKey) {
  if (!map || typeof map !== "object") return null;
  var payload = map[this.resolveModeKeyForSavedPayload(modeKey)];
  if (!payload || typeof payload !== "object") return null;
  return payload;
};

GameManager.prototype.resolveWindowNameSavedPayloadMapForMode = function (modeKey) {
  var raw = this.readWindowNameRaw();
  var marker = this.resolveWindowNameSavedPayloadMarker();
  var map = this.resolveWindowNameSavedMap(raw, marker);
  return this.resolveSavedPayloadFromWindowNameMap(map, modeKey);
};

GameManager.prototype.readWindowNameSavedPayloadFallback = function (modeKey) {
  return this.resolveWindowNameSavedPayloadMapForMode(modeKey);
};

GameManager.prototype.resolveWindowNameParts = function (rawWindowName) {
  return rawWindowName ? rawWindowName.split("&") : [];
};

GameManager.prototype.parseWindowNameMapPart = function (part, lookupMarker) {
  if (typeof part !== "string" || !part) {
    return { isMapPart: false, parsedMap: null };
  }
  if (part.indexOf(lookupMarker) !== 0) {
    return { isMapPart: false, parsedMap: null };
  }
  var encoded = part.substring(lookupMarker.length);
  return {
    isMapPart: true,
    parsedMap: this.decodeWindowNameSavedMapPayload(encoded)
  };
};

GameManager.prototype.resolveWindowNameMapAndKeptParts = function (parts, marker) {
  var kept = [];
  var map = {};
  var lookupMarker = this.resolveWindowNameLookupMarker(marker);
  for (var i = 0; i < parts.length; i++) {
    var part = parts[i];
    var parsedPart = this.parseWindowNameMapPart(part, lookupMarker);
    if (parsedPart.isMapPart) {
      if (this.isNonArrayObject(parsedPart.parsedMap)) map = parsedPart.parsedMap;
      continue;
    }
    if (!part) continue;
    kept.push(part);
  }
  return {
    map: map,
    kept: kept
  };
};

GameManager.prototype.applySavedPayloadToWindowNameMap = function (map, modeKey, payload) {
  var targetMap = map && typeof map === "object" ? map : {};
  var key = this.resolveModeKeyForSavedPayload(modeKey);
  if (!payload || typeof payload !== "object") {
    delete targetMap[key];
  } else {
    targetMap[key] = payload;
  }
  return targetMap;
};

GameManager.prototype.encodeWindowNameSavedMap = function (map) {
  try {
    return encodeURIComponent(JSON.stringify(map));
  } catch (_errEncode) {
    return null;
  }
};

GameManager.prototype.buildWindowNameWithSavedMap = function (keptParts, marker, encodedMap) {
  var nextParts = Array.isArray(keptParts) ? keptParts.slice() : [];
  nextParts.push(marker + encodedMap);
  return nextParts.join("&");
};

GameManager.prototype.writeWindowNameRaw = function (windowNameValue) {
  if (typeof window === "undefined") return false;
  try {
    window.name = windowNameValue;
    return true;
  } catch (_errWrite) {
    return false;
  }
};

GameManager.prototype.writeWindowNameSavedPayloadFallback = function (modeKey, payload) {
  if (typeof window === "undefined") return false;
  var marker = this.resolveWindowNameSavedPayloadMarker();
  var raw = this.readWindowNameRaw();
  var parts = this.resolveWindowNameParts(raw);
  var splitState = this.resolveWindowNameMapAndKeptParts(parts, marker);
  var nextMap = this.applySavedPayloadToWindowNameMap(splitState.map, modeKey, payload);
  var encodedMap = this.encodeWindowNameSavedMap(nextMap);
  if (typeof encodedMap !== "string") return false;
  var nextWindowName = this.buildWindowNameWithSavedMap(splitState.kept, marker, encodedMap);
  return this.writeWindowNameRaw(nextWindowName);
};

GameManager.prototype.writeWindowNameSavedPayload = function (modeKey, payload) {
  var writeSavedPayloadToWindowNameCore = this.callCoreStorageRuntime("writeSavedPayloadToWindowName", [{
      windowLike: typeof window !== "undefined" ? window : null,
      windowNameKey: GameManager.SAVED_GAME_STATE_WINDOW_NAME_KEY,
      modeKey: modeKey,
      currentModeKey: this.modeKey,
      currentMode: this.mode,
      defaultModeKey: GameManager.DEFAULT_MODE_KEY,
      payload: payload
    }]);
  if (writeSavedPayloadToWindowNameCore.available) {
    var writtenByCore = writeSavedPayloadToWindowNameCore.value;
    if (typeof writtenByCore === "boolean") return writtenByCore;
  }
  return this.writeWindowNameSavedPayloadFallback(modeKey, payload);
};

GameManager.prototype.shouldUseSavedGameStateFallback = function () {
  if (typeof window === "undefined") return false;
  if (this.replayMode) return false;
  var path = (window.location && window.location.pathname) ? String(window.location.pathname) : "";
  if (path.indexOf("replay.html") !== -1) return false;
  return true;
};

GameManager.prototype.shouldUseSavedGameState = function () {
  var shouldUseSavedGameStateCore = this.callCoreStorageRuntime("shouldUseSavedGameStateFromContext", [{
      hasWindow: typeof window !== "undefined",
      replayMode: this.replayMode,
      pathname:
        typeof window !== "undefined" &&
        window.location &&
        typeof window.location.pathname === "string"
          ? window.location.pathname
          : ""
    }]);
  if (shouldUseSavedGameStateCore.available) return !!shouldUseSavedGameStateCore.value;
  return this.shouldUseSavedGameStateFallback();
};

GameManager.prototype.bindGameStatePersistenceEvents = function () {
  if (typeof window === "undefined") return;
  if (this.savedGameStateBound) return;
  var self = this;
  var saveHandler = function () {
    self.saveGameState({ force: true });
  };
  window.addEventListener("beforeunload", saveHandler);
  window.addEventListener("pagehide", saveHandler);
  this.savedGameStateBound = true;
};

GameManager.prototype.removeKeysFromSavedStateStoragesFallback = function (stores, keys) {
  for (var i = 0; i < stores.length; i++) {
    for (var k = 0; k < keys.length; k++) {
      try {
        stores[i].removeItem(keys[k]);
      } catch (_err) {}
    }
  }
};

GameManager.prototype.clearSavedGameState = function (modeKey) {
  this.writeWindowNameSavedPayload(modeKey, null);
  if (!this.shouldUseSavedGameState()) return;
  var keys = [
    this.getSavedGameStateKey(modeKey),
    this.getSavedGameStateLiteKey(modeKey)
  ];
  var stores = this.getSavedGameStateStorages();
  var removeKeysFromStoragesCore = this.callCoreStorageRuntime("removeKeysFromStorages", [{
      storages: stores,
      keys: keys
    }]);
  if (removeKeysFromStoragesCore.available) {
    var removedByCore = removeKeysFromStoragesCore.value;
    if (removedByCore === true) return;
  }
  this.removeKeysFromSavedStateStoragesFallback(stores, keys);
};

GameManager.prototype.captureTimerFixedRowsState = function () {
  var out = {};
  for (var i = 0; i < GameManager.TIMER_SLOT_IDS.length; i++) {
    var slotId = String(GameManager.TIMER_SLOT_IDS[i]);
    var row = this.getTimerRowEl(slotId);
    var timerEl = document.getElementById("timer" + slotId);
    if (!row || !timerEl) continue;

    var legend = row.querySelector(".timertile");
    out[slotId] = {
      display: row.style.display || "",
      visibility: row.style.visibility || "",
      pointerEvents: row.style.pointerEvents || "",
      repeat: row.getAttribute("data-capped-repeat") || "",
      timerText: timerEl.textContent || "",
      legendText: legend ? (legend.textContent || "") : "",
      legendClass: legend ? (legend.className || "") : "",
      legendFontSize: legend ? (legend.style.fontSize || "") : ""
    };
  }
  return out;
};

GameManager.prototype.captureTimerDynamicRowsState = function (containerId) {
  var out = [];
  var container = document.getElementById(containerId);
  if (!container) return out;
  for (var i = 0; i < container.children.length; i++) {
    var row = container.children[i];
    if (!row || !row.classList || !row.classList.contains("timer-row-item")) continue;
    var tiles = row.querySelectorAll(".timertile");
    var legend = tiles.length > 0 ? tiles[0] : null;
    var timer = tiles.length > 1 ? tiles[1] : null;
    out.push({
      repeat: row.getAttribute("data-capped-repeat") || "",
      label: legend ? (legend.textContent || "") : "",
      labelClass: legend ? (legend.className || "") : "",
      labelFontSize: legend ? (legend.style.fontSize || "") : "",
      time: timer ? (timer.textContent || "") : ""
    });
  }
  return out;
};

GameManager.prototype.createSavedDynamicTimerRow = function (rowState, cappedState) {
  var resolvedCappedState =
    this.resolveProvidedCappedModeState(cappedState);
  var repeat = parseInt(rowState && rowState.repeat, 10);
  var labelText = rowState && typeof rowState.label === "string" ? rowState.label : "";
  var timeText = rowState && typeof rowState.time === "string" ? rowState.time : "";

  var rowDiv = document.createElement("div");
  rowDiv.className = "timer-row-item";
  if (Number.isFinite(repeat) && repeat >= 2) {
    rowDiv.setAttribute("data-capped-repeat", String(repeat));
  }

  var legend = document.createElement("div");
  legend.className = this.getCappedTimerLegendClass(resolvedCappedState.cappedTargetValue);
  legend.style.cssText =
    "color: #f9f6f2; font-size: " +
    this.getCappedTimerFontSize(resolvedCappedState.cappedTargetValue) +
    ";";
  legend.textContent = labelText;
  if (
    !(Number.isFinite(repeat) && repeat >= 2 && resolvedCappedState.isCappedMode) &&
    rowState &&
    typeof rowState.labelClass === "string" &&
    rowState.labelClass
  ) {
    legend.className = rowState.labelClass;
  }
  if (rowState && typeof rowState.labelFontSize === "string" && rowState.labelFontSize) {
    legend.style.fontSize = rowState.labelFontSize;
  }

  var val = document.createElement("div");
  val.className = "timertile";
  val.style.cssText = "margin-left:6px; width:187px;";
  val.textContent = timeText;

  rowDiv.appendChild(legend);
  rowDiv.appendChild(val);
  rowDiv.appendChild(document.createElement("br"));
  rowDiv.appendChild(document.createElement("br"));
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

GameManager.prototype.restoreFixedTimerRowsFromState = function (saved, cappedStateForRestore) {
  var fixed = saved.timer_fixed_rows;
  if (!(fixed && typeof fixed === "object")) return;
  for (var i = 0; i < GameManager.TIMER_SLOT_IDS.length; i++) {
    var slotId = String(GameManager.TIMER_SLOT_IDS[i]);
    var rowState = fixed[slotId];
    if (!rowState) continue;
    var row = this.getTimerRowEl(slotId);
    var timerEl = document.getElementById("timer" + slotId);
    if (!row || !timerEl) continue;
    var legend = row.querySelector(".timertile");

    row.style.display = typeof rowState.display === "string" ? rowState.display : "";
    row.style.visibility = typeof rowState.visibility === "string" ? rowState.visibility : "";
    row.style.pointerEvents = typeof rowState.pointerEvents === "string" ? rowState.pointerEvents : "";
    if (typeof rowState.repeat === "string" && rowState.repeat) row.setAttribute("data-capped-repeat", rowState.repeat);
    else row.removeAttribute("data-capped-repeat");

    timerEl.textContent = typeof rowState.timerText === "string" ? rowState.timerText : "";
    if (legend) {
      if (row.getAttribute("data-capped-repeat") && cappedStateForRestore.isCappedMode) {
        legend.className = this.getCappedTimerLegendClass(cappedStateForRestore.cappedTargetValue);
      } else if (typeof rowState.legendClass === "string" && rowState.legendClass) {
        legend.className = rowState.legendClass;
      }
      if (typeof rowState.legendText === "string") legend.textContent = rowState.legendText;
      legend.style.fontSize = typeof rowState.legendFontSize === "string" ? rowState.legendFontSize : "";
    }
  }
};

GameManager.prototype.restoreDynamicTimerRowsFromState = function (saved, cappedStateForRestore) {
  var capped = document.getElementById("capped-timer-container");
  if (capped) {
    capped.innerHTML = "";
    var cappedRows = Array.isArray(saved.timer_dynamic_rows_capped) ? saved.timer_dynamic_rows_capped : [];
    for (var c = 0; c < cappedRows.length; c++) {
      capped.appendChild(this.createSavedDynamicTimerRow(cappedRows[c], cappedStateForRestore));
    }
  }

  var overflow = this.getCappedOverflowContainer(cappedStateForRestore);
  if (overflow) {
    overflow.innerHTML = "";
    var overflowRows = Array.isArray(saved.timer_dynamic_rows_overflow) ? saved.timer_dynamic_rows_overflow : [];
    for (var o = 0; o < overflowRows.length; o++) {
      overflow.appendChild(this.createSavedDynamicTimerRow(overflowRows[o], cappedStateForRestore));
    }
  }
};

GameManager.prototype.restoreTimerSubRowsFromState = function (saved) {
  var sub8k = document.getElementById("timer8192-sub");
  if (sub8k && typeof saved.timer_sub_8192 === "string") sub8k.textContent = saved.timer_sub_8192;
  var sub16k = document.getElementById("timer16384-sub");
  if (sub16k && typeof saved.timer_sub_16384 === "string") sub16k.textContent = saved.timer_sub_16384;
  var subContainer = document.getElementById("timer32k-sub-container");
  if (subContainer && typeof saved.timer_sub_visible === "boolean") {
    subContainer.style.display = saved.timer_sub_visible ? "block" : "none";
  }
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

GameManager.prototype.selectPreferredSavedStateCandidate = function (currentBest, nextCandidate) {
  if (!nextCandidate || typeof nextCandidate !== "object") return currentBest;
  if (!currentBest || typeof currentBest !== "object") return nextCandidate;
  var bestAt = Number(currentBest.saved_at) || 0;
  var nextAt = Number(nextCandidate.saved_at) || 0;
  // Keep the first candidate when timestamps are equal (full > lite > window).
  // This avoids downgrading to lite/window snapshots that may omit replay history.
  return nextAt > bestAt ? nextCandidate : currentBest;
};

GameManager.prototype.resolveLatestSavedStateCandidate = function (candidates) {
  var best = null;
  for (var i = 0; i < candidates.length; i++) {
    best = this.selectPreferredSavedStateCandidate(best, candidates[i]);
  }
  return best;
};

GameManager.prototype.resolveSavedStateRestorePrecheck = function (saved) {
  if (!saved || typeof saved !== "object") {
    return { canRestore: false, shouldClearSavedState: true };
  }
  if (Number(saved.v) !== GameManager.SAVED_GAME_STATE_VERSION) {
    return { canRestore: false, shouldClearSavedState: true };
  }
  if (saved.terminated) {
    return { canRestore: false, shouldClearSavedState: true };
  }
  if ((saved.over || (saved.won && !saved.keep_playing)) && saved.mode_key !== "practice_legacy") {
    return { canRestore: false, shouldClearSavedState: true };
  }
  if (saved.mode_key !== this.modeKey) {
    return { canRestore: false, shouldClearSavedState: false };
  }
  if (Number(saved.board_width) !== this.width || Number(saved.board_height) !== this.height) {
    return { canRestore: false, shouldClearSavedState: true };
  }
  if (saved.ruleset && saved.ruleset !== this.ruleset) {
    return { canRestore: false, shouldClearSavedState: true };
  }
  if (!Array.isArray(saved.board) || saved.board.length !== this.height) {
    return { canRestore: false, shouldClearSavedState: true };
  }
  return { canRestore: true, shouldClearSavedState: false };
};

GameManager.prototype.applyRestoredSavedStateCoreFields = function (saved) {
  this.score = Number.isInteger(saved.score) && saved.score >= 0 ? saved.score : 0;
  this.over = !!saved.over;
  this.won = !!saved.won;
  this.keepPlaying = !!saved.keep_playing;
  this.initialSeed = Number.isFinite(saved.initial_seed) ? Number(saved.initial_seed) : this.initialSeed;
  this.seed = Number.isFinite(saved.seed) ? Number(saved.seed) : this.initialSeed;
  this.moveHistory = Array.isArray(saved.move_history) ? saved.move_history.slice() : [];
  this.ipsInputCount = Number.isInteger(saved.ips_input_count) && saved.ips_input_count >= 0
    ? saved.ips_input_count
    : this.moveHistory.length;
  this.undoStack = Array.isArray(saved.undo_stack) ? saved.undo_stack.slice() : [];
  this.replayCompactLog = typeof saved.replay_compact_log === "string" ? saved.replay_compact_log : "";
  this.sessionReplayV3 = saved.session_replay_v3 && typeof saved.session_replay_v3 === "object"
    ? this.clonePlain(saved.session_replay_v3)
    : this.sessionReplayV3;
  this.spawnValueCounts = saved.spawn_value_counts && typeof saved.spawn_value_counts === "object"
    ? this.clonePlain(saved.spawn_value_counts)
    : {};
  this.spawnTwos = this.spawnValueCounts["2"] || 0;
  this.spawnFours = this.spawnValueCounts["4"] || 0;
  this.reached32k = !!saved.reached_32k;
  this.cappedMilestoneCount = Number.isInteger(saved.capped_milestone_count) ? saved.capped_milestone_count : 0;
  this.capped64Unlocked = saved.capped64_unlocked && typeof saved.capped64_unlocked === "object"
    ? this.clonePlain(saved.capped64_unlocked)
    : this.capped64Unlocked;
  this.comboStreak = Number.isInteger(saved.combo_streak) ? saved.combo_streak : 0;
  this.successfulMoveCount = Number.isInteger(saved.successful_move_count) ? saved.successful_move_count : 0;
  this.undoUsed = Number.isInteger(saved.undo_used) ? saved.undo_used : 0;
  this.lockConsumedAtMoveCount = Number.isInteger(saved.lock_consumed_at_move_count) ? saved.lock_consumed_at_move_count : -1;
  this.lockedDirectionTurn = Number.isInteger(saved.locked_direction_turn) ? saved.locked_direction_turn : null;
  this.lockedDirection = Number.isInteger(saved.locked_direction) ? saved.locked_direction : null;
  this.challengeId = typeof saved.challenge_id === "string" && saved.challenge_id ? saved.challenge_id : null;
  this.hasGameStarted = !!saved.has_game_started;
  this.accumulatedTime = Number.isFinite(saved.duration_ms) && saved.duration_ms >= 0 ? Math.floor(saved.duration_ms) : 0;
  this.time = this.accumulatedTime;
  this.startTime = null;
  this.timerStatus = 0;
  this.sessionSubmitDone = false;
};

GameManager.prototype.applyRestoredSavedBoardSnapshots = function (saved) {
  if (Array.isArray(saved.initial_board_matrix) && saved.initial_board_matrix.length === this.height) {
    this.initialBoardMatrix = this.cloneBoardMatrix(saved.initial_board_matrix);
  } else {
    this.initialBoardMatrix = this.getFinalBoardMatrix();
  }
  this.replayStartBoardMatrix = Array.isArray(saved.replay_start_board_matrix) && saved.replay_start_board_matrix.length === this.height
    ? this.cloneBoardMatrix(saved.replay_start_board_matrix)
    : this.cloneBoardMatrix(this.initialBoardMatrix);
  this.practiceRestartBoardMatrix = Array.isArray(saved.practice_restart_board_matrix) && saved.practice_restart_board_matrix.length === this.height
    ? this.cloneBoardMatrix(saved.practice_restart_board_matrix)
    : null;
  this.practiceRestartModeConfig = saved.practice_restart_mode_config && typeof saved.practice_restart_mode_config === "object"
    ? this.clonePlain(saved.practice_restart_mode_config)
    : null;
};

GameManager.prototype.applyRestoredSavedTimerUiState = function (saved) {
  this.restoreTimerRowsFromState(saved);
  if (saved.timer_module_view === "hidden") this.timerModuleView = "hidden";
  else this.timerModuleView = "timer";

  var timerEl = document.getElementById("timer");
  if (timerEl) timerEl.textContent = this.pretty(this.accumulatedTime);
  if (!this.over && !this.won && saved.timer_status === 1) {
    this.startTimer();
  }
};

GameManager.prototype.tryApplyRestoredSavedBoard = function (saved) {
  try {
    this.setBoardFromMatrix(saved.board);
    return true;
  } catch (_err) {
    return false;
  }
};

GameManager.prototype.resolveLatestSavedStateForCurrentMode = function () {
  var savedFull = this.readSavedPayloadByKey(this.getSavedGameStateKey());
  var savedLite = this.readSavedPayloadByKey(this.getSavedGameStateLiteKey());
  var savedWindow = this.readWindowNameSavedPayload(this.modeKey);
  return this.resolveLatestSavedStateCandidate([savedFull, savedLite, savedWindow]);
};

GameManager.prototype.handleSavedStateRestorePrecheckFailure = function (precheck) {
  if (precheck && precheck.shouldClearSavedState) this.clearSavedGameState();
  return false;
};

GameManager.prototype.tryRestoreSavedGameState = function () {
  if (!this.shouldUseSavedGameState()) return false;
  var saved = this.resolveLatestSavedStateForCurrentMode();
  if (!saved) return false;
  var precheck = this.resolveSavedStateRestorePrecheck(saved);
  if (!precheck.canRestore) {
    return this.handleSavedStateRestorePrecheckFailure(precheck);
  }
  if (!this.tryApplyRestoredSavedBoard(saved)) {
    this.clearSavedGameState();
    return false;
  }
  this.applyRestoredSavedStateCoreFields(saved);
  this.applyRestoredSavedBoardSnapshots(saved);
  this.applyRestoredSavedTimerUiState(saved);
  return true;
};

GameManager.prototype.shouldAbortSaveGameState = function (options, now) {
  if (!this.shouldUseSavedGameState()) return true;
  if (this.isSessionTerminated() && this.modeKey !== "practice_legacy") {
    this.clearSavedGameState();
    return true;
  }
  return this.shouldSkipSaveGameStateByThrottle(options, now);
};

GameManager.prototype.tryPersistAndMarkSavedGameState = function (payload, now) {
  try {
    var persisted = this.persistSavedGameStatePayload(payload);
    if (!persisted) return;
    this.lastSavedGameStateAt = now;
  } catch (_err) {}
};

GameManager.prototype.saveGameState = function (options) {
  options = options || {};
  var now = Date.now();
  if (this.shouldAbortSaveGameState(options, now)) return;

  var payload = this.buildSavedGameStatePayload(now);
  this.tryPersistAndMarkSavedGameState(payload, now);
};

GameManager.prototype.persistSavedGameStatePrimaryWrites = function (key, liteKey, payload, litePayload) {
  var persisted = this.writeSavedGameStatePayload(key, payload);
  if (!persisted) {
    persisted = this.writeSavedGameStatePayload(key, litePayload);
  }
  var litePersisted = this.writeSavedGameStatePayload(liteKey, litePayload);
  return {
    persisted: !!persisted,
    litePersisted: !!litePersisted
  };
};

GameManager.prototype.persistSavedGameStateQuotaFallback = function (key, liteKey, litePayload) {
  this.clearSavedGameState(this.modeKey);
  var persisted = this.writeSavedGameStatePayload(key, litePayload);
  var litePersisted = this.writeSavedGameStatePayload(liteKey, litePayload);
  return {
    persisted: !!persisted,
    litePersisted: !!litePersisted
  };
};

GameManager.prototype.persistSavedGameStatePayload = function (payload) {
  var key = this.getSavedGameStateKey();
  var liteKey = this.getSavedGameStateLiteKey();
  var litePayload = this.buildLiteSavedGameStatePayload(payload);
  this.writeWindowNameSavedPayload(this.modeKey, litePayload);
  var primaryWrites = this.persistSavedGameStatePrimaryWrites(key, liteKey, payload, litePayload);
  var persisted = primaryWrites.persisted;
  var litePersisted = primaryWrites.litePersisted;
  if (!persisted && !litePersisted) {
    var fallbackWrites = this.persistSavedGameStateQuotaFallback(key, liteKey, litePayload);
    persisted = fallbackWrites.persisted;
    litePersisted = fallbackWrites.litePersisted;
  }
  return !!(persisted || litePersisted);
};

GameManager.prototype.getElementTextContentById = function (id) {
  return (document.getElementById(id) || {}).textContent || "";
};

GameManager.prototype.isElementDisplayBlockById = function (id) {
  return ((document.getElementById(id) || {}).style || {}).display === "block";
};

GameManager.prototype.resolveTimerSubStateSnapshot = function () {
  return {
    timer_sub_8192: this.getElementTextContentById("timer8192-sub"),
    timer_sub_16384: this.getElementTextContentById("timer16384-sub"),
    timer_sub_visible: this.isElementDisplayBlockById("timer32k-sub-container")
  };
};

GameManager.prototype.resolveSavedReplayIpsInputCount = function () {
  return Number.isInteger(this.ipsInputCount) && this.ipsInputCount >= 0 ? this.ipsInputCount : 0;
};

GameManager.prototype.resolveSavedReplayUndoStackSnapshot = function () {
  return this.undoStack ? this.safeClonePlain(this.undoStack, []) : [];
};

GameManager.prototype.resolveSavedGameStateReplaySnapshot = function () {
  return {
    move_history: this.moveHistory ? this.moveHistory.slice() : [],
    ips_input_count: this.resolveSavedReplayIpsInputCount(),
    undo_stack: this.resolveSavedReplayUndoStackSnapshot(),
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

GameManager.prototype.buildSavedGameStateBasePayload = function (savedAt, replaySnapshot, timerSnapshot) {
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
    move_history: replaySnapshot.move_history,
    ips_input_count: replaySnapshot.ips_input_count,
    undo_stack: replaySnapshot.undo_stack,
    replay_compact_log: replaySnapshot.replay_compact_log,
    session_replay_v3: replaySnapshot.session_replay_v3,
    spawn_value_counts: this.spawnValueCounts ? this.safeClonePlain(this.spawnValueCounts, {}) : {},
    reached_32k: !!this.reached32k,
    capped_milestone_count: Number.isInteger(this.cappedMilestoneCount) ? this.cappedMilestoneCount : 0,
    capped64_unlocked: this.capped64Unlocked ? this.safeClonePlain(this.capped64Unlocked, null) : null,
    timer_status: timerSnapshot.timer_status,
    duration_ms: timerSnapshot.duration_ms,
    has_game_started: timerSnapshot.has_game_started
  };
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

GameManager.prototype.buildSavedGameStateExtendedPayload = function (timerSubState) {
  var boardSnapshot = this.resolveSavedBoardRestartSnapshot();
  var directionLockSnapshot = this.resolveSavedDirectionLockSnapshot();
  return {
    combo_streak: Number.isInteger(this.comboStreak) ? this.comboStreak : 0,
    successful_move_count: Number.isInteger(this.successfulMoveCount) ? this.successfulMoveCount : 0,
    undo_used: Number.isInteger(this.undoUsed) ? this.undoUsed : 0,
    lock_consumed_at_move_count: directionLockSnapshot.lock_consumed_at_move_count,
    locked_direction_turn: directionLockSnapshot.locked_direction_turn,
    locked_direction: directionLockSnapshot.locked_direction,
    challenge_id: this.challengeId || null,
    initial_board_matrix: boardSnapshot.initial_board_matrix,
    replay_start_board_matrix: boardSnapshot.replay_start_board_matrix,
    practice_restart_board_matrix: boardSnapshot.practice_restart_board_matrix,
    practice_restart_mode_config: boardSnapshot.practice_restart_mode_config,
    timer_module_view: this.getTimerModuleViewMode ? this.getTimerModuleViewMode() : "timer",
    timer_fixed_rows: this.captureTimerFixedRowsState(),
    timer_dynamic_rows_capped: this.captureTimerDynamicRowsState("capped-timer-container"),
    timer_dynamic_rows_overflow: this.captureTimerDynamicRowsState("capped-timer-overflow-container"),
    timer_sub_8192: timerSubState.timer_sub_8192,
    timer_sub_16384: timerSubState.timer_sub_16384,
    timer_sub_visible: timerSubState.timer_sub_visible
  };
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
  var appendCompactMoveCodeCore = this.callCoreReplayCodecRuntime("appendCompactMoveCode", [{
      log: this.replayCompactLog,
      rawCode: rawCode
    }]);
  if (appendCompactMoveCodeCore.available) {
    this.replayCompactLog = appendCompactMoveCodeCore.value;
    return;
  }
  this.appendCompactMoveCodeFallback(rawCode);
};

GameManager.prototype.appendCompactMoveCodeFallback = function (rawCode) {
  if (!Number.isInteger(rawCode) || rawCode < 0 || rawCode > 127) throw "Invalid move code";
  if (rawCode < 127) {
    this.replayCompactLog += this.encodeReplay128(rawCode);
    return;
  }
  this.replayCompactLog += this.encodeReplay128(127) + this.encodeReplay128(0);
};

GameManager.prototype.appendCompactUndo = function () {
  var appendCompactUndoCore = this.callCoreReplayCodecRuntime("appendCompactUndo", [this.replayCompactLog]);
  if (appendCompactUndoCore.available) {
    this.replayCompactLog = appendCompactUndoCore.value;
    return;
  }
  this.appendCompactUndoFallback();
};

GameManager.prototype.appendCompactUndoFallback = function () {
  this.replayCompactLog += this.encodeReplay128(127) + this.encodeReplay128(1);
};

GameManager.prototype.appendCompactPracticeAction = function (x, y, value) {
  var appendCompactPracticeActionCore = this.callCoreReplayCodecRuntime("appendCompactPracticeAction", [{
      log: this.replayCompactLog,
      width: this.width,
      height: this.height,
      x: x,
      y: y,
      value: value
    }]);
  if (appendCompactPracticeActionCore.available) {
    this.replayCompactLog = appendCompactPracticeActionCore.value;
    return;
  }
  this.appendCompactPracticeActionFallback(x, y, value);
};

GameManager.prototype.appendCompactPracticeActionFallback = function (x, y, value) {
  if (this.width !== 4 || this.height !== 4) throw "Compact practice replay only supports 4x4";
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || x > 3 || y < 0 || y > 3) {
    throw "Invalid practice coords";
  }
  if (!Number.isInteger(value) || value < 0) throw "Invalid practice value";
  var exp = 0;
  if (value > 0) {
    var lg = Math.log(value) / Math.log(2);
    if (Math.floor(lg) !== lg) throw "Practice value must be power of two";
    exp = lg;
  }
  if (exp < 0 || exp > 127) throw "Practice value exponent too large";
  var cell = (x << 2) | y;
  this.replayCompactLog += this.encodeReplay128(127) + this.encodeReplay128(2);
  this.replayCompactLog += this.encodeReplay128(cell) + this.encodeReplay128(exp);
};

GameManager.prototype.resolveDetectedModeCoreInput = function () {
  return {
    existingMode: this.mode,
    bodyMode:
      typeof document !== "undefined" && document.body
        ? document.body.getAttribute("data-mode-id")
        : "",
    pathname:
      typeof window !== "undefined" && window.location
        ? window.location.pathname
        : "",
    defaultModeKey: GameManager.DEFAULT_MODE_KEY
  };
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

GameManager.prototype.resolveDetectedModeFromBodyDataset = function () {
  if (typeof document === "undefined" || !document.body) return null;
  var bodyMode = document.body.getAttribute("data-mode-id");
  return bodyMode || null;
};

GameManager.prototype.resolveDetectedModeFromWindowPath = function () {
  if (typeof window === "undefined" || !window.location || !window.location.pathname) {
    return GameManager.DEFAULT_MODE_KEY;
  }
  return this.detectModeFromPathname(window.location.pathname);
};

GameManager.prototype.detectModeFallback = function () {
  if (this.mode) return this.mode;
  var bodyMode = this.resolveDetectedModeFromBodyDataset();
  if (bodyMode) return bodyMode;
  return this.resolveDetectedModeFromWindowPath();
};

GameManager.prototype.detectMode = function () {
  var resolveDetectedModeCore = this.callCoreModeRuntime("resolveDetectedMode", [
    this.resolveDetectedModeCoreInput()
  ]);
  if (resolveDetectedModeCore.available) {
    var detectedByCore = resolveDetectedModeCore.value;
    if (typeof detectedByCore === "string" && detectedByCore) return detectedByCore;
  }
  return this.detectModeFallback();
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

GameManager.prototype.writeSavedGameStatePayloadFallback = function (stores, key, payloadObj) {
  var serialized = this.serializeSavedGameStatePayload(payloadObj);
  return this.writeSerializedSavedPayloadToStorages(stores, key, serialized);
};

GameManager.prototype.writeSavedGameStatePayload = function (key, payloadObj) {
  var stores = this.getSavedGameStateStorages();
  var writeSavedPayloadToStoragesCore = this.callCoreStorageRuntime("writeSavedPayloadToStorages", [{
      storages: stores,
      key: key,
      payload: payloadObj
    }]);
  if (writeSavedPayloadToStoragesCore.available) {
    var persistedByCore = writeSavedPayloadToStoragesCore.value;
    if (typeof persistedByCore === "boolean") return persistedByCore;
  }
  return this.writeSavedGameStatePayloadFallback(stores, key, payloadObj);
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

GameManager.prototype.buildLiteSavedGameStateBaseFallback = function (payload) {
  return {
    v: GameManager.SAVED_GAME_STATE_VERSION,
    saved_at: Number(payload.saved_at) || Date.now(),
    terminated: false,
    mode_key: payload.mode_key || this.modeKey,
    board_width: Number(payload.board_width) || this.width,
    board_height: Number(payload.board_height) || this.height,
    ruleset: payload.ruleset || this.ruleset,
    board: Array.isArray(payload.board) ? this.cloneBoardMatrix(payload.board) : this.getFinalBoardMatrix(),
    score: Number.isInteger(payload.score) ? payload.score : this.score,
    over: !!payload.over,
    won: !!payload.won,
    keep_playing: !!payload.keep_playing,
    initial_seed: Number.isFinite(payload.initial_seed) ? Number(payload.initial_seed) : this.initialSeed,
    seed: Number.isFinite(payload.seed) ? Number(payload.seed) : this.seed,
    ips_input_count: Number.isInteger(payload.ips_input_count) && payload.ips_input_count >= 0
      ? payload.ips_input_count
      : 0,
    timer_status: payload.timer_status === 1 ? 1 : 0,
    duration_ms: Number.isFinite(payload.duration_ms) ? Math.floor(payload.duration_ms) : this.getDurationMs(),
    has_game_started: !!payload.has_game_started,
    initial_board_matrix: this.resolveLiteSavedInitialBoardMatrix(payload),
    replay_start_board_matrix: this.resolveLiteSavedReplayStartBoardMatrix(payload),
    practice_restart_board_matrix: this.resolveLiteSavedPracticeRestartBoardMatrix(payload),
    practice_restart_mode_config: this.resolveLiteSavedPracticeRestartModeConfig(payload),
    move_history: [],
    undo_stack: [],
    replay_compact_log: "",
    session_replay_v3: null,
    spawn_value_counts: {}
  };
};

GameManager.prototype.buildLiteSavedGameStateProgressFallback = function (payload) {
  return {
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
  };
};

GameManager.prototype.buildLiteSavedGameStatePayloadFallback = function (payload) {
  var basePayload = this.buildLiteSavedGameStateBaseFallback(payload);
  var progressPayload = this.buildLiteSavedGameStateProgressFallback(payload);
  return Object.assign(basePayload, progressPayload);
};

GameManager.prototype.normalizeLiteSavedGameStatePayloadByCore = function (litePayloadByCore) {
  return this.isNonArrayObject(litePayloadByCore) ? litePayloadByCore : null;
};

GameManager.prototype.buildLiteSavedGameStatePayload = function (payload) {
  var buildLiteSavedGameStatePayloadCore = this.callCoreStorageRuntime("buildLiteSavedGameStatePayload", [{
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
    }]);
  if (buildLiteSavedGameStatePayloadCore.available) {
    var normalizedByCore = this.normalizeLiteSavedGameStatePayloadByCore(buildLiteSavedGameStatePayloadCore.value);
    if (normalizedByCore) return normalizedByCore;
  }

  if (!payload || typeof payload !== "object") return null;
  return this.buildLiteSavedGameStatePayloadFallback(payload);
};

GameManager.prototype.resolveCatalogGetMode = function () {
  var modeCatalogGetMode = this.resolveWindowNamespaceMethod("ModeCatalog", "getMode");
  if (!modeCatalogGetMode) return null;
  return function (requestedModeId) {
    return modeCatalogGetMode.method.call(modeCatalogGetMode.scope, requestedModeId);
  };
};

GameManager.prototype.resolveModeConfigFromCatalogFallback = function (modeKey, catalogGetMode) {
  if (catalogGetMode) {
    return catalogGetMode(modeKey);
  }
  if (GameManager.FALLBACK_MODE_CONFIGS[modeKey]) {
    return this.clonePlain(GameManager.FALLBACK_MODE_CONFIGS[modeKey]);
  }
  return null;
};

GameManager.prototype.getModeConfigFromCatalog = function (modeKey) {
  var catalogGetMode = this.resolveCatalogGetMode();

  var resolveModeCatalogConfigCore = this.callCoreModeRuntime("resolveModeCatalogConfig", [{
      modeId: modeKey,
      catalogGetMode: catalogGetMode,
      fallbackModeConfigs: GameManager.FALLBACK_MODE_CONFIGS
    }]);
  if (resolveModeCatalogConfigCore.available) {
    return resolveModeCatalogConfigCore.value;
  }
  return this.resolveModeConfigFromCatalogFallback(modeKey, catalogGetMode);
};

GameManager.prototype.getCoreRuntimeByName = function (runtimeName) {
  if (typeof window === "undefined") return null;
  if (typeof runtimeName !== "string" || !runtimeName) return null;
  var core = window[runtimeName];
  if (!core || typeof core !== "object") return null;
  return core;
};

GameManager.prototype.isValidCoreRuntimeMethodLookupInput = function (runtimeGetterName, methodName) {
  return !!(
    typeof runtimeGetterName === "string" &&
    runtimeGetterName &&
    typeof methodName === "string" &&
    methodName
  );
};

GameManager.prototype.resolveCoreRuntimeFromGetterName = function (runtimeGetterName) {
  var runtimeGetter = this[runtimeGetterName];
  if (typeof runtimeGetter !== "function") return null;
  var runtime = runtimeGetter.call(this);
  if (!runtime || typeof runtime !== "object") return null;
  return runtime;
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
  if (!this.isValidCoreRuntimeMethodLookupInput(runtimeGetterName, methodName)) return null;
  var runtime = this.resolveCoreRuntimeFromGetterName(runtimeGetterName);
  return this.wrapCoreRuntimeMethod(runtime, methodName);
};

function registerCoreRuntimeMethodResolver(methodName, runtimeGetterName) {
  GameManager.prototype[methodName] = function (coreMethodName) {
    return this.resolveCoreRuntimeMethod(runtimeGetterName, coreMethodName);
  };
}

var GAME_MANAGER_CORE_RUNTIME_METHOD_RESOLVERS = [
  ["resolveCoreModeRuntimeMethod", "getCoreModeRuntime"],
  ["resolveCoreRulesRuntimeMethod", "getCoreRulesRuntime"],
  ["resolveCoreGridScanRuntimeMethod", "getCoreGridScanRuntime"],
  ["resolveCoreMoveScanRuntimeMethod", "getCoreMoveScanRuntime"],
  ["resolveCoreMovePathRuntimeMethod", "getCoreMovePathRuntime"],
  ["resolveCoreScoringRuntimeMethod", "getCoreScoringRuntime"],
  ["resolveCoreMoveApplyRuntimeMethod", "getCoreMoveApplyRuntime"],
  ["resolveCoreUndoSnapshotRuntimeMethod", "getCoreUndoSnapshotRuntime"],
  ["resolveCorePostMoveRecordRuntimeMethod", "getCorePostMoveRecordRuntime"],
  ["resolveCorePostUndoRecordRuntimeMethod", "getCorePostUndoRecordRuntime"],
  ["resolveCoreUndoRestoreRuntimeMethod", "getCoreUndoRestoreRuntime"],
  ["resolveCoreUndoStackEntryRuntimeMethod", "getCoreUndoStackEntryRuntime"],
  ["resolveCoreUndoTileSnapshotRuntimeMethod", "getCoreUndoTileSnapshotRuntime"],
  ["resolveCoreUndoTileRestoreRuntimeMethod", "getCoreUndoTileRestoreRuntime"],
  ["resolveCoreUndoRestorePayloadRuntimeMethod", "getCoreUndoRestorePayloadRuntime"],
  ["resolveCoreMergeEffectsRuntimeMethod", "getCoreMergeEffectsRuntime"],
  ["resolveCoreSpecialRulesRuntimeMethod", "getCoreSpecialRulesRuntime"],
  ["resolveCoreDirectionLockRuntimeMethod", "getCoreDirectionLockRuntime"],
  ["resolveCorePostMoveRuntimeMethod", "getCorePostMoveRuntime"],
  ["resolveCoreTimerIntervalRuntimeMethod", "getCoreTimerIntervalRuntime"],
  ["resolveCorePrettyTimeRuntimeMethod", "getCorePrettyTimeRuntime"],
  ["resolveCoreStorageRuntimeMethod", "getCoreGameSettingsStorageRuntime"],
  ["resolveCoreReplayCodecRuntimeMethod", "getCoreReplayCodecRuntime"],
  ["resolveCoreReplayV4ActionsRuntimeMethod", "getCoreReplayV4ActionsRuntime"],
  ["resolveCoreReplayImportRuntimeMethod", "getCoreReplayImportRuntime"],
  ["resolveCoreReplayExecutionRuntimeMethod", "getCoreReplayExecutionRuntime"],
  ["resolveCoreReplayDispatchRuntimeMethod", "getCoreReplayDispatchRuntime"],
  ["resolveCoreReplayLifecycleRuntimeMethod", "getCoreReplayLifecycleRuntime"],
  ["resolveCoreReplayTimerRuntimeMethod", "getCoreReplayTimerRuntime"],
  ["resolveCoreReplayFlowRuntimeMethod", "getCoreReplayFlowRuntime"],
  ["resolveCoreReplayControlRuntimeMethod", "getCoreReplayControlRuntime"],
  ["resolveCoreReplayLoopRuntimeMethod", "getCoreReplayLoopRuntime"],
  ["resolveCoreReplayLegacyRuntimeMethod", "getCoreReplayLegacyRuntime"]
];

for (var resolverIndex = 0; resolverIndex < GAME_MANAGER_CORE_RUNTIME_METHOD_RESOLVERS.length; resolverIndex++) {
  var resolverItem = GAME_MANAGER_CORE_RUNTIME_METHOD_RESOLVERS[resolverIndex];
  registerCoreRuntimeMethodResolver(resolverItem[0], resolverItem[1]);
}

function registerCoreRuntimeGetter(methodName, runtimeName) {
  GameManager.prototype[methodName] = function () {
    return this.getCoreRuntimeByName(runtimeName);
  };
}

var GAME_MANAGER_CORE_RUNTIME_GETTERS = [
  ["getCoreRulesRuntime", "CoreRulesRuntime"],
  ["getCoreModeRuntime", "CoreModeRuntime"],
  ["getCoreSpecialRulesRuntime", "CoreSpecialRulesRuntime"],
  ["getCoreDirectionLockRuntime", "CoreDirectionLockRuntime"],
  ["getCoreGridScanRuntime", "CoreGridScanRuntime"],
  ["getCoreMoveScanRuntime", "CoreMoveScanRuntime"],
  ["getCoreMovePathRuntime", "CoreMovePathRuntime"],
  ["getCoreScoringRuntime", "CoreScoringRuntime"],
  ["getCoreMergeEffectsRuntime", "CoreMergeEffectsRuntime"],
  ["getCorePostMoveRuntime", "CorePostMoveRuntime"],
  ["getCoreMoveApplyRuntime", "CoreMoveApplyRuntime"],
  ["getCorePostMoveRecordRuntime", "CorePostMoveRecordRuntime"],
  ["getCorePostUndoRecordRuntime", "CorePostUndoRecordRuntime"],
  ["getCoreUndoRestoreRuntime", "CoreUndoRestoreRuntime"],
  ["getCoreUndoSnapshotRuntime", "CoreUndoSnapshotRuntime"],
  ["getCoreUndoTileSnapshotRuntime", "CoreUndoTileSnapshotRuntime"],
  ["getCoreUndoTileRestoreRuntime", "CoreUndoTileRestoreRuntime"],
  ["getCoreUndoRestorePayloadRuntime", "CoreUndoRestorePayloadRuntime"],
  ["getCoreUndoStackEntryRuntime", "CoreUndoStackEntryRuntime"],
  ["getCoreGameSettingsStorageRuntime", "CoreGameSettingsStorageRuntime"],
  ["getCoreTimerIntervalRuntime", "CoreTimerIntervalRuntime"],
  ["getCorePrettyTimeRuntime", "CorePrettyTimeRuntime"],
  ["getCoreReplayCodecRuntime", "CoreReplayCodecRuntime"],
  ["getCoreReplayV4ActionsRuntime", "CoreReplayV4ActionsRuntime"],
  ["getCoreReplayImportRuntime", "CoreReplayImportRuntime"],
  ["getCoreReplayExecutionRuntime", "CoreReplayExecutionRuntime"],
  ["getCoreReplayDispatchRuntime", "CoreReplayDispatchRuntime"],
  ["getCoreReplayLifecycleRuntime", "CoreReplayLifecycleRuntime"],
  ["getCoreReplayTimerRuntime", "CoreReplayTimerRuntime"],
  ["getCoreReplayFlowRuntime", "CoreReplayFlowRuntime"],
  ["getCoreReplayControlRuntime", "CoreReplayControlRuntime"],
  ["getCoreReplayLoopRuntime", "CoreReplayLoopRuntime"],
  ["getCoreReplayLegacyRuntime", "CoreReplayLegacyRuntime"]
];

for (var runtimeGetterIndex = 0; runtimeGetterIndex < GAME_MANAGER_CORE_RUNTIME_GETTERS.length; runtimeGetterIndex++) {
  var runtimeGetterDef = GAME_MANAGER_CORE_RUNTIME_GETTERS[runtimeGetterIndex];
  registerCoreRuntimeGetter(runtimeGetterDef[0], runtimeGetterDef[1]);
}

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

GameManager.prototype.resolveForcedUndoSettingForModeFallback = function (targetMode, modeConfig) {
  var modeCfg = modeConfig || null;
  if (modeCfg && typeof modeCfg.undo_enabled === "boolean") {
    return modeCfg.undo_enabled;
  }
  var modeId = (targetMode || "").toLowerCase();
  if (modeId === "capped" || modeId.indexOf("capped") !== -1) return false;
  if (modeId.indexOf("no_undo") !== -1 || modeId.indexOf("no-undo") !== -1) return false;
  if (modeId.indexOf("undo_only") !== -1 || modeId.indexOf("undo-only") !== -1) return true;
  return null;
};

GameManager.prototype.buildUndoPolicyStateFallback = function (params) {
  var input = params && typeof params === "object" ? params : {};
  var forcedUndoSetting = input.forcedUndoSetting;
  var hasGameStarted = !!input.hasGameStarted;
  var replayMode = !!input.replayMode;
  var undoLimit = input.undoLimit;
  var undoUsed = input.undoUsed;
  var undoEnabled = !!input.undoEnabled;

  var isUndoAllowedByMode = forcedUndoSetting !== false;
  var isUndoSettingFixedForMode = forcedUndoSetting !== null;
  var canToggleUndoSetting = isUndoAllowedByMode && !isUndoSettingFixedForMode && !hasGameStarted;
  var isUndoInteractionEnabled = !replayMode &&
    !(undoLimit !== null && Number(undoUsed) >= Number(undoLimit)) &&
    !!(undoEnabled && isUndoAllowedByMode);

  return {
    forcedUndoSetting: forcedUndoSetting,
    isUndoAllowedByMode: isUndoAllowedByMode,
    isUndoSettingFixedForMode: isUndoSettingFixedForMode,
    canToggleUndoSetting: canToggleUndoSetting,
    isUndoInteractionEnabled: isUndoInteractionEnabled
  };
};

GameManager.prototype.resolveUndoPolicyStateForMode = function (mode, options) {
  var context = this.resolveModePolicyContext(mode);
  var source = options;
  var hasGameStarted = !!this.readOptionValue(source, "hasGameStarted", !!this.hasGameStarted);
  var replayMode = !!this.readOptionValue(source, "replayMode", !!this.replayMode);
  var undoLimit = this.readOptionValue(source, "undoLimit", this.undoLimit);
  var undoUsed = this.readOptionValue(source, "undoUsed", this.undoUsed);
  var undoEnabled = this.readOptionValue(source, "undoEnabled", this.undoEnabled);

  var resolveUndoPolicyStateCore = this.callCoreModeRuntime("resolveUndoPolicyState", [{
      mode: context.targetMode,
      modeConfig: context.modeConfig,
      hasGameStarted: hasGameStarted,
      replayMode: replayMode,
      undoLimit: undoLimit,
      undoUsed: undoUsed,
      undoEnabled: undoEnabled
    }]);
  if (resolveUndoPolicyStateCore.available) {
    var computed = resolveUndoPolicyStateCore.value;
    if (computed && typeof computed === "object") {
      return computed;
    }
  }

  var forcedUndoSetting = this.resolveForcedUndoSettingForModeFallback(
    context.targetMode,
    context.modeConfig
  );
  return this.buildUndoPolicyStateFallback({
    forcedUndoSetting: forcedUndoSetting,
    hasGameStarted: hasGameStarted,
    replayMode: replayMode,
    undoLimit: undoLimit,
    undoUsed: undoUsed,
    undoEnabled: undoEnabled
  });
};

GameManager.prototype.resolveActiveUndoPolicyState = function (options) {
  return this.resolveUndoPolicyStateForMode(this.mode, options);
};

GameManager.prototype.getLegacyAdapterBridge = function () {
  if (typeof window === "undefined") return null;
  var payload = window.__legacyEngine;
  if (!payload || typeof payload !== "object") return null;
  if (payload.manager !== this) return null;
  return payload;
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

GameManager.prototype.getAdapterSessionParityReport = function () {
  var readAdapterParityReportBridge = this.resolveLegacyAdapterBridgeMethod("readAdapterParityReport");
  var bridge = readAdapterParityReportBridge ? readAdapterParityReportBridge.bridge : this.getLegacyAdapterBridge();
  if (!bridge || typeof bridge !== "object") return null;

  if (readAdapterParityReportBridge) {
    var report = readAdapterParityReportBridge.method.call(bridge);
    if (!report || typeof report !== "object") return null;
    var clonedReport = this.safeClonePlain(report, null);
    if (clonedReport) {
      bridge.adapterParityReport = clonedReport;
    }
    return clonedReport;
  }

  if (bridge.adapterParityReport && typeof bridge.adapterParityReport === "object") {
    return this.safeClonePlain(bridge.adapterParityReport, null);
  }
  return null;
};

GameManager.prototype.getAdapterSessionParityABDiff = function () {
  var readAdapterParityABDiffBridge = this.resolveLegacyAdapterBridgeMethod("readAdapterParityABDiff");
  var bridge = readAdapterParityABDiffBridge ? readAdapterParityABDiffBridge.bridge : this.getLegacyAdapterBridge();
  if (!bridge || typeof bridge !== "object") return null;

  if (readAdapterParityABDiffBridge) {
    var diff = readAdapterParityABDiffBridge.method.call(bridge);
    if (!diff || typeof diff !== "object") return null;
    var clonedDiff = this.safeClonePlain(diff, null);
    if (clonedDiff) {
      bridge.adapterParityABDiff = clonedDiff;
    }
    return clonedDiff;
  }

  if (bridge.adapterParityABDiff && typeof bridge.adapterParityABDiff === "object") {
    return this.safeClonePlain(bridge.adapterParityABDiff, null);
  }
  return null;
};

GameManager.prototype.resolveAdapterBridgeModeKey = function (bridge) {
  return typeof bridge.modeKey === "string" && bridge.modeKey
    ? bridge.modeKey
    : (this.modeKey || this.mode || "");
};

GameManager.prototype.resolveAdapterBridgeMode = function (bridge) {
  return typeof bridge.adapterMode === "string" && bridge.adapterMode
    ? bridge.adapterMode
    : "legacy-bridge";
};

GameManager.prototype.buildAdapterMoveResultDetail = function (meta, bridge, timestamp) {
  var input = meta && typeof meta === "object" ? meta : {};
  var modeKey = this.resolveAdapterBridgeModeKey(bridge);
  var adapterMode = this.resolveAdapterBridgeMode(bridge);
  return {
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
};

GameManager.prototype.syncAdapterSnapshotAfterMoveResult = function (bridge, detail, timestamp) {
  var syncAdapterSnapshotBridge = this.resolveLegacyAdapterBridgeMethod("syncAdapterSnapshot");
  if (!syncAdapterSnapshotBridge) return;
  var snapshot = {
    adapterMode: this.resolveAdapterBridgeMode(bridge),
    modeKey: this.resolveAdapterBridgeModeKey(bridge) || "unknown",
    updatedAt: timestamp,
    lastMoveResult: detail
  };
  syncAdapterSnapshotBridge.method.call(bridge, snapshot);
  bridge.adapterSnapshot = snapshot;
};

GameManager.prototype.syncAdapterParityAfterMoveResult = function (bridge) {
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
};

GameManager.prototype.emitAdapterMoveResultDetail = function (emitMoveResultBridge, bridge, detail) {
  emitMoveResultBridge.method.call(bridge, detail);
};

GameManager.prototype.finalizeAdapterMoveResultSync = function (bridge, detail, timestamp) {
  this.syncAdapterSnapshotAfterMoveResult(bridge, detail, timestamp);
  this.syncAdapterParityAfterMoveResult(bridge);
};

GameManager.prototype.publishAdapterMoveResult = function (meta) {
  var emitMoveResultBridge = this.resolveLegacyAdapterBridgeMethod("emitMoveResult");
  if (!emitMoveResultBridge) return false;
  var bridge = emitMoveResultBridge.bridge;
  var timestamp = Date.now();
  var detail = this.buildAdapterMoveResultDetail(meta, bridge, timestamp);
  this.emitAdapterMoveResultDetail(emitMoveResultBridge, bridge, detail);
  this.finalizeAdapterMoveResultSync(bridge, detail, timestamp);
  return true;
};

GameManager.prototype.buildPlannedTileInteractionFromCore = function (computed, cell, positions) {
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
};

GameManager.prototype.buildPlannedTileInteractionFallback = function (cell, positions, next, mergedValue) {
  var shouldMerge = !!next && !next.mergedFrom && Number.isInteger(mergedValue) && mergedValue > 0;
  var targetLegacy = shouldMerge ? positions.next : positions.farthest;
  return {
    kind: shouldMerge ? "merge" : "move",
    target: targetLegacy,
    moved: !this.positionsEqual(cell, targetLegacy)
  };
};

GameManager.prototype.planTileInteraction = function (cell, positions, next, mergedValue) {
  var planTileInteractionCore = this.callCoreMoveApplyRuntime("planTileInteraction", [{
      cell: cell,
      farthest: positions && positions.farthest ? positions.farthest : { x: 0, y: 0 },
      next: positions && positions.next ? positions.next : { x: 0, y: 0 },
      hasNextTile: !!next,
      nextMergedFrom: !!(next && next.mergedFrom),
      mergedValue: mergedValue
    }]);
  if (planTileInteractionCore.available) {
    return this.buildPlannedTileInteractionFromCore(planTileInteractionCore.value || {}, cell, positions);
  }
  return this.buildPlannedTileInteractionFallback(cell, positions, next, mergedValue);
};

GameManager.prototype.canBuildCompactMoveCodeFallback = function () {
  return !!(
    this.lastSpawn &&
    this.width === 4 &&
    this.height === 4 &&
    !this.isFibonacciMode() &&
    (this.lastSpawn.value === 2 || this.lastSpawn.value === 4)
  );
};

GameManager.prototype.resolveCompactMoveCodeFallback = function (direction) {
  if (!this.canBuildCompactMoveCodeFallback()) return null;
  var valBit = this.lastSpawn.value === 4 ? 1 : 0;
  var posIdx = this.lastSpawn.x + this.lastSpawn.y * 4;
  return (direction << 5) | (valBit << 4) | posIdx;
};

GameManager.prototype.buildReplayPostMoveRecordFallback = function () {
  return {
    shouldRecordMoveHistory: false,
    compactMoveCode: null,
    shouldPushSessionAction: false,
    sessionAction: null,
    shouldResetLastSpawn: false
  };
};

GameManager.prototype.buildPostMoveRecordFallback = function (direction) {
  var shouldPushSessionAction = !!this.sessionReplayV3;
  return {
    shouldRecordMoveHistory: true,
    compactMoveCode: this.resolveCompactMoveCodeFallback(direction),
    shouldPushSessionAction: shouldPushSessionAction,
    sessionAction: shouldPushSessionAction ? ["m", direction] : null,
    shouldResetLastSpawn: true
  };
};

GameManager.prototype.computePostMoveRecord = function (direction) {
  var computePostMoveRecordCore = this.callCorePostMoveRecordRuntime("computePostMoveRecord", [{
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
    }]);
  if (computePostMoveRecordCore.available) return computePostMoveRecordCore.value || {};

  if (this.replayMode) return this.buildReplayPostMoveRecordFallback();
  return this.buildPostMoveRecordFallback(direction);
};

GameManager.prototype.buildReplayPostUndoRecordFallback = function () {
  return {
    shouldRecordMoveHistory: false,
    shouldAppendCompactUndo: false,
    shouldPushSessionAction: false,
    sessionAction: null
  };
};

GameManager.prototype.buildPostUndoRecordFallback = function () {
  var shouldPushSessionAction = !!this.sessionReplayV3;
  return {
    shouldRecordMoveHistory: true,
    shouldAppendCompactUndo: true,
    shouldPushSessionAction: shouldPushSessionAction,
    sessionAction: shouldPushSessionAction ? ["u"] : null
  };
};

GameManager.prototype.computePostUndoRecord = function (direction) {
  var computePostUndoRecordCore = this.callCorePostUndoRecordRuntime("computePostUndoRecord", [{
      replayMode: !!this.replayMode,
      direction: direction,
      hasSessionReplayV3: !!this.sessionReplayV3
    }]);
  if (computePostUndoRecordCore.available) return computePostUndoRecordCore.value || {};
  if (this.replayMode) return this.buildReplayPostUndoRecordFallback();
  return this.buildPostUndoRecordFallback();
};

GameManager.prototype.getUndoStateFallbackValues = function () {
  return {
    score:
      Number.isFinite(this.score) && typeof this.score === "number" ? Number(this.score) : 0,
    comboStreak:
      Number.isInteger(this.comboStreak) && this.comboStreak >= 0 ? this.comboStreak : 0,
    successfulMoveCount:
      Number.isInteger(this.successfulMoveCount) && this.successfulMoveCount >= 0
        ? this.successfulMoveCount
        : 0,
    lockConsumedAtMoveCount:
      Number.isInteger(this.lockConsumedAtMoveCount) ? this.lockConsumedAtMoveCount : -1,
    lockedDirectionTurn:
      Number.isInteger(this.lockedDirectionTurn) ? this.lockedDirectionTurn : null,
    lockedDirection:
      Number.isInteger(this.lockedDirection) ? this.lockedDirection : null,
    undoUsed: Number.isInteger(this.undoUsed) && this.undoUsed >= 0 ? this.undoUsed : 0
  };
};

GameManager.prototype.resolveUndoRestoreFallbackUndoBase = function (source, fallbackUndoUsed) {
  return Number.isInteger(source.undoUsed) && source.undoUsed >= 0
    ? source.undoUsed
    : fallbackUndoUsed;
};

GameManager.prototype.buildUndoRestoreStateFallback = function (source, undoBase) {
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
};

GameManager.prototype.computeUndoRestoreState = function (prev) {
  var computeUndoRestoreStateCore = this.callCoreUndoRestoreRuntime("computeUndoRestoreState", [{
      prev: prev || {},
      fallbackUndoUsed: this.undoUsed,
      timerStatus: this.timerStatus
    }]);
  if (computeUndoRestoreStateCore.available) return computeUndoRestoreStateCore.value || {};

  var source = prev && typeof prev === "object" ? prev : {};
  var fallbackState = this.getUndoStateFallbackValues();
  var undoBase = this.resolveUndoRestoreFallbackUndoBase(source, fallbackState.undoUsed);
  return this.buildUndoRestoreStateFallback(source, undoBase);
};

GameManager.prototype.createUndoSnapshotState = function () {
  var fallbackState = this.getUndoStateFallbackValues();
  var createUndoSnapshotCore = this.callCoreUndoSnapshotRuntime("createUndoSnapshot", [{
    score: this.score,
    comboStreak: this.comboStreak,
    successfulMoveCount: this.successfulMoveCount,
    lockConsumedAtMoveCount: this.lockConsumedAtMoveCount,
    lockedDirectionTurn: this.lockedDirectionTurn,
    lockedDirection: this.lockedDirection,
    undoUsed: this.undoUsed
  }]);
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

  if (createUndoSnapshotCore.available) {
    var computed = createUndoSnapshotCore.value || {};
    return {
      score: Number.isFinite(computed.score) ? Number(computed.score) : fallback.score,
      tiles: Array.isArray(computed.tiles) ? computed.tiles : [],
      comboStreak:
        Number.isInteger(computed.comboStreak) && computed.comboStreak >= 0
          ? computed.comboStreak
          : fallback.comboStreak,
      successfulMoveCount:
        Number.isInteger(computed.successfulMoveCount) && computed.successfulMoveCount >= 0
          ? computed.successfulMoveCount
          : fallback.successfulMoveCount,
      lockConsumedAtMoveCount:
        Number.isInteger(computed.lockConsumedAtMoveCount)
          ? computed.lockConsumedAtMoveCount
          : fallback.lockConsumedAtMoveCount,
      lockedDirectionTurn:
        Number.isInteger(computed.lockedDirectionTurn)
          ? computed.lockedDirectionTurn
          : fallback.lockedDirectionTurn,
      lockedDirection:
        Number.isInteger(computed.lockedDirection)
          ? computed.lockedDirection
          : fallback.lockedDirection,
      undoUsed:
        Number.isInteger(computed.undoUsed) && computed.undoUsed >= 0
          ? computed.undoUsed
          : fallback.undoUsed
    };
  }

  return fallback;
};

GameManager.prototype.normalizeUndoStackEntry = function (entry) {
  var fallbackState = this.getUndoStateFallbackValues();

  var source = entry && typeof entry === "object" ? entry : {};
  var normalizeUndoStackEntryCore = this.callCoreUndoStackEntryRuntime("normalizeUndoStackEntry", [{
      entry: source,
      fallbackScore: fallbackState.score,
      fallbackComboStreak: fallbackState.comboStreak,
      fallbackSuccessfulMoveCount: fallbackState.successfulMoveCount,
      fallbackLockConsumedAtMoveCount: fallbackState.lockConsumedAtMoveCount,
      fallbackLockedDirectionTurn: fallbackState.lockedDirectionTurn,
      fallbackLockedDirection: fallbackState.lockedDirection,
      fallbackUndoUsed: fallbackState.undoUsed
    }]);
  if (normalizeUndoStackEntryCore.available) {
    var computed = normalizeUndoStackEntryCore.value || {};
    if (computed && typeof computed === "object") {
      source = computed;
    }
  }

  var rawTiles = Array.isArray(source.tiles) ? source.tiles : [];
  var tiles = [];
  for (var i = 0; i < rawTiles.length; i++) {
    var item = rawTiles[i];
    if (!item || typeof item !== "object") continue;
    tiles.push(item);
  }

  return {
    score:
      Number.isFinite(source.score) && typeof source.score === "number"
        ? Number(source.score)
        : fallbackState.score,
    tiles: tiles,
    comboStreak:
      Number.isInteger(source.comboStreak) && source.comboStreak >= 0
        ? source.comboStreak
        : fallbackState.comboStreak,
    successfulMoveCount:
      Number.isInteger(source.successfulMoveCount) && source.successfulMoveCount >= 0
        ? source.successfulMoveCount
        : fallbackState.successfulMoveCount,
    lockConsumedAtMoveCount:
      Number.isInteger(source.lockConsumedAtMoveCount)
        ? source.lockConsumedAtMoveCount
        : fallbackState.lockConsumedAtMoveCount,
    lockedDirectionTurn:
      Number.isInteger(source.lockedDirectionTurn)
        ? source.lockedDirectionTurn
        : fallbackState.lockedDirectionTurn,
    lockedDirection:
      Number.isInteger(source.lockedDirection)
        ? source.lockedDirection
        : fallbackState.lockedDirection,
    undoUsed:
      Number.isInteger(source.undoUsed) && source.undoUsed >= 0
        ? source.undoUsed
        : fallbackState.undoUsed
  };
};

GameManager.prototype.createUndoTileSnapshot = function (tile, target) {
  var createUndoTileSnapshotCore = this.callCoreUndoTileSnapshotRuntime("createUndoTileSnapshot", [{
      tile: {
        x: tile && typeof tile === "object" ? tile.x : null,
        y: tile && typeof tile === "object" ? tile.y : null,
        value: tile && typeof tile === "object" ? tile.value : null
      },
      target: {
        x: target && typeof target === "object" ? target.x : null,
        y: target && typeof target === "object" ? target.y : null
      }
    }]);
  if (createUndoTileSnapshotCore.available) {
    var computed = createUndoTileSnapshotCore.value || {};
    if (
      computed &&
      typeof computed === "object" &&
      computed.previousPosition &&
      typeof computed.previousPosition === "object"
    ) {
      return computed;
    }
  }

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
  var source = snapshot && typeof snapshot === "object" ? snapshot : {};
  var previous = source.previousPosition && typeof source.previousPosition === "object"
    ? source.previousPosition
    : {};
  var fallback = {
    x: source.x,
    y: source.y,
    value: source.value,
    previousPosition: {
      x: previous.x,
      y: previous.y
    }
  };

  var createUndoRestoreTileCore = this.callCoreUndoTileRestoreRuntime("createUndoRestoreTile", [{
      x: source.x,
      y: source.y,
      value: source.value,
      previousPosition: {
        x: previous.x,
        y: previous.y
      }
    }]);
  if (createUndoRestoreTileCore.available) {
    var computed = createUndoRestoreTileCore.value || {};
    if (
      computed &&
      typeof computed === "object" &&
      computed.previousPosition &&
      typeof computed.previousPosition === "object"
    ) {
      return computed;
    }
  }

  return fallback;
};

GameManager.prototype.resolveUndoRestorePayloadFallbackScore = function (source) {
  if (Number.isFinite(source.score) && typeof source.score === "number") {
    return Number(source.score);
  }
  return Number.isFinite(this.score) && typeof this.score === "number" ? Number(this.score) : 0;
};

GameManager.prototype.filterUndoRestorePayloadTiles = function (source) {
  var rawTiles = Array.isArray(source.tiles) ? source.tiles : [];
  var tiles = [];
  for (var i = 0; i < rawTiles.length; i++) {
    var item = rawTiles[i];
    if (!item || typeof item !== "object") continue;
    tiles.push(item);
  }
  return tiles;
};

GameManager.prototype.computeUndoRestorePayload = function (prev) {
  var computeUndoRestorePayloadCore = this.callCoreUndoRestorePayloadRuntime("computeUndoRestorePayload", [{
      prev: prev || {},
      fallbackScore: this.score
    }]
  );
  if (computeUndoRestorePayloadCore.available) return computeUndoRestorePayloadCore.value || {};

  var source = prev && typeof prev === "object" ? prev : {};
  var score = this.resolveUndoRestorePayloadFallbackScore(source);
  var tiles = this.filterUndoRestorePayloadTiles(source);
  return {
    score: score,
    tiles: tiles
  };
};

GameManager.prototype.createDefaultMergeEffectsResult = function () {
  return {
    shouldRecordCappedMilestone: false,
    shouldSetWon: false,
    shouldSetReached32k: false,
    timerIdsToStamp: [],
    showSubTimerContainer: false,
    hideTimerRows: []
  };
};

GameManager.prototype.applyMergeEffectsWinAndCappedFlags = function (result, value, cappedMode, hasCappedTarget, cappedTarget) {
  if (cappedMode && hasCappedTarget && value === cappedTarget) {
    result.shouldRecordCappedMilestone = true;
    return;
  }
  if (!cappedMode && value === 2048) {
    result.shouldSetWon = true;
  }
};

GameManager.prototype.applyMergeEffectsTimerStampFlags = function (result, value, reached32k) {
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
};

GameManager.prototype.computeMergeEffects = function (mergedValue) {
  var cappedState = this.resolveCappedModeState();
  var isCappedMode = !!cappedState.isCappedMode;
  var cappedTargetValue = cappedState.cappedTargetValue;
  var computeMergeEffectsCore = this.callCoreMergeEffectsRuntime("computeMergeEffects", [{
      mergedValue: mergedValue,
      isCappedMode: isCappedMode,
      cappedTargetValue: cappedTargetValue,
      reached32k: !!this.reached32k
    }]);
  if (computeMergeEffectsCore.available) return computeMergeEffectsCore.value || {};

  var value = Number(mergedValue);
  var cappedMode = isCappedMode;
  var cappedTarget = Number(cappedTargetValue);
  var hasCappedTarget = Number.isFinite(cappedTarget) && cappedTarget > 0;
  var reached32k = !!this.reached32k;
  var result = this.createDefaultMergeEffectsResult();

  if (!Number.isInteger(value) || value <= 0) return result;
  this.applyMergeEffectsWinAndCappedFlags(result, value, cappedMode, hasCappedTarget, cappedTarget);
  this.applyMergeEffectsTimerStampFlags(result, value, reached32k);
  return result;
};

GameManager.prototype.normalizeSpawnTable = function (spawnTable, ruleset) {
  var normalizeSpawnTableCore = this.callCoreRulesRuntime("normalizeSpawnTable", [spawnTable, ruleset]);
  if (normalizeSpawnTableCore.available) return normalizeSpawnTableCore.value;
  if (Array.isArray(spawnTable) && spawnTable.length > 0) {
    var out = [];
    for (var i = 0; i < spawnTable.length; i++) {
      var item = spawnTable[i];
      if (!item || !Number.isInteger(item.value) || item.value <= 0) continue;
      if (!Number.isFinite(item.weight) || item.weight <= 0) continue;
      out.push({ value: item.value, weight: Number(item.weight) });
    }
    if (out.length > 0) return out;
  }
  if (ruleset === "fibonacci") {
    return [{ value: 1, weight: 90 }, { value: 2, weight: 10 }];
  }
  return [{ value: 2, weight: 90 }, { value: 4, weight: 10 }];
};

GameManager.prototype.getTheoreticalMaxTile = function (width, height, ruleset) {
  var getTheoreticalMaxTileCore = this.callCoreRulesRuntime("getTheoreticalMaxTile", [width, height, ruleset]);
  if (getTheoreticalMaxTileCore.available) return getTheoreticalMaxTileCore.value;
  var w = Number(width);
  var h = Number(height);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null;
  var cells = Math.floor(w) * Math.floor(h);
  if (!Number.isInteger(cells) || cells <= 0) return null;

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
};

GameManager.prototype.normalizeModeConfigBaseFallback = function (modeKey, rawConfig) {
  var cfg = rawConfig ? this.clonePlain(rawConfig) : this.clonePlain(GameManager.DEFAULT_MODE_CONFIG);
  cfg.key = cfg.key || modeKey || GameManager.DEFAULT_MODE_KEY;
  cfg.board_width = Number.isInteger(cfg.board_width) && cfg.board_width > 0 ? cfg.board_width : 4;
  cfg.board_height = Number.isInteger(cfg.board_height) && cfg.board_height > 0 ? cfg.board_height : cfg.board_width;
  cfg.ruleset = cfg.ruleset === "fibonacci" ? "fibonacci" : "pow2";
  cfg.special_rules = this.normalizeSpecialRules(cfg.special_rules);
  cfg.undo_enabled = !!cfg.undo_enabled;
  return cfg;
};

GameManager.prototype.applyNormalizedModeMaxTileFallback = function (cfg) {
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
};

GameManager.prototype.applyNormalizedModeSpawnTableFallback = function (cfg) {
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
    return;
  }
  cfg.spawn_table = this.normalizeSpawnTable(cfg.spawn_table, cfg.ruleset);
};

GameManager.prototype.applyNormalizedModeMetadataFallback = function (cfg) {
  cfg.ranked_bucket = cfg.ranked_bucket || "none";
  cfg.mode_family = cfg.mode_family || (cfg.ruleset === "fibonacci" ? "fibonacci" : "pow2");
  cfg.rank_policy = cfg.rank_policy || (cfg.ranked_bucket !== "none" ? "ranked" : "unranked");
};

GameManager.prototype.normalizeModeConfig = function (modeKey, rawConfig) {
  var normalizeModeConfigCore = this.callCoreModeRuntime("normalizeModeConfig", [{
      modeKey: modeKey,
      rawConfig: rawConfig,
      defaultModeKey: GameManager.DEFAULT_MODE_KEY,
      defaultModeConfig: GameManager.DEFAULT_MODE_CONFIG,
      normalizeSpawnTable: this.normalizeSpawnTable.bind(this),
      getTheoreticalMaxTile: this.getTheoreticalMaxTile.bind(this),
      normalizeSpecialRules: this.normalizeSpecialRules.bind(this)
    }]);
  if (normalizeModeConfigCore.available) return normalizeModeConfigCore.value;

  var cfg = this.normalizeModeConfigBaseFallback(modeKey, rawConfig);
  this.applyNormalizedModeMaxTileFallback(cfg);
  this.applyNormalizedModeSpawnTableFallback(cfg);
  this.applyNormalizedModeMetadataFallback(cfg);
  return cfg;
};

GameManager.prototype.resolveModeConfigCatalogFallback = function (modeId) {
  var id = modeId || GameManager.DEFAULT_MODE_KEY;
  var byCatalog = this.getModeConfigFromCatalog(id);
  if (byCatalog) return this.normalizeModeConfig(id, byCatalog);
  var mapped = GameManager.LEGACY_ALIAS_TO_MODE_KEY[id] || id;
  if (mapped && mapped !== id) {
    var mappedCfg = this.getModeConfigFromCatalog(mapped);
    if (mappedCfg) return this.normalizeModeConfig(mapped, mappedCfg);
  }
  return this.normalizeModeConfig(GameManager.DEFAULT_MODE_KEY, GameManager.DEFAULT_MODE_CONFIG);
};

GameManager.prototype.resolveModeConfig = function (modeId) {
  var id = modeId || GameManager.DEFAULT_MODE_KEY;
  var resolveModeConfigFromCatalogCore = this.callCoreModeRuntime("resolveModeConfigFromCatalog", [{
      modeId: id,
      defaultModeKey: GameManager.DEFAULT_MODE_KEY,
      getModeConfig: this.getModeConfigFromCatalog.bind(this),
      legacyAliasToModeKey: GameManager.LEGACY_ALIAS_TO_MODE_KEY
    }]);
  if (resolveModeConfigFromCatalogCore.available) {
    var resolvedByCore = resolveModeConfigFromCatalogCore.value || {};
    var resolvedModeId = typeof resolvedByCore.resolvedModeId === "string" && resolvedByCore.resolvedModeId
      ? resolvedByCore.resolvedModeId
      : GameManager.DEFAULT_MODE_KEY;
    var rawConfig = resolvedByCore.modeConfig;
    if (rawConfig && typeof rawConfig === "object" && !Array.isArray(rawConfig)) {
      return this.normalizeModeConfig(resolvedModeId, rawConfig);
    }
    return this.normalizeModeConfig(GameManager.DEFAULT_MODE_KEY, GameManager.DEFAULT_MODE_CONFIG);
  }
  return this.resolveModeConfigCatalogFallback(id);
};

GameManager.prototype.applyModeCoreStateFromConfig = function (cfg) {
  this.modeConfig = cfg;
  this.mode = cfg.key;
  this.modeKey = cfg.key;
  this.width = cfg.board_width;
  this.height = cfg.board_height;
  this.size = this.width;
  this.ruleset = cfg.ruleset;
  this.maxTile = cfg.max_tile || Infinity;
  this.spawnTable = this.normalizeSpawnTable(cfg.spawn_table, cfg.ruleset);
  this.rankedBucket = cfg.ranked_bucket || "none";
  this.modeFamily = cfg.mode_family || (cfg.ruleset === "fibonacci" ? "fibonacci" : "pow2");
  this.specialRules = this.normalizeSpecialRules(cfg.special_rules);
  this.rankPolicy = cfg.rank_policy || (this.rankedBucket !== "none" ? "ranked" : "unranked");
  this.applySpecialRulesState();
};

GameManager.prototype.syncModeKeyToScoreManager = function (modeKey) {
  if (!this.scoreManager || typeof this.scoreManager.setModeKey !== "function") return;
  this.scoreManager.setModeKey(modeKey);
};

GameManager.prototype.applyModeDocumentAttributes = function (cfg) {
  if (typeof document === "undefined" || !document.body) return;
  document.body.setAttribute("data-mode-id", cfg.key);
  document.body.setAttribute("data-ruleset", cfg.ruleset);
  document.body.setAttribute("data-mode-family", this.modeFamily);
  document.body.setAttribute("data-rank-policy", this.rankPolicy);
};

GameManager.prototype.applyModeConfig = function (modeConfig) {
  var cfg = this.normalizeModeConfig(modeConfig && modeConfig.key, modeConfig);
  this.applyModeCoreStateFromConfig(cfg);
  this.syncModeKeyToScoreManager(cfg.key);
  this.applyModeDocumentAttributes(cfg);
};

GameManager.prototype.normalizeSpecialRules = function (rules) {
  var normalizeSpecialRulesCore = this.callCoreModeRuntime("normalizeSpecialRules", [rules]);
  if (normalizeSpecialRulesCore.available) return normalizeSpecialRulesCore.value;
  if (!rules || typeof rules !== "object" || Array.isArray(rules)) return {};
  return this.clonePlain(rules);
};

GameManager.prototype.applyComputedSpecialRulesState = function (computed) {
  var state = computed && typeof computed === "object" ? computed : {};
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
};

GameManager.prototype.parseSpecialRulesBlockedCellPoint = function (item) {
  var x = null;
  var y = null;
  if (Array.isArray(item) && item.length >= 2) {
    x = Number(item[0]);
    y = Number(item[1]);
  } else if (item && typeof item === "object") {
    x = Number(item.x);
    y = Number(item.y);
  }
  if (!Number.isInteger(x) || !Number.isInteger(y)) return null;
  if (x < 0 || x >= this.width || y < 0 || y >= this.height) return null;
  return { x: x, y: y };
};

GameManager.prototype.applySpecialRulesBlockedCellsFallback = function (blockedRaw) {
  this.blockedCellSet = {};
  this.blockedCellsList = [];
  for (var i = 0; i < blockedRaw.length; i++) {
    var point = this.parseSpecialRulesBlockedCellPoint(blockedRaw[i]);
    if (!point) continue;
    this.blockedCellSet[point.x + ":" + point.y] = true;
    this.blockedCellsList.push(point);
  }
};

GameManager.prototype.applySpecialRulesNumericFallback = function (rules) {
  this.undoLimit = Number.isInteger(rules.undo_limit) && rules.undo_limit >= 0 ? rules.undo_limit : null;
  this.comboMultiplier = Number.isFinite(rules.combo_multiplier) && rules.combo_multiplier > 1
    ? Number(rules.combo_multiplier)
    : 1;
};

GameManager.prototype.applySpecialRulesDirectionLockFallback = function (rules) {
  this.directionLockRules = rules.direction_lock && typeof rules.direction_lock === "object"
    ? this.clonePlain(rules.direction_lock)
    : null;
};

GameManager.prototype.applySpecialRulesState = function () {
  var computeSpecialRulesStateCore = this.callCoreSpecialRulesRuntime("computeSpecialRulesState", [
      this.specialRules || {},
      this.width,
      this.height,
      this.clonePlain.bind(this)
    ]);
  if (computeSpecialRulesStateCore.available) {
    this.applyComputedSpecialRulesState(computeSpecialRulesStateCore.value || {});
    return;
  }

  var rules = this.specialRules || {};
  var blockedRaw = Array.isArray(rules.blocked_cells) ? rules.blocked_cells : [];
  this.applySpecialRulesBlockedCellsFallback(blockedRaw);
  this.applySpecialRulesNumericFallback(rules);
  this.applySpecialRulesDirectionLockFallback(rules);
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

GameManager.prototype.collectAvailableCellsFallback = function (width, height, isBlockedCell, cellAvailable) {
  var out = [];
  for (var x = 0; x < width; x++) {
    for (var y = 0; y < height; y++) {
      if (isBlockedCell(x, y)) continue;
      if (cellAvailable({ x: x, y: y })) out.push({ x: x, y: y });
    }
  }
  return out;
};

GameManager.prototype.getAvailableCells = function () {
  var gridCellAvailable = this.getGridCellAvailableFn();
  var getAvailableCellsCore = this.callCoreGridScanRuntime("getAvailableCells", [
      this.width,
      this.height,
      this.isBlockedCell.bind(this),
      gridCellAvailable
    ]);
  if (getAvailableCellsCore.available) return getAvailableCellsCore.value;
  return this.collectAvailableCellsFallback(
    this.width,
    this.height,
    this.isBlockedCell.bind(this),
    gridCellAvailable
  );
};

GameManager.prototype.applyComputedLockedDirectionState = function (computed) {
  var state = computed && typeof computed === "object" ? computed : {};
  if (Number.isInteger(state.lockedDirection)) {
    this.lockedDirection = state.lockedDirection;
  }
  if (Number.isInteger(state.lockedDirectionTurn)) {
    this.lockedDirectionTurn = state.lockedDirectionTurn;
  }
  return Number.isInteger(state.activeDirection) ? state.activeDirection : null;
};

GameManager.prototype.resolveDirectionLockEveryK = function (rules) {
  if (!rules) return null;
  var everyK = Number(rules.every_k_moves);
  return Number.isInteger(everyK) && everyK > 0 ? everyK : null;
};

GameManager.prototype.isDirectionLockTriggeredAtCurrentMove = function (everyK) {
  if (!Number.isInteger(everyK) || everyK <= 0) return false;
  if (this.successfulMoveCount <= 0 || this.successfulMoveCount % everyK !== 0) return false;
  if (this.lockConsumedAtMoveCount === this.successfulMoveCount) return false;
  return true;
};

GameManager.prototype.ensureLockedDirectionForCurrentMove = function (everyK) {
  if (this.lockedDirectionTurn === this.successfulMoveCount) return;
  var phase = Math.floor(this.successfulMoveCount / everyK);
  var rng = new Math.seedrandom(String(this.initialSeed) + ":lock:" + phase);
  this.lockedDirection = Math.floor(rng() * 4);
  this.lockedDirectionTurn = this.successfulMoveCount;
};

GameManager.prototype.getLockedDirection = function () {
  var getLockedDirectionStateCore = this.callCoreDirectionLockRuntime("getLockedDirectionState", [{
      directionLockRules: this.directionLockRules,
      successfulMoveCount: this.successfulMoveCount,
      lockConsumedAtMoveCount: this.lockConsumedAtMoveCount,
      lockedDirectionTurn: this.lockedDirectionTurn,
      lockedDirection: this.lockedDirection,
      initialSeed: this.initialSeed
    }, function (seed) {
      var rng = new Math.seedrandom(seed);
      return rng();
    }]);
  if (getLockedDirectionStateCore.available) {
    return this.applyComputedLockedDirectionState(getLockedDirectionStateCore.value || {});
  }

  var rules = this.directionLockRules;
  var everyK = this.resolveDirectionLockEveryK(rules);
  if (!this.isDirectionLockTriggeredAtCurrentMove(everyK)) return null;
  this.ensureLockedDirectionForCurrentMove(everyK);
  return this.lockedDirection;
};

GameManager.prototype.consumeDirectionLock = function () {
  this.lockConsumedAtMoveCount = this.successfulMoveCount;
};

GameManager.prototype.resolveLegacyModeFromModeKeyFallback = function (key) {
  if (GameManager.LEGACY_MODE_BY_KEY[key]) return GameManager.LEGACY_MODE_BY_KEY[key];
  if (key && key.indexOf("capped") !== -1) return "capped";
  if (key && key.indexOf("practice") !== -1) return "practice";
  return "classic";
};

GameManager.prototype.getLegacyModeFromModeKey = function (modeKey) {
  var resolveLegacyModeFromModeKeyCore = this.callCoreModeRuntime("resolveLegacyModeFromModeKey", [{
      modeKey: modeKey,
      fallbackModeKey: this.modeKey,
      mode: this.mode,
      legacyModeByKey: GameManager.LEGACY_MODE_BY_KEY
    }]);
  if (resolveLegacyModeFromModeKeyCore.available) return resolveLegacyModeFromModeKeyCore.value;

  var key = modeKey || this.modeKey || this.mode;
  return this.resolveLegacyModeFromModeKeyFallback(key);
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
  var pickSpawnValueCore = this.callCoreRulesRuntime("pickSpawnValue", [this.spawnTable || [], Math.random]);
  if (pickSpawnValueCore.available) return pickSpawnValueCore.value;
  var table = this.spawnTable || [];
  if (!table.length) return 2;
  var totalWeight = this.getSpawnTableTotalWeight(table);
  if (totalWeight <= 0) return table[0].value;
  return this.pickSpawnValueFromWeightedTable(table, totalWeight, Math.random);
};

GameManager.prototype.isFibonacciMode = function () {
  return this.ruleset === "fibonacci";
};

GameManager.prototype.nextFibonacci = function (value) {
  var nextFibonacciCore = this.callCoreRulesRuntime("nextFibonacci", [value]);
  if (nextFibonacciCore.available) return nextFibonacciCore.value;
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
};

GameManager.prototype.getMergedPow2ValueFallback = function (a, b) {
  if (a !== b) return null;
  var merged = a * 2;
  if (merged > this.maxTile) return null;
  return merged;
};

GameManager.prototype.getMergedFibonacciValueFallback = function (a, b) {
  if (a === 1 && b === 1) {
    if (2 > this.maxTile) return null;
    return 2;
  }
  var low = Math.min(a, b);
  var high = Math.max(a, b);
  var next = this.nextFibonacci(low);
  if (next !== high) return null;
  var merged = low + high;
  if (merged > this.maxTile) return null;
  return merged;
};

GameManager.prototype.getMergedValue = function (a, b) {
  var getMergedValueCore = this.callCoreRulesRuntime("getMergedValue", [
    a,
    b,
    this.isFibonacciMode() ? "fibonacci" : "pow2",
    this.maxTile
  ]);
  if (getMergedValueCore.available) return getMergedValueCore.value;
  if (!Number.isInteger(a) || !Number.isInteger(b) || a <= 0 || b <= 0) return null;
  if (!this.isFibonacciMode()) return this.getMergedPow2ValueFallback(a, b);
  return this.getMergedFibonacciValueFallback(a, b);
};

GameManager.prototype.getTimerMilestoneValues = function () {
  var getTimerMilestoneValuesCore = this.callCoreRulesRuntime("getTimerMilestoneValues", [
      this.isFibonacciMode() ? "fibonacci" : "pow2",
      GameManager.TIMER_SLOT_IDS
    ]);
  if (getTimerMilestoneValuesCore.available) return getTimerMilestoneValuesCore.value;
  if (this.isFibonacciMode()) {
    // 13 slots mapped to Fibonacci milestones.
    return [13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584, 4181];
  }
  return GameManager.TIMER_SLOT_IDS.slice();
};

GameManager.prototype.buildTimerMilestoneSlotMapFallback = function (milestones, slotIds) {
  var map = {};
  for (var i = 0; i < slotIds.length; i++) {
    var slotId = String(slotIds[i]);
    var milestone = milestones[i];
    if (Number.isInteger(milestone) && milestone > 0) {
      map[String(milestone)] = slotId;
    }
  }
  return map;
};

GameManager.prototype.configureTimerMilestones = function () {
  this.timerMilestones = this.getTimerMilestoneValues();
  var getTimerMilestoneSlotByValueCore = this.callCoreRulesRuntime("getTimerMilestoneSlotByValue", [
      this.timerMilestones,
      GameManager.TIMER_SLOT_IDS
    ]);
  if (getTimerMilestoneSlotByValueCore.available) {
    this.timerMilestoneSlotByValue = getTimerMilestoneSlotByValueCore.value;
  } else {
    this.timerMilestoneSlotByValue = this.buildTimerMilestoneSlotMapFallback(
      this.timerMilestones,
      GameManager.TIMER_SLOT_IDS
    );
  }
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

GameManager.prototype.resolveCappedModeStateFallback = function () {
  var key = String(this.modeKey || this.mode || "");
  var maxTile = Number(this.maxTile);
  var isCappedModeFallback = key.indexOf("capped") !== -1 && Number.isFinite(maxTile) && maxTile > 0;
  return {
    isCappedMode: isCappedModeFallback,
    cappedTargetValue: isCappedModeFallback ? Number(maxTile) : null,
    // Disable progressive hidden timer rows for 64-capped mode.
    isProgressiveCapped64Mode: false
  };
};

GameManager.prototype.resolveCappedModeState = function () {
  var cachedState = this.readCachedCappedModeState();
  if (cachedState) return cachedState;

  var resolveCappedModeStateCore = this.callCoreModeRuntime("resolveCappedModeState", [
    this.resolveCappedModeStateCorePayload()
  ]);
  if (resolveCappedModeStateCore.available) {
    var normalizedCoreState = this.cloneResolvedCappedModeState(resolveCappedModeStateCore.value || {});
    this.writeCachedCappedModeState(normalizedCoreState);
    return this.cloneResolvedCappedModeState(normalizedCoreState);
  }

  var fallbackState = this.resolveCappedModeStateFallback();
  this.writeCachedCappedModeState(fallbackState);
  return this.cloneResolvedCappedModeState(fallbackState);
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
  if (createProgressiveCapped64UnlockedStateCore.available) {
    var coreValue = createProgressiveCapped64UnlockedStateCore.value;
    if (coreValue && typeof coreValue === "object") return coreValue;
  }

  var base = { "16": false, "32": false, "64": false };
  if (!unlockedState || typeof unlockedState !== "object") return base;
  if (unlockedState["16"] === true) base["16"] = true;
  if (unlockedState["32"] === true) base["32"] = true;
  if (unlockedState["64"] === true) base["64"] = true;
  return base;
};

GameManager.prototype.resetProgressiveCapped64Rows = function () {
  this.capped64Unlocked = this.resolveProgressiveCapped64UnlockedState(this.capped64Unlocked);
  var values = [16, 32, 64];
  for (var i = 0; i < values.length; i++) {
    this.setCapped64RowVisible(values[i], false);
  }
};

GameManager.prototype.unlockProgressiveCapped64Row = function (value) {
  var unlockedState = this.resolveProgressiveCapped64UnlockedState(this.capped64Unlocked);
  var cappedState = this.resolveCappedModeState();
  var isProgressiveCapped64Mode = !!cappedState.isProgressiveCapped64Mode;
  var resolveProgressiveCapped64UnlockCore = this.callCoreModeRuntime(
    "resolveProgressiveCapped64Unlock",
    [{
      isProgressiveCapped64Mode: isProgressiveCapped64Mode,
      value: value,
      unlockedState: unlockedState
    }]
  );
  if (resolveProgressiveCapped64UnlockCore.available) {
    var resolved = resolveProgressiveCapped64UnlockCore.value || {};
    if (resolved.nextUnlockedState && typeof resolved.nextUnlockedState === "object") {
      this.capped64Unlocked = resolved.nextUnlockedState;
    } else {
      this.capped64Unlocked = unlockedState;
    }
    var unlockedValue = Number(resolved.unlockedValue);
    if (unlockedValue === 16 || unlockedValue === 32 || unlockedValue === 64) {
      this.setCapped64RowVisible(unlockedValue, true);
    }
    return;
  }

  if (!isProgressiveCapped64Mode) return;
  if (value !== 16 && value !== 32 && value !== 64) return;
  if (unlockedState[String(value)]) return;
  unlockedState[String(value)] = true;
  this.capped64Unlocked = unlockedState;
  this.setCapped64RowVisible(value, true);
};

GameManager.prototype.repositionCappedTimerContainer = function () {
  var container = document.getElementById("capped-timer-container");
  if (!container) return;
  var cappedState = this.resolveCappedModeState();
  var target = cappedState.cappedTargetValue;
  if (!target) target = 2048;
  var anchorRow = this.getTimerRowEl(target);
  if (!anchorRow || !anchorRow.parentNode) return;
  var parent = anchorRow.parentNode;
  if (container.parentNode !== parent || anchorRow.nextSibling !== container) {
    parent.insertBefore(container, anchorRow.nextSibling);
  }
};

GameManager.prototype.applyCappedRowVisibility = function () {
  var cappedState = this.resolveCappedModeState();
  var isCappedMode = cappedState.isCappedMode;
  var isProgressiveCapped64Mode = cappedState.isProgressiveCapped64Mode;
  var resolveCappedRowVisibilityPlanCore = this.callCoreModeRuntime("resolveCappedRowVisibilityPlan", [{
      isCappedMode: isCappedMode,
      isProgressiveCapped64Mode: isProgressiveCapped64Mode,
      cappedTargetValue: cappedState.cappedTargetValue,
      timerSlotIds: GameManager.TIMER_SLOT_IDS
    }]);
  if (resolveCappedRowVisibilityPlanCore.available) {
    var plan = resolveCappedRowVisibilityPlanCore.value;
    if (Array.isArray(plan) && plan.length > 0) {
      for (var p = 0; p < plan.length; p++) {
        var item = plan[p];
        if (!item || !Number.isInteger(item.value) || item.value <= 0) continue;
        this.setTimerRowVisibleState(item.value, !!item.visible, !!item.keepSpace);
      }
      if (isCappedMode && isProgressiveCapped64Mode) {
        this.resetProgressiveCapped64Rows();
      }
      return;
    }
  }

  var i;
  if (!isCappedMode) {
    for (i = 0; i < GameManager.TIMER_SLOT_IDS.length; i++) {
      this.setTimerRowVisibleState(GameManager.TIMER_SLOT_IDS[i], true, false);
    }
    return;
  }
  if (isProgressiveCapped64Mode) {
    for (i = 0; i < GameManager.TIMER_SLOT_IDS.length; i++) {
      this.setTimerRowVisibleState(GameManager.TIMER_SLOT_IDS[i], false, true);
    }
    this.resetProgressiveCapped64Rows();
    return;
  }
  var cap = cappedState.cappedTargetValue;
  for (i = 0; i < GameManager.TIMER_SLOT_IDS.length; i++) {
    var value = GameManager.TIMER_SLOT_IDS[i];
    this.setTimerRowVisibleState(value, value <= cap, true);
  }
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

GameManager.prototype.resolveCappedTargetValueWithDefault = function (cappedTargetValue, fallbackValue) {
  var resolvedValue = this.resolveCappedTargetValueOrNull(cappedTargetValue);
  if (resolvedValue !== null) return resolvedValue;
  var normalizedFallbackValue = Number(fallbackValue);
  return Number.isFinite(normalizedFallbackValue) && normalizedFallbackValue > 0
    ? normalizedFallbackValue
    : 2048;
};

GameManager.prototype.getCappedTimerLegendClass = function (cappedTargetValue) {
  var targetValue = this.resolveCappedTargetValueOrNull(cappedTargetValue);
  var resolveCappedTimerLegendClassCore = this.callCoreModeRuntime("resolveCappedTimerLegendClass", [{
      timerMilestoneSlotByValue: this.timerMilestoneSlotByValue,
      cappedTargetValue: targetValue
    }]);
  if (resolveCappedTimerLegendClassCore.available) {
    var legendClass = resolveCappedTimerLegendClassCore.value;
    if (typeof legendClass === "string" && legendClass) return legendClass;
  }

  var slotId = this.timerMilestoneSlotByValue
    ? this.timerMilestoneSlotByValue[String(targetValue)]
    : null;
  return slotId ? ("timertile timer-legend-" + slotId) : "timertile";
};

GameManager.prototype.getCappedTimerFontSize = function (cappedTargetValue) {
  var targetValue = this.resolveCappedTargetValueWithDefault(cappedTargetValue, 2048);
  var resolveCappedTimerLegendFontSizeCore = this.callCoreModeRuntime("resolveCappedTimerLegendFontSize", [
    targetValue
  ]);
  if (resolveCappedTimerLegendFontSizeCore.available) {
    var resolvedFontSize = resolveCappedTimerLegendFontSizeCore.value;
    if (typeof resolvedFontSize === "string" && resolvedFontSize) return resolvedFontSize;
  }
  var cap = targetValue;
  if (cap >= 8192) return "13px";
  if (cap >= 1024) return "14px";
  if (cap >= 128) return "18px";
  return "22px";
};

GameManager.prototype.getCappedRepeatLabel = function (repeatCount) {
  var formatCappedRepeatLabelCore = this.callCoreModeRuntime("formatCappedRepeatLabel", [repeatCount]);
  if (formatCappedRepeatLabelCore.available) {
    var label = formatCappedRepeatLabelCore.value;
    if (typeof label === "string") return label;
  }
  return "x" + String(repeatCount);
};

GameManager.prototype.getCappedPlaceholderRowValues = function (cappedState) {
  var resolvedCappedState =
    this.resolveProvidedCappedModeState(cappedState);
  var resolveCappedPlaceholderRowValuesCore = this.callCoreModeRuntime("resolveCappedPlaceholderRowValues", [{
      isCappedMode: resolvedCappedState.isCappedMode,
      cappedTargetValue: resolvedCappedState.cappedTargetValue,
      timerSlotIds: GameManager.TIMER_SLOT_IDS
    }]);
  if (resolveCappedPlaceholderRowValuesCore.available) {
    var coreValues = resolveCappedPlaceholderRowValuesCore.value;
    if (Array.isArray(coreValues)) {
      var normalized = [];
      for (var c = 0; c < coreValues.length; c++) {
        var coreValue = Number(coreValues[c]);
        if (!Number.isInteger(coreValue) || coreValue <= 0) continue;
        normalized.push(coreValue);
      }
      return normalized;
    }
  }

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
  var slotValue = null;
  if (resolveCappedPlaceholderSlotByRepeatCountCore.available) {
    slotValue = resolveCappedPlaceholderSlotByRepeatCountCore.value;
  }
  if (!Number.isInteger(slotValue) || slotValue <= 0) {
    var placeholderIndex = repeatCount - 2; // x2 => first placeholder row
    if (placeholderIndex < 0 || placeholderIndex >= values.length) return false;
    slotValue = Number(values[placeholderIndex]);
    if (!Number.isInteger(slotValue) || slotValue <= 0) return false;
  }

  var slotId = String(slotValue);
  var row = this.getTimerRowEl(slotId);
  var timerEl = document.getElementById("timer" + slotId);
  if (!row || !timerEl) return false;

  var legend = row.querySelector(".timertile");
  if (legend) {
    legend.className = this.getCappedTimerLegendClass(resolvedCappedState.cappedTargetValue);
    legend.style.color = "#f9f6f2";
    legend.style.fontSize = this.getCappedTimerFontSize(resolvedCappedState.cappedTargetValue);
    legend.textContent = labelText;
  }

  timerEl.textContent = timeStr;
  row.setAttribute("data-capped-repeat", String(repeatCount));
  this.setTimerRowVisibleState(slotId, true, true);
  this.normalizeCappedRepeatLegendClasses(resolvedCappedState);
  return true;
};

GameManager.prototype.getCappedOverflowContainer = function (cappedState) {
  var resolvedCappedState =
    this.resolveProvidedCappedModeState(cappedState);
  if (!resolvedCappedState.isCappedMode) return null;
  var id = "capped-timer-overflow-container";
  var container = document.getElementById(id);
  if (!container) {
    container = document.createElement("div");
    container.id = id;
  }

  var values = this.getCappedPlaceholderRowValues(resolvedCappedState);
  if (!values.length) return container;
  var anchor = this.getTimerRowEl(values[values.length - 1]);
  if (!anchor || !anchor.parentNode) return container;

  if (container.parentNode !== anchor.parentNode || anchor.nextSibling !== container) {
    anchor.parentNode.insertBefore(container, anchor.nextSibling);
  }
  return container;
};

GameManager.prototype.recordCappedMilestone = function (timeStr) {
  var cappedState = this.resolveCappedModeState();
  if (!cappedState.isCappedMode) return;

  this.cappedMilestoneCount += 1;
  var capLabel = String(cappedState.cappedTargetValue || 2048);
  var baseTimerEl = document.getElementById("timer" + capLabel);
  var container = this.getCappedOverflowContainer(cappedState);

  if (this.cappedMilestoneCount === 1) {
    if (baseTimerEl && baseTimerEl.textContent === "") {
      baseTimerEl.textContent = timeStr;
    }
    return;
  }

  var nextLabel = this.getCappedRepeatLabel(this.cappedMilestoneCount);

  // Prefer replacing reserved hidden rows so the timer module height stays stable.
  if (this.fillCappedPlaceholderRowByRepeat(this.cappedMilestoneCount, nextLabel, timeStr, cappedState)) {
    this.callWindowMethod("cappedTimerAutoScroll");
    return;
  }

  if (!container) return;
  var rowDiv = this.createSavedDynamicTimerRow({
    repeat: String(this.cappedMilestoneCount),
    label: nextLabel,
    time: timeStr
  }, cappedState);
  container.appendChild(rowDiv);
  this.normalizeCappedRepeatLegendClasses(cappedState);

  this.callWindowMethod("cappedTimerAutoScroll");
};

GameManager.prototype.initCornerStats = function () {
  var rateEl = document.getElementById("stats-4-rate");
  var ipsEl = document.getElementById("stats-ips");

  if (rateEl) {
    rateEl.style.visibility = "hidden"; // Preserve layout while moving display to page corner
    this.cornerRateEl = document.getElementById("corner-stats-4-rate");
    if (!this.cornerRateEl) {
      this.cornerRateEl = document.createElement("div");
      this.cornerRateEl.id = "corner-stats-4-rate";
      document.body.appendChild(this.cornerRateEl);
    }
    this.cornerRateEl.style.position = "fixed";
    this.cornerRateEl.style.top = "8px";
    this.cornerRateEl.style.left = "10px";
    this.cornerRateEl.style.zIndex = "1000";
    this.cornerRateEl.style.background = "transparent";
    this.cornerRateEl.style.color = "#776e65";
    this.cornerRateEl.style.fontWeight = "bold";
    this.cornerRateEl.style.fontSize = "27px";
    this.cornerRateEl.style.pointerEvents = "none";
    this.cornerRateEl.textContent = "0.00";
  }

  if (ipsEl) {
    ipsEl.style.visibility = "hidden"; // Preserve layout while moving display to page corner
    this.cornerIpsEl = document.getElementById("corner-stats-ips");
    if (!this.cornerIpsEl) {
      this.cornerIpsEl = document.createElement("div");
      this.cornerIpsEl.id = "corner-stats-ips";
      document.body.appendChild(this.cornerIpsEl);
    }
    this.cornerIpsEl.style.position = "fixed";
    this.cornerIpsEl.style.top = "8px";
    this.cornerIpsEl.style.right = "10px";
    this.cornerIpsEl.style.zIndex = "1000";
    this.cornerIpsEl.style.background = "transparent";
    this.cornerIpsEl.style.color = "#776e65";
    this.cornerIpsEl.style.fontWeight = "bold";
    this.cornerIpsEl.style.fontSize = "27px";
    this.cornerIpsEl.style.pointerEvents = "none";
    this.cornerIpsEl.textContent = "IPS: 0";
  }
};

GameManager.prototype.initStatsPanelUi = function () {
  if (typeof document === "undefined" || !document.body) return;
  var btn = this.ensureStatsPanelToggleButton();
  var topActionHost = this.resolveStatsPanelTopActionHost();
  this.mountStatsPanelToggleButton(btn, topActionHost);
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

GameManager.prototype.resolveStatsPanelTopActionHost = function () {
  var exportBtn = document.getElementById("top-export-replay-btn");
  var practiceStatsActions = document.getElementById("practice-stats-actions");
  if (practiceStatsActions) return practiceStatsActions;
  if (exportBtn && exportBtn.parentNode) return exportBtn.parentNode;
  return document.querySelector(".heading .top-action-buttons") || document.querySelector(".top-action-buttons");
};

GameManager.prototype.mountStatsPanelToggleButton = function (btn, topActionHost) {
  var exportBtn = document.getElementById("top-export-replay-btn");
  if (topActionHost) {
    btn.classList.remove("is-floating");
    if (exportBtn && exportBtn.parentNode === topActionHost) {
      if (btn.parentNode !== topActionHost || btn.nextSibling !== exportBtn) {
        topActionHost.insertBefore(btn, exportBtn);
      }
      return;
    }
    if (btn.parentNode !== topActionHost) {
      topActionHost.insertBefore(btn, topActionHost.firstChild);
    }
    return;
  }
  if (btn.parentNode !== document.body) {
    document.body.appendChild(btn);
  }
  btn.classList.add("is-floating");
};

GameManager.prototype.ensureStatsPanelOverlayElement = function () {
  var overlay = document.getElementById("stats-panel-overlay");
  if (overlay) return overlay;
  overlay = document.createElement("div");
  overlay.id = "stats-panel-overlay";
  overlay.className = "replay-modal-overlay";
  overlay.style.display = "none";
  overlay.innerHTML =
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
    "</div>";
  document.body.appendChild(overlay);
  return overlay;
};

GameManager.prototype.bindStatsPanelUiEvents = function (btn, overlay) {
  var self = this;
  if (!btn.__statsBound) {
    btn.__statsBound = true;
    btn.addEventListener("click", function (event) {
      event.preventDefault();
      self.openStatsPanel();
    });
  }
  var closeBtn = document.getElementById("stats-panel-close");
  if (closeBtn && !closeBtn.__statsBound) {
    closeBtn.__statsBound = true;
    closeBtn.addEventListener("click", function () {
      self.closeStatsPanel();
    });
  }
  if (!overlay.__statsBound) {
    overlay.__statsBound = true;
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) self.closeStatsPanel();
    });
  }
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
  var isTimerLeaderboardAvailableByModeCore = this.callCoreModeRuntime("isTimerLeaderboardAvailableByMode", [mode]);
  if (isTimerLeaderboardAvailableByModeCore.available) return !!isTimerLeaderboardAvailableByModeCore.value;
  void mode;
  return true;
};

GameManager.prototype.isTimerLeaderboardAvailable = function () {
  return true;
};

GameManager.prototype.getTimerModuleViewMode = function () {
  var normalizeTimerModuleViewModeCore = this.callCoreStorageRuntime("normalizeTimerModuleViewMode", [this.timerModuleView]);
  if (normalizeTimerModuleViewModeCore.available) return normalizeTimerModuleViewModeCore.value;
  return this.timerModuleView === "hidden" ? "hidden" : "timer";
};

GameManager.prototype.loadTimerModuleViewForMode = function (mode) {
  var map = this.readLocalStorageJsonMap(GameManager.TIMER_MODULE_VIEW_SETTINGS_KEY);
  var readTimerModuleViewForModeFromMapCore = this.callCoreStorageRuntime("readTimerModuleViewForModeFromMap", [{
      map: map,
      mode: mode
    }]);
  if (readTimerModuleViewForModeFromMapCore.available) return readTimerModuleViewForModeFromMapCore.value;
  var value = map[mode];
  return value === "hidden" ? "hidden" : "timer";
};

GameManager.prototype.persistTimerModuleViewForMode = function (mode, view) {
  var map = this.readLocalStorageJsonMap(GameManager.TIMER_MODULE_VIEW_SETTINGS_KEY);
  var writeTimerModuleViewForModeToMapCore = this.callCoreStorageRuntime("writeTimerModuleViewForModeToMap", [{
      map: map,
      mode: mode,
      view: view
    }]);
  if (writeTimerModuleViewForModeToMapCore.available) {
    map = writeTimerModuleViewForModeToMapCore.value;
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

GameManager.prototype.getServerMode = function (mode) {
  return this.getLegacyModeFromModeKey(mode || this.modeKey || this.mode);
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
  var readUndoEnabledForModeFromMapCore = this.callCoreStorageRuntime("readUndoEnabledForModeFromMap", [{
      map: map,
      mode: mode,
      fallbackEnabled: true
    }]);
  if (readUndoEnabledForModeFromMapCore.available) return !!readUndoEnabledForModeFromMapCore.value;
  if (this.hasOwnKey(map, mode)) return !!map[mode];
  return true;
};

GameManager.prototype.applyUndoSettingForMode = function (mode, skipPersist, forceChange) {
  var nextEnabled = this.loadUndoSettingForMode(mode);
  this.setUndoEnabled(nextEnabled, !!skipPersist, !!forceChange);
  return !!this.undoEnabled;
};

GameManager.prototype.resolveProvidedState = function (resolvedState, fallbackResolver) {
  if (resolvedState && typeof resolvedState === "object") return resolvedState;
  if (typeof fallbackResolver === "function") return fallbackResolver();
  return null;
};

GameManager.prototype.resolveProvidedUndoPolicyStateForMode = function (mode, resolvedState) {
  var self = this;
  return this.resolveProvidedState(resolvedState, function () {
    return self.resolveUndoPolicyStateForCurrentSessionMode(mode);
  });
};

GameManager.prototype.resolveProvidedActiveUndoPolicyState = function (resolvedState) {
  var self = this;
  return this.resolveProvidedState(resolvedState, function () {
    return self.resolveActiveUndoPolicyState();
  });
};

GameManager.prototype.persistUndoSettingForMode = function (mode, enabled, resolvedState) {
  var state = this.resolveProvidedUndoPolicyStateForMode(mode, resolvedState);
  if (state && state.isUndoSettingFixedForMode) return;
  if (!(state && state.isUndoAllowedByMode)) return;
  var map = this.readLocalStorageJsonMap(GameManager.UNDO_SETTINGS_KEY);
  var writeUndoEnabledForModeToMapCore = this.callCoreStorageRuntime("writeUndoEnabledForModeToMap", [{
      map: map,
      mode: mode,
      enabled: enabled
    }]);
  if (writeUndoEnabledForModeToMapCore.available) {
    map = writeUndoEnabledForModeToMapCore.value;
  } else {
    map[mode] = !!enabled;
  }
  this.writeLocalStorageJsonMap(GameManager.UNDO_SETTINGS_KEY, map);
};

GameManager.prototype.setUndoEnabled = function (enabled, skipPersist, forceChange) {
  var state = this.resolveActiveUndoPolicyState();
  var forced = state ? state.forcedUndoSetting : null;
  if (forced !== null) {
    this.undoEnabled = forced;
  } else if (forceChange || (state && state.canToggleUndoSetting)) {
    this.undoEnabled = !!enabled;
    if (!skipPersist) {
      this.persistUndoSettingForMode(this.mode, this.undoEnabled, state);
    }
  }
  this.updateUndoUiState(this.resolveActiveUndoPolicyState({
    undoEnabled: this.undoEnabled
  }));
  this.notifyUndoSettingsStateChanged();
};

GameManager.prototype.isUndoInteractionEnabled = function () {
  var state = this.resolveActiveUndoPolicyState();
  return !!(state && state.isUndoInteractionEnabled);
};

GameManager.prototype.updateUndoUiState = function (resolvedState) {
  var state = this.resolveProvidedActiveUndoPolicyState(resolvedState);
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
  if (undoBtn) {
    undoBtn.style.display = canUndo ? "inline-block" : "none";
  }
  var practiceUndoBtn = document.getElementById("practice-mobile-undo-btn");
  if (practiceUndoBtn) {
    practiceUndoBtn.style.pointerEvents = canUndo ? "" : "none";
    practiceUndoBtn.style.opacity = canUndo ? "" : "0.45";
    practiceUndoBtn.setAttribute("aria-disabled", canUndo ? "false" : "true");
  }
  this.callWindowMethod("syncMobileUndoTopButtonAvailability");
};

GameManager.prototype.recordSpawnValue = function (value) {
  var applySpawnValueCountCore = this.callCoreRulesRuntime("applySpawnValueCount", [this.spawnValueCounts, value]);
  if (applySpawnValueCountCore.available) {
    var next = applySpawnValueCountCore.value || {};
    if (next.nextSpawnValueCounts && typeof next.nextSpawnValueCounts === "object") {
      this.spawnValueCounts = next.nextSpawnValueCounts;
    } else if (!this.spawnValueCounts) {
      this.spawnValueCounts = {};
    }
    this.spawnTwos = Number(next.spawnTwos) || 0;
    this.spawnFours = Number(next.spawnFours) || 0;
    this.refreshSpawnRateDisplay();
    return;
  }

  if (!this.spawnValueCounts) this.spawnValueCounts = {};
  var k = String(value);
  this.spawnValueCounts[k] = (this.spawnValueCounts[k] || 0) + 1;

  // Keep legacy fields for compatibility with existing UI hooks.
  this.spawnTwos = this.spawnValueCounts["2"] || 0;
  this.spawnFours = this.spawnValueCounts["4"] || 0;
  this.refreshSpawnRateDisplay();
};

GameManager.prototype.getSpawnStatPair = function () {
  var getSpawnStatPairCore = this.callCoreRulesRuntime("getSpawnStatPair", [this.spawnTable || []]);
  if (getSpawnStatPairCore.available) {
    var corePair = getSpawnStatPairCore.value || {};
    var corePrimary = Number(corePair.primary);
    var coreSecondary = Number(corePair.secondary);
    if (
      Number.isInteger(corePrimary) &&
      corePrimary > 0 &&
      Number.isInteger(coreSecondary) &&
      coreSecondary > 0
    ) {
      return {
        primary: corePrimary,
        secondary: coreSecondary
      };
    }
  }

  var table = Array.isArray(this.spawnTable) ? this.spawnTable : [];
  var values = [];
  for (var i = 0; i < table.length; i++) {
    var item = table[i];
    if (!item || !Number.isInteger(Number(item.value)) || Number(item.value) <= 0) continue;
    var v = Number(item.value);
    if (values.indexOf(v) === -1) {
      values.push(v);
    }
  }
  values.sort(function (a, b) { return a - b; });
  var primary = values.length > 0 ? values[0] : 2;
  var secondary = values.length > 1 ? values[1] : primary;
  return {
    primary: primary,
    secondary: secondary
  };
};

GameManager.prototype.getSpawnCount = function (value) {
  var getSpawnCountCore = this.callCoreRulesRuntime("getSpawnCount", [this.spawnValueCounts, value]);
  if (getSpawnCountCore.available) return Number(getSpawnCountCore.value) || 0;
  if (!this.spawnValueCounts) return 0;
  return this.spawnValueCounts[String(value)] || 0;
};

GameManager.prototype.getTotalSpawnCount = function () {
  var getTotalSpawnCountCore = this.callCoreRulesRuntime("getTotalSpawnCount", [this.spawnValueCounts]);
  if (getTotalSpawnCountCore.available) return Number(getTotalSpawnCountCore.value) || 0;
  if (!this.spawnValueCounts) return 0;
  var total = 0;
  for (var k in this.spawnValueCounts) {
    if (this.hasOwnKey(this.spawnValueCounts, k)) {
      total += this.spawnValueCounts[k] || 0;
    }
  }
  return total;
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
  var getActualSecondaryRateTextCore = this.callCoreRulesRuntime("getActualSecondaryRateText", [
    this.spawnValueCounts,
    this.spawnTable || []
  ]);
  if (getActualSecondaryRateTextCore.available) {
    var rateText = getActualSecondaryRateTextCore.value;
    if (typeof rateText === "string" && rateText) return rateText;
  }

  var pair = this.getSpawnStatPair();
  var total = this.getTotalSpawnCount();
  if (total <= 0) return "0.00";
  return ((this.getSpawnCount(pair.secondary) / total) * 100).toFixed(2);
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

GameManager.prototype.updateStatsPanel = function (totalSteps, moveSteps, undoSteps) {
  var fallback = this.computeStepStats();
  if (typeof totalSteps === "undefined") totalSteps = fallback.totalSteps;
  if (typeof moveSteps === "undefined") moveSteps = fallback.moveSteps;
  if (typeof undoSteps === "undefined") undoSteps = fallback.undoSteps;
  this.updateStatsPanelLabels();

  var pair = this.getSpawnStatPair();

  var totalEl = document.getElementById("stats-panel-total");
  if (totalEl) totalEl.textContent = String(totalSteps);
  var movesEl = document.getElementById("stats-panel-moves");
  if (movesEl) movesEl.textContent = String(moveSteps);
  var undoEl = document.getElementById("stats-panel-undo");
  if (undoEl) undoEl.textContent = String(undoSteps);
  var twoEl = document.getElementById("stats-panel-two");
  if (twoEl) twoEl.textContent = String(this.getSpawnCount(pair.primary));
  var fourEl = document.getElementById("stats-panel-four");
  if (fourEl) fourEl.textContent = String(this.getSpawnCount(pair.secondary));
  var rateEl = document.getElementById("stats-panel-four-rate");
  if (rateEl) rateEl.textContent = this.getActualSecondaryRate();
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
  var computeReplayStepStatsCore = this.callCoreReplayExecutionRuntime("computeReplayStepStats", [{
    actions: actions,
    limit: limit
  }]);

  if (!computeReplayStepStatsCore.available) return null;
  return this.normalizeCoreStepStats(computeReplayStepStatsCore.value || {});
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

GameManager.prototype.buildStepStatsFallback = function (actions, limit) {
  var totalSteps = actions ? limit : 0;
  var moveSteps = this.calculateNetMoveSteps(actions, limit);
  var undoSteps = this.countUndoSteps(actions, limit);
  return {
    totalSteps: totalSteps,
    moveSteps: moveSteps,
    undoSteps: undoSteps
  };
};

GameManager.prototype.computeStepStats = function () {
  var stepStatsSource = this.resolveStepStatsSource();
  var limit = stepStatsSource.limit;
  var src = stepStatsSource.actions;
  var coreStats = this.tryResolveStepStatsFromCore(src, limit);
  if (coreStats) return coreStats;
  return this.buildStepStatsFallback(src, limit);
};

GameManager.prototype.getIpsInputCount = function () {
  var resolveIpsInputCountCore = this.callCoreReplayExecutionRuntime("resolveIpsInputCount", [{
      replayMode: this.replayMode,
      replayIndex: this.replayIndex,
      ipsInputCount: this.ipsInputCount
    }]);
  if (resolveIpsInputCountCore.available) return Number(resolveIpsInputCountCore.value) || 0;
  return this.getIpsInputCountFallback();
};

GameManager.prototype.getIpsInputCountFallback = function () {
  if (this.replayMode) return Number.isInteger(this.replayIndex) && this.replayIndex > 0 ? this.replayIndex : 0;
  return Number.isInteger(this.ipsInputCount) && this.ipsInputCount >= 0 ? this.ipsInputCount : 0;
};

GameManager.prototype.applyResolvedNextIpsInputCount = function (resolved) {
  if (!resolved || !resolved.shouldRecord) return false;
  var nextIps = Number(resolved.nextIpsInputCount);
  this.ipsInputCount = Number.isInteger(nextIps) && nextIps >= 0 ? nextIps : 0;
  return true;
};

GameManager.prototype.incrementIpsInputCountFallback = function () {
  if (this.replayMode) return;
  if (!Number.isInteger(this.ipsInputCount) || this.ipsInputCount < 0) this.ipsInputCount = 0;
  this.ipsInputCount += 1;
};

GameManager.prototype.recordIpsInput = function () {
  var resolveNextIpsInputCountCore = this.callCoreReplayExecutionRuntime("resolveNextIpsInputCount", [{
      replayMode: this.replayMode,
      replayIndex: this.replayIndex,
      ipsInputCount: this.ipsInputCount
    }]);
  if (resolveNextIpsInputCountCore.available) {
    if (!this.applyResolvedNextIpsInputCount(resolveNextIpsInputCountCore.value || {})) return;
    return;
  }
  this.incrementIpsInputCountFallback();
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
  var resolveIpsDisplayTextCore = this.callCoreReplayExecutionRuntime("resolveIpsDisplayText", [{
    durationMs: durationMs,
    ipsInputCount: ipsInputCount
  }]);
  if (!resolveIpsDisplayTextCore.available) return "";
  var coreDisplay = resolveIpsDisplayTextCore.value || {};
  return typeof coreDisplay.ipsText === "string" && coreDisplay.ipsText ? coreDisplay.ipsText : "";
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

GameManager.prototype.restartWithBoard = function (board, modeConfig, options) {
  options = options || {};
  this.actuator.continue();
  // Non-replay board restores must keep undo enabled; replay restores keep replay mode.
  var setupSeed = this.resolveRestartWithBoardSeed(options);
  this.setup(setupSeed, { skipStartTiles: true, modeConfig: modeConfig, disableStateRestore: true });
  this.setBoardFromMatrix(board);
  this.initialBoardMatrix = this.getFinalBoardMatrix();
  this.replayStartBoardMatrix = this.cloneBoardMatrix(this.initialBoardMatrix);
  if (this.shouldSetPracticeRestartBaseOnBoardRestart(options)) {
    this.setPracticeRestartBase(this.initialBoardMatrix, modeConfig || this.modeConfig);
  }
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
  var isGameTerminatedStateCore = this.callCoreModeRuntime("isGameTerminatedState", [{
    over: this.over,
    won: this.won,
    keepPlaying: this.keepPlaying
  }]);
  if (isGameTerminatedStateCore.available) {
    return !!isGameTerminatedStateCore.value;
  }
  return !!this.over || (!!this.won && !this.keepPlaying);
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

GameManager.prototype.resolveSetupGlobalModeConfig = function () {
  if (typeof window === "undefined" || !window.GAME_MODE_CONFIG || typeof window.GAME_MODE_CONFIG !== "object") {
    return null;
  }
  try {
    return this.clonePlain(window.GAME_MODE_CONFIG);
  } catch (_err) {
    return null;
  }
};

GameManager.prototype.resolveSetupModeConfig = function (detectedMode, options) {
  var setupOptions = options && typeof options === "object" ? options : {};
  return setupOptions.modeConfig || this.resolveSetupGlobalModeConfig() || this.resolveModeConfig(detectedMode);
};

GameManager.prototype.applySetupModeConfig = function (resolvedModeConfig) {
  this.applyModeConfig(resolvedModeConfig);
  if (typeof window !== "undefined") {
    window.GAME_MODE_CONFIG = this.clonePlain(this.modeConfig);
  }
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

GameManager.prototype.resolveSetupSessionReplayV3Metadata = function () {
  return {
    mode: this.getServerMode(this.modeKey),
    mode_key: this.modeKey,
    board_width: this.width,
    board_height: this.height,
    ruleset: this.ruleset,
    undo_enabled: !!this.modeConfig.undo_enabled,
    mode_family: this.modeFamily,
    rank_policy: this.rankPolicy,
    special_rules_snapshot: this.clonePlain(this.specialRules || {}),
    challenge_id: this.challengeId
  };
};

GameManager.prototype.initializeSetupReplayState = function (inputSeed) {
  var hasInputSeed = typeof inputSeed !== "undefined";
  if (hasInputSeed) {
    this.replayIndex = 0;
  }
  this.initialSeed = hasInputSeed ? inputSeed : Math.random();
  this.seed = this.initialSeed;
  this.resetSetupReplayCollections();
  this.replayMode = hasInputSeed; // If seed is provided externally, we might be in replay mode (or just restoring)
  this.applySetupSessionSyncDefaults(hasInputSeed);
  return hasInputSeed;
};

GameManager.prototype.createSetupSessionReplayV3Payload = function () {
  var metadata = this.resolveSetupSessionReplayV3Metadata();
  return {
    v: 3,
    mode: metadata.mode,
    mode_key: metadata.mode_key,
    board_width: metadata.board_width,
    board_height: metadata.board_height,
    ruleset: metadata.ruleset,
    undo_enabled: metadata.undo_enabled,
    mode_family: metadata.mode_family,
    rank_policy: metadata.rank_policy,
    special_rules_snapshot: metadata.special_rules_snapshot,
    challenge_id: metadata.challenge_id,
    seed: this.initialSeed,
    actions: []
  };
};

GameManager.prototype.assignSetupChallengeId = function (options) {
  this.challengeId = typeof options.challengeId === "string" && options.challengeId
    ? options.challengeId
    : null;
  if (!this.challengeId && typeof window !== "undefined" && window.GAME_CHALLENGE_CONTEXT && window.GAME_CHALLENGE_CONTEXT.id) {
    this.challengeId = window.GAME_CHALLENGE_CONTEXT.id;
    this.sessionReplayV3.challenge_id = this.challengeId;
  }
  if (this.challengeId) this.sessionReplayV3.challenge_id = this.challengeId;
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

GameManager.prototype.resetSetupTimerDisplays = function () {
  var timerEl = document.getElementById("timer");
  if (timerEl) timerEl.textContent = this.pretty(0);

  var timerSlots = GameManager.TIMER_SLOT_IDS;
  timerSlots.forEach(function (slotId) {
    var el = document.getElementById("timer" + slotId);
    if (el) el.textContent = "";
  });

  var sub8k = document.getElementById("timer8192-sub");
  if (sub8k) sub8k.textContent = "";
  var sub16k = document.getElementById("timer16384-sub");
  if (sub16k) sub16k.textContent = "";
  var subContainer = document.getElementById("timer32k-sub-container");
  if (subContainer) subContainer.style.display = "none";

  this.repositionCappedTimerContainer();
  this.applyCappedRowVisibility();
  this.resetCappedDynamicTimers();
};

GameManager.prototype.resolveSetupSkipStartTiles = function (options) {
  return !!(options && options.skipStartTiles);
};

GameManager.prototype.shouldRestoreStateOnSetup = function (hasInputSeed, skipStartTiles, options) {
  return !hasInputSeed && !skipStartTiles && !(options && options.disableStateRestore);
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

GameManager.prototype.finalizeSetupUiState = function (preferredTimerModuleView, restoredFromSavedState) {
  this.refreshSpawnRateDisplay();
  this.updateUndoUiState();
  this.notifyUndoSettingsStateChanged();
  this.applyTimerModuleView(preferredTimerModuleView, true);

  this.actuate();
  if (restoredFromSavedState) {
    this.updateStatsPanel();
  } else {
    this.updateStatsPanel(0, 0, 0);
  }
};

GameManager.prototype.initializeSetupModeAndGrid = function (options) {
  var detectedMode = this.detectMode();
  var resolvedModeConfig = this.resolveSetupModeConfig(detectedMode, options);
  this.applySetupModeConfig(resolvedModeConfig);
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
  this.sessionReplayV3 = this.createSetupSessionReplayV3Payload();
  this.assignSetupChallengeId(options);
  this.initializeSetupRuntimeState();
  return hasInputSeed;
};

GameManager.prototype.initializeSetupUiShell = function () {
  var preferredTimerModuleView = this.initializeSetupSpawnAndPreferences();
  this.hideLegacyStatsUi();
  this.resetSetupTimerDisplays();
  return preferredTimerModuleView;
};

GameManager.prototype.resolveSetupTileInitializationState = function (hasInputSeed, options) {
  var skipStartTiles = this.resolveSetupSkipStartTiles(options);
  var restoredFromSavedState = this.resolveSetupRestoredFromSavedState(hasInputSeed, skipStartTiles, options);
  return {
    skipStartTiles: skipStartTiles,
    restoredFromSavedState: restoredFromSavedState
  };
};

// Set up the game
GameManager.prototype.setup = function (inputSeed, options) {
  options = options || {};
  this.initializeSetupModeAndGrid(options);
  this.resetSetupOutcomeState();
  
  // Replay logic
  var hasInputSeed = this.initializeSetupReplayAndRuntime(inputSeed, options);
  var preferredTimerModuleView = this.initializeSetupUiShell();

  // Add the initial tiles unless a replay imports an explicit board.
  var tileInitState = this.resolveSetupTileInitializationState(hasInputSeed, options);
  this.applySetupStartTilesState(tileInitState.skipStartTiles, tileInitState.restoredFromSavedState);
  this.finalizeSetupUiState(preferredTimerModuleView, tileInitState.restoredFromSavedState);

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

GameManager.prototype.getSeededSpawnSteps = function () {
  return this.replayMode ? this.replayIndex : this.moveHistory.length;
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
  this.seedRandomForSpawn(this.getSeededSpawnSteps());
  this.spawnRandomTileAtAvailableCell(available);
};

GameManager.prototype.syncBestScoreBeforeActuate = function () {
  if (this.scoreManager.get() < this.score) {
    this.scoreManager.set(this.score);
  }
};

GameManager.prototype.buildActuatorPayload = function () {
  return {
    score: this.score,
    over: this.over,
    won: this.won,
    bestScore: this.scoreManager.get(),
    terminated: this.isGameTerminated(),
    blockedCells: this.blockedCellsList || []
  };
};

GameManager.prototype.updateStepStatsUi = function (stepStats) {
  var totalSteps = stepStats.totalSteps;
  var moveSteps = stepStats.moveSteps;
  var undoSteps = stepStats.undoSteps;

  var totalEl = document.getElementById("stats-total");
  if (totalEl) totalEl.textContent = "总步数: " + totalSteps;

  var movesEl = document.getElementById("stats-moves");
  if (movesEl) movesEl.textContent = "移动步数: " + moveSteps;

  var undoEl = document.getElementById("stats-undo");
  if (undoEl) undoEl.textContent = "撤回步数: " + undoSteps;
  this.updateStatsPanel(totalSteps, moveSteps, undoSteps);
};

GameManager.prototype.refreshStepStatsUiFromHistory = function () {
  this.updateStepStatsUi(this.computeStepStats());
};

GameManager.prototype.refreshActuateTimerAndIps = function () {
  if (!this.timerContainer) return;
  var time;
  if (this.timerStatus === 1) {
    time = Date.now() - this.startTime.getTime();
  } else {
    time = this.accumulatedTime;
  }
  this.timerContainer.textContent = this.pretty(time);
  this.refreshIpsDisplay(time);
};

GameManager.prototype.persistOrFinalizeSessionAfterActuate = function () {
  if (this.isSessionTerminated() && this.modeKey !== "practice_legacy") {
    this.clearSavedGameState(this.modeKey);
    this.tryAutoSubmitOnGameOver();
    return;
  }
  this.saveGameState();
};

// Sends the updated grid to the actuator
GameManager.prototype.actuate = function () {
  this.syncBestScoreBeforeActuate();
  this.actuator.actuate(this.grid, this.buildActuatorPayload());
  this.refreshStepStatsUiFromHistory();
  this.refreshActuateTimerAndIps();
  this.persistOrFinalizeSessionAfterActuate();
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
  var resolveMoveInputThrottleMsCore = this.callCoreTimerIntervalRuntime("resolveMoveInputThrottleMs", [
    this.replayMode,
    this.width,
    this.height
  ]);
  if (resolveMoveInputThrottleMsCore.available) return resolveMoveInputThrottleMsCore.value;
  if (this.replayMode) return 0;
  var area = (this.width || 4) * (this.height || 4);
  if (area >= 100) return 65;
  if (area >= 64) return 45;
  return 0;
};

GameManager.prototype.hasPendingMoveInput = function () {
  return !(this.pendingMoveInput === null || typeof this.pendingMoveInput === "undefined");
};

GameManager.prototype.isImmediateMoveDispatchAllowed = function (now, throttleMs) {
  return (now - this.lastMoveInputAt) >= throttleMs && !this.moveInputFlushScheduled;
};

GameManager.prototype.scheduleMoveInputFlush = function () {
  if (this.moveInputFlushScheduled) return;
  this.moveInputFlushScheduled = true;
  var self = this;
  self.requestAnimationFrame(function () {
    self.flushPendingMoveInput();
  });
};

GameManager.prototype.enqueuePendingMoveInput = function (direction) {
  this.pendingMoveInput = direction;
  this.scheduleMoveInputFlush();
};

GameManager.prototype.flushPendingMoveInput = function () {
  this.moveInputFlushScheduled = false;
  if (!this.hasPendingMoveInput()) return;
  var direction = this.pendingMoveInput;
  this.pendingMoveInput = null;

  var throttleMs = this.getMoveInputThrottleMs();
  if (throttleMs <= 0) {
    this.move(direction);
    return;
  }

  var now = Date.now();
  var wait = throttleMs - (now - this.lastMoveInputAt);
  if (wait <= 0) {
    this.lastMoveInputAt = now;
    this.move(direction);
    return;
  }

  var self = this;
  setTimeout(function () {
    if (self.hasPendingMoveInput()) {
      // Newer input exists; next flush will consume latest direction.
      self.scheduleMoveInputFlush();
      return;
    }
    self.lastMoveInputAt = Date.now();
    self.move(direction);
  }, wait);
};

GameManager.prototype.handleMoveInput = function (direction) {
  if (direction === -1) {
    this.move(direction);
    return;
  }

  var throttleMs = this.getMoveInputThrottleMs();
  if (throttleMs <= 0) {
    this.move(direction);
    return;
  }

  var now = Date.now();
  if (this.isImmediateMoveDispatchAllowed(now, throttleMs)) {
    this.lastMoveInputAt = now;
    this.move(direction);
    return;
  }

  this.enqueuePendingMoveInput(direction);
};

// Move a tile and its representation
GameManager.prototype.moveTile = function (tile, cell) {
  this.grid.cells[tile.x][tile.y] = null;
  this.grid.cells[cell.x][cell.y] = tile;
  tile.updatePosition(cell);
};

GameManager.prototype.applyCorePostMoveScoreResult = function (scoreResult) {
  if (Number.isFinite(scoreResult.score)) {
    this.score = Number(scoreResult.score);
  }
  if (Number.isInteger(scoreResult.comboStreak) && scoreResult.comboStreak >= 0) {
    this.comboStreak = scoreResult.comboStreak;
  }
};

GameManager.prototype.applyFallbackPostMoveScore = function (scoreBeforeMove) {
  var mergeGain = this.score - scoreBeforeMove;
  if (mergeGain > 0) {
    this.comboStreak += 1;
    if (this.comboMultiplier > 1 && this.comboStreak > 1) {
      var comboBonus = Math.floor(mergeGain * (this.comboMultiplier - 1) * (this.comboStreak - 1));
      if (comboBonus > 0) {
        this.score += comboBonus;
      }
    }
    return;
  }
  this.comboStreak = 0;
};

GameManager.prototype.applyPostMoveScore = function (scoreBeforeMove) {
  var computePostMoveScoreCore = this.callCoreScoringRuntime("computePostMoveScore", [{
      scoreBeforeMove: scoreBeforeMove,
      scoreAfterMerge: this.score,
      comboStreak: this.comboStreak,
      comboMultiplier: this.comboMultiplier
    }]);
  if (computePostMoveScoreCore.available) {
    this.applyCorePostMoveScoreResult(computePostMoveScoreCore.value || {});
    return;
  }
  this.applyFallbackPostMoveScore(scoreBeforeMove);
};

GameManager.prototype.applyCorePostMoveLifecycleResult = function (postMoveResult, hasMovesAvailable) {
  if (Number.isInteger(postMoveResult.successfulMoveCount) && postMoveResult.successfulMoveCount >= 0) {
    this.successfulMoveCount = postMoveResult.successfulMoveCount;
  } else {
    this.successfulMoveCount += 1;
  }
  this.over = typeof postMoveResult.over === "boolean" ? postMoveResult.over : !hasMovesAvailable;
  if (postMoveResult.shouldEndTime || this.over) {
    this.endTime();
  }
  return {
    postMoveResult: postMoveResult,
    shouldStartTimer:
      typeof postMoveResult.shouldStartTimer === "boolean"
        ? postMoveResult.shouldStartTimer
        : (this.timerStatus === 0 && !this.over)
  };
};

GameManager.prototype.applyFallbackPostMoveLifecycle = function (hasMovesAvailable) {
  this.successfulMoveCount += 1;
  if (!hasMovesAvailable) {
    this.over = true;
    this.endTime();
  }
  return {
    postMoveResult: null,
    shouldStartTimer: this.timerStatus === 0 && !this.over
  };
};

GameManager.prototype.applyPostMoveLifecycle = function (hasMovesAvailable) {
  var computePostMoveLifecycleCore = this.callCorePostMoveRuntime("computePostMoveLifecycle", [{
    successfulMoveCount: this.successfulMoveCount,
    hasMovesAvailable: hasMovesAvailable,
    timerStatus: this.timerStatus
  }]);
  if (computePostMoveLifecycleCore.available) {
    return this.applyCorePostMoveLifecycleResult(computePostMoveLifecycleCore.value || {}, hasMovesAvailable);
  }
  return this.applyFallbackPostMoveLifecycle(hasMovesAvailable);
};

GameManager.prototype.applyMergeTimerStampEffects = function (timerIdsToStamp, timeStr) {
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
};

GameManager.prototype.applyMergeTimerRowVisibilityEffects = function (mergeEffects) {
  if (mergeEffects.showSubTimerContainer) {
    var subContainer = document.getElementById("timer32k-sub-container");
    if (subContainer) subContainer.style.display = "block";
  }
  var hideTimerRows = Array.isArray(mergeEffects.hideTimerRows) ? mergeEffects.hideTimerRows : [];
  for (var hideIndex = 0; hideIndex < hideTimerRows.length; hideIndex++) {
    var rowEl = document.getElementById("timer-row-" + String(hideTimerRows[hideIndex]));
    if (rowEl) rowEl.style.display = "none";
  }
};

GameManager.prototype.applyMergeOutcomeFlags = function (mergeEffects) {
  if (mergeEffects.shouldSetWon) {
    this.won = true;
  }
  if (mergeEffects.shouldSetReached32k) {
    this.reached32k = true;
  }
};

GameManager.prototype.applyMergeMilestoneEffects = function (mergedValue, timeStr) {
  this.recordTimerMilestone(mergedValue, timeStr);
  var mergeEffects = this.computeMergeEffects(mergedValue);
  if (mergeEffects.shouldRecordCappedMilestone) {
    this.recordCappedMilestone(timeStr);
  }
  this.applyMergeOutcomeFlags(mergeEffects);

  var timerIdsToStamp = Array.isArray(mergeEffects.timerIdsToStamp)
    ? mergeEffects.timerIdsToStamp
    : [];
  this.applyMergeTimerStampEffects(timerIdsToStamp, timeStr);
  this.applyMergeTimerRowVisibilityEffects(mergeEffects);
};

GameManager.prototype.isUndoOperationAllowed = function () {
  return this.replayMode || this.isUndoInteractionEnabled();
};

GameManager.prototype.hasRemainingUndoBudget = function () {
  if (this.undoLimit === null) return true;
  return this.undoUsed < this.undoLimit;
};

GameManager.prototype.canProcessUndoMove = function () {
  if (!this.isUndoOperationAllowed()) return false;
  if (!this.hasRemainingUndoBudget()) return false;
  return this.undoStack.length > 0;
};

GameManager.prototype.resolveUndoPayloadScore = function (undoPayload) {
  return Number.isFinite(undoPayload.score) && typeof undoPayload.score === "number"
    ? Number(undoPayload.score)
    : 0;
};

GameManager.prototype.restoreUndoPayloadTiles = function (undoPayload) {
  var undoTiles = Array.isArray(undoPayload.tiles) ? undoPayload.tiles : [];
  for (var i = 0; i < undoTiles.length; i++) {
    var t = this.createUndoRestoreTile(undoTiles[i]);
    var tile = new Tile({ x: t.x, y: t.y }, t.value);
    tile.previousPosition = {
      x: t.previousPosition.x,
      y: t.previousPosition.y
    };
    this.grid.cells[tile.x][tile.y] = tile;
  }
};

GameManager.prototype.restoreUndoPayload = function (undoPayload) {
  this.grid.build();
  this.score = this.resolveUndoPayloadScore(undoPayload);
  this.restoreUndoPayloadTiles(undoPayload);
};

GameManager.prototype.applyUndoRestoreCounterFlags = function (undoRestore) {
  this.comboStreak =
    Number.isInteger(undoRestore.comboStreak) && undoRestore.comboStreak >= 0
      ? undoRestore.comboStreak
      : 0;
  this.successfulMoveCount =
    Number.isInteger(undoRestore.successfulMoveCount) && undoRestore.successfulMoveCount >= 0
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
  this.undoUsed =
    Number.isInteger(undoRestore.undoUsed) && undoRestore.undoUsed >= 0
      ? undoRestore.undoUsed
      : ((Number.isInteger(this.undoUsed) && this.undoUsed >= 0 ? this.undoUsed : 0) + 1);
};

GameManager.prototype.applyUndoRestoreOutcomeFlags = function (undoRestore) {
  this.over = typeof undoRestore.over === "boolean" ? undoRestore.over : false;
  this.won = typeof undoRestore.won === "boolean" ? undoRestore.won : false;
  this.keepPlaying = typeof undoRestore.keepPlaying === "boolean" ? undoRestore.keepPlaying : false;
};

GameManager.prototype.applyUndoRestoreFlags = function (undoRestore) {
  this.applyUndoRestoreCounterFlags(undoRestore);
  this.applyUndoRestoreOutcomeFlags(undoRestore);
  if (undoRestore.shouldClearMessage !== false) {
    this.actuator.clearMessage(); // Clear Game Over message if present
  }
};

GameManager.prototype.applyPostUndoRecord = function (postUndoRecord, direction) {
  if (postUndoRecord.shouldRecordMoveHistory) {
    this.moveHistory.push(direction);
  }
  if (postUndoRecord.shouldAppendCompactUndo) {
    this.appendCompactUndo();
  }
  if (postUndoRecord.shouldPushSessionAction && this.sessionReplayV3) {
    var undoAction = Array.isArray(postUndoRecord.sessionAction)
      ? postUndoRecord.sessionAction
      : ["u"];
    this.sessionReplayV3.actions.push(undoAction);
  }
};

GameManager.prototype.recordPostUndoMove = function (direction) {
  var postUndoRecord = this.computePostUndoRecord(direction);
  this.applyPostUndoRecord(postUndoRecord, direction);
};

GameManager.prototype.shouldStartTimerAfterUndoRestore = function (undoRestore) {
  if (typeof undoRestore.shouldStartTimer === "boolean") {
    return undoRestore.shouldStartTimer;
  }
  return this.timerStatus === 0;
};

GameManager.prototype.publishMovedAdapterResult = function (reason, direction) {
  this.publishAdapterMoveResult({
    reason: reason,
    direction: direction,
    moved: true
  });
};

GameManager.prototype.publishUndoCompletion = function (direction, undoRestore) {
  this.actuate();
  if (this.shouldStartTimerAfterUndoRestore(undoRestore)) {
    this.startTimer();
  }
  this.publishMovedAdapterResult("undo", direction);
};

GameManager.prototype.performUndoRestoreFromEntry = function (prev) {
  var undoPayload = this.computeUndoRestorePayload(prev);
  this.restoreUndoPayload(undoPayload);
  var undoRestore = this.computeUndoRestoreState(prev);
  this.applyUndoRestoreFlags(undoRestore);
  return undoRestore;
};

GameManager.prototype.handleUndoMove = function (direction) {
  if (!this.canProcessUndoMove()) {
    return;
  }

  var prev = this.normalizeUndoStackEntry(this.undoStack.pop());
  var undoRestore = this.performUndoRestoreFromEntry(prev);
  this.recordPostUndoMove(direction);
  this.publishUndoCompletion(direction, undoRestore);
};

GameManager.prototype.applyPostMoveRecord = function (direction, postMoveRecord) {
  if (postMoveRecord.shouldRecordMoveHistory) {
    this.moveHistory.push(direction);
  }
  if (Number.isInteger(postMoveRecord.compactMoveCode)) {
    this.appendCompactMoveCode(postMoveRecord.compactMoveCode);
  }
  if (postMoveRecord.shouldPushSessionAction && this.sessionReplayV3) {
    var action = Array.isArray(postMoveRecord.sessionAction)
      ? postMoveRecord.sessionAction
      : ["m", direction];
    this.sessionReplayV3.actions.push(action);
  }
  if (postMoveRecord.shouldResetLastSpawn) {
    this.lastSpawn = null;
  }
};

GameManager.prototype.savePostMoveState = function (direction, undo) {
  this.undoStack.push(this.normalizeUndoStackEntry(undo));
  var postMoveRecord = this.computePostMoveRecord(direction);
  this.applyPostMoveRecord(direction, postMoveRecord);
};

GameManager.prototype.shouldStartTimerAfterMove = function (postMoveLifecycle) {
  return !!(postMoveLifecycle && postMoveLifecycle.shouldStartTimer);
};

GameManager.prototype.publishMoveCompletion = function (direction, postMoveLifecycle) {
  this.actuate();
  if (this.shouldStartTimerAfterMove(postMoveLifecycle)) {
    this.startTimer();
  }
  this.publishMovedAdapterResult("move", direction);
};

GameManager.prototype.finalizeSuccessfulMoveLifecycle = function (direction, undo) {
  var hasMovesAvailable = this.movesAvailable();
  var postMoveLifecycle = this.applyPostMoveLifecycle(hasMovesAvailable);
  this.savePostMoveState(direction, undo);
  this.publishMoveCompletion(direction, postMoveLifecycle);
};

GameManager.prototype.applySuccessfulMove = function (direction, scoreBeforeMove, undo) {
  // IPS counts only effective move inputs (invalid directions are excluded).
  this.recordIpsInput();

  this.applyPostMoveScore(scoreBeforeMove);

  this.addRandomTile();
  this.finalizeSuccessfulMoveLifecycle(direction, undo);
};

GameManager.prototype.shouldAbortForLockedDirection = function (direction, lockedDirection) {
  if (lockedDirection === null || typeof lockedDirection === "undefined") return false;
  return Number(direction) === Number(lockedDirection);
};

GameManager.prototype.shouldAbortDirectionalMove = function (direction) {
  if (this.isGameTerminated()) return true; // Don't do anything if the game's over

  var lockedDirection = this.getLockedDirection();
  if (!this.shouldAbortForLockedDirection(direction, lockedDirection)) return false;
  this.consumeDirectionLock();
  return true;
};

GameManager.prototype.snapshotMoveTileForUndo = function (undo, tile, target) {
  undo.tiles.push(this.createUndoTileSnapshot(tile, target));
};

GameManager.prototype.applyMergeInteraction = function (tile, next, mergedValue, target, undo) {
  // We need to save tile since it will get removed
  this.snapshotMoveTileForUndo(undo, tile, target);

  var merged = new Tile(target, mergedValue);
  merged.mergedFrom = [tile, next];

  this.grid.insertTile(merged);
  this.grid.removeTile(tile);

  // Converge the two tiles' positions
  tile.updatePosition(target);

  // Update the score
  this.score += merged.value;

  var timeStr = this.pretty(this.time);
  this.applyMergeMilestoneEffects(merged.value, timeStr);
};

GameManager.prototype.resolveNextTileForMovePositions = function (positions) {
  if (this.isBlockedCell(positions.next.x, positions.next.y)) return null;
  return this.grid.cellContent(positions.next);
};

GameManager.prototype.applyPlannedTileInteraction = function (tile, next, mergedValue, interaction, undo) {
  if (interaction.kind === "merge" && next && !next.mergedFrom && mergedValue !== null) {
    this.applyMergeInteraction(tile, next, mergedValue, interaction.target, undo);
    return;
  }
  this.snapshotMoveTileForUndo(undo, tile, interaction.target);
  this.moveTile(tile, interaction.target);
};

GameManager.prototype.processMoveCell = function (cell, vector, undo) {
  if (this.isBlockedCell(cell.x, cell.y)) return false;

  var tile = this.grid.cellContent(cell);
  if (!tile) return false;

  var positions = this.findFarthestPosition(cell, vector);
  var next = this.resolveNextTileForMovePositions(positions);

  var mergedValue = next ? this.getMergedValue(tile.value, next.value) : null;
  var interaction = this.planTileInteraction(cell, positions, next, mergedValue);
  this.applyPlannedTileInteraction(tile, next, mergedValue, interaction, undo);
  return interaction.moved === true;
};

GameManager.prototype.scanMoveTraversalColumn = function (x, traversalY, vector, undo) {
  var moved = false;
  for (var yIndex = 0; yIndex < traversalY.length; yIndex++) {
    var y = traversalY[yIndex];
    if (this.processMoveCell({ x: x, y: y }, vector, undo)) {
      moved = true;
    }
  }
  return moved;
};

GameManager.prototype.scanMoveTraversals = function (traversals, vector, undo) {
  var moved = false;
  for (var xIndex = 0; xIndex < traversals.x.length; xIndex++) {
    var x = traversals.x[xIndex];
    moved = this.scanMoveTraversalColumn(x, traversals.y, vector, undo) || moved;
  }
  return moved;
};

GameManager.prototype.createDirectionalMovePlan = function (direction) {
  return {
    vector: this.getVector(direction),
    scoreBeforeMove: this.score,
    undo: this.createUndoSnapshotState()
  };
};

GameManager.prototype.executeDirectionalMove = function (direction) {
  var movePlan = this.createDirectionalMovePlan(direction);
  var traversals = this.buildTraversals(movePlan.vector);

  // Save the current tile positions and remove merger information
  this.prepareTiles();

  var moved = this.scanMoveTraversals(traversals, movePlan.vector, movePlan.undo);
  if (moved) {
    this.applySuccessfulMove(direction, movePlan.scoreBeforeMove, movePlan.undo);
  }
};

// Move tiles on the grid in the specified direction
GameManager.prototype.move = function (direction) {
  // 0: up, 1: right, 2:down, 3: left, -1: undo
  if (direction == -1) {
    this.handleUndoMove(direction);
    return;
  }

  if (this.shouldAbortDirectionalMove(direction)) return;
  this.executeDirectionalMove(direction);
};

// Get the vector representing the chosen direction
GameManager.prototype.getVector = function (direction) {
  var getVectorCore = this.callCoreMovePathRuntime("getVector", [direction]);
  if (getVectorCore.available) return getVectorCore.value;

  // Vectors representing tile movement
  var map = {
    0: { x: 0,  y: -1 }, // up
    1: { x: 1,  y: 0 },  // right
    2: { x: 0,  y: 1 },  // down
    3: { x: -1, y: 0 }   // left
  };

  return map[direction];
};

GameManager.prototype.createTraversalAxis = function (size) {
  var values = [];
  for (var i = 0; i < size; i++) {
    values.push(i);
  }
  return values;
};

GameManager.prototype.applyTraversalDirection = function (axis, component) {
  return component === 1 ? axis.reverse() : axis;
};

// Build a list of positions to traverse in the right order
GameManager.prototype.buildTraversals = function (vector) {
  var buildTraversalsCore = this.callCoreMovePathRuntime("buildTraversals", [this.width, this.height, vector]);
  if (buildTraversalsCore.available) {
    var computed = buildTraversalsCore.value || {};
    return {
      x: Array.isArray(computed.x) ? computed.x : [],
      y: Array.isArray(computed.y) ? computed.y : []
    };
  }

  return {
    x: this.applyTraversalDirection(this.createTraversalAxis(this.width), vector.x),
    y: this.applyTraversalDirection(this.createTraversalAxis(this.height), vector.y)
  };
};

GameManager.prototype.stepCellByVector = function (cell, vector) {
  return { x: cell.x + vector.x, y: cell.y + vector.y };
};

GameManager.prototype.canTraverseThroughCell = function (cell) {
  return this.grid.withinBounds(cell) &&
    !this.isBlockedCell(cell.x, cell.y) &&
    this.grid.cellAvailable(cell);
};

GameManager.prototype.findFarthestPosition = function (cell, vector) {
  var findFarthestPositionCore = this.callCoreMovePathRuntime("findFarthestPosition", [
      cell,
      vector,
      this.width,
      this.height,
      this.isBlockedCell.bind(this),
      this.getGridCellAvailableFn()
    ]);
  if (findFarthestPositionCore.available) {
    var computed = findFarthestPositionCore.value || {};
    if (computed.farthest && computed.next) return computed;
  }

  var previous;

  // Progress towards the vector direction until an obstacle is found
  do {
    previous = cell;
    cell = this.stepCellByVector(previous, vector);
  } while (this.canTraverseThroughCell(cell));

  return {
    farthest: previous,
    next: cell // Used to check if a merge is required
  };
};

GameManager.prototype.movesAvailable = function () {
  var movesAvailableCore = this.callCoreMoveScanRuntime("movesAvailable", [
    this.getAvailableCells().length,
    this.tileMatchesAvailable()
  ]);
  if (movesAvailableCore.available) return movesAvailableCore.value;
  return this.getAvailableCells().length > 0 || this.tileMatchesAvailable();
};

GameManager.prototype.canMergeTileWithAnyNeighbor = function (x, y, tile) {
  for (var direction = 0; direction < 4; direction++) {
    var vector = this.getVector(direction);
    var cell = { x: x + vector.x, y: y + vector.y };
    if (this.isBlockedCell(cell.x, cell.y)) continue;
    var other = this.grid.cellContent(cell);
    if (other && this.getMergedValue(tile.value, other.value) !== null) {
      return true;
    }
  }
  return false;
};

GameManager.prototype.hasMergeableNeighborAtCell = function (x, y) {
  if (this.isBlockedCell(x, y)) return false;
  var tile = this.grid.cellContent({ x: x, y: y });
  if (!tile) return false;
  return this.canMergeTileWithAnyNeighbor(x, y, tile);
};

GameManager.prototype.tileMatchesAvailableFallback = function () {
  for (var x = 0; x < this.width; x++) {
    for (var y = 0; y < this.height; y++) {
      if (this.hasMergeableNeighborAtCell(x, y)) return true;
    }
  }
  return false;
};

GameManager.prototype.createTileValueReader = function () {
  var manager = this;
  return function (cell) {
    var tile = manager.grid.cellContent(cell);
    return tile ? tile.value : null;
  };
};

GameManager.prototype.createMergeValueChecker = function () {
  var manager = this;
  return function (a, b) {
    return manager.getMergedValue(a, b) !== null;
  };
};

GameManager.prototype.buildTileMatchesRuntimeArgs = function () {
  return [
    this.width,
    this.height,
    this.isBlockedCell.bind(this),
    this.createTileValueReader(),
    this.createMergeValueChecker()
  ];
};

// Check for available matches between tiles (more expensive check)
GameManager.prototype.tileMatchesAvailable = function () {
  var tileMatchesAvailableCore = this.callCoreMoveScanRuntime(
    "tileMatchesAvailable",
    this.buildTileMatchesRuntimeArgs()
  );
  if (tileMatchesAvailableCore.available) return tileMatchesAvailableCore.value;
  return this.tileMatchesAvailableFallback();
};

GameManager.prototype.positionsEqual = function (first, second) {
  var positionsEqualCore = this.callCoreMovePathRuntime("positionsEqual", [first, second]);
  if (positionsEqualCore.available) return positionsEqualCore.value;
  return first.x === second.x && first.y === second.y;
};

GameManager.prototype.canStartTimer = function () {
  return this.timerStatus === 0;
};

// Start the timer
GameManager.prototype.startTimer = function() {
  if (!this.canStartTimer()) return;
  this.applyTimerStartState();
  this.scheduleTimerUpdateInterval();
};

GameManager.prototype.applyTimerStartState = function () {
  this.timerStatus = 1;
  this.hasGameStarted = true;
  // Convert accumulated time back to a start timestamp relative to now
  this.startTime = new Date(Date.now() - (this.accumulatedTime || 0));
  this.notifyUndoSettingsStateChanged();
};

GameManager.prototype.createTimerUpdateCallback = function () {
  var manager = this;
  return function () {
    manager.updateTimer();
  };
};

GameManager.prototype.scheduleTimerUpdateInterval = function () {
  this.timerUpdateIntervalMs = this.getTimerUpdateIntervalMs();
  this.lastStatsPanelUpdateAt = 0;
  this.timerID = setInterval(this.createTimerUpdateCallback(), this.timerUpdateIntervalMs);
};

GameManager.prototype.getTimerUpdateIntervalMs = function () {
  var resolveTimerUpdateIntervalMsCore = this.callCoreTimerIntervalRuntime("resolveTimerUpdateIntervalMs", [
    this.width,
    this.height
  ]);
  if (resolveTimerUpdateIntervalMsCore.available) return resolveTimerUpdateIntervalMsCore.value;
  return this.resolveTimerUpdateIntervalMsFallback();
};

GameManager.prototype.resolveTimerUpdateIntervalMsFallback = function () {
  var area = (this.width || 4) * (this.height || 4);
  if (area >= 100) return 50;
  if (area >= 64) return 33;
  return 10;
};

GameManager.prototype.isStatsPanelOpen = function () {
  var overlay = document.getElementById("stats-panel-overlay");
  return !!(overlay && overlay.style.display !== "none");
};

GameManager.prototype.renderAccumulatedTimerDisplay = function () {
  this.updateTimerDisplayText(this.accumulatedTime);
};

GameManager.prototype.endTime = function() {
  this.stopTimer();
  this.renderAccumulatedTimerDisplay();
};

GameManager.prototype.resolveElapsedTimerMsFromStartTime = function () {
  if (!this.startTime) return null;
  return Date.now() - this.startTime.getTime();
};

GameManager.prototype.updateTimerDisplayText = function (elapsedMs) {
  var timerEl = document.getElementById("timer");
  if (timerEl) timerEl.textContent = this.pretty(elapsedMs);
};

GameManager.prototype.shouldRefreshStatsPanelAtElapsed = function (elapsedMs) {
  return !this.lastStatsPanelUpdateAt || (elapsedMs - this.lastStatsPanelUpdateAt) >= 100;
};

GameManager.prototype.refreshStatsPanelIfNeededAtElapsed = function (elapsedMs) {
  if (!this.isStatsPanelOpen()) return;
  if (!this.shouldRefreshStatsPanelAtElapsed(elapsedMs)) return;
  this.updateStatsPanel();
  this.lastStatsPanelUpdateAt = elapsedMs;
};

GameManager.prototype.applyTimerTickAtElapsed = function (elapsedMs) {
  this.time = elapsedMs;
  this.updateTimerDisplayText(elapsedMs);
  this.refreshIpsDisplay(elapsedMs);
  this.refreshStatsPanelIfNeededAtElapsed(elapsedMs);
};

// Update the timer
GameManager.prototype.updateTimer = function() {
  var time = this.resolveElapsedTimerMsFromStartTime();
  if (time === null) return;
  this.applyTimerTickAtElapsed(time);
};

GameManager.prototype.resolveAccumulatedTimerMsFromStartTime = function () {
  if (!this.startTime || typeof this.startTime.getTime !== "function") {
    return this.accumulatedTime || 0;
  }
  return Date.now() - this.startTime.getTime();
};

GameManager.prototype.clearTimerUpdateInterval = function () {
  clearInterval(this.timerID);
  this.timerID = null;
};

GameManager.prototype.applyTimerStopState = function () {
  this.accumulatedTime = this.resolveAccumulatedTimerMsFromStartTime();
  this.clearTimerUpdateInterval();
  this.timerStatus = 0;
};

GameManager.prototype.canStopTimer = function () {
  return this.timerStatus === 1;
};

GameManager.prototype.stopTimer = function() {
  if (!this.canStopTimer()) return;
  this.applyTimerStopState();
};

GameManager.prototype.pretty = function(time) {
  var formatPrettyTimeCore = this.callCorePrettyTimeRuntime("formatPrettyTime", [time]);
  if (formatPrettyTimeCore.available) return formatPrettyTimeCore.value;
  return this.formatPrettyTimeFallback(time);
};

GameManager.prototype.formatPrettyTimeFallback = function (time) {
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
};

GameManager.prototype.shouldRecordPracticeReplayAction = function () {
  return !this.replayMode && this.sessionReplayV3 && this.modeKey === "practice_legacy";
};

GameManager.prototype.recordPracticeReplayAction = function (action) {
  if (!this.shouldRecordPracticeReplayAction()) return;
  this.sessionReplayV3.actions.push(action);
  if (Array.isArray(action) && action[0] === "p") {
    this.appendCompactPracticeAction(action[1], action[2], action[3]);
  }
};

GameManager.prototype.ensureTimer32kTextIfNeeded = function (value) {
  if (value !== 32768) return;
  var timeStr = this.pretty(this.time);
  var timer32k = document.getElementById("timer32768");
  if (timer32k && timer32k.textContent === "") {
    timer32k.textContent = timeStr;
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

  this.ensureTimer32kTextIfNeeded(value);
};

GameManager.prototype.refreshAfterCustomTileEdit = function () {
  this.clearTransientTileVisualState();
  this.actuate();
};



// Insert a custom tile (Test Board)
GameManager.prototype.insertCustomTile = function(x, y, value) {
    if (this.isBlockedCell(x, y)) {
        throw "Blocked cell cannot be edited";
    }
    if (this.grid.cellContent({ x: x, y: y })) {
        // Remove existing if needed? Or just overwrite?
        this.grid.removeTile(this.grid.cellContent({ x: x, y: y }));
    }
    
    // If value is 0, we just want to clear the tile.
    if (value === 0) {
        this.recordPracticeReplayAction(["p", x, y, value]);
        this.refreshAfterCustomTileEdit();
        return;
    }
    
    var tile = new Tile({ x: x, y: y }, value);
    this.grid.insertTile(tile);
    
    // Invalidate timers below this value
    this.invalidateTimers(value);
    
    // Check for 32k+ visibility
    this.apply32kVisibilityStateForCustomTile(value);
    
    // Refresh
    this.refreshAfterCustomTileEdit();

    this.recordPracticeReplayAction(["p", x, y, value]);
};

GameManager.prototype.resolveInvalidateTimersCoreInput = function (limit) {
    return {
        timerMilestones: this.timerMilestones || this.getTimerMilestoneValues(),
        timerSlotIds: GameManager.TIMER_SLOT_IDS,
        limit: limit,
        reached32k: !!this.reached32k,
        isFibonacciMode: this.isFibonacciMode()
    };
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

GameManager.prototype.invalidateTimerSlotsFallback = function (limit) {
    var milestones = this.timerMilestones || this.getTimerMilestoneValues();
    var timerSlots = GameManager.TIMER_SLOT_IDS;
    for (var i = 0; i < timerSlots.length; i++) {
        var milestoneValue = milestones[i];
        var slotId = timerSlots[i];
        if (Number.isInteger(milestoneValue) && milestoneValue <= limit) {
             var el = document.getElementById("timer" + slotId);
             if (el) {
                 el.textContent = "---------";
                 // Also ensure it doesn't get overwritten later? 
                 // The move logic checks 'if (el.innerHTML === "")'. 
                 // Now it is "---------", so it won't be overwritten. Correct.
             }
        }
    }
};

GameManager.prototype.invalidateSubTimersFallback = function (limit) {
    if (this.reached32k && !this.isFibonacciMode()) {
        if (8192 <= limit && limit !== 32768) {
            var sub8k = document.getElementById("timer8192-sub");
            if (sub8k) sub8k.textContent = "---------";
        }
        if (16384 <= limit && limit !== 32768) {
            var sub16k = document.getElementById("timer16384-sub");
            if (sub16k) sub16k.textContent = "---------";
        }
    }
};

GameManager.prototype.invalidateTimersFallback = function (limit) {
    this.invalidateTimerSlotsFallback(limit);
    this.invalidateSubTimersFallback(limit);
};

GameManager.prototype.invalidateTimers = function(limit) {
    var resolveInvalidatedTimerElementIdsCore = this.callCoreTimerIntervalRuntime("resolveInvalidatedTimerElementIds", [
        this.resolveInvalidateTimersCoreInput(limit)
    ]);
    if (resolveInvalidatedTimerElementIdsCore.available) {
        this.applyInvalidatedTimerPlaceholders(resolveInvalidatedTimerElementIdsCore.value || []);
        return;
    }
    this.invalidateTimersFallback(limit);
};

GameManager.prototype.createBoardMatrixTileValueReader = function () {
  var self = this;
  return function (x, y) {
    var tile = self.grid.cellContent({ x: x, y: y });
    return tile ? tile.value : 0;
  };
};

GameManager.prototype.buildFinalBoardMatrixFallback = function () {
  var readCellValue = this.createBoardMatrixTileValueReader();
  var rows = [];
  for (var y = 0; y < this.height; y++) {
    var row = [];
    for (var x = 0; x < this.width; x++) {
      row.push(readCellValue(x, y));
    }
    rows.push(row);
  }
  return rows;
};

GameManager.prototype.getFinalBoardMatrix = function () {
  var buildBoardMatrixCore = this.callCoreGridScanRuntime("buildBoardMatrix", [
    this.width,
    this.height,
    this.createBoardMatrixTileValueReader()
  ]);
  if (buildBoardMatrixCore.available) {
    var board = buildBoardMatrixCore.value;
    if (Array.isArray(board)) return board;
  }
  return this.buildFinalBoardMatrixFallback();
};

GameManager.prototype.normalizeBestTileValue = function (rawBestTileValue) {
  var bestValue = Number(rawBestTileValue);
  if (!Number.isFinite(bestValue) || bestValue < 0) return null;
  return bestValue;
};

GameManager.prototype.getBestTileValueFallback = function () {
  var best = 0;
  this.grid.eachCell(function (_x, _y, tile) {
    if (tile && tile.value > best) best = tile.value;
  });
  return best;
};

GameManager.prototype.getBestTileValue = function () {
  var getBestTileValueCore = this.callCoreGridScanRuntime("getBestTileValue", [this.getFinalBoardMatrix()]);
  if (getBestTileValueCore.available) {
    var bestCore = this.normalizeBestTileValue(getBestTileValueCore.value);
    if (bestCore !== null) return bestCore;
  }
  return this.getBestTileValueFallback();
};

GameManager.prototype.getDurationMs = function () {
  var nowMs = Date.now();
  var resolveDurationMsCore = this.callCoreReplayTimerRuntime("resolveDurationMs", [
    this.resolveDurationMsCoreInput(nowMs)
  ]);
  if (resolveDurationMsCore.available) {
    var resolvedCoreMs = this.normalizeDurationMs(resolveDurationMsCore.value);
    if (resolvedCoreMs !== null) return resolvedCoreMs;
  }
  return this.resolveDurationMsFallback(nowMs);
};

GameManager.prototype.resolveDurationMsCoreInput = function (nowMs) {
  return {
    timerStatus: this.timerStatus,
    startTimeMs:
      this.startTime && typeof this.startTime.getTime === "function"
        ? this.startTime.getTime()
        : null,
    accumulatedTime: this.accumulatedTime,
    sessionStartedAt: this.sessionStartedAt,
    nowMs: nowMs
  };
};

GameManager.prototype.normalizeDurationMs = function (rawMs) {
  var ms = Number(rawMs);
  if (!Number.isFinite(ms)) return null;
  ms = Math.floor(ms);
  return ms < 0 ? 0 : ms;
};

GameManager.prototype.resolveDurationMsFallback = function (nowMs) {
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
};

GameManager.prototype.createDefaultSessionReplayV3 = function () {
  return {
    v: 3,
    mode: this.getServerMode(this.modeKey),
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
};

GameManager.prototype.resolveSessionReplayV3Source = function () {
  return this.sessionReplayV3 || this.createDefaultSessionReplayV3();
};

GameManager.prototype.buildSerializedReplayV3Payload = function (replay) {
  return {
    v: 3,
    mode: this.getServerMode(replay.mode_key || replay.mode || this.modeKey),
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

GameManager.prototype.serializeV3 = function () {
  var replay = this.resolveSessionReplayV3Source();
  return this.buildSerializedReplayV3Payload(replay);
};

GameManager.prototype.writeLastSessionSubmitResult = function (payload) {
  this.writeLocalStorageJsonPayload("last_session_submit_result_v1", payload);
};

GameManager.prototype.writeSkippedSessionSubmitResult = function (reason) {
  this.writeLastSessionSubmitResult({
    at: new Date().toISOString(),
    ok: false,
    skipped: true,
    reason: reason
  });
};

GameManager.prototype.resolveSessionSubmitAdapterParitySnapshot = function () {
  return {
    report: this.getAdapterSessionParityReport(),
    diff: this.getAdapterSessionParityABDiff()
  };
};

GameManager.prototype.buildSessionSubmitPayload = function (endedAt, windowLike, adapterParitySnapshot) {
  var parity = adapterParitySnapshot && typeof adapterParitySnapshot === "object"
    ? adapterParitySnapshot
    : {};
  var adapterParityReport = parity.report;
  var adapterParityDiff = parity.diff;
  return {
    mode: this.getServerMode(this.modeKey),
    mode_key: this.modeKey,
    board_width: this.width,
    board_height: this.height,
    ruleset: this.ruleset,
    undo_enabled: !!this.modeConfig.undo_enabled,
    ranked_bucket: this.rankedBucket,
    mode_family: this.modeFamily,
    rank_policy: this.rankPolicy,
    special_rules_snapshot: this.clonePlain(this.specialRules || {}),
    challenge_id: this.challengeId || null,
    score: this.score,
    best_tile: this.getBestTileValue(),
    duration_ms: this.getDurationMs(),
    final_board: this.getFinalBoardMatrix(),
    ended_at: endedAt,
    replay: this.serializeV3(),
    replay_string: this.serialize(),
    adapter_parity_report_v2: adapterParityReport,
    adapter_parity_ab_diff_v2: adapterParityDiff,
    adapter_parity_report_v1: adapterParityReport,
    adapter_parity_ab_diff_v1: adapterParityDiff,
    client_version: (windowLike && windowLike.GAME_CLIENT_VERSION) || "1.8",
    end_reason: this.over ? "game_over" : "win_stop"
  };
};

GameManager.prototype.buildSessionSubmitSuccessResult = function (endedAt, payload, savedRecord) {
  return {
    at: endedAt,
    ok: true,
    local_saved: true,
    mode_key: payload.mode_key,
    score: payload.score,
    record_id: savedRecord && savedRecord.id ? savedRecord.id : null
  };
};

GameManager.prototype.buildSessionSubmitFailureResult = function (endedAt, payload, error) {
  return {
    at: endedAt,
    ok: false,
    mode_key: payload.mode_key,
    score: payload.score,
    error: error && error.message ? error.message : "local_save_failed"
  };
};

GameManager.prototype.persistSessionSubmitPayload = function (localHistorySaveRecord, payload) {
  return localHistorySaveRecord.method.call(localHistorySaveRecord.scope, payload);
};

GameManager.prototype.writeSessionSubmitSuccessResult = function (endedAt, payload, savedRecord) {
  this.writeLastSessionSubmitResult(
    this.buildSessionSubmitSuccessResult(endedAt, payload, savedRecord)
  );
};

GameManager.prototype.writeSessionSubmitFailureResult = function (endedAt, payload, error) {
  this.writeLastSessionSubmitResult(
    this.buildSessionSubmitFailureResult(endedAt, payload, error)
  );
};

GameManager.prototype.resolveSessionSubmitSkipReason = function () {
  if (this.replayMode) return "replay_mode";
  if (!this.isSessionTerminated()) return "not_terminated";
  return null;
};

GameManager.prototype.resolveLocalHistorySaveRecord = function () {
  return this.resolveWindowNamespaceMethod("LocalHistoryStore", "saveRecord");
};

GameManager.prototype.writeMissingLocalHistoryStoreResult = function () {
  this.writeLastSessionSubmitResult({
    at: new Date().toISOString(),
    ok: false,
    reason: "local_history_store_missing"
  });
};

GameManager.prototype.tryAutoSubmitOnGameOver = function () {
  if (this.sessionSubmitDone) return;
  var skippedReason = this.resolveSessionSubmitSkipReason();
  if (skippedReason) {
    this.writeSkippedSessionSubmitResult(skippedReason);
    return;
  }
  var localHistorySaveRecord = this.resolveLocalHistorySaveRecord();
  if (!localHistorySaveRecord) {
    this.writeMissingLocalHistoryStoreResult();
    return;
  }

  var windowLike = this.getWindowLike();
  var adapterParitySnapshot = this.resolveSessionSubmitAdapterParitySnapshot();
  this.sessionSubmitDone = true;
  var endedAt = new Date().toISOString();
  var payload = this.buildSessionSubmitPayload(endedAt, windowLike, adapterParitySnapshot);

  try {
    var saved = this.persistSessionSubmitPayload(localHistorySaveRecord, payload);
    this.writeSessionSubmitSuccessResult(endedAt, payload, saved);
  } catch (error) {
    this.writeSessionSubmitFailureResult(endedAt, payload, error);
  }
};

GameManager.prototype.isSessionTerminated = function () {
  return !!(this.over || (this.won && !this.keepPlaying));
};

GameManager.prototype.shouldSerializeReplayAsV3 = function () {
  return this.width !== 4 || this.height !== 4 || this.isFibonacciMode();
};

GameManager.prototype.buildReplayV4SerializationPayload = function () {
  var modeCode = this.resolveReplayV4ModeCodeFromModeKey(this.modeKey);
  var initialBoard = this.initialBoardMatrix || this.getFinalBoardMatrix();
  var encodedBoard = this.encodeBoardV4(initialBoard);
  return GameManager.REPLAY_V4_PREFIX + modeCode + encodedBoard + (this.replayCompactLog || "");
};

GameManager.prototype.serialize = function () {
  if (this.shouldSerializeReplayAsV3()) {
    return JSON.stringify(this.serializeV3());
  }
  return this.buildReplayV4SerializationPayload();
};

GameManager.prototype.startReplayImportPlayback = function () {
  this.resetReplayPlaybackStateForImport();
  this.resume();
};

GameManager.prototype.resetReplayPlaybackStateForImport = function () {
  this.replayIndex = 0;
  this.replayDelay = 200;
};

GameManager.prototype.finalizeReplayImportPlayback = function () {
  this.applyUndoSettingForMode(this.modeKey, true, true);
  this.startReplayImportPlayback();
};

GameManager.prototype.prepareReplayImportSession = function () {
  this.disableSessionSync = true;
};

GameManager.prototype.restartReplayImportSession = function (modeConfig, payload, useBoardRestart) {
  this.prepareReplayImportSession();
  this.restartReplaySession(payload, modeConfig, useBoardRestart);
  this.finalizeReplayImportPlayback();
};

GameManager.prototype.restartLegacyReplayImportSession = function (seed) {
  this.restartWithSeed(seed);
  this.startReplayImportPlayback();
};

GameManager.prototype.applyJsonV3ReplayEnvelopeMeta = function (envelope, modeConfig) {
  this.applyJsonV3ReplayModeConfigMeta(envelope, modeConfig);
  this.applyJsonV3ReplayChallengeMeta(envelope);
};

GameManager.prototype.applyJsonV3ReplayModeConfigMeta = function (envelope, modeConfig) {
  this.applyJsonV3ReplaySpecialRulesMeta(envelope, modeConfig);
  if (typeof envelope.modeFamily === "string" && envelope.modeFamily) {
    modeConfig.mode_family = envelope.modeFamily;
  }
  if (typeof envelope.rankPolicy === "string" && envelope.rankPolicy) {
    modeConfig.rank_policy = envelope.rankPolicy;
  }
};

GameManager.prototype.applyJsonV3ReplaySpecialRulesMeta = function (envelope, modeConfig) {
  if (envelope.specialRulesSnapshot && typeof envelope.specialRulesSnapshot === "object") {
    modeConfig.special_rules = this.clonePlain(envelope.specialRulesSnapshot);
  }
};

GameManager.prototype.applyJsonV3ReplayChallengeMeta = function (envelope) {
  if (typeof envelope.challengeId === "string" && envelope.challengeId) {
    this.challengeId = envelope.challengeId;
  }
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

GameManager.prototype.resolveV4ReplayImportActionsPayload = function (decodedV4Actions) {
  return {
    replayMoves: decodedV4Actions ? decodedV4Actions.replayMoves : null,
    replaySpawns: Array.isArray(decodedV4Actions && decodedV4Actions.replaySpawns)
      ? decodedV4Actions.replaySpawns
      : []
  };
};

GameManager.prototype.applyV4ReplayDecodedActions = function (decodedV4Actions) {
  this.applyReplayImportActions(this.resolveV4ReplayImportActionsPayload(decodedV4Actions));
};

GameManager.prototype.resolveLegacyReplayImportActionsPayload = function (decodedLegacy) {
  return {
    replayMovesV2: decodedLegacy ? decodedLegacy.replayMovesV2 : null,
    replayMoves: decodedLegacy ? decodedLegacy.replayMoves : null,
    replaySpawns: decodedLegacy ? decodedLegacy.replaySpawns : undefined
  };
};

GameManager.prototype.applyLegacyReplayDecodedActions = function (decodedLegacy) {
  this.applyReplayImportActions(this.resolveLegacyReplayImportActionsPayload(decodedLegacy));
};

GameManager.prototype.resolveJsonV3ReplayImportActionsPayload = function (envelope) {
  return {
    replayMoves: envelope ? envelope.actions : null,
    replaySpawns: null
  };
};

GameManager.prototype.applyJsonV3ReplayEnvelopeActions = function (envelope) {
  this.applyReplayImportActions(this.resolveJsonV3ReplayImportActionsPayload(envelope));
};

GameManager.prototype.importJsonV3ReplayEnvelope = function (envelope, replayModeConfig) {
  this.applyJsonV3ReplayEnvelopeMeta(envelope, replayModeConfig);
  this.applyJsonV3ReplayEnvelopeActions(envelope);
  this.restartReplayImportSession(replayModeConfig, envelope.seed, false);
};

GameManager.prototype.importV4ReplayEnvelope = function (envelope, replayModeConfig) {
  var initialBoard = this.decodeBoardV4(envelope.initialBoardEncoded);
  var decodedV4Actions = this.decodeReplayV4Actions(envelope.actionsEncoded);
  this.applyV4ReplayDecodedActions(decodedV4Actions);
  this.restartReplayImportSession(replayModeConfig, initialBoard, true);
};

GameManager.prototype.importLegacyReplayPayload = function (decodedLegacy) {
  this.applyLegacyReplayDecodedActions(decodedLegacy);
  this.restartLegacyReplayImportSession(decodedLegacy.seed);
};

GameManager.prototype.normalizeReplayImportInput = function (replayString) {
  return this.coerceReplayImportInputToString(replayString).trim();
};

GameManager.prototype.coerceReplayImportInputToString = function (replayString) {
  if (typeof replayString === "string") return replayString;
  return JSON.stringify(replayString);
};

GameManager.prototype.isSupportedReplayEnvelopeKind = function (kind) {
  return kind === "json-v3" || kind === "v4c";
};

GameManager.prototype.importParsedReplayEnvelopeByKind = function (parsedEnvelope, replayModeConfig) {
  if (parsedEnvelope.kind === "json-v3") {
    this.importJsonV3ReplayEnvelope(parsedEnvelope, replayModeConfig);
    return true;
  }
  if (parsedEnvelope.kind === "v4c") {
    this.importV4ReplayEnvelope(parsedEnvelope, replayModeConfig);
    return true;
  }
  return false;
};

GameManager.prototype.tryImportParsedReplayEnvelope = function (parsedEnvelope) {
  if (!parsedEnvelope || !this.isSupportedReplayEnvelopeKind(parsedEnvelope.kind)) return false;
  var replayModeConfig = this.resolveModeConfig(parsedEnvelope.modeKey);
  return this.importParsedReplayEnvelopeByKind(parsedEnvelope, replayModeConfig);
};

GameManager.prototype.tryImportLegacyReplayString = function (trimmedReplayString) {
  var decodedLegacy = this.decodeLegacyReplay(trimmedReplayString);
  if (!decodedLegacy) return false;
  this.importLegacyReplayPayload(decodedLegacy);
  return true;
};

GameManager.prototype.tryImportReplayEnvelopeString = function (trimmedReplayString) {
  var parsedEnvelope = this.parseReplayImportEnvelope(trimmedReplayString);
  return this.tryImportParsedReplayEnvelope(parsedEnvelope);
};

GameManager.prototype.throwUnknownReplayVersion = function () {
  throw "Unknown replay version";
};

GameManager.prototype.importReplayOrThrow = function (trimmedReplayString) {
  if (this.tryImportReplayEnvelopeString(trimmedReplayString)) return;
  if (this.tryImportLegacyReplayString(trimmedReplayString)) return;
  this.throwUnknownReplayVersion();
};

GameManager.prototype.import = function (replayString) {
  try {
    var trimmed = this.normalizeReplayImportInput(replayString);
    this.importReplayOrThrow(trimmed);
  } catch (e) {
    alert("导入回放出错: " + e);
  }
};

GameManager.prototype.executeReplayAction = function (action) {
  var resolved = this.resolveReplayExecution(action);
  var dispatchPlan = this.planReplayDispatch(resolved);
  this.executeReplayDispatchPlan(dispatchPlan);
};

GameManager.prototype.executeReplayDispatchPlan = function (dispatchPlan) {
  var executorMethodName = this.resolveReplayDispatchExecutorMethodName(dispatchPlan && dispatchPlan.method);
  if (executorMethodName) return this[executorMethodName](dispatchPlan);
  throw "Unknown replay action";
};

GameManager.prototype.resolveReplayDispatchExecutorMethodName = function (dispatchMethod) {
  if (dispatchMethod === "move") return "executeReplayMoveDispatch";
  if (dispatchMethod === "insertCustomTile") return "executeReplayCustomTileDispatch";
  return null;
};

GameManager.prototype.executeReplayMoveDispatch = function (dispatchPlan) {
  this.move(dispatchPlan.args[0]);
};

GameManager.prototype.executeReplayCustomTileDispatch = function (dispatchPlan) {
  this.insertCustomTile(dispatchPlan.args[0], dispatchPlan.args[1], dispatchPlan.args[2]);
};

GameManager.prototype.applyReplayStepForcedSpawn = function (stepExecutionPlan) {
  if (stepExecutionPlan.shouldInjectForcedSpawn) {
    this.forcedSpawn = stepExecutionPlan.forcedSpawn;
  }
};

GameManager.prototype.applyReplayStepExecutionPlan = function (stepExecutionPlan) {
  this.applyReplayStepForcedSpawn(stepExecutionPlan);
  this.executeReplayAction(stepExecutionPlan.action);
  this.replayIndex = stepExecutionPlan.nextReplayIndex;
};

GameManager.prototype.executePlannedReplayStep = function () {
  var stepExecutionPlan = this.planReplayStepExecution();
  this.applyReplayStepExecutionPlan(stepExecutionPlan);
};

GameManager.prototype.clearReplayIntervalIfNeeded = function (shouldClearInterval) {
  if (shouldClearInterval !== false) {
    clearInterval(this.replayInterval);
  }
};

GameManager.prototype.scheduleReplayInterval = function (delay) {
  var self = this;
  this.replayInterval = setInterval(function () {
    self.runReplayTick();
  }, delay);
};

GameManager.prototype.applyReplayPauseState = function (pauseState) {
  var state = pauseState && typeof pauseState === "object" ? pauseState : {};
  this.isPaused = state.isPaused !== false;
  this.clearReplayIntervalIfNeeded(state.shouldClearInterval);
};

GameManager.prototype.pause = function () {
    var pauseState = this.computeReplayPauseState();
    this.applyReplayPauseState(pauseState);
};

GameManager.prototype.applyReplayResumeState = function (resumeState) {
    var state = resumeState && typeof resumeState === "object" ? resumeState : {};
    this.isPaused = !!state.isPaused ? true : false;
    this.clearReplayIntervalIfNeeded(state.shouldClearInterval);
    this.scheduleReplayInterval(state.delay);
};

GameManager.prototype.resume = function () {
    var resumeState = this.computeReplayResumeState();
    this.applyReplayResumeState(resumeState);
};

GameManager.prototype.applyReplaySpeedState = function (speedState) {
    var state = speedState && typeof speedState === "object" ? speedState : {};
    this.replayDelay = state.replayDelay;
    if (state.shouldResume) {
        this.resume(); // Restart interval with new delay
    }
};

GameManager.prototype.setSpeed = function (multiplier) {
    var speedState = this.computeReplaySpeedState(multiplier);
    this.applyReplaySpeedState(speedState);
};

GameManager.prototype.applyReplaySeekRestartPlan = function (restartPlan) {
    if (!restartPlan || typeof restartPlan !== "object") return;
    if (restartPlan.shouldRestartWithBoard) {
        this.restartReplaySession(this.replayStartBoardMatrix, this.modeConfig, true);
    }
    if (restartPlan.shouldRestartWithSeed) {
        this.restartReplaySession(this.initialSeed, this.modeConfig, false);
    }
    if (restartPlan.shouldApplyReplayIndex) {
        this.replayIndex = restartPlan.replayIndex;
    }
};

GameManager.prototype.fastForwardReplayToIndex = function (targetIndex) {
    while (this.replayIndex < targetIndex) {
        this.executePlannedReplayStep();
    }
};

GameManager.prototype.applyReplaySeekTarget = function (targetIndex) {
    var restartPlan = this.resolveReplaySeekRestartPlanForTarget(targetIndex);
    this.applyReplaySeekRestartPlan(restartPlan);
    this.fastForwardReplayToIndex(targetIndex);
};

GameManager.prototype.seek = function (targetIndex) {
    targetIndex = this.normalizeReplaySeekTarget(targetIndex);

    this.pause(); // Pause while seeking

    this.applyReplaySeekTarget(targetIndex);
};

GameManager.prototype.step = function (delta) {
    if (!this.replayMoves) return;
    this.seek(this.replayIndex + delta);
};
