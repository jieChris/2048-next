(function (global) {
  "use strict";

  if (!global) return;

  function toRecordId(value) {
    if (value === null || value === undefined) return "";
    return String(value);
  }

  function resolveHistoryReplayHref(recordId) {
    return "replay.html?local_history_id=" + encodeURIComponent(toRecordId(recordId));
  }

  function resolveHistoryDeleteActionState(recordId) {
    return {
      recordId: toRecordId(recordId),
      confirmMessage: "确认删除这条历史记录？此操作不可撤销。"
    };
  }

  function resolveHistoryDeleteFailureNotice() {
    return "删除失败：记录不存在或已被删除";
  }

  function resolveHistoryDeleteSuccessNotice() {
    return "记录已删除";
  }

  function executeHistoryDeleteRecord(input) {
    try {
      var source = input && typeof input === "object" ? input : {};
      var store =
        source.localHistoryStore && typeof source.localHistoryStore === "object"
          ? source.localHistoryStore
          : null;
      if (!store || typeof store.deleteById !== "function") {
        return {
          deleted: false,
          notice: resolveHistoryDeleteFailureNotice()
        };
      }
      var actionState = resolveHistoryDeleteActionState(source.recordId);
      if (!actionState.recordId) {
        return {
          deleted: false,
          notice: resolveHistoryDeleteFailureNotice()
        };
      }
      var ok = store.deleteById.call(store, actionState.recordId);
      if (ok) {
        return {
          deleted: true,
          notice: resolveHistoryDeleteSuccessNotice()
        };
      }
      return {
        deleted: false,
        notice: resolveHistoryDeleteFailureNotice()
      };
    } catch (_error) {
      return {
        deleted: false,
        notice: resolveHistoryDeleteFailureNotice()
      };
    }
  }

  global.CoreHistoryRecordActionsRuntime = global.CoreHistoryRecordActionsRuntime || {};
  global.CoreHistoryRecordActionsRuntime.resolveHistoryReplayHref = resolveHistoryReplayHref;
  global.CoreHistoryRecordActionsRuntime.resolveHistoryDeleteActionState =
    resolveHistoryDeleteActionState;
  global.CoreHistoryRecordActionsRuntime.resolveHistoryDeleteFailureNotice =
    resolveHistoryDeleteFailureNotice;
  global.CoreHistoryRecordActionsRuntime.resolveHistoryDeleteSuccessNotice =
    resolveHistoryDeleteSuccessNotice;
  global.CoreHistoryRecordActionsRuntime.executeHistoryDeleteRecord = executeHistoryDeleteRecord;
})(typeof window !== "undefined" ? window : undefined);
