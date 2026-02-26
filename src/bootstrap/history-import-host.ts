function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function asFunction<T extends (...args: never[]) => unknown>(value: unknown): T | null {
  return typeof value === "function" ? (value as T) : null;
}

function toRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

export interface HistoryImportHostClickState {
  nextMode: string;
  shouldOpenFilePicker: boolean;
}

export interface HistoryImportHostFileSelectionState {
  file: unknown;
  shouldRead: boolean;
  encoding: string;
  resetValue: string;
}

export interface HistoryImportHostStatusState {
  shouldSetStatus: boolean;
  statusText: string;
  isError: boolean;
  shouldReload: boolean;
}

function toStringValue(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function createNoopStatus(): HistoryImportHostStatusState {
  return {
    shouldSetStatus: false,
    statusText: "",
    isError: false,
    shouldReload: false
  };
}

function resolveImportActionState(
  historyImportRuntime: unknown,
  action: "merge" | "replace"
): Record<string, unknown> | null {
  const runtime = toRecord(historyImportRuntime);
  const resolveHistoryImportActionState = asFunction<(actionName: unknown) => unknown>(
    runtime.resolveHistoryImportActionState
  );
  if (!resolveHistoryImportActionState) return null;
  const result = resolveHistoryImportActionState(action);
  return isRecord(result) ? result : null;
}

export function resolveHistoryImportMergeClickState(input: {
  currentMode?: unknown;
  historyImportRuntime?: unknown;
}): HistoryImportHostClickState {
  const actionState = resolveImportActionState(input?.historyImportRuntime, "merge");
  return {
    nextMode: toStringValue(actionState?.mode, toStringValue(input?.currentMode, "merge")),
    shouldOpenFilePicker: true
  };
}

export function resolveHistoryImportReplaceClickState(input: {
  currentMode?: unknown;
  historyImportRuntime?: unknown;
  confirmAction?: unknown;
}): HistoryImportHostClickState {
  const currentMode = toStringValue(input?.currentMode, "merge");
  const actionState = resolveImportActionState(input?.historyImportRuntime, "replace");
  if (!actionState) {
    return {
      nextMode: currentMode,
      shouldOpenFilePicker: false
    };
  }
  const confirmAction = asFunction<(message: unknown) => unknown>(input?.confirmAction);
  if (actionState.requiresConfirm === true) {
    const confirmed = confirmAction ? confirmAction(actionState.confirmMessage) : false;
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

export function resolveHistoryImportFileSelectionState(input: {
  files?: unknown;
  historyImportFileRuntime?: unknown;
}): HistoryImportHostFileSelectionState {
  const runtime = toRecord(input?.historyImportFileRuntime);
  const resolveHistoryImportSelectedFile = asFunction<(files: unknown) => unknown>(
    runtime.resolveHistoryImportSelectedFile
  );
  const resolveHistoryImportReadEncoding = asFunction<() => unknown>(
    runtime.resolveHistoryImportReadEncoding
  );
  const resolveHistoryImportInputResetValue = asFunction<() => unknown>(
    runtime.resolveHistoryImportInputResetValue
  );
  const file = resolveHistoryImportSelectedFile ? resolveHistoryImportSelectedFile(input?.files) : null;

  return {
    file,
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

export function applyHistoryImportFromFileReadResult(input: {
  readerResult?: unknown;
  importMode?: unknown;
  localHistoryStore?: unknown;
  historyImportRuntime?: unknown;
  historyImportFileRuntime?: unknown;
}): HistoryImportHostStatusState {
  const importRuntime = toRecord(input?.historyImportRuntime);
  const fileRuntime = toRecord(input?.historyImportFileRuntime);
  const resolveHistoryImportPayloadText = asFunction<(value: unknown) => unknown>(
    fileRuntime.resolveHistoryImportPayloadText
  );
  const executeHistoryImport = asFunction<(payload: unknown) => unknown>(importRuntime.executeHistoryImport);
  const resolveHistoryImportErrorNotice = asFunction<(error: unknown) => unknown>(
    importRuntime.resolveHistoryImportErrorNotice
  );
  if (!resolveHistoryImportPayloadText || !executeHistoryImport) {
    return createNoopStatus();
  }

  try {
    const payloadText = resolveHistoryImportPayloadText(input?.readerResult);
    const importState = executeHistoryImport({
      localHistoryStore: input?.localHistoryStore,
      payloadText,
      mode: toStringValue(input?.importMode, "merge")
    });
    const importStateRecord = isRecord(importState) ? importState : {};
    if (importStateRecord.ok !== true) {
      return {
        shouldSetStatus: true,
        statusText: toStringValue(
          importStateRecord.notice,
          toStringValue(
            resolveHistoryImportErrorNotice ? resolveHistoryImportErrorNotice(new Error("unknown")) : "",
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
        resolveHistoryImportErrorNotice ? resolveHistoryImportErrorNotice(new Error("unknown")) : "",
        ""
      ),
      isError: true,
      shouldReload: false
    };
  }
}

export function resolveHistoryImportReadFailureState(input: {
  historyImportRuntime?: unknown;
}): HistoryImportHostStatusState {
  const importRuntime = toRecord(input?.historyImportRuntime);
  const resolveHistoryImportReadErrorNotice = asFunction<() => unknown>(
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
