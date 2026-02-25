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
    burnInWindow: "200",
    sustainedWindows: "3"
  };
  var BURN_IN_MIN_COMPARABLE = 50;
  var BURN_IN_MAX_MISMATCH_RATE = 1;
  var ADAPTER_MODE_STORAGE_KEY = "engine_adapter_mode";
  var ADAPTER_DEFAULT_STORAGE_KEY = "engine_adapter_default_mode";
  var ADAPTER_FORCE_LEGACY_STORAGE_KEY = "engine_adapter_force_legacy";
  var historyCanaryPolicyRuntime = window.CoreHistoryCanaryPolicyRuntime;
  if (
    !historyCanaryPolicyRuntime ||
    typeof historyCanaryPolicyRuntime.resolveCanaryPolicySnapshot !== "function" ||
    typeof historyCanaryPolicyRuntime.resolveStoredPolicyKeys !== "function" ||
    typeof historyCanaryPolicyRuntime.resolveCanaryPolicyActionPlan !== "function" ||
    typeof historyCanaryPolicyRuntime.resolveCanaryPolicyActionNotice !== "function"
  ) {
    throw new Error("CoreHistoryCanaryPolicyRuntime is required");
  }
  var historyAdapterDiagnosticsRuntime = window.CoreHistoryAdapterDiagnosticsRuntime;
  if (
    !historyAdapterDiagnosticsRuntime ||
    typeof historyAdapterDiagnosticsRuntime.resolveHistoryAdapterBadgeState !== "function" ||
    typeof historyAdapterDiagnosticsRuntime.resolveHistoryAdapterDiagnosticsState !== "function"
  ) {
    throw new Error("CoreHistoryAdapterDiagnosticsRuntime is required");
  }
  var historyBurnInRuntime = window.CoreHistoryBurnInRuntime;
  if (
    !historyBurnInRuntime ||
    typeof historyBurnInRuntime.resolveHistoryBurnInSummaryState !== "function"
  ) {
    throw new Error("CoreHistoryBurnInRuntime is required");
  }
  var historyCanaryViewRuntime = window.CoreHistoryCanaryViewRuntime;
  if (
    !historyCanaryViewRuntime ||
    typeof historyCanaryViewRuntime.resolveHistoryCanaryViewState !== "function"
  ) {
    throw new Error("CoreHistoryCanaryViewRuntime is required");
  }
  var historySummaryRuntime = window.CoreHistorySummaryRuntime;
  if (
    !historySummaryRuntime ||
    typeof historySummaryRuntime.resolveHistorySummaryText !== "function"
  ) {
    throw new Error("CoreHistorySummaryRuntime is required");
  }
  var historyExportRuntime = window.CoreHistoryExportRuntime;
  if (
    !historyExportRuntime ||
    typeof historyExportRuntime.resolveHistoryRecordExportFileName !== "function" ||
    typeof historyExportRuntime.collectHistoryRecordIdsForExport !== "function"
  ) {
    throw new Error("CoreHistoryExportRuntime is required");
  }
  var historyQueryRuntime = window.CoreHistoryQueryRuntime;
  if (
    !historyQueryRuntime ||
    typeof historyQueryRuntime.resolveHistoryFilterState !== "function" ||
    typeof historyQueryRuntime.resolveHistoryListQuery !== "function" ||
    typeof historyQueryRuntime.resolveHistoryBurnInQuery !== "function" ||
    typeof historyQueryRuntime.resolveHistoryPagerState !== "function"
  ) {
    throw new Error("CoreHistoryQueryRuntime is required");
  }
  var historyRecordViewRuntime = window.CoreHistoryRecordViewRuntime;
  if (
    !historyRecordViewRuntime ||
    typeof historyRecordViewRuntime.resolveHistoryModeText !== "function" ||
    typeof historyRecordViewRuntime.resolveHistoryDurationText !== "function" ||
    typeof historyRecordViewRuntime.resolveHistoryEndedText !== "function" ||
    typeof historyRecordViewRuntime.resolveHistoryRecordHeadState !== "function"
  ) {
    throw new Error("CoreHistoryRecordViewRuntime is required");
  }
  var historyImportRuntime = window.CoreHistoryImportRuntime;
  if (
    !historyImportRuntime ||
    typeof historyImportRuntime.resolveHistoryImportActionState !== "function" ||
    typeof historyImportRuntime.resolveHistoryImportMergeFlag !== "function" ||
    typeof historyImportRuntime.resolveHistoryImportSuccessNotice !== "function" ||
    typeof historyImportRuntime.resolveHistoryImportErrorNotice !== "function" ||
    typeof historyImportRuntime.resolveHistoryImportReadErrorNotice !== "function"
  ) {
    throw new Error("CoreHistoryImportRuntime is required");
  }

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

  function getCatalogModeLabel(item) {
    var modeKey = item && item.mode_key ? String(item.mode_key) : "";
    if (!(window.ModeCatalog && typeof window.ModeCatalog.getMode === "function" && modeKey)) return "";
    var mode = window.ModeCatalog.getMode(modeKey);
    return mode && mode.label ? String(mode.label) : "";
  }

  function isPlainObject(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
  }

  function getStorageValue(key) {
    try {
      if (!window.localStorage || typeof window.localStorage.getItem !== "function") return null;
      return window.localStorage.getItem(key);
    } catch (_err) {
      return null;
    }
  }

  function setStorageValue(key, value) {
    try {
      if (!window.localStorage) return false;
      if (value === null || value === undefined || value === "") {
        if (typeof window.localStorage.removeItem !== "function") return false;
        window.localStorage.removeItem(key);
        return true;
      }
      if (typeof window.localStorage.setItem !== "function") return false;
      window.localStorage.setItem(key, String(value));
      return true;
    } catch (_err) {
      return false;
    }
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

  function getAdapterParityStatus(item) {
    if (window.LocalHistoryStore && typeof window.LocalHistoryStore.getAdapterParityStatus === "function") {
      return window.LocalHistoryStore.getAdapterParityStatus(item);
    }
    return "incomplete";
  }

  function buildAdapterBadgeHtml(item) {
    var status = getAdapterParityStatus(item);
    var badgeState = historyAdapterDiagnosticsRuntime.resolveHistoryAdapterBadgeState(item, status);
    if (!badgeState || badgeState.hasBadge !== true) return "";
    return "<span class='history-adapter-badge " + badgeState.className + "'>" +
      escapeHtml(badgeState.text) +
      "</span>";
  }

  function buildAdapterDiagnosticsHtml(item) {
    var diagnosticsState = historyAdapterDiagnosticsRuntime.resolveHistoryAdapterDiagnosticsState(item);
    if (!diagnosticsState || diagnosticsState.hasDiagnostics !== true) return "";
    var lines = Array.isArray(diagnosticsState.lines) ? diagnosticsState.lines : [];

    var html = "<div class='history-adapter-diagnostics'>" +
      "<div class='history-adapter-title'>Adapter 诊断</div>";
    for (var i = 0; i < lines.length; i++) {
      html += "<div class='history-adapter-line'>" + escapeHtml(lines[i]) + "</div>";
    }
    html += "</div>";
    return html;
  }

  function buildSummary(result) {
    var summary = el("history-summary");
    if (!summary) return;
    summary.textContent = historySummaryRuntime.resolveHistorySummaryText({
      total: result && result.total,
      page: state.page,
      pageSize: state.pageSize,
      adapterParityFilter: state.adapterParityFilter
    });
  }

  function renderBurnInSummary(summary) {
    var panel = el("history-burnin-summary");
    if (!panel) return;
    var burnInState = historyBurnInRuntime.resolveHistoryBurnInSummaryState(summary);
    if (!burnInState || burnInState.hasSummary !== true) {
      panel.innerHTML = "<div class='history-burnin-empty'>暂无 burn-in 数据</div>";
      return;
    }

    var mismatchAction = "";
    if (burnInState.mismatchActionEnabled) {
      mismatchAction = "<button class='replay-button history-burnin-focus-mismatch'>仅看不一致</button>";
    }

    panel.innerHTML =
      "<div class='history-burnin-head'>" +
        "<div class='history-burnin-title'>Cutover Burn-in 统计</div>" +
        "<div class='history-burnin-gates'>" +
          "<span class='history-burnin-gate " + burnInState.gateClass + "'>单窗口: " + escapeHtml(burnInState.gateLabel) + "</span>" +
          "<span class='history-burnin-gate " + burnInState.sustainedGateClass + "'>连续窗口: " + escapeHtml(burnInState.sustainedGateLabel) + "</span>" +
        "</div>" +
      "</div>" +
      "<div class='history-burnin-grid'>" +
        "<span>采样: " + escapeHtml(burnInState.limitText) + "</span>" +
        "<span>诊断记录 " + escapeHtml(summary.withDiagnostics) + "</span>" +
        "<span>可比较样本 " + escapeHtml(summary.comparable) + "</span>" +
        "<span>一致 " + escapeHtml(summary.match) + "</span>" +
        "<span>不一致 " + escapeHtml(summary.mismatch) + "</span>" +
        "<span>样本不足 " + escapeHtml(summary.incomplete) + "</span>" +
        "<span>不一致率 " + escapeHtml(burnInState.mismatchRateText) + "</span>" +
      "</div>" +
      "<div class='history-burnin-note'>" +
        "门槛: 可比较 >= " + escapeHtml(summary.minComparable) +
        "，不一致率 <= " + escapeHtml(burnInState.maxMismatchRateText) +
      "</div>" +
      "<div class='history-burnin-note'>" +
        "连续门槛: 最近 " + escapeHtml(burnInState.sustainedRequired) +
        " 个窗口（每窗口 " + escapeHtml(burnInState.sustainedWindowSize) +
        " 条）均需单窗口达标" +
      "</div>" +
      "<div class='history-burnin-note'>" +
        "连续通过 " + escapeHtml(burnInState.sustainedConsecutive) +
        "/" + escapeHtml(burnInState.sustainedRequired) +
        "，已评估窗口 " + escapeHtml(burnInState.sustainedEvaluated) +
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

  function readCanaryPolicySnapshot() {
    var runtime = window.LegacyAdapterRuntime;
    var runtimePolicy = null;
    if (runtime && typeof runtime.resolveAdapterModePolicy === "function") {
      var policy = runtime.resolveAdapterModePolicy({});
      if (isPlainObject(policy)) runtimePolicy = policy;
    }
    return historyCanaryPolicyRuntime.resolveCanaryPolicySnapshot({
      runtimePolicy: runtimePolicy,
      defaultModeRaw: getStorageValue(ADAPTER_DEFAULT_STORAGE_KEY),
      forceLegacyRaw: getStorageValue(ADAPTER_FORCE_LEGACY_STORAGE_KEY)
    });
  }

  function readStoredPolicyKeys() {
    var runtime = window.LegacyAdapterRuntime;
    var runtimeStoredKeys = null;
    if (runtime && typeof runtime.readStoredAdapterPolicyKeys === "function") {
      var result = runtime.readStoredAdapterPolicyKeys();
      if (isPlainObject(result)) runtimeStoredKeys = result;
    }
    return historyCanaryPolicyRuntime.resolveStoredPolicyKeys({
      runtimeStoredKeys: runtimeStoredKeys,
      adapterModeRaw: getStorageValue(ADAPTER_MODE_STORAGE_KEY),
      defaultModeRaw: getStorageValue(ADAPTER_DEFAULT_STORAGE_KEY),
      forceLegacyRaw: getStorageValue(ADAPTER_FORCE_LEGACY_STORAGE_KEY)
    });
  }

  function writeStoredDefaultMode(mode) {
    var runtime = window.LegacyAdapterRuntime;
    if (runtime && typeof runtime.setStoredAdapterDefaultMode === "function") {
      return runtime.setStoredAdapterDefaultMode(mode);
    }
    return setStorageValue(ADAPTER_DEFAULT_STORAGE_KEY, mode || null);
  }

  function clearStoredDefaultMode() {
    var runtime = window.LegacyAdapterRuntime;
    if (runtime && typeof runtime.clearStoredAdapterDefaultMode === "function") {
      return runtime.clearStoredAdapterDefaultMode();
    }
    return setStorageValue(ADAPTER_DEFAULT_STORAGE_KEY, null);
  }

  function writeStoredForceLegacy(enabled) {
    var runtime = window.LegacyAdapterRuntime;
    if (runtime && typeof runtime.setStoredForceLegacy === "function") {
      return runtime.setStoredForceLegacy(enabled);
    }
    return setStorageValue(ADAPTER_FORCE_LEGACY_STORAGE_KEY, enabled ? "1" : null);
  }

  function runCanaryPolicyAction(actionName) {
    var actionPlan = historyCanaryPolicyRuntime.resolveCanaryPolicyActionPlan(actionName || "");
    if (!actionPlan || actionPlan.isSupported !== true) return false;

    var success = true;
    if (actionPlan.defaultMode === null) {
      success = clearStoredDefaultMode();
    } else if (typeof actionPlan.defaultMode === "string") {
      success = writeStoredDefaultMode(actionPlan.defaultMode);
    }

    if (success && typeof actionPlan.forceLegacy === "boolean") {
      success = writeStoredForceLegacy(actionPlan.forceLegacy);
    }
    return success;
  }

  function renderCanaryPolicy() {
    var panel = el("history-canary-policy");
    if (!panel) return;

    var policy = readCanaryPolicySnapshot();
    var stored = readStoredPolicyKeys();
    var canaryView = historyCanaryViewRuntime.resolveHistoryCanaryViewState(policy, stored);

    panel.innerHTML =
      "<div class='history-canary-head'>" +
        "<div class='history-canary-title'>Canary 策略控制</div>" +
        "<span class='history-burnin-gate " + canaryView.gateClass + "'>" + escapeHtml(canaryView.gateText) + "</span>" +
      "</div>" +
      "<div class='history-canary-grid'>" +
        "<span>当前有效模式: " + escapeHtml(canaryView.effectiveModeText) + "</span>" +
        "<span>生效来源: " + escapeHtml(canaryView.modeSourceText) + "</span>" +
        "<span>强制回滚: " + escapeHtml(canaryView.forceLegacyText) + "</span>" +
        "<span>回滚来源: " + escapeHtml(canaryView.forceSourceText) + "</span>" +
      "</div>" +
      "<div class='history-canary-note'>" +
        "storage(engine_adapter_default_mode)=" + escapeHtml(canaryView.storedDefaultText) +
        " · storage(engine_adapter_force_legacy)=" + escapeHtml(canaryView.storedForceLegacyText) +
      "</div>" +
      "<div class='history-canary-note'>" +
        "说明: 修改后需刷新任一对局页（index/play/undo/capped/practice/replay）以应用新策略。" +
      "</div>" +
      "<div class='history-canary-actions'>" +
        "<button class='replay-button history-canary-action-btn' data-action='apply_canary'>进入 Canary（默认 core）</button>" +
        "<button class='replay-button history-canary-action-btn' data-action='emergency_rollback'>紧急回滚（强制 legacy）</button>" +
        "<button class='replay-button history-canary-action-btn' data-action='resume_canary'>解除回滚（恢复默认）</button>" +
        "<button class='replay-button history-canary-action-btn' data-action='reset_policy'>重置策略（回到基线）</button>" +
      "</div>";

    var buttons = panel.querySelectorAll(".history-canary-action-btn");
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener("click", function (event) {
        var target = event.currentTarget;
        var action = target && target.getAttribute ? target.getAttribute("data-action") : "";
        var ok = runCanaryPolicyAction(action || "");
        if (!ok) {
          setStatus("策略更新失败：请检查浏览器本地存储权限", true);
          return;
        }
        loadHistory(false);
        setStatus(historyCanaryPolicyRuntime.resolveCanaryPolicyActionNotice(action || ""), false);
      });
    }
  }

  function downloadSingleRecord(item) {
    if (!window.LocalHistoryStore) return;
    var payload = window.LocalHistoryStore.exportRecords([item.id]);
    var file = historyExportRuntime.resolveHistoryRecordExportFileName({
      modeKey: item && item.mode_key,
      id: item && item.id
    });
    window.LocalHistoryStore.download(file, payload);
  }

  function collectRecordIdsForExport(queryOptions) {
    return historyExportRuntime.collectHistoryRecordIdsForExport({
      listRecords:
        window.LocalHistoryStore && typeof window.LocalHistoryStore.listRecords === "function"
          ? window.LocalHistoryStore.listRecords.bind(window.LocalHistoryStore)
          : null,
      queryOptions: queryOptions,
      maxPages: 100,
      pageSize: 500
    });
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

        var headState = historyRecordViewRuntime.resolveHistoryRecordHeadState({
          modeKey: item && item.mode_key,
          modeFallback: item && item.mode,
          catalogLabel: getCatalogModeLabel(item),
          score: item && item.score,
          bestTile: item && item.best_tile,
          durationMs: item && item.duration_ms,
          endedAt: item && item.ended_at
        });

        node.innerHTML =
          "<div class='history-item-head'>" +
            "<strong>" + headState.modeText + "</strong>" +
            buildAdapterBadgeHtml(item) +
            "<span>分数: " + headState.score + "</span>" +
            "<span>最大块: " + headState.bestTile + "</span>" +
            "<span>时长: " + headState.durationText + "</span>" +
            "<span>结束: " + headState.endedText + "</span>" +
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
    var modeInput = el("history-mode");
    var keywordInput = el("history-keyword");
    var sortInput = el("history-sort");
    var adapterFilterInput = el("history-adapter-filter");
    var burnInWindowInput = el("history-burnin-window");
    var sustainedWindowInput = el("history-sustained-window");
    var filterState = historyQueryRuntime.resolveHistoryFilterState({
      modeKeyRaw: modeInput && modeInput.value,
      keywordRaw: keywordInput && keywordInput.value,
      sortByRaw: sortInput && sortInput.value,
      adapterParityFilterRaw: adapterFilterInput && adapterFilterInput.value,
      burnInWindowRaw: burnInWindowInput && burnInWindowInput.value,
      sustainedWindowsRaw: sustainedWindowInput && sustainedWindowInput.value
    });
    state.modeKey = filterState.modeKey;
    state.keyword = filterState.keyword;
    state.sortBy = filterState.sortBy;
    state.adapterParityFilter = filterState.adapterParityFilter;
    state.burnInWindow = filterState.burnInWindow;
    state.sustainedWindows = filterState.sustainedWindows;
  }

  function loadHistory(resetPage) {
    if (!window.LocalHistoryStore) return;
    if (resetPage) state.page = 1;
    readFilters();

    var listQuery = historyQueryRuntime.resolveHistoryListQuery({
      modeKey: state.modeKey,
      keyword: state.keyword,
      sortBy: state.sortBy,
      adapterParityFilter: state.adapterParityFilter,
      page: state.page,
      pageSize: state.pageSize
    });
    var result = window.LocalHistoryStore.listRecords(listQuery);

    renderHistory(result);
    buildSummary(result);
    var burnInSummary = null;
    if (
      window.LocalHistoryStore &&
      typeof window.LocalHistoryStore.getAdapterParityBurnInSummary === "function"
    ) {
      var burnInQuery = historyQueryRuntime.resolveHistoryBurnInQuery({
        modeKey: state.modeKey,
        keyword: state.keyword,
        sortBy: state.sortBy,
        sampleLimit: state.burnInWindow,
        sustainedWindows: state.sustainedWindows,
        minComparable: BURN_IN_MIN_COMPARABLE,
        maxMismatchRate: BURN_IN_MAX_MISMATCH_RATE
      });
      burnInSummary = window.LocalHistoryStore.getAdapterParityBurnInSummary(burnInQuery);
    }
    renderBurnInSummary(burnInSummary);
    renderCanaryPolicy();
    setStatus("", false);

    var prevBtn = el("history-prev-page");
    var nextBtn = el("history-next-page");
    var pagerState = historyQueryRuntime.resolveHistoryPagerState({
      total: result && result.total,
      page: state.page,
      pageSize: state.pageSize
    });
    if (prevBtn) prevBtn.disabled = pagerState.disablePrev;
    if (nextBtn) nextBtn.disabled = pagerState.disableNext;
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
        importMode = historyImportRuntime.resolveHistoryImportActionState("merge").mode;
        importInput.click();
      });
      if (importReplaceBtn) {
        importReplaceBtn.addEventListener("click", function () {
          var actionState = historyImportRuntime.resolveHistoryImportActionState("replace");
          if (actionState.requiresConfirm && !window.confirm(actionState.confirmMessage)) return;
          importMode = actionState.mode;
          importInput.click();
        });
      }
      importInput.addEventListener("change", function () {
        var file = importInput.files && importInput.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function () {
          try {
            var merge = historyImportRuntime.resolveHistoryImportMergeFlag(importMode);
            var result = window.LocalHistoryStore.importRecords(String(reader.result || ""), { merge: merge });
            setStatus(historyImportRuntime.resolveHistoryImportSuccessNotice(result), false);
            loadHistory(true);
          } catch (error) {
            setStatus(historyImportRuntime.resolveHistoryImportErrorNotice(error), true);
          }
        };
        reader.onerror = function () {
          setStatus(historyImportRuntime.resolveHistoryImportReadErrorNotice(), true);
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

    var sustainedWindow = el("history-sustained-window");
    if (sustainedWindow) {
      sustainedWindow.addEventListener("change", function () {
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
