(function (global) {
  "use strict";

  if (!global) return;

  function isRecord(value) {
    return !!value && typeof value === "object";
  }

  function asFunction(value) {
    return typeof value === "function" ? value : null;
  }

  function toRecord(value) {
    return isRecord(value) ? value : {};
  }

  function toText(value, fallback) {
    return typeof value === "string" ? value : fallback;
  }

  function createNoopActionState() {
    return {
      shouldSetStatus: false,
      statusText: "",
      isError: false,
      shouldReload: false
    };
  }

  function resolveHistoryRecordReplayHref(input) {
    var source = isRecord(input) ? input : {};
    var runtime = toRecord(source.historyRecordActionsRuntime);
    var resolveReplayHref = asFunction(runtime.resolveHistoryReplayHref);
    if (!resolveReplayHref) return "";
    return toText(resolveReplayHref(source.itemId), "");
  }

  function applyHistoryRecordExportAction(input) {
    var source = isRecord(input) ? input : {};
    if (!source.localHistoryStore) return false;

    var runtime = toRecord(source.historyExportRuntime);
    var downloadHistorySingleRecord = asFunction(runtime.downloadHistorySingleRecord);
    if (!downloadHistorySingleRecord) return false;
    return downloadHistorySingleRecord({
      localHistoryStore: source.localHistoryStore,
      item: source.item
    }) === true;
  }

  function applyHistoryRecordDeleteAction(input) {
    var source = isRecord(input) ? input : {};
    if (!source.localHistoryStore) return createNoopActionState();

    var runtime = toRecord(source.historyRecordActionsRuntime);
    var resolveHistoryDeleteActionState = asFunction(runtime.resolveHistoryDeleteActionState);
    var executeHistoryDeleteRecord = asFunction(runtime.executeHistoryDeleteRecord);
    var resolveHistoryDeleteFailureNotice = asFunction(runtime.resolveHistoryDeleteFailureNotice);
    var resolveHistoryDeleteSuccessNotice = asFunction(runtime.resolveHistoryDeleteSuccessNotice);
    var confirmAction = asFunction(source.confirmAction);
    if (!resolveHistoryDeleteActionState || !executeHistoryDeleteRecord) {
      return createNoopActionState();
    }

    var actionState = toRecord(resolveHistoryDeleteActionState(source.itemId));
    if (confirmAction && confirmAction(actionState.confirmMessage) !== true) {
      return createNoopActionState();
    }
    if (!confirmAction) return createNoopActionState();

    var deleteState = toRecord(
      executeHistoryDeleteRecord({
        localHistoryStore: source.localHistoryStore,
        recordId: actionState.recordId
      })
    );
    if (deleteState.deleted === true) {
      return {
        shouldSetStatus: true,
        statusText: toText(
          deleteState.notice,
          toText(
            resolveHistoryDeleteSuccessNotice ? resolveHistoryDeleteSuccessNotice() : "",
            ""
          )
        ),
        isError: false,
        shouldReload: true
      };
    }

    return {
      shouldSetStatus: true,
      statusText: toText(
        deleteState.notice,
        toText(
          resolveHistoryDeleteFailureNotice ? resolveHistoryDeleteFailureNotice() : "",
          ""
        )
      ),
      isError: true,
      shouldReload: false
    };
  }

  global.CoreHistoryRecordHostRuntime = global.CoreHistoryRecordHostRuntime || {};
  global.CoreHistoryRecordHostRuntime.resolveHistoryRecordReplayHref =
    resolveHistoryRecordReplayHref;
  global.CoreHistoryRecordHostRuntime.applyHistoryRecordExportAction =
    applyHistoryRecordExportAction;
  global.CoreHistoryRecordHostRuntime.applyHistoryRecordDeleteAction =
    applyHistoryRecordDeleteAction;
})(typeof window !== "undefined" ? window : undefined);
