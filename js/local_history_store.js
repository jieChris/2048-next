(function () {
  "use strict";

  var STORAGE_KEY = "local_game_history_v1";
  var MAX_RECORDS = 5000;

  var DB_NAME = "game_history_db";
  var DB_VERSION = 1;
  var STORE_NAME = "records";
  var MIGRATION_FLAG = "idb_history_migrated_v1";

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

  function readAllFallback() {
    try {
      var parsed = safeParse(localStorage.getItem(STORAGE_KEY) || "[]", []);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_err) {
      return [];
    }
  }

  function writeAllFallback(records) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch (_err) {}
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function makeId() {
    var t = Date.now().toString(36);
    var r = Math.random().toString(36).slice(2, 10);
    return "lh_" + t + "_" + r;
  }

  function isPlainObject(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
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

  function normalizeRecord(raw) {
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
      replay_string: replayString
    };
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
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          var store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
          store.createIndex("mode_key", "mode_key", { unique: false });
          store.createIndex("ended_at", "ended_at", { unique: false });
          store.createIndex("score", "score", { unique: false });
        }
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
      if (typeof localStorage === "undefined") return 0;
      if (localStorage.getItem(MIGRATION_FLAG)) return 0;

      var legacyRecords = readAllFallback();
      if (!legacyRecords.length) {
        localStorage.setItem(MIGRATION_FLAG, "1");
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
      localStorage.setItem(MIGRATION_FLAG, "1");
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
      String(item.best_tile),
      item.ruleset,
      item.challenge_id || ""
    ].join(" ").toLowerCase();
    return haystack.indexOf(keyword) !== -1;
  }

  function listRecordsFromFallback(options) {
    options = options || {};
    var modeKey = String(options.mode_key || "");
    var keyword = String(options.keyword || "").toLowerCase();
    var sortBy = String(options.sort_by || "ended_desc");
    var page = Number.isInteger(options.page) && options.page > 0 ? options.page : 1;
    var pageSize = Number.isInteger(options.page_size) && options.page_size > 0
      ? Math.min(options.page_size, 500)
      : 50;

    var fallbackList = readAllFallback();
    var filteredFallback = [];
    for (var f = 0; f < fallbackList.length; f += 1) {
      var row = fallbackList[f];
      if (!row) continue;
      if (modeKey && row.mode_key !== modeKey) continue;
      if (!matchesKeyword(row, keyword)) continue;
      filteredFallback.push(row);
    }

    if (sortBy === "score_desc") {
      filteredFallback.sort(function (a, b) {
        if ((b.score || 0) !== (a.score || 0)) return (b.score || 0) - (a.score || 0);
        return compareDatesDesc(a, b);
      });
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
    return value || null;
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
      var indexName = sortBy === "score_desc" ? "score" : "ended_at";
      var direction = sortBy === "ended_asc" ? "next" : "prev";
      var source = store.index(indexName);
      var request = source.openCursor(null, direction);

      var total = 0;
      var items = [];
      var start = (page - 1) * pageSize;
      var endExclusive = start + pageSize;

      request.onsuccess = function () {
        var cursor = request.result;
        if (!cursor) {
          resolve({
            total: total,
            page: page,
            page_size: pageSize,
            items: items
          });
          return;
        }

        var item = cursor.value;
        if ((!modeKey || item.mode_key === modeKey) && matchesKeyword(item, keyword)) {
          if (total >= start && total < endExclusive) {
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
            out.push(item);
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
      if (item && item.id === key) return item;
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
      var row = all[r];
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
    getByIdAsync: getById,
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
