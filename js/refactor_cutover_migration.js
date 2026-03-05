(function (global) {
  "use strict";

  if (!global || !global.localStorage) return;

  var DONE_KEY = "refactor_cutover_v1_done";
  var PRACTICE_OLD = "practice_legacy";
  var PRACTICE_NEW = "practice";
  var HISTORY_KEY = "local_game_history_v1";

  function safeGet(key) {
    try {
      return global.localStorage.getItem(key);
    } catch (_error) {
      return null;
    }
  }

  function safeSet(key, value) {
    try {
      global.localStorage.setItem(key, value);
      return true;
    } catch (_error) {
      return false;
    }
  }

  function safeRemove(key) {
    try {
      global.localStorage.removeItem(key);
      return true;
    } catch (_error) {
      return false;
    }
  }

  function parseObject(raw) {
    if (!raw || typeof raw !== "string") return null;
    try {
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
    } catch (_error) {
      return null;
    }
  }

  function parseArray(raw) {
    if (!raw || typeof raw !== "string") return null;
    try {
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : null;
    } catch (_error) {
      return null;
    }
  }

  function migrateBestScore() {
    var oldKey = "bestScoreByMode:" + PRACTICE_OLD;
    var nextKey = "bestScoreByMode:" + PRACTICE_NEW;
    var oldRaw = safeGet(oldKey);
    if (!oldRaw) return;

    var oldValue = Number(oldRaw);
    if (!Number.isFinite(oldValue)) return;
    var nextValue = Number(safeGet(nextKey));
    var resolved = Number.isFinite(nextValue) ? Math.max(nextValue, oldValue) : oldValue;
    safeSet(nextKey, String(resolved));
    safeRemove(oldKey);
  }

  function resolveSavedAt(payload) {
    return payload && Number.isFinite(Number(payload.saved_at)) ? Number(payload.saved_at) : 0;
  }

  function migrateSavedState(keyPrefix) {
    var oldKey = keyPrefix + PRACTICE_OLD;
    var nextKey = keyPrefix + PRACTICE_NEW;
    var oldPayload = parseObject(safeGet(oldKey));
    if (!oldPayload) return;

    var nextPayload = parseObject(safeGet(nextKey));
    if (!nextPayload || resolveSavedAt(oldPayload) >= resolveSavedAt(nextPayload)) {
      oldPayload.mode_key = PRACTICE_NEW;
      safeSet(nextKey, JSON.stringify(oldPayload));
    }
    safeRemove(oldKey);
  }

  function migrateHistoryRecords() {
    var rows = parseArray(safeGet(HISTORY_KEY));
    if (!rows) return;

    var changed = false;
    for (var i = 0; i < rows.length; i += 1) {
      var row = rows[i];
      if (!row || typeof row !== "object") continue;
      if (row.mode_key === PRACTICE_OLD) {
        row.mode_key = PRACTICE_NEW;
        changed = true;
      }
      var cleanupKeys = [
        "adapter_parity_report_v1",
        "adapter_parity_report_v2",
        "adapter_parity_ab_diff_v1",
        "adapter_parity_ab_diff_v2"
      ];
      for (var k = 0; k < cleanupKeys.length; k += 1) {
        if (Object.prototype.hasOwnProperty.call(row, cleanupKeys[k])) {
          delete row[cleanupKeys[k]];
          changed = true;
        }
      }
    }

    if (changed) {
      safeSet(HISTORY_KEY, JSON.stringify(rows));
    }
  }

  function cleanupFilterState() {
    var key = "history_filter_state_v1";
    var parsed = parseObject(safeGet(key));
    if (!parsed) {
      safeRemove(key);
      return;
    }

    var filter = parsed.filter && typeof parsed.filter === "object" ? parsed.filter : parsed;
    var modeKey = filter.modeKey == null ? "" : String(filter.modeKey);
    var keyword = filter.keyword == null ? "" : String(filter.keyword);
    var sortBy = filter.sortBy == null ? "ended_desc" : String(filter.sortBy || "ended_desc");

    if (!modeKey && !keyword && sortBy === "ended_desc") {
      safeRemove(key);
      return;
    }

    safeSet(
      key,
      JSON.stringify({
        schemaVersion: 2,
        filter: {
          modeKey: modeKey,
          keyword: keyword,
          sortBy: sortBy
        }
      })
    );
  }

  function runMigration() {
    if (safeGet(DONE_KEY) === "1") return;

    migrateBestScore();
    migrateSavedState("savedGameStateByMode:v1:");
    migrateSavedState("savedGameStateLiteByMode:v1:");
    migrateHistoryRecords();

    safeRemove("engine_adapter_mode");
    safeRemove("engine_adapter_default_mode");
    safeRemove("engine_adapter_force_legacy");
    cleanupFilterState();

    safeSet(DONE_KEY, "1");
  }

  runMigration();
})(typeof window !== "undefined" ? window : undefined);
