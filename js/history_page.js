(function () {
  function el(id) {
    return document.getElementById(id);
  }

  var state = {
    page: 1,
    pageSize: 30,
    modeKey: "",
    keyword: "",
    sortBy: "ended_desc",
    adapterParityFilter: "all",
    burnInWindow: "200"
  };
  var BURN_IN_MIN_COMPARABLE = 50;
  var BURN_IN_MAX_MISMATCH_RATE = 1;

  function setStatus(text, isError) {
    var status = el("history-status");
    if (!status) return;
    status.textContent = text || "";
    status.style.color = isError ? "#c0392b" : "#4a4a4a";
  }

  function boardToHtml(board, width, height) {
    if (!Array.isArray(board) || !board.length) return "";
    var h = Number.isInteger(height) && height > 0 ? height : board.length;
    var w = Number.isInteger(width) && width > 0 ? width : (Array.isArray(board[0]) ? board[0].length : 0);
    if (w <= 0 || h <= 0) return "";

    var style = "grid-template-columns: repeat(" + w + ", 48px); grid-template-rows: repeat(" + h + ", 48px);";
    var html = "<div class='final-board-grid' style='" + style + "'>";
    for (var y = 0; y < h; y++) {
      var row = Array.isArray(board[y]) ? board[y] : [];
      for (var x = 0; x < w; x++) {
        var v = row[x] || 0;
        var valueClass = v === 0 ? "final-board-cell-empty" : ("final-board-cell-v-" + v);
        var superClass = v > 2048 ? " final-board-cell-super" : "";
        html += "<div class='final-board-cell " + valueClass + superClass + "'>" + (v === 0 ? "" : v) + "</div>";
      }
    }
    html += "</div>";
    return html;
  }

  function modeText(item) {
    var modeKey = item.mode_key || "";
    if (window.ModeCatalog && typeof window.ModeCatalog.getMode === "function" && modeKey) {
      var mode = window.ModeCatalog.getMode(modeKey);
      if (mode && mode.label) return mode.label;
    }
    return modeKey || item.mode || "未知";
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

  function isPlainObject(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
  }

  function toFiniteNumberOrNull(value) {
    var num = Number(value);
    return Number.isFinite(num) ? num : null;
  }

  function formatNullableNumber(value) {
    var num = toFiniteNumberOrNull(value);
    return num === null ? "-" : String(num);
  }

  function formatSignedDelta(value) {
    var num = toFiniteNumberOrNull(value);
    if (num === null) return "-";
    if (num > 0) return "+" + num;
    return String(num);
  }

  function formatNullableBoolean(value) {
    if (value === true) return "是";
    if (value === false) return "否";
    return "-";
  }

  function formatAdapterMode(mode) {
    if (mode === "core-adapter") return "core-adapter";
    if (mode === "legacy-bridge") return "legacy-bridge";
    return "-";
  }

  function escapeHtml(value) {
    var text = String(value == null ? "" : value);
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function hasAdapterDiagnostics(item) {
    if (!item || typeof item !== "object") return false;
    return isPlainObject(item.adapter_parity_report_v1) || isPlainObject(item.adapter_parity_ab_diff_v1);
  }

  function getAdapterParityStatus(item) {
    if (window.LocalHistoryStore && typeof window.LocalHistoryStore.getAdapterParityStatus === "function") {
      return window.LocalHistoryStore.getAdapterParityStatus(item);
    }
    return "incomplete";
  }

  function getAdapterBadgeText(status) {
    if (status === "mismatch") return "A/B 不一致";
    if (status === "match") return "A/B 一致";
    return "A/B 样本不足";
  }

  function getAdapterBadgeClass(status) {
    if (status === "mismatch") return "history-adapter-badge-mismatch";
    if (status === "match") return "history-adapter-badge-match";
    return "history-adapter-badge-incomplete";
  }

  function buildAdapterBadgeHtml(item) {
    if (!hasAdapterDiagnostics(item)) return "";
    var status = getAdapterParityStatus(item);
    return "<span class='history-adapter-badge " + getAdapterBadgeClass(status) + "'>" +
      escapeHtml(getAdapterBadgeText(status)) +
      "</span>";
  }

  function buildAdapterDiagnosticsHtml(item) {
    var report = isPlainObject(item && item.adapter_parity_report_v1) ? item.adapter_parity_report_v1 : null;
    var diff = isPlainObject(item && item.adapter_parity_ab_diff_v1) ? item.adapter_parity_ab_diff_v1 : null;
    if (!report && !diff) return "";

    var lines = [];
    if (report) {
      lines.push(
        "当前 " + escapeHtml(formatAdapterMode(report.adapterMode)) +
        " · 快照分数 " + escapeHtml(formatNullableNumber(report.lastScoreFromSnapshot)) +
        " · undoUsed " + escapeHtml(formatNullableNumber(report.undoUsedFromSnapshot)) +
        " · scoreDelta " + escapeHtml(formatSignedDelta(report.scoreDelta)) +
        " · 对齐 " + escapeHtml(formatNullableBoolean(report.isScoreAligned))
      );
    }
    if (diff) {
      lines.push(
        "A/B comparable " + escapeHtml(formatNullableBoolean(diff.comparable)) +
        " · scoreΔ " + escapeHtml(formatSignedDelta(diff.scoreDelta)) +
        " · undoΔ " + escapeHtml(formatSignedDelta(diff.undoUsedDelta)) +
        " · overΔ " + escapeHtml(formatSignedDelta(diff.overEventsDelta))
      );
    }

    var html = "<div class='history-adapter-diagnostics'>" +
      "<div class='history-adapter-title'>Adapter 诊断</div>";
    for (var i = 0; i < lines.length; i++) {
      html += "<div class='history-adapter-line'>" + lines[i] + "</div>";
    }
    html += "</div>";
    return html;
  }

  function buildSummary(result) {
    var summary = el("history-summary");
    if (!summary) return;
    var total = result && Number.isFinite(result.total) ? result.total : 0;
    var filterMap = {
      all: "全部",
      mismatch: "仅不一致",
      match: "仅一致",
      incomplete: "样本不足"
    };
    summary.textContent = "共 " + total + " 条记录" +
      " · 当前第 " + state.page + " 页" +
      " · 每页 " + state.pageSize + " 条" +
      " · 诊断筛选: " + (filterMap[state.adapterParityFilter] || "全部");
  }

  function formatPercent(value) {
    var num = toFiniteNumberOrNull(value);
    if (num === null) return "-";
    return num.toFixed(2) + "%";
  }

  function getBurnInGateLabel(status) {
    if (status === "pass") return "达标";
    if (status === "fail") return "未达标";
    return "样本不足";
  }

  function getBurnInGateClass(status) {
    if (status === "pass") return "history-burnin-gate-pass";
    if (status === "fail") return "history-burnin-gate-fail";
    return "history-burnin-gate-warn";
  }

  function renderBurnInSummary(summary) {
    var panel = el("history-burnin-summary");
    if (!panel) return;
    if (!isPlainObject(summary)) {
      panel.innerHTML = "<div class='history-burnin-empty'>暂无 burn-in 数据</div>";
      return;
    }

    var limitText = summary.sampleLimit === null
      ? ("全部 " + summary.evaluatedRecords + " 条")
      : ("最近 " + summary.evaluatedRecords + " 条（窗口 " + summary.sampleLimit + "）");
    var gateLabel = getBurnInGateLabel(summary.gateStatus);
    var gateClass = getBurnInGateClass(summary.gateStatus);
    var mismatchAction = "";
    if ((summary.mismatch || 0) > 0) {
      mismatchAction = "<button class='replay-button history-burnin-focus-mismatch'>仅看不一致</button>";
    }

    panel.innerHTML =
      "<div class='history-burnin-head'>" +
        "<div class='history-burnin-title'>Cutover Burn-in 统计</div>" +
        "<span class='history-burnin-gate " + gateClass + "'>" + escapeHtml(gateLabel) + "</span>" +
      "</div>" +
      "<div class='history-burnin-grid'>" +
        "<span>采样: " + escapeHtml(limitText) + "</span>" +
        "<span>诊断记录 " + escapeHtml(summary.withDiagnostics) + "</span>" +
        "<span>可比较样本 " + escapeHtml(summary.comparable) + "</span>" +
        "<span>一致 " + escapeHtml(summary.match) + "</span>" +
        "<span>不一致 " + escapeHtml(summary.mismatch) + "</span>" +
        "<span>样本不足 " + escapeHtml(summary.incomplete) + "</span>" +
        "<span>不一致率 " + escapeHtml(formatPercent(summary.mismatchRate)) + "</span>" +
      "</div>" +
      "<div class='history-burnin-note'>" +
        "门槛: 可比较 >= " + escapeHtml(summary.minComparable) +
        "，不一致率 <= " + escapeHtml(formatPercent(summary.maxMismatchRate)) +
      "</div>" +
      (mismatchAction ? "<div class='history-burnin-actions'>" + mismatchAction + "</div>" : "");

    var mismatchBtn = panel.querySelector(".history-burnin-focus-mismatch");
    if (mismatchBtn) {
      mismatchBtn.addEventListener("click", function () {
        var adapterFilter = el("history-adapter-filter");
        if (adapterFilter) adapterFilter.value = "mismatch";
        state.adapterParityFilter = "mismatch";
        loadHistory(true);
      });
    }
  }

  function downloadSingleRecord(item) {
    if (!window.LocalHistoryStore) return;
    var payload = window.LocalHistoryStore.exportRecords([item.id]);
    var safeMode = (item.mode_key || "mode").replace(/[^a-zA-Z0-9_-]/g, "_");
    var file = "history_" + safeMode + "_" + item.id + ".json";
    window.LocalHistoryStore.download(file, payload);
  }

  function collectRecordIdsForExport(queryOptions) {
    if (!window.LocalHistoryStore || typeof window.LocalHistoryStore.listRecords !== "function") return [];

    var ids = [];
    var page = 1;
    while (page <= 100) {
      var result = window.LocalHistoryStore.listRecords({
        mode_key: queryOptions.mode_key || "",
        keyword: queryOptions.keyword || "",
        sort_by: queryOptions.sort_by || "ended_desc",
        adapter_parity_filter: queryOptions.adapter_parity_filter || "all",
        page: page,
        page_size: 500
      });
      var items = result && Array.isArray(result.items) ? result.items : [];
      if (!items.length) break;
      for (var i = 0; i < items.length; i++) {
        if (items[i] && items[i].id) ids.push(items[i].id);
      }
      if (ids.length >= (result.total || 0)) break;
      page += 1;
    }
    return ids;
  }

  function renderHistory(result) {
    var list = el("history-list");
    if (!list) return;
    list.innerHTML = "";

    var items = result && Array.isArray(result.items) ? result.items : [];
    if (!items.length) {
      list.innerHTML = "<div class='history-item'>暂无历史记录。你可以开始一局游戏后再回来查看。</div>";
      return;
    }

    for (var i = 0; i < items.length; i++) {
      (function () {
        var item = items[i];
        var node = document.createElement("div");
        node.className = "history-item";

        var endedText = item.ended_at ? new Date(item.ended_at).toLocaleString() : "-";
        var best = Number.isFinite(item.best_tile) ? item.best_tile : 0;
        var score = Number.isFinite(item.score) ? item.score : 0;
        var duration = formatDuration(item.duration_ms);

        node.innerHTML =
          "<div class='history-item-head'>" +
            "<strong>" + modeText(item) + "</strong>" +
            buildAdapterBadgeHtml(item) +
            "<span>分数: " + score + "</span>" +
            "<span>最大块: " + best + "</span>" +
            "<span>时长: " + duration + "</span>" +
            "<span>结束: " + endedText + "</span>" +
          "</div>" +
          "<div class='history-item-actions'>" +
            "<button class='replay-button history-replay-btn'>回放</button>" +
            "<button class='replay-button history-export-btn'>导出</button>" +
            "<button class='replay-button history-delete-btn'>删除</button>" +
          "</div>" +
          buildAdapterDiagnosticsHtml(item) +
          boardToHtml(item.final_board, item.board_width, item.board_height);

        var replayBtn = node.querySelector(".history-replay-btn");
        if (replayBtn) {
          replayBtn.addEventListener("click", function () {
            window.location.href = "replay.html?local_history_id=" + encodeURIComponent(item.id);
          });
        }

        var exportBtn = node.querySelector(".history-export-btn");
        if (exportBtn) {
          exportBtn.addEventListener("click", function () {
            downloadSingleRecord(item);
          });
        }

        var deleteBtn = node.querySelector(".history-delete-btn");
        if (deleteBtn) {
          deleteBtn.addEventListener("click", function () {
            if (!window.confirm("确认删除这条历史记录？此操作不可撤销。")) return;
            var ok = window.LocalHistoryStore.deleteById(item.id);
            if (!ok) {
              setStatus("删除失败：记录不存在或已被删除", true);
              return;
            }
            setStatus("记录已删除", false);
            loadHistory();
          });
        }

        list.appendChild(node);
      })();
    }
  }

  function readFilters() {
    state.modeKey = (el("history-mode").value || "").trim();
    state.keyword = (el("history-keyword").value || "").trim();
    state.sortBy = (el("history-sort").value || "ended_desc").trim();
    var adapterFilterInput = el("history-adapter-filter");
    state.adapterParityFilter = ((adapterFilterInput && adapterFilterInput.value) || "all").trim();
    var burnInWindowInput = el("history-burnin-window");
    state.burnInWindow = ((burnInWindowInput && burnInWindowInput.value) || "200").trim();
  }

  function loadHistory(resetPage) {
    if (!window.LocalHistoryStore) return;
    if (resetPage) state.page = 1;
    readFilters();

    var result = window.LocalHistoryStore.listRecords({
      mode_key: state.modeKey,
      keyword: state.keyword,
      sort_by: state.sortBy,
      adapter_parity_filter: state.adapterParityFilter,
      page: state.page,
      page_size: state.pageSize
    });

    renderHistory(result);
    buildSummary(result);
    var burnInSummary = null;
    if (
      window.LocalHistoryStore &&
      typeof window.LocalHistoryStore.getAdapterParityBurnInSummary === "function"
    ) {
      burnInSummary = window.LocalHistoryStore.getAdapterParityBurnInSummary({
        mode_key: state.modeKey,
        keyword: state.keyword,
        sort_by: state.sortBy,
        sample_limit: state.burnInWindow,
        min_comparable: BURN_IN_MIN_COMPARABLE,
        max_mismatch_rate: BURN_IN_MAX_MISMATCH_RATE
      });
    }
    renderBurnInSummary(burnInSummary);
    setStatus("", false);

    var prevBtn = el("history-prev-page");
    var nextBtn = el("history-next-page");
    if (prevBtn) prevBtn.disabled = state.page <= 1;
    if (nextBtn) {
      var maxPage = Math.max(1, Math.ceil((result.total || 0) / state.pageSize));
      nextBtn.disabled = state.page >= maxPage;
    }
  }

  function initModeFilter() {
    var select = el("history-mode");
    if (!select) return;
    if (!(window.ModeCatalog && typeof window.ModeCatalog.listModes === "function")) return;

    var modes = window.ModeCatalog.listModes();
    for (var i = 0; i < modes.length; i++) {
      var option = document.createElement("option");
      option.value = modes[i].key;
      option.textContent = modes[i].label;
      select.appendChild(option);
    }
  }

  function bindToolbarActions() {
    var reloadBtn = el("history-load-btn");
    if (reloadBtn) {
      reloadBtn.addEventListener("click", function () {
        loadHistory(true);
      });
    }

    var exportAllBtn = el("history-export-all-btn");
    if (exportAllBtn) {
      exportAllBtn.addEventListener("click", function () {
        if (!window.LocalHistoryStore) return;
        var payload = window.LocalHistoryStore.exportRecords();
        var dateTag = new Date().toISOString().slice(0, 10);
        window.LocalHistoryStore.download("2048_local_history_" + dateTag + ".json", payload);
        setStatus("已导出全部历史记录", false);
      });
    }

    var exportMismatchBtn = el("history-export-mismatch-btn");
    if (exportMismatchBtn) {
      exportMismatchBtn.addEventListener("click", function () {
        if (!window.LocalHistoryStore) return;
        readFilters();
        var ids = collectRecordIdsForExport({
          mode_key: state.modeKey,
          keyword: state.keyword,
          sort_by: state.sortBy,
          adapter_parity_filter: "mismatch"
        });
        if (!ids.length) {
          setStatus("没有可导出的 A/B 不一致记录", false);
          return;
        }
        var payload = window.LocalHistoryStore.exportRecords(ids);
        var dateTag = new Date().toISOString().slice(0, 10);
        window.LocalHistoryStore.download("2048_local_history_mismatch_" + dateTag + ".json", payload);
        setStatus("已导出 A/B 不一致记录 " + ids.length + " 条", false);
      });
    }

    var clearAllBtn = el("history-clear-all-btn");
    if (clearAllBtn) {
      clearAllBtn.addEventListener("click", function () {
        if (!window.confirm("确认清空全部本地历史记录？此操作不可撤销。")) return;
        window.LocalHistoryStore.clearAll();
        setStatus("已清空全部历史记录", false);
        loadHistory(true);
      });
    }

    var importBtn = el("history-import-btn");
    var importReplaceBtn = el("history-import-replace-btn");
    var importInput = el("history-import-file");
    if (importBtn && importInput) {
      var importMode = "merge";
      importBtn.addEventListener("click", function () {
        importMode = "merge";
        importInput.click();
      });
      if (importReplaceBtn) {
        importReplaceBtn.addEventListener("click", function () {
          if (!window.confirm("导入并替换会清空当前本地历史后再导入，是否继续？")) return;
          importMode = "replace";
          importInput.click();
        });
      }
      importInput.addEventListener("change", function () {
        var file = importInput.files && importInput.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function () {
          try {
            var merge = importMode !== "replace";
            var result = window.LocalHistoryStore.importRecords(String(reader.result || ""), { merge: merge });
            setStatus("导入成功：新增 " + result.imported + " 条，覆盖 " + result.replaced + " 条。", false);
            loadHistory(true);
          } catch (error) {
            setStatus("导入失败: " + (error && error.message ? error.message : "unknown"), true);
          }
        };
        reader.onerror = function () {
          setStatus("读取文件失败", true);
        };
        reader.readAsText(file, "utf-8");
        importInput.value = "";
      });
    }

    var prevBtn = el("history-prev-page");
    if (prevBtn) {
      prevBtn.addEventListener("click", function () {
        if (state.page <= 1) return;
        state.page -= 1;
        loadHistory(false);
      });
    }

    var nextBtn = el("history-next-page");
    if (nextBtn) {
      nextBtn.addEventListener("click", function () {
        state.page += 1;
        loadHistory(false);
      });
    }

    var mode = el("history-mode");
    if (mode) {
      mode.addEventListener("change", function () {
        loadHistory(true);
      });
    }

    var sort = el("history-sort");
    if (sort) {
      sort.addEventListener("change", function () {
        loadHistory(true);
      });
    }

    var adapterFilter = el("history-adapter-filter");
    if (adapterFilter) {
      adapterFilter.addEventListener("change", function () {
        loadHistory(true);
      });
    }

    var burnInWindow = el("history-burnin-window");
    if (burnInWindow) {
      burnInWindow.addEventListener("change", function () {
        loadHistory(true);
      });
    }

    var keyword = el("history-keyword");
    if (keyword) {
      keyword.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
          event.preventDefault();
          loadHistory(true);
        }
      });
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (!window.LocalHistoryStore) {
      setStatus("本地历史模块未加载", true);
      return;
    }

    initModeFilter();
    bindToolbarActions();
    loadHistory(true);
  });
})();
