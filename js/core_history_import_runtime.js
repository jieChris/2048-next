(function (global) {
  "use strict";

  if (!global) return;

  function normalizeImportMode(mode) {
    return mode === "replace" ? "replace" : "merge";
  }

  function resolveHistoryImportActionState(action) {
    if (action === "replace") {
      return {
        mode: "replace",
        requiresConfirm: true,
        confirmMessage: "导入并替换会清空当前本地历史后再导入，是否继续？"
      };
    }

    return {
      mode: "merge",
      requiresConfirm: false,
      confirmMessage: ""
    };
  }

  function resolveHistoryImportMergeFlag(mode) {
    return normalizeImportMode(mode) !== "replace";
  }

  function resolveHistoryImportSuccessNotice(result) {
    var imported =
      result && typeof result === "object" && Number.isFinite(result.imported)
        ? Number(result.imported)
        : 0;
    var replaced =
      result && typeof result === "object" && Number.isFinite(result.replaced)
        ? Number(result.replaced)
        : 0;
    return "导入成功：新增 " + imported + " 条，覆盖 " + replaced + " 条。";
  }

  function resolveHistoryImportErrorNotice(error) {
    var message =
      error && typeof error === "object" && typeof error.message === "string" ? error.message : "unknown";
    return "导入失败: " + message;
  }

  function resolveHistoryImportReadErrorNotice() {
    return "读取文件失败";
  }

  global.CoreHistoryImportRuntime = global.CoreHistoryImportRuntime || {};
  global.CoreHistoryImportRuntime.resolveHistoryImportActionState = resolveHistoryImportActionState;
  global.CoreHistoryImportRuntime.resolveHistoryImportMergeFlag = resolveHistoryImportMergeFlag;
  global.CoreHistoryImportRuntime.resolveHistoryImportSuccessNotice = resolveHistoryImportSuccessNotice;
  global.CoreHistoryImportRuntime.resolveHistoryImportErrorNotice = resolveHistoryImportErrorNotice;
  global.CoreHistoryImportRuntime.resolveHistoryImportReadErrorNotice = resolveHistoryImportReadErrorNotice;
})(typeof window !== "undefined" ? window : undefined);
