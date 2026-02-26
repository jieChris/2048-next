function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function toRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function asFunction<T extends (...args: never[]) => unknown>(value: unknown): T | null {
  return typeof value === "function" ? (value as T) : null;
}

function bindListener(
  element: unknown,
  eventName: string,
  handler: (...args: never[]) => unknown
): boolean {
  const addEventListener = asFunction<(name: string, cb: (...args: never[]) => unknown) => unknown>(
    toRecord(element).addEventListener
  );
  if (!addEventListener) return false;
  (addEventListener as unknown as Function).call(element, eventName, handler);
  return true;
}

function applyStatus(
  setStatus: ((text: unknown, isError: unknown) => unknown) | null,
  state: unknown
): void {
  if (!setStatus) return;
  const payload = toRecord(state);
  if (payload.shouldSetStatus === true) {
    setStatus(payload.statusText, payload.isError);
  }
}

export interface HistoryImportBindHostResult {
  didBind: boolean;
  boundControlCount: number;
}

export function bindHistoryImportControls(input: {
  getElementById?: unknown;
  localHistoryStore?: unknown;
  historyImportRuntime?: unknown;
  historyImportFileRuntime?: unknown;
  historyImportHostRuntime?: unknown;
  confirmAction?: unknown;
  createFileReader?: unknown;
  setStatus?: unknown;
  loadHistory?: unknown;
}): HistoryImportBindHostResult {
  const source = toRecord(input);
  const getElementById = asFunction<(id: string) => unknown>(source.getElementById);
  const loadHistory = asFunction<(resetPage: unknown) => unknown>(source.loadHistory);
  const setStatus = asFunction<(text: unknown, isError: unknown) => unknown>(source.setStatus);
  if (!getElementById || !loadHistory) {
    return {
      didBind: false,
      boundControlCount: 0
    };
  }

  const importHostRuntime = toRecord(source.historyImportHostRuntime);
  const resolveHistoryImportMergeClickState = asFunction<(payload: unknown) => unknown>(
    importHostRuntime.resolveHistoryImportMergeClickState
  );
  const resolveHistoryImportReplaceClickState = asFunction<(payload: unknown) => unknown>(
    importHostRuntime.resolveHistoryImportReplaceClickState
  );
  const resolveHistoryImportFileSelectionState = asFunction<(payload: unknown) => unknown>(
    importHostRuntime.resolveHistoryImportFileSelectionState
  );
  const applyHistoryImportFromFileReadResult = asFunction<(payload: unknown) => unknown>(
    importHostRuntime.applyHistoryImportFromFileReadResult
  );
  const resolveHistoryImportReadFailureState = asFunction<(payload: unknown) => unknown>(
    importHostRuntime.resolveHistoryImportReadFailureState
  );

  const importBtn = getElementById("history-import-btn");
  const importReplaceBtn = getElementById("history-import-replace-btn");
  const importInputRaw = getElementById("history-import-file");
  const importInput = toRecord(importInputRaw);
  const clickInput = asFunction<() => unknown>(importInput.click);
  if (!importBtn || !importInputRaw) {
    return {
      didBind: false,
      boundControlCount: 0
    };
  }

  const createFileReader = asFunction<() => unknown>(source.createFileReader);
  const confirmAction = asFunction<(message: unknown) => unknown>(source.confirmAction);
  const readAsTextFromReader = function (reader: unknown, file: unknown, encoding: unknown): boolean {
    const readAsText = asFunction<(f: unknown, e: unknown) => unknown>(toRecord(reader).readAsText);
    if (!readAsText) return false;
    (readAsText as unknown as Function).call(reader, file, encoding);
    return true;
  };

  let boundControlCount = 0;
  let importMode = "merge";

  if (
    resolveHistoryImportMergeClickState &&
    bindListener(importBtn, "click", function () {
      const clickState = toRecord(
        resolveHistoryImportMergeClickState({
          currentMode: importMode,
          historyImportRuntime: source.historyImportRuntime
        })
      );
      if (typeof clickState.nextMode === "string") {
        importMode = clickState.nextMode;
      }
      if (clickState.shouldOpenFilePicker === true && clickInput) {
        (clickInput as unknown as Function).call(importInput);
      }
    })
  ) {
    boundControlCount += 1;
  }

  if (
    resolveHistoryImportReplaceClickState &&
    importReplaceBtn &&
    bindListener(importReplaceBtn, "click", function () {
      const clickState = toRecord(
        resolveHistoryImportReplaceClickState({
          currentMode: importMode,
          historyImportRuntime: source.historyImportRuntime,
          confirmAction
        })
      );
      if (typeof clickState.nextMode === "string") {
        importMode = clickState.nextMode;
      }
      if (clickState.shouldOpenFilePicker === true && clickInput) {
        (clickInput as unknown as Function).call(importInput);
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
      const selectionState = toRecord(
        resolveHistoryImportFileSelectionState({
          files: importInput.files,
          historyImportFileRuntime: source.historyImportFileRuntime
        })
      );
      if (selectionState.shouldRead !== true) return;

      const reader = createFileReader ? createFileReader() : null;
      const readerRecord = toRecord(reader);
      const onload = function () {
        const importState = applyHistoryImportFromFileReadResult({
          readerResult: readerRecord.result,
          importMode,
          localHistoryStore: source.localHistoryStore,
          historyImportRuntime: source.historyImportRuntime,
          historyImportFileRuntime: source.historyImportFileRuntime
        });
        applyStatus(setStatus, importState);
        if (toRecord(importState).shouldReload === true) {
          loadHistory(true);
        }
      };
      const onerror = function () {
        const failureState = resolveHistoryImportReadFailureState({
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
    boundControlCount
  };
}
