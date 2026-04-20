(function () {
  "use strict";

  var FILTER_STORAGE_KEY = "history_filter_state_v1";

  function $(id) {
    return document.getElementById(id);
  }

  function toText(value) {
    return value == null ? "" : String(value);
  }

  function resolveLocalStorage() {
    try {
      if (typeof localStorage === "undefined") return null;
      return localStorage;
    } catch (_error) {
      return null;
    }
  }

  function readLocalStorageItem(key) {
    var storage = resolveLocalStorage();
    if (!storage || typeof storage.getItem !== "function") return null;
    try {
      return storage.getItem(key);
    } catch (_error) {
      return null;
    }
  }

  function writeLocalStorageItem(key, value) {
    var storage = resolveLocalStorage();
    if (!storage || typeof storage.setItem !== "function") return;
    try {
      storage.setItem(key, value);
    } catch (_error) {}
  }

  function removeLocalStorageItem(key) {
    var storage = resolveLocalStorage();
    if (!storage || typeof storage.removeItem !== "function") return;
    try {
      storage.removeItem(key);
    } catch (_error) {}
  }

  function escapeHtml(value) {
    return toText(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function getUiLang() {
    try {
      var raw = toText(readLocalStorageItem("ui_language_v1")).trim().toLowerCase();
      return raw === "en" ? "en" : "zh";
    } catch (_error) {
      return "zh";
    }
  }

  function getGuestOwnerLabel() {
    return getUiLang() === "en" ? "Guest" : "游客";
  }

  function getAllOwnersLabel() {
    return getUiLang() === "en" ? "All Owners" : "全部归属";
  }

  function getUnknownOwnerLabel() {
    return getUiLang() === "en" ? "Unknown User" : "未知用户";
  }

  function normalizeOwnerDisplay(item) {
    item = item && typeof item === "object" ? item : {};
    var ownerType = toText(item && item.owner_type).trim().toLowerCase();
    var ownerUserId = toText(item && item.owner_user_id).trim();
    var ownerNickname = toText(item && item.owner_nickname).trim();
    var ownerKey = toText(item && item.owner_key).trim();

    if (!ownerKey) {
      if (ownerType === "guest" || (!ownerUserId && !ownerNickname)) {
        ownerKey = "guest";
      } else if (ownerUserId) {
        ownerKey = "user:" + ownerUserId;
      } else {
        ownerKey = "nick:" + ownerNickname.toLowerCase();
      }
    }

    var isGuest = ownerType === "guest" || ownerKey === "guest" || (!ownerUserId && !ownerNickname);
    var label = isGuest
      ? getGuestOwnerLabel()
      : (ownerNickname || (ownerUserId ? "ID:" + ownerUserId : getUnknownOwnerLabel()));

    return {
      key: ownerKey || "guest",
      isGuest: isGuest,
      label: label
    };
  }

  function setStatus(text, isError) {
    var node = $("history-status");
    if (!node) return;
    node.textContent = toText(text);
    node.style.color = isError ? "#ff7f7f" : "";
  }

  function isPromiseLike(value) {
    return !!value && (typeof value === "object" || typeof value === "function") && typeof value.then === "function";
  }

  async function callStore(methodName) {
    if (!window.LocalHistoryStore) {
      throw new Error("local_history_store_missing");
    }
    var method = window.LocalHistoryStore[methodName];
    if (typeof method !== "function") {
      var preferredAsyncName = methodName + "Async";
      method = window.LocalHistoryStore[preferredAsyncName];
    }
    if (typeof method !== "function") {
      throw new Error("local_history_method_missing:" + methodName);
    }
    var args = Array.prototype.slice.call(arguments, 1);
    return await method.apply(window.LocalHistoryStore, args);
  }

  function readFilterState(defaults) {
    try {
      var raw = readLocalStorageItem(FILTER_STORAGE_KEY);
      if (!raw) return defaults;
      var parsed = JSON.parse(raw);
      var filter = parsed && parsed.filter && typeof parsed.filter === "object" ? parsed.filter : parsed;
      if (!filter || typeof filter !== "object") return defaults;
      return {
        page: 1,
        pageSize: defaults.pageSize,
        modeKey: typeof filter.modeKey === "string" ? filter.modeKey : defaults.modeKey,
        ownerKey: typeof filter.ownerKey === "string" ? filter.ownerKey : defaults.ownerKey,
        keyword: typeof filter.keyword === "string" ? filter.keyword : defaults.keyword,
        sortBy: typeof filter.sortBy === "string" ? filter.sortBy : defaults.sortBy
      };
    } catch (_error) {
      return defaults;
    }
  }

  function persistFilterState(state, defaults) {
    var filter = {
      modeKey: toText(state.modeKey),
      ownerKey: toText(state.ownerKey),
      keyword: toText(state.keyword),
      sortBy: toText(state.sortBy)
    };
    var isDefault =
      filter.modeKey === toText(defaults.modeKey) &&
      filter.ownerKey === toText(defaults.ownerKey) &&
      filter.keyword === toText(defaults.keyword) &&
      filter.sortBy === toText(defaults.sortBy);

    if (isDefault) {
      removeLocalStorageItem(FILTER_STORAGE_KEY);
      return;
    }

    writeLocalStorageItem(
      FILTER_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 2,
        filter: filter
      })
    );
  }

  function formatDuration(ms) {
    var value = Number(ms);
    if (!Number.isFinite(value) || value < 0) value = 0;
    var totalSec = Math.floor(value / 1000);
    var h = Math.floor(totalSec / 3600);
    var m = Math.floor((totalSec % 3600) / 60);
    var s = totalSec % 60;
    if (h > 0) return h + "h " + m + "m " + s + "s";
    if (m > 0) return m + "m " + s + "s";
    return s + "s";
  }

  function formatEndedAt(value) {
    if (!value) return "-";
    return new Date(value).toLocaleString();
  }

  function resolveModeLabel(modeKey, fallback) {
    var catalog = window.ModeCatalog;
    if (catalog && typeof catalog.getMode === "function") {
      var mode = catalog.getMode(modeKey);
      if (mode && typeof mode.label === "string" && mode.label) return mode.label;
    }
    return fallback || modeKey || "未知";
  }

  function resolveReplayCode(value) {
    return typeof value === "string" ? value : "";
  }

  function normalizeHistoryRecordViaRuntime(raw) {
    var runtime = window.CoreGameSettingsStorageRuntime;
    if (!runtime || typeof runtime.normalizeHistoryRecordFromContext !== "function") return null;
    try {
      return runtime.normalizeHistoryRecordFromContext({
        record: raw && typeof raw === "object" ? raw : {},
        nowIso: function () { return ""; },
        idFactory: function () { return ""; }
      });
    } catch (_err) {
      return null;
    }
  }

  function normalizeHistoryRecordForView(raw) {
    var item = raw && typeof raw === "object" ? raw : {};
    var normalized = normalizeHistoryRecordViaRuntime(item);
    var base = normalized && typeof normalized === "object" ? normalized : item;
    var diagnosticsSource =
      base && base.diagnostics_index_entries != null
        ? base.diagnostics_index_entries
        : item.diagnostics_index_entries;
    var diagnosticsEntries = normalizeHistoryDiagnosticsIndexEntries(diagnosticsSource);
    var replayString = toText(base.replay_string || item.replay_string).trim();
    if (!replayString && base && base.replay != null) {
      try { replayString = JSON.stringify(base.replay); } catch (_err) { replayString = ""; }
    }
    return {
      id: toText(base.id || item.id).trim(),
      mode: toText(base.mode || item.mode).trim(),
      mode_key: toText(base.mode_key || item.mode_key).trim(),
      score: Math.floor(Number(base.score != null ? base.score : item.score) || 0),
      best_tile: Math.floor(Number(base.best_tile != null ? base.best_tile : item.best_tile) || 0),
      duration_ms: Math.floor(Number(base.duration_ms != null ? base.duration_ms : item.duration_ms) || 0),
      ended_at: toText(base.ended_at || item.ended_at).trim(),
      replay_string: replayString,
      final_board: base.final_board != null ? base.final_board : item.final_board,
      owner_type: toText(base.owner_type != null ? base.owner_type : item.owner_type).trim().toLowerCase(),
      owner_user_id: toText(base.owner_user_id != null ? base.owner_user_id : item.owner_user_id).trim(),
      owner_nickname: toText(base.owner_nickname != null ? base.owner_nickname : item.owner_nickname).trim(),
      owner_key: toText(base.owner_key != null ? base.owner_key : item.owner_key).trim(),
      diagnostics_index_entries: diagnosticsEntries
    };
  }

  function normalizeHistoryDiagnosticsIndexEntry(rawEntry) {
    if (!rawEntry || typeof rawEntry !== "object" || Array.isArray(rawEntry)) return null;
    var key = typeof rawEntry.key === "string" && rawEntry.key ? rawEntry.key : "";
    if (!key) return null;
    var schemaVersion = Number(rawEntry.schemaVersion);
    if (!Number.isInteger(schemaVersion) || schemaVersion < 1) return null;
    var payload = rawEntry.payload;
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
    return {
      key: key,
      schemaVersion: schemaVersion,
      payload: payload
    };
  }

  function normalizeHistoryDiagnosticsIndexEntries(rawEntries) {
    var runtime = window.CoreGameSettingsStorageRuntime;
    if (runtime && typeof runtime.normalizeHistoryDiagnosticsIndexEntriesFromContext === "function") {
      try {
        var normalizedByRuntime = runtime.normalizeHistoryDiagnosticsIndexEntriesFromContext({
          entries: rawEntries,
          maxEntries: 6,
          maxPayloadKeys: 24,
          maxStringLength: 160,
          maxArrayItems: 8,
          keyMaxLength: 64
        });
        if (Array.isArray(normalizedByRuntime)) return normalizedByRuntime;
      } catch (_err) {}
    }
    var source = Array.isArray(rawEntries) ? rawEntries : [];
    var entries = [];
    for (var i = 0; i < source.length; i += 1) {
      var entry = normalizeHistoryDiagnosticsIndexEntry(source[i]);
      if (!entry) continue;
      entries.push(entry);
    }
    return entries;
  }

  function resolveHistorySecondaryPlacementDiagnosticsEntry(item) {
    var entries = Array.isArray(item && item.diagnostics_index_entries)
      ? item.diagnostics_index_entries
      : normalizeHistoryDiagnosticsIndexEntries(item && item.diagnostics_index_entries);
    for (var i = 0; i < entries.length; i += 1) {
      if (entries[i].key === "secondaryTimerPlacement") return entries[i];
    }
    return null;
  }

  function resolveHistoryDiagnosticsNumeric(payload, key) {
    if (!payload || typeof payload !== "object") return 0;
    return Number(payload[key]) || 0;
  }

  function buildHistorySecondaryPlacementDiagnosticsSummaryText(entry) {
    var payload = entry ? entry.payload : null;
    var validCount = resolveHistoryDiagnosticsNumeric(payload, "validPlacementDescriptors");
    var placedCount = resolveHistoryDiagnosticsNumeric(payload, "placed");
    var duplicateCount = resolveHistoryDiagnosticsNumeric(payload, "skippedDuplicate");
    var missingAnchorCount = resolveHistoryDiagnosticsNumeric(payload, "skippedMissingAnchor");
    var keyKinds = resolveHistoryDiagnosticsNumeric(payload, "dedupeKeyKinds");
    return "诊断 secondaryTimerPlacement(v" + String(entry.schemaVersion) + ")" +
      " · 有效 " + String(validCount) +
      " · 放置 " + String(placedCount) +
      " · 去重跳过 " + String(duplicateCount) +
      " · 锚点缺失 " + String(missingAnchorCount) +
      " · 去重键类 " + String(keyKinds);
  }

  function resolveHistoryDiagnosticsSampleText(payload) {
    var samples = payload && Array.isArray(payload.dedupeKeySamples) ? payload.dedupeKeySamples : [];
    var normalized = [];
    for (var i = 0; i < samples.length; i += 1) {
      var value = typeof samples[i] === "string" ? samples[i].trim() : "";
      if (!value) continue;
      normalized.push(value);
      if (normalized.length >= 3) break;
    }
    if (!normalized.length) return "";
    return "样本: " + normalized.join(" | ");
  }

  function appendHistoryDiagnosticsSummary(node, item) {
    if (!node) return;
    var secondaryPlacementEntry = resolveHistorySecondaryPlacementDiagnosticsEntry(item);
    if (!secondaryPlacementEntry) return;
    var summaryNode = document.createElement("div");
    summaryNode.className = "history-item-diagnostics";
    summaryNode.textContent = buildHistorySecondaryPlacementDiagnosticsSummaryText(secondaryPlacementEntry);
    node.appendChild(summaryNode);

    var sampleText = resolveHistoryDiagnosticsSampleText(secondaryPlacementEntry.payload);
    if (!sampleText) return;
    var sampleNode = document.createElement("div");
    sampleNode.className = "history-item-diagnostics-samples";
    sampleNode.textContent = sampleText;
    node.appendChild(sampleNode);
  }

  function normalizeBoardMatrix(raw) {
    var normalizedRecord = normalizeHistoryRecordViaRuntime({ final_board: raw });
    if (normalizedRecord && Array.isArray(normalizedRecord.final_board)) {
      return normalizedRecord.final_board;
    }
    var source = raw;
    if (typeof source === "string") {
      try {
        source = JSON.parse(source);
      } catch (_err) {
        source = [];
      }
    }
    if (!Array.isArray(source)) return [];
    var rows = [];
    for (var r = 0; r < source.length; r += 1) {
      var rowSource = source[r];
      if (!Array.isArray(rowSource)) continue;
      var row = [];
      for (var c = 0; c < rowSource.length; c += 1) {
        row.push(Math.floor(Number(rowSource[c]) || 0));
      }
      if (row.length > 0) rows.push(row);
    }
    return rows;
  }

  function resolveBoardDims(boardMatrix) {
    var rowCount = Array.isArray(boardMatrix) ? boardMatrix.length : 0;
    var cols = 0;
    for (var i = 0; i < rowCount; i += 1) {
      var row = boardMatrix[i];
      if (!Array.isArray(row)) continue;
      if (row.length > cols) cols = row.length;
    }
    return {
      rows: Math.max(0, rowCount),
      cols: Math.max(0, cols)
    };
  }

  function computePreviewBoardLayout(cols, rows, boardSize, baseGap) {
    if (cols === 4 && rows === 4) {
      var cell44 = (boardSize - baseGap * (cols - 1)) / cols;
      return {
        gap: baseGap,
        cell: cell44,
        gridWidth: cols * cell44 + (cols - 1) * baseGap,
        gridHeight: rows * cell44 + (rows - 1) * baseGap
      };
    }

    var cellByRows = (boardSize - baseGap * (rows - 1)) / rows;
    var cellByCols = (boardSize - baseGap * (cols - 1)) / cols;
    var cell = Math.min(cellByRows, cellByCols);
    if (rows === 3 && cols === 3) cell = cellByCols;
    if (!isFinite(cell) || cell < 10) cell = 10;

    return {
      gap: baseGap,
      cell: cell,
      gridWidth: cols * cell + (cols - 1) * baseGap,
      gridHeight: rows * cell + (rows - 1) * baseGap
    };
  }

  function computePreviewTileFontSize(value, cell, cols, rows) {
    var safeCell = Number(cell) || 0;
    if (!Number.isFinite(safeCell) || safeCell <= 0) safeCell = 56;
    var digits = String(Math.max(0, Math.floor(Math.abs(Number(value) || 0)))).length;
    var maxDim = Math.max(Number(cols) || 4, Number(rows) || 4);

    var boardScale = 1;
    if (maxDim >= 7) boardScale = 0.74;
    else if (maxDim >= 6) boardScale = 0.81;
    else if (maxDim >= 5) boardScale = 0.9;

    var digitScale = 1;
    if (digits === 3) digitScale = 0.84;
    if (digits === 4) digitScale = 0.72;
    if (digits >= 5) digitScale = 0.6;

    var raw = safeCell * 0.48 * boardScale * digitScale;
    var minSize = Math.max(11, Math.floor(safeCell * 0.22));
    var maxSize = Math.max(minSize, Math.floor(safeCell * 0.62));
    return Math.max(minSize, Math.min(maxSize, Math.round(raw)));
  }

  function isStoneValue(value) {
    return Number(value) < 0;
  }

  function resolvePreviewTileClasses(value, x, y) {
    var classes = ["tile"];
    var numericValue = Math.floor(Math.abs(Number(value) || 0));
    classes.push("tile-" + (numericValue || 0));
    classes.push("tile-position-" + String(x + 1) + "-" + String(y + 1));
    if (isStoneValue(value)) {
      classes.push("tile-stone");
    } else if (numericValue > 2048) {
      classes.push("tile-super");
    }
    return classes.join(" ");
  }

  function createBoardGridNode(boardMatrix) {
    var matrix = normalizeBoardMatrix(boardMatrix);
    var dims = resolveBoardDims(matrix);
    var rows = dims.rows;
    var cols = dims.cols;
    if (rows <= 0 || cols <= 0) return null;

    var maxDim = Math.max(rows, cols);
    var baseGap = maxDim >= 5 ? 6 : 8;
    var boardSize = Math.max(196, Math.min(320, maxDim * 58 + (maxDim - 1) * baseGap));
    var layout = computePreviewBoardLayout(cols, rows, boardSize, baseGap);
    var framePadding = 8;

    var wrap = document.createElement("div");
    wrap.className = "history-board history-mini-board-wrap";

    var board = document.createElement("div");
    board.className = "game-container history-mini-game";
    board.style.width = String(Math.round(layout.gridWidth + framePadding * 2)) + "px";
    board.style.height = String(Math.round(layout.gridHeight + framePadding * 2)) + "px";

    var gridContainer = document.createElement("div");
    gridContainer.className = "grid-container";
    gridContainer.style.left = "50%";
    gridContainer.style.top = "50%";
    gridContainer.style.width = String(Math.round(layout.gridWidth)) + "px";
    gridContainer.style.height = String(Math.round(layout.gridHeight)) + "px";
    gridContainer.style.transform = "translate(-50%, -50%)";
    board.appendChild(gridContainer);

    var tileContainer = document.createElement("div");
    tileContainer.className = "tile-container";
    tileContainer.style.left = "50%";
    tileContainer.style.top = "50%";
    tileContainer.style.width = String(Math.round(layout.gridWidth)) + "px";
    tileContainer.style.height = String(Math.round(layout.gridHeight)) + "px";
    tileContainer.style.transform = "translate(-50%, -50%)";
    board.appendChild(tileContainer);

    for (var y = 0; y < rows; y += 1) {
      var rowEl = document.createElement("div");
      rowEl.className = "grid-row";
      rowEl.style.marginBottom = y === rows - 1 ? "0" : String(Math.round(layout.gap)) + "px";
      for (var x = 0; x < cols; x += 1) {
        var bgCell = document.createElement("div");
        bgCell.className = "grid-cell";
        bgCell.style.width = String(Math.round(layout.cell)) + "px";
        bgCell.style.height = String(Math.round(layout.cell)) + "px";
        bgCell.style.marginRight = x === cols - 1 ? "0" : String(Math.round(layout.gap)) + "px";
        rowEl.appendChild(bgCell);
      }
      gridContainer.appendChild(rowEl);
    }

    for (var r = 0; r < rows; r += 1) {
      var row = matrix[r] || [];
      for (var c = 0; c < cols; c += 1) {
        var value = Math.floor(Number(row[c]) || 0);
        if (!isStoneValue(value) && value <= 0) continue;

        var tile = document.createElement("div");
        tile.setAttribute("class", resolvePreviewTileClasses(value, c, r));
        tile.style.width = String(Math.round(layout.cell)) + "px";
        tile.style.height = String(Math.round(layout.cell)) + "px";
        tile.style.transform = "translate(" + String(Math.round(c * (layout.cell + layout.gap))) + "px, " + String(Math.round(r * (layout.cell + layout.gap))) + "px)";

        var inner = document.createElement("div");
        inner.className = "tile-inner";
        inner.style.width = String(Math.round(layout.cell)) + "px";
        inner.style.height = String(Math.round(layout.cell)) + "px";
        inner.style.lineHeight = String(Math.round(layout.cell)) + "px";
        inner.style.fontSize = String(computePreviewTileFontSize(value, layout.cell, cols, rows)) + "px";
        inner.textContent = isStoneValue(value) ? "" : String(Math.floor(Math.abs(value)));
        tile.appendChild(inner);
        tileContainer.appendChild(tile);
      }
    }

    wrap.appendChild(board);
    return wrap;
  }

  function renderList(items, loadHistory) {
    var list = $("history-list");
    if (!list) return;
    list.innerHTML = "";

    if (!items.length) {
      list.innerHTML = "<div class='history-item'>暂无历史记录。你可以开始一局游戏后再回来查看。</div>";
      return;
    }

    for (var i = 0; i < items.length; i += 1) {
      var item = normalizeHistoryRecordForView(items[i]);
      var modeText = resolveModeLabel(item.mode_key, item.mode);
      var ownerDisplay = normalizeOwnerDisplay(item);
      var node = document.createElement("div");
      node.className = "history-item";
      node.innerHTML =
        "<div class='history-item-head'>" +
          "<strong>" + escapeHtml(modeText) + "</strong>" +
          "<span class='history-owner-tag'>" + escapeHtml(ownerDisplay.label) + "</span>" +
          "<span>分数: " + escapeHtml(Number(item.score) || 0) + "</span>" +
          "<span>最大块: " + escapeHtml(Number(item.best_tile) || 0) + "</span>" +
          "<span>时长: " + escapeHtml(formatDuration(item.duration_ms)) + "</span>" +
          "<span>结束: " + escapeHtml(formatEndedAt(item.ended_at)) + "</span>" +
        "</div>" +
        "<div class='history-item-actions'>" +
          "<button class='replay-button history-replay-btn'>回放</button>" +
          "<button class='replay-button history-export-btn'>导出</button>" +
          "<button class='replay-button history-delete-btn'>删除</button>" +
        "</div>";

      appendHistoryDiagnosticsSummary(node, item);

      var boardNode = createBoardGridNode(item.final_board);
      if (boardNode) {
        node.appendChild(boardNode);
      }

      var replayBtn = node.querySelector(".history-replay-btn");
      if (replayBtn) {
        replayBtn.addEventListener("click", (function (id) {
          return function () {
            var url = "replay.html?local_history_id=" + encodeURIComponent(id);
            if (typeof window.open === "function") {
              window.open(url, "_blank");
              return;
            }
            location.href = url;
          };
        })(item.id));
      }

      var exportBtn = node.querySelector(".history-export-btn");
      if (exportBtn) {
        exportBtn.addEventListener("click", (function (id, modeKey, replayString) {
          return function () {
            try {
              var result = window.LocalHistoryStore.exportRecords([id]);
              var onPayload = function (payload) {
                var safeMode = toText(modeKey || "mode").replace(/[^a-zA-Z0-9_-]/g, "_");
                var filenamePrefix = "history_" + safeMode + "_" + id;
                window.LocalHistoryStore.download(filenamePrefix + ".json", payload);
                var replayCode = resolveReplayCode(replayString);
                if (replayCode.trim()) {
                  window.LocalHistoryStore.download(
                    filenamePrefix + ".txt",
                    replayCode,
                    "text/plain;charset=utf-8"
                  );
                  setStatus("已导出 1 条记录（TXT + JSON）", false);
                  return;
                }
                setStatus("该记录缺少可导入的回放码，已导出 JSON", true);
              };
              if (isPromiseLike(result)) {
                result.then(onPayload).catch(function () {
                  setStatus("导出失败", true);
                });
                return;
              }
              onPayload(result);
            } catch (_error) {
              setStatus("导出失败", true);
            }
          };
        })(item.id, item.mode_key, item.replay_string));
      }

      var deleteBtn = node.querySelector(".history-delete-btn");
      if (deleteBtn) {
        deleteBtn.addEventListener("click", (function (id) {
          return async function () {
            if (!confirm("确认删除这条记录？")) return;
            var ok = await callStore("deleteById", id);
            if (!ok) {
              setStatus("删除失败", true);
              return;
            }
            setStatus("已删除记录", false);
            await loadHistory(false);
          };
        })(item.id));
      }

      list.appendChild(node);
    }
  }

  function renderSummary(result, state) {
    var node = $("history-summary");
    if (!node) return;
    var total = Number(result.total) || 0;
    var page = Number(result.page) || Number(state.page) || 1;
    var pageSize = Number(result.page_size) || Number(state.pageSize) || 30;
    var maxPage = Math.max(1, Math.ceil(total / pageSize));
    node.textContent = "共 " + total + " 条 · 第 " + page + "/" + maxPage + " 页";

    var prev = $("history-prev-page");
    var next = $("history-next-page");
    if (prev) prev.disabled = page <= 1;
    if (next) next.disabled = page >= maxPage;
  }

  function readControls(state) {
    var mode = $("history-mode");
    var owner = $("history-owner");
    var keyword = $("history-keyword");
    var sort = $("history-sort");
    state.modeKey = mode ? toText(mode.value) : "";
    state.ownerKey = owner ? toText(owner.value) : "";
    state.keyword = keyword ? toText(keyword.value) : "";
    state.sortBy = sort ? toText(sort.value || "ended_desc") : "ended_desc";
  }

  function applyControls(state) {
    var mode = $("history-mode");
    var owner = $("history-owner");
    var keyword = $("history-keyword");
    var sort = $("history-sort");
    if (mode) mode.value = toText(state.modeKey);
    if (owner) owner.value = toText(state.ownerKey);
    if (keyword) keyword.value = toText(state.keyword);
    if (sort) sort.value = toText(state.sortBy || "ended_desc");
  }

  function initModeFilter() {
    var modeSelect = $("history-mode");
    if (!modeSelect) return;
    var listModes =
      window.ModeCatalog && typeof window.ModeCatalog.listModes === "function"
        ? window.ModeCatalog.listModes()
        : [];
    for (var i = 0; i < listModes.length; i += 1) {
      var mode = listModes[i] || {};
      if (!mode.key || !mode.label) continue;
      var option = document.createElement("option");
      option.value = String(mode.key);
      option.textContent = String(mode.label);
      modeSelect.appendChild(option);
    }
  }

  function clearSelectOptions(selectNode) {
    if (!selectNode) return;
    while (selectNode.options.length > 0) {
      selectNode.remove(0);
    }
  }

  function sortOwnerEntries(entries) {
    return entries.sort(function (a, b) {
      if (a.isGuest && !b.isGuest) return 1;
      if (!a.isGuest && b.isGuest) return -1;
      var aLabel = toText(a.label);
      var bLabel = toText(b.label);
      return aLabel.localeCompare(bLabel, "zh-Hans-CN");
    });
  }

  async function rebuildOwnerFilterOptions(selectedOwnerKey) {
    var ownerSelect = $("history-owner");
    if (!ownerSelect) return;

    var records = [];
    try {
      var all = await callStore("getAll");
      records = Array.isArray(all) ? all : [];
    } catch (_error) {
      records = [];
    }

    var ownerMap = {};
    for (var i = 0; i < records.length; i += 1) {
      var normalizedRecord = normalizeHistoryRecordForView(records[i]);
      var display = normalizeOwnerDisplay(normalizedRecord);
      if (!display.key) continue;
      if (!ownerMap[display.key]) ownerMap[display.key] = display;
    }

    var owners = [];
    var keys = Object.keys(ownerMap);
    for (var k = 0; k < keys.length; k += 1) {
      owners.push(ownerMap[keys[k]]);
    }
    sortOwnerEntries(owners);

    clearSelectOptions(ownerSelect);

    var allOption = document.createElement("option");
    allOption.value = "";
    allOption.textContent = getAllOwnersLabel();
    ownerSelect.appendChild(allOption);

    for (var o = 0; o < owners.length; o += 1) {
      var option = document.createElement("option");
      option.value = owners[o].key;
      option.textContent = owners[o].label;
      ownerSelect.appendChild(option);
    }

    var preferredValue = toText(selectedOwnerKey).trim();
    if (preferredValue) {
      var found = false;
      for (var idx = 0; idx < ownerSelect.options.length; idx += 1) {
        if (toText(ownerSelect.options[idx].value) === preferredValue) {
          found = true;
          break;
        }
      }
      if (!found) {
        var stale = document.createElement("option");
        stale.value = preferredValue;
        stale.textContent = preferredValue === "guest" ? getGuestOwnerLabel() : preferredValue;
        ownerSelect.appendChild(stale);
      }
      ownerSelect.value = preferredValue;
      return;
    }

    ownerSelect.value = "";
  }

  function bindImport(loadHistory) {
    var importBtn = $("history-import-btn");
    var importReplaceBtn = $("history-import-replace-btn");
    var fileInput = $("history-import-file");
    if (!importBtn || !importReplaceBtn || !fileInput) return;

    var merge = true;

    function openPicker(nextMerge) {
      merge = !!nextMerge;
      fileInput.value = "";
      fileInput.click();
    }

    importBtn.addEventListener("click", function () {
      openPicker(true);
    });

    importReplaceBtn.addEventListener("click", function () {
      if (!confirm("确认导入并替换全部当前历史记录？")) return;
      openPicker(false);
    });

    fileInput.addEventListener("change", function () {
      var file = fileInput.files && fileInput.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = async function () {
        try {
          var text = typeof reader.result === "string" ? reader.result : "";
          var result = await callStore("importRecords", text, { merge: merge });
          setStatus(
            merge
              ? "导入完成：新增 " + result.imported + "，替换 " + result.replaced
              : "导入并替换完成：总计 " + result.total + " 条",
            false
          );
          await loadHistory(true);
        } catch (_error) {
          setStatus("导入失败：文件格式不正确", true);
        }
      };
      reader.onerror = function () {
        setStatus("导入失败：文件读取错误", true);
      };
      reader.readAsText(file, "utf-8");
    });
  }

  function bootstrap() {
    if (!window.LocalHistoryStore) {
      setStatus("本地历史模块未加载", true);
      return;
    }

    var defaults = {
      page: 1,
      pageSize: 30,
      modeKey: "",
      ownerKey: "",
      keyword: "",
      sortBy: "ended_desc"
    };
    var state = readFilterState(defaults);

    async function loadHistory(resetPage) {
      readControls(state);
      persistFilterState(state, defaults);
      if (resetPage) state.page = 1;

      try {
        var result = await callStore("listRecords", {
          mode_key: state.modeKey,
          owner_key: state.ownerKey,
          keyword: state.keyword,
          sort_by: state.sortBy,
          page: state.page,
          page_size: state.pageSize
        });
        renderList(Array.isArray(result.items) ? result.items : [], loadHistory);
        renderSummary(result || {}, state);
        await rebuildOwnerFilterOptions(state.ownerKey);
        setStatus("", false);
      } catch (_error) {
        setStatus("加载历史失败", true);
      }
    }

    initModeFilter();
    rebuildOwnerFilterOptions(state.ownerKey).then(function () {
      applyControls(state);
      loadHistory(true);
    }).catch(function () {
      applyControls(state);
      loadHistory(true);
    });

    var loadBtn = $("history-load-btn");
    if (loadBtn) {
      loadBtn.addEventListener("click", function () {
        loadHistory(true);
      });
    }

    var mode = $("history-mode");
    var owner = $("history-owner");
    var sort = $("history-sort");
    var keyword = $("history-keyword");
    if (mode) mode.addEventListener("change", function () { loadHistory(true); });
    if (owner) owner.addEventListener("change", function () { loadHistory(true); });
    if (sort) sort.addEventListener("change", function () { loadHistory(true); });
    if (keyword) {
      keyword.addEventListener("keydown", function (event) {
        if (event.key !== "Enter") return;
        event.preventDefault();
        loadHistory(true);
      });
    }

    var prevBtn = $("history-prev-page");
    var nextBtn = $("history-next-page");
    if (prevBtn) {
      prevBtn.addEventListener("click", async function () {
        if (state.page <= 1) return;
        state.page -= 1;
        await loadHistory(false);
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener("click", async function () {
        state.page += 1;
        await loadHistory(false);
      });
    }

    var exportAllBtn = $("history-export-all-btn");
    if (exportAllBtn) {
      exportAllBtn.addEventListener("click", function () {
        try {
          var result = window.LocalHistoryStore.exportRecords();
          var handlePayload = function (payload) {
            var dateTag = new Date().toISOString().slice(0, 10);
            window.LocalHistoryStore.download("2048_local_history_" + dateTag + ".json", payload);
            setStatus("已导出全部历史记录", false);
          };
          if (isPromiseLike(result)) {
            result.then(handlePayload).catch(function () {
              setStatus("导出失败", true);
            });
            return;
          }
          handlePayload(result);
        } catch (_error) {
          setStatus("导出失败", true);
        }
      });
    }

    var clearAllBtn = $("history-clear-all-btn");
    if (clearAllBtn) {
      clearAllBtn.addEventListener("click", async function () {
        if (!confirm("确认清空全部本地历史记录？此操作不可撤销。")) return;
        try {
          await callStore("clearAll");
          setStatus("已清空全部历史记录", false);
          await loadHistory(true);
        } catch (_error) {
          setStatus("清空失败", true);
        }
      });
    }

    bindImport(loadHistory);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrap);
  } else {
    bootstrap();
  }
})();
