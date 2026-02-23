(function () {
  var STORAGE_KEY = "local_game_history_v1";
  var MAX_RECORDS = 5000;

  function safeParse(raw, fallback) {
    try {
      return JSON.parse(raw);
    } catch (_err) {
      return fallback;
    }
  }

  function readAll() {
    try {
      var parsed = safeParse(localStorage.getItem(STORAGE_KEY) || "[]", []);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_err) {
      return [];
    }
  }

  function writeAll(records) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
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

  function clonePlainObject(value) {
    if (!isPlainObject(value)) return null;
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (_err) {
      return null;
    }
  }

  function toFiniteNumberOrNull(value) {
    var num = Number(value);
    return Number.isFinite(num) ? num : null;
  }

  function normalizeAdapterParityFilter(value) {
    if (value === "mismatch" || value === "match" || value === "incomplete") return value;
    return "all";
  }

  function getAdapterParityStatus(record) {
    var item = isPlainObject(record) ? record : {};
    var diff = isPlainObject(item.adapter_parity_ab_diff_v1) ? item.adapter_parity_ab_diff_v1 : null;
    if (!diff) return "incomplete";
    if (diff.comparable !== true) return "incomplete";

    var deltas = [
      toFiniteNumberOrNull(diff.scoreDelta),
      toFiniteNumberOrNull(diff.undoUsedDelta),
      toFiniteNumberOrNull(diff.undoEventsDelta),
      toFiniteNumberOrNull(diff.wonEventsDelta),
      toFiniteNumberOrNull(diff.overEventsDelta)
    ];
    var hasNonZeroDelta = false;
    for (var i = 0; i < deltas.length; i++) {
      if (deltas[i] !== null && deltas[i] !== 0) {
        hasNonZeroDelta = true;
        break;
      }
    }

    if (diff.isScoreMatch === false || diff.bothScoreAligned === false || hasNonZeroDelta) {
      return "mismatch";
    }
    if (diff.isScoreMatch === true) {
      return "match";
    }
    return "incomplete";
  }

  function hasAdapterParityDiagnostics(record) {
    if (!isPlainObject(record)) return false;
    return isPlainObject(record.adapter_parity_report_v1) || isPlainObject(record.adapter_parity_ab_diff_v1);
  }

  function toPositiveIntegerOrNull(value) {
    var num = Number(value);
    if (!Number.isFinite(num)) return null;
    num = Math.floor(num);
    return num > 0 ? num : null;
  }

  function buildBurnInGate(comparable, mismatchRate, minComparable, maxMismatchRate) {
    var gateStatus = "insufficient_sample";
    var passGate = null;
    if (comparable >= minComparable) {
      if (mismatchRate !== null && mismatchRate <= maxMismatchRate) {
        gateStatus = "pass";
        passGate = true;
      } else {
        gateStatus = "fail";
        passGate = false;
      }
    }
    return {
      gateStatus: gateStatus,
      passGate: passGate
    };
  }

  function summarizeBurnInWindow(records, minComparable, maxMismatchRate) {
    var list = Array.isArray(records) ? records : [];
    var withDiagnostics = 0;
    var comparable = 0;
    var match = 0;
    var mismatch = 0;
    var incomplete = 0;

    for (var i = 0; i < list.length; i++) {
      var item = list[i];
      if (hasAdapterParityDiagnostics(item)) withDiagnostics += 1;
      var status = getAdapterParityStatus(item);
      if (status === "match") {
        comparable += 1;
        match += 1;
      } else if (status === "mismatch") {
        comparable += 1;
        mismatch += 1;
      } else {
        incomplete += 1;
      }
    }

    var mismatchRate = comparable > 0 ? (mismatch * 100) / comparable : null;
    var gate = buildBurnInGate(comparable, mismatchRate, minComparable, maxMismatchRate);

    return {
      recordCount: list.length,
      withDiagnostics: withDiagnostics,
      comparable: comparable,
      match: match,
      mismatch: mismatch,
      incomplete: incomplete,
      mismatchRate: mismatchRate,
      gateStatus: gate.gateStatus,
      passGate: gate.passGate
    };
  }

  function getAdapterParityBurnInSummary(options) {
    options = options || {};
    var sampleLimitInput = options.sample_limit;
    var sampleLimit = null;
    if (!(typeof sampleLimitInput === "string" && sampleLimitInput.toLowerCase() === "all")) {
      sampleLimit = toPositiveIntegerOrNull(sampleLimitInput);
      if (sampleLimit !== null) sampleLimit = Math.min(sampleLimit, MAX_RECORDS);
    }

    var minComparable = toPositiveIntegerOrNull(options.min_comparable);
    if (minComparable === null) minComparable = 50;

    var maxMismatchRate = toFiniteNumberOrNull(options.max_mismatch_rate);
    if (maxMismatchRate === null || maxMismatchRate < 0) maxMismatchRate = 1;

    var sustainedWindows = toPositiveIntegerOrNull(options.sustained_windows);
    if (sustainedWindows === null) sustainedWindows = 3;

    var matched = [];
    var page = 1;
    while (page <= 100) {
      var result = listRecords({
        mode_key: options.mode_key || "",
        keyword: options.keyword || "",
        sort_by: options.sort_by || "ended_desc",
        adapter_parity_filter: "all",
        page: page,
        page_size: 500
      });
      var items = result && Array.isArray(result.items) ? result.items : [];
      if (!items.length) break;
      for (var i = 0; i < items.length; i++) matched.push(items[i]);
      if (matched.length >= (result.total || 0)) break;
      page += 1;
    }

    var source = sampleLimit === null ? matched : matched.slice(0, sampleLimit);
    var primary = summarizeBurnInWindow(source, minComparable, maxMismatchRate);
    var sustainedWindowSize = sampleLimit === null ? matched.length : sampleLimit;
    var sustainedWindowDetails = [];
    if (sustainedWindowSize > 0) {
      for (var w = 0; w < sustainedWindows; w++) {
        var start = w * sustainedWindowSize;
        if (start >= matched.length) break;
        var windowRecords = matched.slice(start, start + sustainedWindowSize);
        var stat = summarizeBurnInWindow(windowRecords, minComparable, maxMismatchRate);
        stat.windowIndex = w + 1;
        sustainedWindowDetails.push(stat);
      }
    }

    var sustainedConsecutivePass = 0;
    for (var z = 0; z < sustainedWindowDetails.length; z++) {
      if (sustainedWindowDetails[z].passGate === true) sustainedConsecutivePass += 1;
      else break;
    }

    var sustainedGateStatus = "insufficient_window";
    var sustainedPassGate = null;
    if (sustainedWindowDetails.length >= sustainedWindows) {
      if (sustainedConsecutivePass >= sustainedWindows) {
        sustainedGateStatus = "pass";
        sustainedPassGate = true;
      } else {
        var hasSampleInsufficient = false;
        for (var y = 0; y < sustainedWindows; y++) {
          if (sustainedWindowDetails[y].gateStatus === "insufficient_sample") {
            hasSampleInsufficient = true;
            break;
          }
        }
        if (hasSampleInsufficient) {
          sustainedGateStatus = "insufficient_sample";
          sustainedPassGate = null;
        } else {
          sustainedGateStatus = "fail";
          sustainedPassGate = false;
        }
      }
    }

    return {
      matchedRecords: matched.length,
      evaluatedRecords: source.length,
      sampleLimit: sampleLimit,
      sustainedWindows: sustainedWindows,
      sustainedWindowSize: sustainedWindowSize,
      sustainedEvaluatedWindows: sustainedWindowDetails.length,
      sustainedConsecutivePass: sustainedConsecutivePass,
      sustainedGateStatus: sustainedGateStatus,
      sustainedPassGate: sustainedPassGate,
      sustainedWindowDetails: sustainedWindowDetails,
      minComparable: minComparable,
      maxMismatchRate: maxMismatchRate,
      withDiagnostics: primary.withDiagnostics,
      comparable: primary.comparable,
      match: primary.match,
      mismatch: primary.mismatch,
      incomplete: primary.incomplete,
      mismatchRate: primary.mismatchRate,
      gateStatus: primary.gateStatus,
      passGate: primary.passGate
    };
  }

  function normalizeRecord(raw) {
    raw = raw || {};
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
      special_rules_snapshot: raw.special_rules_snapshot && typeof raw.special_rules_snapshot === "object"
        ? raw.special_rules_snapshot
        : {},
      challenge_id: raw.challenge_id || null,
      score: Number.isFinite(raw.score) ? Math.floor(raw.score) : 0,
      best_tile: Number.isFinite(raw.best_tile) ? Math.floor(raw.best_tile) : 0,
      duration_ms: Number.isFinite(raw.duration_ms) ? Math.max(0, Math.floor(raw.duration_ms)) : 0,
      final_board: Array.isArray(raw.final_board) ? raw.final_board : [],
      ended_at: endedAt,
      saved_at: typeof raw.saved_at === "string" && raw.saved_at ? raw.saved_at : nowIso(),
      end_reason: raw.end_reason || "game_over",
      client_version: raw.client_version || "1.8",
      replay: raw.replay && typeof raw.replay === "object" ? raw.replay : null,
      replay_string: replayString,
      adapter_parity_report_v1: clonePlainObject(raw.adapter_parity_report_v1),
      adapter_parity_ab_diff_v1: clonePlainObject(raw.adapter_parity_ab_diff_v1)
    };
  }

  function sortDesc(records) {
    records.sort(function (a, b) {
      var ta = Date.parse(a && a.ended_at ? a.ended_at : "") || 0;
      var tb = Date.parse(b && b.ended_at ? b.ended_at : "") || 0;
      if (tb !== ta) return tb - ta;
      var sa = Date.parse(a && a.saved_at ? a.saved_at : "") || 0;
      var sb = Date.parse(b && b.saved_at ? b.saved_at : "") || 0;
      return sb - sa;
    });
    return records;
  }

  function saveRecord(record) {
    var list = readAll();
    var item = normalizeRecord(record);
    list.unshift(item);
    if (list.length > MAX_RECORDS) list = list.slice(0, MAX_RECORDS);
    writeAll(list);
    return item;
  }

  function getById(id) {
    var list = readAll();
    for (var i = 0; i < list.length; i++) {
      if (list[i] && list[i].id === id) return list[i];
    }
    return null;
  }

  function deleteById(id) {
    var list = readAll();
    var next = [];
    var removed = false;
    for (var i = 0; i < list.length; i++) {
      var item = list[i];
      if (!removed && item && item.id === id) {
        removed = true;
        continue;
      }
      next.push(item);
    }
    if (removed) writeAll(next);
    return removed;
  }

  function clearAll() {
    writeAll([]);
  }

  function listRecords(options) {
    options = options || {};
    var modeKey = options.mode_key || "";
    var keyword = (options.keyword || "").toLowerCase();
    var sortBy = options.sort_by || "ended_desc";
    var adapterParityFilter = normalizeAdapterParityFilter(options.adapter_parity_filter);
    var page = Number.isInteger(options.page) && options.page > 0 ? options.page : 1;
    var pageSize = Number.isInteger(options.page_size) && options.page_size > 0
      ? Math.min(options.page_size, 500)
      : 50;

    var list = readAll();
    var filtered = [];
    for (var i = 0; i < list.length; i++) {
      var item = list[i];
      if (!item) continue;
      if (modeKey && item.mode_key !== modeKey) continue;
      if (keyword) {
        var haystack = [
          item.id,
          item.mode_key,
          item.mode,
          String(item.score),
          String(item.best_tile),
          item.ruleset,
          item.challenge_id || ""
        ].join(" ").toLowerCase();
        if (haystack.indexOf(keyword) === -1) continue;
      }
      if (adapterParityFilter !== "all" && getAdapterParityStatus(item) !== adapterParityFilter) continue;
      filtered.push(item);
    }

    if (sortBy === "score_desc") {
      filtered.sort(function (a, b) {
        if ((b.score || 0) !== (a.score || 0)) return (b.score || 0) - (a.score || 0);
        var ta = Date.parse(a.ended_at || "") || 0;
        var tb = Date.parse(b.ended_at || "") || 0;
        return tb - ta;
      });
    } else if (sortBy === "ended_asc") {
      filtered.sort(function (a, b) {
        var ta = Date.parse(a.ended_at || "") || 0;
        var tb = Date.parse(b.ended_at || "") || 0;
        return ta - tb;
      });
    } else {
      sortDesc(filtered);
    }

    var total = filtered.length;
    var start = (page - 1) * pageSize;
    var end = start + pageSize;
    return {
      total: total,
      page: page,
      page_size: pageSize,
      items: filtered.slice(start, end)
    };
  }

  function exportRecords(ids) {
    var source = readAll();
    var selected;
    if (Array.isArray(ids) && ids.length) {
      var idSet = {};
      for (var i = 0; i < ids.length; i++) idSet[String(ids[i])] = true;
      selected = [];
      for (var j = 0; j < source.length; j++) {
        if (source[j] && idSet[source[j].id]) selected.push(source[j]);
      }
    } else {
      selected = source;
    }

    return JSON.stringify({
      v: 1,
      exported_at: nowIso(),
      count: selected.length,
      records: selected
    }, null, 2);
  }

  function importRecords(text, options) {
    options = options || {};
    var merge = options.merge !== false;

    var parsed = safeParse(text, null);
    if (!parsed) throw new Error("invalid_json");

    var incoming = [];
    if (Array.isArray(parsed)) incoming = parsed;
    else if (parsed && Array.isArray(parsed.records)) incoming = parsed.records;
    else throw new Error("invalid_payload");

    var normalized = [];
    for (var i = 0; i < incoming.length; i++) {
      normalized.push(normalizeRecord(incoming[i]));
    }

    var before = readAll();
    var map = {};
    if (merge) {
      for (var b = 0; b < before.length; b++) {
        var oldItem = before[b];
        if (oldItem && oldItem.id) map[oldItem.id] = oldItem;
      }
    }

    var imported = 0;
    var replaced = 0;
    for (var n = 0; n < normalized.length; n++) {
      var item = normalized[n];
      if (map[item.id]) replaced += 1;
      else imported += 1;
      map[item.id] = item;
    }

    var next = [];
    for (var k in map) {
      if (Object.prototype.hasOwnProperty.call(map, k)) next.push(map[k]);
    }
    sortDesc(next);
    if (next.length > MAX_RECORDS) next = next.slice(0, MAX_RECORDS);
    writeAll(next);

    return {
      imported: imported,
      replaced: replaced,
      total: next.length
    };
  }

  function download(filename, content) {
    if (typeof document === "undefined") return;
    var blob = new Blob([content], { type: "application/json;charset=utf-8" });
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

  window.LocalHistoryStore = {
    saveRecord: saveRecord,
    getById: getById,
    deleteById: deleteById,
    clearAll: clearAll,
    listRecords: listRecords,
    exportRecords: exportRecords,
    importRecords: importRecords,
    download: download,
    getAll: readAll,
    getAdapterParityStatus: getAdapterParityStatus,
    getAdapterParityBurnInSummary: getAdapterParityBurnInSummary
  };
})();
