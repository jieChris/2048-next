(function (global) {
  "use strict";

  if (!global) return;

  function toDateTag(value) {
    if (value instanceof Date && Number.isFinite(value.getTime())) {
      return value.toISOString().slice(0, 10);
    }
    if (typeof value === "string" && value.length >= 10) {
      return value.slice(0, 10);
    }
    return new Date().toISOString().slice(0, 10);
  }

  function toFilterText(value) {
    return typeof value === "string" ? value : "";
  }

  function toSortKey(value) {
    return typeof value === "string" && value ? value : "ended_desc";
  }

  function resolveHistoryExportDateTag(value) {
    return toDateTag(value);
  }

  function resolveHistoryExportAllFileName(dateTag) {
    return "2048_local_history_" + toDateTag(dateTag) + ".json";
  }

  function resolveHistoryExportAllNotice() {
    return "已导出全部历史记录";
  }

  function resolveHistoryMismatchExportQuery(input) {
    var payload = input && typeof input === "object" ? input : {};
    return {
      mode_key: toFilterText(payload.modeKey),
      keyword: toFilterText(payload.keyword),
      sort_by: toSortKey(payload.sortBy),
      adapter_parity_filter: "mismatch"
    };
  }

  function resolveHistoryMismatchExportEmptyNotice() {
    return "没有可导出的 A/B 不一致记录";
  }

  function resolveHistoryMismatchExportFileName(dateTag) {
    return "2048_local_history_mismatch_" + toDateTag(dateTag) + ".json";
  }

  function resolveHistoryMismatchExportSuccessNotice(count) {
    var total = Number.isFinite(count) ? Number(count) : 0;
    return "已导出 A/B 不一致记录 " + total + " 条";
  }

  function resolveHistoryClearAllActionState() {
    return {
      requiresConfirm: true,
      confirmMessage: "确认清空全部本地历史记录？此操作不可撤销。",
      successNotice: "已清空全部历史记录"
    };
  }

  function executeHistoryClearAll(input) {
    try {
      var source = input && typeof input === "object" ? input : {};
      var store =
        source.localHistoryStore && typeof source.localHistoryStore === "object"
          ? source.localHistoryStore
          : null;
      if (!store || typeof store.clearAll !== "function") {
        return {
          cleared: false
        };
      }
      store.clearAll.call(store);
      return {
        cleared: true
      };
    } catch (_error) {
      return {
        cleared: false
      };
    }
  }

  global.CoreHistoryToolbarRuntime = global.CoreHistoryToolbarRuntime || {};
  global.CoreHistoryToolbarRuntime.resolveHistoryExportDateTag = resolveHistoryExportDateTag;
  global.CoreHistoryToolbarRuntime.resolveHistoryExportAllFileName = resolveHistoryExportAllFileName;
  global.CoreHistoryToolbarRuntime.resolveHistoryExportAllNotice = resolveHistoryExportAllNotice;
  global.CoreHistoryToolbarRuntime.resolveHistoryMismatchExportQuery = resolveHistoryMismatchExportQuery;
  global.CoreHistoryToolbarRuntime.resolveHistoryMismatchExportEmptyNotice = resolveHistoryMismatchExportEmptyNotice;
  global.CoreHistoryToolbarRuntime.resolveHistoryMismatchExportFileName = resolveHistoryMismatchExportFileName;
  global.CoreHistoryToolbarRuntime.resolveHistoryMismatchExportSuccessNotice =
    resolveHistoryMismatchExportSuccessNotice;
  global.CoreHistoryToolbarRuntime.resolveHistoryClearAllActionState = resolveHistoryClearAllActionState;
  global.CoreHistoryToolbarRuntime.executeHistoryClearAll = executeHistoryClearAll;
})(typeof window !== "undefined" ? window : undefined);
