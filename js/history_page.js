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

  function normalizeAdapterMode(raw) {
    if (raw === "core" || raw === "core-adapter") return "core-adapter";
    if (raw === "legacy" || raw === "legacy-bridge") return "legacy-bridge";
    return null;
  }

  function normalizeForceLegacyFlag(raw) {
    if (raw === true || raw === 1) return true;
    if (typeof raw !== "string") return false;
    var normalized = raw.trim().toLowerCase();
    if (!normalized) return false;
    return (
      normalized === "1" ||
      normalized === "true" ||
      normalized === "yes" ||
      normalized === "on" ||
      normalized === "legacy" ||
      normalized === "legacy-bridge"
    );
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

  function getSustainedGateLabel(status) {
    if (status === "pass") return "连续达标";
    if (status === "fail") return "连续未达标";
    if (status === "insufficient_window") return "窗口不足";
    return "样本不足";
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
    var sustainedGateLabel = getSustainedGateLabel(summary.sustainedGateStatus);
    var sustainedGateClass = getBurnInGateClass(
      summary.sustainedGateStatus === "pass" || summary.sustainedGateStatus === "fail"
        ? summary.sustainedGateStatus
        : "warn"
    );
    var sustainedWindowSize = Number.isFinite(summary.sustainedWindowSize) ? summary.sustainedWindowSize : 0;
    var sustainedRequired = Number.isFinite(summary.sustainedWindows) ? summary.sustainedWindows : 0;
    var sustainedEvaluated = Number.isFinite(summary.sustainedEvaluatedWindows)
      ? summary.sustainedEvaluatedWindows
      : 0;
    var sustainedConsecutive = Number.isFinite(summary.sustainedConsecutivePass)
      ? summary.sustainedConsecutivePass
      : 0;
    var mismatchAction = "";
    if ((summary.mismatch || 0) > 0) {
      mismatchAction = "<button class='replay-button history-burnin-focus-mismatch'>仅看不一致</button>";
    }

    panel.innerHTML =
      "<div class='history-burnin-head'>" +
        "<div class='history-burnin-title'>Cutover Burn-in 统计</div>" +
        "<div class='history-burnin-gates'>" +
          "<span class='history-burnin-gate " + gateClass + "'>单窗口: " + escapeHtml(gateLabel) + "</span>" +
          "<span class='history-burnin-gate " + sustainedGateClass + "'>连续窗口: " + escapeHtml(sustainedGateLabel) + "</span>" +
        "</div>" +
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
      "<div class='history-burnin-note'>" +
        "连续门槛: 最近 " + escapeHtml(sustainedRequired) +
        " 个窗口（每窗口 " + escapeHtml(sustainedWindowSize) +
        " 条）均需单窗口达标" +
      "</div>" +
      "<div class='history-burnin-note'>" +
        "连续通过 " + escapeHtml(sustainedConsecutive) +
        "/" + escapeHtml(sustainedRequired) +
        "，已评估窗口 " + escapeHtml(sustainedEvaluated) +
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

  function formatModeSource(source) {
    if (source === "explicit") return "显式参数";
    if (source === "force-legacy") return "强制回滚";
    if (source === "global") return "全局变量";
    if (source === "query") return "URL 参数";
    if (source === "storage") return "本地存储";
    if (source === "default") return "默认策略";
    return "默认回退";
  }

  function formatForceSource(source) {
    if (source === "input") return "输入参数";
    if (source === "global") return "全局变量";
    if (source === "query") return "URL 参数";
    if (source === "storage") return "本地存储";
    return "-";
  }

  function readCanaryPolicySnapshot() {
    var runtime = window.LegacyAdapterRuntime;
    if (runtime && typeof runtime.resolveAdapterModePolicy === "function") {
      var policy = runtime.resolveAdapterModePolicy({});
      if (isPlainObject(policy)) return policy;
    }

    var defaultMode = normalizeAdapterMode(getStorageValue(ADAPTER_DEFAULT_STORAGE_KEY));
    var forceLegacy = normalizeForceLegacyFlag(getStorageValue(ADAPTER_FORCE_LEGACY_STORAGE_KEY));
    if (forceLegacy) {
      return {
        effectiveMode: "legacy-bridge",
        modeSource: "force-legacy",
        forceLegacyEnabled: true,
        forceLegacySource: "storage",
        explicitMode: null,
        globalMode: null,
        queryMode: null,
        storageMode: null,
        defaultMode: defaultMode
      };
    }
    if (defaultMode) {
      return {
        effectiveMode: defaultMode,
        modeSource: "default",
        forceLegacyEnabled: false,
        forceLegacySource: null,
        explicitMode: null,
        globalMode: null,
        queryMode: null,
        storageMode: null,
        defaultMode: defaultMode
      };
    }
    return {
      effectiveMode: "legacy-bridge",
      modeSource: "fallback",
      forceLegacyEnabled: false,
      forceLegacySource: null,
      explicitMode: null,
      globalMode: null,
      queryMode: null,
      storageMode: null,
      defaultMode: null
    };
  }

  function readStoredPolicyKeys() {
    var runtime = window.LegacyAdapterRuntime;
    if (runtime && typeof runtime.readStoredAdapterPolicyKeys === "function") {
      var result = runtime.readStoredAdapterPolicyKeys();
      if (isPlainObject(result)) return result;
    }
    return {
      adapterMode: getStorageValue(ADAPTER_MODE_STORAGE_KEY),
      defaultMode: getStorageValue(ADAPTER_DEFAULT_STORAGE_KEY),
      forceLegacy: getStorageValue(ADAPTER_FORCE_LEGACY_STORAGE_KEY)
    };
  }

  function writeStoredDefaultMode(mode) {
    var runtime = window.LegacyAdapterRuntime;
    if (runtime && typeof runtime.setStoredAdapterDefaultMode === "function") {
      return runtime.setStoredAdapterDefaultMode(mode);
    }
    var normalized = normalizeAdapterMode(mode);
    return setStorageValue(ADAPTER_DEFAULT_STORAGE_KEY, normalized || null);
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
    var success = false;
    if (actionName === "apply_canary") {
      success = writeStoredDefaultMode("core-adapter") && writeStoredForceLegacy(false);
    } else if (actionName === "emergency_rollback") {
      success = writeStoredForceLegacy(true);
    } else if (actionName === "resume_canary") {
      success = writeStoredForceLegacy(false);
    } else if (actionName === "reset_policy") {
      success = clearStoredDefaultMode() && writeStoredForceLegacy(false);
    }
    return success;
  }

  function renderCanaryPolicy() {
    var panel = el("history-canary-policy");
    if (!panel) return;

    var policy = readCanaryPolicySnapshot();
    var stored = readStoredPolicyKeys();
    var gateClass = policy.effectiveMode === "core-adapter"
      ? "history-burnin-gate-pass"
      : "history-burnin-gate-warn";
    var gateText = policy.effectiveMode === "core-adapter" ? "core-adapter 生效" : "legacy-bridge 生效";

    panel.innerHTML =
      "<div class='history-canary-head'>" +
        "<div class='history-canary-title'>Canary 策略控制</div>" +
        "<span class='history-burnin-gate " + gateClass + "'>" + escapeHtml(gateText) + "</span>" +
      "</div>" +
      "<div class='history-canary-grid'>" +
        "<span>当前有效模式: " + escapeHtml(formatAdapterMode(policy.effectiveMode)) + "</span>" +
        "<span>生效来源: " + escapeHtml(formatModeSource(policy.modeSource)) + "</span>" +
        "<span>强制回滚: " + escapeHtml(policy.forceLegacyEnabled ? "开启" : "关闭") + "</span>" +
        "<span>回滚来源: " + escapeHtml(formatForceSource(policy.forceLegacySource)) + "</span>" +
      "</div>" +
      "<div class='history-canary-note'>" +
        "storage(engine_adapter_default_mode)=" + escapeHtml(String(stored.defaultMode || "-")) +
        " · storage(engine_adapter_force_legacy)=" + escapeHtml(String(stored.forceLegacy || "-")) +
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
        if (action === "apply_canary") {
          setStatus("已设置默认 core-adapter，并清除强制回滚", false);
        } else if (action === "emergency_rollback") {
          setStatus("已开启强制回滚：legacy-bridge", false);
        } else if (action === "resume_canary") {
          setStatus("已解除强制回滚，恢复默认策略", false);
        } else if (action === "reset_policy") {
          setStatus("已重置策略到基线（无默认 core、无强制回滚）", false);
        } else {
          setStatus("策略已更新", false);
        }
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
    var sustainedWindowInput = el("history-sustained-window");
    state.sustainedWindows = ((sustainedWindowInput && sustainedWindowInput.value) || "3").trim();
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
        sustained_windows: state.sustainedWindows,
        min_comparable: BURN_IN_MIN_COMPARABLE,
        max_mismatch_rate: BURN_IN_MAX_MISMATCH_RATE
      });
    }
    renderBurnInSummary(burnInSummary);
    renderCanaryPolicy();
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
