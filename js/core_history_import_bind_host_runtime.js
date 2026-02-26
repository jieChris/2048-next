(function (global) {
  "use strict";

  if (!global) return;

  function isRecord(value) {
    return !!value && typeof value === "object";
  }

  function toRecord(value) {
    return isRecord(value) ? value : {};
  }

  function asFunction(value) {
    return typeof value === "function" ? value : null;
  }

  function bindListener(element, eventName, handler) {
    var addEventListener = asFunction(toRecord(element).addEventListener);
    if (!addEventListener) return false;
    addEventListener(eventName, handler);
    return true;
  }

  function applyStatus(setStatus, state) {
    if (!setStatus) return;
    var payload = toRecord(state);
    if (payload.shouldSetStatus === true) {
      setStatus(payload.statusText, payload.isError);
    }
  }

  function bindHistoryImportControls(input) {
    var source = toRecord(input);
    var getElementById = asFunction(source.getElementById);
    var loadHistory = asFunction(source.loadHistory);
    var setStatus = asFunction(source.setStatus);
    if (!getElementById || !loadHistory) {
      return {
        didBind: false,
        boundControlCount: 0
      };
    }

    var importHostRuntime = toRecord(source.historyImportHostRuntime);
    var resolveHistoryImportMergeClickState = asFunction(
      importHostRuntime.resolveHistoryImportMergeClickState
    );
    var resolveHistoryImportReplaceClickState = asFunction(
      importHostRuntime.resolveHistoryImportReplaceClickState
    );
    var resolveHistoryImportFileSelectionState = asFunction(
      importHostRuntime.resolveHistoryImportFileSelectionState
    );
    var applyHistoryImportFromFileReadResult = asFunction(
      importHostRuntime.applyHistoryImportFromFileReadResult
    );
    var resolveHistoryImportReadFailureState = asFunction(
      importHostRuntime.resolveHistoryImportReadFailureState
    );

    var importBtn = getElementById("history-import-btn");
    var importReplaceBtn = getElementById("history-import-replace-btn");
    var importInputRaw = getElementById("history-import-file");
    var importInput = toRecord(importInputRaw);
    var clickInput = asFunction(importInput.click);
    if (!importBtn || !importInputRaw) {
      return {
        didBind: false,
        boundControlCount: 0
      };
    }

    var createFileReader = asFunction(source.createFileReader);
    var confirmAction = asFunction(source.confirmAction);

    function readAsTextFromReader(reader, file, encoding) {
      var readAsText = asFunction(toRecord(reader).readAsText);
      if (!readAsText) return false;
      readAsText.call(reader, file, encoding);
      return true;
    }

    var boundControlCount = 0;
    var importMode = "merge";

    if (
      resolveHistoryImportMergeClickState &&
      bindListener(importBtn, "click", function () {
        var clickState = toRecord(
          resolveHistoryImportMergeClickState({
            currentMode: importMode,
            historyImportRuntime: source.historyImportRuntime
          })
        );
        if (typeof clickState.nextMode === "string") {
          importMode = clickState.nextMode;
        }
        if (clickState.shouldOpenFilePicker === true && clickInput) {
          clickInput();
        }
      })
    ) {
      boundControlCount += 1;
    }

    if (
      resolveHistoryImportReplaceClickState &&
      importReplaceBtn &&
      bindListener(importReplaceBtn, "click", function () {
        var clickState = toRecord(
          resolveHistoryImportReplaceClickState({
            currentMode: importMode,
            historyImportRuntime: source.historyImportRuntime,
            confirmAction: confirmAction
          })
        );
        if (typeof clickState.nextMode === "string") {
          importMode = clickState.nextMode;
        }
        if (clickState.shouldOpenFilePicker === true && clickInput) {
          clickInput();
        }
      })
    ) {
      boundControlCount += 1;
    }

    if (
      resolveHistoryImportFileSelectionState &&
      applyHistoryImportFromFileReadResult &&
      resolveHistoryImportReadFailureState &&
      bindListener(importInput, "change", function () {
        var selectionState = toRecord(
          resolveHistoryImportFileSelectionState({
            files: importInput.files,
            historyImportFileRuntime: source.historyImportFileRuntime
          })
        );
        if (selectionState.shouldRead !== true) return;

        var reader = createFileReader ? createFileReader() : null;
        var readerRecord = toRecord(reader);
        var onload = function () {
          var importState = applyHistoryImportFromFileReadResult({
            readerResult: readerRecord.result,
            importMode: importMode,
            localHistoryStore: source.localHistoryStore,
            historyImportRuntime: source.historyImportRuntime,
            historyImportFileRuntime: source.historyImportFileRuntime
          });
          applyStatus(setStatus, importState);
          if (toRecord(importState).shouldReload === true) {
            loadHistory(true);
          }
        };
        var onerror = function () {
          var failureState = resolveHistoryImportReadFailureState({
            historyImportRuntime: source.historyImportRuntime
          });
          applyStatus(setStatus, failureState);
        };

        readerRecord.onload = onload;
        readerRecord.onerror = onerror;
        if (!readAsTextFromReader(readerRecord, selectionState.file, selectionState.encoding)) {
          onerror();
          return;
        }
        importInput.value = typeof selectionState.resetValue === "string" ? selectionState.resetValue : "";
      })
    ) {
      boundControlCount += 1;
    }

    return {
      didBind: boundControlCount > 0,
      boundControlCount: boundControlCount
    };
  }

  global.CoreHistoryImportBindHostRuntime = global.CoreHistoryImportBindHostRuntime || {};
  global.CoreHistoryImportBindHostRuntime.bindHistoryImportControls = bindHistoryImportControls;
})(typeof window !== "undefined" ? window : undefined);
