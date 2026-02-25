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

  global.CoreHistoryRecordActionsRuntime = global.CoreHistoryRecordActionsRuntime || {};
  global.CoreHistoryRecordActionsRuntime.resolveHistoryReplayHref = resolveHistoryReplayHref;
  global.CoreHistoryRecordActionsRuntime.resolveHistoryDeleteActionState =
    resolveHistoryDeleteActionState;
  global.CoreHistoryRecordActionsRuntime.resolveHistoryDeleteFailureNotice =
    resolveHistoryDeleteFailureNotice;
  global.CoreHistoryRecordActionsRuntime.resolveHistoryDeleteSuccessNotice =
    resolveHistoryDeleteSuccessNotice;
})(typeof window !== "undefined" ? window : undefined);
