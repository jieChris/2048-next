(function () {
  "use strict";

  var FILTER_STORAGE_KEY = "history_filter_state_v1";

  function $(id) {
    return document.getElementById(id);
  }

  function toText(value) {
    return value == null ? "" : String(value);
  }

  function escapeHtml(value) {
    return toText(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
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
      throw new Error("local_history_method_missing:" + methodName);
    }
    var args = Array.prototype.slice.call(arguments, 1);
    return await method.apply(window.LocalHistoryStore, args);
  }

  function readFilterState(defaults) {
    try {
      var raw = localStorage.getItem(FILTER_STORAGE_KEY);
      if (!raw) return defaults;
      var parsed = JSON.parse(raw);
      var filter = parsed && parsed.filter && typeof parsed.filter === "object" ? parsed.filter : parsed;
      if (!filter || typeof filter !== "object") return defaults;
      return {
        page: 1,
        pageSize: defaults.pageSize,
        modeKey: typeof filter.modeKey === "string" ? filter.modeKey : defaults.modeKey,
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
      keyword: toText(state.keyword),
      sortBy: toText(state.sortBy)
    };
    var isDefault =
      filter.modeKey === toText(defaults.modeKey) &&
      filter.keyword === toText(defaults.keyword) &&
      filter.sortBy === toText(defaults.sortBy);

    if (isDefault) {
      localStorage.removeItem(FILTER_STORAGE_KEY);
      return;
    }

    localStorage.setItem(
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
    return modeKey || fallback || "未知";
  }

  function resolveReplayCode(value) {
    return typeof value === "string" ? value : "";
  }

  function boardToHtml(record) {
    var board = Array.isArray(record.final_board) ? record.final_board : [];
    var width = Number(record.board_width);
    var height = Number(record.board_height);
    if (!Array.isArray(board) || !board.length || !Number.isInteger(width) || !Number.isInteger(height)) {
      return "";
    }

    var size = Math.max(24, Math.floor(132 / Math.max(width, height)));
    var rows = [];
    for (var y = 0; y < height; y += 1) {
      var cols = [];
      var row = Array.isArray(board[y]) ? board[y] : [];
      for (var x = 0; x < width; x += 1) {
        var value = Number(row[x]) || 0;
        cols.push(
          "<span style='display:inline-flex;align-items:center;justify-content:center;width:" +
            size +
            "px;height:" +
            size +
            "px;border-radius:6px;background:#3a3a3a;color:#f8f8f8;font-size:12px;font-weight:700;'>" +
            (value > 0 ? escapeHtml(value) : "") +
            "</span>"
        );
      }
      rows.push("<div style='display:flex;gap:4px;'>" + cols.join("") + "</div>");
    }
    return "<div class='history-board' style='display:flex;flex-direction:column;gap:4px;margin-top:8px;'>" + rows.join("") + "</div>";
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
      var item = items[i] || {};
      var modeText = resolveModeLabel(item.mode_key, item.mode);
      var node = document.createElement("div");
      node.className = "history-item";
      node.innerHTML =
        "<div class='history-item-head'>" +
          "<strong>" + escapeHtml(modeText) + "</strong>" +
          "<span>分数: " + escapeHtml(Number(item.score) || 0) + "</span>" +
          "<span>最大块: " + escapeHtml(Number(item.best_tile) || 0) + "</span>" +
          "<span>时长: " + escapeHtml(formatDuration(item.duration_ms)) + "</span>" +
          "<span>结束: " + escapeHtml(formatEndedAt(item.ended_at)) + "</span>" +
        "</div>" +
        "<div class='history-item-actions'>" +
          "<button class='replay-button history-replay-btn'>回放</button>" +
          "<button class='replay-button history-export-btn'>导出</button>" +
          "<button class='replay-button history-delete-btn'>删除</button>" +
        "</div>" +
        boardToHtml(item);

      var replayBtn = node.querySelector(".history-replay-btn");
      if (replayBtn) {
        replayBtn.addEventListener("click", (function (id) {
          return function () {
            location.href = "replay.html?local_history_id=" + encodeURIComponent(id);
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
    var keyword = $("history-keyword");
    var sort = $("history-sort");
    state.modeKey = mode ? toText(mode.value) : "";
    state.keyword = keyword ? toText(keyword.value) : "";
    state.sortBy = sort ? toText(sort.value || "ended_desc") : "ended_desc";
  }

  function applyControls(state) {
    var mode = $("history-mode");
    var keyword = $("history-keyword");
    var sort = $("history-sort");
    if (mode) mode.value = toText(state.modeKey);
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
          keyword: state.keyword,
          sort_by: state.sortBy,
          page: state.page,
          page_size: state.pageSize
        });
        renderList(Array.isArray(result.items) ? result.items : [], loadHistory);
        renderSummary(result || {}, state);
        setStatus("", false);
      } catch (_error) {
        setStatus("加载历史失败", true);
      }
    }

    initModeFilter();
    applyControls(state);

    var loadBtn = $("history-load-btn");
    if (loadBtn) {
      loadBtn.addEventListener("click", function () {
        loadHistory(true);
      });
    }

    var mode = $("history-mode");
    var sort = $("history-sort");
    var keyword = $("history-keyword");
    if (mode) mode.addEventListener("change", function () { loadHistory(true); });
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
    loadHistory(true);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrap);
  } else {
    bootstrap();
  }
})();
