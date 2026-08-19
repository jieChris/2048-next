(function () {
  "use strict";

  var STORAGE_KEY = "local_game_history_v1";
  var MAX_RECORDS = 5000;
  var MAX_DIAGNOSTICS_INDEX_ENTRIES = 6;
  var MAX_DIAGNOSTIC_PAYLOAD_KEYS = 24;
  var MAX_DIAGNOSTIC_STRING_LENGTH = 160;
  var MAX_DIAGNOSTIC_ARRAY_ITEMS = 8;

  var DB_NAME = "game_history_db";
  var DB_VERSION = 3;
  var STORE_NAME = "records";
  var MIGRATION_FLAG = "idb_history_migrated_v1";
  var AUTH_USER_ID_STORAGE_KEY = "2048_auth_userId_v1";
  var AUTH_NICKNAME_STORAGE_KEY = "2048_auth_nickname_v1";
  var SYNC_STATUSES = {
    finalized_local: true,
    pending: true,
    waiting_auth: true,
    retry_wait: true,
    needs_action: true,
    invalid: true,
    synced: true
  };

  var idbReadyPromise = null;
  var migrationPromise = null;
  var forceLocalFallback = false;

  function safeParse(raw, fallback) {
    try {
      return JSON.parse(raw);
    } catch (_err) {
      return fallback;
    }
  }

  function toText(value) {
    return value == null ? "" : String(value);
  }

  function resolveLocalStorage() {
    try {
      if (typeof localStorage === "undefined") return null;
      return localStorage;
    } catch (_err) {
      return null;
    }
  }

  function readLocalStorageItem(key) {
    var storage = resolveLocalStorage();
    if (!storage || typeof storage.getItem !== "function") return null;
    try {
      return storage.getItem(key);
    } catch (_err) {
      return null;
    }
  }

  function writeLocalStorageItem(key, value) {
    var storage = resolveLocalStorage();
    if (!storage || typeof storage.setItem !== "function") return false;
    try {
      storage.setItem(key, value);
      return true;
    } catch (_err) {
      return false;
    }
  }

  function safeReadLocalStorageText(key) {
    return toText(readLocalStorageItem(key)).trim();
  }

  function sanitizeOwnerKeyPart(value) {
    return toText(value)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_.:@-]+/g, "_")
      .slice(0, 64);
  }

  function resolveOwnerMetaFromRaw(raw) {
    raw = isPlainObject(raw) ? raw : {};
    var ownerTypeRaw = toText(raw && raw.owner_type).trim().toLowerCase();
    var ownerUserId = toText(raw && raw.owner_user_id).trim();
    var ownerNickname = toText(raw && raw.owner_nickname).trim();
    var ownerKey = toText(raw && raw.owner_key).trim();

    if (!ownerTypeRaw && !ownerUserId && !ownerNickname) {
      ownerUserId = safeReadLocalStorageText(AUTH_USER_ID_STORAGE_KEY);
      ownerNickname = safeReadLocalStorageText(AUTH_NICKNAME_STORAGE_KEY);
    }

    var ownerType = ownerTypeRaw === "guest" ? "guest" : "user";
    if (!ownerUserId && !ownerNickname) ownerType = "guest";
    if (ownerType === "guest") {
      ownerUserId = "";
      ownerNickname = "";
    }

    if (!ownerKey) {
      if (ownerType === "guest") {
        ownerKey = "guest";
      } else if (ownerUserId) {
        ownerKey = "user:" + sanitizeOwnerKeyPart(ownerUserId);
      } else {
        var normalizedNick = sanitizeOwnerKeyPart(ownerNickname);
        ownerKey = normalizedNick ? "nick:" + normalizedNick : "guest";
      }
    }

    return {
      owner_type: ownerType,
      owner_user_id: ownerUserId || null,
      owner_nickname: ownerNickname,
      owner_key: ownerKey || "guest"
    };
  }

  function readAllFallback() {
    try {
      var parsed = safeParse(readLocalStorageItem(STORAGE_KEY) || "[]", []);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_err) {
      return [];
    }
  }

  function writeAllFallback(records) {
    writeLocalStorageItem(STORAGE_KEY, JSON.stringify(records));
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function normalizeNullableText(value) {
    var normalized = typeof value === "string" ? value.trim() : "";
    return normalized || null;
  }

  function normalizeNullableInteger(value) {
    var normalized = Number(value);
    return Number.isFinite(normalized) ? Math.floor(normalized) : null;
  }

  function normalizeNonNegativeInteger(value, fallback) {
    var normalized = Number(value);
    if (!Number.isFinite(normalized)) return Math.max(0, Math.floor(Number(fallback) || 0));
    return Math.max(0, Math.floor(normalized));
  }

  function utf8ByteLength(value) {
    var text = toText(value);
    if (typeof TextEncoder !== "undefined") return new TextEncoder().encode(text).byteLength;
    try {
      return unescape(encodeURIComponent(text)).length;
    } catch (_err) {
      return text.length;
    }
  }

  function normalizeSyncStatus(value, replayString, ownerType) {
    var normalized = toText(value).trim();
    if (SYNC_STATUSES[normalized]) return normalized;
    if (!replayString) return "needs_action";
    return ownerType === "user" ? "pending" : "waiting_auth";
  }

  function normalizeDeliveryMetadata(raw, base) {
    var replayString = toText(base && base.replay_string);
    var ownerType = toText(base && base.owner_type).trim() === "user" ? "user" : "guest";
    return {
      client_record_id: normalizeNullableText(raw.client_record_id) || normalizeNullableText(base && base.id),
      server_record_id: normalizeNullableText(raw.server_record_id),
      sync_status: normalizeSyncStatus(raw.sync_status, replayString, ownerType),
      replay_sha256: normalizeNullableText(raw.replay_sha256),
      replay_byte_size: normalizeNonNegativeInteger(raw.replay_byte_size, utf8ByteLength(replayString)),
      upload_task_id: normalizeNullableText(raw.upload_task_id),
      uploaded_chunk_count: normalizeNonNegativeInteger(raw.uploaded_chunk_count, 0),
      upload_attempts: normalizeNonNegativeInteger(raw.upload_attempts, 0),
      next_retry_at: normalizeNullableText(raw.next_retry_at),
      last_upload_attempt_at: normalizeNullableText(raw.last_upload_attempt_at),
      last_error_code: normalizeNullableText(raw.last_error_code),
      last_error_message: normalizeNullableText(raw.last_error_message),
      record_schema_version: Math.max(1, normalizeNonNegativeInteger(raw.record_schema_version, 1)),
      mode_bucket: normalizeNullableText(raw.mode_bucket),
      ranked_session_token: normalizeNullableText(raw.ranked_session_token),
      initial_seed: normalizeNullableInteger(raw.initial_seed),
      seed: normalizeNullableInteger(raw.seed),
      ranked_verification: isPlainObject(raw.ranked_verification) ? raw.ranked_verification : null,
      min_steps_2048: normalizeNullableInteger(raw.min_steps_2048),
      min_steps_4096: normalizeNullableInteger(raw.min_steps_4096),
      min_steps_8192: normalizeNullableInteger(raw.min_steps_8192)
    };
  }

  var localHistoryIdFallbackCounter = 0;

  function makeId() {
    if (
      typeof CoreCryptoRandomRuntime !== "undefined" &&
      CoreCryptoRandomRuntime &&
      typeof CoreCryptoRandomRuntime.randomId === "function"
    ) {
      return CoreCryptoRandomRuntime.randomId("lh", { length: 8 });
    }
    localHistoryIdFallbackCounter = (localHistoryIdFallbackCounter + 1) >>> 0;
    return "lh_" + Date.now().toString(36) + "_" +
      localHistoryIdFallbackCounter.toString(36).padStart(8, "0");
  }

  function isPlainObject(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
  }

  function truncateDiagnosticText(value, maxLength) {
    var text = typeof value === "string" ? value : String(value || "");
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength);
  }

  function normalizeDiagnosticPayloadArrayValue(value) {
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : null;
    }
    if (typeof value === "boolean") return value;
    if (typeof value === "string" && value) {
      return truncateDiagnosticText(value, MAX_DIAGNOSTIC_STRING_LENGTH);
    }
    return null;
  }

  function normalizeDiagnosticPayloadArray(values) {
    var source = Array.isArray(values) ? values : [];
    var out = [];
    for (var i = 0; i < source.length; i += 1) {
      if (out.length >= MAX_DIAGNOSTIC_ARRAY_ITEMS) break;
      var normalized = normalizeDiagnosticPayloadArrayValue(source[i]);
      if (normalized === null) continue;
      out.push(normalized);
    }
    return out;
  }

  function normalizeDiagnosticPayloadValue(value) {
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : null;
    }
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      if (!value) return "";
      return truncateDiagnosticText(value, MAX_DIAGNOSTIC_STRING_LENGTH);
    }
    if (Array.isArray(value)) {
      return normalizeDiagnosticPayloadArray(value);
    }
    return null;
  }

  function normalizeDiagnosticPayload(payload) {
    if (!isPlainObject(payload)) return null;
    var out = {};
    var keys = Object.keys(payload);
    var accepted = 0;
    for (var i = 0; i < keys.length; i += 1) {
      if (accepted >= MAX_DIAGNOSTIC_PAYLOAD_KEYS) break;
      var key = truncateDiagnosticText(keys[i], 64);
      if (!key) continue;
      var value = normalizeDiagnosticPayloadValue(payload[keys[i]]);
      if (value === null) continue;
      out[key] = value;
      accepted += 1;
    }
    return Object.keys(out).length > 0 ? out : {};
  }

  function normalizeDiagnosticsIndexEntry(entry) {
    if (!isPlainObject(entry)) return null;
    var key = typeof entry.key === "string" && entry.key ? entry.key : "";
    if (!key) return null;
    var schemaVersion = Number(entry.schemaVersion);
    if (!Number.isInteger(schemaVersion) || schemaVersion < 1) return null;
    var payload = normalizeDiagnosticPayload(entry.payload);
    if (!payload) return null;
    return {
      key: truncateDiagnosticText(key, 64),
      schemaVersion: schemaVersion,
      payload: payload
    };
  }

  function normalizeDiagnosticsIndexEntries(entries) {
    var list = Array.isArray(entries) ? entries : [];
    var normalized = [];
    for (var i = 0; i < list.length; i += 1) {
      if (normalized.length >= MAX_DIAGNOSTICS_INDEX_ENTRIES) break;
      var entry = normalizeDiagnosticsIndexEntry(list[i]);
      if (!entry) continue;
      normalized.push(entry);
    }
    return normalized;
  }

  function compareDatesDesc(a, b) {
    var ta = Date.parse(a && a.ended_at ? a.ended_at : "") || 0;
    var tb = Date.parse(b && b.ended_at ? b.ended_at : "") || 0;
    if (tb !== ta) return tb - ta;
    var sa = Date.parse(a && a.saved_at ? a.saved_at : "") || 0;
    var sb = Date.parse(b && b.saved_at ? b.saved_at : "") || 0;
    return sb - sa;
  }

  function sortDesc(records) {
    records.sort(compareDatesDesc);
    return records;
  }

  function compareBoardSumScoreDesc(a, b) {
    if ((b.board_sum || 0) !== (a.board_sum || 0)) return (b.board_sum || 0) - (a.board_sum || 0);
    if ((b.score || 0) !== (a.score || 0)) return (b.score || 0) - (a.score || 0);
    return compareDatesDesc(a, b);
  }

  function normalizeHistoryBoardMatrix(value) {
    if (!Array.isArray(value)) return [];
    var board = [];
    for (var y = 0; y < value.length; y += 1) {
      var row = Array.isArray(value[y]) ? value[y] : [];
      var normalizedRow = [];
      for (var x = 0; x < row.length; x += 1) {
        normalizedRow.push(Math.floor(Number(row[x]) || 0));
      }
      board.push(normalizedRow);
    }
    return board;
  }

  function calculateHistoryBoardSum(value) {
    if (!Array.isArray(value)) return 0;
    var total = 0;
    for (var y = 0; y < value.length; y += 1) {
      var row = Array.isArray(value[y]) ? value[y] : [];
      for (var x = 0; x < row.length; x += 1) {
        var numeric = Math.floor(Number(row[x]));
        if (!Number.isFinite(numeric) || numeric <= 0) continue;
        total = Math.min(Number.MAX_SAFE_INTEGER, total + numeric);
      }
    }
    return total;
  }

  function resolveHistoryBoardSum(board, storedValue) {
    var hasBoardCells = Array.isArray(board) && board.some(function (row) {
      return Array.isArray(row) && row.length > 0;
    });
    if (hasBoardCells) return calculateHistoryBoardSum(board);
    var stored = Math.floor(Number(storedValue));
    return Number.isFinite(stored) && stored > 0 ? stored : 0;
  }

  function normalizeRecordFallback(raw) {
    raw = isPlainObject(raw) ? raw : {};
    var modeKey = typeof raw.mode_key === "string" && raw.mode_key ? raw.mode_key : "unknown";
    var endedAt = typeof raw.ended_at === "string" && raw.ended_at ? raw.ended_at : nowIso();
    var replayString = typeof raw.replay_string === "string"
      ? raw.replay_string
      : (raw.replay ? JSON.stringify(raw.replay) : "");
    return {
      id: typeof raw.id === "string" && raw.id ? raw.id : makeId(),
      mode: raw.mode || "local",
      mode_key: modeKey,
      board_width: Number.isInteger(raw.board_width) ? raw.board_width : 4,
      board_height: Number.isInteger(raw.board_height) ? raw.board_height : 4,
      ruleset: raw.ruleset || "pow2",
      undo_enabled: !!raw.undo_enabled,
      ranked_bucket: raw.ranked_bucket || "none",
      mode_family: raw.mode_family || "pow2",
      rank_policy: raw.rank_policy || "unranked",
      special_rules_snapshot: isPlainObject(raw.special_rules_snapshot) ? raw.special_rules_snapshot : {},
      challenge_id: raw.challenge_id || null,
      score: Number.isFinite(raw.score) ? Math.floor(raw.score) : 0,
      best_tile: Number.isFinite(raw.best_tile) ? Math.floor(raw.best_tile) : 0,
      duration_ms: Number.isFinite(raw.duration_ms) ? Math.max(0, Math.floor(raw.duration_ms)) : 0,
      final_board: Array.isArray(raw.final_board) ? raw.final_board : [],
      ended_at: endedAt,
      saved_at: typeof raw.saved_at === "string" && raw.saved_at ? raw.saved_at : nowIso(),
      end_reason: raw.end_reason || "game_over",
      client_version: raw.client_version || "1.8",
      replay: isPlainObject(raw.replay) ? raw.replay : null,
      replay_string: replayString,
      owner_type: raw.owner_type,
      owner_user_id: raw.owner_user_id,
      owner_nickname: raw.owner_nickname,
      owner_key: raw.owner_key,
      diagnostics_index_entries: raw.diagnostics_index_entries
    };
  }

  function resolveRuntimeNormalizedHistoryRecord(raw) {
    var runtime = window.CoreGameSettingsStorageRuntime;
    if (!runtime || typeof runtime.normalizeHistoryRecordFromContext !== "function") return null;
    try {
      return runtime.normalizeHistoryRecordFromContext({
        record: raw,
        nowIso: nowIso,
        idFactory: makeId,
        defaultClientVersion: "1.8",
        authUserId: safeReadLocalStorageText(AUTH_USER_ID_STORAGE_KEY),
        authNickname: safeReadLocalStorageText(AUTH_NICKNAME_STORAGE_KEY),
        ownerKeyPartMaxLength: 64,
        maxDiagnosticEntries: MAX_DIAGNOSTICS_INDEX_ENTRIES,
        maxDiagnosticPayloadKeys: MAX_DIAGNOSTIC_PAYLOAD_KEYS,
        maxDiagnosticStringLength: MAX_DIAGNOSTIC_STRING_LENGTH,
        maxDiagnosticArrayItems: MAX_DIAGNOSTIC_ARRAY_ITEMS,
        maxDiagnosticKeyLength: 64
      });
    } catch (_err) {
      return null;
    }
  }

  function normalizeRecord(raw) {
    raw = isPlainObject(raw) ? raw : {};
    var normalizedByRuntime = resolveRuntimeNormalizedHistoryRecord(raw);
    var hasRuntimeBase = isPlainObject(normalizedByRuntime);
    var base = hasRuntimeBase
      ? normalizedByRuntime
      : normalizeRecordFallback(raw);
    var finalBoard = normalizeHistoryBoardMatrix(base.final_board);
    base = Object.assign({}, base, {
      board_sum: resolveHistoryBoardSum(finalBoard, base.board_sum),
      final_board: finalBoard
    });
    if (hasRuntimeBase) {
      base = Object.assign({}, base, {
        diagnostics_index_entries: Array.isArray(base.diagnostics_index_entries)
          ? base.diagnostics_index_entries
          : []
      });
      return Object.assign({}, base, normalizeDeliveryMetadata(raw, base));
    }
    var ownerMeta = resolveOwnerMetaFromRaw(base);
    var diagnosticsSource =
      base && base.diagnostics_index_entries != null
        ? base.diagnostics_index_entries
        : raw.diagnostics_index_entries;

    base = Object.assign({}, base, {
      owner_type: ownerMeta.owner_type,
      owner_user_id: ownerMeta.owner_user_id,
      owner_nickname: ownerMeta.owner_nickname,
      owner_key: ownerMeta.owner_key,
      diagnostics_index_entries: normalizeDiagnosticsIndexEntries(diagnosticsSource)
    });
    return Object.assign({}, base, normalizeDeliveryMetadata(raw, base));
  }

  function requestToPromise(request) {
    return new Promise(function (resolve, reject) {
      request.onsuccess = function () {
        resolve(request.result);
      };
      request.onerror = function () {
        reject(request.error || new Error("idb_request_failed"));
      };
    });
  }

  function txDonePromise(tx) {
    return new Promise(function (resolve, reject) {
      tx.oncomplete = function () {
        resolve();
      };
      tx.onerror = function () {
        reject(tx.error || new Error("idb_tx_failed"));
      };
      tx.onabort = function () {
        reject(tx.error || new Error("idb_tx_aborted"));
      };
    });
  }

  function openDatabase() {
    return new Promise(function (resolve, reject) {
      if (typeof indexedDB === "undefined") {
        resolve(null);
        return;
      }

      var request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = function () {
        var db = request.result;
        var store = null;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
          store.createIndex("mode_key", "mode_key", { unique: false });
          store.createIndex("ended_at", "ended_at", { unique: false });
          store.createIndex("score", "score", { unique: false });
        } else {
          store = request.transaction.objectStore(STORE_NAME);
        }
        if (!store.indexNames.contains("board_sum")) {
          store.createIndex("board_sum", "board_sum", { unique: false });
        }
        if (!store.indexNames.contains("client_record_id")) {
          store.createIndex("client_record_id", "client_record_id", { unique: false });
        }
        if (!store.indexNames.contains("sync_status")) {
          store.createIndex("sync_status", "sync_status", { unique: false });
        }
        if (!store.indexNames.contains("owner_key")) {
          store.createIndex("owner_key", "owner_key", { unique: false });
        }
        var cursorRequest = store.openCursor();
        cursorRequest.onsuccess = function () {
          var cursor = cursorRequest.result;
          if (!cursor) return;
          cursor.update(normalizeRecord(cursor.value));
          cursor.continue();
        };
      };
      request.onsuccess = function () {
        resolve(request.result || null);
      };
      request.onerror = function () {
        reject(request.error || new Error("idb_open_failed"));
      };
    });
  }

  function getDatabase() {
    if (forceLocalFallback) {
      return Promise.resolve(null);
    }
    if (!idbReadyPromise) {
      idbReadyPromise = openDatabase().catch(function () {
        forceLocalFallback = true;
        return null;
      });
    }
    return idbReadyPromise;
  }

  function mirrorSaveFallback(record) {
    var list = readAllFallback();
    var next = [record];
    for (var i = 0; i < list.length; i += 1) {
      var item = list[i];
      if (!item || item.id === record.id) continue;
      next.push(item);
      if (next.length >= MAX_RECORDS) break;
    }
    writeAllFallback(next);
  }

  function mirrorDeleteFallback(id) {
    var list = readAllFallback();
    var next = [];
    for (var i = 0; i < list.length; i += 1) {
      var item = list[i];
      if (!item || item.id === id) continue;
      next.push(item);
    }
    writeAllFallback(next);
  }

  function mirrorReplaceFallback(records) {
    var next = Array.isArray(records) ? records.slice(0, MAX_RECORDS) : [];
    sortDesc(next);
    writeAllFallback(next);
  }

  function ensureMigrated() {
    if (migrationPromise) return migrationPromise;

    migrationPromise = (async function () {
      var db = await getDatabase();
      if (!db) return 0;
      if (!resolveLocalStorage()) return 0;
      if (readLocalStorageItem(MIGRATION_FLAG)) return 0;

      var legacyRecords = readAllFallback();
      if (!legacyRecords.length) {
        writeLocalStorageItem(MIGRATION_FLAG, "1");
        return 0;
      }

      var tx = db.transaction(STORE_NAME, "readwrite");
      var store = tx.objectStore(STORE_NAME);
      for (var i = 0; i < legacyRecords.length; i += 1) {
        var item = legacyRecords[i];
        if (!item || !item.id) continue;
        store.put(normalizeRecord(item));
      }
      await txDonePromise(tx);
      writeLocalStorageItem(MIGRATION_FLAG, "1");
      return legacyRecords.length;
    })().catch(function () {
      forceLocalFallback = true;
      return 0;
    });

    return migrationPromise;
  }

  function matchesKeyword(item, keyword) {
    if (!keyword) return true;
    var haystack = [
      item.id,
      item.mode_key,
      item.mode,
      String(item.score),
      String(item.board_sum),
      String(item.best_tile),
      item.ruleset,
      item.challenge_id || "",
      item.owner_key || "",
      item.owner_user_id || "",
      item.owner_nickname || ""
    ].join(" ").toLowerCase();
    return haystack.indexOf(keyword) !== -1;
  }

  function matchesOwner(item, ownerKey) {
    if (!ownerKey) return true;
    var resolvedKey = toText(item && item.owner_key).trim();
    if (!resolvedKey) {
      resolvedKey = resolveOwnerMetaFromRaw(item).owner_key;
    }
    return resolvedKey === ownerKey;
  }

  function listRecordsFromFallback(options) {
    options = options || {};
    var modeKey = String(options.mode_key || "");
    var ownerKey = String(options.owner_key || "");
    var keyword = String(options.keyword || "").toLowerCase();
    var sortBy = String(options.sort_by || "ended_desc");
    var page = Number.isInteger(options.page) && options.page > 0 ? options.page : 1;
    var pageSize = Number.isInteger(options.page_size) && options.page_size > 0
      ? Math.min(options.page_size, 500)
      : 50;

    var fallbackList = readAllFallback();
    var normalizedFallbackList = [];
    var filteredFallback = [];
    var needsBackfill = false;
    for (var f = 0; f < fallbackList.length; f += 1) {
      var rawRow = fallbackList[f];
      var row = normalizeRecord(rawRow);
      if (!row) continue;
      normalizedFallbackList.push(row);
      if (!rawRow || rawRow.board_sum !== row.board_sum) needsBackfill = true;
      if (modeKey && row.mode_key !== modeKey) continue;
      if (!matchesOwner(row, ownerKey)) continue;
      if (!matchesKeyword(row, keyword)) continue;
      filteredFallback.push(row);
    }
    if (needsBackfill) writeAllFallback(normalizedFallbackList);

    if (sortBy === "score_desc") {
      filteredFallback.sort(function (a, b) {
        if ((b.score || 0) !== (a.score || 0)) return (b.score || 0) - (a.score || 0);
        return compareDatesDesc(a, b);
      });
    } else if (sortBy === "board_sum_desc") {
      filteredFallback.sort(compareBoardSumScoreDesc);
    } else if (sortBy === "ended_asc") {
      filteredFallback.sort(function (a, b) {
        return -compareDatesDesc(a, b);
      });
    } else {
      sortDesc(filteredFallback);
    }

    var fallbackStart = (page - 1) * pageSize;
    return {
      total: filteredFallback.length,
      page: page,
      page_size: pageSize,
      items: filteredFallback.slice(fallbackStart, fallbackStart + pageSize)
    };
  }

  function resolveCryptoLike() {
    try {
      if (typeof globalThis !== "undefined" && globalThis.crypto) return globalThis.crypto;
    } catch (_err) {}
    try {
      if (typeof window !== "undefined" && window.crypto) return window.crypto;
    } catch (_err2) {}
    return null;
  }

  async function sha256Hex(value) {
    var cryptoLike = resolveCryptoLike();
    if (!cryptoLike || !cryptoLike.subtle || typeof cryptoLike.subtle.digest !== "function") return null;
    if (typeof TextEncoder === "undefined") return null;
    var digest = await cryptoLike.subtle.digest("SHA-256", new TextEncoder().encode(toText(value)));
    var bytes = new Uint8Array(digest);
    var out = "";
    for (var i = 0; i < bytes.length; i += 1) out += bytes[i].toString(16).padStart(2, "0");
    return out || null;
  }

  async function prepareRecordForDurableSave(record) {
    var item = normalizeRecord(record);
    var replayString = toText(item.replay_string);
    var replaySha256 = await sha256Hex(replayString);
    return Object.assign({}, item, {
      replay_sha256: replaySha256 || item.replay_sha256 || null,
      replay_byte_size: utf8ByteLength(replayString)
    });
  }

  function verifyDurableRecord(expected, stored) {
    if (!stored || stored.id !== expected.id) throw new Error("history_readback_id_mismatch");
    if (toText(stored.client_record_id) !== toText(expected.client_record_id)) {
      throw new Error("history_readback_client_record_id_mismatch");
    }
    if (toText(stored.replay_string) !== toText(expected.replay_string)) {
      throw new Error("history_readback_replay_mismatch");
    }
    if (Number(stored.replay_byte_size) !== Number(expected.replay_byte_size)) {
      throw new Error("history_readback_size_mismatch");
    }
    if (expected.replay_sha256 && stored.replay_sha256 !== expected.replay_sha256) {
      throw new Error("history_readback_hash_mismatch");
    }
  }

  async function putDurableRecord(item) {
    var db = await getDatabase();
    if (!db) throw new Error("indexeddb_unavailable");

    await ensureMigrated();
    var tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(item);
    await txDonePromise(tx);

    var readTx = db.transaction(STORE_NAME, "readonly");
    var stored = await requestToPromise(readTx.objectStore(STORE_NAME).get(item.id));
    await txDonePromise(readTx);
    stored = stored ? normalizeRecord(stored) : null;
    verifyDurableRecord(item, stored);
    return stored;
  }

  async function saveRecordDurable(record) {
    return putDurableRecord(await prepareRecordForDurableSave(record));
  }

  async function getByClientRecordId(clientRecordId) {
    var key = toText(clientRecordId).trim();
    if (!key) return null;
    var db = await getDatabase();
    if (!db) throw new Error("indexeddb_unavailable");
    await ensureMigrated();
    var tx = db.transaction(STORE_NAME, "readonly");
    var value = await requestToPromise(tx.objectStore(STORE_NAME).index("client_record_id").get(key));
    await txDonePromise(tx);
    return value ? normalizeRecord(value) : null;
  }

  function createHistoryRecordFromSubmitPayload(payload) {
    var finalBoard = Array.isArray(payload.final_board) ? payload.final_board : [];
    var height = finalBoard.length;
    var width = height > 0 && Array.isArray(finalBoard[0]) ? finalBoard[0].length : 4;
    var modeKey = toText(payload.mode_key).trim() || "unknown";
    var owner = resolveOwnerMetaFromRaw(payload);
    return Object.assign({}, payload, {
      id: makeId(),
      mode: toText(payload.mode).trim() || "local",
      mode_key: modeKey,
      board_width: width || 4,
      board_height: height || 4,
      ruleset: modeKey.indexOf("fib_") === 0 ? "fibonacci" : "pow2",
      undo_enabled: modeKey.indexOf("no_undo") < 0 && modeKey.indexOf("_undo") >= 0,
      ranked_bucket: toText(payload.mode_bucket || payload.mode).trim() || "none",
      mode_family: modeKey.indexOf("fib_") === 0 ? "fibonacci" : "pow2",
      rank_policy: "leaderboard",
      special_rules_snapshot: {},
      owner_type: owner.owner_type,
      owner_user_id: owner.owner_user_id,
      owner_nickname: owner.owner_nickname,
      owner_key: owner.owner_key,
      sync_status: owner.owner_type === "user" ? "pending" : "waiting_auth"
    });
  }

  async function prepareRecordSubmit(recordId, payload) {
    var normalizedPayload = isPlainObject(payload) ? payload : null;
    if (!normalizedPayload || !toText(normalizedPayload.replay_string).trim()) {
      throw new Error("record_submit_payload_invalid");
    }
    var clientRecordId = toText(normalizedPayload.client_record_id).trim();
    var existing = recordId ? await getById(recordId) : null;
    if (!existing && clientRecordId) existing = await getByClientRecordId(clientRecordId);
    var base = existing || createHistoryRecordFromSubmitPayload(normalizedPayload);
    var owner = resolveOwnerMetaFromRaw(base);
    return saveRecordDurable(Object.assign({}, base, normalizedPayload, {
      id: base.id,
      owner_type: owner.owner_type,
      owner_user_id: owner.owner_user_id,
      owner_nickname: owner.owner_nickname,
      owner_key: owner.owner_key,
      sync_status: owner.owner_type === "user" ? "pending" : "waiting_auth",
      server_record_id: base.server_record_id || null,
      upload_attempts: base.upload_attempts || 0,
      next_retry_at: null,
      last_error_code: null,
      last_error_message: null
    }));
  }

  async function updateRecord(id, patch) {
    var existing = await getById(id);
    if (!existing) throw new Error("history_record_not_found");
    var next = Object.assign({}, existing, isPlainObject(patch) ? patch : {}, { id: existing.id });
    if (toText(next.replay_string) === toText(existing.replay_string)) {
      next = normalizeRecord(next);
      next.replay_sha256 = existing.replay_sha256 || null;
      next.replay_byte_size = existing.replay_byte_size;
      return putDurableRecord(next);
    }
    return saveRecordDurable(next);
  }

  async function listSyncCandidates(options) {
    var opts = isPlainObject(options) ? options : {};
    var ownerUserId = toText(opts.owner_user_id).trim();
    var statuses = Array.isArray(opts.statuses) && opts.statuses.length
      ? opts.statuses.map(function (value) { return toText(value).trim(); })
      : ["pending", "retry_wait"];
    var allowed = {};
    for (var i = 0; i < statuses.length; i += 1) allowed[statuses[i]] = true;
    var nowMs = Number.isFinite(Number(opts.now_ms)) ? Number(opts.now_ms) : Date.now();
    var includeFutureRetries = opts.include_future_retries === true;
    var db = await getDatabase();
    if (!db) throw new Error("indexeddb_unavailable");
    await ensureMigrated();
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(STORE_NAME, "readonly");
      var request = tx.objectStore(STORE_NAME).openCursor();
      var out = [];
      request.onsuccess = function () {
        var cursor = request.result;
        if (!cursor) {
          out.sort(compareDatesDesc);
          resolve(out);
          return;
        }
        var item = normalizeRecord(cursor.value);
        var retryAt = Date.parse(toText(item.next_retry_at)) || 0;
        if (
          allowed[item.sync_status] &&
          (!ownerUserId || toText(item.owner_user_id).trim() === ownerUserId) &&
          (includeFutureRetries || !retryAt || retryAt <= nowMs)
        ) out.push(item);
        cursor.continue();
      };
      request.onerror = function () { reject(request.error || new Error("idb_cursor_failed")); };
      tx.onerror = function () { reject(tx.error || new Error("idb_tx_failed")); };
    });
  }

  async function saveRecord(record, skipFallbackMirror) {
    var item = normalizeRecord(record);
    var skipMirror = skipFallbackMirror === true;

    var db = await getDatabase();
    if (!db) {
      if (!skipMirror) {
        var fallbackList = readAllFallback();
        fallbackList.unshift(item);
        if (fallbackList.length > MAX_RECORDS) {
          fallbackList = fallbackList.slice(0, MAX_RECORDS);
        }
        writeAllFallback(fallbackList);
      }
      return item;
    }

    await ensureMigrated();
    var tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(item);
    await txDonePromise(tx);
    if (!skipMirror) {
      mirrorSaveFallback(item);
    }
    return item;
  }

  async function getById(id) {
    var key = String(id || "");
    if (!key) return null;

    var db = await getDatabase();
    if (!db) {
      var fallbackList = readAllFallback();
      for (var i = 0; i < fallbackList.length; i += 1) {
        if (fallbackList[i] && fallbackList[i].id === key) return fallbackList[i];
      }
      return null;
    }

    await ensureMigrated();
    var tx = db.transaction(STORE_NAME, "readonly");
    var value = await requestToPromise(tx.objectStore(STORE_NAME).get(key));
    await txDonePromise(tx);
    return value ? normalizeRecord(value) : null;
  }

  async function deleteById(id, skipFallbackMirror) {
    var key = String(id || "");
    if (!key) return false;
    var skipMirror = skipFallbackMirror === true;

    var db = await getDatabase();
    if (!db) {
      if (skipMirror) return false;
      var list = readAllFallback();
      var next = [];
      var removed = false;
      for (var i = 0; i < list.length; i += 1) {
        var item = list[i];
        if (!removed && item && item.id === key) {
          removed = true;
          continue;
        }
        next.push(item);
      }
      if (removed) writeAllFallback(next);
      return removed;
    }

    await ensureMigrated();
    var tx = db.transaction(STORE_NAME, "readwrite");
    var store = tx.objectStore(STORE_NAME);
    var existing = await requestToPromise(store.get(key));
    if (!existing) {
      await txDonePromise(tx);
      return false;
    }
    store.delete(key);
    await txDonePromise(tx);
    if (!skipMirror) {
      mirrorDeleteFallback(key);
    }
    return true;
  }

  async function clearAll(skipFallbackMirror) {
    var skipMirror = skipFallbackMirror === true;
    var db = await getDatabase();
    if (!db) {
      if (!skipMirror) {
        writeAllFallback([]);
      }
      return;
    }

    await ensureMigrated();
    var tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).clear();
    await txDonePromise(tx);
    if (!skipMirror) {
      writeAllFallback([]);
    }
  }

  async function listRecords(options) {
    options = options || {};
    var modeKey = String(options.mode_key || "");
    var ownerKey = String(options.owner_key || "");
    var keyword = String(options.keyword || "").toLowerCase();
    var sortBy = String(options.sort_by || "ended_desc");
    var page = Number.isInteger(options.page) && options.page > 0 ? options.page : 1;
    var pageSize = Number.isInteger(options.page_size) && options.page_size > 0
      ? Math.min(options.page_size, 500)
      : 50;

    var db = await getDatabase();
    if (!db) {
      return listRecordsFromFallback(options);
    }

    await ensureMigrated();

    return new Promise(function (resolve, reject) {
      var tx = db.transaction(STORE_NAME, "readonly");
      var store = tx.objectStore(STORE_NAME);
      var indexName = sortBy === "score_desc"
        ? "score"
        : (sortBy === "board_sum_desc" ? "board_sum" : "ended_at");
      var direction = sortBy === "ended_asc" ? "next" : "prev";
      var source = store.index(indexName);
      var request = source.openCursor(null, direction);

      var total = 0;
      var items = [];
      var filteredItems = [];
      var start = (page - 1) * pageSize;
      var endExclusive = start + pageSize;

      request.onsuccess = function () {
        var cursor = request.result;
        if (!cursor) {
          if (sortBy === "board_sum_desc") {
            filteredItems.sort(compareBoardSumScoreDesc);
            items = filteredItems.slice(start, endExclusive);
          }
          resolve({
            total: total,
            page: page,
            page_size: pageSize,
            items: items
          });
          return;
        }

        var item = normalizeRecord(cursor.value);
        if ((!modeKey || item.mode_key === modeKey) && matchesOwner(item, ownerKey) && matchesKeyword(item, keyword)) {
          if (sortBy === "board_sum_desc") {
            filteredItems.push(item);
          } else if (total >= start && total < endExclusive) {
            items.push(item);
          }
          total += 1;
        }

        cursor.continue();
      };

      request.onerror = function () {
        reject(request.error || new Error("idb_cursor_failed"));
      };

      tx.onerror = function () {
        reject(tx.error || new Error("idb_tx_failed"));
      };
    });
  }

  async function exportRecords(ids) {
    function buildEnvelope(rows) {
      return JSON.stringify({
        v: 1,
        exported_at: nowIso(),
        count: rows.length,
        records: rows
      }, null, 2);
    }

    function selectFallbackRows(source, selectedIds) {
      var idSet = null;
      if (Array.isArray(selectedIds) && selectedIds.length > 0) {
        idSet = {};
        for (var i = 0; i < selectedIds.length; i += 1) {
          idSet[String(selectedIds[i])] = true;
        }
      }
      var rows = [];
      for (var f = 0; f < source.length; f += 1) {
        var item = source[f];
        if (!item) continue;
        if (idSet && !idSet[item.id]) continue;
        rows.push(item);
      }
      return rows;
    }

    var idSet = null;
    if (Array.isArray(ids) && ids.length > 0) {
      idSet = {};
      for (var i = 0; i < ids.length; i += 1) {
        idSet[String(ids[i])] = true;
      }
    }

    var rows = [];
    var db = await getDatabase();
    if (!db) {
      rows = selectFallbackRows(readAllFallback(), ids);
    } else {
      await ensureMigrated();
      rows = await new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE_NAME, "readonly");
        var store = tx.objectStore(STORE_NAME);
        var request = store.openCursor();
        var out = [];

        request.onsuccess = function () {
          var cursor = request.result;
          if (!cursor) {
            resolve(out);
            return;
          }
          var item = cursor.value;
          if (!idSet || idSet[item.id]) {
            out.push(normalizeRecord(item));
          }
          cursor.continue();
        };

        request.onerror = function () {
          reject(request.error || new Error("idb_cursor_failed"));
        };

        tx.onerror = function () {
          reject(tx.error || new Error("idb_tx_failed"));
        };
      });
    }

    return buildEnvelope(rows);
  }

  async function importRecords(text, options, skipFallbackMirror) {
    options = options || {};
    var merge = options.merge !== false;
    var skipMirror = skipFallbackMirror === true;

    var parsed = safeParse(text, null);
    if (!parsed) throw new Error("invalid_json");

    var incoming = [];
    if (Array.isArray(parsed)) incoming = parsed;
    else if (parsed && Array.isArray(parsed.records)) incoming = parsed.records;
    else throw new Error("invalid_payload");

    var normalized = [];
    for (var i = 0; i < incoming.length; i += 1) {
      normalized.push(normalizeRecord(incoming[i]));
    }

    var imported = 0;
    var replaced = 0;

    var db = await getDatabase();
    if (!db) {
      var before = merge ? readAllFallback() : [];
      var map = {};
      for (var b = 0; b < before.length; b += 1) {
        var oldItem = before[b];
        if (oldItem && oldItem.id) {
          map[oldItem.id] = oldItem;
        }
      }
      for (var n = 0; n < normalized.length; n += 1) {
        var itemN = normalized[n];
        if (map[itemN.id]) replaced += 1;
        else imported += 1;
        map[itemN.id] = itemN;
      }

      var nextFallback = [];
      for (var key in map) {
        if (Object.prototype.hasOwnProperty.call(map, key)) {
          nextFallback.push(map[key]);
        }
      }
      sortDesc(nextFallback);
      if (nextFallback.length > MAX_RECORDS) {
        nextFallback = nextFallback.slice(0, MAX_RECORDS);
      }
      if (!skipMirror) {
        writeAllFallback(nextFallback);
      }
      return {
        imported: imported,
        replaced: replaced,
        total: nextFallback.length
      };
    }

    await ensureMigrated();

    if (!merge) {
      await clearAll();
    }

    for (var m = 0; m < normalized.length; m += 1) {
      var item = normalized[m];
      var existing = merge ? await getById(item.id) : null;
      if (existing) replaced += 1;
      else imported += 1;
      await saveRecord(item);
    }

    var fullList = await listRecords({ page: 1, page_size: MAX_RECORDS, sort_by: "ended_desc" });
    var capped = Array.isArray(fullList.items) ? fullList.items.slice(0, MAX_RECORDS) : [];

    if ((fullList.total || 0) > MAX_RECORDS) {
      var tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).clear();
      await txDonePromise(tx);
      for (var c = 0; c < capped.length; c += 1) {
        var keep = capped[c];
        var txPut = db.transaction(STORE_NAME, "readwrite");
        txPut.objectStore(STORE_NAME).put(keep);
        await txDonePromise(txPut);
      }
    }

    if (!skipMirror) {
      mirrorReplaceFallback(capped);
    }

    return {
      imported: imported,
      replaced: replaced,
      total: capped.length
    };
  }

  function download(filename, content, mimeType) {
    if (typeof document === "undefined") return;
    var resolvedMimeType =
      typeof mimeType === "string" && mimeType
        ? mimeType
        : "application/json;charset=utf-8";
    var blob = new Blob([content], { type: resolvedMimeType });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 300);
  }

  async function getAll() {
    var result = await listRecords({ page: 1, page_size: MAX_RECORDS, sort_by: "ended_desc" });
    return Array.isArray(result.items) ? result.items : [];
  }

  var syncToAsyncQueue = Promise.resolve();

  function enqueueAsyncSyncTask(task) {
    if (typeof task !== "function") return;
    syncToAsyncQueue = syncToAsyncQueue
      .then(function () {
        return task();
      })
      .catch(function () {});
  }

  function saveRecordCompat(record) {
    var item = normalizeRecord(record);
    mirrorSaveFallback(item);
    enqueueAsyncSyncTask(function () {
      return saveRecord(item, true);
    });
    return item;
  }

  function getByIdCompat(id) {
    var key = String(id || "");
    if (!key) return null;
    var all = readAllFallback();
    for (var i = 0; i < all.length; i += 1) {
      var item = all[i];
      if (item && item.id === key) return normalizeRecord(item);
    }
    return null;
  }

  function deleteByIdCompat(id) {
    var key = String(id || "");
    if (!key) return false;

    var all = readAllFallback();
    var next = [];
    var removed = false;
    for (var i = 0; i < all.length; i += 1) {
      var item = all[i];
      if (!removed && item && item.id === key) {
        removed = true;
        continue;
      }
      next.push(item);
    }
    if (removed) writeAllFallback(next);
    enqueueAsyncSyncTask(function () {
      return deleteById(key, true);
    });
    return removed;
  }

  function clearAllCompat() {
    writeAllFallback([]);
    enqueueAsyncSyncTask(function () {
      return clearAll(true);
    });
  }

  function listRecordsCompat(options) {
    return listRecordsFromFallback(options);
  }

  function exportRecordsCompat(ids) {
    var idSet = null;
    if (Array.isArray(ids) && ids.length > 0) {
      idSet = {};
      for (var i = 0; i < ids.length; i += 1) {
        idSet[String(ids[i])] = true;
      }
    }
    var all = readAllFallback();
    var rows = [];
    for (var r = 0; r < all.length; r += 1) {
      var row = normalizeRecord(all[r]);
      if (!row) continue;
      if (idSet && !idSet[row.id]) continue;
      rows.push(row);
    }
    return JSON.stringify({
      v: 1,
      exported_at: nowIso(),
      count: rows.length,
      records: rows
    }, null, 2);
  }

  function importRecordsCompat(text, options) {
    options = options || {};
    var merge = options.merge !== false;

    var parsed = safeParse(text, null);
    if (!parsed) throw new Error("invalid_json");

    var incoming = [];
    if (Array.isArray(parsed)) incoming = parsed;
    else if (parsed && Array.isArray(parsed.records)) incoming = parsed.records;
    else throw new Error("invalid_payload");

    var normalized = [];
    for (var i = 0; i < incoming.length; i += 1) {
      normalized.push(normalizeRecord(incoming[i]));
    }

    var imported = 0;
    var replaced = 0;
    var base = merge ? readAllFallback() : [];
    var map = {};
    for (var b = 0; b < base.length; b += 1) {
      var oldItem = base[b];
      if (oldItem && oldItem.id) map[oldItem.id] = oldItem;
    }
    for (var n = 0; n < normalized.length; n += 1) {
      var item = normalized[n];
      if (map[item.id]) replaced += 1;
      else imported += 1;
      map[item.id] = item;
    }

    var next = [];
    for (var key in map) {
      if (Object.prototype.hasOwnProperty.call(map, key)) next.push(map[key]);
    }
    sortDesc(next);
    if (next.length > MAX_RECORDS) next = next.slice(0, MAX_RECORDS);
    writeAllFallback(next);
    enqueueAsyncSyncTask(function () {
      return importRecords(text, options, true);
    });

    return {
      imported: imported,
      replaced: replaced,
      total: next.length
    };
  }

  function getAllCompat() {
    return listRecordsFromFallback({
      page: 1,
      page_size: MAX_RECORDS,
      sort_by: "ended_desc"
    }).items;
  }

  window.LocalHistoryStore = {
    saveRecord: saveRecordCompat,
    getById: getByIdCompat,
    deleteById: deleteByIdCompat,
    clearAll: clearAllCompat,
    listRecords: listRecordsCompat,
    exportRecords: exportRecordsCompat,
    importRecords: importRecordsCompat,
    download: download,
    getAll: getAllCompat,
    // Async APIs stay available for newer runtime call sites.
    saveRecordAsync: saveRecord,
    saveRecordDurable: saveRecordDurable,
    getByIdAsync: getById,
    getByClientRecordIdAsync: getByClientRecordId,
    prepareRecordSubmitAsync: prepareRecordSubmit,
    updateRecordAsync: updateRecord,
    listSyncCandidatesAsync: listSyncCandidates,
    deleteByIdAsync: deleteById,
    clearAllAsync: clearAll,
    listRecordsAsync: listRecords,
    exportRecordsAsync: exportRecords,
    importRecordsAsync: importRecords,
    getAllAsync: getAll,
    ensureMigrated: ensureMigrated
  };

  ensureMigrated();
})();
