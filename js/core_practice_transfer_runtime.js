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

  function safeReadStorageItem(storage, key) {
    if (!storage || !key) return null;
    try {
      return storage.getItem(key);
    } catch (_err) {
      return null;
    }
  }

  function hasCookieFlag(cookie, key, value) {
    if (!cookie || !key) return false;
    return cookie.indexOf(key + "=" + value) !== -1;
  }

  function hasWindowNameFlag(windowName, flag) {
    if (!windowName || !flag) return false;
    return windowName.indexOf(flag) !== -1;
  }

  function appendQueryParam(url, key, value) {
    var sep = url.indexOf("?") === -1 ? "?" : "&";
    return url + sep + encodeURIComponent(key) + "=" + encodeURIComponent(value);
  }

  function hasPracticeGuideSeen(options) {
    var opts = options || {};
    var guideShownKey =
      typeof opts.guideShownKey === "string" && opts.guideShownKey
        ? opts.guideShownKey
        : "practice_guide_shown_v2";
    var guideSeenFlag =
      typeof opts.guideSeenFlag === "string" && opts.guideSeenFlag
        ? opts.guideSeenFlag
        : "practice_guide_seen_v2=1";
    var cookie = typeof opts.cookie === "string" ? opts.cookie : "";
    var windowName = typeof opts.windowName === "string" ? opts.windowName : "";

    return (
      safeReadStorageItem(opts.localStorageLike || null, guideShownKey) === "1" ||
      safeReadStorageItem(opts.sessionStorageLike || null, guideShownKey) === "1" ||
      hasCookieFlag(cookie, guideShownKey, "1") ||
      hasWindowNameFlag(windowName, guideSeenFlag)
    );
  }

  function buildPracticeBoardUrl(options) {
    var opts = options || {};
    var basePath =
      typeof opts.basePath === "string" && opts.basePath
        ? opts.basePath
        : "Practice_board.html";
    var token = typeof opts.token === "string" ? opts.token : "";
    var ruleset = opts.practiceRuleset === "fibonacci" ? "fibonacci" : "pow2";
    var url = basePath + "?practice_token=" + encodeURIComponent(token);
    url = appendQueryParam(url, "practice_ruleset", ruleset);
    if (opts.includeGuideSeen) {
      url = appendQueryParam(url, "practice_guide_seen", "1");
    }
    if (opts.includePayload && typeof opts.payload === "string" && opts.payload) {
      url = appendQueryParam(url, "practice_payload", opts.payload);
    }
    return url;
  }

  function buildPracticeTransferToken(options) {
    var opts = options || {};
    var nowMs = Number.isFinite(opts.nowMs) ? Number(opts.nowMs) : Date.now();
    var prefix = typeof opts.prefix === "string" && opts.prefix ? opts.prefix : "p";
    var randomSource = typeof opts.randomLike === "function" ? opts.randomLike : Math.random;
    var randomValue = 0;
    try {
      randomValue = Number(randomSource());
    } catch (_err) {
      randomValue = 0;
    }
    if (!Number.isFinite(randomValue)) randomValue = 0;
    var suffix = randomValue.toString(36).slice(2, 8);
    return prefix + nowMs + "_" + suffix;
  }

  function buildPracticeTransferPayload(options) {
    var opts = options || {};
    var createdAt = Number.isFinite(opts.nowMs) ? Number(opts.nowMs) : Date.now();
    return {
      token: String(opts.token || ""),
      created_at: createdAt,
      board: cloneJsonSafe(opts.board) || opts.board,
      mode_config: opts.modeConfig
    };
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
  global.CorePracticeTransferRuntime.appendQueryParam = appendQueryParam;
  global.CorePracticeTransferRuntime.hasPracticeGuideSeen = hasPracticeGuideSeen;
  global.CorePracticeTransferRuntime.buildPracticeBoardUrl = buildPracticeBoardUrl;
  global.CorePracticeTransferRuntime.buildPracticeTransferToken = buildPracticeTransferToken;
  global.CorePracticeTransferRuntime.buildPracticeTransferPayload = buildPracticeTransferPayload;
  global.CorePracticeTransferRuntime.buildPracticeModeConfigFromCurrent =
    buildPracticeModeConfigFromCurrent;
})(typeof window !== "undefined" ? window : undefined);
