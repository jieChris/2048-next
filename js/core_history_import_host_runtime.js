(function (global) {
  "use strict";

  if (!global) return;

  function isRecord(value) {
    return !!value && typeof value === "object";
  }

  function asFunction(value) {
    return typeof value === "function" ? value : null;
  }

  function toStringValue(value, fallback) {
    return typeof value === "string" ? value : fallback;
  }

  function createNoopStatus() {
    return {
      shouldSetStatus: false,
      statusText: "",
      isError: false,
      shouldReload: false
    };
  }

  function resolveImportActionState(historyImportRuntime, action) {
    var runtime = isRecord(historyImportRuntime) ? historyImportRuntime : null;
    var resolveHistoryImportActionState = asFunction(
      runtime && runtime.resolveHistoryImportActionState
    );
    if (!resolveHistoryImportActionState) return null;
    var result = resolveHistoryImportActionState(action);
    return isRecord(result) ? result : null;
  }

  function resolveHistoryImportMergeClickState(input) {
    var actionState = resolveImportActionState(input && input.historyImportRuntime, "merge");
    return {
      nextMode: toStringValue(
        actionState && actionState.mode,
        toStringValue(input && input.currentMode, "merge")
      ),
      shouldOpenFilePicker: true
    };
  }

  function resolveHistoryImportReplaceClickState(input) {
    var currentMode = toStringValue(input && input.currentMode, "merge");
    var actionState = resolveImportActionState(input && input.historyImportRuntime, "replace");
    if (!actionState) {
      return {
        nextMode: currentMode,
        shouldOpenFilePicker: false
      };
    }
    var confirmAction = asFunction(input && input.confirmAction);
    if (actionState.requiresConfirm === true) {
      var confirmed = confirmAction ? confirmAction(actionState.confirmMessage) : false;
      if (confirmed !== true) {
        return {
          nextMode: currentMode,
          shouldOpenFilePicker: false
        };
      }
    }

    return {
      nextMode: toStringValue(actionState.mode, currentMode),
      shouldOpenFilePicker: true
    };
  }

  function resolveHistoryImportFileSelectionState(input) {
    var runtime = isRecord(input && input.historyImportFileRuntime)
      ? input.historyImportFileRuntime
      : {};
    var resolveHistoryImportSelectedFile = asFunction(runtime.resolveHistoryImportSelectedFile);
    var resolveHistoryImportReadEncoding = asFunction(runtime.resolveHistoryImportReadEncoding);
    var resolveHistoryImportInputResetValue = asFunction(runtime.resolveHistoryImportInputResetValue);
    var file = resolveHistoryImportSelectedFile ? resolveHistoryImportSelectedFile(input && input.files) : null;

    return {
      file: file,
      shouldRead: !!file,
      encoding: toStringValue(
        resolveHistoryImportReadEncoding ? resolveHistoryImportReadEncoding() : null,
        "utf-8"
      ),
      resetValue: toStringValue(
        resolveHistoryImportInputResetValue ? resolveHistoryImportInputResetValue() : "",
        ""
      )
    };
  }

  function applyHistoryImportFromFileReadResult(input) {
    var importRuntime = isRecord(input && input.historyImportRuntime)
      ? input.historyImportRuntime
      : {};
    var fileRuntime = isRecord(input && input.historyImportFileRuntime)
      ? input.historyImportFileRuntime
      : {};
    var resolveHistoryImportPayloadText = asFunction(fileRuntime.resolveHistoryImportPayloadText);
    var executeHistoryImport = asFunction(importRuntime.executeHistoryImport);
    var resolveHistoryImportErrorNotice = asFunction(importRuntime.resolveHistoryImportErrorNotice);
    if (!resolveHistoryImportPayloadText || !executeHistoryImport) {
      return createNoopStatus();
    }

    try {
      var payloadText = resolveHistoryImportPayloadText(input && input.readerResult);
      var importState = executeHistoryImport({
        localHistoryStore: input && input.localHistoryStore,
        payloadText: payloadText,
        mode: toStringValue(input && input.importMode, "merge")
      });
      var importStateRecord = isRecord(importState) ? importState : {};
      if (importStateRecord.ok !== true) {
        return {
          shouldSetStatus: true,
          statusText: toStringValue(
            importStateRecord.notice,
            toStringValue(
              resolveHistoryImportErrorNotice
                ? resolveHistoryImportErrorNotice(new Error("unknown"))
                : "",
              ""
            )
          ),
          isError: true,
          shouldReload: false
        };
      }
      return {
        shouldSetStatus: true,
        statusText: toStringValue(importStateRecord.notice, ""),
        isError: false,
        shouldReload: true
      };
    } catch (_error) {
      return {
        shouldSetStatus: true,
        statusText: toStringValue(
          resolveHistoryImportErrorNotice
            ? resolveHistoryImportErrorNotice(new Error("unknown"))
            : "",
          ""
        ),
        isError: true,
        shouldReload: false
      };
    }
  }

  function resolveHistoryImportReadFailureState(input) {
    var importRuntime = isRecord(input && input.historyImportRuntime)
      ? input.historyImportRuntime
      : {};
    var resolveHistoryImportReadErrorNotice = asFunction(
      importRuntime.resolveHistoryImportReadErrorNotice
    );
    return {
      shouldSetStatus: true,
      statusText: toStringValue(
        resolveHistoryImportReadErrorNotice ? resolveHistoryImportReadErrorNotice() : "",
        ""
      ),
      isError: true,
      shouldReload: false
    };
  }

  global.CoreHistoryImportHostRuntime = global.CoreHistoryImportHostRuntime || {};
  global.CoreHistoryImportHostRuntime.resolveHistoryImportMergeClickState =
    resolveHistoryImportMergeClickState;
  global.CoreHistoryImportHostRuntime.resolveHistoryImportReplaceClickState =
    resolveHistoryImportReplaceClickState;
  global.CoreHistoryImportHostRuntime.resolveHistoryImportFileSelectionState =
    resolveHistoryImportFileSelectionState;
  global.CoreHistoryImportHostRuntime.applyHistoryImportFromFileReadResult =
    applyHistoryImportFromFileReadResult;
  global.CoreHistoryImportHostRuntime.resolveHistoryImportReadFailureState =
    resolveHistoryImportReadFailureState;
})(typeof window !== "undefined" ? window : undefined);
