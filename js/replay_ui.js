(function () {
  "use strict";

  var REPLAY_LOGIC_VERSION = "v1";
  var CLOUD_REPLAY_STORAGE_KEY = "cloud_replay_payload_v1";
  var LOCAL_REPLAY_HANDOFF_STORAGE_PREFIX = "replay_export_payload_v1:";
  var REPLAY_UI_ACTIVE_INTERVAL_MS = 220;
  var REPLAY_UI_IDLE_INTERVAL_MS = 1000;
  var REPLAY_UI_HIDDEN_INTERVAL_MS = 1800;
  var REPLAY_COMPATIBILITY_BANNER_ID = "replay-compatibility-banner";

  var isScrubbing = false;
  var replayRelayoutTimer = null;
  var replaySeekRafId = 0;
  var replayPendingSeekValue = null;
  var replayUiRefreshRafId = 0;
  var replayUiTickTimer = 0;
  var replayUiTickStarted = false;
  var replayUiInitialized = false;
  var replayQueryRetryCount = 0;
  var replayQueryRetryTimer = 0;
  var REPLAY_QUERY_MAX_RETRIES = 180;
  var replayDiagnosticsVisible = false;
  var replayStepIntervalMs = 100;
  var replayPlaybackMode = "fixed";
  var replayAutoPlaybackTimer = 0;
  var replayAutoPlaybackActive = false;
  var replayInitialEmptyBoardResolved = false;
  var REPLAY_STEP_INTERVAL_MIN_MS = 1;
  var REPLAY_STEP_INTERVAL_MAX_MS = 10000;
  var replayPauseBridgeSuppressed = false;
  var replayTimelineMeta = {
    available: false,
    stepDurationsMs: [],
    cumulativeMsByStep: [],
    totalMs: 0,
    startUnixMs: null
  };

  var cloudReplayContract =
    window && window.CLOUD_REPLAY_CONTRACT && typeof window.CLOUD_REPLAY_CONTRACT === "object"
      ? window.CLOUD_REPLAY_CONTRACT
      : {};
  var CLOUD_REPLAY_PAYLOAD_VERSION = normalizePositiveInteger(cloudReplayContract.cloud_payload_version) || 2;
  var CLOUD_REPLAY_FILE_VERSION = normalizePositiveInteger(cloudReplayContract.replay_file_version) || 1;

  var COPY = {
    zh: {
      pause: "\u6682\u505c",
      play: "\u64ad\u653e",
      importTitle: "\u5bfc\u5165\u56de\u653e",
      importAction: "\u5f00\u59cb\u56de\u653e",
      importFileFailed: "\u5bfc\u5165\u56de\u653e\u6587\u4ef6\u5931\u8d25",
      importReplayFailed: "\u5bfc\u5165\u56de\u653e\u5931\u8d25",
      cloudLoadFailed: "\u52a0\u8f7d\u4e91\u7aef\u56de\u653e\u5931\u8d25",
      localLoadFailed: "\u52a0\u8f7d\u672c\u5730\u56de\u653e\u5931\u8d25",
      localReplayTitle: "\u672c\u5730\u8bb0\u5f55",
      cloudReplayTitle: "\u4e91\u7aef\u8bb0\u5f55",
      missingReplay: "\u56de\u653e\u6570\u636e\u4e3a\u7a7a",
      unsupportedDiagonalReplay:
        "\u5f53\u524d\u56de\u653e\u4e3a\u516b\u65b9\u5411\u6a21\u5f0f\uff0c\u5fc5\u987b\u63d0\u4f9b\u7ed3\u6784\u5316\u56de\u653e\u6570\u636e\uff08\u542b seed + actions + mode_key\uff09\u3002",
      versionMismatchPayload: "\u4e91\u7aef\u8f7d\u8377\u7248\u672c\u4e0d\u5339\u914d",
      versionMismatchFile: "\u56de\u653e\u6587\u4ef6\u7248\u672c\u4e0d\u5339\u914d",
      refreshAndRetry: "\u8bf7\u5237\u65b0\u540e\u91cd\u8bd5\u3002",
      diagnosticsPrefix: "\u8bca\u65ad"
    },
    en: {
      pause: "Pause",
      play: "Play",
      importTitle: "Import Replay",
      importAction: "Start Replay",
      importFileFailed: "Failed to import replay file",
      importReplayFailed: "Failed to import replay",
      cloudLoadFailed: "Failed to load cloud replay",
      localLoadFailed: "Failed to load local replay",
      localReplayTitle: "Local Record",
      cloudReplayTitle: "Cloud Record",
      missingReplay: "Replay payload is empty",
      unsupportedDiagonalReplay:
        "Diagonal replay requires structured payload with seed + actions + mode_key.",
      versionMismatchPayload: "Cloud payload version mismatch",
      versionMismatchFile: "Replay file version mismatch",
      refreshAndRetry: "Please refresh and retry.",
      diagnosticsPrefix: "Diagnostics"
    }
  };

  function toText(value) {
    return value == null ? "" : String(value);
  }

  function isObject(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
  }

  function normalizePositiveInteger(value) {
    var parsed = Math.floor(Number(value) || 0);
    return parsed > 0 ? parsed : 0;
  }

  function resolveStorageRuntime() {
    if (!window) return null;
    var runtime = window.CoreStorageRuntime;
    return runtime && typeof runtime === "object" ? runtime : null;
  }

  function resolveNamedStorage(storageName) {
    var runtime = resolveStorageRuntime();
    if (runtime && typeof runtime.resolveStorageByName === "function") {
      return runtime.resolveStorageByName({
        windowLike: window,
        storageName: storageName
      });
    }
    if (!window) return null;
    try {
      var storage = window[storageName];
      if (!storage) return null;
      if (
        typeof storage.getItem === "function" ||
        typeof storage.setItem === "function" ||
        typeof storage.removeItem === "function"
      ) {
        return storage;
      }
    } catch (_error) {}
    return null;
  }

  function safeReadStorageItem(storageName, key) {
    var runtime = resolveStorageRuntime();
    var storage = resolveNamedStorage(storageName);
    if (!storage || !key) return null;
    if (runtime && typeof runtime.safeReadStorageItem === "function") {
      return runtime.safeReadStorageItem({
        storageLike: storage,
        key: key
      });
    }
    try {
      if (typeof storage.getItem !== "function") return null;
      return storage.getItem(key);
    } catch (_error) {
      return null;
    }
  }

  function safeRemoveStorageItem(storageName, key) {
    var storage = resolveNamedStorage(storageName);
    if (!storage || !key) return;
    try {
      if (typeof storage.removeItem !== "function") return;
      storage.removeItem(key);
    } catch (_error) {}
  }

  function readLocalStorageItem(key) {
    return safeReadStorageItem("localStorage", key);
  }

  function removeLocalStorageItem(key) {
    safeRemoveStorageItem("localStorage", key);
  }

  function readSessionStorageItem(key) {
    return safeReadStorageItem("sessionStorage", key);
  }

  function removeSessionStorageItem(key) {
    safeRemoveStorageItem("sessionStorage", key);
  }

  function resolveLanguage() {
    try {
      if (window.UII18N && typeof window.UII18N.getLanguage === "function") {
        var lang = toText(window.UII18N.getLanguage()).toLowerCase();
        if (lang.indexOf("en") === 0) return "en";
      }
      var stored = toText(readLocalStorageItem("ui_language_v1")).toLowerCase();
      if (stored.indexOf("en") === 0) return "en";
    } catch (_error) {}
    return "zh";
  }

  function t(key) {
    var lang = resolveLanguage();
    return (COPY[lang] && COPY[lang][key]) || (COPY.zh && COPY.zh[key]) || "";
  }

  function resolveReplayTimelineLabel(key) {
    var isEn = resolveLanguage() === "en";
    if (key === "stepTime") return isEn ? "Step Time" : "\u5355\u6b65\u7528\u65f6";
    if (key === "score") return isEn ? "Score" : "\u5206\u6570";
    if (key === "stats") return isEn ? "Statistics" : "\u7edf\u8ba1\u4fe1\u606f";
    if (key === "statsTitle") return isEn ? "Replay Statistics" : "\u56de\u653e\u7edf\u8ba1\u4fe1\u606f";
    if (key === "statsSpawn1") return isEn ? "Spawn 1 Count" : "\u51fa1\u6570\u91cf";
    if (key === "statsSpawn2") return isEn ? "Spawn 2 Count" : "\u51fa2\u6570\u91cf";
    if (key === "statsSpawn4") return isEn ? "Spawn 4 Count" : "\u51fa4\u6570\u91cf";
    if (key === "statsSpawn2Rate") return isEn ? "Spawn 2 Rate" : "2\u7387";
    if (key === "statsSpawn4Rate") return isEn ? "Spawn 4 Rate" : "4\u7387";
    if (key === "statsTotalSteps") return isEn ? "Total Steps" : "\u603b\u6b65\u6570";
    if (key === "statsAvgSpeed") return isEn ? "Average Speed" : "\u5e73\u5747\u901f\u5ea6";
    if (key === "statsAvgSpeedUnit") return isEn ? "s/step" : "\u79d2/\u6b65";
    if (key === "statsNoData") return isEn ? "No replay statistics available." : "\u6682\u65e0\u53ef\u7528\u7edf\u8ba1\u6570\u636e\u3002";
    if (key === "speedSettings") return isEn ? "Set Speed" : "\u8bbe\u7f6e\u901f\u5ea6";
    if (key === "importFile") return isEn ? "Import Replay" : "\u5bfc\u5165\u56de\u653e";
    if (key === "importText") return isEn ? "Paste Replay" : "\u7c98\u8d34\u56de\u653e";
    if (key === "emptyDiagnostics") return isEn ? "No diagnostics available." : "\u6682\u65e0\u7edf\u8ba1\u4fe1\u606f";
    if (key === "setSpeedTitle") return isEn ? "Set Step Duration (ms)" : "\u8bbe\u7f6e\u5355\u6b65\u901f\u5ea6\uff08ms\uff09";
    if (key === "setSpeedAction") return isEn ? "Apply" : "\u786e\u5b9a";
    if (key === "originalSpeed") return isEn ? "Replay At Original Speed" : "\u6309\u539f\u901f\u56de\u653e";
    if (key === "originalSpeedTitle") return isEn ? "Original" : "\u539f\u901f";
    if (key === "setSpeedInvalid")
      return isEn
        ? "Invalid speed, please enter 1-10000 ms."
        : "\u8f93\u5165\u65e0\u6548\uff0c\u8bf7\u8f93\u5165 1-10000 ms\u3002";
    if (key === "rewind10") return isEn ? "Back 10" : "\u900010";
    if (key === "rewind1") return isEn ? "Back 1" : "\u90001";
    if (key === "forward1") return isEn ? "Next 1" : "\u8fdb1";
    if (key === "forward10") return isEn ? "Next 10" : "\u8fdb10";
    return "";
  }

  function resolveReplayPageTitle() {
    return resolveLanguage() === "en" ? "Replay" : "\u56de\u653e";
  }

  function syncReplayDocumentTitle() {
    if (!document) return;
    var nextTitle = resolveReplayPageTitle();
    if (document.title !== nextTitle) {
      document.title = nextTitle;
    }
  }

  function pad2(value) {
    var num = Math.floor(Number(value) || 0);
    if (num < 10) return "0" + String(num);
    return String(num);
  }

  function formatDurationMs(msValue) {
    var totalSeconds = Math.max(0, Math.floor((Number(msValue) || 0) / 1000));
    var hours = Math.floor(totalSeconds / 3600);
    var minutes = Math.floor((totalSeconds % 3600) / 60);
    var seconds = totalSeconds % 60;
    return pad2(hours) + ":" + pad2(minutes) + ":" + pad2(seconds);
  }

  function formatStepDurationSeconds(msValue) {
    var numeric = Number(msValue);
    if (!Number.isFinite(numeric) || numeric <= 0) return "0.0000 s";
    return (numeric / 1000).toFixed(4) + " s";
  }

  function formatReplayStartTime(startUnixMs) {
    var numeric = Number(startUnixMs);
    if (!Number.isFinite(numeric) || numeric <= 0) return "";
    var date = new Date(numeric);
    if (Number.isNaN(date.getTime())) return "";
    return (
      date.getFullYear() +
      "-" +
      pad2(date.getMonth() + 1) +
      "-" +
      pad2(date.getDate()) +
      " " +
      pad2(date.getHours()) +
      ":" +
      pad2(date.getMinutes()) +
      ":" +
      pad2(date.getSeconds())
    );
  }

  function resetReplayTimelineMeta() {
    replayTimelineMeta.available = false;
    replayTimelineMeta.stepDurationsMs = [];
    replayTimelineMeta.cumulativeMsByStep = [];
    replayTimelineMeta.totalMs = 0;
    replayTimelineMeta.startUnixMs = null;
  }

  function normalizeReplayDeltaMs(raw) {
    var numeric = Number(raw);
    if (!Number.isFinite(numeric) || numeric <= 0) return 0;
    return Math.floor(numeric);
  }

  function applyReplayTimelineFromV1Decoded(decoded) {
    resetReplayTimelineMeta();
    if (!decoded || !Array.isArray(decoded.records)) return;

    var deltas = [];
    var records = decoded.records;
    for (var i = 0; i < records.length; i += 1) {
      var record = records[i];
      if (!record) continue;
      if (record.kind === "move" || record.kind === "undo1") {
        deltas.push(normalizeReplayDeltaMs(record.deltaMs));
        continue;
      }
      if (record.kind === "undon") {
        var count = Math.max(1, Math.floor(Number(record.undoCount) || 0));
        var totalDelta = normalizeReplayDeltaMs(record.deltaMs);
        var base = Math.floor(totalDelta / count);
        var extra = totalDelta - base * count;
        for (var j = 0; j < count; j += 1) {
          deltas.push(base + (j < extra ? 1 : 0));
        }
      }
    }

    if (!deltas.length) return;

    var cumulative = [];
    var running = 0;
    for (var index = 0; index < deltas.length; index += 1) {
      running += deltas[index];
      cumulative.push(running);
    }

    replayTimelineMeta.available = true;
    replayTimelineMeta.stepDurationsMs = deltas;
    replayTimelineMeta.cumulativeMsByStep = cumulative;
    replayTimelineMeta.totalMs = running;
    var startUnixMs = Number(decoded.startUnixMs);
    replayTimelineMeta.startUnixMs = Number.isFinite(startUnixMs) && startUnixMs > 0
      ? Math.floor(startUnixMs)
      : null;
  }

  function resolveReplayV1PrefixForTimeline() {
    var gameManagerCtor = window && window.GameManager;
    var fromCtor = toText(gameManagerCtor && gameManagerCtor.REPLAY_V1_RPL_BASE64_PREFIX).trim();
    if (fromCtor) return fromCtor;
    return "REPLAY_v1RPL_B64_";
  }

  function decodeReplayBase64ToBytes(base64Text) {
    var base64 = toText(base64Text).replace(/\s+/g, "");
    if (!base64) return new Uint8Array(0);
    var normalized = base64.replace(/-/g, "+").replace(/_/g, "/");
    var mod = normalized.length % 4;
    if (mod === 2) normalized += "==";
    else if (mod === 3) normalized += "=";
    else if (mod === 1) throw new Error("invalid_base64_length");

    var binary = window.atob(normalized);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i) & 0xff;
    }
    return bytes;
  }

  function normalizeReplayBufferToBytes(sourceBuffer) {
    if (!sourceBuffer) return null;
    if (sourceBuffer instanceof Uint8Array) return sourceBuffer;
    if (sourceBuffer instanceof ArrayBuffer) return new Uint8Array(sourceBuffer);
    if (typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView && ArrayBuffer.isView(sourceBuffer)) {
      return new Uint8Array(sourceBuffer.buffer, sourceBuffer.byteOffset, sourceBuffer.byteLength);
    }
    return null;
  }

  function hasReplayV1Magic(bytes) {
    return !!(bytes && bytes.length >= 4 && bytes[0] === 82 && bytes[1] === 80 && bytes[2] === 76 && bytes[3] === 49);
  }

  function captureReplayTimelineFromReplayPayload(payload) {
    resetReplayTimelineMeta();
    var text = toText(payload).trim();
    var prefix = resolveReplayV1PrefixForTimeline();
    if (!text || text.indexOf(prefix) !== 0) return;

    var codec = window.CoreReplayCodecRuntime;
    if (!(codec && typeof codec.decodeReplayV1Rpl === "function")) return;

    try {
      var body = text.substring(prefix.length);
      if (!body) return;
      var bytes = decodeReplayBase64ToBytes(body);
      var decoded = codec.decodeReplayV1Rpl(bytes);
      applyReplayTimelineFromV1Decoded(decoded);
    } catch (_error) {
      resetReplayTimelineMeta();
    }
  }

  function captureReplayTimelineFromRplBuffer(sourceBuffer) {
    resetReplayTimelineMeta();
    var codec = window.CoreReplayCodecRuntime;
    if (!(codec && typeof codec.decodeReplayV1Rpl === "function")) return;

    try {
      var bytes = normalizeReplayBufferToBytes(sourceBuffer);
      if (!hasReplayV1Magic(bytes)) return;
      var decoded = codec.decodeReplayV1Rpl(bytes);
      applyReplayTimelineFromV1Decoded(decoded);
    } catch (_error) {
      resetReplayTimelineMeta();
    }
  }

  function ensureReplayStepTimerElement() {
    return document.getElementById("replay-step-timer");
  }

  function ensureReplayScoreElement() {
    return document.getElementById("replay-score-value");
  }

  function resolveReplayStepDurationMsByIndex(stepIndex) {
    var index = Math.floor(Number(stepIndex) || 0);
    if (index < 0) return 0;
    var durations = replayTimelineMeta.stepDurationsMs;
    if (Array.isArray(durations) && index < durations.length) {
      var value = normalizeReplayDeltaMs(durations[index]);
      if (value > 0) return value;
    }
    return 0;
  }

  function resolveReplayCurrentStepDurationMs(gameManager) {
    var currentIndex = Math.max(0, Math.floor(Number(gameManager && gameManager.replayIndex) || 0));
    if (currentIndex <= 0) return 0;
    return resolveReplayStepDurationMsByIndex(currentIndex - 1);
  }

  function updateReplayStepTimerUI(gameManager) {
    var node = ensureReplayStepTimerElement();
    if (!node) return;

    var durationMs = resolveReplayCurrentStepDurationMs(gameManager);
    var text = formatStepDurationSeconds(durationMs);
    node.textContent = text;
    node.title = resolveReplayTimelineLabel("stepTime") + ": " + text;
  }

  function updateReplayScoreCardUI(gameManager) {
    var node = ensureReplayScoreElement();
    if (!node) return;
    var numeric = Math.max(0, Math.floor(Number(gameManager && gameManager.score) || 0));
    node.textContent = numeric.toLocaleString("en-US");
  }

  function updateReplayStatLabelsUI() {
    syncReplayDocumentTitle();

    var scoreLabel = document.getElementById("replay-score-label");
    if (scoreLabel) scoreLabel.textContent = resolveReplayTimelineLabel("score") + "\uff1a";

    var stepLabel = document.getElementById("replay-step-time-label");
    if (stepLabel) stepLabel.textContent = resolveReplayTimelineLabel("stepTime") + "\uff1a";

    var statsBtn = document.getElementById("replay-toggle-diagnostics-btn");
    if (statsBtn) statsBtn.textContent = resolveReplayTimelineLabel("stats");

    var speedBtn = document.getElementById("replay-open-speed-btn");
    if (speedBtn) {
      speedBtn.textContent = resolveReplayTimelineLabel("speedSettings");
      speedBtn.title = resolveReplayPlaybackModeTitle();
    }

    var speedModeText = document.getElementById("replay-speed-mode-text");
    if (speedModeText) speedModeText.textContent = resolveReplayTimelineLabel("originalSpeed");

    var importFileBtn = document.getElementById("import-replay-file-btn");
    if (importFileBtn) importFileBtn.textContent = resolveReplayTimelineLabel("importFile");

    var importTextBtn = document.getElementById("import-replay-text-btn");
    if (importTextBtn) importTextBtn.textContent = resolveReplayTimelineLabel("importText");

    var rewind10Btn = document.getElementById("btn-rewind-10");
    if (rewind10Btn) rewind10Btn.textContent = resolveReplayTimelineLabel("rewind10");

    var rewind1Btn = document.getElementById("btn-rewind-1");
    if (rewind1Btn) rewind1Btn.textContent = resolveReplayTimelineLabel("rewind1");

    var forward1Btn = document.getElementById("btn-forward-1");
    if (forward1Btn) forward1Btn.textContent = resolveReplayTimelineLabel("forward1");

    var forward10Btn = document.getElementById("btn-forward-10");
    if (forward10Btn) forward10Btn.textContent = resolveReplayTimelineLabel("forward10");
  }

  function cloneShallow(source) {
    var out = {};
    if (!isObject(source)) return out;
    var keys = Object.keys(source);
    for (var i = 0; i < keys.length; i += 1) {
      out[keys[i]] = source[keys[i]];
    }
    return out;
  }

  function safeJsonParse(text) {
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch (_error) {
      return null;
    }
  }

  function normalizeModeKey(value) {
    return toText(value).trim();
  }

  function startsWithIgnoreCase(text, prefix) {
    var source = toText(text);
    var token = toText(prefix);
    if (!source || !token || source.length < token.length) return false;
    return source.substring(0, token.length).toLowerCase() === token.toLowerCase();
  }

  function isStructuredReplayPayload(value) {
    return !!(isObject(value) && Array.isArray(value.actions));
  }

  function isStructuredReplayPayloadV1(value) {
    if (!isStructuredReplayPayload(value)) return false;
    return toText(value.replay_logic_version).trim().toLowerCase() === REPLAY_LOGIC_VERSION;
  }

  function createReplayCompatibilityMeta(kind, isLegacyCompat) {
    return {
      kind: toText(kind).trim().toLowerCase(),
      isLegacyCompat: isLegacyCompat === true
    };
  }

  function resolveReplayCompatibilityMetaFromStructured(value) {
    if (Array.isArray(value)) return createReplayCompatibilityMeta("legacy_json_array", true);
    if (!isStructuredReplayPayload(value)) return null;
    if (isStructuredReplayPayloadV1(value)) {
      return createReplayCompatibilityMeta("mainstream_structured_v1", false);
    }
    return createReplayCompatibilityMeta("legacy_structured_json", true);
  }

  function resolveReplayCompatibilityMetaFromText(replayText) {
    var text = toText(replayText).trim();
    if (!text) return null;

    if (startsWithIgnoreCase(text, resolveReplayV1PrefixForTimeline())) {
      return createReplayCompatibilityMeta("mainstream_v1", false);
    }
    if (startsWithIgnoreCase(text, "replay_fib_")) {
      return createReplayCompatibilityMeta("legacy_fib_verse", true);
    }
    if (startsWithIgnoreCase(text, "replay_")) {
      return createReplayCompatibilityMeta("legacy_verse", true);
    }
    if (startsWithIgnoreCase(text, "REPLAY_v4C_")) {
      return createReplayCompatibilityMeta("legacy_v4c", true);
    }
    if (startsWithIgnoreCase(text, "REPLAY_v9RPL_B64_") || startsWithIgnoreCase(text, "REPLAY_v9RPL_")) {
      return createReplayCompatibilityMeta("legacy_v9rpl", true);
    }
    if (startsWithIgnoreCase(text, "REPLAY_v9VERSE_")) {
      return createReplayCompatibilityMeta("legacy_v9verse", true);
    }

    var firstChar = text.charAt(0);
    if (firstChar !== "{" && firstChar !== "[") return null;

    var parsed = safeJsonParse(text);
    var structuredMeta = resolveReplayCompatibilityMetaFromStructured(parsed);
    if (structuredMeta) return structuredMeta;
    if (parsed !== null) return createReplayCompatibilityMeta("legacy_json", true);
    return null;
  }

  function resolveReplayImportCompatibilityMeta(recordLike, payload) {
    var source = normalizeReplayRecordLike(recordLike);
    var replayStringMeta = resolveReplayCompatibilityMetaFromText(source.replay_string);
    if (replayStringMeta) return replayStringMeta;

    var structuredMeta = resolveReplayCompatibilityMetaFromStructured(source.replay);
    if (structuredMeta) return structuredMeta;

    return resolveReplayCompatibilityMetaFromText(payload);
  }

  function resolveReplayCompatibilityKindLabel(kind) {
    var isEn = resolveLanguage() === "en";
    if (kind === "legacy_verse") {
      return isEn ? "legacy text replay (replay_)" : "\u65e7\u7248\u6587\u5b57\u56de\u653e\uff08replay_\uff09";
    }
    if (kind === "legacy_fib_verse") {
      return isEn
        ? "legacy Fibonacci text replay (replay_fib_)"
        : "\u65e7\u7248\u6590\u6ce2\u90a3\u5951\u6587\u5b57\u56de\u653e\uff08replay_fib_\uff09";
    }
    if (kind === "legacy_v4c") {
      return isEn ? "legacy compact replay (REPLAY_v4C_)" : "\u65e7\u7248\u7d27\u51d1\u56de\u653e\uff08REPLAY_v4C_\uff09";
    }
    if (kind === "legacy_v9rpl") {
      return isEn ? "legacy v9 RPL replay" : "\u65e7\u7248 v9 RPL \u56de\u653e";
    }
    if (kind === "legacy_v9verse") {
      return isEn ? "legacy v9 verse replay" : "\u65e7\u7248 v9 verse \u56de\u653e";
    }
    if (kind === "legacy_structured_json" || kind === "legacy_json" || kind === "legacy_json_array") {
      return isEn ? "legacy structured replay (JSON)" : "\u65e7\u7248\u7ed3\u6784\u5316\u56de\u653e\uff08JSON\uff09";
    }
    return isEn ? "legacy replay" : "\u65e7\u7248\u56de\u653e";
  }

  function buildReplayCompatibilityNoticeText(meta) {
    if (!(meta && meta.isLegacyCompat)) return "";

    var label = resolveReplayCompatibilityKindLabel(meta.kind);
    if (!label) return "";

    if (resolveLanguage() === "en") {
      return (
        "Compatibility mode: this replay uses " +
        label +
        ". It has been loaded with legacy compatibility; the current mainstream format is v1 replay, so playback details or statistics may differ slightly."
      );
    }

    return (
      "\u517c\u5bb9\u63d0\u793a\uff1a\u5f53\u524d\u56de\u653e\u4e3a" +
      label +
      "\uff0c\u5df2\u6309\u517c\u5bb9\u6a21\u5f0f\u52a0\u8f7d\uff1b\u5f53\u524d\u4e3b\u6d41\u683c\u5f0f\u4e3a v1 \u56de\u653e\uff0c\u90e8\u5206\u56de\u653e\u8868\u73b0\u6216\u7edf\u8ba1\u4fe1\u606f\u53ef\u80fd\u7565\u6709\u5dee\u5f02\u3002"
    );
  }

  function ensureReplayCompatibilityBannerElement() {
    var existing = document.getElementById(REPLAY_COMPATIBILITY_BANNER_ID);
    if (existing) return existing;

    var container = document.querySelector(".container.replay-v1-page");
    if (!container) return null;

    var banner = document.createElement("div");
    banner.id = REPLAY_COMPATIBILITY_BANNER_ID;
    banner.className = "replay-compatibility-banner";
    banner.style.display = "none";
    banner.setAttribute("role", "status");
    banner.setAttribute("aria-live", "polite");

    var topStats = container.querySelector(".replay-top-stats");
    if (topStats) {
      container.insertBefore(banner, topStats);
    } else {
      container.insertBefore(banner, container.firstChild);
    }
    return banner;
  }

  function clearReplayCompatibilityNotice() {
    var banner = ensureReplayCompatibilityBannerElement();
    if (!banner) return;
    banner.textContent = "";
    banner.style.display = "none";
    banner.removeAttribute("data-compat-kind");
  }

  function applyReplayCompatibilityNotice(meta) {
    var banner = ensureReplayCompatibilityBannerElement();
    if (!banner) return;
    if (!(meta && meta.isLegacyCompat)) {
      clearReplayCompatibilityNotice();
      return;
    }

    banner.setAttribute("data-compat-kind", toText(meta.kind).trim().toLowerCase() || "legacy");
    banner.textContent = buildReplayCompatibilityNoticeText(meta);
    banner.style.display = "block";
  }

  function syncReplayCompatibilityNotice(recordLike, payload) {
    var meta = resolveReplayImportCompatibilityMeta(recordLike, payload);
    applyReplayCompatibilityNotice(meta);
    return meta;
  }

  function normalizeLegacyReplayStringForImport(replayString) {
    var text = toText(replayString).trim();
    if (!text) return "";
    return text;
  }

  function isDiagonalModeKey(modeKey) {
    var key = normalizeModeKey(modeKey).toLowerCase();
    if (!key) return false;
    if (key.indexOf("diag_") === 0) return true;
    if (key.indexOf("diagonal") !== -1) return true;
    return false;
  }

  function normalizeReplayRecordLike(raw) {
    var source = isObject(raw) ? raw : {};
    var replayObject = isObject(source.replay) ? cloneShallow(source.replay) : null;
    var replayString = toText(source.replay_string).trim();

    var modeKey = normalizeModeKey(source.mode_key || (replayObject && replayObject.mode_key));
    var boardWidth = normalizePositiveInteger(source.board_width || (replayObject && replayObject.board_width));
    var boardHeight = normalizePositiveInteger(source.board_height || (replayObject && replayObject.board_height));

    return {
      source: toText(source.source).trim().toLowerCase(),
      mode_key: modeKey,
      board_width: boardWidth,
      board_height: boardHeight,
      replay: replayObject,
      replay_string: replayString,
      replay_logic_version: toText(source.replay_logic_version || "").trim() || REPLAY_LOGIC_VERSION
    };
  }

  function isStructuredReplayCandidate(value) {
    if (!isObject(value)) return false;
    var actions = value.actions;
    return Array.isArray(actions);
  }

  function normalizeStructuredReplayV1(recordLike) {
    var source = normalizeReplayRecordLike(recordLike);
    var structured = isStructuredReplayCandidate(source.replay) ? cloneShallow(source.replay) : null;

    if (!structured && source.replay_string) {
      var first = source.replay_string.charAt(0);
      if (first === "{" || first === "[") {
        var parsed = safeJsonParse(source.replay_string);
        if (Array.isArray(parsed)) {
          structured = {
            v: 1,
            actions: parsed.slice()
          };
        } else if (isObject(parsed) && Array.isArray(parsed.actions)) {
          structured = cloneShallow(parsed);
        }
      }
    }

    if (!structured) return null;

    if (!normalizeModeKey(structured.mode_key) && source.mode_key) {
      structured.mode_key = source.mode_key;
    }
    if (!normalizePositiveInteger(structured.board_width) && source.board_width) {
      structured.board_width = source.board_width;
    }
    if (!normalizePositiveInteger(structured.board_height) && source.board_height) {
      structured.board_height = source.board_height;
    }
    if (!toText(structured.replay_logic_version).trim()) {
      structured.replay_logic_version = REPLAY_LOGIC_VERSION;
    }

    return structured;
  }

  function buildStandardReplayPayloadV1(recordLike) {
    var source = normalizeReplayRecordLike(recordLike);
    var replayCode = normalizeLegacyReplayStringForImport(source.replay_string);
    if (replayCode) return replayCode;
    var structured = normalizeStructuredReplayV1(source);
    if (!structured) return "";
    return JSON.stringify(structured);
  }

  function buildDiagonalReplayPayloadV1(recordLike) {
    var source = normalizeReplayRecordLike(recordLike);
    var structured = normalizeStructuredReplayV1(source);
    if (!structured) {
      throw new Error(t("unsupportedDiagonalReplay"));
    }

    var seed = Number(structured.seed);
    if (!Number.isFinite(seed)) {
      throw new Error(t("unsupportedDiagonalReplay"));
    }

    if (!Array.isArray(structured.actions)) {
      throw new Error(t("unsupportedDiagonalReplay"));
    }

    if (!isDiagonalModeKey(structured.mode_key || source.mode_key)) {
      structured.mode_key = source.mode_key || structured.mode_key;
    }
    return JSON.stringify(structured);
  }

  function resolveReplayPayloadForImportV1(recordLike) {
    var source = normalizeReplayRecordLike(recordLike);
    var modeKey = source.mode_key;
    if (isDiagonalModeKey(modeKey)) {
      return buildDiagonalReplayPayloadV1(source);
    }
    return buildStandardReplayPayloadV1(source);
  }

  function resolveReplayImportErrorMessage(errorLike) {
    var message = toText(errorLike && errorLike.message).trim();
    return message || toText(errorLike).trim() || "unknown";
  }

  function isGameManagerReplayReady() {
    var manager = window.game_manager;
    return !!(
      manager &&
      typeof manager.import === "function" &&
      typeof manager.pause === "function" &&
      manager.grid &&
      manager.actuator
    );
  }

  function importReplayPayloadV1(payload, sourceLabel) {
    var gameManager = window.game_manager;
    if (!gameManager || typeof gameManager.import !== "function") {
      throw new Error("game_manager_unavailable");
    }

    var replayPayload = toText(payload).trim();
    if (!replayPayload) {
      throw new Error(t("missingReplay"));
    }

    var ok = gameManager.import(replayPayload);
    if (!ok) {
      throw new Error("import_rejected:" + toText(sourceLabel || "unknown"));
    }
    return true;
  }

  function resolveReplayTitleNode() {
    return document.querySelector(".heading .title");
  }

  function setReplayPageTitleSuffix(kind) {
    var titleNode = resolveReplayTitleNode();
    if (!titleNode) return;

    var suffix = "";
    if (kind === "cloud") suffix = t("cloudReplayTitle");
    if (kind === "local") suffix = t("localReplayTitle");

    if (!suffix) return;
    titleNode.innerHTML =
      "<a href='2048.html' style='text-decoration: none; color: inherit; cursor: pointer;'>2048</a> " +
      "\u56de\u653e - " +
      suffix;
  }

  function clearReplayQueryRetryTimer() {
    if (!replayQueryRetryTimer) return;
    clearTimeout(replayQueryRetryTimer);
    replayQueryRetryTimer = 0;
  }

  function scheduleReplayQueryRetry() {
    clearReplayQueryRetryTimer();
    replayQueryRetryTimer = setTimeout(function () {
      replayQueryRetryTimer = 0;
      loadReplayFromQueryV1();
    }, 60);
  }

  function clearReplayTransientQueryParams() {
    if (
      !window ||
      !window.location ||
      !window.history ||
      typeof window.history.replaceState !== "function" ||
      typeof URL !== "function"
    ) {
      return;
    }

    var url = new URL(window.location.href);
    var changed = false;
    var transientKeys = ["cloud_replay", "local_replay", "handoff"];
    for (var i = 0; i < transientKeys.length; i += 1) {
      var key = transientKeys[i];
      if (!url.searchParams.has(key)) continue;
      url.searchParams.delete(key);
      changed = true;
    }
    if (!changed) return;

    var nextSearch = url.searchParams.toString();
    var nextUrl = url.pathname + (nextSearch ? "?" + nextSearch : "") + url.hash;
    window.history.replaceState(window.history.state, document.title, nextUrl);
  }

  function clearReplayTransientQueryState() {
    clearReplayQueryRetryTimer();
    replayQueryRetryCount = 0;
    clearReplayTransientQueryParams();
  }

  function showReplayModal(title, content, actionName, actionCallback, options) {
    var modal = document.getElementById("replay-modal");
    var titleEl = document.getElementById("replay-modal-title");
    var textEl = document.getElementById("replay-textarea");
    var singleWrap = document.getElementById("replay-singleline-wrap");
    var singleInput = document.getElementById("replay-singleline-input");
    var singleUnit = document.getElementById("replay-singleline-unit");
    var speedModeWrap = document.getElementById("replay-speed-mode-wrap");
    var speedModeCheckbox = document.getElementById("replay-speed-mode-original");
    var actionBtn = document.getElementById("replay-action-btn");
    var downloadBtn = document.getElementById("replay-download-btn");

    if (!(modal && titleEl && textEl && actionBtn)) return;

    var modalOptions = isObject(options) ? options : {};
    var useSingleLine = modalOptions.inputMode === "singleline-ms";
    var showSpeedModeToggle = modalOptions.showSpeedModeToggle === true;
    var readOnly = modalOptions.readOnly === true;
    var inputText = toText(content);

    modal.style.display = "flex";
    titleEl.textContent = title;
    textEl.value = inputText;

    if (singleWrap && singleInput) {
      singleWrap.style.display = useSingleLine ? "flex" : "none";
      if (singleUnit) {
        singleUnit.textContent = toText(modalOptions.unitText || "ms");
      }
      singleInput.value = inputText;
      singleInput.placeholder = toText(modalOptions.placeholder || "");
      singleInput.onkeydown = null;
      singleInput.disabled = false;
      singleInput.readOnly = readOnly;
      if (useSingleLine) {
        singleInput.onkeydown = function (event) {
          if (!event || event.key !== "Enter") return;
          event.preventDefault();
          if (typeof actionBtn.onclick === "function") actionBtn.onclick();
        };
      }
    }

    textEl.style.display = useSingleLine ? "none" : "block";
    textEl.readOnly = readOnly;

    if (speedModeWrap && speedModeCheckbox) {
      speedModeWrap.style.display = showSpeedModeToggle ? "block" : "none";
      var useOriginalSpeed = modalOptions.useOriginalSpeed === true;
      speedModeCheckbox.checked = useOriginalSpeed;
      if (singleInput) singleInput.disabled = useOriginalSpeed;
      speedModeCheckbox.onchange = function () {
        if (singleInput) singleInput.disabled = speedModeCheckbox.checked;
      };
    }

    if (actionName) {
      actionBtn.style.display = "inline-block";
      actionBtn.textContent = actionName;
      actionBtn.onclick = function () {
        var value = useSingleLine && singleInput ? singleInput.value : textEl.value;
        var useOriginalSpeed = !!(showSpeedModeToggle && speedModeCheckbox && speedModeCheckbox.checked);
        actionCallback(value, { useOriginalSpeed: useOriginalSpeed });
      };
    } else {
      actionBtn.style.display = "none";
      actionBtn.onclick = null;
    }

    if (downloadBtn) {
      downloadBtn.style.display = "none";
      downloadBtn.onclick = null;
    }
  }

  function resolveReplaySpawnCount(gameManager, value) {
    if (!gameManager) return 0;
    if (value === 2 && Number.isFinite(Number(gameManager.spawnTwos))) {
      return Math.max(0, Math.floor(Number(gameManager.spawnTwos) || 0));
    }
    if (value === 4 && Number.isFinite(Number(gameManager.spawnFours))) {
      return Math.max(0, Math.floor(Number(gameManager.spawnFours) || 0));
    }
    var counts = gameManager.spawnValueCounts;
    if (!(counts && typeof counts === "object")) return 0;
    return Math.max(0, Math.floor(Number(counts[String(value)]) || 0));
  }

  function resolveReplayTotalSteps(gameManager) {
    if (!gameManager) return 0;
    var replayMoves = Array.isArray(gameManager.replayMoves) ? gameManager.replayMoves : null;
    if (replayMoves) return replayMoves.length;
    var moveHistory = Array.isArray(gameManager.moveHistory) ? gameManager.moveHistory : null;
    if (moveHistory) return moveHistory.length;
    return 0;
  }

  function resolveReplayAverageSpeedSecondsPerStep(gameManager, totalSteps) {
    if (!Number.isFinite(totalSteps) || totalSteps <= 0) return null;
    var timelineMs = Number(replayTimelineMeta && replayTimelineMeta.totalMs);
    if (Number.isFinite(timelineMs) && timelineMs > 0) {
      return timelineMs / 1000 / totalSteps;
    }
    return null;
  }

  function isReplayStatsFibonacciMode(gameManager) {
    if (!gameManager) return false;
    if (typeof gameManager.isFibonacciMode === "function") {
      return !!gameManager.isFibonacciMode();
    }
    var ruleset = typeof gameManager.ruleset === "string" ? gameManager.ruleset.toLowerCase() : "";
    return ruleset === "fibonacci";
  }

  function resolveReplayStatsRateText(primaryCount, secondaryCount) {
    var primary = Math.max(0, Math.floor(Number(primaryCount) || 0));
    var secondary = Math.max(0, Math.floor(Number(secondaryCount) || 0));
    var total = primary + secondary;
    if (total <= 0) return "--";
    return ((secondary / total) * 100).toFixed(2) + "%";
  }

  function formatReplayStatsContent(gameManager) {
    if (!gameManager) return resolveReplayTimelineLabel("statsNoData");
    var fibMode = isReplayStatsFibonacciMode(gameManager);
    var primarySpawnValue = fibMode ? 1 : 2;
    var secondarySpawnValue = fibMode ? 2 : 4;
    var primarySpawnCount = resolveReplaySpawnCount(gameManager, primarySpawnValue);
    var secondarySpawnCount = resolveReplaySpawnCount(gameManager, secondarySpawnValue);
    var secondarySpawnRateText = resolveReplayStatsRateText(primarySpawnCount, secondarySpawnCount);
    var totalSteps = resolveReplayTotalSteps(gameManager);
    var avgSpeedSec = resolveReplayAverageSpeedSecondsPerStep(gameManager, totalSteps);
    var avgSpeedText = Number.isFinite(avgSpeedSec)
      ? avgSpeedSec.toFixed(4) + " " + resolveReplayTimelineLabel("statsAvgSpeedUnit")
      : "--";
    var primarySpawnLabel = fibMode ? resolveReplayTimelineLabel("statsSpawn1") : resolveReplayTimelineLabel("statsSpawn2");
    var secondarySpawnLabel = fibMode ? resolveReplayTimelineLabel("statsSpawn2") : resolveReplayTimelineLabel("statsSpawn4");
    var secondaryRateLabel = fibMode ? resolveReplayTimelineLabel("statsSpawn2Rate") : resolveReplayTimelineLabel("statsSpawn4Rate");
    return [
      primarySpawnLabel + "\uff1a" + String(primarySpawnCount),
      secondarySpawnLabel + "\uff1a" + String(secondarySpawnCount),
      secondaryRateLabel + "\uff1a" + secondarySpawnRateText,
      resolveReplayTimelineLabel("statsTotalSteps") + "\uff1a" + String(totalSteps),
      resolveReplayTimelineLabel("statsAvgSpeed") + "\uff1a" + avgSpeedText
    ].join("\n");
  }

  function openReplayStatsModal() {
    showReplayModal(
      resolveReplayTimelineLabel("statsTitle"),
      formatReplayStatsContent(window.game_manager),
      "",
      null,
      { inputMode: "multiline", readOnly: true }
    );
  }

  window.closeReplayModal = function () {
    var modal = document.getElementById("replay-modal");
    if (modal) modal.style.display = "none";
  };

  function importReplayFromTextModal() {
    showReplayModal(t("importTitle"), "", t("importAction"), function (text) {
      try {
        var source = {
          replay_string: toText(text).trim(),
          replay_logic_version: REPLAY_LOGIC_VERSION,
          source: "text"
        };
        var payload = resolveReplayPayloadForImportV1(source);
        importReplayPayloadV1(payload, "manual_text");
        syncReplayCompatibilityNotice(source, payload);
        captureReplayTimelineFromReplayPayload(payload);
        clearReplayTransientQueryState();
        window.closeReplayModal();
        if (!resumeReplayPlaybackPreferred(window.game_manager)) {
          startReplayAutoPlayback();
        }
        updateReplayUI();
      } catch (error) {
        alert(t("importReplayFailed") + ": " + resolveReplayImportErrorMessage(error));
      }
    }, { inputMode: "multiline" });
  }

  function readReplayFileAsArrayBuffer(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        resolve(reader.result);
      };
      reader.onerror = function () {
        reject(reader.error || new Error("file_read_failed"));
      };
      reader.readAsArrayBuffer(file);
    });
  }

  function readReplayFileAsText(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        resolve(typeof reader.result === "string" ? reader.result : "");
      };
      reader.onerror = function () {
        reject(reader.error || new Error("file_read_failed"));
      };
      reader.readAsText(file, "utf-8");
    });
  }

  function shouldUseBinaryReplayImport(file) {
    return !!(file && typeof file.name === "string" && file.name.toLowerCase().endsWith(".rpl"));
  }

  async function importReplayFromFile(file) {
    if (!file) return;
    var gameManager = window.game_manager;
    if (!gameManager) return;

    try {
      if (shouldUseBinaryReplayImport(file) && typeof gameManager.importV9RplBuffer === "function") {
        var buffer = await readReplayFileAsArrayBuffer(file);
        var ok = gameManager.importV9RplBuffer(buffer);
        if (!ok) throw new Error("binary_import_rejected");
        applyReplayCompatibilityNotice(createReplayCompatibilityMeta("legacy_v9rpl", true));
        captureReplayTimelineFromRplBuffer(buffer);
        clearReplayTransientQueryState();
        if (!resumeReplayPlaybackPreferred(window.game_manager)) {
          startReplayAutoPlayback();
        }
        updateReplayUI();
        return;
      }

      var replayText = await readReplayFileAsText(file);
      var source = {
        replay_string: toText(replayText).trim(),
        replay_logic_version: REPLAY_LOGIC_VERSION,
        source: "file"
      };
      var payload = resolveReplayPayloadForImportV1(source);
      importReplayPayloadV1(payload, "file_text");
      syncReplayCompatibilityNotice(source, payload);
      captureReplayTimelineFromReplayPayload(payload);
      clearReplayTransientQueryState();
      if (!resumeReplayPlaybackPreferred(window.game_manager)) {
        startReplayAutoPlayback();
      }
      updateReplayUI();
    } catch (error) {
      alert(t("importFileFailed") + ": " + resolveReplayImportErrorMessage(error));
    }
  }

  window.importReplay = function () {
    var input = document.createElement("input");
    var cleaned = false;

    function cleanupImportInput() {
      if (cleaned) return;
      cleaned = true;
      window.removeEventListener("focus", handlePickerClosed);
      if (input.parentNode) input.parentNode.removeChild(input);
    }

    function handlePickerClosed() {
      setTimeout(function () {
        var files = input.files;
        if (!files || files.length === 0) cleanupImportInput();
      }, 0);
    }

    input.type = "file";
    input.accept = ".rpl,.txt,.json,text/plain,application/octet-stream";
    input.style.display = "none";
    input.addEventListener("change", function () {
      var files = input.files;
      var file = files && files.length > 0 ? files[0] : null;
      if (file) {
        importReplayFromFile(file);
      } else {
        importReplayFromTextModal();
      }
      cleanupImportInput();
    });

    document.body.appendChild(input);
    window.addEventListener("focus", handlePickerClosed);
    input.click();
  };

  window.importReplayText = importReplayFromTextModal;

  function resolveCloudReplayVersionMismatchMessage(kind, expected, actual) {
    var expectedText = String(expected);
    var actualText = actual > 0 ? String(actual) : "missing";
    var prefix = kind === "file" ? t("versionMismatchFile") : t("versionMismatchPayload");
    return prefix + " (expected " + expectedText + ", got " + actualText + "). " + t("refreshAndRetry");
  }

  function resolveReplayDiagnosticsElement(id) {
    return document.getElementById(id);
  }

  function setReplayDiagnosticsVisible(visible) {
    replayDiagnosticsVisible = visible === true;
    var panel = resolveReplayDiagnosticsElement("replay-diagnostics-panel");
    if (!panel) return;
    panel.style.display = replayDiagnosticsVisible ? "block" : "none";

    var toggleBtn = document.getElementById("replay-toggle-diagnostics-btn");
    if (toggleBtn && toggleBtn.classList) {
      toggleBtn.classList.toggle("is-active", replayDiagnosticsVisible);
    }
  }

  function ensureReplayDiagnosticsFallbackCopy() {
    var summary = resolveReplayDiagnosticsElement("replay-diagnostics-summary");
    var samples = resolveReplayDiagnosticsElement("replay-diagnostics-samples");
    if (!(summary && samples)) return;
    var summaryText = toText(summary.textContent).trim();
    var sampleText = toText(samples.textContent).trim();
    if (!summaryText && !sampleText) {
      summary.textContent = resolveReplayTimelineLabel("emptyDiagnostics");
      samples.textContent = "";
    }
  }

  function clearReplayDiagnosticsPanel() {
    var summary = resolveReplayDiagnosticsElement("replay-diagnostics-summary");
    var samples = resolveReplayDiagnosticsElement("replay-diagnostics-samples");
    if (summary) summary.textContent = "";
    if (samples) samples.textContent = "";
    setReplayDiagnosticsVisible(false);
  }

  function normalizeReplayDiagnosticsEntry(rawEntry) {
    if (!isObject(rawEntry)) return null;
    var key = toText(rawEntry.key).trim();
    var schemaVersion = Number(rawEntry.schemaVersion);
    if (!key || !Number.isInteger(schemaVersion) || schemaVersion < 1) return null;
    if (!isObject(rawEntry.payload)) return null;
    return {
      key: key,
      schemaVersion: schemaVersion,
      payload: rawEntry.payload
    };
  }

  function resolveReplaySecondaryPlacementDiagnosticsEntry(record) {
    var entries = Array.isArray(record && record.diagnostics_index_entries)
      ? record.diagnostics_index_entries
      : [];
    for (var i = 0; i < entries.length; i += 1) {
      var entry = normalizeReplayDiagnosticsEntry(entries[i]);
      if (entry && entry.key === "secondaryTimerPlacement") return entry;
    }
    return null;
  }

  function renderReplayDiagnosticsPanelFromRecord(record) {
    var panel = resolveReplayDiagnosticsElement("replay-diagnostics-panel");
    var summary = resolveReplayDiagnosticsElement("replay-diagnostics-summary");
    var samples = resolveReplayDiagnosticsElement("replay-diagnostics-samples");
    if (!(panel && summary && samples)) return;

    var entry = resolveReplaySecondaryPlacementDiagnosticsEntry(record);
    if (!entry) {
      summary.textContent = resolveReplayTimelineLabel("emptyDiagnostics");
      samples.textContent = "";
      setReplayDiagnosticsVisible(replayDiagnosticsVisible);
      return;
    }

    var payload = entry.payload || {};
    var lang = resolveLanguage();
    var summaryText = "";
    if (lang === "en") {
      summaryText =
        t("diagnosticsPrefix") +
        " secondaryTimerPlacement(v" +
        String(entry.schemaVersion) +
        ") valid " +
        String(Number(payload.validPlacementDescriptors) || 0) +
        " placed " +
        String(Number(payload.placed) || 0) +
        " skippedDuplicate " +
        String(Number(payload.skippedDuplicate) || 0) +
        " skippedMissingAnchor " +
        String(Number(payload.skippedMissingAnchor) || 0);
    } else {
      summaryText =
        t("diagnosticsPrefix") +
        " secondaryTimerPlacement(v" +
        String(entry.schemaVersion) +
        ") \u6709\u6548 " +
        String(Number(payload.validPlacementDescriptors) || 0) +
        " \u653e\u7f6e " +
        String(Number(payload.placed) || 0) +
        " \u53bb\u91cd\u8df3\u8fc7 " +
        String(Number(payload.skippedDuplicate) || 0) +
        " \u7f3a\u5931\u951a\u70b9 " +
        String(Number(payload.skippedMissingAnchor) || 0);
    }

    summary.textContent = summaryText;

    var sampleSource = Array.isArray(payload.dedupeKeySamples) ? payload.dedupeKeySamples : [];
    var normalizedSamples = [];
    for (var i = 0; i < sampleSource.length; i += 1) {
      var sample = toText(sampleSource[i]).trim();
      if (!sample) continue;
      normalizedSamples.push(sample);
      if (normalizedSamples.length >= 3) break;
    }
    samples.textContent = normalizedSamples.length ? normalizedSamples.join(" | ") : "";
    setReplayDiagnosticsVisible(replayDiagnosticsVisible);
  }

  async function resolveLocalHistoryRecordById(localHistoryId) {
    if (!window.LocalHistoryStore) throw new Error("local_history_store_missing");

    if (typeof window.LocalHistoryStore.getByIdAsync === "function") {
      return window.LocalHistoryStore.getByIdAsync(localHistoryId);
    }
    if (typeof window.LocalHistoryStore.getById === "function") {
      var value = window.LocalHistoryStore.getById(localHistoryId);
      return Promise.resolve(value);
    }

    throw new Error("local_history_store_missing");
  }

  function hasReplayQueryTarget() {
    var params = new URLSearchParams(window.location.search || "");
    var cloudReplay = params.get("cloud_replay");
    var localReplay = params.get("local_replay");
    var handoffId = params.get("handoff");
    var localHistoryId = params.get("local_history_id") || params.get("id");
    return cloudReplay === "1" || !!localHistoryId || (localReplay === "1" && !!handoffId);
  }

  function resolveReplayBoardSize(gameManager) {
    var managerSize = Math.floor(Number(gameManager && gameManager.size) || 0);
    if (managerSize > 0) return managerSize;
    var gridSize = Math.floor(Number(gameManager && gameManager.grid && gameManager.grid.size) || 0);
    return gridSize > 0 ? gridSize : 4;
  }

  function createEmptyReplayGrid(gameManager, size) {
    if (typeof window.Grid === "function") return new window.Grid(size);
    var ctor = gameManager && gameManager.grid && gameManager.grid.constructor;
    if (typeof ctor === "function") return new ctor(size);
    return null;
  }

  function clearReplayBoardToEmptyState() {
    var gameManager = window.game_manager;
    if (!gameManager) return;

    stopReplayAutoPlayback();
    if (typeof gameManager.pause === "function") gameManager.pause();

    var size = resolveReplayBoardSize(gameManager);
    var emptyGrid = createEmptyReplayGrid(gameManager, size);
    if (emptyGrid) {
      gameManager.grid = emptyGrid;
    }

    gameManager.score = 0;
    gameManager.over = false;
    gameManager.won = false;
    if (Object.prototype.hasOwnProperty.call(gameManager, "keepPlaying")) {
      gameManager.keepPlaying = false;
    }
    gameManager.replayMoves = [];
    gameManager.replayIndex = 0;

    resetReplayTimelineMeta();
    clearReplayDiagnosticsPanel();
    clearReplayCompatibilityNotice();

    if (gameManager.actuator && typeof gameManager.actuator.invalidateLayoutCache === "function") {
      gameManager.actuator.invalidateLayoutCache();
    }
    if (typeof gameManager.clearTransientTileVisualState === "function") {
      gameManager.clearTransientTileVisualState();
    }
    if (typeof gameManager.actuate === "function") {
      gameManager.actuate();
    }

    updateReplayUI();
  }

  function hasReplaySourceAlreadyLoaded(gameManager) {
    if (!gameManager) return false;
    var replayMoves = Array.isArray(gameManager.replayMoves) ? gameManager.replayMoves : [];
    if (replayMoves.length > 0) return true;
    if (Math.floor(Number(gameManager.replayIndex) || 0) > 0) return true;
    return replayTimelineMeta.available === true;
  }

  function ensureReplayBoardEmptyWithoutReplaySource() {
    if (hasReplayQueryTarget()) {
      replayInitialEmptyBoardResolved = true;
      return;
    }
    if (replayInitialEmptyBoardResolved) return;
    var tries = 0;

    function applyWhenReady() {
      if (replayInitialEmptyBoardResolved) return;
      if (hasReplayQueryTarget()) {
        replayInitialEmptyBoardResolved = true;
        return;
      }
      if (isGameManagerReplayReady()) {
        var gameManager = window.game_manager;
        if (hasReplaySourceAlreadyLoaded(gameManager) || replayAutoPlaybackActive) {
          replayInitialEmptyBoardResolved = true;
          return;
        }
        clearReplayBoardToEmptyState();
        replayInitialEmptyBoardResolved = true;
        return;
      }
      tries += 1;
      if (tries > REPLAY_QUERY_MAX_RETRIES) return;
      setTimeout(applyWhenReady, 60);
    }

    applyWhenReady();
  }

  async function loadReplayFromQueryV1() {
    var params = new URLSearchParams(window.location.search);
    var cloudReplay = params.get("cloud_replay");
    var localReplay = params.get("local_replay");
    var handoffId = toText(params.get("handoff")).trim();
    var localHistoryId = params.get("local_history_id") || params.get("id");
    var hasTarget = cloudReplay === "1" || !!localHistoryId || (localReplay === "1" && !!handoffId);

    clearReplayDiagnosticsPanel();
    if (!hasTarget) return;

    if (!isGameManagerReplayReady()) {
      replayQueryRetryCount += 1;
      if (replayQueryRetryCount > REPLAY_QUERY_MAX_RETRIES) {
        clearReplayQueryRetryTimer();
        alert("game_manager_not_ready");
        return;
      }
      scheduleReplayQueryRetry();
      return;
    }

    if (cloudReplay === "1") {
      try {
        var raw = toText(readSessionStorageItem(CLOUD_REPLAY_STORAGE_KEY)).trim();
        if (!raw) throw new Error("cloud_replay_payload_missing");

        var payload = safeJsonParse(raw);
        if (!isObject(payload)) throw new Error("cloud_replay_payload_invalid");

        var cloudPayloadVersion = normalizePositiveInteger(payload.cloud_payload_version);
        if (cloudPayloadVersion !== CLOUD_REPLAY_PAYLOAD_VERSION) {
          throw new Error("cloud_payload_version_mismatch:" + String(cloudPayloadVersion));
        }

        var replayFileVersion = normalizePositiveInteger(payload.replay_file_version);
        if (replayFileVersion !== CLOUD_REPLAY_FILE_VERSION) {
          throw new Error("cloud_replay_file_version_mismatch:" + String(replayFileVersion));
        }

        var replayPayload = resolveReplayPayloadForImportV1(payload);
        importReplayPayloadV1(replayPayload, "cloud_query");
        syncReplayCompatibilityNotice(payload, replayPayload);
        captureReplayTimelineFromReplayPayload(replayPayload);
        if (!resumeReplayPlaybackPreferred(window.game_manager)) {
          startReplayAutoPlayback();
        }

        clearReplayQueryRetryTimer();
        replayQueryRetryCount = 0;
        removeSessionStorageItem(CLOUD_REPLAY_STORAGE_KEY);
        clearReplayTransientQueryParams();
        setReplayPageTitleSuffix("cloud");
        clearReplayDiagnosticsPanel();
        updateReplayUI();
      } catch (errorCloud) {
        var cloudMessage = resolveReplayImportErrorMessage(errorCloud);
        if (cloudMessage.indexOf("import_rejected:cloud_query") === 0 && replayQueryRetryCount < REPLAY_QUERY_MAX_RETRIES) {
          replayQueryRetryCount += 1;
          scheduleReplayQueryRetry();
          return;
        }
        clearReplayQueryRetryTimer();
        if (cloudMessage.indexOf("cloud_payload_version_mismatch:") === 0) {
          var payloadVersion = normalizePositiveInteger(cloudMessage.split(":")[1]);
          alert(resolveCloudReplayVersionMismatchMessage("payload", CLOUD_REPLAY_PAYLOAD_VERSION, payloadVersion));
          return;
        }
        if (cloudMessage.indexOf("cloud_replay_file_version_mismatch:") === 0) {
          var replayVersion = normalizePositiveInteger(cloudMessage.split(":")[1]);
          alert(resolveCloudReplayVersionMismatchMessage("file", CLOUD_REPLAY_FILE_VERSION, replayVersion));
          return;
        }
        alert(t("cloudLoadFailed") + ": " + cloudMessage);
      }
      return;
    }

    if (localReplay === "1" && handoffId) {
      try {
        var rawLocalReplay = toText(
          readLocalStorageItem(LOCAL_REPLAY_HANDOFF_STORAGE_PREFIX + handoffId)
        ).trim();
        if (!rawLocalReplay) throw new Error("local_replay_payload_missing");

        var localReplayPayload = safeJsonParse(rawLocalReplay);
        if (!isObject(localReplayPayload)) throw new Error("local_replay_payload_invalid");

        var replayPayload = resolveReplayPayloadForImportV1(localReplayPayload);
        importReplayPayloadV1(replayPayload, "local_query");
        syncReplayCompatibilityNotice(localReplayPayload, replayPayload);
        captureReplayTimelineFromReplayPayload(replayPayload);
        clearReplayTransientQueryState();
        removeLocalStorageItem(LOCAL_REPLAY_HANDOFF_STORAGE_PREFIX + handoffId);
        setReplayPageTitleSuffix("local");
        clearReplayDiagnosticsPanel();
        updateReplayUI();
      } catch (errorLocalReplay) {
        var localReplayMessage = resolveReplayImportErrorMessage(errorLocalReplay);
        if (
          (localReplayMessage === "local_replay_payload_missing" ||
            localReplayMessage.indexOf("import_rejected:local_query") === 0) &&
          replayQueryRetryCount < REPLAY_QUERY_MAX_RETRIES
        ) {
          replayQueryRetryCount += 1;
          scheduleReplayQueryRetry();
          return;
        }
        clearReplayTransientQueryState();
        clearReplayDiagnosticsPanel();
        alert(t("localLoadFailed") + ": " + localReplayMessage);
      }
      return;
    }

    if (localHistoryId) {
      try {
        var record = await resolveLocalHistoryRecordById(localHistoryId);
        if (!record) throw new Error("record_not_found");

        var replayPayloadLocal = resolveReplayPayloadForImportV1(record);
        importReplayPayloadV1(replayPayloadLocal, "local_history_query");
        syncReplayCompatibilityNotice(record, replayPayloadLocal);
        captureReplayTimelineFromReplayPayload(replayPayloadLocal);
        if (!resumeReplayPlaybackPreferred(window.game_manager)) {
          startReplayAutoPlayback();
        }

        clearReplayQueryRetryTimer();
        replayQueryRetryCount = 0;
        setReplayPageTitleSuffix("local");
        renderReplayDiagnosticsPanelFromRecord(record);
        updateReplayUI();
      } catch (errorLocal) {
        var localMessage = resolveReplayImportErrorMessage(errorLocal);
        if (
          localMessage.indexOf("import_rejected:local_history_query") === 0 &&
          replayQueryRetryCount < REPLAY_QUERY_MAX_RETRIES
        ) {
          replayQueryRetryCount += 1;
          scheduleReplayQueryRetry();
          return;
        }
        clearReplayQueryRetryTimer();
        clearReplayDiagnosticsPanel();
        alert(t("localLoadFailed") + ": " + localMessage);
      }
    }
  }

  function cancelReplayPendingRelayout() {
    if (!replayRelayoutTimer) return;
    clearTimeout(replayRelayoutTimer);
    replayRelayoutTimer = null;
  }

  function requestReplayRelayout() {
    cancelReplayPendingRelayout();
    replayRelayoutTimer = setTimeout(function () {
      replayRelayoutTimer = null;
      var gm = window.game_manager;
      if (!gm) return;
      if (gm.actuator && typeof gm.actuator.invalidateLayoutCache === "function") {
        gm.actuator.invalidateLayoutCache();
      }
      if (typeof gm.clearTransientTileVisualState === "function") {
        gm.clearTransientTileVisualState();
      }
      if (typeof gm.actuate === "function") {
        gm.actuate();
      }
    }, 120);
  }

  function flushReplayUiRefresh() {
    replayUiRefreshRafId = 0;
    updateReplayUI();
  }

  function scheduleReplayUiRefresh() {
    if (replayUiRefreshRafId) return;
    replayUiRefreshRafId = window.requestAnimationFrame(flushReplayUiRefresh);
  }

  function clearReplayAutoPlaybackTimer() {
    if (!replayAutoPlaybackTimer) return;
    clearTimeout(replayAutoPlaybackTimer);
    replayAutoPlaybackTimer = 0;
  }

  function hasPendingReplaySteps(manager) {
    if (!manager) return false;
    var replayMoves = Array.isArray(manager.replayMoves) ? manager.replayMoves : [];
    if (!replayMoves.length) return false;
    return Math.floor(Number(manager.replayIndex) || 0) < replayMoves.length;
  }

  function isGameManagerReplayRunning(manager) {
    var activeManager = manager || window.game_manager;
    if (!activeManager) return false;
    if (activeManager.replayMode !== true) return false;
    if (activeManager.isPaused === true) return false;
    return hasPendingReplaySteps(activeManager);
  }

  function syncReplayAutoPlaybackStateWithGameManager() {
    if (replayPlaybackMode !== "original" && replayAutoPlaybackActive) {
      replayAutoPlaybackActive = false;
      clearReplayAutoPlaybackTimer();
    }
  }

  function syncReplayPauseButtonLabel() {
    var pauseButton = document.getElementById("replay-pause-btn");
    if (!pauseButton) return;
    pauseButton.textContent = isReplayUiPlaying(window.game_manager) ? t("pause") : t("play");
  }

  function stopReplayAutoPlayback() {
    replayAutoPlaybackActive = false;
    clearReplayAutoPlaybackTimer();
    syncReplayPauseButtonLabel();
  }

  function normalizeReplayPlaybackMode(value) {
    return value === "original" ? "original" : "fixed";
  }

  function setReplayPlaybackMode(mode) {
    replayPlaybackMode = normalizeReplayPlaybackMode(mode);
    var manager = window.game_manager;
    if (replayAutoPlaybackActive) {
      if (replayPlaybackMode === "original") {
        queueReplayAutoPlaybackTick();
      } else {
        stopReplayAutoPlayback();
        if (manager && hasPendingReplaySteps(manager) && typeof manager.resume === "function") {
          applyReplayFixedDelayToManager(manager);
          manager.resume();
        }
      }
    } else if (replayPlaybackMode === "original" && isGameManagerReplayRunning(manager) && hasPendingReplaySteps(manager)) {
      if (manager && typeof manager.pause === "function") manager.pause();
      replayAutoPlaybackActive = true;
      queueReplayAutoPlaybackTick();
    }
    scheduleReplayUiTick(true);
  }

  function resolveReplayPlaybackModeTitle() {
    if (replayPlaybackMode === "original") return resolveReplayTimelineLabel("originalSpeedTitle");
    return String(Math.floor(replayStepIntervalMs)) + "ms";
  }

  function clampReplayStepIntervalMs(value) {
    var numeric = Math.floor(Number(value) || 0);
    if (!Number.isFinite(numeric) || numeric <= 0) return replayStepIntervalMs;
    if (numeric < REPLAY_STEP_INTERVAL_MIN_MS) numeric = REPLAY_STEP_INTERVAL_MIN_MS;
    if (numeric > REPLAY_STEP_INTERVAL_MAX_MS) numeric = REPLAY_STEP_INTERVAL_MAX_MS;
    return numeric;
  }

  function applyReplayFixedDelayToManager(manager) {
    if (!manager) return;
    var delay = clampReplayStepIntervalMs(replayStepIntervalMs);
    if (typeof manager.setRuntimeReplayDelay === "function") {
      manager.setRuntimeReplayDelay(delay);
      return;
    }
    manager.replayDelay = delay;
  }

  function shouldUseManagerNativeReplayAutoplay(manager) {
    return replayPlaybackMode !== "original" && !!(manager && typeof manager.resume === "function");
  }

  function resumeReplayPlaybackPreferred(manager) {
    if (!manager) return false;
    stopReplayAutoPlayback();
    if (replayPlaybackMode === "original") return false;
    if (!hasPendingReplaySteps(manager)) return false;
    if (typeof manager.resume !== "function") return false;
    applyReplayFixedDelayToManager(manager);
    manager.resume();
    return true;
  }

  function resolveReplayAutoDelayMs(manager) {
    if (replayPlaybackMode === "original") {
      var stepMs = resolveReplayCurrentStepDurationMs(manager);
      if (!Number.isFinite(stepMs) || stepMs <= 0) stepMs = replayStepIntervalMs;
      return clampReplayStepIntervalMs(stepMs);
    }
    return clampReplayStepIntervalMs(replayStepIntervalMs);
  }

  function queueReplayAutoPlaybackTick() {
    clearReplayAutoPlaybackTimer();
    var manager = window.game_manager;
    var delayMs = resolveReplayAutoDelayMs(manager);
    replayAutoPlaybackTimer = setTimeout(function () {
      replayAutoPlaybackTimer = 0;
      if (!replayAutoPlaybackActive) return;
      var manager = window.game_manager;
      if (!manager || typeof manager.step !== "function") {
        stopReplayAutoPlayback();
        scheduleReplayUiRefresh();
        return;
      }

      var replayMoves = Array.isArray(manager.replayMoves) ? manager.replayMoves : [];
      if (!replayMoves.length || manager.replayIndex >= replayMoves.length) {
        stopReplayAutoPlayback();
        scheduleReplayUiRefresh();
        return;
      }

      cancelReplayPendingRelayout();
      replayPauseBridgeSuppressed = true;
      try {
        manager.step(1, { preferAnimatedStep: true });
      } finally {
        replayPauseBridgeSuppressed = false;
      }
      scheduleReplayUiRefresh();

      if (!replayAutoPlaybackActive) return;
      if (manager.replayIndex >= replayMoves.length) {
        stopReplayAutoPlayback();
        scheduleReplayUiRefresh();
        return;
      }

      queueReplayAutoPlaybackTick();
    }, delayMs);
  }

  function startReplayAutoPlayback() {
    var manager = window.game_manager;
    if (!manager || typeof manager.step !== "function") return;
    var replayMoves = Array.isArray(manager.replayMoves) ? manager.replayMoves : [];
    if (!replayMoves.length || manager.replayIndex >= replayMoves.length) {
      stopReplayAutoPlayback();
      scheduleReplayUiRefresh();
      return;
    }
    if (shouldUseManagerNativeReplayAutoplay(manager)) {
      stopReplayAutoPlayback();
      applyReplayFixedDelayToManager(manager);
      manager.resume();
      syncReplayPauseButtonLabel();
      scheduleReplayUiRefresh();
      return;
    }
    if (typeof manager.pause === "function") {
      manager.pause();
    }
    replayAutoPlaybackActive = true;
    syncReplayPauseButtonLabel();
    queueReplayAutoPlaybackTick();
    scheduleReplayUiRefresh();
  }

  function isReplayUiPlaying(manager) {
    if (replayAutoPlaybackActive) return true;
    return isGameManagerReplayRunning(manager);
  }

  function replayUiPauseReplay() {
    stopReplayAutoPlayback();
    if (window.game_manager && window.game_manager.pause) {
      window.game_manager.pause();
    }
    scheduleReplayUiRefresh();
    scheduleReplayUiTick(true);
  }

  function replayUiToggleReplayPause() {
    var manager = window.game_manager;
    if (!manager) return;
    if (isReplayUiPlaying(manager)) {
      stopReplayAutoPlayback();
      if (typeof manager.pause === "function") manager.pause();
    } else {
      if (!resumeReplayPlaybackPreferred(manager)) {
        startReplayAutoPlayback();
      }
    }
    syncReplayPauseButtonLabel();
    scheduleReplayUiRefresh();
    scheduleReplayUiTick(true);
  }

  function resolveReplayContainerForStepAnimation() {
    return document.querySelector(".game-container.game-container-replay");
  }

  function executeReplayAnimatedForwardStep(manager) {
    manager.step(1, { preferAnimatedStep: true });
  }

  function forceReplayActuateAfterStep(manager) {
    if (!manager || typeof manager.actuate !== "function") return;
    manager.actuate();
  }

  function executeReplayAnimatedBackwardStep(manager) {
    var replayMoves = Array.isArray(manager.replayMoves) ? manager.replayMoves : [];
    if (!replayMoves.length) return false;

    var currentIndex = Math.floor(Number(manager.replayIndex) || 0);
    if (currentIndex <= 0) return false;

    var targetIndex = currentIndex - 1;
    if (targetIndex <= 0) {
      manager.seek(0);
      return true;
    }

    var anchorIndex = Math.max(0, targetIndex - 1);
    var replayContainer = resolveReplayContainerForStepAnimation();
    if (replayContainer && replayContainer.classList) {
      replayContainer.classList.add("replay-step-preseek-hidden");
    }

    manager.seek(anchorIndex);
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        if (replayContainer && replayContainer.classList) {
          replayContainer.classList.remove("replay-step-preseek-hidden");
        }
        replayPauseBridgeSuppressed = true;
        try {
          executeReplayAnimatedForwardStep(manager);
          forceReplayActuateAfterStep(manager);
        } finally {
          replayPauseBridgeSuppressed = false;
        }
        scheduleReplayUiRefresh();
        scheduleReplayUiTick(true);
      });
    });
    return true;
  }

  function replayUiStepReplay(delta) {
    if (!window.game_manager || typeof window.game_manager.step !== "function") return;
    stopReplayAutoPlayback();
    if (window.game_manager.pause) window.game_manager.pause();
    cancelReplayPendingRelayout();
    if (delta === -1 && executeReplayAnimatedBackwardStep(window.game_manager)) return;

    replayPauseBridgeSuppressed = true;
    try {
      if (delta === 1) {
        executeReplayAnimatedForwardStep(window.game_manager);
        forceReplayActuateAfterStep(window.game_manager);
      } else {
        window.game_manager.step(delta);
      }
    } finally {
      replayPauseBridgeSuppressed = false;
    }
    scheduleReplayUiRefresh();
    scheduleReplayUiTick(true);
  }

  function replayUiSetReplaySpeed(val) {
    replayStepIntervalMs = clampReplayStepIntervalMs(val);
    applyReplayFixedDelayToManager(window.game_manager);
    setReplayPlaybackMode("fixed");
    var manager = window.game_manager;
    if (!replayAutoPlaybackActive && isGameManagerReplayRunning(manager) && typeof manager.resume === "function") {
      manager.resume();
    }
    if (replayAutoPlaybackActive) queueReplayAutoPlaybackTick();
    updateReplayUI();
    scheduleReplayUiRefresh();
    scheduleReplayUiTick(true);
  }

  function replayUiSetReplayPlaybackMode(mode) {
    setReplayPlaybackMode(mode);
    updateReplayUI();
    scheduleReplayUiRefresh();
  }

  function openReplaySpeedSettingsModal() {
    showReplayModal(
      resolveReplayTimelineLabel("setSpeedTitle"),
      String(Math.floor(replayStepIntervalMs)),
      resolveReplayTimelineLabel("setSpeedAction"),
      function (text, modalState) {
        if (modalState && modalState.useOriginalSpeed) {
          replayUiSetReplayPlaybackMode("original");
          window.closeReplayModal();
          return;
        }
        var raw = toText(text).trim();
        var next = Number(raw);
        if (!Number.isFinite(next)) {
          alert(resolveReplayTimelineLabel("setSpeedInvalid"));
          return;
        }
        var floored = Math.floor(next);
        if (floored < REPLAY_STEP_INTERVAL_MIN_MS || floored > REPLAY_STEP_INTERVAL_MAX_MS) {
          alert(resolveReplayTimelineLabel("setSpeedInvalid"));
          return;
        }
        replayUiSetReplaySpeed(floored);
        window.closeReplayModal();
      }
    , {
      inputMode: "singleline-ms",
      unitText: "ms",
      placeholder: "1-10000",
      showSpeedModeToggle: true,
      useOriginalSpeed: replayPlaybackMode === "original"
    });
  }

  function resolveReplaySeekIndexFromPercent(value) {
    var numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return null;
    if (numericValue < 0) numericValue = 0;
    if (numericValue > 100) numericValue = 100;

    var gameManager = window.game_manager;
    var total = gameManager && gameManager.replayMoves ? gameManager.replayMoves.length : 0;
    return Math.floor((numericValue / 100) * total);
  }

  function flushReplayUiSeek() {
    replaySeekRafId = 0;
    var nextValue = replayPendingSeekValue;
    replayPendingSeekValue = null;

    if (!window.game_manager || typeof window.game_manager.seek !== "function") return;
    stopReplayAutoPlayback();
    if (window.game_manager.pause) window.game_manager.pause();
    var index = resolveReplaySeekIndexFromPercent(nextValue);
    if (index === null) return;

    cancelReplayPendingRelayout();
    window.game_manager.seek(index);
    scheduleReplayUiRefresh();
    scheduleReplayUiTick(true);
  }

  function replayUiSeekReplay(value) {
    replayPendingSeekValue = value;
    if (replaySeekRafId) return;
    replaySeekRafId = window.requestAnimationFrame(flushReplayUiSeek);
  }

  function handleReplayScrubStart() {
    isScrubbing = true;
    stopReplayAutoPlayback();
    var gameManager = window.game_manager;
    if (gameManager && !gameManager.isPaused && gameManager.pause) {
      gameManager.pause();
    }
    scheduleReplayUiTick(true);
  }

  function handleReplayScrubEnd() {
    isScrubbing = false;
    scheduleReplayUiRefresh();
    scheduleReplayUiTick(true);
  }

  function updateReplayUI() {
    syncReplayAutoPlaybackStateWithGameManager();
    updateReplayStatLabelsUI();
    syncReplayPauseButtonLabel();

    var gameManager = window.game_manager;
    if (!gameManager) return;

    var progress = document.getElementById("replay-progress");
    if (progress && gameManager.replayMoves && !isScrubbing) {
      var total = gameManager.replayMoves.length;
      var current = gameManager.replayIndex;
      var percent = total > 0 ? (current / total) * 100 : 0;
      progress.value = percent;
    }

    updateReplayScoreCardUI(gameManager);
    updateReplayStepTimerUI(gameManager);
    ensureReplayDiagnosticsFallbackCopy();
  }

  function resolveReplayUiTickIntervalMs() {
    if (document.hidden) return REPLAY_UI_HIDDEN_INTERVAL_MS;
    var manager = window.game_manager;
    if (!manager || isScrubbing) return REPLAY_UI_IDLE_INTERVAL_MS;
    if (!isReplayUiPlaying(manager)) return REPLAY_UI_IDLE_INTERVAL_MS;
    return REPLAY_UI_ACTIVE_INTERVAL_MS;
  }

  function clearReplayUiTickTimer() {
    if (!replayUiTickTimer) return;
    clearTimeout(replayUiTickTimer);
    replayUiTickTimer = 0;
  }

  function scheduleReplayUiTick(immediate) {
    clearReplayUiTickTimer();
    replayUiTickTimer = setTimeout(runReplayUiTick, immediate ? 0 : resolveReplayUiTickIntervalMs());
  }

  function runReplayUiTick() {
    replayUiTickTimer = 0;
    updateReplayUI();
    scheduleReplayUiTick(false);
  }

  function startReplayUiTicker() {
    if (replayUiTickStarted) return;
    replayUiTickStarted = true;

    document.addEventListener("visibilitychange", function () {
      scheduleReplayUiTick(true);
    });
    window.addEventListener("focus", function () {
      scheduleReplayUiTick(true);
    });

    scheduleReplayUiTick(true);
  }

  window.toggleReplayPause = replayUiToggleReplayPause;
  window.pauseReplay = function () {
    if (replayPauseBridgeSuppressed) return;
    replayUiPauseReplay();
  };
  window.stepReplay = replayUiStepReplay;
  window.setReplaySpeed = replayUiSetReplaySpeed;
  window.setReplayPlaybackMode = replayUiSetReplayPlaybackMode;
  window.seekReplay = replayUiSeekReplay;

  window.replayUiPauseReplay = replayUiPauseReplay;
  window.replayUiStepReplay = replayUiStepReplay;
  window.replayUiSetReplaySpeed = replayUiSetReplaySpeed;
  window.replayUiSetReplayPlaybackMode = replayUiSetReplayPlaybackMode;
  window.replayUiSeekReplay = replayUiSeekReplay;

  window.ReplayLogicV1 = {
    version: REPLAY_LOGIC_VERSION,
    resolveReplayPayloadForImportV1: resolveReplayPayloadForImportV1,
    importReplayPayloadV1: importReplayPayloadV1,
    isDiagonalModeKey: isDiagonalModeKey
  };

  function initializeReplayUiPage() {
    if (replayUiInitialized) return;
    replayUiInitialized = true;

    syncReplayDocumentTitle();
    startReplayUiTicker();
    clearReplayDiagnosticsPanel();
    clearReplayCompatibilityNotice();
    resetReplayTimelineMeta();
    stopReplayAutoPlayback();
    setReplayDiagnosticsVisible(false);
    updateReplayStatLabelsUI();
    syncReplayPauseButtonLabel();

    var progressEl = document.getElementById("replay-progress");
    if (progressEl) {
      progressEl.addEventListener("pointerdown", handleReplayScrubStart);
      progressEl.addEventListener("pointerup", handleReplayScrubEnd);
      progressEl.addEventListener("pointercancel", handleReplayScrubEnd);
      progressEl.addEventListener("mousedown", handleReplayScrubStart);
      progressEl.addEventListener("mouseup", handleReplayScrubEnd);
      progressEl.addEventListener("touchstart", handleReplayScrubStart);
      progressEl.addEventListener("touchend", handleReplayScrubEnd);
      progressEl.addEventListener("change", handleReplayScrubEnd);
      progressEl.addEventListener("input", function () {
        replayUiSeekReplay(this.value);
      });
    }

    var btnRewind10 = document.getElementById("btn-rewind-10");
    if (btnRewind10) btnRewind10.addEventListener("click", function () { replayUiStepReplay(-10); });

    var btnRewind1 = document.getElementById("btn-rewind-1");
    if (btnRewind1) btnRewind1.addEventListener("click", function () { replayUiStepReplay(-1); });

    var btnPause = document.getElementById("replay-pause-btn");
    if (btnPause) btnPause.addEventListener("click", replayUiToggleReplayPause);

    var btnForward1 = document.getElementById("btn-forward-1");
    if (btnForward1) btnForward1.addEventListener("click", function () { replayUiStepReplay(1); });

    var btnForward10 = document.getElementById("btn-forward-10");
    if (btnForward10) btnForward10.addEventListener("click", function () { replayUiStepReplay(10); });

    var diagnosticsToggleBtn = document.getElementById("replay-toggle-diagnostics-btn");
    if (diagnosticsToggleBtn) {
      diagnosticsToggleBtn.addEventListener("click", function () {
        openReplayStatsModal();
      });
    }

    var speedToggleBtn = document.getElementById("replay-open-speed-btn");
    if (speedToggleBtn) {
      speedToggleBtn.addEventListener("click", function () {
        openReplaySpeedSettingsModal();
      });
    }

    var importFileBtn = document.getElementById("import-replay-file-btn") || document.querySelector(".import-replay-button");
    if (importFileBtn) importFileBtn.addEventListener("click", window.importReplay);

    var importTextBtn = document.getElementById("import-replay-text-btn");
    if (importTextBtn) importTextBtn.addEventListener("click", importReplayFromTextModal);

    var modalCloseBtn = document.querySelector("#replay-modal .replay-modal-actions button:last-child");
    if (modalCloseBtn) modalCloseBtn.addEventListener("click", window.closeReplayModal);

    ensureReplayBoardEmptyWithoutReplaySource();
    loadReplayFromQueryV1();

    if (!window.__replayRelayoutBound) {
      window.__replayRelayoutBound = true;
      window.addEventListener("resize", requestReplayRelayout);
      window.addEventListener("orientationchange", requestReplayRelayout);
    }
    requestReplayRelayout();
    scheduleReplayUiRefresh();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeReplayUiPage);
  } else {
    initializeReplayUiPage();
  }
})();
